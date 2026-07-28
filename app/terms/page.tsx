import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Terms of Use", description: "Terms governing use of LUMA by WildSaura." };

export default function TermsPage() {
  return <LegalShell title="Terms of Use" label="The agreement">
    <p className="notice">These Terms are a practical global launch draft. Local consumer laws may give you rights that cannot be waived.</p>
    <h2>1. Who we are</h2><p>LUMA is a photography discovery platform operated as part of Wilds Aura by Madan Shrestha (“WildSaura,” “we,” “us”). By accessing LUMA, creating an account, uploading a photograph, or downloading content, you agree to these Terms and the Photo License.</p>
    <h2>2. Eligibility and accounts</h2><p>You must be at least 13 years old and legally able to enter this agreement. If local law requires parental consent, you may use the service only with that consent. You are responsible for your account activity and accurate information.</p>
    <h2>3. Your photographs remain yours</h2><p>You retain copyright in content you upload. You give WildSaura a non-exclusive, worldwide, royalty-free license to host, reproduce, resize, display, distribute and promote that content solely to operate and market LUMA and the WildSaura ecosystem. This license ends when content is deleted, except for reasonable backups and material already shared outside the service.</p>
    <h2>4. What you promise when uploading</h2><ul><li>You created the content or have every necessary right and permission.</li><li>Identifiable people, private property, brands and artwork have any releases required for the uses you select.</li><li>The content does not infringe copyright, privacy, publicity, trademark or other rights.</li><li>The title, category, location and license information are accurate.</li></ul>
    <h2>5. Acceptable use</h2><p>Do not upload unlawful, deceptive, hateful, exploitative, sexually abusive, violent or privacy-invasive material; malware; spam; scraped collections; or content that harms wildlife, reveals sensitive nesting/den locations, or encourages dangerous interaction with animals. Do not manipulate likes, impersonate others, bypass access controls or use automated collection without permission.</p>
    <h2>6. Downloads and licenses</h2><p>Each photograph is governed by the license shown on its detail page. If no license is shown, all rights are reserved and downloading does not grant reuse rights. The default LUMA Community License is explained on the Photo License page.</p>
    <h2>7. Moderation and removal</h2><p>We may review, restrict, label, remove or preserve content when reasonably necessary for safety, rights protection, law enforcement, service integrity or these Terms. We may suspend repeat infringers or serious rule violators.</p>
    <h2>8. Service and liability</h2><p>The service is provided “as is” and may change or be interrupted. To the maximum extent permitted by law, WildSaura is not liable for indirect, incidental, special or consequential losses, lost profits, lost data, or user content. Nothing excludes liability that cannot legally be excluded.</p>
    <h2>9. Indemnity</h2><p>To the extent permitted by law, you agree to cover reasonable losses and claims arising from your uploaded content, your breach of these Terms, or your violation of another person’s rights.</p>
    <h2>10. Governing law</h2><p>These Terms are governed by the laws of Nepal, without limiting mandatory consumer protections that apply where you live. Courts with jurisdiction in Nepal will hear disputes unless applicable law requires otherwise.</p>
    <h2>11. Changes</h2><p>Material changes will be posted with a new effective date. Continued use after the change takes effect means you accept the revised Terms.</p>
  </LegalShell>;
}
