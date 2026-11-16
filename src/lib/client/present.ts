import type { AnalysisContent, Clause, DocType, Located, Page, Scalar } from "@/lib/documents/types";
import { CATALOG, type FieldKind } from "@/lib/extraction/catalog";
import { formatINR, formatINRShort, plural } from "@/lib/format";

/** Presentation helpers shared by the reading, compare and list views. Pure functions only. */

export interface ClauseInfo {
  clause: Clause;
  /** 1-based position on its page, used when the document has no clause number. */
  position: number;
}

export type ClauseMap = Map<string, ClauseInfo>;

export function buildClauseMap(pages: Page[]): ClauseMap {
  const map: ClauseMap = new Map();
  for (const page of pages) page.clauses.forEach((clause, i) => map.set(clause.id, { clause, position: i + 1 }));
  return map;
}

/** "p.2 · clause 7", or "p.1 · para 3" when the document doesn't number that part. */
export function sourceLabel(map: ClauseMap, clauseId: string, page?: number): string {
  const info = map.get(clauseId);
  if (!info) return page ? `p.${page}` : "In the document";
  const where = info.clause.label ? `clause ${info.clause.label}` : `para ${info.position}`;
  return `p.${info.clause.page} · ${where}`;
}

const PARTY_LABELS: Record<string, string> = { tenant: "You", landlord: "Owner", shared: "Shared" };

export function formatValue(kind: FieldKind, value: Scalar): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    switch (kind) {
      case "money":
        return value >= 1e5 ? `${formatINR(value)} (${formatINRShort(value)})` : formatINR(value);
      case "months":
        return plural(value, "month");
      case "days":
        return plural(value, "day");
      case "hours":
        return plural(value, "hour");
      case "percent":
        return `${Number(value.toFixed(2))}%`;
      default:
        return String(value);
    }
  }
  if (kind === "party") return PARTY_LABELS[value.toLowerCase()] ?? value;
  return value;
}

export interface FieldRow {
  key: string;
  label: string;
  kind: FieldKind | "list";
  value: Located | null;
  items: Located<string>[];
}

export interface FieldGroup {
  name: string;
  rows: FieldRow[];
}

/** Every catalogued field in catalog order, grouped; missing ones are kept so the UI can say so. */
export function groupFields(content: Pick<AnalysisContent, "docType" | "fields">): FieldGroup[] {
  const catalog = CATALOG[content.docType];
  const groups = new Map<string, FieldRow[]>();
  const push = (group: string, row: FieldRow) => groups.set(group, [...(groups.get(group) ?? []), row]);
  for (const def of catalog.scalars) {
    push(def.group, { key: def.key, label: def.label, kind: def.kind, value: content.fields.scalars[def.key] ?? null, items: [] });
  }
  for (const def of catalog.lists) {
    const items = content.fields.lists[def.key] ?? [];
    push(def.group, { key: def.key, label: def.label, kind: "list", value: items[0] ?? null, items });
  }
  return [...groups.entries()].map(([name, rows]) => ({ name, rows }));
}

export function numberField(content: Pick<AnalysisContent, "fields">, key: string): number | null {
  const v = content.fields.scalars[key]?.value;
  return typeof v === "number" ? v : null;
}

export function textField(content: Pick<AnalysisContent, "fields">, key: string): string | null {
  const v = content.fields.scalars[key]?.value;
  return typeof v === "string" ? v : null;
}

const SAMPLE_MARK = /fictional sample/i;

/** The bundled samples say "FICTIONAL SAMPLE" in their text; the UI labels them so. */
export function isFictionalSample(pages: Page[]): boolean {
  return pages.some((p) => p.clauses.some((c) => SAMPLE_MARK.test(c.text)));
}

/** A short name for headers: the company, owner or insurer, else the title. */
export function shortName(content: Pick<AnalysisContent, "docType" | "fields" | "title">): string {
  const key: Record<DocType, string> = { OFFER_LETTER: "employer", RENT_AGREEMENT: "property", INSURANCE_POLICY: "insurer" };
  const name = textField(content, key[content.docType]);
  if (!name) return content.title;
  return name === name.toUpperCase() ? toTitleCase(name) : name;
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s(.-])(\p{L})/gu, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "1 Apr 2026", deterministic on server and client. */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
