import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { getRequestIdentity } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getRequestIdentity();
  if (!identity?.isAdmin) return Response.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json() as { status?: string; adminNote?: string };
  if (!["approved", "rejected", "pending"].includes(body.status ?? "")) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db.update(submissions).set({
    status: body.status as "approved" | "rejected" | "pending",
    adminNote: String(body.adminNote ?? "").trim().slice(0, 500),
    reviewedAt: new Date(),
    reviewedBy: identity.email,
  }).where(eq(submissions.id, id)).returning();

  if (!rows.length) return Response.json({ error: "Submission not found" }, { status: 404 });
  return Response.json({ submission: rows[0] });
}
