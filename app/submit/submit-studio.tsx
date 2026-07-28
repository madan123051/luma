"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { AuthPanel } from "@/components/auth-panel";
import { auth, isAdminEmail } from "@/lib/firebase";
import { createSubmission, getMySubmissions, type Submission } from "@/lib/submissions";

export function SubmitStudio() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<Submission[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");

  useEffect(() => () => {
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
  }, [selectedPreviewUrl]);

  useEffect(() => onAuthStateChanged(auth, (current) => {
    if (isAdminEmail(current?.email)) {
      window.location.replace("/admin");
      return;
    }
    setUser(current); setAuthReady(true);
    if (current) getMySubmissions(current.uid).then(setItems).catch(() => setItems([]));
  }), []);

  async function load(current: User) {
    setItems(await getMySubmissions(current.uid));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.email) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("photo");
    if (!(file instanceof File)) return;
    if (file.size > 50 * 1024 * 1024) return setMessage("Image must be 50MB or smaller.");
    setBusy(true); setMessage("");
    try {
      await createSubmission({
        file,
        title: String(form.get("title") ?? "").trim(),
        category: String(form.get("category") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        photographerName: String(form.get("photographerName") ?? "").trim(),
        user: { uid: user.uid, email: user.email },
      });
      formElement.reset();
      setSelectedFileName("");
      setSelectedPreviewUrl("");
      setMessage("Submitted successfully. Your photograph is private and waiting for admin review.");
      await load(user);
    } catch {
      setMessage("Upload failed. Please check the image and try again.");
    } finally { setBusy(false); }
  }

  if (!authReady) return <main className="auth-page"><p>Loading secure sign-in…</p></main>;
  if (!user) return <AuthPanel purpose="submit" />;

  return <main className="studio-page">
    <header className="studio-header"><a className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></a><div><span>{user.email}</span><button onClick={() => signOut(auth)}>Sign out</button></div></header>
    <section className="studio-hero"><span className="legal-kicker">Creator submission</span><h1>Share your<br /><em>perspective.</em></h1><p>Your work stays private until the WildSaura editorial team approves it.</p></section>
    <div className="studio-grid">
      <form className="submission-form" onSubmit={submit}>
        <label className="dropzone large">
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => {
            const file = event.target.files?.[0];
            setSelectedFileName(file?.name ?? "");
            setSelectedPreviewUrl(file ? URL.createObjectURL(file) : "");
          }} />
          {selectedPreviewUrl && <img className="selected-thumbnail" src={selectedPreviewUrl} alt="Selected photograph preview" />}
          <b>{selectedFileName ? "Photograph selected" : "Select your photograph"}</b>
          <span className={selectedFileName ? "selected-file" : ""}>{selectedFileName || "Tap or click here · JPG, PNG or WEBP · maximum 50MB"}</span>
        </label>
        <div className="form-pair"><label>Photograph title<input name="title" maxLength={140} required /></label><label>Photographer name<input name="photographerName" defaultValue={user.displayName ?? ""} maxLength={100} required /></label></div>
        <label>Category<select name="category" required defaultValue=""><option value="" disabled>Choose one</option>{["Nature","People","Architecture","Travel","Street","Fashion","Food","Interiors","Wildlife","Birds","Landscapes"].map((c)=><option key={c}>{c}</option>)}</select></label>
        <label>Story or description<textarea name="description" maxLength={1000} placeholder="Tell us about the frame, location and moment…" /></label>
        <label className="consent"><input type="checkbox" required /> I created this photograph or have all necessary rights and permissions, and I agree to the <a href="/terms">Terms</a> and <a href="/license">Photo License</a>.</label>
        <button className="publish" disabled={busy}>{busy ? "Uploading…" : "Send for review ↗"}</button>
        {message && <p className="form-message">{message}</p>}
      </form>
      <aside className="submission-list"><h2>Your submissions</h2>{items.length ? items.map((item)=><article key={item.id}><div><b>{item.title}</b><small>{item.createdAt?.toLocaleDateString() ?? "Just now"}</small></div><span className={`status ${item.status}`}>{item.status}</span>{item.adminNote && <p>Editor: {item.adminNote}</p>}</article>) : <p>No submissions yet.</p>}</aside>
    </div>
  </main>;
}
