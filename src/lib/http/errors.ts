import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AiError } from "@/lib/ai/gemini";
import { UploadError } from "@/lib/documents/ingest";
import { CompareTypeMismatchError } from "@/lib/compare/diff";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "error",
  ) {
    super(message);
  }
}

const AI_MESSAGES: Record<AiError["code"], [number, string]> = {
  "rate-limited": [503, "The reading service is busy right now. Please try again in a minute."],
  unavailable: [503, "We couldn't reach the reading service. Please try again."],
  "bad-output": [502, "We couldn't make sense of this document. Try a clearer scan or a different file."],
  blocked: [422, "This document couldn't be processed by the reading service."],
  "not-configured": [500, "The reading service isn't set up yet."],
};

/** One place that turns errors into calm, user-facing JSON. Internals never leak. */
export function toResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  if (err instanceof UploadError) return NextResponse.json({ error: err.message, code: "upload" }, { status: 400 });
  if (err instanceof CompareTypeMismatchError) return NextResponse.json({ error: err.message, code: "compare" }, { status: 400 });
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.issues[0]?.message ?? "Some details look wrong.", code: "invalid" }, { status: 400 });
  }
  if (err instanceof AiError) {
    const [status, message] = AI_MESSAGES[err.code];
    console.warn(`[ai] ${err.code}: ${err.message}`);
    return NextResponse.json({ error: message, code: `ai-${err.code}` }, { status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong on our side. Please try again.", code: "server" }, { status: 500 });
}
