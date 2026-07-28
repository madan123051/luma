import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const DEFAULT_ADMIN_EMAILS = ["help@wildsaura.com"];

export function isAdminEmail(email: string): boolean {
  const configured = typeof env.ADMIN_EMAILS === "string"
    ? env.ADMIN_EMAILS.split(",").map((item: string) => item.trim().toLowerCase()).filter(Boolean)
    : [];
  return [...DEFAULT_ADMIN_EMAILS, ...configured].includes(email.toLowerCase());
}

export async function getRequestIdentity() {
  const user = await getChatGPTUser();
  return user ? { ...user, isAdmin: isAdminEmail(user.email) } : null;
}
