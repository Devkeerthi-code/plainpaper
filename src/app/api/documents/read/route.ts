import { NextResponse } from "next/server";
import { classifyUpload, MAX_UPLOAD_BYTES, readDocument } from "@/lib/documents/ingest";
import { HttpError } from "@/lib/http/errors";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { clientKey } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { track } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Reads an uploaded PDF or photos into clause-segmented text.
 * The file bytes live only in this request's memory; nothing is written to disk or the database.
 */
export const POST = route(async (req) => {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    throw new HttpError(413, "That's more than 4 MB. Try fewer or smaller photos.", "too-large");
  }
  await enforceLimit(LIMITS.read, clientKey(req));
  await enforceLimit(LIMITS.aiDaily, "global");

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "We couldn't receive that file. Please try again.", "upload");
  });
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const bytes = await Promise.all(files.map(async (f) => new Uint8Array(await f.arrayBuffer())));
  const result = await readDocument(classifyUpload(bytes));

  await track("document_read");
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
});
