import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Community Rules", description: "Community standards for photographers and visitors on LUMA by WildSaura." };

export default function CommunityPage() {
  return <LegalShell title="Community Rules" label="Create with care">
    <h2>Original work only</h2><p>Upload photographs you created or are fully authorized to share. Credit collaborators honestly. AI-generated or materially AI-altered content must be clearly labeled and may not be presented as documentary photography.</p>
    <h2>Respect people</h2><p>Obtain appropriate consent for identifiable people, especially children and vulnerable individuals. Never share private information, sexual exploitation, harassment, hate, threats or demeaning stereotypes.</p>
    <h2>Respect wildlife</h2><p>Never bait, chase, restrain, crowd or distress animals for a photograph. Do not reveal exact locations of nests, dens, endangered species or trafficking-sensitive wildlife. Follow local access rules and leave habitats undisturbed.</p>
    <h2>Keep discussion useful</h2><p>Thoughtful critique is welcome. Personal attacks, spam, scams, repetitive self-promotion, vote manipulation and impersonation are not.</p>
    <h2>Moderation</h2><p>Use reporting tools or email support with the URL and reason. We consider context, severity, intent, pattern and risk. Outcomes may include labels, reduced visibility, removal, warnings or account suspension.</p>
    <h2>Appeals</h2><p>If your content or account is restricted, you may request review by replying to the notice or emailing support with relevant evidence.</p>
  </LegalShell>;
}
