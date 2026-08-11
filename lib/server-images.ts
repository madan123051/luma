import sharp from "sharp";

const MAX_SOURCE_BYTES = 55 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024;
const MAX_SOCIAL_BYTES = 280 * 1024;
const allowedHosts = new Set(["firebasestorage.googleapis.com", "storage.googleapis.com"]);

function lumaStorageObject(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    throw new Error("Image source is not allowed.");
  }
  const expectedBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!expectedBucket) throw new Error("Image storage is not configured.");
  const decodedPath = decodeURIComponent(url.pathname);
  let objectPath = "";

  if (url.hostname === "firebasestorage.googleapis.com") {
    const match = /^\/v0\/b\/([^/]+)\/o\/(.+)$/.exec(decodedPath);
    if (!match || match[1] !== expectedBucket) throw new Error("Image source is not allowed.");
    objectPath = match[2];
  } else {
    const path = decodedPath.replace(/^\//, "");
    if (!path.startsWith(`${expectedBucket}/`)) throw new Error("Image source is not allowed.");
    objectPath = path.slice(expectedBucket.length + 1);
  }
  const match = /^submissions\/[^/]+\/[^/]+\/(preview\.jpg|standard\.jpg)$/.exec(objectPath);
  if (!match) throw new Error("Image source is not allowed.");
  return { url, filename: match[1] as "preview.jpg" | "standard.jpg" };
}

export function isLumaStoredDerivative(value: string, filename: "preview.jpg" | "standard.jpg") {
  try {
    return lumaStorageObject(value).filename === filename;
  } catch {
    return false;
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

export async function fetchRemoteImage(value: string) {
  const sourceUrl = lumaStorageObject(value).url;
  const response = await fetch(sourceUrl, {
    cache: "force-cache",
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "LUMA-WildSaura-Image-Service/1.0" },
  });
  if (!response.ok) throw new Error(`Image source returned ${response.status}.`);
  lumaStorageObject(response.url);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_SOURCE_BYTES) throw new Error("Image source is too large.");
  const source = Buffer.from(await response.arrayBuffer());
  if (source.byteLength > MAX_SOURCE_BYTES) throw new Error("Image source is too large.");
  return source;
}

function watermarkSvg(width: number, height: number, photographer: string) {
  const fontSize = Math.max(16, Math.min(34, Math.round(width * 0.014)));
  const padding = Math.max(14, Math.round(fontSize * 0.7));
  const credit = escapeXml(photographer.trim().slice(0, 60).toUpperCase() || "CREATOR");
  const text = `© ${new Date().getFullYear()} ${credit} · LUMA BY WILDSAURA`;
  const estimatedWidth = Math.min(width - padding * 2, Math.round(text.length * fontSize * 0.61 + padding * 2));
  const boxHeight = fontSize + padding;
  const x = width - estimatedWidth - padding;
  const y = height - boxHeight - padding;
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${x}" y="${y}" width="${estimatedWidth}" height="${boxHeight}" fill="rgba(12,12,11,.68)"/>
      <text x="${width - padding * 2}" y="${y + boxHeight / 2}" text-anchor="end" dominant-baseline="middle"
        fill="rgba(255,255,255,.94)" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700">${text}</text>
    </svg>`,
  );
}

async function resizedPng(source: Buffer, maxEdge: number) {
  return sharp(source, { failOn: "error" })
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
}

export async function createGalleryPreview(source: Buffer) {
  const resized = await resizedPng(source, 1800);
  return sharp(resized.data)
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toBuffer();
}

export async function createSocialPreview(source: Buffer) {
  const pipeline = sharp(source, { failOn: "error" })
    .rotate()
    .resize({ width: 1200, height: 630, fit: "cover", position: "attention" });
  let output: Buffer = Buffer.alloc(0);
  for (const quality of [70, 60, 50, 42, 34, 28]) {
    output = await pipeline.clone()
      .jpeg({ quality, progressive: true, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer();
    if (output.byteLength <= MAX_SOCIAL_BYTES) break;
  }
  return output;
}

export async function createPublicDownload(source: Buffer, photographer: string, alreadyWatermarked: boolean) {
  const resized = await resizedPng(source, 2600);
  const pipeline = alreadyWatermarked
    ? sharp(resized.data)
    : sharp(resized.data).composite([{ input: watermarkSvg(resized.info.width, resized.info.height, photographer) }]);
  let output: Uint8Array = new Uint8Array();
  for (const quality of [88, 80, 72, 64, 56]) {
    output = await pipeline.clone().jpeg({ quality, progressive: true, mozjpeg: true }).toBuffer();
    if (output.byteLength <= MAX_DOWNLOAD_BYTES) break;
  }
  return output;
}
