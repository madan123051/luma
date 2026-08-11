import { createGalleryPreview, fetchRemoteImage, isLumaLegacySource } from "@/lib/server-images";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) return Response.json({ error: "Missing image URL." }, { status: 400 });
    const photographer = new URL(request.url).searchParams.get("photographer")?.trim().slice(0, 100) || "Creator";
    const source = await fetchRemoteImage(url);
    const preview = await createGalleryPreview(source, isLumaLegacySource(url) ? photographer : undefined);
    return new Response(new Uint8Array(preview), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  } catch {
    return Response.json({ error: "Preview could not be prepared." }, { status: 422 });
  }
}
