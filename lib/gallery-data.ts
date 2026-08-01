export type Photo = {
  id: number | string;
  title: string;
  photographer: string;
  category: string;
  description?: string;
  src: string;
  sourceUrl?: string;
  height: "tall" | "wide" | "standard";
  likes: number;
  watermarked?: boolean;
  source?: "curated" | "community";
  publishedAt?: Date | string | null;
};

export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "").slice(0, 110);
}

export function photoSlug(photo: Pick<Photo, "title" | "photographer">) {
  return slugify(`${photo.title}-by-${photo.photographer}`);
}

export function photoPath(photo: Pick<Photo, "title" | "photographer">) {
  return `/photo/${photoSlug(photo)}`;
}
