"use client";

import {
  collection, deleteDoc, deleteField, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc,
  updateDoc, where, type DocumentData, type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  deleteObject, getBlob, getDownloadURL, ref, uploadBytesResumable,
  type StorageReference, type UploadMetadata, type UploadTask,
} from "firebase/storage";
import { auth, db, storage } from "./firebase";
import { photoSlug } from "./gallery-data";
import { createPublicPhoto, createStandardPhoto } from "./image-processing";

const SITE_ORIGIN = "https://luma.wildsaura.com";
const STANDARD_ASSET_VERSION = "standard-free-white-banner-qr-v2";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  photographerName: string;
  submitterEmail: string;
  submitterUid: string;
  storagePath: string;
  previewPath: string;
  standardPath: string;
  downloadUrl: string;
  standardDownloadUrl: string;
  contentType: string;
  fileSize: number;
  previewFileSize: number;
  standardFileSize: number;
  publicVersion: boolean;
  status: SubmissionStatus;
  adminNote: string;
  createdAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string;
  tags: string[];
  keywords: string[];
  altText: string;
  seoTitle: string;
  seoDescription: string;
  aiGenerated: boolean;
};

export type SubmissionProgress = {
  percent: number;
  stage: "preparing" | "uploading" | "saving" | "complete" | "error";
  label: string;
};

function fromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): Submission {
  const data = snapshot.data();
  const title = data.title ?? "";
  const photographerName = data.photographerName ?? "";
  return {
    id: snapshot.id,
    slug: data.slug ?? photoSlug({ title, photographer: photographerName }),
    title,
    category: data.category ?? "",
    description: data.description ?? "",
    photographerName,
    submitterEmail: data.submitterEmail ?? "",
    submitterUid: data.submitterUid ?? "",
    storagePath: data.storagePath ?? "",
    previewPath: data.previewPath ?? data.storagePath ?? "",
    standardPath: data.standardPath ?? "",
    downloadUrl: data.downloadUrl ?? "",
    standardDownloadUrl: data.standardDownloadUrl ?? "",
    contentType: data.contentType ?? "",
    fileSize: data.fileSize ?? 0,
    previewFileSize: data.previewFileSize ?? data.fileSize ?? 0,
    standardFileSize: data.standardFileSize ?? 0,
    publicVersion: data.publicVersion === true,
    status: data.status ?? "pending",
    adminNote: data.adminNote ?? "",
    createdAt: data.createdAt?.toDate?.() ?? null,
    reviewedAt: data.reviewedAt?.toDate?.() ?? null,
    reviewedBy: data.reviewedBy ?? "",
    tags: Array.isArray(data.tags) ? data.tags.filter((value): value is string => typeof value === "string") : [],
    keywords: Array.isArray(data.keywords) ? data.keywords.filter((value): value is string => typeof value === "string") : [],
    altText: data.altText ?? "",
    seoTitle: data.seoTitle ?? "",
    seoDescription: data.seoDescription ?? "",
    aiGenerated: data.aiGenerated === true,
  };
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    window.setTimeout(finish, 60);
    window.requestAnimationFrame(finish);
  });
}

function safeDownloadFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90) || "luma-photo";
}

function uploadPromise(task: UploadTask, onChange: (bytesTransferred: number) => void) {
  return new Promise<void>((resolve, reject) => {
    task.on("state_changed", (snapshot) => onChange(snapshot.bytesTransferred), reject, resolve);
  });
}

function firebaseErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

export function submissionErrorMessage(error: unknown) {
  const code = firebaseErrorCode(error);
  if (code === "storage/unauthorized" || code === "permission-denied") {
    return "Your account does not have permission to publish this photograph. Verify the signed-in email and try again.";
  }
  if (code === "storage/retry-limit-exceeded") {
    return "The upload timed out. Check the connection and try again.";
  }
  if (code === "storage/quota-exceeded") {
    return "Photo storage is temporarily full. Please contact WildSaura support.";
  }
  if (error instanceof Error && !code) return error.message;
  return "Upload failed. Please check the image and try again.";
}

