/** Minimal shape of a pdf.js text item that we rely on. */
export interface TextItem {
  str: string;
  /** pdf.js transform matrix; [4] is x and [5] is y (origin bottom-left). */
  transform: number[];
  height: number;
}

interface Line {
  y: number;
  x: number;
  text: string;
  height: number;
}

const SAME_LINE_TOLERANCE = 2.5;
const PARAGRAPH_GAP_FACTOR = 1.55;

function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * q)] ?? 0;
}

function groupLines(items: TextItem[]): Line[] {
  const lines: Line[] = [];
  const visible = items.filter((i) => i.str.trim().length > 0);
  for (const item of visible) {
    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    const line = lines.find((l) => Math.abs(l.y - y) <= SAME_LINE_TOLERANCE);
    if (line) {
      const before = x < line.x;
      line.text = before ? `${item.str} ${line.text}` : `${line.text} ${item.str}`;
      line.x = Math.min(line.x, x);
    } else {
      lines.push({ y, x, text: item.str, height: item.height });
    }
  }
  return lines.sort((a, b) => b.y - a.y);
}

/**
 * Rebuild page text with blank lines between paragraphs, using vertical gaps.
 * PDFs have no paragraph markers, so a gap clearly larger than normal line spacing
 * is the best signal that a new clause begins.
 */
export function layoutPageText(items: TextItem[]): string {
  const lines = groupLines(items);
  if (!lines.length) return "";
  const gaps = lines.slice(1).map((l, i) => (lines[i]?.y ?? 0) - l.y).filter((g) => g > 0);
  // Lower quartile, not median: in short-paragraph documents most gaps ARE paragraph gaps.
  const typical = quantile(gaps, 0.25) || quantile(lines.map((l) => l.height), 0.5) || 12;
  const out: string[] = [lines[0]!.text.replace(/\s+/g, " ").trim()];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1]!.y - lines[i]!.y;
    if (gap > typical * PARAGRAPH_GAP_FACTOR) out.push("");
    out.push(lines[i]!.text.replace(/\s+/g, " ").trim());
  }
  return out.join("\n");
}
