import { normalizeForMatch } from "@/lib/documents/segment";
import type { Clause } from "@/lib/documents/types";

export interface ClauseIndex {
  byId: Map<string, Clause>;
  ordered: Clause[];
  normalized: Map<string, string>;
}

export function buildClauseIndex(clauses: Clause[]): ClauseIndex {
  return {
    byId: new Map(clauses.map((c) => [c.id, c])),
    ordered: clauses,
    normalized: new Map(clauses.map((c) => [c.id, normalizeForMatch(c.text)])),
  };
}

const MIN_QUOTE_CHARS = 3;
const FUZZY_TOKEN_SHARE = 0.85;

function tokenShare(quoteTokens: string[], clauseText: string): number {
  const clauseTokens = new Set(clauseText.split(" "));
  const hits = quoteTokens.filter((t) => clauseTokens.has(t)).length;
  return hits / quoteTokens.length;
}

/**
 * Find the clause that really contains `quote`. The model's suggested clause is tried first,
 * then every clause, then a quote that runs across two neighbouring clauses, then a strict
 * fuzzy match (OCR noise). Returns null when the quote is not in the document at all,
 * which is how invented values get dropped.
 */
export function locateQuote(index: ClauseIndex, quote: string, suggestedId: string | null): Clause | null {
  const needle = normalizeForMatch(quote);
  if (needle.length < MIN_QUOTE_CHARS) return null;

  if (suggestedId) {
    const text = index.normalized.get(suggestedId);
    if (text?.includes(needle)) return index.byId.get(suggestedId) ?? null;
  }

  for (const clause of index.ordered) {
    if (index.normalized.get(clause.id)?.includes(needle)) return clause;
  }

  for (let i = 0; i < index.ordered.length - 1; i++) {
    const a = index.ordered[i]!;
    const b = index.ordered[i + 1]!;
    const joined = `${index.normalized.get(a.id)} ${index.normalized.get(b.id)}`;
    if (joined.includes(needle)) return a;
  }

  const tokens = needle.split(" ");
  if (tokens.length < 4) return null;
  let best: { clause: Clause; share: number } | null = null;
  for (const clause of index.ordered) {
    const share = tokenShare(tokens, index.normalized.get(clause.id) ?? "");
    if (share >= FUZZY_TOKEN_SHARE && (!best || share > best.share)) best = { clause, share };
  }
  return best?.clause ?? null;
}

/**
 * Character range of `quote` inside the clause text, for a precise highlight.
 * Clause text is already whitespace-collapsed by the segmenter. Null when not an exact match;
 * the viewer then highlights the whole clause.
 */
export function quoteRange(clauseText: string, quote: string): { start: number; end: number } | null {
  const needle = quote.trim().replace(/\s+/g, " ").toLowerCase();
  if (!needle) return null;
  const start = clauseText.toLowerCase().indexOf(needle);
  return start >= 0 ? { start, end: start + needle.length } : null;
}
