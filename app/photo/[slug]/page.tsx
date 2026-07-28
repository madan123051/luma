import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { photoPath } from "@/lib/gallery-data";
import { getPhotoBySlug } from "@/lib/public-gallery-server";
import { PhotoActions } from "./photo-actions";

const siteUrl = "https://luma.wildsaura.com";
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const photo = await getPhotoBySlug(slug);
  if (!photo) return { title: "Photograph not found", robots: { index: false, follow: false } };
  const canonical = photoPath(photo);
  const description = photo.description?.trim() || `${photo.title}, a ${photo.category.toLowerCase()} photograph by ${photo.photographer}, featured on LUMA by WildSaura.`;
  return {
    title: `${photo.title} by ${photo.photographer}`,
    description,
    alternates: { canonical },
    authors: [{ name: photo.photographer }],
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: {
      type: "article",
      url: canonical,
      title: `${photo.title} by ${photo.photographer}`,
      description,
      siteName: "LUMA by WildSaura",
      images: [{ url: `${canonical}/opengraph-image`, width: 1200, height: 630, alt: `${photo.title} by ${photo.photographer}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${photo.title} by ${photo.photographer}`,
      description,
      images: [`${canonical}/opengraph-image`],
    },
  };
}

export default async function PhotoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const photo = await getPhotoBySlug(slug);
  if (!photo) notFound();
  const canonical = `${siteUrl}${photoPath(photo)}`;
  const displayUrl = photo.src.startsWith("/") ? `${siteUrl}${photo.src}` : photo.src;
  const description = photo.description?.trim() || `${photo.title} is a ${photo.category.toLowerCase()} photograph by ${photo.photographer}, selected for LUMA by WildSaura.`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: photo.title,
    description,
    contentUrl: displayUrl,
    thumbnailUrl: displayUrl,
    url: canonical,
    representativeOfPage: true,
    creator: { "@type": "Person", name: photo.photographer },
    creditText: photo.photographer,
    copyrightNotice: `© ${new Date().getFullYear()} ${photo.photographer}`,
    acquireLicensePage: `${siteUrl}/license`,
  };

  return <main className="photo-detail-page">
    <header><a className="brand" href="/">LU<span>●</span>MA <small>by WildSaura</small></a><a href="/">Back to gallery ←</a></header>
    <article>
      <figure><img src={photo.src} alt={`${photo.title}, photograph by ${photo.photographer}`} /><figcaption>Public preview · Full original reserved for Premium</figcaption></figure>
      <aside>
        <span className="legal-kicker">{photo.category}</span>
        <h1>{photo.title}</h1>
        <p className="photo-byline">Photograph by <strong>{photo.photographer}</strong></p>
        <p className="photo-description">{description}</p>
        <PhotoActions
          title={photo.title}
          photographer={photo.photographer}
          sourceUrl={photo.sourceUrl ?? photo.src}
          watermarked={photo.watermarked === true}
        />
        <div className="photo-page-meta"><span>Independent photography</span><span>Curated by WildSaura</span><span>Licensed preview</span></div>
      </aside>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
  </main>;
}