export async function createSubmission(input: {
  file: File; title: string; category: string; description: string;
  photographerName: string; user: { uid: string; email: string; emailVerified?: boolean };
  status?: "pending" | "approved";
  tags?: string[]; keywords?: string[]; altText?: string;
  seoTitle?: string; seoDescription?: string; aiGenerated?: boolean;
  onProgress?: (progress: SubmissionProgress) => void;
}) {
  if (input.status === "approved" && input.user.emailVerified === false) {
    throw new Error("Verify this admin email before publishing, or sign in with its Google account.");
  }

  const report = (percent: number, stage: SubmissionProgress["stage"], label: string) => {
    input.onProgress?.({ percent: Math.max(0, Math.min(100, Math.round(percent))), stage, label });
  };
  report(2, "preparing", "Reading the original photograph…");
  await waitForPaint();

  const docRef = doc(collection(db, "submissions"));
  const storagePath = `submissions/${input.user.uid}/${docRef.id}/original`;
  const previewPath = `submissions/${input.user.uid}/${docRef.id}/preview.jpg`;
  const standardPath = `submissions/${input.user.uid}/${docRef.id}/standard.jpg`;
  const objectRef = ref(storage, storagePath);
  const previewRef = ref(storage, previewPath);
  const standardRef = ref(storage, standardPath);
  const status = input.status ?? "pending";
  const slug = photoSlug({ title: input.title, photographer: input.photographerName });
  const canonicalPhotoUrl = `${SITE_ORIGIN}/photo/${slug}`;
  report(5, "preparing", "Preparing the fast gallery preview…");
  const publicPhoto = await createPublicPhoto(input.file, input.photographerName);
  let standardPhoto: Blob | null = null;
  if (status === "approved") {
    report(9, "preparing", "Building the Standard white-banner download…");
    await waitForPaint();
    standardPhoto = await createStandardPhoto(input.file, input.title, input.photographerName, canonicalPhotoUrl);
  }

  try {
    report(15, "uploading", standardPhoto ? "Uploading original, preview and Standard files…" : "Uploading original and preview files…");
    const uploadDefinitions: Array<{ data: Blob; metadata: UploadMetadata }> = [
      { data: input.file, metadata: {
        contentType: input.file.type,
        customMetadata: { originalName: input.file.name.slice(0, 180) },
      } },
      { data: publicPhoto, metadata: {
        contentType: "image/jpeg",
        customMetadata: { version: "public-watermarked" },
      } },
    ];
    const refs = [objectRef, previewRef];
    if (standardPhoto) {
      uploadDefinitions.push({ data: standardPhoto, metadata: {
        contentType: "image/jpeg",
        contentDisposition: `attachment; filename="${safeDownloadFilename(input.title)}-standard-wildsaura.jpg"`,
        customMetadata: { version: STANDARD_ASSET_VERSION, photoUrl: canonicalPhotoUrl },
      } });
      refs.push(standardRef);
    }
    const transferred = uploadDefinitions.map(() => 0);
    const totalBytes = uploadDefinitions.reduce((total, item) => total + item.data.size, 0);
    const tasks = uploadDefinitions.map((item, index) => uploadBytesResumable(refs[index], item.data, item.metadata));
    const promises = tasks.map((task, index) => uploadPromise(task, (bytesTransferred) => {
      transferred[index] = bytesTransferred;
      const uploadedBytes = transferred.reduce((total, value) => total + value, 0);
      report(15 + (uploadedBytes / Math.max(1, totalBytes)) * 77, "uploading", "Uploading photo files…");
    }));
    try {
      await Promise.all(promises);
    } catch (error) {
      tasks.forEach((task) => task.cancel());
      await Promise.allSettled(promises);
      throw error;
    }

    report(94, "saving", "Securing download links…");
    const downloadUrl = await getDownloadURL(previewRef);
    const standardDownloadUrl = standardPhoto ? await getDownloadURL(standardRef) : "";
    report(97, "saving", status === "approved" ? "Publishing gallery details…" : "Sending details for review…");
    const submissionData: Record<string, unknown> = {
      title: input.title.slice(0, 140),
      slug,
      category: input.category.slice(0, 50),
      description: input.description.slice(0, 1000),
      photographerName: input.photographerName.slice(0, 100),
      submitterEmail: input.user.email,
      submitterUid: input.user.uid,
      storagePath,
      previewPath,
      downloadUrl,
      contentType: input.file.type,
      fileSize: input.file.size,
      previewFileSize: publicPhoto.size,
      publicVersion: true,
      status,
      adminNote: "",
      createdAt: serverTimestamp(),
      reviewedAt: status === "approved" ? serverTimestamp() : null,
      reviewedBy: status === "approved" ? input.user.email : "",
      tags: (input.tags ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 16),
      keywords: (input.keywords ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 20),
      altText: input.altText?.trim().slice(0, 240) ?? "",
      seoTitle: input.seoTitle?.trim().slice(0, 70) ?? "",
      seoDescription: input.seoDescription?.trim().slice(0, 170) ?? "",
      aiGenerated: input.aiGenerated === true,
    };
    if (standardPhoto) {
      submissionData.standardPath = standardPath;
      submissionData.standardDownloadUrl = standardDownloadUrl;
      submissionData.standardFileSize = standardPhoto.size;
    }
    await setDoc(docRef, submissionData);
    report(100, "complete", status === "approved" ? "Published successfully" : "Sent for review");
    return docRef.id;
  } catch (error) {
    await Promise.all([
      deleteObject(objectRef).catch(() => {}),
      deleteObject(previewRef).catch(() => {}),
      deleteObject(standardRef).catch(() => {}),
    ]);
    throw error;
  }
}

