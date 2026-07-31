import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://luma.wildsaura.com/sitemap.xml",
    host: "https://luma.wildsaura.com",
  };
}
