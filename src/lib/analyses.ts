import type { Analysis, Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "@/lib/db";
import type { analysisContentSchema } from "@/lib/api-schemas";
import { allClauses } from "@/lib/documents/segment";
import type { AnalysisContent, Extraction, Located, Page, SavedAnalysis, SummaryPoint, Translation } from "@/lib/documents/types";
import { CATALOG } from "@/lib/extraction/catalog";
import { buildClauseIndex, locateQuote } from "@/lib/extraction/locate";
import { evaluateFlags } from "@/lib/flags/engine";
import { expiryForPin, expiryFrom, type CleanupStore } from "@/lib/privacy/retention";

type ContentInput = z.infer<typeof analysisContentSchema>;

/**
 * Content comes back from the browser before saving, so it's re-checked: only catalogued fields,
 * every quote must still be in the stored clauses, and flags are recomputed by the rules engine.
 */
export function revalidateContent(input: ContentInput): AnalysisContent {
  const pages = input.pages as Page[];
  const index = buildClauseIndex(allClauses(pages));
  const keep = (l: Located | null | undefined): Located | null => {
    if (!l) return null;
    const clause = locateQuote(index, l.quote, l.clauseId);
    return clause ? { ...l, clauseId: clause.id, page: clause.page } : null;
  };
  const catalog = CATALOG[input.docType];
  const fields: Extraction = { scalars: {}, lists: {} };
  for (const def of catalog.scalars) fields.scalars[def.key] = keep(input.fields.scalars[def.key]);
  for (const def of catalog.lists) {
    fields.lists[def.key] = (input.fields.lists[def.key] ?? [])
      .map(keep)
      .filter((l): l is Located<string> => !!l && typeof l.value === "string");
  }
  const ids = new Set(index.byId.keys());
  const summary: SummaryPoint[] = input.summary.map((p) => ({ text: p.text, clauseIds: p.clauseIds.filter((id) => ids.has(id)) }));
  return {
    docType: input.docType,
    title: input.title,
    pages,
    fields,
    summary,
    flags: evaluateFlags(input.docType, fields),
    translations: input.translations as Partial<Record<string, Translation>>,
  };
}

export function toSaved(row: Analysis): SavedAnalysis {
  return {
    id: row.id,
    docType: row.docType,
    title: row.title,
    pages: row.pages as unknown as Page[],
    fields: row.fields as unknown as Extraction,
    summary: row.summary as unknown as SummaryPoint[],
    flags: row.flags as unknown as SavedAnalysis["flags"],
    translations: row.translations as unknown as SavedAnalysis["translations"],
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Rows past their expiry are invisible even if the daily cleanup hasn't run yet. */
const notExpired = (now: Date): Prisma.AnalysisWhereInput => ({ OR: [{ pinned: true }, { expiresAt: { gt: now } }] });

export async function createAnalysis(userId: string, content: AnalysisContent, now = new Date()): Promise<SavedAnalysis> {
  const pageCount = content.pages.length;
  const row = await db.analysis.create({
    data: {
      userId,
      docType: content.docType,
      title: content.title,
      pageCount,
      pages: json(content.pages),
      fields: json(content.fields),
      summary: json(content.summary),
      flags: json(content.flags),
      translations: json(content.translations),
      expiresAt: expiryFrom(now),
    },
  });
  return toSaved(row);
}

export interface AnalysisListItem {
  id: string;
  title: string;
  docType: SavedAnalysis["docType"];
  pinned: boolean;
  createdAt: string;
  expiresAt: string | null;
  flagCount: number;
}

export async function listAnalyses(userId: string, now = new Date()): Promise<AnalysisListItem[]> {
  const rows = await db.analysis.findMany({
    where: { userId, ...notExpired(now) },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, docType: true, pinned: true, createdAt: true, expiresAt: true, flags: true },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    docType: r.docType,
    pinned: r.pinned,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
    flagCount: Array.isArray(r.flags) ? r.flags.length : 0,
  }));
}

export async function getAnalysis(userId: string, id: string, now = new Date()): Promise<SavedAnalysis | null> {
  const row = await db.analysis.findFirst({ where: { id, userId, ...notExpired(now) } });
  return row ? toSaved(row) : null;
}

export async function updateAnalysis(
  userId: string,
  id: string,
  patch: { pinned?: boolean; title?: string; translations?: SavedAnalysis["translations"] },
  now = new Date(),
): Promise<SavedAnalysis | null> {
  const data: Prisma.AnalysisUpdateManyMutationInput = {};
  if (patch.pinned !== undefined) {
    data.pinned = patch.pinned;
    data.expiresAt = expiryForPin(patch.pinned, now);
  }
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.translations !== undefined) data.translations = json(patch.translations);
  const { count } = await db.analysis.updateMany({ where: { id, userId, ...notExpired(now) }, data });
  return count ? getAnalysis(userId, id, now) : null;
}

export async function deleteAnalysis(userId: string, id: string): Promise<boolean> {
  const { count } = await db.analysis.deleteMany({ where: { id, userId } });
  return count > 0;
}

export async function deleteEverything(userId: string, deleteAccount: boolean): Promise<void> {
  if (deleteAccount) {
    await db.user.delete({ where: { id: userId } }); // sessions and analyses cascade
    return;
  }
  await db.analysis.deleteMany({ where: { userId } });
}

export const prismaCleanupStore: CleanupStore = {
  async deleteExpiredAnalyses(now) {
    return (await db.analysis.deleteMany({ where: { pinned: false, expiresAt: { lte: now } } })).count;
  },
  async deleteExpiredSessions(now) {
    return (await db.session.deleteMany({ where: { expiresAt: { lte: now } } })).count;
  },
  async deleteRateLimitsBefore(cutoff) {
    return (await db.rateLimit.deleteMany({ where: { windowStart: { lt: cutoff } } })).count;
  },
};
