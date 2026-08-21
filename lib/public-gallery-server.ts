import { photoSlug, type Photo } from "./gallery-data";

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number | string;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values?: Array<{ stringValue?: string }> };
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

function stringField(fields: Record<string, FirestoreValue>, key: string) {
  return fields[key]?.stringValue ?? "";
}

function integerField(fields: Record<string, FirestoreValue>, key: string) {
  return Number(fields[key]?.integerValue ?? 0);
}

function doubleField(fields: Record<string, FirestoreValue>, key: string) {
  return Number(fields[key]?.doubleValue ?? fields[key]?.integerValue ?? fields[key]?.stringValue ?? 0);
}

function stringArrayField(fields: Record<string, FirestoreValue>, key: string) {
  return fields[key]?.arrayValue?.values?.flatMap((value) => value.stringValue ? [value.stringValue] : []) ?? [];
}

async function fetchApprovedPhotos(): Promise<Photo[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return [];
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "submissions" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "approved" },
          },
        },
        limit: 100,
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const rows = await response.json() as Array<{ document?: FirestoreDocument }>;
  return rows.flatMap((row) => {
    const document = row.document;
    if (!document?.fields) return [];
    const fields = document.fields;
    const id = document.name.split("/").pop() ?? "";
    const title = stringField(fields, "title");
    const photographer = stringField(fields, "photographerName");
    const downloadUrl = stringField(fields, "downloadUrl");
    if (!id || !title || !photographer || !downloadUrl) return [];
    const publicVersion = fields.publicVersion?.booleanValue === true;
    const contentType = stringField(fields, "contentType");
    const mediaType = contentType.toLowerCase().startsWith("video/") ? "video" : "image";
    const posterUrl = stringField(fields, "posterDownloadUrl");
    return [{
      id,
      slug: stringField(fields, "slug") || photoSlug({ title, photographer }),
      title,
      photographer,
      category: stringField(fields, "category") || "Photography",
      description: stringField(fields, "description"),
      altText: stringField(fields, "altText"),
      seoTitle: stringField(fields, "seoTitle"),
      seoDescription: stringField(fields, "seoDescription"),
      tags: stringArrayField(fields, "tags"),
      keywords: stringArrayField(fields, "keywords"),
      src: publicVersion
        ? downloadUrl
        : `https://luma.wildsaura.com/api/preview?url=${encodeURIComponent(downloadUrl)}&photographer=${encodeURIComponent(photographer)}`,
      sourceUrl: downloadUrl,
      posterUrl: posterUrl || undefined,
      standardUrl: stringField(fields, "standardDownloadUrl") || undefined,
      standardFileSize: integerField(fields, "standardFileSize") || undefined,
      mediaType,
      durationSeconds: mediaType === "video" ? doubleField(fields, "durationSeconds") || undefined : undefined,
      height: "standard",
      likes: integerField(fields, "likesCount"),
      watermarked: publicVersion,
      source: "community",
      publishedAt: fields.createdAt?.timestampValue ?? fields.reviewedAt?.timestampValue ?? null,
    } satisfies Photo];
  }).sort((a, b) => {
    const newest = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    const oldest = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    return newest - oldest;
  });
}

export const getApprovedGalleryPhotos = fetchApprovedPhotos;

export async function getPhotoBySlug(slug: string) {
  const communityPhotos = await getApprovedGalleryPhotos();
  return communityPhotos.find((photo) => photoSlug(photo) === slug) ?? null;
}
