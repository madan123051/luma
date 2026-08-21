import { createSocialPreview, fetchRemoteImage } from "@/lib/server-images";
import { getPhotoBySlug } from "@/lib/public-gallery-server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const photo = await getPhotoBySlug(slug);
    if (!photo) return new Response("Photograph not found.", { status: 404 });
    const sourceUrl = photo.posterUrl || photo.sourceUrl || photo.src;
    const source = await fetchRemoteImage(sourceUrl);
    const socialCard = await createSocialPreview(source, photo.photographer);
    return new Response(new Uint8Array(socialCard), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `inline; filename="${slug}-luma-social-card.jpg"`,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Social preview could not be prepared.", { status: 422 });
  }
}
