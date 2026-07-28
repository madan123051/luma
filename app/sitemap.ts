import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://luma-photo-gallery.madan123050.chatgpt.site";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...["terms", "license", "privacy", "community", "copyright", "data-deletion"].map((path) => ({
      url: `${base}/${path}`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: .4,
    })),
  ];
}
