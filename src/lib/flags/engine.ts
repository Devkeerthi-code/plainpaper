import { FLAG_RULES, type FieldReader } from "@/config/flag-rules";
import type { DocType, Extraction, Flag } from "@/lib/documents/types";

export function readerFor(extraction: Extraction): FieldReader {
  const get = (key: string) => extraction.scalars[key]?.value ?? null;
  return {
    num: (key) => {
      const v = get(key);
      return typeof v === "number" ? v : null;
    },
    text: (key) => {
      const v = get(key);
      return typeof v === "string" ? v : null;
    },
    bool: (key) => {
      const v = get(key);
      return typeof v === "boolean" ? v : null;
    },
    listCount: (key) => extraction.lists[key]?.length ?? 0,
  };
}

const SEVERITY_ORDER = { red: 0, amber: 1 } as const;

/** Run every rule for the document type. Pure and deterministic; the AI never decides flags. */
export function evaluateFlags(docType: DocType, extraction: Extraction): Flag[] {
  const reader = readerFor(extraction);
  const flags: Flag[] = [];
  for (const rule of FLAG_RULES) {
    if (rule.docType !== docType) continue;
    const outcome = rule.evaluate(reader);
    if (!outcome) continue;
    const anchor = extraction.scalars[rule.anchor] ?? extraction.lists[rule.anchor]?.[0] ?? null;
    flags.push({
      ruleId: rule.id,
      ...outcome,
      clauseId: anchor?.clauseId ?? null,
      page: anchor?.page ?? null,
      quote: anchor?.quote ?? null,
    });
  }
  return flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
