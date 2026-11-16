import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnalysis, updateAnalysis } from "@/lib/analyses";
import { translateContent } from "@/lib/ai/pipeline";
import { translateInputSchema } from "@/lib/api-schemas";
import { currentUser } from "@/lib/auth/session";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { clientKey, readJson } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { track } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = translateInputSchema.extend({ analysisId: z.string().max(40).optional() });

/** Translates the summary and flags. If the reading is saved, the translation is cached on it. */
export const POST = route(async (req) => {
  await enforceLimit(LIMITS.translate, clientKey(req));
  await enforceLimit(LIMITS.aiDaily, "global");
  const { language, summary, flags, analysisId } = bodySchema.parse(await readJson(req, 300_000));
  const translation = await translateContent({ summary, flags }, language);
  await track("translation");

  const user = analysisId ? await currentUser() : null;
  if (user && analysisId) {
    const saved = await getAnalysis(user.id, analysisId);
    if (saved) await updateAnalysis(user.id, analysisId, { translations: { ...saved.translations, [language]: translation } });
  }
  return NextResponse.json({ translation });
});
