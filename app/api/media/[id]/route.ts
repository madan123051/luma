import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { getRequestIdentity } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  if (row.status !== "approved") {
    const identity = await getRequestIdentity();
    if (!identity || (!identity.isAdmin && identity.email !== row.submitterEmail)) {
      return new Response("Not found", { status: 404 });
    }
  }

  const object = await env.MEDIA.get(row.objectKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", row.status === "approved" ? "public, max-age=3600" : "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
