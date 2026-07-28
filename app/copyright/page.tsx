import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Copyright & Takedown", description: "Report copyright infringement on LUMA by WildSaura." };

export default function CopyrightPage() {
  return <LegalShell title="Copyright & Takedown" label="Protect creative rights">
    <p className="notice">We respect photographers’ rights and respond promptly to complete, good-faith infringement notices.</p>
    <h2>Send a notice</h2><p>Email <a href="mailto:help@wildsaura.com">help@wildsaura.com</a> with the subject “Copyright Notice” and include:</p><ul><li>Your full name, contact information and authority to act.</li><li>Identification of the copyrighted work.</li><li>The exact LUMA URL and enough detail to locate the material.</li><li>A good-faith statement that the use is not authorized.</li><li>A statement that the information is accurate and, where applicable, made under penalty of perjury.</li><li>Your physical or electronic signature.</li></ul>
    <h2>What happens next</h2><p>We may temporarily disable the material, notify the uploader, request more information and keep a record of the claim. We terminate accounts of repeat infringers where appropriate.</p>
    <h2>Counter-notice</h2><p>If your content was removed by mistake, reply with your identity, the removed material and URL, why removal was mistaken, your consent to the relevant legal jurisdiction where required, and your signature. We may restore content if the claimant does not begin legal action within the applicable period.</p>
    <h2>Other rights</h2><p>For privacy, publicity, trademark, animal welfare or impersonation complaints, clearly identify the right involved and provide supporting evidence. False or abusive reports may lead to account action and legal responsibility.</p>
  </LegalShell>;
}
