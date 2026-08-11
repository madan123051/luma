export const PHOTO_CATEGORIES = [
  "Nature", "People", "Architecture", "Travel", "Street", "Fashion",
  "Food", "Interiors", "Wildlife", "Birds", "Landscapes",
] as const;

export type AiPhotoMetadata = {
  title: string;
  description: string;
  category: (typeof PHOTO_CATEGORIES)[number];
  tags: string[];
  altText: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  subjects: string[];
  locationHint: string;
  mood: string;
};
