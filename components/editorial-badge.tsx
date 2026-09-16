import { Aperture, Sparkles } from "lucide-react";
import type { Photo } from "@/lib/gallery-data";

export function EditorialBadge({ photo }: { photo: Photo }) {
  if (!photo.lumiShutterChoice && photo.source !== "community") return null;
  const choice = photo.lumiShutterChoice === true;
  const Icon = choice ? Sparkles : Aperture;
  return <span className={`editorial-badge ${choice ? "editorial-choice" : "editorial-feed"}`}>
    <Icon size={12} strokeWidth={1.5} aria-hidden="true" />
    {choice ? "LumiShutter Choice" : "IrisSnap Feed"}
  </span>;
}

export function ContributorBadge({ photo }: { photo: Photo }) {
  if (!photo.irisSnapVerified) return null;
  return <span className="contributor-badge" title="IrisSnap · contribution reviewed by WildSaura">
    <Aperture size={12} strokeWidth={1.5} aria-hidden="true" /> IrisSnap
    <span className="sr-only"> · contribution reviewed by WildSaura</span>
  </span>;
}
