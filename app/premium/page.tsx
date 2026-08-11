import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Premium originals — Coming soon",
  description: "Full-resolution original photography downloads are coming soon to LUMA Premium.",
  robots: { index: false, follow: false },
};

export default function PremiumPage() {
  return <main className="premium-page">
    <Link className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></Link>
    <section>
      <span className="legal-kicker">LUMA Premium</span>
      <h1>Originals,<br/><em>coming soon.</em></h1>
      <p>Free Standard downloads are compressed to a practical size and carry a slim white title and WildSaura copyright banner. Premium will unlock full-resolution viewing and original-file downloads with clear creator licensing.</p>
      <div className="premium-points"><span>Full resolution</span><span>Original files</span><span>Creator licensing</span></div>
      <Link className="premium-back" href="/">← Continue exploring</Link>
    </section>
  </main>;
}
