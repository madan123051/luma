import type { Metadata } from "next";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { isAdminEmail } from "@/lib/auth";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin review", robots: { index:false, follow:false } };

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!isAdminEmail(user.email)) return <main className="access-denied"><h1>Admin access required.</h1><p>Signed in as {user.email}. This address is not on the WildSaura admin allowlist.</p><a href="/">Return to gallery</a></main>;
  return <AdminDashboard adminEmail={user.email} signOutPath={chatGPTSignOutPath("/")} />;
}
