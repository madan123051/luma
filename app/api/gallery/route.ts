import { getApprovedGalleryPhotos } from "@/lib/public-gallery-server";

export const revalidate = 300;

export async function GET() {
  const photos = await getApprovedGalleryPhotos().catch(() => []);
  return Response.json(photos, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
