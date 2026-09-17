"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
  getAuth,
  getRedirectResult,
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
function createAuth() {
  // Next.js prerenders client modules on the server; browser persistence is unavailable there.
  if (typeof window === "undefined") return getAuth(firebaseApp);
  try {
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "auth/already-initialized") return getAuth(firebaseApp);
    throw error;
  }
}
export const auth = createAuth();

let persistenceReady: Promise<void> | undefined;
/** Choose durable storage before enabling login, never silently use a session-only login. */
export function prepareAuthPersistence() {
  persistenceReady ??= (async () => {
    await auth.authStateReady();
    try {
      await setPersistence(auth, indexedDBLocalPersistence);
    } catch {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        throw new Error("This app cannot save your login. Enable website storage and try again.");
      }
    }
  })().catch((error) => { persistenceReady = undefined; throw error; });
  return persistenceReady;
}

// Consume the redirect result once, including under React Strict Mode.
let redirectResult: ReturnType<typeof getRedirectResult> | undefined;
export function completeGoogleRedirect() {
  redirectResult ??= getRedirectResult(auth);
  return redirectResult;
}

export function canUseGoogleRedirect() {
  return typeof window !== "undefined" && window.location.protocol === "https:"
    && auth.config.authDomain === window.location.host;
}

export function isStandaloneApp() {
  return typeof window !== "undefined" && (
    window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
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
let guestSignIn: Promise<User> | undefined;
export async function ensureAuthUser(): Promise<User> {
  await prepareAuthPersistence();
  // Restoration must finish before a guest login can replace a saved account.
  if (auth.currentUser) return auth.currentUser;
  guestSignIn ??= signInAnonymously(auth).then((credential) => credential.user)
    .finally(() => { guestSignIn = undefined; });
  return guestSignIn;
}
