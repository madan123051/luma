"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from "firebase/auth";
import { AuthPanel } from "@/components/auth-panel";
import { UploadProgress } from "@/components/upload-progress";
import { type AiPhotoMetadata, PHOTO_CATEGORIES } from "@/lib/ai-metadata";
import { auth, isAdminEmail } from "@/lib/firebase";
import { createAiPhotoDataUrl } from "@/lib/image-processing";
import {
  createStandardDownloadForSubmission, createSubmission, deleteSubmission, getAllSubmissions, reviewSubmission, submissionErrorMessage,
  updateSubmissionDetails, type Submission, type SubmissionProgress, type SubmissionStatus,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAiPhotoMetadata(value: unknown): value is AiPhotoMetadata {
  if (!isRecord(value)) return false;
  const stringFields = ["title", "description", "altText", "seoTitle", "seoDescription", "locationHint", "mood"];
  const arrayFields = ["tags", "keywords", "subjects"];
  return (
    stringFields.every((field) => typeof value[field] === "string") &&
    arrayFields.every((field) => Array.isArray(value[field]) && value[field].every((item) => typeof item === "string")) &&
    typeof value.category === "string" &&
    (PHOTO_CATEGORIES as readonly string[]).includes(value.category)
  );
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
  const [aiSearchAttributionHtml, setAiSearchAttributionHtml] = useState("");
  const [uploadProgress, setUploadProgress] = useState<SubmissionProgress | null>(null);
  const uploadInFlightRef = useRef(false);
  const [standardProgress, setStandardProgress] = useState<SubmissionProgress | null>(null);
  const [standardMessage, setStandardMessage] = useState("");
  const [standardBusy, setStandardBusy] = useState(false);
  const [bulkStandardProgress, setBulkStandardProgress] = useState<SubmissionProgress | null>(null);
  const [bulkStandardMessage, setBulkStandardMessage] = useState("");
  const [bulkStandardErrors, setBulkStandardErrors] = useState<string[]>([]);
  const [bulkStandardBusy, setBulkStandardBusy] = useState(false);
  const bulkStandardInFlightRef = useRef(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => () => {
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
  }, [selectedPreviewUrl]);

  async function load() {
    setItems(await getAllSubmissions());
  }

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    setAuthReady(true);
    if (isAdminEmail(current?.email) && current?.emailVerified) {
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

  const missingStandardItems = useMemo(
    () => items.filter((item) => item.status === "approved" && !item.standardDownloadUrl),
    [items],
  );

  function openSubmission(item: Submission) {
    setSelected(item);
    setNote(item.adminNote);
    setEditing(false);
    setEditValues(detailValues(item));
    setStandardProgress(null);
    setStandardMessage("");
  }

  async function review(status: SubmissionStatus) {
    if (!selected || !user?.email) return;
    setBusy(true);
    setStandardMessage("");
    try {
      if (status === "approved" && (selected.status !== "approved" || !selected.standardDownloadUrl)) {
        setStandardBusy(true);
        setStandardProgress({ percent: 1, stage: "preparing", label: "Preparing Standard download before publishing…" });
        const standard = await createStandardDownloadForSubmission(selected, setStandardProgress);
        setSelected({ ...selected, ...standard });
      }
      await reviewSubmission(selected.id, status, note, user.email);
      setSelected(null);
      setNote("");
      await load();
    } catch (error) {
      const message = submissionErrorMessage(error);
      setStandardMessage(message);
      setStandardProgress((progress) => ({ percent: progress?.percent ?? 0, stage: "error", label: "Publishing stopped" }));
    } finally {
      setBusy(false);
      setStandardBusy(false);
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const result = await updateSubmissionDetails(selected, {
        ...editValues,
        tags: listFromText(editValues.tags),
        keywords: listFromText(editValues.keywords),
      });
      setEditing(false);
      if (result.standardInvalidated) {
        setSelected({
          ...selected,
          ...editValues,
          title: editValues.title.trim(),
          photographerName: editValues.photographerName.trim(),
          tags: listFromText(editValues.tags),
          keywords: listFromText(editValues.keywords),
          standardPath: "",
          standardDownloadUrl: "",
          standardFileSize: 0,
        });
        setStandardMessage("Metadata saved. Create Standard once to refresh its title and copyright banner.");
        setStandardProgress(null);
        void load().catch(() => {});
      } else {
        setSelected(null);
        await load();
      }
    } catch (error) {
      setStandardMessage(submissionErrorMessage(error));
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

  async function buildStandardDownload() {
    if (!selected || standardBusy) return;
    setStandardBusy(true);
    setStandardMessage("");
    setStandardProgress({ percent: 1, stage: "preparing", label: "Starting Standard download…" });
    try {
      const standard = await createStandardDownloadForSubmission(selected, setStandardProgress);
      setSelected({ ...selected, ...standard });
      setStandardMessage("Standard download is ready for visitors.");
      void load().catch(() => {});
    } catch (error) {
      const message = submissionErrorMessage(error);
      setStandardMessage(message);
      setStandardProgress((progress) => ({ percent: progress?.percent ?? 0, stage: "error", label: "Standard preparation stopped" }));
    } finally {
      setStandardBusy(false);
    }
  }

  async function buildAllMissingStandards() {
    if (bulkStandardInFlightRef.current || !missingStandardItems.length) return;
    const queue = [...missingStandardItems];
    const total = queue.length;
    const failures: string[] = [];
    let completed = 0;

    bulkStandardInFlightRef.current = true;
    setBulkStandardBusy(true);
    setBulkStandardMessage("");
    setBulkStandardErrors([]);
    setBulkStandardProgress({ percent: 0, stage: "preparing", label: `Preparing ${total} Standard ${total === 1 ? "download" : "downloads"}…` });

    for (const [index, item] of queue.entries()) {
      try {
        const standard = await createStandardDownloadForSubmission(item, (progress) => {
          const percent = Math.min(99, Math.round(((index + progress.percent / 100) / total) * 100));
          setBulkStandardProgress({
            percent,
            stage: progress.stage === "complete" ? "saving" : progress.stage,
            label: `${index + 1} of ${total} · ${item.title} · ${progress.label}`,
          });
        });
        completed += 1;
        setItems((current) => current.map((currentItem) => (
          currentItem.id === item.id ? { ...currentItem, ...standard } : currentItem
        )));
      } catch (error) {
        failures.push(`${item.title}: ${submissionErrorMessage(error)}`);
        setBulkStandardProgress({
          percent: Math.round(((index + 1) / total) * 100),
          stage: "saving",
          label: `${item.title} could not be prepared · continuing with the next photo…`,
        });
      }
    }

    setBulkStandardErrors(failures);
    setBulkStandardProgress({
      percent: 100,
      stage: failures.length ? "error" : "complete",
      label: failures.length ? `Finished with ${failures.length} ${failures.length === 1 ? "photo" : "photos"} needing retry` : "All Standard downloads are ready",
    });
    setBulkStandardMessage(
      failures.length
        ? `${completed} of ${total} Standard downloads created. Use “Retry missing Standards” to retry the remaining ${failures.length}.`
        : `${completed} Standard ${completed === 1 ? "download is" : "downloads are"} ready for visitors.`,
    );
    setBulkStandardBusy(false);
    bulkStandardInFlightRef.current = false;
    void load().catch(() => {});
  }

  function choosePhoto(file: File | undefined) {
    setSelectedFile(file ?? null);
    setSelectedPreviewUrl(file ? URL.createObjectURL(file) : "");
    setAiMessage("");
    setAiApplied(false);
    setAiSearchAttributionHtml("");
    setUploadProgress(null);
    setUploadMessage("");
  }

  async function analyzePhoto() {
    if (!selectedFile || !user) {
      setAiMessage("Select a photograph first.");
      return;
    }
    setAiBusy(true);
    setAiMessage("Reading the frame and researching natural search language…");
    setAiSearchAttributionHtml("");
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
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("AI service returned an unreadable response.");
      }
      const envelope = isRecord(payload) ? payload : {};
      if (!response.ok) {
        throw new Error(typeof envelope.error === "string" && envelope.error ? envelope.error : "AI suggestions could not be prepared.");
      }
      const metadataValue = "metadata" in envelope ? envelope.metadata : payload;
      if (!isAiPhotoMetadata(metadataValue)) {
        throw new Error("AI returned incomplete metadata. Please try again.");
      }
      const metadata = metadataValue;
      const searchAttributionHtml = typeof envelope.searchAttributionHtml === "string"
        ? envelope.searchAttributionHtml
        : "";
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
      setAiSearchAttributionHtml(searchAttributionHtml);
      setAiMessage(`AI draft ready · ${metadata.subjects.slice(0, 3).join(" · ")}${metadata.locationHint ? ` · ${metadata.locationHint}` : ""}`);
    } catch (error) {
      setAiSearchAttributionHtml("");
      setAiMessage(error instanceof Error ? error.message : "AI suggestions could not be prepared.");
    } finally {
      setAiBusy(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadInFlightRef.current) return;
    const form = event.currentTarget;
    if (!user?.email || !selectedFile) return setUploadMessage("Please select a photograph.");
    if (selectedFile.size > 50 * 1024 * 1024) return setUploadMessage("Image must be 50MB or smaller.");
    uploadInFlightRef.current = true;
    setBusy(true);
    setUploadMessage("");
    setUploadProgress({ percent: 1, stage: "preparing", label: "Starting secure upload…" });
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
        user: { uid: user.uid, email: user.email, emailVerified: user.emailVerified },
        status: "approved",
        onProgress: setUploadProgress,
      });
      form.reset();
      setSelectedFile(null);
      setSelectedPreviewUrl("");
      setUploadDetails({ ...emptyDetails, photographerName: user.displayName?.trim() || "WildSaura" });
      setAiContext("");
      setAiApplied(false);
      setAiMessage("");
      setAiSearchAttributionHtml("");
      setUploadMessage("Published successfully. The new photograph is live at the top of the gallery.");
      void load().catch(() => setUploadMessage("Published successfully. Refresh the archive to see the new photograph."));
    } catch (error) {
      const message = submissionErrorMessage(error);
      setUploadMessage(message);
      setUploadProgress((progress) => ({ percent: progress?.percent ?? 0, stage: "error", label: "Upload stopped" }));
    } finally {
      setBusy(false);
      uploadInFlightRef.current = false;
    }
  }

  if (!authReady) return <main className="auth-page"><p>Loading secure admin…</p></main>;
  if (!user) return <AuthPanel purpose="admin" />;
  if (!isAdminEmail(user.email)) return <main className="access-denied"><h1>Admin access required.</h1><p>Signed in as {user.email}. This address is not on the WildSaura admin allowlist.</p><button type="button" onClick={() => signOut(auth)}>Sign in with another account</button><Link href="/">Return to gallery</Link></main>;
  if (!user.emailVerified) return <main className="access-denied"><h1>Verify the admin email.</h1><p>Firebase requires {user.email} to be verified before the private archive or publishing tools can open.</p><button type="button" onClick={async () => {
    setVerificationMessage("");
    try {
      await sendEmailVerification(user);
      setVerificationMessage("Verification email sent. Open it, then sign in again.");
    } catch {
      setVerificationMessage("Verification email could not be sent yet. Please wait a moment and retry.");
    }
  }}>Send verification email</button>{verificationMessage && <p role="status">{verificationMessage}</p>}<button type="button" onClick={() => signOut(auth)}>Sign in with another account</button><Link href="/">Return to gallery</Link></main>;

  return <main className="admin-page">
    <aside className="admin-sidebar">
      <Link className="brand" href="/">LU<span>●</span>MA <small>studio</small></Link>
      <p className="admin-sidebar-label">Editorial workspace</p>
      <nav aria-label="Admin sections">
        <button type="button" className={view === "upload" ? "active" : ""} disabled={bulkStandardBusy} onClick={() => setView("upload")}>AI publish studio<span>＋</span></button>
        {(["pending", "approved", "rejected", "all"] as const).map((item) => <button type="button" className={view === "review" && filter === item ? "active" : ""} onClick={() => { setView("review"); setFilter(item); }} key={item}>{item}<span>{item === "all" ? items.length : counts[item]}</span></button>)}
      </nav>
      <div><small>{user.email}</small><button type="button" disabled={bulkStandardBusy} onClick={() => signOut(auth)}>Sign out</button></div>
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
            {aiSearchAttributionHtml && <div className="ai-search-attribution"><span>Google Search context</span><iframe title="Google Search suggestions used for metadata" srcDoc={aiSearchAttributionHtml} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" /></div>}
          </section>

          <div className="form-pair"><label>Photograph title<input value={uploadDetails.title} onChange={(event) => setUploadDetails({ ...uploadDetails, title: event.target.value })} maxLength={140} required /></label><label>Photographer name<input value={uploadDetails.photographerName} onChange={(event) => setUploadDetails({ ...uploadDetails, photographerName: event.target.value })} maxLength={100} required /></label></div>
          <label>Category<select required value={uploadDetails.category} onChange={(event) => setUploadDetails({ ...uploadDetails, category: event.target.value })}><option value="" disabled>Choose one</option>{PHOTO_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Story or description<textarea value={uploadDetails.description} onChange={(event) => setUploadDetails({ ...uploadDetails, description: event.target.value })} maxLength={1000} placeholder="Visible story, setting and moment…" /></label>
          <div className="form-pair"><label>Search tags<input value={uploadDetails.tags} onChange={(event) => setUploadDetails({ ...uploadDetails, tags: event.target.value })} placeholder="wildlife, coastal light, japan" /></label><label>SEO phrases<input value={uploadDetails.keywords} onChange={(event) => setUploadDetails({ ...uploadDetails, keywords: event.target.value })} placeholder="natural phrases, comma separated" /></label></div>
          <label>Accessible image description<input value={uploadDetails.altText} onChange={(event) => setUploadDetails({ ...uploadDetails, altText: event.target.value })} maxLength={240} placeholder="Describe what is visibly present in the photograph" /></label>
          <div className="seo-fields"><span>Search preview</span><label>SEO title<input value={uploadDetails.seoTitle} onChange={(event) => setUploadDetails({ ...uploadDetails, seoTitle: event.target.value })} maxLength={70} /></label><label>SEO description<textarea value={uploadDetails.seoDescription} onChange={(event) => setUploadDetails({ ...uploadDetails, seoDescription: event.target.value })} maxLength={170} /></label></div>
          <button type="submit" className="publish premium-publish" disabled={busy || bulkStandardBusy}>{busy ? `Publishing · ${uploadProgress?.percent ?? 0}%` : "Review complete · publish ↗"}</button>
          <UploadProgress progress={uploadProgress} />
          {uploadMessage && <p className="form-message" role="status">{uploadMessage}</p>}
        </form>
      </section> : <>
        <section className="archive-tools" aria-label="Photo archive tools">
          <div className="archive-summary">
            <div className="archive-summary-count"><strong>{visible.length}</strong><span>{filter === "all" ? "total photographs" : `${filter} photographs`}</span></div>
            <div className="archive-summary-actions">
              <p>Grouped by upload month · newest first</p>
              {missingStandardItems.length ? <button type="button" className="bulk-standard-button" disabled={bulkStandardBusy || busy || standardBusy} onClick={buildAllMissingStandards}>
                <span>{bulkStandardBusy ? "Creating Standards…" : bulkStandardErrors.length ? "Retry missing Standards" : "Create missing Standards"}</span>
                <b>{missingStandardItems.length}</b>
              </button> : <span className="all-standards-ready">✓ All Standard downloads ready</span>}
            </div>
          </div>
          {(bulkStandardProgress || bulkStandardMessage) && <div className="bulk-standard-feedback">
            <UploadProgress progress={bulkStandardProgress} />
            {bulkStandardMessage && <p className={bulkStandardErrors.length ? "bulk-standard-message has-errors" : "bulk-standard-message"} role="status">{bulkStandardMessage}</p>}
            {bulkStandardErrors.length > 0 && <details className="bulk-standard-errors"><summary>Show {bulkStandardErrors.length} failed {bulkStandardErrors.length === 1 ? "photo" : "photos"}</summary><ul>{bulkStandardErrors.map((error) => <li key={error}>{error}</li>)}</ul></details>}
          </div>}
        </section>
        <div className="monthly-archive">
          {groupedVisible.map((group) => <section className="admin-month-group" key={group.key}>
            <header><div><span>{group.year}</span><h2>{group.month}</h2></div><small>{group.items.length} {group.items.length === 1 ? "frame" : "frames"}</small></header>
            <div className="review-grid">{group.items.map((item) => <button type="button" className="review-card" key={item.id} onClick={() => openSubmission(item)}><div className="review-card-image"><img src={item.downloadUrl} alt={item.altText || item.title} />{item.aiGenerated && <span className="ai-card-badge">AI refined</span>}</div><div><span className={`status ${item.status}`}>{item.status}</span><h3>{item.title}</h3><p>{item.photographerName} · {item.category}</p><small>{item.createdAt?.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) ?? "Just now"}</small></div></button>)}</div>
          </section>)}
        </div>
        {!visible.length && <div className="empty">Nothing in this archive.</div>}
      </>}
    </section>

    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><section className="review-modal" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setSelected(null)} aria-label="Close photo editor">×</button><div className="review-image"><img src={selected.downloadUrl} alt={selected.altText || selected.title} /></div><aside><span className="tag">{selected.category}</span>{editing ? <form className="edit-submission-form" onSubmit={saveDetails}><label>Photograph title<input required maxLength={140} value={editValues.title} onChange={(event) => setEditValues({ ...editValues, title: event.target.value })} /></label><label>Photographer name<input required maxLength={100} value={editValues.photographerName} onChange={(event) => setEditValues({ ...editValues, photographerName: event.target.value })} /></label><label>Category<select required value={editValues.category} onChange={(event) => setEditValues({ ...editValues, category: event.target.value })}>{PHOTO_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Description<textarea maxLength={1000} value={editValues.description} onChange={(event) => setEditValues({ ...editValues, description: event.target.value })} /></label><label>Tags<input value={editValues.tags} onChange={(event) => setEditValues({ ...editValues, tags: event.target.value })} /></label><label>SEO phrases<input value={editValues.keywords} onChange={(event) => setEditValues({ ...editValues, keywords: event.target.value })} /></label><label>Alt text<textarea maxLength={240} value={editValues.altText} onChange={(event) => setEditValues({ ...editValues, altText: event.target.value })} /></label><label>SEO title<input maxLength={70} value={editValues.seoTitle} onChange={(event) => setEditValues({ ...editValues, seoTitle: event.target.value })} /></label><label>SEO description<textarea maxLength={170} value={editValues.seoDescription} onChange={(event) => setEditValues({ ...editValues, seoDescription: event.target.value })} /></label><div className="edit-form-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button disabled={busy || bulkStandardBusy}>{busy ? "Saving…" : "Save changes"}</button></div></form> : <><h2>{selected.title}</h2><p>By <b>{selected.photographerName}</b><br />{selected.submitterEmail}</p><p className="review-story">{selected.description || "No description provided."}</p>{selected.tags.length > 0 && <div className="admin-tag-list">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}<div className="submission-manage-actions"><button type="button" disabled={busy || standardBusy || bulkStandardBusy} onClick={() => setEditing(true)}>Edit metadata</button><button type="button" disabled={busy || standardBusy || bulkStandardBusy} onClick={buildStandardDownload}>{standardBusy ? `Standard ${standardProgress?.percent ?? 0}%` : selected.standardDownloadUrl ? "Refresh Standard" : "Create Standard"}</button><button type="button" className="danger" disabled={busy || standardBusy || bulkStandardBusy} onClick={removePhoto}>{busy ? "Deleting…" : "Delete permanently"}</button></div><UploadProgress progress={standardProgress} />{standardMessage && <p className="standard-message" role="status">{standardMessage}</p>}<label>Private note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional feedback for photographer" /></label><div className="review-actions"><button type="button" disabled={busy || standardBusy || bulkStandardBusy} onClick={() => review("rejected")}>Reject</button><button type="button" disabled={busy || standardBusy || bulkStandardBusy} onClick={() => review("pending")}>Keep pending</button><button type="button" disabled={busy || standardBusy || bulkStandardBusy} onClick={() => review("approved")}>Approve & publish ↗</button></div></>}</aside></section></div>}
  </main>;
}
