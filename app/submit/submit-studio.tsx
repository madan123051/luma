"use client";

import { FormEvent, useEffect, useState } from "react";

type Submission = { id:string; title:string; status:"pending"|"approved"|"rejected"; createdAt:string; adminNote:string };

export function SubmitStudio({ user, signOutPath }: { user:{name:string;email:string}; signOutPath:string }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/submissions?mine=1");
    if (response.ok) setItems(((await response.json()) as { submissions: Submission[] }).submissions);
  }
  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/submissions", { method:"POST", body:new FormData(event.currentTarget) });
    const data = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(data.error ?? "Upload failed");
    event.currentTarget.reset();
    setMessage("Submitted successfully. Your photograph is now private and waiting for admin review.");
    load();
  }

  return <main className="studio-page">
    <header className="studio-header"><a className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></a><div><span>{user.email}</span><a href={signOutPath}>Sign out</a></div></header>
    <section className="studio-hero"><span className="legal-kicker">Creator submission</span><h1>Share your<br /><em>perspective.</em></h1><p>Your work stays private until the WildSaura editorial team approves it.</p></section>
    <div className="studio-grid">
      <form className="submission-form" onSubmit={submit}>
        <label className="dropzone large"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /><b>Select your photograph</b><span>JPG, PNG or WEBP · maximum 20MB</span></label>
        <div className="form-pair"><label>Photograph title<input name="title" maxLength={140} required /></label><label>Photographer name<input name="photographerName" defaultValue={user.name} maxLength={100} required /></label></div>
        <label>Category<select name="category" required defaultValue=""><option value="" disabled>Choose one</option>{["Nature","People","Architecture","Travel","Street","Fashion","Food","Interiors","Wildlife","Birds","Landscapes"].map((c)=><option key={c}>{c}</option>)}</select></label>
        <label>Story or description<textarea name="description" maxLength={1000} placeholder="Tell us about the frame, location and moment…" /></label>
        <label className="consent"><input type="checkbox" required /> I created this photograph or have all necessary rights and permissions, and I agree to the <a href="/terms">Terms</a> and <a href="/license">Photo License</a>.</label>
        <button className="publish" disabled={busy}>{busy ? "Uploading…" : "Send for review ↗"}</button>
        {message && <p className="form-message">{message}</p>}
      </form>
      <aside className="submission-list"><h2>Your submissions</h2>{items.length ? items.map((item)=><article key={item.id}><div><b>{item.title}</b><small>{new Date(item.createdAt).toLocaleDateString()}</small></div><span className={`status ${item.status}`}>{item.status}</span>{item.adminNote && <p>Editor: {item.adminNote}</p>}</article>) : <p>No submissions yet.</p>}</aside>
    </div>
  </main>;
}
