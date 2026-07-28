import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#11110f", color: "#f4f2e9", fontFamily: "Arial, sans-serif", fontSize: 106, fontWeight: 900, letterSpacing: -10 }}>
      L<span style={{ color: "#c8ee00", fontSize: 56, margin: "23px 0 0 5px" }}>●</span>
    </div>,
    size,
  );
}
