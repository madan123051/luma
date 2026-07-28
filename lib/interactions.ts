"use client";

import {
  addDoc, collection, doc, getDoc, getDocs, limit, query, runTransaction,
  serverTimestamp, type DocumentData, type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

export type PhotoStats = {
  likesCount: number;
  sharesCount: number;
  likedByCurrentUser: boolean;
};

export type PhotoComment = {
  id: string;
  text: string;
  displayName: string;
  createdAt: Date | null;
};

function photoKey(photoId: number | string) {
  return encodeURIComponent(String(photoId));
}

function commentFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): PhotoComment {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    text: data.text ?? "",
    displayName: data.displayName ?? "LUMA member",
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
}

export async function getPhotoStats(photoIds: Array<number | string>, uid?: string) {
  const entries = await Promise.all(photoIds.map(async (photoId) => {
    const key = photoKey(photoId);
    const statsRef = doc(db, "photoStats", key);
    const [statsSnapshot, likeSnapshot] = await Promise.all([
      getDoc(statsRef),
      uid ? getDoc(doc(statsRef, "likes", uid)) : Promise.resolve(null),
    ]);
    const data = statsSnapshot.data();
    return [String(photoId), {
      likesCount: Math.max(0, Number(data?.likesCount ?? 0)),
      sharesCount: Math.max(0, Number(data?.sharesCount ?? 0)),
      likedByCurrentUser: Boolean(likeSnapshot?.exists()),
    }] as const;
  }));
  return Object.fromEntries(entries) as Record<string, PhotoStats>;
}

export async function toggleSavedLike(photoId: number | string, user: User) {
  const statsRef = doc(db, "photoStats", photoKey(photoId));
  const likeRef = doc(statsRef, "likes", user.uid);
  return runTransaction(db, async (transaction) => {
    const [statsSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(statsRef),
      transaction.get(likeRef),
    ]);
    const current = Math.max(0, Number(statsSnapshot.data()?.likesCount ?? 0));
    const sharesCount = Math.max(0, Number(statsSnapshot.data()?.sharesCount ?? 0));
    const liked = !likeSnapshot.exists();
    const likesCount = liked ? current + 1 : Math.max(0, current - 1);
    if (liked) transaction.set(likeRef, { uid: user.uid, createdAt: serverTimestamp() });
    else transaction.delete(likeRef);
    transaction.set(statsRef, { likesCount, sharesCount, updatedAt: serverTimestamp() }, { merge: true });
    return { liked, likesCount };
  });
}

export async function recordSavedShare(photoId: number | string, user: User) {
  const statsRef = doc(db, "photoStats", photoKey(photoId));
  const shareRef = doc(statsRef, "shares", user.uid);
  return runTransaction(db, async (transaction) => {
    const [statsSnapshot, shareSnapshot] = await Promise.all([
      transaction.get(statsRef),
      transaction.get(shareRef),
    ]);
    const current = Math.max(0, Number(statsSnapshot.data()?.sharesCount ?? 0));
    if (shareSnapshot.exists()) return current;
    const likesCount = Math.max(0, Number(statsSnapshot.data()?.likesCount ?? 0));
    const sharesCount = current + 1;
    transaction.set(shareRef, { uid: user.uid, createdAt: serverTimestamp() });
    transaction.set(statsRef, { likesCount, sharesCount, updatedAt: serverTimestamp() }, { merge: true });
    return sharesCount;
  });
}

export async function getPhotoComments(photoId: number | string) {
  const commentsRef = collection(db, "photoStats", photoKey(photoId), "comments");
  const snapshots = await getDocs(query(commentsRef, limit(60)));
  return snapshots.docs.map(commentFromSnapshot)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function addPhotoComment(photoId: number | string, user: User, text: string) {
  const cleanText = text.trim().slice(0, 1000);
  if (!cleanText) return;
  const commentsRef = collection(db, "photoStats", photoKey(photoId), "comments");
  await addDoc(commentsRef, {
    uid: user.uid,
    email: user.email ?? "",
    displayName: (user.displayName || user.email?.split("@")[0] || "LUMA member").slice(0, 100),
    text: cleanText,
    createdAt: serverTimestamp(),
  });
}
