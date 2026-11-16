import { NextResponse } from "next/server";
import { deleteAnalysis, getAnalysis, updateAnalysis } from "@/lib/analyses";
import { patchAnalysisSchema } from "@/lib/api-schemas";
import { HttpError } from "@/lib/http/errors";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { readJson } from "@/lib/http/request";
import { requireUser, route } from "@/lib/http/route";

export const runtime = "nodejs";

type Params = { id: string };
const notFound = () => new HttpError(404, "This reading doesn't exist or has been deleted.", "not-found");

export const GET = route<Params>(async (_req, { params }) => {
  const user = await requireUser();
  const analysis = await getAnalysis(user.id, (await params).id);
  if (!analysis) throw notFound();
  return NextResponse.json({ analysis }, { headers: { "cache-control": "no-store" } });
});

export const PATCH = route<Params>(async (req, { params }) => {
  const user = await requireUser();
  await enforceLimit(LIMITS.write, user.id);
  const patch = patchAnalysisSchema.parse(await readJson(req, 10_000));
  const analysis = await updateAnalysis(user.id, (await params).id, patch);
  if (!analysis) throw notFound();
  return NextResponse.json({ analysis });
});

export const DELETE = route<Params>(async (_req, { params }) => {
  const user = await requireUser();
  if (!(await deleteAnalysis(user.id, (await params).id))) throw notFound();
  return NextResponse.json({ ok: true });
});
