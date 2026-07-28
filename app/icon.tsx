import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#11110f", color: "#f4f2e9", fontFamily: "Arial, sans-serif", fontSize: 38, fontWeight: 900, letterSpacing: -4 }}>
      L<span style={{ color: "#c8ee00", fontSize: 22, margin: "9px 0 0 2px" }}>●</span>
    </div>,
    size,
  );
}
