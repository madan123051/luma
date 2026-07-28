import { unstable_cache } from "next/cache";
import { photoSlug, photos, type Photo } from "./gallery-data";

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: boolean;
  timestampValue?: string;
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
    next: { revalidate: 300 },
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
    return [{
      id,
      title,
      photographer,
      category: stringField(fields, "category") || "Photography",
      description: stringField(fields, "description"),
      src: publicVersion ? downloadUrl : `https://luma.wildsaura.com/api/preview?url=${encodeURIComponent(downloadUrl)}`,
      sourceUrl: downloadUrl,
      height: "standard",
      likes: integerField(fields, "likesCount"),
      watermarked: publicVersion,
      source: "community",
      publishedAt: fields.reviewedAt?.timestampValue ? new Date(fields.reviewedAt.timestampValue) : null,
    } satisfies Photo];
  });
}

export const getApprovedGalleryPhotos = unstable_cache(
  fetchApprovedPhotos,
  ["luma-approved-gallery-photos"],
  { revalidate: 300 },
);

export async function getPhotoBySlug(slug: string) {
  const communityPhotos = await getApprovedGalleryPhotos();
  return [...communityPhotos, ...photos].find((photo) => photoSlug(photo) === slug) ?? null;
}
