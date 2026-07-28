import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = await db.select({
    id: submissions.id, title: submissions.title, category: submissions.category,
    photographer: submissions.photographerName,
  }).from(submissions).where(eq(submissions.status, "approved"))
    .orderBy(desc(submissions.reviewedAt)).limit(60);

  return Response.json({ photos: rows.map((row) => ({ ...row, src: `/api/media/${row.id}`, height: "standard", likes: 0 })) });
}
