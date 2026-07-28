import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Data Deletion", description: "Request deletion of your LUMA by WildSaura data." };

export default function DeletionPage() {
  return <LegalShell title="Data Deletion" label="Your controls">
    <h2>Request deletion</h2><p>Email <a href="mailto:help@wildsaura.com?subject=LUMA%20Data%20Deletion%20Request">help@wildsaura.com</a> from the address connected to your account. Use the subject “LUMA Data Deletion Request” and state whether you want a specific upload/comment removed or your entire account deleted.</p>
    <h2>Verification</h2><p>To protect you, we may ask for information reasonably necessary to verify identity and locate the data. Do not send passwords or government identity documents unless we provide a secure, necessary method.</p>
    <h2>Timing</h2><p>We aim to confirm receipt promptly and complete valid requests within the period required by applicable law. EU/EEA data-rights requests are generally handled within one month, subject to lawful extensions.</p>
    <h2>What deletion means</h2><p>Public access is removed first. Copies may remain temporarily in backups, fraud-prevention records, legal records, copyright claims or transaction records where retention is required. Search engines and third parties may take additional time to refresh their copies.</p>
    <h2>WildSaura main-site data</h2><p>For data submitted directly on the main WildSaura website, also see <a href="https://www.wildsaura.com/data-deletion">WildSaura Data Deletion</a>.</p>
  </LegalShell>;
}
