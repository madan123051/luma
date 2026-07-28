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
  publishedAt?: Date | null;
};

export const photos: Photo[] = [
  { id: 1, title: "Dolomites, after rain", photographer: "Maya Lin", category: "Nature", src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 2841, source: "curated" },
  { id: 2, title: "Quiet geometry", photographer: "Theo Martin", category: "Architecture", src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=82", height: "standard", likes: 1922, source: "curated" },
  { id: 3, title: "Sunday light", photographer: "June Park", category: "People", src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 3510, source: "curated" },
  { id: 4, title: "Slow coast", photographer: "Ari Costa", category: "Travel", src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82", height: "wide", likes: 2210, source: "curated" },
  { id: 5, title: "Night pulse", photographer: "Nico Vale", category: "Street", src: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=82", height: "standard", likes: 1604, source: "curated" },
  { id: 6, title: "Green room", photographer: "Elsa Moreau", category: "Interiors", src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 2987, source: "curated" },
  { id: 7, title: "Freshly made", photographer: "Omar Khan", category: "Food", src: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=82", height: "standard", likes: 1320, source: "curated" },
  { id: 8, title: "Salt air", photographer: "Rin Sato", category: "Nature", src: "https://images.unsplash.com/photo-1476673160081-cf065607f449?auto=format&fit=crop&w=1200&q=82", height: "wide", likes: 2664, source: "curated" },
  { id: 9, title: "Soft focus", photographer: "Léa Dubois", category: "Fashion", src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 4120, source: "curated" },
];

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
