"use client";

import { useState } from "react";
import { Clock3, Download, LoaderCircle, Share2, Sparkles } from "lucide-react";
import { downloadPublicPhoto, downloadPublicVideo, downloadStandardPhoto, downloadStandardVideo } from "@/lib/image-processing";

export function PhotoActions(props: {
  title: string;
  photographer: string;
  sourceUrl: string;
  standardUrl?: string;
  standardFileSize?: number;
  watermarked: boolean;
  mediaType?: "image" | "video";
}) {
  const [busyTier, setBusyTier] = useState<"preview" | "standard" | null>(null);
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

  async function downloadPreview() {
    setBusyTier("preview"); setMessage("");
    try {
      if (props.mediaType === "video") await downloadPublicVideo({ url: props.sourceUrl, title: props.title });
      else await downloadPublicPhoto({
          url: props.sourceUrl,
          title: props.title,
          photographer: props.photographer,
          alreadyWatermarked: props.watermarked,
        });
      setMessage("Free Preview download started");
    } catch {
      setMessage("Preview download could not be prepared.");
    } finally {
      setBusyTier(null);
    }
  }

  async function downloadStandard() {
    if (!props.standardUrl) {
      setMessage("Standard Size is still being prepared for this photo.");
      return;
    }
    setBusyTier("standard"); setMessage("");
    try {
      if (props.mediaType === "video") await downloadStandardVideo({ standardUrl: props.standardUrl, title: props.title });
      else await downloadStandardPhoto({ standardUrl: props.standardUrl, title: props.title });
      setMessage("Standard Size download started");
    } catch {
      setMessage("Standard Size download could not be started.");
    } finally {
      setBusyTier(null);
    }
  }

  return <div className="photo-page-actions">
    <button type="button" onClick={share}>
      <span className="action-symbol" aria-hidden="true"><Share2 size={20} strokeWidth={1.8} /></span>
      <span><strong>Share {props.mediaType === "video" ? "video clip" : "photograph"}</strong><small>Clean link with preview thumbnail</small></span>
    </button>
    <button className="download-preview-action" type="button" onClick={downloadPreview} disabled={busyTier === "preview"} aria-busy={busyTier === "preview"}>
      <span className="action-symbol" aria-hidden="true">{busyTier === "preview" ? <LoaderCircle className="is-spinning" size={20} strokeWidth={1.8} /> : <Download size={20} strokeWidth={1.8} />}</span>
      <span><strong>{busyTier === "preview" ? "Preparing Preview…" : "Free Preview"}</strong><small>{props.mediaType === "video" ? "Watermarked video clip · 10–30 sec" : "Watermarked JPEG · under 4 MB"}</small></span>
    </button>
    <button
      className="download-standard-action"
      type="button"
      onClick={downloadStandard}
      disabled={!props.standardUrl || busyTier === "standard"}
      aria-busy={busyTier === "standard"}
      aria-label={props.standardUrl ? "Download Standard Size photograph" : "Standard Size is being prepared"}
    >
      <span className="action-symbol" aria-hidden="true">{busyTier === "standard" ? <LoaderCircle className="is-spinning" size={20} strokeWidth={1.8} /> : props.standardUrl ? <Download size={20} strokeWidth={1.8} /> : <Clock3 size={20} strokeWidth={1.8} />}</span>
      <span><strong>{busyTier === "standard" ? "Starting Standard…" : props.standardUrl ? "Standard Size" : "Standard preparing"}</strong><small>{props.standardUrl ? (props.mediaType === "video" ? `Watermarked compressed video · ${props.standardFileSize ? `${(props.standardFileSize / (1024 * 1024)).toFixed(1)} MB` : "under 25 MB"}` : `White title strip · ${props.standardFileSize ? `${(props.standardFileSize / (1024 * 1024)).toFixed(1)} MB` : "5–10 MB when source allows"}`) : "Not ready yet · check back soon"}</small></span>
    </button>
    <a className="premium-action" href="/premium">
      <span className="action-symbol" aria-hidden="true"><Sparkles size={20} strokeWidth={1.8} /></span>
      <span><strong>Original quality</strong><small>Premium access · coming soon</small></span>
    </a>
    {message && <small role="status">{message}</small>}
  </div>;
}
