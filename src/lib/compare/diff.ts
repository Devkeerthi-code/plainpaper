import type { AnalysisContent, Located } from "@/lib/documents/types";
import { normalizeForMatch } from "@/lib/documents/segment";
import { CATALOG, type FieldKind } from "@/lib/extraction/catalog";

export type RowStatus = "same" | "different" | "only-a" | "only-b" | "missing";

export interface CompareRow {
  key: string;
  label: string;
  group: string;
  kind: FieldKind | "list";
  a: Located | null;
  b: Located | null;
  aItems?: string[];
  bItems?: string[];
  status: RowStatus;
  /** Which side is better for the person signing, when that is objective. */
  better: "a" | "b" | null;
}

export class CompareTypeMismatchError extends Error {
  constructor() {
    super("Both documents must be the same type to compare them.");
  }
}

function sameValue(a: Located, b: Located): boolean {
  if (typeof a.value === "string" && typeof b.value === "string") {
    return normalizeForMatch(a.value) === normalizeForMatch(b.value);
  }
  return a.value === b.value;
}

function statusOf(hasA: boolean, hasB: boolean, equal: boolean): RowStatus {
  if (!hasA && !hasB) return "missing";
  if (!hasB) return "only-a";
  if (!hasA) return "only-b";
  return equal ? "same" : "different";
}

/**
 * A missing harmful term (no bond, no lock-in) is better than having one,
 * so "lower is better" fields treat absence as zero.
 */
function betterSide(a: Located | null, b: Located | null, better: "higher" | "lower" | undefined): "a" | "b" | null {
  if (!better) return null;
  const toNum = (l: Located | null) => (l && typeof l.value === "number" ? l.value : better === "lower" ? 0 : null);
  const av = toNum(a);
  const bv = toNum(b);
  if (av === null || bv === null || av === bv) return null;
  if (!a && !b) return null;
  return (better === "higher" ? av > bv : av < bv) ? "a" : "b";
}

export function compareAnalyses(a: AnalysisContent, b: AnalysisContent): CompareRow[] {
  if (a.docType !== b.docType) throw new CompareTypeMismatchError();
  const catalog = CATALOG[a.docType];
  const rows: CompareRow[] = [];

  for (const def of catalog.scalars) {
    const av = a.fields.scalars[def.key] ?? null;
    const bv = b.fields.scalars[def.key] ?? null;
    const status = statusOf(!!av, !!bv, !!av && !!bv && sameValue(av, bv));
    if (status === "missing") continue;
    rows.push({
      key: def.key,
      label: def.label,
      group: def.group,
      kind: def.kind,
      a: av,
      b: bv,
      status,
      better: status === "same" ? null : betterSide(av, bv, def.better),
    });
  }

  for (const def of catalog.lists) {
    const aItems = (a.fields.lists[def.key] ?? []).map((l) => l.value);
    const bItems = (b.fields.lists[def.key] ?? []).map((l) => l.value);
    const norm = (xs: string[]) => new Set(xs.map(normalizeForMatch));
    const na = norm(aItems);
    const nb = norm(bItems);
    const equal = na.size === nb.size && [...na].every((x) => nb.has(x));
    const status = statusOf(aItems.length > 0, bItems.length > 0, equal);
    if (status === "missing") continue;
    rows.push({
      key: def.key,
      label: def.label,
      group: def.group,
      kind: "list",
      a: a.fields.lists[def.key]?.[0] ?? null,
      b: b.fields.lists[def.key]?.[0] ?? null,
      aItems,
      bItems,
      status,
      // Fewer exclusions / sub-limits is better for the policyholder.
      better: equal || aItems.length === bItems.length ? null : aItems.length < bItems.length ? "a" : "b",
    });
  }
  return rows;
}

export function summarizeDiff(rows: CompareRow[]): { different: number; betterA: number; betterB: number } {
  return {
    different: rows.filter((r) => r.status !== "same").length,
    betterA: rows.filter((r) => r.better === "a").length,
    betterB: rows.filter((r) => r.better === "b").length,
  };
}
