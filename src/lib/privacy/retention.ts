export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + RETENTION_DAYS * DAY_MS);
}

/** Pinning removes the expiry; unpinning starts a fresh 30-day window from now. */
export function expiryForPin(pinned: boolean, now: Date): Date | null {
  return pinned ? null : expiryFrom(now);
}

export function isExpired(row: { pinned: boolean; expiresAt: Date | null }, now: Date): boolean {
  return !row.pinned && row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime();
}

export function daysLeft(expiresAt: Date | null, now: Date): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
}

/** What the cleanup job needs from storage, so it can be tested without a database. */
export interface CleanupStore {
  deleteExpiredAnalyses(now: Date): Promise<number>;
  deleteExpiredSessions(now: Date): Promise<number>;
  deleteRateLimitsBefore(cutoff: Date): Promise<number>;
}

export interface CleanupReport {
  analyses: number;
  sessions: number;
  rateLimits: number;
}

export async function runCleanup(store: CleanupStore, now: Date): Promise<CleanupReport> {
  const [analyses, sessions, rateLimits] = await Promise.all([
    store.deleteExpiredAnalyses(now),
    store.deleteExpiredSessions(now),
    store.deleteRateLimitsBefore(new Date(now.getTime() - DAY_MS)),
  ]);
  return { analyses, sessions, rateLimits };
}
