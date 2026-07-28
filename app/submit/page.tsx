import type { Metadata } from "next";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { SubmitStudio } from "./submit-studio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share your work", description: "Submit photography for review by the LUMA by WildSaura editorial team." };

export default async function SubmitPage() {
  const user = await requireChatGPTUser("/submit");
  return <SubmitStudio user={{ name: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath("/")} />;
}
