/**
 * Prepare files for /api/documents/read: one PDF, or up to 10 photos shrunk in the browser
 * so a phone's camera photos fit the 4 MB request limit.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS = 10;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export class UploadProblem extends Error {}

export const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
export const isImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);

export function unsupportedMessage(file: File): string {
  return `"${file.name}" isn't a PDF or a photo. Try a PDF, JPG or PNG.`;
}

/** Checks the mix of files before any work is done, with a plain message for each problem. */
export function checkSelection(files: File[]): "pdf" | "photos" {
  if (files.length === 0) throw new UploadProblem("Choose a PDF or photos of the pages.");
  const odd = files.find((f) => !isPdf(f) && !isImage(f));
  if (odd) throw new UploadProblem(unsupportedMessage(odd));
  const pdfs = files.filter(isPdf);
  if (pdfs.length > 0 && files.length > 1) {
    throw new UploadProblem("Choose one PDF, or photos of the pages, not both at once.");
  }
  if (pdfs[0]) {
    if (pdfs[0].size > MAX_UPLOAD_BYTES) {
      throw new UploadProblem("That PDF is more than 4 MB. Try a smaller copy, or photos of the pages.");
    }
    return "pdf";
  }
  if (files.length > MAX_PHOTOS) throw new UploadProblem(`That's ${files.length} photos. Up to ${MAX_PHOTOS} pages at a time, please.`);
  return "photos";
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new UploadProblem(`We couldn't open "${file.name}". Try a JPG or PNG photo instead.`);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new UploadProblem("We couldn't prepare that photo. Please try again."))), "image/jpeg", quality);
  });
}

export async function compressPhoto(file: File, quality = JPEG_QUALITY): Promise<File> {
  const bitmap = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UploadProblem("This browser can't prepare photos. Try a PDF instead.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await toBlob(canvas, quality);
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Returns the files ready to post, compressing photos (and squeezing harder if still too big). */
export async function prepareFiles(files: File[]): Promise<File[]> {
  if (checkSelection(files) === "pdf") return files;
  let out = await Promise.all(files.map((f) => compressPhoto(f)));
  const total = (list: File[]) => list.reduce((s, f) => s + f.size, 0);
  if (total(out) > MAX_UPLOAD_BYTES) out = await Promise.all(files.map((f) => compressPhoto(f, 0.6)));
  if (total(out) > MAX_UPLOAD_BYTES) throw new UploadProblem("Those photos are more than 4 MB together, even after shrinking. Try fewer pages at a time.");
  return out;
}

export function describeFiles(files: File[]): string {
  if (files.length === 1 && files[0]) return files[0].name;
  return `${files.length} photos`;
}
