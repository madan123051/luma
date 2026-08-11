import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Privacy Policy", description: "How LUMA by WildSaura handles personal data." };

export default function PrivacyPage() {
  return <LegalShell title="Privacy Policy" label="Your data">
    <h2>1. Information we collect</h2><ul><li>Account details such as name, email, profile, preferences and authentication identifiers.</li><li>Content and activity such as uploads, captions, comments, likes, collections, reports and support messages.</li><li>Technical data such as IP address, device, browser, approximate region, referral page, logs and security events.</li><li>License, rights, consent and transaction records when applicable.</li></ul>
    <h2>2. Why we use it</h2><p>We use data to provide and secure the service, publish content you submit, personalize discovery, process licenses, communicate with you, moderate abuse, investigate rights claims, comply with law and improve performance. Depending on location, our legal bases include contract, consent, legitimate interests and legal obligations.</p>
    <h2>3. Sharing</h2><p>Public profile and photo information is visible as you choose. We may share limited data with hosting, storage, analytics, email, moderation and payment providers; professional advisers; authorities when legally required; and a successor in a business reorganization. We do not sell personal information for money.</p>
    <h2>4. AI-assisted photo metadata</h2><p>When an authorized administrator chooses the optional metadata assistant, LUMA sends a reduced, unwatermarked preview—not the full original file—to our AI infrastructure to suggest an editable title, description, category, tags and accessible alt text. Suggestions are reviewed by a person before publishing and may be incorrect. Do not include private or sensitive information in the optional context field.</p>
    <h2>5. Cookies and analytics</h2><p>Essential storage may keep the service secure and remember settings. Optional analytics or advertising cookies will require a consent choice where law requires it. Rejecting optional cookies will be as easy as accepting them.</p>
    <h2>6. Retention and international transfers</h2><p>We keep data only as long as needed for the purposes above, legal obligations, disputes and backups. Because LUMA can be used worldwide, data may be processed outside your country with safeguards required by applicable law.</p>
    <h2>7. Your choices and rights</h2><p>Depending on your location, you may request access, correction, deletion, restriction, portability or objection; withdraw consent; and complain to your local data protection authority. We may verify identity before fulfilling a request. Email <a href="mailto:help@wildsaura.com">help@wildsaura.com</a> or use the Data Deletion page.</p>
    <h2>8. Children</h2><p>LUMA is not directed to children under 13. We do not knowingly collect their personal data. Contact us if you believe a child submitted data without required consent.</p>
    <h2>9. Security</h2><p>We use reasonable organizational and technical safeguards, but no online service can promise absolute security. Report suspected issues privately to our support address.</p>
    <h2>10. Controller</h2><p>Wilds Aura / Madan Shrestha operates LUMA. Privacy requests can be sent to <a href="mailto:help@wildsaura.com">help@wildsaura.com</a>.</p>
  </LegalShell>;
}
