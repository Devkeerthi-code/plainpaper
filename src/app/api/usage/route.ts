import { NextResponse } from "next/server";
import { usageInputSchema } from "@/lib/api-schemas";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { clientKey, readJson } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { track } from "@/lib/usage";

export const runtime = "nodejs";

/** Anonymous counters for actions that happen only in the browser (calculator, compare, read-aloud). */
export const POST = route(async (req) => {
  await enforceLimit(LIMITS.write, clientKey(req));
  const { kind, docType } = usageInputSchema.parse(await readJson(req, 1_000));
  await track(kind, docType);
  return NextResponse.json({ ok: true });
});
