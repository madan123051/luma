import { ImageResponse } from "next/og";
import { getPhotoBySlug } from "@/lib/public-gallery-server";

export const alt = "Featured photograph on LUMA by WildSaura";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const photo = await getPhotoBySlug(slug);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#11110f", color: "white", fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
      {photo && <img src={photo.src} alt="" width="1200" height="630" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />}
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.25) 72%, rgba(0,0,0,.1) 100%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "58px 64px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 900, letterSpacing: -2 }}>LU<span style={{ color: "#c8ee00", margin: "0 4px" }}>●</span>MA <span style={{ fontSize: 13, opacity: .75, letterSpacing: 1, marginLeft: 8 }}>BY WILDSAURA</span></div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 750 }}>
          <span style={{ color: "#c8ee00", fontSize: 17, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>{photo?.category ?? "Independent photography"}</span>
          <span style={{ fontSize: 68, lineHeight: .96, fontWeight: 900, letterSpacing: -4 }}>{photo?.title ?? "Images worth keeping"}</span>
          <span style={{ fontSize: 24, marginTop: 20, opacity: .9 }}>Photograph by {photo?.photographer ?? "LUMA"}</span>
        </div>
      </div>
    </div>,
    size,
  );
}