export async function getMySubmissions(uid: string) {
  const snapshots = await getDocs(query(collection(db, "submissions"), where("submitterUid", "==", uid), limit(100)));
  return snapshots.docs.map(fromSnapshot).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function getApprovedSubmissions() {
  const snapshots = await getDocs(query(collection(db, "submissions"), where("status", "==", "approved"), limit(60)));
  return snapshots.docs.map(fromSnapshot).sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0));
}

export async function getAllSubmissions() {
  const snapshots = await getDocs(query(collection(db, "submissions"), orderBy("createdAt", "desc"), limit(500)));
  return snapshots.docs.map(fromSnapshot).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function reviewSubmission(id: string, status: SubmissionStatus, adminNote: string, adminEmail: string) {
  await updateDoc(doc(db, "submissions", id), {
    status,
    adminNote: adminNote.trim().slice(0, 500),
    reviewedAt: serverTimestamp(),
    reviewedBy: adminEmail,
  });
}

export async function updateSubmissionDetails(item: Pick<Submission, "id" | "title" | "photographerName" | "standardPath">, input: {
  title: string;
  category: string;
  description: string;
  photographerName: string;
  tags?: string[];
  keywords?: string[];
  altText?: string;
  seoTitle?: string;
  seoDescription?: string;
}) {
  const title = input.title.trim().slice(0, 140);
  const photographerName = input.photographerName.trim().slice(0, 100);
  if (!title || !photographerName || !input.category.trim()) throw new Error("Required photo details are missing.");
  const standardInvalidated = Boolean(
    item.standardPath && (title !== item.title || photographerName !== item.photographerName),
  );
  const updates: Record<string, unknown> = {
    title,
    category: input.category.trim().slice(0, 50),
    description: input.description.trim().slice(0, 1000),
    photographerName,
    tags: (input.tags ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 16),
    keywords: (input.keywords ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 20),
    altText: input.altText?.trim().slice(0, 240) ?? "",
    seoTitle: input.seoTitle?.trim().slice(0, 70) ?? "",
    seoDescription: input.seoDescription?.trim().slice(0, 170) ?? "",
    updatedAt: serverTimestamp(),
  };
  if (standardInvalidated) {
    updates.standardPath = deleteField();
    updates.standardDownloadUrl = deleteField();
    updates.standardFileSize = deleteField();
  }
  await updateDoc(doc(db, "submissions", item.id), updates);
  if (standardInvalidated) await deleteObject(ref(storage, item.standardPath)).catch(() => {});
  return { standardInvalidated };
}

export async function createStandardDownloadForSubmission(
  item: Submission,
  onProgress?: (progress: SubmissionProgress) => void,
) {
  if (!item.storagePath || !item.submitterUid) throw new Error("The private original is not available for this photograph.");
  const report = (percent: number, stage: SubmissionProgress["stage"], label: string) => {
    onProgress?.({ percent: Math.max(0, Math.min(100, Math.round(percent))), stage, label });
  };
  const standardPath = item.standardPath || `submissions/${item.submitterUid}/${item.id}/standard.jpg`;
  const standardRef = ref(storage, standardPath);
  const slug = photoSlug({ title: item.title, photographer: item.photographerName, slug: item.slug });
  const canonicalPhotoUrl = `${SITE_ORIGIN}/photo/${slug}`;

  report(3, "preparing", "Loading the private original…");
  await waitForPaint();
  const original = await getBlob(ref(storage, item.storagePath), 50 * 1024 * 1024);
  report(22, "preparing", "Building the Standard white-banner download…");
  await waitForPaint();
  const standardPhoto = await createStandardPhoto(original, item.title, item.photographerName, canonicalPhotoUrl);
  const metadata: UploadMetadata = {
    contentType: "image/jpeg",
    contentDisposition: `attachment; filename="${safeDownloadFilename(item.title)}-standard-wildsaura.jpg"`,
    customMetadata: { version: STANDARD_ASSET_VERSION, photoUrl: canonicalPhotoUrl },
  };
  const uploadStandard = async (
    targetRef: StorageReference,
    fromPercent: number,
    toPercent: number,
    label: string,
  ) => {
    const task = uploadBytesResumable(targetRef, standardPhoto, metadata);
    await uploadPromise(task, (bytesTransferred) => {
      const ratio = bytesTransferred / Math.max(1, standardPhoto.size);
      report(fromPercent + ratio * (toPercent - fromPercent), "uploading", label);
    });
  };

  report(35, "uploading", "Uploading the Standard file…");
  let resolvedStandardPath = standardPath;
  let resolvedStandardRef = standardRef;
  try {
    await uploadStandard(standardRef, 35, 90, "Uploading the Standard file…");
  } catch (error) {
    if (firebaseErrorCode(error) !== "storage/unauthorized") throw error;
    const currentUser = auth.currentUser;
    if (!currentUser) throw error;
    resolvedStandardPath = `submissions/${currentUser.uid}/luma-standard-${item.id}-${Date.now()}/original`;
    resolvedStandardRef = ref(storage, resolvedStandardPath);
    report(91, "uploading", "Installing the refreshed Standard file…");
    await uploadStandard(resolvedStandardRef, 91, 98, "Installing the refreshed Standard file…");
  }
  report(99, "saving", "Saving the Standard download link…");
  let standardDownloadUrl = "";
  try {
    standardDownloadUrl = await getDownloadURL(resolvedStandardRef);
    await updateDoc(doc(db, "submissions", item.id), {
      standardPath: resolvedStandardPath,
      standardDownloadUrl,
      standardFileSize: standardPhoto.size,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (resolvedStandardPath !== standardPath) {
      await deleteObject(resolvedStandardRef).catch(() => {});
    }
    throw error;
  }
  if (item.standardPath && item.standardPath !== resolvedStandardPath) {
    void deleteObject(ref(storage, item.standardPath)).catch(() => {});
  }
  report(100, "complete", "Standard download is ready");
  return { standardPath: resolvedStandardPath, standardDownloadUrl, standardFileSize: standardPhoto.size };
}

export async function repairGalleryPreviewForSubmission(
  item: Submission,
  onProgress?: (progress: SubmissionProgress) => void,
) {
  const currentUser = auth.currentUser;
  if (!currentUser || !item.storagePath) throw new Error("The private original is not available for this photograph.");
  const report = (percent: number, stage: SubmissionProgress["stage"], label: string) => {
    onProgress?.({ percent: Math.max(0, Math.min(100, Math.round(percent))), stage, label });
  };

  report(5, "preparing", "Loading the legacy original…");
  await waitForPaint();
  const original = await getBlob(ref(storage, item.storagePath), 50 * 1024 * 1024);
  report(28, "preparing", "Building a protected gallery preview…");
  await waitForPaint();
  const preview = await createPublicPhoto(original, item.photographerName);
  const previewPath = `submissions/${currentUser.uid}/${item.id}/preview.jpg`;
  const previewRef = ref(storage, previewPath);

  // Preview updates are installed as a clean create so current owner-scoped
  // Firebase rules also support repairing records uploaded by an older account.
  await deleteObject(previewRef).catch((error) => {
    if (firebaseErrorCode(error) !== "storage/object-not-found") throw error;
  });
  report(40, "uploading", "Installing the repaired gallery preview…");
  const task = uploadBytesResumable(previewRef, preview, {
    contentType: "image/jpeg",
    customMetadata: { version: "public-watermarked-repair" },
  });
  await uploadPromise(task, (bytesTransferred) => {
    report(40 + (bytesTransferred / Math.max(1, preview.size)) * 50, "uploading", "Installing the repaired gallery preview…");
  });

  report(94, "saving", "Saving the repaired thumbnail…");
  try {
    const downloadUrl = await getDownloadURL(previewRef);
    await updateDoc(doc(db, "submissions", item.id), {
      previewPath,
      downloadUrl,
      previewFileSize: preview.size,
      publicVersion: true,
      updatedAt: serverTimestamp(),
    });
    report(100, "complete", "Gallery preview repaired");
    return { previewPath, downloadUrl, previewFileSize: preview.size, publicVersion: true };
  } catch (error) {
    await deleteObject(previewRef).catch(() => {});
    throw error;
  }
}

export async function deleteSubmission(item: Pick<Submission, "id" | "storagePath" | "previewPath" | "standardPath">) {
  const paths = [...new Set([item.storagePath, item.previewPath, item.standardPath].filter(Boolean))];
  await Promise.all(paths.map(async (path) => {
    try {
      await deleteObject(ref(storage, path));
    } catch (error) {
      if ((error as { code?: string }).code !== "storage/object-not-found") throw error;
    }
  }));
  await deleteDoc(doc(db, "submissions", item.id));
}
