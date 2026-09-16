import { Aperture, Sparkles } from "lucide-react";
import { getEditorialCollection, type Photo } from "@/lib/gallery-data";

export function EditorialBadge({ photo }: { photo: Photo }) {
  const collection = getEditorialCollection(photo);
  if (collection === "none") return null;
  const choice = collection === "lumishutter";
  const Icon = choice ? Sparkles : Aperture;
  return <span className={`editorial-badge ${choice ? "editorial-choice" : "editorial-feed"}`}>
    <Icon size={12} strokeWidth={1.5} aria-hidden="true" />
    {choice ? "LumiShutter Choice" : "IrisSnap Feed"}
  </span>;
}

export function ContributorBadge({ photo }: { photo: Photo }) {
  if (!photo.irisSnapVerified || getEditorialCollection(photo) === "none") return null;
  return <span className="contributor-badge" title="IrisSnap · contribution reviewed by WildSaura">
    <Aperture size={12} strokeWidth={1.5} aria-hidden="true" /> IrisSnap
    <span className="sr-only"> · contribution reviewed by WildSaura</span>
  </span>;
}
