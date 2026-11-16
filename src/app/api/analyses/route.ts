import { NextResponse } from "next/server";
import { createAnalysis, listAnalyses, revalidateContent } from "@/lib/analyses";
import { analysisContentSchema } from "@/lib/api-schemas";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { readJson } from "@/lib/http/request";
import { requireUser, route } from "@/lib/http/route";
import { track } from "@/lib/usage";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  return NextResponse.json({ analyses: await listAnalyses(user.id) }, { headers: { "cache-control": "no-store" } });
});

/** Saving is the only time document text reaches the database, and it expires in 30 days unless pinned. */
export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceLimit(LIMITS.write, user.id);
  const input = analysisContentSchema.parse(await readJson(req, 1_800_000));
  const saved = await createAnalysis(user.id, revalidateContent(input));
  await track("analysis_saved", saved.docType);
  return NextResponse.json({ analysis: saved }, { status: 201 });
});
