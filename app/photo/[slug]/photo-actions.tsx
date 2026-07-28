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
    <button onClick={share}>Share ↗</button>
    <button onClick={download} disabled={busy}>{busy ? "Preparing…" : "Download compressed ↓"}</button>
    <a href="/premium">Original · Premium soon</a>
    {message && <small>{message}</small>}
  </div>;
}
