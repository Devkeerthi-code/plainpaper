import { NextResponse } from "next/server";
import { explainDocument } from "@/lib/ai/pipeline";
import { explainInputSchema } from "@/lib/api-schemas";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { clientKey, readJson } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import type { Page } from "@/lib/documents/types";
import { track } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Extracts fields, writes the plain summary and runs the flag rules. Stores nothing. */
export const POST = route(async (req) => {
  await enforceLimit(LIMITS.explain, clientKey(req));
  await enforceLimit(LIMITS.aiDaily, "global");
  const { docType, pages } = explainInputSchema.parse(await readJson(req, 1_500_000));
  const { content, dropped } = await explainDocument(docType, pages as Page[]);
  await track("analysis_created", docType);
  return NextResponse.json({ content, droppedCount: dropped.length }, { headers: { "cache-control": "no-store" } });
});
