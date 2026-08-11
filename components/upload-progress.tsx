import type { SubmissionProgress } from "@/lib/submissions";

export function UploadProgress({ progress }: { progress: SubmissionProgress | null }) {
  if (!progress) return null;
  return <div className={`upload-progress ${progress.stage}`} role="status" aria-live="polite">
    <div><span>{progress.label}</span><strong>{progress.percent}%</strong></div>
    <progress max={100} value={progress.percent} aria-label={`${progress.label} ${progress.percent}%`} />
  </div>;
}
