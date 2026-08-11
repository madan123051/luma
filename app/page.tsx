import { GalleryClient } from "./gallery-client";
import { getApprovedGalleryPhotos } from "@/lib/public-gallery-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const photos = await getApprovedGalleryPhotos().catch(() => []);
  return <GalleryClient initialPhotos={photos} />;
}
