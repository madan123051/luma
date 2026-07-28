import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium originals — Coming soon",
  description: "Full-resolution original photography downloads are coming soon to LUMA Premium.",
  robots: { index: false, follow: false },
};

export default function PremiumPage() {
  return <main className="premium-page">
    <a className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></a>
    <section>
      <span className="legal-kicker">LUMA Premium</span>
      <h1>Originals,<br/><em>coming soon.</em></h1>
      <p>Public downloads remain compressed and carry a small WildSaura copyright mark. Premium will unlock full-resolution viewing and original-file downloads with clear creator licensing.</p>
      <div className="premium-points"><span>Full resolution</span><span>Original files</span><span>Creator licensing</span></div>
      <a className="premium-back" href="/">← Continue exploring</a>
    </section>
  </main>;
}
