import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Photo License", description: "Understand what you can and cannot do with photographs on LUMA by WildSaura." };

export default function LicensePage() {
  return <LegalShell title="Photo License" label="Use photographs correctly">
    <p className="notice">Copyright always stays with the photographer. A download is not a transfer of ownership.</p>
    <h2>LUMA Community License</h2><p>When a photograph is marked “Community License,” you receive a non-exclusive, worldwide, revocable license to download and use it for personal, educational, editorial and non-profit purposes, with visible attribution to the photographer and “LUMA by WildSaura.”</p>
    <h2>Allowed uses</h2><ul><li>Personal wallpapers, mood boards and private projects.</li><li>News, articles, education, research and conservation communication with attribution.</li><li>Social sharing that preserves credit and links to the photograph page.</li><li>Reasonable crops and color adjustments that do not misrepresent the subject.</li></ul>
    <h2>Not allowed without separate permission</h2><ul><li>Advertising, product packaging, paid campaigns, merchandise, resale or print-on-demand.</li><li>Selling or redistributing the image as a file, stock asset, template, dataset, NFT or competing gallery.</li><li>Using an identifiable person in a defamatory, political, medical, sexual or misleading context.</li><li>Removing watermarks, attribution or rights metadata.</li><li>Training facial-recognition, biometric or generative-AI models.</li><li>Suggesting endorsement by a person, photographer, WildSaura or depicted brand.</li></ul>
    <h2>Attribution</h2><p>Use: “Photo by [Photographer] on LUMA by WildSaura” and link to the original photograph page where technically possible.</p>
    <h2>Commercial licensing</h2><p>For commercial use, prints, campaigns, broadcast, film or merchandise, request a separate written license from the photographer or contact <a href="mailto:help@wildsaura.com">help@wildsaura.com</a>. Fees and release requirements may apply.</p>
    <h2>Wildlife ethics</h2><p>Licensees must not use photographs to promote wildlife trafficking, animal cruelty, irresponsible tourism, disclosure of sensitive species locations, or conduct harmful to conservation.</p>
    <h2>Other labels</h2><p>“All Rights Reserved” permits viewing and link sharing only. A custom or Creative Commons label controls when expressly shown and overrides the Community License for that photograph.</p>
  </LegalShell>;
}
