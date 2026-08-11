"use client";

import { useState } from "react";
import { Download, LoaderCircle, Share2, Sparkles } from "lucide-react";
import { downloadPublicPhoto } from "@/lib/image-processing";

export function PhotoActions(props: {
  title: string;
  photographer: string;
  sourceUrl: string;
  standardUrl?: string;
  standardFileSize?: number;
  watermarked: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function share() {
    const url = window.location.href.split("?")[0];
    const data = { url };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    }
  }

  async function download() {
    setBusy(true); setMessage("");
    try {
      await downloadPublicPhoto({
        url: props.sourceUrl,
        title: props.title,
        photographer: props.photographer,
        alreadyWatermarked: props.watermarked,
        standardUrl: props.standardUrl,
      });
      setMessage(props.standardUrl ? "Standard download started" : "Legacy preview download ready");
    } catch {
      setMessage("Download could not be prepared.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="photo-page-actions">
    <button type="button" onClick={share}>
      <span className="action-symbol" aria-hidden="true"><Share2 size={20} strokeWidth={1.8} /></span>
      <span><strong>Share photograph</strong><small>Clean link with photo preview</small></span>
    </button>
    <button type="button" onClick={download} disabled={busy} aria-busy={busy}>
      <span className="action-symbol" aria-hidden="true">{busy ? <LoaderCircle className="is-spinning" size={20} strokeWidth={1.8} /> : <Download size={20} strokeWidth={1.8} />}</span>
      <span><strong>{busy ? "Preparing download…" : "Standard size"}</strong><small>{props.standardUrl ? `Free JPEG · ${props.standardFileSize ? `${(props.standardFileSize / (1024 * 1024)).toFixed(1)} MB` : "5–10 MB when source allows"}` : "Legacy free preview · under 4 MB"}</small></span>
    </button>
    <a href="/premium">
      <span className="action-symbol" aria-hidden="true"><Sparkles size={20} strokeWidth={1.8} /></span>
      <span><strong>Original quality</strong><small>Premium access · coming soon</small></span>
    </a>
    {message && <small role="status">{message}</small>}
  </div>;
}
