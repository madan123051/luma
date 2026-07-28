import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://luma.wildsaura.com"),
  applicationName: "LUMA by WildSaura",
  title: { default: "LUMA by WildSaura — Images worth keeping", template: "%s | LUMA by WildSaura" },
  description: "A WildSaura project for discovering, sharing and licensing remarkable photography from independent creators.",
  keywords: ["free photography", "high resolution photos", "independent photographers", "download photos", "photo community"],
  alternates: { canonical: "/" },
  openGraph: { title: "LUMA by WildSaura — Images worth keeping", description: "Independent photography, curated daily.", type: "website", images: [{ url: "/og-wildsaura.png", width: 1200, height: 630, alt: "LUMA by WildSaura photography gallery" }] },
  twitter: { card: "summary_large_image", title: "LUMA by WildSaura — Images worth keeping", description: "Independent photography, curated daily.", images: ["/og-wildsaura.png"] },
  icons: { icon: "/icon", apple: "/apple-icon" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
