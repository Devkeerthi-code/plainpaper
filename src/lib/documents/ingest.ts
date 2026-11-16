import { z } from "zod";
import { generateJson, AiError } from "@/lib/ai/gemini";
import { ocrSystemPrompt } from "@/lib/ai/prompts";
import { detectDocType, type Detection } from "./detect";
import { layoutPageText, type TextItem } from "./pdf-layout";
import { segmentDocument } from "./segment";
import type { Page } from "./types";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit
export const MAX_PAGES = 25;
export const MAX_IMAGES = 10;
const MIN_TEXT_CHARS_PER_PAGE = 80;

export type FileKind = "pdf" | "jpeg" | "png" | "webp" | "heic";
const MIME: Record<FileKind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

export class UploadError extends Error {}

/** Trust the file's bytes, not its name or the browser-supplied type. */
export function sniffKind(bytes: Uint8Array): FileKind | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 5) === "%PDF-") return "pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && /heic|heix|mif1|heif/.test(ascii(8, 12))) return "heic";
  return null;
}

export interface UploadedFile {
  bytes: Uint8Array;
  kind: FileKind;
}

export function classifyUpload(files: Uint8Array[]): UploadedFile[] {
  if (!files.length) throw new UploadError("Choose a PDF or at least one photo.");
  const total = files.reduce((s, f) => s + f.byteLength, 0);
  if (total > MAX_UPLOAD_BYTES) throw new UploadError("That's more than 4 MB. Try fewer or smaller photos.");
  const typed = files.map((bytes) => {
    const kind = sniffKind(bytes);
    if (!kind) throw new UploadError("Only PDF, JPG, PNG, WebP or HEIC files can be read.");
    return { bytes, kind };
  });
  const pdfs = typed.filter((f) => f.kind === "pdf").length;
  if (pdfs > 1 || (pdfs === 1 && typed.length > 1)) throw new UploadError("Upload one PDF, or photos of the pages, not both.");
  if (typed.length > MAX_IMAGES) throw new UploadError(`Up to ${MAX_IMAGES} photos at a time.`);
  return typed;
}

const ocrSchema = z.object({ pages: z.array(z.object({ text: z.string() })).min(1).max(MAX_PAGES) });

async function ocr(files: UploadedFile[]): Promise<string[]> {
  const parts = files.map((f) => ({ inline_data: { mime_type: MIME[f.kind], data: Buffer.from(f.bytes).toString("base64") } }));
  const raw = await generateJson({
    system: ocrSystemPrompt(),
    parts: [...parts, { text: `Transcribe ${files.length === 1 && files[0]?.kind === "pdf" ? "every page of this PDF" : `these ${files.length} page photos, one page per photo, in order`}.` }],
    timeoutMs: 55_000,
    maxOutputTokens: 32_000,
  });
  const parsed = ocrSchema.safeParse(raw);
  if (!parsed.success) throw new AiError("Could not read text from the scan", "bad-output");
  return parsed.data.pages.map((p) => p.text);
}

export async function pdfText(bytes: Uint8Array): Promise<string[]> {
  const { getDocumentProxy } = await import("unpdf");
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    throw new UploadError("This PDF couldn't be opened. It may be password-protected or damaged.");
  }
  if (pdf.numPages > MAX_PAGES) throw new UploadError(`PlainPaper reads up to ${MAX_PAGES} pages at a time.`);
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items.flatMap((i) => ("str" in i ? [{ str: i.str, transform: i.transform, height: i.height }] : []));
    pages.push(layoutPageText(items));
  }
  return pages;
}

export function needsOcr(pageTexts: string[]): boolean {
  if (!pageTexts.length) return true;
  const chars = pageTexts.reduce((s, t) => s + t.replace(/\s/g, "").length, 0);
  return chars / pageTexts.length < MIN_TEXT_CHARS_PER_PAGE;
}

export interface ReadResult {
  pages: Page[];
  detection: Detection;
  usedOcr: boolean;
}

/** Turn uploaded bytes into clause-segmented pages. Bytes are only held in memory for this call. */
export async function readDocument(files: UploadedFile[]): Promise<ReadResult> {
  let pageTexts: string[];
  let usedOcr = false;
  if (files[0]?.kind === "pdf") {
    pageTexts = await pdfText(files[0].bytes);
    if (needsOcr(pageTexts)) {
      pageTexts = await ocr(files);
      usedOcr = true;
    }
  } else {
    pageTexts = await ocr(files);
    usedOcr = true;
  }
  const pages = segmentDocument(pageTexts);
  if (!pages.length) throw new UploadError("We couldn't find any text in this document.");
  return { pages, detection: detectDocType(pageTexts.join("\n")), usedOcr };
}
