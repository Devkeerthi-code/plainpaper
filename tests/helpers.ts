import { segmentDocument, allClauses } from "@/lib/documents/segment";
import type { Extraction, Located, Scalar } from "@/lib/documents/types";

export const OFFER_PAGES = segmentDocument([
  [
    "NORTHWIND FICTIONAL TECHNOLOGIES",
    "",
    "1. Position: You will join as Graduate Engineer Trainee.",
    "",
    "4. Compensation: Your total annual Cost to Company (CTC) will be Rs. 8,00,000. The fixed component is Rs. 7,20,000 per annum.",
    "",
    "6. Probation: You will be on probation for 6 months.",
  ].join("\n"),
  [
    "7. Service agreement: If you leave within 24 months you shall pay Rs. 2,00,000 (Rupees Two Lakh only).",
    "",
    "8. Notice period: Either party may end employment by giving 90 days written notice.",
  ].join("\n"),
]);

export const OFFER_CLAUSES = allClauses(OFFER_PAGES);

export function located<T extends Scalar>(value: T, clauseId = "p1-c1", page = 1, quote = "quote"): Located<T> {
  return { value, clauseId, page, quote };
}

export function extraction(scalars: Record<string, Scalar | null>, lists: Record<string, string[]> = {}): Extraction {
  return {
    scalars: Object.fromEntries(Object.entries(scalars).map(([k, v]) => [k, v === null ? null : located(v)])),
    lists: Object.fromEntries(Object.entries(lists).map(([k, items]) => [k, items.map((v) => located(v))])),
  };
}
