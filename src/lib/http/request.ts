import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { HttpError } from "./errors";

/** Blocks cross-site posts. Browsers always send Origin on cross-site fetches and forms. */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "This request came from another site.", "origin");
  }
  if (!host || originHost !== host) throw new HttpError(403, "This request came from another site.", "origin");
}

/** Salted hash of the client IP: enough to rate-limit, useless for tracking a person. */
export function clientKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return createHash("sha256").update(`${serverEnv().IP_HASH_SALT}:${ip}`).digest("hex").slice(0, 32);
}

export async function readJson(req: NextRequest, maxBytes = 1_000_000): Promise<unknown> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new HttpError(413, "That request is too large.", "too-large");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "That request is too large.", "too-large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "That request wasn't valid JSON.", "invalid");
  }
}
