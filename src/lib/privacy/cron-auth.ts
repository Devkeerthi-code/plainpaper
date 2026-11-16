import { timingSafeEqual } from "node:crypto";

/** Constant-time check of the "Authorization: Bearer <CRON_SECRET>" header Vercel Cron sends. */
export function isAuthorizedCron(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
