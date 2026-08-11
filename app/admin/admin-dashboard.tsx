"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { AuthPanel } from "@/components/auth-panel";
import { type AiPhotoMetadata, PHOTO_CATEGORIES } from "@/lib/ai-metadata";
import { auth, isAdminEmail } from "@/lib/firebase";
import { createAiPhotoDataUrl } from "@/lib/image-processing";
import {
  createSubmission, deleteSubmission, getAllSubmissions, reviewSubmission,
  updateSubmissionDetails, type Submission, type SubmissionStatus,
} from "@/lib/submissions";

type PhotoDetails = {
  title: string;
  photographerName: string;
  category: string;
  description: string;
  tags: string;
  keywords: string;
  altText: string;
  seoTitle: string;
  seoDescription: string;
};

const emptyDetails: PhotoDetails = {
  title: "", photographerName: "", category: "", description: "", tags: "",
  keywords: "", altText: "", seoTitle: "", seoDescription: "",
};

function listFromText(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function detailValues(item: Submission): PhotoDetails {
  return {
    title: item.title,
    photographerName: item.photographerName,
    category: item.category,
    description: item.description,
    tags: item.tags.join(", "),
    keywords: item.keywords.join(", "),
    altText: item.altText,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
  };
}

export function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<SubmissionStatus | "all">("all");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"review" | "upload">("review");
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<PhotoDetails>(emptyDetails);
  const [uploadDetails, setUploadDetails] = useState<PhotoDetails>(emptyDetails);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiApplied, setAiApplied] = useState(false);

  useEffect(() => () => {
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
  }, [selectedPreviewUrl]);

  async function load() {
    setItems(await getAllSubmissions());
  }

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    setAuthReady(true);
    if (isAdminEmail(current?.email)) {
      setUploadDetails((details) => details.photographerName ? details : {
        ...details,
        photographerName: current?.displayName?.trim() || "WildSaura",
      });
      load().catch(() => setItems([]));
    }
  }), []);

  const visible = useMemo(
    () => filter === "all" ? items : items.filter((item) => item.status === filter),
    [items, filter],
  );

  const groupedVisible = useMemo(() => {
    const groups = new Map<string, { key: string; month: string; year: string; items: Submission[] }>();
    for (const item of visible) {
      const date = item.createdAt;
      const key = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : "undated";
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          month: date ? new Intl.DateTimeFormat("en", { month: "long" }).format(date) : "Recently added",
          year: date ? String(date.getFullYear()) : "Date pending",
          items: [],
        });
      }
      groups.get(key)?.items.push(item);
    }
    return [...groups.values()];
  }, [visible]);

  const counts = {
    pending: items.filter((item) => item.status === "pending").length,
    approved: items.filter((item) => item.status === "approved").length,
    rejected: items.filter((item) => item.status === "rejected").length,
  };

  function openSubmission(item: Submission) {
    setSelected(item);
    setNote(item.adminNote);
    setEditing(false);
    setEditValues(detailValues(item));
  }

  async function review(status: SubmissionStatus) {
    if (!selected || !user?.email) return;
    setBusy(true);
    try {
      await reviewSubmission(selected.id, status, note, user.email);
      setSelected(null);
      setNote("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await updateSubmissionDetails(selected.id, {
        ...editValues,
        tags: listFromText(editValues.tags),
        keywords: listFromText(editValues.keywords),
      });
      setSelected(null);
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!selected || !window.confirm(`Permanently delete “${selected.title}”? This removes the gallery photo and uploaded files.`)) return;
    setBusy(true);
    try {
      await deleteSubmission(selected);
      setSelected(null);
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function choosePhoto(file: File | undefined) {
    setSelectedFile(file ?? null);
    setSelectedPreviewUrl(file ? URL.createObjectURL(file) : "");
    setAiMessage("");
    setAiApplied(false);
  }

  async function analyzePhoto() {
    if (!selectedFile || !user) {
      setAiMessage("Select a photograph first.");
      return;
    }
    setAiBusy(true);
    setAiMessage("Reading the frame and researching natural search language…");
    try {
      const imageDataUrl = await createAiPhotoDataUrl(selectedFile);
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ai-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          imageDataUrl,
          photographerName: uploadDetails.photographerName,
          context: aiContext.trim(),
        }),
      });
      const payload = await response.json() as AiPhotoMetadata | { metadata?: AiPhotoMetadata; error?: string };
      if (!response.ok) throw new Error("error" in payload && payload.error ? payload.error : "AI suggestions could not be prepared.");
      const metadata = "metadata" in payload && payload.metadata ? payload.metadata : payload as AiPhotoMetadata;
      setUploadDetails((details) => ({
        ...details,
        title: metadata.title,
        category: metadata.category,
        description: metadata.description,
        tags: metadata.tags.join(", "),
        keywords: metadata.keywords.join(", "),
        altText: metadata.altText,
        seoTitle: metadata.seoTitle,
        seoDescription: metadata.seoDescription,
      }));
      setAiApplied(true);
      setAiMessage(`AI draft ready · ${metadata.subjects.slice(0, 3).join(" · ")}${metadata.locationHint ? ` · ${metadata.locationHint}` : ""}`);
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "AI suggestions could not be prepared.");
    } finally {
      setAiBusy(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!user?.email || !selectedFile) return setUploadMessage("Please select a photograph.");
    if (selectedFile.size > 50 * 1024 * 1024) return setUploadMessage("Image must be 50MB or smaller.");
    setBusy(true);
    setUploadMessage("");
    try {
      await createSubmission({
        file: selectedFile,
        title: uploadDetails.title.trim(),
        category: uploadDetails.category,
        description: uploadDetails.description.trim(),
        photographerName: uploadDetails.photographerName.trim(),
        tags: listFromText(uploadDetails.tags),
        keywords: listFromText(uploadDetails.keywords),
        altText: uploadDetails.altText,
        seoTitle: uploadDetails.seoTitle,
        seoDescription: uploadDetails.seoDescription,
        aiGenerated: aiApplied,
        user: { uid: user.uid, email: user.email },
        status: "approved",
      });
      form.reset();
      setSelectedFile(null);
      setSelectedPreviewUrl("");
      setUploadDetails({ ...emptyDetails, photographerName: user.displayName?.trim() || "WildSaura" });
      setAiContext("");
      setAiApplied(false);
      setAiMessage("");
      setUploadMessage("Published successfully. The new photograph is live at the top of the gallery.");
      await load();
    } catch {
      setUploadMessage("Upload failed. Please check the image and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) return <main className="auth-page"><p>Loading secure admin…</p></main>;
  if (!user) return <AuthPanel purpose="admin" />;
  if (!isAdminEmail(user.email)) return <main className="access-denied"><h1>Admin access required.</h1><p>Signed in as {user.email}. This address is not on the WildSaura admin allowlist.</p><button type="button" onClick={() => signOut(auth)}>Sign in with another account</button><Link href="/">Return to gallery</Link></main>;

  return <main className="admin-page">
    <aside className="admin-sidebar">
      <Link className="brand" href="/">LU<span>●</span>MA <small>studio</small></Link>
      <p className="admin-sidebar-label">Editorial workspace</p>
      <nav aria-label="Admin sections">
        <button type="button" className={view === "upload" ? "active" : ""} onClick={() => setView("upload")}>AI publish studio<span>＋</span></button>
        {(["pending", "approved", "rejected", "all"] as const).map((item) => <button type="button" className={view === "review" && filter === item ? "active" : ""} onClick={() => { setView("review"); setFilter(item); }} key={item}>{item}<span>{item === "all" ? items.length : counts[item]}</span></button>)}
      </nav>
      <div><small>{user.email}</small><button type="button" onClick={() => signOut(auth)}>Sign out</button></div>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar">
        <div><span className="legal-kicker">WildSaura editorial</span><h1>{view === "upload" ? "AI publish studio" : "Photo archive"}</h1></div>
        <Link href="/" target="_blank">Open live gallery ↗</Link>
      </header>

      {view === "upload" ? <section className="admin-upload-panel premium-upload-panel">
        <div className="upload-intro">
          <span className="admin-step">01 / Select</span>
          <h2>One frame.<br />A complete story.</h2>
          <p>Select the original photo, then let the private AI assistant prepare an editable title, description, tags, alt text and Google-ready page metadata.</p>
          <div className="ai-guardrail"><b>Human reviewed</b><span>Nothing publishes until you approve every suggestion.</span></div>
        </div>
        <form className="submission-form admin-publish-form" onSubmit={upload}>
          <label className="dropzone large premium-dropzone">
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => choosePhoto(event.target.files?.[0])} />
            {selectedPreviewUrl && <img className="selected-thumbnail" src={selectedPreviewUrl} alt="Selected photograph preview" />}
            <span className="dropzone-mark">＋</span>
            <b>{selectedFile ? "Photograph ready" : "Choose a photograph"}</b>
            <span className={selectedFile ? "selected-file" : ""}>{selectedFile?.name || "JPG, PNG or WEBP · maximum 50MB"}</span>
          </label>

          <section className="ai-metadata-card" aria-labelledby="ai-assistant-title">
            <div className="ai-card-heading"><span className="ai-orbit" aria-hidden="true">✦</span><div><small>Vision + search language</small><h3 id="ai-assistant-title">LUMA metadata assistant</h3></div><span className="ai-status">{aiApplied ? "Draft ready" : "Optional"}</span></div>
            <label>Optional context for accuracy<textarea value={aiContext} onChange={(event) => setAiContext(event.target.value)} maxLength={300} placeholder="Location, species, event or anything the camera cannot prove…" /></label>
            <button type="button" className="ai-generate-button" disabled={!selectedFile || aiBusy} onClick={analyzePhoto}><span>{aiBusy ? "Analyzing…" : "Generate SEO details"}</span><b aria-hidden="true">↗</b></button>
            {aiMessage && <p className="ai-message" aria-live="polite">{aiMessage}</p>}
          </section>

          <div className="form-pair"><label>Photograph title<input value={uploadDetails.title} onChange={(event) => setUploadDetails({ ...uploadDetails, title: event.target.value })} maxLength={140} required /></label><label>Photographer name<input value={uploadDetails.photographerName} onChange={(event) => setUploadDetails({ ...uploadDetails, photographerName: event.target.value })} maxLength={100} required /></label></div>
          <label>Category<select required value={uploadDetails.category} onChange={(event) => setUploadDetails({ ...uploadDetails, category: event.target.value })}><option value="" disabled>Choose one</option>{PHOTO_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Story or description<textarea value={uploadDetails.description} onChange={(event) => setUploadDetails({ ...uploadDetails, description: event.target.value })} maxLength={1000} placeholder="Visible story, setting and moment…" /></label>
          <div className="form-pair"><label>Search tags<input value={uploadDetails.tags} onChange={(event) => setUploadDetails({ ...uploadDetails, tags: event.target.value })} placeholder="wildlife, coastal light, japan" /></label><label>SEO phrases<input value={uploadDetails.keywords} onChange={(event) => setUploadDetails({ ...uploadDetails, keywords: event.target.value })} placeholder="natural phrases, comma separated" /></label></div>
          <label>Accessible image description<input value={uploadDetails.altText} onChange={(event) => setUploadDetails({ ...uploadDetails, altText: event.target.value })} maxLength={240} placeholder="Describe what is visibly present in the photograph" /></label>
          <div className="seo-fields"><span>Search preview</span><label>SEO title<input value={uploadDetails.seoTitle} onChange={(event) => setUploadDetails({ ...uploadDetails, seoTitle: event.target.value })} maxLength={70} /></label><label>SEO description<textarea value={uploadDetails.seoDescription} onChange={(event) => setUploadDetails({ ...uploadDetails, seoDescription: event.target.value })} maxLength={170} /></label></div>
          <button type="submit" className="publish premium-publish" disabled={busy}>{busy ? "Publishing…" : "Review complete · publish ↗"}</button>
          {uploadMessage && <p className="form-message" role="status">{uploadMessage}</p>}
        </form>
      </section> : <>
        <div className="archive-summary"><div><strong>{visible.length}</strong><span>{filter === "all" ? "total photographs" : `${filter} photographs`}</span></div><p>Grouped by upload month · newest first</p></div>
        <div className="monthly-archive">
          {groupedVisible.map((group) => <section className="admin-month-group" key={group.key}>
            <header><div><span>{group.year}</span><h2>{group.month}</h2></div><small>{group.items.length} {group.items.length === 1 ? "frame" : "frames"}</small></header>
            <div className="review-grid">{group.items.map((item) => <button type="button" className="review-card" key={item.id} onClick={() => openSubmission(item)}><div className="review-card-image"><img src={item.downloadUrl} alt={item.altText || item.title} />{item.aiGenerated && <span className="ai-card-badge">AI refined</span>}</div><div><span className={`status ${item.status}`}>{item.status}</span><h3>{item.title}</h3><p>{item.photographerName} · {item.category}</p><small>{item.createdAt?.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) ?? "Just now"}</small></div></button>)}</div>
          </section>)}
        </div>
        {!visible.length && <div className="empty">Nothing in this archive.</div>}
      </>}
    </section>

    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><section className="review-modal" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setSelected(null)} aria-label="Close photo editor">×</button><div className="review-image"><img src={selected.downloadUrl} alt={selected.altText || selected.title} /></div><aside><span className="tag">{selected.category}</span>{editing ? <form className="edit-submission-form" onSubmit={saveDetails}><label>Photograph title<input required maxLength={140} value={editValues.title} onChange={(event) => setEditValues({ ...editValues, title: event.target.value })} /></label><label>Photographer name<input required maxLength={100} value={editValues.photographerName} onChange={(event) => setEditValues({ ...editValues, photographerName: event.target.value })} /></label><label>Category<select required value={editValues.category} onChange={(event) => setEditValues({ ...editValues, category: event.target.value })}>{PHOTO_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Description<textarea maxLength={1000} value={editValues.description} onChange={(event) => setEditValues({ ...editValues, description: event.target.value })} /></label><label>Tags<input value={editValues.tags} onChange={(event) => setEditValues({ ...editValues, tags: event.target.value })} /></label><label>SEO phrases<input value={editValues.keywords} onChange={(event) => setEditValues({ ...editValues, keywords: event.target.value })} /></label><label>Alt text<textarea maxLength={240} value={editValues.altText} onChange={(event) => setEditValues({ ...editValues, altText: event.target.value })} /></label><label>SEO title<input maxLength={70} value={editValues.seoTitle} onChange={(event) => setEditValues({ ...editValues, seoTitle: event.target.value })} /></label><label>SEO description<textarea maxLength={170} value={editValues.seoDescription} onChange={(event) => setEditValues({ ...editValues, seoDescription: event.target.value })} /></label><div className="edit-form-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div></form> : <><h2>{selected.title}</h2><p>By <b>{selected.photographerName}</b><br />{selected.submitterEmail}</p><p className="review-story">{selected.description || "No description provided."}</p>{selected.tags.length > 0 && <div className="admin-tag-list">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}<div className="submission-manage-actions"><button type="button" onClick={() => setEditing(true)}>Edit metadata</button><button type="button" className="danger" disabled={busy} onClick={removePhoto}>{busy ? "Deleting…" : "Delete permanently"}</button></div><label>Private note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional feedback for photographer" /></label><div className="review-actions"><button type="button" disabled={busy} onClick={() => review("rejected")}>Reject</button><button type="button" disabled={busy} onClick={() => review("pending")}>Keep pending</button><button type="button" disabled={busy} onClick={() => review("approved")}>Approve & publish ↗</button></div></>}</aside></section></div>}
  </main>;
}
