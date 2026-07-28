"use client";

const MAX_PUBLIC_BYTES = 4 * 1024 * 1024;
const MAX_PUBLIC_EDGE = 2600;

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
      (blob) => blob ? resolve(blob) : reject(new Error("The public image could not be created.")),
      "image/jpeg",
      quality,
    );
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

export async function createPublicPhoto(source: Blob, credit = "Creator") {
  const { image, objectUrl } = await loadImage(source);
  let lastBlob: Blob | null = null;

  try {
    for (const edgeFactor of [1, 0.84, 0.7]) {
      const targetEdge = MAX_PUBLIC_EDGE * edgeFactor;
      const scale = Math.min(1, targetEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image processing is unavailable in this browser.");
      ctx.drawImage(image, 0, 0, width, height);
      drawCopyright(ctx, width, height, credit);

      for (const quality of [0.9, 0.82, 0.74, 0.66]) {
        lastBlob = await canvasToBlob(canvas, quality);
        if (lastBlob.size <= MAX_PUBLIC_BYTES) return lastBlob;
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  if (!lastBlob) throw new Error("The public image could not be created.");
  return lastBlob;
}

export async function downloadPublicPhoto(input: {
  url: string;
  title: string;
  photographer: string;
  alreadyWatermarked?: boolean;
}) {
  const response = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("The photograph could not be downloaded.");
  const output = await response.blob();
  const objectUrl = URL.createObjectURL(output);
  const safeTitle = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "luma-photo";
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${safeTitle}-wildsaura.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
