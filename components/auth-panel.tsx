"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider, createUserWithEmailAndPassword,
  sendEmailVerification, signInWithEmailAndPassword,
  signInWithPopup, signInWithRedirect, updateProfile,
} from "firebase/auth";
import { auth, isAdminEmail, prepareAuthPersistence, completeGoogleRedirect, canUseGoogleRedirect, isStandaloneApp } from "@/lib/firebase";

function readableError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "This email already has an account.";
  if (code.includes("weak-password")) return "Use a stronger password with at least 6 characters.";
  if (code.includes("popup-blocked")) return "Google's sign-in window was blocked. Allow popups and try again, or use email in this app.";
  if (code.includes("web-storage-unsupported")) return "Website storage is unavailable. Enable website storage to keep your login.";
  if (code.includes("unauthorized-domain")) return "Google sign-in is not configured for this website address. Please use email for now.";
  if (code.includes("network-request-failed")) return "Could not reach Google or Firebase. Check your connection and try again.";
  if (error instanceof Error && !code) return error.message;
  if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
  return "Sign-in could not be completed. Please try again.";
}

export function AuthPanel({ purpose }: { purpose: "login" | "submit" | "admin" }) {
  const [ready, setReady] = useState(false);
  const [redirectAvailable, setRedirectAvailable] = useState(false);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        // Resolve provider errors before enabling another sign-in attempt.
        await completeGoogleRedirect();
        await prepareAuthPersistence();
        if (active) { setRedirectAvailable(canUseGoogleRedirect()); setReady(true); }
      } catch (err) {
        if (active) setError(readableError(err));
        // A cancelled redirect should not disable email login.
        try { await prepareAuthPersistence(); if (active) setReady(true); } catch (storageError) {
          if (active) setError(readableError(storageError));
        }
      }
    })();
    return () => { active = false; };
  }, [retry]);

  function continueAfterSignIn(email: string | null) {
    if (isAdminEmail(email)) window.location.replace("/admin");
    else if (purpose === "login") window.location.replace("/submit");
  }

  async function googleSignIn() {
    if (!ready || busy) return;
    setBusy(true); setError(""); setStatus("");
    try {
      if (isStandaloneApp() && canUseGoogleRedirect()) {
        setStatus("Opening Google sign-in…");
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      // Keep the popup in the original tap event. Storage was prepared on mount.
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      continueAfterSignIn(result.user.email);
    } catch (err) { setError(readableError(err)); setStatus(""); } finally { setBusy(false); }
  }

  async function googleRedirect() {
    if (!ready || busy || !canUseGoogleRedirect()) return;
    setBusy(true); setError(""); setStatus("Opening Google sign-in…");
    try { await signInWithRedirect(auth, new GoogleAuthProvider()); }
    catch (err) { setError(readableError(err)); setStatus(""); setBusy(false); }
  }

  async function emailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setError(""); setStatus("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      await prepareAuthPersistence();
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
    } catch (err) { setError(readableError(err)); setStatus(""); } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <Link className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></Link>
      <span className="legal-kicker">{purpose === "admin" ? "Protected workspace" : purpose === "login" ? "Member access" : "Creator access"}</span>
      <h1>{purpose === "admin" ? "Admin sign in." : purpose === "login" ? "Sign in to LUMA." : "Share your work."}</h1>
      <p>{purpose === "admin" ? "Only approved WildSaura admin emails can continue." : purpose === "login" ? "Everyone can continue with Google. Admin accounts are routed to the private dashboard automatically." : "Sign in before sending a photograph for private editorial review."}</p>
      <button className="google-button" onClick={googleSignIn} disabled={busy || !ready}>{busy ? "Please wait…" : "Continue with Google"}</button>
      {redirectAvailable && <button type="button" className="auth-switch" disabled={busy || !ready} onClick={googleRedirect}>Continue with Google without a popup</button>}
      {!ready && !error && <p role="status">Preparing secure sign-in…</p>}
      {!ready && error && <button type="button" className="auth-switch" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Retry sign-in setup</button>}
      {status && <p role="status">{status}</p>}
      <div className="auth-divider"><span>or use email</span></div>
      <form onSubmit={emailSignIn}>
        {register && <label>Your name<input name="name" required /></label>}
        <label>Email address<input name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={6} required /></label>
        <button className="publish" disabled={busy || !ready}>{busy ? "Please wait…" : register ? "Create account ↗" : "Sign in ↗"}</button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {purpose !== "admin" && <button className="auth-switch" onClick={() => setRegister((value) => !value)}>{register ? "Already registered? Sign in" : "New here? Create an account"}</button>}
      <Link className="back-link" href="/">← Back to gallery</Link>
    </section>
  </main>;
}
