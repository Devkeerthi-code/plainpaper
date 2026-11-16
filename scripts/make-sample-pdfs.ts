/**
 * Builds the fictional sample PDFs in public/samples from eval/samples/*.txt.
 * Run: npm run samples:pdf
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

const SRC = path.join(process.cwd(), "eval", "samples");
const OUT = path.join(process.cwd(), "public", "samples");
const PAGE = { width: 595.28, height: 841.89, margin: 64 };
const SIZE = 10.5;
const LEADING = 15;
const PARAGRAPH_GAP = 9;

function wrap(text: string, font: PDFFont, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, SIZE) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function build(file: string): Promise<void> {
  const source = readFileSync(path.join(SRC, file), "utf8");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Fictional sample - ${file.replace(".txt", "")}`);
  pdf.setProducer("PlainPaper sample generator");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const pages = source.split("=== PAGE BREAK ===");

  pages.forEach((pageText, index) => {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    let y = PAGE.height - PAGE.margin;
    const paragraphs = pageText.trim().split(/\n\s*\n/);
    for (const paragraph of paragraphs) {
      const isTable = paragraph.includes("\n");
      const rawLines = isTable ? paragraph.split("\n") : [paragraph];
      for (const raw of rawLines) {
        const heading = raw === raw.toUpperCase() && raw.length < 70;
        for (const line of wrap(raw.trim(), heading ? bold : font, PAGE.width - PAGE.margin * 2)) {
          page.drawText(line, { x: PAGE.margin, y, size: SIZE, font: heading ? bold : font, color: rgb(0.1, 0.12, 0.18) });
          y -= LEADING;
        }
      }
      y -= PARAGRAPH_GAP;
    }
    page.drawText(`Page ${index + 1} of ${pages.length}  ·  FICTIONAL SAMPLE`, {
      x: PAGE.margin,
      y: 36,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.5),
    });
  });

  writeFileSync(path.join(OUT, file.replace(".txt", ".pdf")), await pdf.save());
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(SRC).filter((f) => f.endsWith(".txt"));
  for (const file of files) await build(file);
  console.log(`Wrote ${files.length} sample PDFs to public/samples`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
