import type { MetadataRoute } from "next";
import { photoPath } from "@/lib/gallery-data";
import { getApprovedGalleryPhotos } from "@/lib/public-gallery-server";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://luma.wildsaura.com";
  const approvedPhotos = await getApprovedGalleryPhotos().catch(() => []);
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...approvedPhotos.map((photo) => ({
      url: `${base}${photoPath(photo)}`,
      lastModified: photo.publishedAt ?? new Date(),
      changeFrequency: "monthly" as const,
      priority: .8,
      images: [photo.src],
    })),
    ...["terms", "license", "privacy", "community", "copyright", "data-deletion"].map((path) => ({
      url: `${base}/${path}`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: .4,
    })),
  ];
}
