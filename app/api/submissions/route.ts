import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { getRequestIdentity } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function GET(request: Request) {
  const identity = await getRequestIdentity();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });

  const mine = new URL(request.url).searchParams.get("mine") === "1";
  if (!identity.isAdmin && !mine) return Response.json({ error: "Admin access required" }, { status: 403 });

  const db = getDb();
  const rows = await db.select().from(submissions)
    .where(identity.isAdmin && !mine ? undefined : eq(submissions.submitterEmail, identity.email))
    .orderBy(desc(submissions.createdAt))
    .limit(100);

  return Response.json({ submissions: rows.map((row) => ({ ...row, imageUrl: `/api/media/${row.id}` })) });
}

export async function POST(request: Request) {
  const identity = await getRequestIdentity();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("photo");
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const description = String(form.get("description") ?? "").trim().slice(0, 1000);
  const photographerName = String(form.get("photographerName") ?? identity.displayName).trim();

  if (!(file instanceof File) || !title || !category || !photographerName) {
    return Response.json({ error: "Photo, title, category and photographer name are required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "Use a JPG, PNG or WEBP image" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return Response.json({ error: "Image must be 20MB or smaller" }, { status: 400 });

  const id = crypto.randomUUID();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `submissions/${id}.${extension}`;
  await env.MEDIA.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { submitterEmail: identity.email, originalName: file.name.slice(0, 180) },
  });

  try {
    const db = getDb();
    await db.insert(submissions).values({
      id, title: title.slice(0, 140), category: category.slice(0, 50),
      description, photographerName: photographerName.slice(0, 100),
      submitterEmail: identity.email, objectKey, contentType: file.type,
      fileSize: file.size, status: "pending", createdAt: new Date(),
    });
  } catch (error) {
    await env.MEDIA.delete(objectKey);
    throw error;
  }

  return Response.json({ submission: { id, status: "pending" } }, { status: 201 });
}
