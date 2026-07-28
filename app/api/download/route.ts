import { createPublicDownload, fetchRemoteImage } from "@/lib/server-images";

export const runtime = "nodejs";

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "luma-photo";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      url?: string;
      title?: string;
      photographer?: string;
      alreadyWatermarked?: boolean;
    };
    if (!body.url) return Response.json({ error: "Missing image URL." }, { status: 400 });
    const source = await fetchRemoteImage(body.url);
    const download = await createPublicDownload(source, body.photographer ?? "Creator", body.alreadyWatermarked === true);
    return new Response(new Uint8Array(download), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${safeFilename(body.title ?? "luma-photo")}-wildsaura.jpg"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "Download could not be prepared." }, { status: 422 });
  }
}
