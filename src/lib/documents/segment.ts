import type { Clause, Page } from "./types";

const NUMBERED = /^(?:clause\s+|section\s+|article\s+)?(\d{1,2}(?:\.\d{1,2}){0,2})[.):]?\s+(?=\S)/i;
const MAX_CLAUSE_CHARS = 1200;

/** Lowercase, unify punctuation and whitespace so quotes can be matched reliably. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function looksLikeHeading(line: string): boolean {
  return line.length <= 60 && !/[.;:,]$/.test(line) && !NUMBERED.test(line);
}

/** Split long unnumbered paragraphs at sentence ends so a highlight stays focused. */
function splitLong(text: string): string[] {
  if (text.length <= MAX_CLAUSE_CHARS) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_CLAUSE_CHARS) {
      parts.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

interface Block {
  label: string | null;
  lines: string[];
}

function toBlocks(pageText: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  let pendingHeading: string | null = null;

  const flush = () => {
    if (current && current.lines.length) blocks.push(current);
    current = null;
  };

  for (const raw of pageText.split(/\r?\n/)) {
    const line = cleanLine(raw);
    if (!line) {
      flush();
      // A heading followed by a blank line is a title, not part of the next clause.
      if (pendingHeading) blocks.push({ label: null, lines: [pendingHeading] });
      pendingHeading = null;
      continue;
    }
    const numbered = line.match(NUMBERED);
    if (numbered) {
      flush();
      current = { label: numbered[1] ?? null, lines: pendingHeading ? [pendingHeading, line] : [line] };
      pendingHeading = null;
      continue;
    }
    if (!current) {
      if (looksLikeHeading(line) && !pendingHeading) {
        pendingHeading = line;
        continue;
      }
      current = { label: null, lines: pendingHeading ? [pendingHeading, line] : [line] };
      pendingHeading = null;
      continue;
    }
    current.lines.push(line);
  }
  flush();
  if (pendingHeading) blocks.push({ label: null, lines: [pendingHeading] });
  return blocks;
}

export function segmentPage(pageText: string, pageNumber: number): Page {
  const clauses: Clause[] = [];
  for (const block of toBlocks(pageText)) {
    for (const text of splitLong(block.lines.join(" "))) {
      clauses.push({ id: `p${pageNumber}-c${clauses.length + 1}`, page: pageNumber, label: block.label, text });
    }
  }
  return { number: pageNumber, clauses };
}

export function segmentDocument(pageTexts: string[]): Page[] {
  return pageTexts.map((text, i) => segmentPage(text, i + 1)).filter((p) => p.clauses.length > 0);
}

export function allClauses(pages: Page[]): Clause[] {
  return pages.flatMap((p) => p.clauses);
}
