"use client";

import { FormEvent, useState } from "react";
import {
  GoogleAuthProvider, browserLocalPersistence, createUserWithEmailAndPassword,
  sendEmailVerification, setPersistence, signInWithEmailAndPassword,
  signInWithPopup, updateProfile,
} from "firebase/auth";
import { auth, isAdminEmail } from "@/lib/firebase";

function readableError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "This email already has an account.";
  if (code.includes("weak-password")) return "Use a stronger password with at least 6 characters.";
  if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
  return "Sign-in could not be completed. Please try again.";
}

export function AuthPanel({ purpose }: { purpose: "login" | "submit" | "admin" }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function continueAfterSignIn(email: string | null) {
    if (isAdminEmail(email)) window.location.replace("/admin");
    else if (purpose === "login") window.location.replace("/submit");
  }

  async function googleSignIn() {
    setBusy(true); setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      continueAfterSignIn(result.user.email);
    } catch (err) { setError(readableError(err)); } finally { setBusy(false); }
  }

  async function emailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (register) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const name = String(form.get("name") ?? "").trim();
        if (name) await updateProfile(result.user, { displayName: name });
        await sendEmailVerification(result.user);
        continueAfterSignIn(result.user.email);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        continueAfterSignIn(result.user.email);
      }
    } catch (err) { setError(readableError(err)); } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <a className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></a>
      <span className="legal-kicker">{purpose === "admin" ? "Protected workspace" : purpose === "login" ? "Member access" : "Creator access"}</span>
      <h1>{purpose === "admin" ? "Admin sign in." : purpose === "login" ? "Sign in to LUMA." : "Share your work."}</h1>
      <p>{purpose === "admin" ? "Only approved WildSaura admin emails can continue." : purpose === "login" ? "Everyone can continue with Google. Admin accounts are routed to the private dashboard automatically." : "Sign in before sending a photograph for private editorial review."}</p>
      <button className="google-button" onClick={googleSignIn} disabled={busy}>G&nbsp;&nbsp; Continue with Google</button>
      <div className="auth-divider"><span>or use email</span></div>
      <form onSubmit={emailSignIn}>
        {register && <label>Your name<input name="name" required /></label>}
        <label>Email address<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" minLength={6} required /></label>
        <button className="publish" disabled={busy}>{busy ? "Please wait…" : register ? "Create account ↗" : "Sign in ↗"}</button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      {purpose !== "admin" && <button className="auth-switch" onClick={() => setRegister((value) => !value)}>{register ? "Already registered? Sign in" : "New here? Create an account"}</button>}
      <a className="back-link" href="/">← Back to gallery</a>
    </section>
  </main>;
}
