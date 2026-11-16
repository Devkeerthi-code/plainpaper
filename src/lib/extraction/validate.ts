import { z } from "zod";
import type { Clause, DocType, Extraction, Located, Scalar, SummaryPoint } from "@/lib/documents/types";
import { CATALOG, PARTIES, type FieldKind } from "./catalog";
import { buildClauseIndex, locateQuote, type ClauseIndex } from "./locate";
import { parseAmounts, valueSupportedByQuote } from "./numbers";

/** Models sometimes return "₹2,00,000" or "2 lakh" where a number was asked for. */
const numberish = (max: number) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const parsed = parseAmounts(v);
    return parsed.length === 1 ? parsed[0] : v;
  }, z.number().nonnegative().max(max));

const VALUE_SCHEMAS: Record<FieldKind, z.ZodType<Scalar>> = {
  money: numberish(1e10),
  months: numberish(600),
  days: numberish(3650),
  hours: numberish(24 * 365),
  percent: numberish(100),
  text: z.string().trim().min(1).max(600),
  boolean: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean()),
  party: z.preprocess((v) => (typeof v === "string" ? v.toLowerCase().trim() : v), z.enum(PARTIES)),
};

const rawLocated = z.object({
  value: z.unknown(),
  clauseId: z.string().max(20).nullish(),
  quote: z.string().max(2000).nullish(),
});

export const rawModelOutputSchema = z.object({
  title: z.string().max(300).nullish(),
  fields: z.record(z.string(), rawLocated.nullable()).default({}),
  lists: z.record(z.string(), z.array(rawLocated).max(60)).default({}),
  summary: z
    .array(z.object({ text: z.string().max(600), clauseIds: z.array(z.string().max(20)).max(10).default([]) }))
    .max(20)
    .default([]),
});
export type RawModelOutput = z.infer<typeof rawModelOutputSchema>;

export type DropReason = "invalid-value" | "quote-not-found" | "value-not-in-quote" | "suspicious-source";
export interface Dropped {
  key: string;
  reason: DropReason;
}

/** Text addressed to an AI rather than to the signer. Values may not be sourced from such clauses. */
const INJECTION_PATTERN =
  /(ignore|disregard|forget)\s+(all\s+|any\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)|\b(note|message|instructions?)\s+(to|for)\s+(the\s+)?(ai|assistant|model|llm|chatgpt|gemini)\b|\bsystem\s*prompt\b|\byou are (now )?an? (ai|assistant|language model)\b/i;

export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERN.test(text);
}

function locateValue<T extends Scalar>(
  index: ClauseIndex,
  kind: FieldKind,
  value: T,
  clauseId: string | null | undefined,
  quote: string | null | undefined,
): Located<T> | DropReason {
  if (!quote) return "quote-not-found";
  const clause = locateQuote(index, quote, clauseId ?? null);
  if (!clause) return "quote-not-found";
  if (looksLikeInjection(clause.text)) return "suspicious-source";
  if (typeof value === "number" && !valueSupportedByQuote(kind, value, quote)) return "value-not-in-quote";
  return { value, clauseId: clause.id, page: clause.page, quote: quote.trim() };
}

export function validateExtraction(
  docType: DocType,
  raw: RawModelOutput,
  clauses: Clause[],
): { extraction: Extraction; dropped: Dropped[] } {
  const index = buildClauseIndex(clauses);
  const catalog = CATALOG[docType];
  const dropped: Dropped[] = [];
  const extraction: Extraction = { scalars: {}, lists: {} };

  for (const def of catalog.scalars) {
    extraction.scalars[def.key] = null;
    const field = raw.fields[def.key];
    if (!field || field.value === null || field.value === undefined || field.value === "") continue;
    const parsed = VALUE_SCHEMAS[def.kind].safeParse(field.value);
    if (!parsed.success) {
      dropped.push({ key: def.key, reason: "invalid-value" });
      continue;
    }
    const located = locateValue(index, def.kind, parsed.data, field.clauseId, field.quote);
    if (typeof located === "string") dropped.push({ key: def.key, reason: located });
    else extraction.scalars[def.key] = located;
  }

  for (const def of catalog.lists) {
    const items: Located<string>[] = [];
    for (const [i, item] of (raw.lists[def.key] ?? []).entries()) {
      const parsed = VALUE_SCHEMAS.text.safeParse(item.value);
      if (!parsed.success || typeof parsed.data !== "string") {
        dropped.push({ key: `${def.key}[${i}]`, reason: "invalid-value" });
        continue;
      }
      const located = locateValue(index, "text", parsed.data, item.clauseId, item.quote);
      if (typeof located === "string") dropped.push({ key: `${def.key}[${i}]`, reason: located });
      else items.push(located);
    }
    extraction.lists[def.key] = items;
  }

  return { extraction, dropped };
}

/** Links, emails and phone numbers in the model's own words are a classic injection payload. */
const CONTACT_PATTERN = /(https?:\/\/|www\.|\b[\w.+-]+@[\w-]+\.[\w.]+\b|\+?\d[\d\s-]{9,}\d)/i;

export function hasContactDetails(text: string): boolean {
  return CONTACT_PATTERN.test(text);
}

export function validateSummary(raw: RawModelOutput["summary"], clauses: Clause[]): SummaryPoint[] {
  const ids = new Set(clauses.map((c) => c.id));
  return raw
    .map((p) => ({ text: p.text.trim(), clauseIds: [...new Set(p.clauseIds)].filter((id) => ids.has(id)) }))
    .filter((p) => p.text.length > 0 && !hasContactDetails(p.text))
    .slice(0, 12);
}

export function cleanTitle(raw: string | null | undefined, fallback: string): string {
  const title = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return title && !hasContactDetails(title) ? title : fallback;
}
