"use client";

import { useState } from "react";
import { downloadPublicPhoto } from "@/lib/image-processing";

export function PhotoActions(props: {
  title: string;
  photographer: string;
  sourceUrl: string;
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
      });
      setMessage("Download ready");
    } catch {
      setMessage("Download could not be prepared.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="photo-page-actions">
    <button type="button" onClick={share}><span className="action-symbol" aria-hidden="true">↗</span><span><strong>Share photograph</strong><small>Clean link with photo preview</small></span></button>
    <button type="button" onClick={download} disabled={busy}><span className="action-symbol" aria-hidden="true">↓</span><span><strong>{busy ? "Preparing download…" : "Download preview"}</strong><small>Compressed · copyright marked</small></span></button>
    <a href="/premium"><span className="action-symbol" aria-hidden="true">✦</span><span><strong>Original quality</strong><small>Premium access · coming soon</small></span></a>
    {message && <small role="status">{message}</small>}
  </div>;
}
