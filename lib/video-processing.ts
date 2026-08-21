const MIN_VIDEO_SECONDS = 10;
const MAX_VIDEO_SECONDS = 30;
const MAX_PREVIEW_EDGE = 1280;
const MAX_STANDARD_EDGE = 1920;

export type VideoMetadata = {
  durationSeconds: number;
  width: number;
  height: number;
};

export type ProcessedVideo = VideoMetadata & {
  blob: Blob;
  poster: Blob;
};

export function isVideoFile(file: Blob | { type?: string }) {
  return String(file.type ?? "").toLowerCase().startsWith("video/");
}

function loadVideo(source: Blob) {
  return new Promise<{ video: HTMLVideoElement; objectUrl: string; metadata: VideoMetadata }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(source);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.volume = 0;
    video.controls = false;
    video.crossOrigin = "anonymous";
    const fail = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected video could not be read."));
    };
    video.onloadedmetadata = () => {
      const durationSeconds = Number(video.duration);
      const width = Math.max(1, video.videoWidth);
      const height = Math.max(1, video.videoHeight);
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !width || !height) {
        fail();
        return;
      }
      resolve({ video, objectUrl, metadata: { durationSeconds, width, height } });
    };
    video.onerror = fail;
    video.src = objectUrl;
    video.load();
  });
}

export async function readVideoMetadata(source: Blob): Promise<VideoMetadata> {
  if (!isVideoFile(source)) throw new Error("Choose a video clip, or select a JPG, PNG or WEBP photograph.");
  const { video, objectUrl, metadata } = await loadVideo(source);
  video.removeAttribute("src");
  video.load();
  URL.revokeObjectURL(objectUrl);
  return metadata;
}

export async function validateVideoClip(source: Blob): Promise<VideoMetadata> {
  const metadata = await readVideoMetadata(source);
  if (metadata.durationSeconds < MIN_VIDEO_SECONDS - 0.05 || metadata.durationSeconds > MAX_VIDEO_SECONDS + 0.05) {
    throw new Error(`Video clips must be between ${MIN_VIDEO_SECONDS} and ${MAX_VIDEO_SECONDS} seconds.`);
  }
  return metadata;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The video preview could not be created.")), "image/jpeg", quality);
  });
}

function drawCopyright(ctx: CanvasRenderingContext2D, width: number, height: number, credit: string) {
  const fontSize = Math.max(16, Math.min(34, Math.round(width * 0.018)));
  const padding = Math.max(14, Math.round(fontSize * 0.7));
  const safeCredit = credit.trim().slice(0, 60).toUpperCase() || "CREATOR";
  const text = `© ${new Date().getFullYear()} ${safeCredit} · LUMA BY WILDSAURA`;
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding;
  const x = Math.max(padding, width - boxWidth - padding);
  const y = Math.max(padding, height - boxHeight - padding);
  ctx.fillStyle = "rgba(12, 12, 11, 0.72)";
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.fillText(text, x + padding, y + boxHeight / 2);
}

function chooseRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") throw new Error("Video processing is not supported in this browser. Try Chrome or Edge.");
  const choices = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return choices.find((value) => MediaRecorder.isTypeSupported(value)) ?? "";
}

async function createPoster(source: Blob, credit: string, metadata: VideoMetadata) {
  const { video, objectUrl } = await loadVideo(source);
  try {
    const scale = Math.min(1, 1600 / Math.max(metadata.width, metadata.height));
    const width = Math.max(1, Math.round(metadata.width * scale));
    const height = Math.max(1, Math.round(metadata.height * scale));
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("The video poster could not be created."));
      video.currentTime = Math.min(0.15, Math.max(0, metadata.durationSeconds / 4));
    });
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Video processing is unavailable in this browser.");
    ctx.fillStyle = "#11110f";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    drawCopyright(ctx, width, height, credit);
    return await canvasToBlob(canvas, 0.84);
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderVideo(source: Blob, credit: string, metadata: VideoMetadata, targetEdge: number, bitrate: number) {
  const { video, objectUrl } = await loadVideo(source);
  const mimeType = chooseRecorderMimeType();
  const scale = Math.min(1, targetEdge / Math.max(metadata.width, metadata.height));
  const width = Math.max(2, Math.round(metadata.width * scale / 2) * 2);
  const height = Math.max(2, Math.round(metadata.height * scale / 2) * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof canvas.captureStream !== "function") {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Video processing is not supported in this browser. Try Chrome or Edge.");
  }
  const canvasStream = canvas.captureStream(30);
  const sourceCapture = typeof (video as HTMLVideoElement & { captureStream?: (fps?: number) => MediaStream }).captureStream === "function"
    ? (video as HTMLVideoElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30)
    : null;
  sourceCapture?.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
  const recorder = new MediaRecorder(canvasStream, { mimeType: mimeType || undefined, videoBitsPerSecond: bitrate });
  const chunks: BlobPart[] = [];
  let frameId = 0;
  let settled = false;
  const cleanup = () => {
    if (frameId) cancelAnimationFrame(frameId);
    sourceCapture?.getTracks().forEach((track) => track.stop());
    canvasStream.getTracks().forEach((track) => track.stop());
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  return await new Promise<Blob>((resolve, reject) => {
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => finish(new Error("The watermarked video could not be created."));
    recorder.onstop = () => finish();
    const draw = () => {
      if (settled) return;
      ctx.fillStyle = "#11110f";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(video, 0, 0, width, height);
      drawCopyright(ctx, width, height, credit);
      if (video.ended || video.currentTime >= metadata.durationSeconds - 0.03) {
        recorder.stop();
        return;
      }
      frameId = requestAnimationFrame(draw);
    };
    video.onended = () => { if (recorder.state !== "inactive") recorder.stop(); };
    recorder.start(250);
    video.currentTime = 0;
    video.play().then(draw).catch(() => finish(new Error("The video could not be played for processing.")));
  });
}

async function processVideo(source: Blob, credit: string, targetEdge: number, bitrate: number): Promise<ProcessedVideo> {
  const metadata = await validateVideoClip(source);
  const [blob, poster] = await Promise.all([
    renderVideo(source, credit, metadata, targetEdge, bitrate),
    createPoster(source, credit, metadata),
  ]);
  return { blob, poster, ...metadata };
}

export function createPublicVideo(source: Blob, credit = "Creator") {
  return processVideo(source, credit, MAX_PREVIEW_EDGE, 2_800_000);
}

export function createStandardVideo(source: Blob, credit = "Creator") {
  return processVideo(source, credit, MAX_STANDARD_EDGE, 5_500_000);
}
