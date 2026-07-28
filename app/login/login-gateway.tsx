"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AuthPanel } from "@/components/auth-panel";
import { auth, isAdminEmail } from "@/lib/firebase";

export function LoginGateway() {
  const [checking, setChecking] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (!user) {
      setChecking(false);
      return;
    }

    window.location.replace(isAdminEmail(user.email) ? "/admin" : "/submit");
  }), []);

  if (checking) return <main className="auth-page"><p>Checking your account…</p></main>;
  return <AuthPanel purpose="login" />;
}
