import "./legal.css";
import Link from "next/link";

const links = [
  ["/terms", "Terms of Use"],
  ["/license", "Photo License"],
  ["/privacy", "Privacy Policy"],
  ["/community", "Community Rules"],
  ["/copyright", "Copyright & Takedown"],
  ["/data-deletion", "Data Deletion"],
];

export function LegalShell({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return <main className="legal-page">
    <header className="legal-header"><Link className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></Link><Link href="/">Back to gallery ↗</Link></header>
    <div className="legal-wrap">
      <aside className="legal-aside"><span className="legal-kicker">{label}</span><h1>{title}</h1><p>Effective July 28, 2026<br />Operated by Wilds Aura / Madan Shrestha</p><nav className="legal-nav">{links.map(([href, text]) => <a href={href} key={href}>{text} ↗</a>)}</nav></aside>
      <article className="legal-content">{children}<div className="legal-contact">Questions? Contact <a href="mailto:help@wildsaura.com">help@wildsaura.com</a>.</div></article>
    </div>
  </main>;
}
