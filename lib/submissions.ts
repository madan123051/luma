"use client";

import {
  collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc,
  updateDoc, where, type DocumentData, type QueryDocumentSnapshot,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { photoSlug } from "./gallery-data";
import { createPublicPhoto } from "./image-processing";

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
  downloadUrl: string;
  contentType: string;
  fileSize: number;
  previewFileSize: number;
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
    downloadUrl: data.downloadUrl ?? "",
    contentType: data.contentType ?? "",
    fileSize: data.fileSize ?? 0,
    previewFileSize: data.previewFileSize ?? data.fileSize ?? 0,
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

export async function createSubmission(input: {
  file: File; title: string; category: string; description: string;
  photographerName: string; user: { uid: string; email: string };
  status?: "pending" | "approved";
  tags?: string[]; keywords?: string[]; altText?: string;
  seoTitle?: string; seoDescription?: string; aiGenerated?: boolean;
}) {
  const docRef = doc(collection(db, "submissions"));
  const storagePath = `submissions/${input.user.uid}/${docRef.id}/original`;
  const previewPath = `submissions/${input.user.uid}/${docRef.id}/preview.jpg`;
  const objectRef = ref(storage, storagePath);
  const previewRef = ref(storage, previewPath);
  const publicPhoto = await createPublicPhoto(input.file, input.photographerName);

  try {
    await Promise.all([
      uploadBytes(objectRef, input.file, {
        contentType: input.file.type,
        customMetadata: { originalName: input.file.name.slice(0, 180) },
      }),
      uploadBytes(previewRef, publicPhoto, {
        contentType: "image/jpeg",
        customMetadata: { version: "public-watermarked" },
      }),
    ]);
    const downloadUrl = await getDownloadURL(previewRef);
    const status = input.status ?? "pending";
    await setDoc(docRef, {
      title: input.title.slice(0, 140),
      slug: photoSlug({ title: input.title, photographer: input.photographerName }),
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
    });
    return docRef.id;
  } catch (error) {
    await Promise.all([
      deleteObject(objectRef).catch(() => {}),
      deleteObject(previewRef).catch(() => {}),
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

export async function updateSubmissionDetails(id: string, input: {
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
  await updateDoc(doc(db, "submissions", id), {
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
  });
}

export async function deleteSubmission(item: Pick<Submission, "id" | "storagePath" | "previewPath">) {
  const paths = [...new Set([item.storagePath, item.previewPath].filter(Boolean))];
  await Promise.all(paths.map(async (path) => {
    try {
      await deleteObject(ref(storage, path));
    } catch (error) {
      if ((error as { code?: string }).code !== "storage/object-not-found") throw error;
    }
  }));
  await deleteDoc(doc(db, "submissions", item.id));
}
