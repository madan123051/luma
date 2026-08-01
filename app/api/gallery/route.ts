import { getApprovedGalleryPhotos } from "@/lib/public-gallery-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const photos = await getApprovedGalleryPhotos().catch(() => []);
  return Response.json(photos, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
