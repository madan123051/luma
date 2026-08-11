"use client";

const MAX_PUBLIC_BYTES = 4 * 1024 * 1024;
const MAX_PUBLIC_EDGE = 2600;
const MIN_STANDARD_BYTES = 5 * 1024 * 1024;
const MAX_STANDARD_BYTES = 10 * 1024 * 1024;
const MAX_STANDARD_EDGE = 5600;
const MAX_STANDARD_PIXELS = 24_000_000;
const MAX_AI_BYTES = 1.6 * 1024 * 1024;
const MAX_AI_EDGE = 1600;

function loadImage(blob: Blob) {
  return new Promise<{ image: HTMLImageElement; objectUrl: string }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be read."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The processed image could not be created.")),
      "image/jpeg",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The AI preview could not be read."));
    reader.onerror = () => reject(new Error("The AI preview could not be read."));
    reader.readAsDataURL(blob);
  });
}

function drawCopyright(ctx: CanvasRenderingContext2D, width: number, height: number, credit: string) {
  const fontSize = Math.max(16, Math.min(34, Math.round(width * 0.014)));
  const padding = Math.max(14, Math.round(fontSize * 0.7));
  const safeCredit = credit.trim().slice(0, 60).toUpperCase() || "CREATOR";
  const text = `© ${new Date().getFullYear()} ${safeCredit} · LUMA BY WILDSAURA`;
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding;
  const x = width - boxWidth - padding;
  const y = height - boxHeight - padding;
  ctx.fillStyle = "rgba(12, 12, 11, 0.68)";
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fillText(text, x + padding, y + boxHeight / 2);
}

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (ctx.measureText(normalized).width <= maxWidth) return normalized;
  let low = 0;
  let high = normalized.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${normalized.slice(0, middle).trimEnd()}…`).width <= maxWidth) low = middle;
    else high = middle - 1;
  }
  return `${normalized.slice(0, low).trimEnd()}…`;
}

function drawStandardBanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  imageHeight: number,
  bannerHeight: number,
  title: string,
  credit: string,
) {
  const padding = Math.max(18, Math.round(width * 0.018));
  const fontSize = Math.max(15, Math.min(30, Math.round(width * 0.012)));
  const copyright = `© ${new Date().getFullYear()} ${credit.trim().toUpperCase() || "CREATOR"} · LUMA.WILDSAURA.COM`;
  const centerY = imageHeight + bannerHeight / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, imageHeight, width, bannerHeight);
  ctx.fillStyle = "#d9d7cf";
  ctx.fillRect(0, imageHeight, width, Math.max(1, Math.round(width * 0.0005)));
  ctx.textBaseline = "middle";

  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#11110f";
  ctx.fillText(fitText(ctx, title || "Untitled photograph", width * 0.43), padding, centerY);

  ctx.font = `600 ${Math.max(13, Math.round(fontSize * 0.82))}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#57564f";
  ctx.fillText(fitText(ctx, copyright, width * 0.48), width - padding, centerY);
  ctx.textAlign = "left";
}

export async function createPublicPhoto(source: Blob, credit = "Creator") {
  const { image, objectUrl } = await loadImage(source);
  let lastBlob: Blob | null = null;

  try {
    for (const edgeFactor of [1, 0.84, 0.7, 0.58, 0.48]) {
      const targetEdge = MAX_PUBLIC_EDGE * edgeFactor;
      const scale = Math.min(1, targetEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image processing is unavailable in this browser.");
      ctx.fillStyle = "#f4f2e9";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      drawCopyright(ctx, width, height, credit);

      for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
        lastBlob = await canvasToBlob(canvas, quality);
        if (lastBlob.size <= MAX_PUBLIC_BYTES) return lastBlob;
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  if (!lastBlob) throw new Error("The public image could not be created.");
  throw new Error("The gallery preview could not be compressed below 4MB.");
}

export async function createStandardPhoto(source: Blob, title: string, credit = "Creator") {
  const { image, objectUrl } = await loadImage(source);
  let bestUnderLimit: Blob | null = null;
  let lastProcessingError: unknown = null;

  try {
    const sourcePixels = image.naturalWidth * image.naturalHeight;
    const baseScale = Math.min(
      1,
      MAX_STANDARD_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
      Math.sqrt(MAX_STANDARD_PIXELS / Math.max(1, sourcePixels)),
    );

    for (const scaleFactor of [1, 0.9, 0.8, 0.7, 0.6]) {
      try {
        const scale = baseScale * scaleFactor;
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const imageHeight = Math.max(1, Math.round(image.naturalHeight * scale));
        const bannerHeight = Math.max(58, Math.min(150, Math.round(width * 0.045)));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = imageHeight + bannerHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Standard download processing is unavailable in this browser.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, width, imageHeight);
        drawStandardBanner(ctx, width, imageHeight, bannerHeight, title, credit);

        const maximumQuality = await canvasToBlob(canvas, 0.98);
        if (maximumQuality.size <= MAX_STANDARD_BYTES) return maximumQuality;

        let low = 0.52;
        let high = 0.98;
        let candidate: Blob | null = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const quality = (low + high) / 2;
          const output = await canvasToBlob(canvas, quality);
          if (output.size > MAX_STANDARD_BYTES) high = quality;
          else {
            candidate = output;
            low = quality;
          }
        }

        if (candidate && (!bestUnderLimit || candidate.size > bestUnderLimit.size)) bestUnderLimit = candidate;
        if (candidate && candidate.size >= MIN_STANDARD_BYTES) return candidate;
        if (candidate) return candidate;
      } catch (error) {
        lastProcessingError = error;
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  if (bestUnderLimit) return bestUnderLimit;
  if (lastProcessingError instanceof Error) {
    throw new Error(`The Standard download could not be created: ${lastProcessingError.message}`);
  }
  throw new Error("The Standard download could not be compressed below 10MB.");
}

export async function createAiPhotoDataUrl(source: Blob) {
  const { image, objectUrl } = await loadImage(source);
  let lastBlob: Blob | null = null;

  try {
    for (const edgeFactor of [1, 0.82, 0.68]) {
      const targetEdge = MAX_AI_EDGE * edgeFactor;
      const scale = Math.min(1, targetEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image analysis is unavailable in this browser.");
      ctx.fillStyle = "#f4f2e9";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      for (const quality of [0.82, 0.72, 0.62]) {
        lastBlob = await canvasToBlob(canvas, quality);
        if (lastBlob.size <= MAX_AI_BYTES) return blobToDataUrl(lastBlob);
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  if (!lastBlob) throw new Error("The AI preview could not be created.");
  return blobToDataUrl(lastBlob);
}

export async function downloadPublicPhoto(input: {
  url: string;
  title: string;
  photographer: string;
  alreadyWatermarked?: boolean;
  standardUrl?: string;
}) {
  const safeTitle = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "luma-photo";
  if (input.standardUrl) {
    const link = document.createElement("a");
    link.href = input.standardUrl;
    link.download = `${safeTitle}-standard-wildsaura.jpg`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const response = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("The photograph could not be downloaded.");
  const output = await response.blob();
  const objectUrl = URL.createObjectURL(output);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${safeTitle}-wildsaura.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
