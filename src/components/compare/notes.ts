import type { CompareRow } from "@/lib/compare/diff";
import { calculateInHand } from "@/lib/calculator/inhand";
import type { AnalysisContent, Located } from "@/lib/documents/types";
import { scalarDef } from "@/lib/extraction/catalog";
import { formatINR, formatINRShort, plural } from "@/lib/format";
import { numberField } from "@/lib/client/present";

const num = (l: Located | null) => (l && typeof l.value === "number" ? l.value : null);

/** A short, plain reason the better side is better: "₹1.5 lakh more", "No bond", "30 days shorter". */
export function betterNote(row: CompareRow, docType: AnalysisContent["docType"]): string | null {
  if (!row.better) return null;
  const mine = row.better === "a" ? row.a : row.b;
  const theirs = row.better === "a" ? row.b : row.a;
  if (row.kind === "list") {
    const n = Math.abs((row.aItems?.length ?? 0) - (row.bItems?.length ?? 0));
    return `${n} fewer listed`;
  }
  if (!mine) return "None in this one";
  const a = num(mine);
  const b = num(theirs) ?? 0;
  if (a === null) return null;
  const d = Math.abs(a - b);
  const higherBetter = scalarDef(docType, row.key)?.better === "higher";
  const word = higherBetter ? "more" : "less";
  switch (row.kind) {
    case "money":
      return `${formatINRShort(d)} ${word}`;
    case "months":
      return `${plural(d, "month")} ${higherBetter ? "longer" : "shorter"}`;
    case "days":
      return `${plural(d, "day")} ${higherBetter ? "longer" : "shorter"}`;
    case "hours":
      return `${plural(d, "hour")} ${higherBetter ? "longer" : "shorter"}`;
    case "percent":
      return `${Number(d.toFixed(2))}% ${higherBetter ? "higher" : "lower"}`;
    default:
      return null;
  }
}

export function dependsNote(row: CompareRow): string | null {
  if (row.better || row.status === "same") return null;
  if (row.status === "only-a" || row.status === "only-b") return "Only one of them mentions this";
  return "Depends on what matters to you";
}

export interface InHandRow {
  a: number | null;
  b: number | null;
  better: "a" | "b" | null;
  note: string | null;
}

function monthly(content: AnalysisContent): number | null {
  const ctc = numberField(content, "ctcAnnual");
  if (!ctc) return null;
  return calculateInHand({
    ctcAnnual: ctc,
    fixedAnnual: numberField(content, "fixedAnnual"),
    variableAnnual: numberField(content, "variableAnnual"),
    basicAnnual: numberField(content, "basicAnnual"),
    hraAnnual: numberField(content, "hraAnnual"),
    employerPfAnnual: numberField(content, "employerPfAnnual"),
    regime: "new",
  }).monthlyInHand;
}

/** Offers only: monthly in-hand under the new regime, the number people actually live on. */
export function inHandRow(a: AnalysisContent, b: AnalysisContent): InHandRow | null {
  if (a.docType !== "OFFER_LETTER") return null;
  const ma = monthly(a);
  const mb = monthly(b);
  if (ma === null && mb === null) return null;
  const better = ma !== null && mb !== null && ma !== mb ? (ma > mb ? "a" : "b") : null;
  return { a: ma, b: mb, better, note: better && ma !== null && mb !== null ? `${formatINR(Math.abs(ma - mb))} more a month` : null };
}
