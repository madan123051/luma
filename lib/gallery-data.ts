export type EditorialCollection = "none" | "irissnap" | "lumishutter";

// Preserve explicit LumiShutter picks from the first release, but never infer
// an IrisSnap tag from a submission's community origin or verification badge.
export function getEditorialCollection(photo: { editorialCollection?: string; lumiShutterChoice?: boolean }): EditorialCollection {
  if (photo.editorialCollection === "none" || photo.editorialCollection === "irissnap" || photo.editorialCollection === "lumishutter") return photo.editorialCollection;
  return photo.lumiShutterChoice === true ? "lumishutter" : "none";
}

export type Photo = {
  id: number | string;
  title: string;
  photographer: string;
  category: string;
  description?: string;
  altText?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  keywords?: string[];
  slug?: string;
  src: string;
  sourceUrl?: string;
  posterUrl?: string;
  standardUrl?: string;
  standardFileSize?: number;
  mediaType?: "image" | "video";
  durationSeconds?: number;
  height: "tall" | "wide" | "standard";
  likes: number;
  watermarked?: boolean;
  editorialCollection?: EditorialCollection;
  lumiShutterChoice?: boolean;
  irisSnapVerified?: boolean;
  source?: "curated" | "community";
  publishedAt?: Date | string | null;
};

export function isVideoPhoto(photo: Pick<Photo, "mediaType" | "sourceUrl" | "src">) {
  return photo.mediaType === "video"
    || photo.sourceUrl?.toLowerCase().includes(".webm") === true
    || photo.sourceUrl?.toLowerCase().includes("video") === true
    || photo.src.toLowerCase().includes(".webm");
}

export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "").slice(0, 110);
}

export function photoSlug(photo: Pick<Photo, "title" | "photographer"> & { slug?: string }) {
  return photo.slug?.trim() || slugify(`${photo.title}-by-${photo.photographer}`);
}

export function photoPath(photo: Pick<Photo, "title" | "photographer"> & { slug?: string }) {
  return `/photo/${photoSlug(photo)}`;
}
