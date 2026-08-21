"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "help@wildsaura.com,madan123050@gmail.com")
  .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}

/** True when the user has a real (non-anonymous) account. */
export function isRegisteredUser(user: User | null | undefined) {
  return Boolean(user && !user.isAnonymous);
}

/**
 * Ensures there is a Firebase Auth user for interactions that need a uid
 * (likes, shares). Guests get a durable anonymous session so likes still
 * save to Firestore without forcing a full sign-in.
 */
export async function ensureAuthUser(): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  const existing = await new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
  if (existing) return existing;
  await setPersistence(auth, browserLocalPersistence);
  const credential = await signInAnonymously(auth);
  return credential.user;
}
