import { db } from "@/lib/db";
import { HttpError } from "./errors";

export interface Limit {
  name: string;
  max: number;
  windowSeconds: number;
}

export const LIMITS = {
  read: { name: "read", max: 12, windowSeconds: 600 },
  explain: { name: "explain", max: 12, windowSeconds: 600 },
  translate: { name: "translate", max: 30, windowSeconds: 600 },
  auth: { name: "auth", max: 10, windowSeconds: 900 },
  write: { name: "write", max: 60, windowSeconds: 600 },
  /** Whole-app ceiling on AI calls per day, protecting the free Gemini quota. */
  aiDaily: { name: "ai-daily", max: 1500, windowSeconds: 86_400 },
} satisfies Record<string, Limit>;

export function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

export function minutesUntilReset(now: Date, limit: Limit): number {
  const end = windowStart(now, limit.windowSeconds).getTime() + limit.windowSeconds * 1000;
  return Math.max(1, Math.ceil((end - now.getTime()) / 60_000));
}

/** Fixed-window counter in Postgres: one atomic upsert per request, shared by every serverless instance. */
export async function enforceLimit(limit: Limit, subject: string, now = new Date()): Promise<void> {
  const start = windowStart(now, limit.windowSeconds);
  const key = `${limit.name}:${subject}`;
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${start}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"`;
  const count = rows[0]?.count ?? 0;
  if (count > limit.max) {
    const wait = minutesUntilReset(now, limit);
    throw new HttpError(429, `That's a lot of requests in a short time. Please wait about ${wait} minute${wait === 1 ? "" : "s"}.`, "rate-limited");
  }
}
