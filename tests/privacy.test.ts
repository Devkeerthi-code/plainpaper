import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "@/lib/privacy/cron-auth";
import { daysLeft, expiryForPin, expiryFrom, isExpired, RETENTION_DAYS, runCleanup, type CleanupStore } from "@/lib/privacy/retention";
import { windowStart, minutesUntilReset } from "@/lib/http/rate-limit";

const NOW = new Date("2027-05-01T10:00:00Z");
const DAY = 86_400_000;

describe("30-day auto-deletion", () => {
  it("expires saved readings 30 days after saving", () => {
    expect(RETENTION_DAYS).toBe(30);
    expect(expiryFrom(NOW).getTime() - NOW.getTime()).toBe(30 * DAY);
  });

  it("pinned readings never expire; unpinning starts a fresh 30 days", () => {
    expect(expiryForPin(true, NOW)).toBeNull();
    expect(expiryForPin(false, NOW)?.toISOString()).toBe(expiryFrom(NOW).toISOString());
    expect(isExpired({ pinned: true, expiresAt: new Date(NOW.getTime() - DAY) }, NOW)).toBe(false);
  });

  it("is expired exactly at the expiry time, not a millisecond before", () => {
    const expiresAt = new Date(NOW.getTime() + 1);
    expect(isExpired({ pinned: false, expiresAt }, NOW)).toBe(false);
    expect(isExpired({ pinned: false, expiresAt }, new Date(NOW.getTime() + 1))).toBe(true);
  });

  it("reports days left for the UI", () => {
    expect(daysLeft(expiryFrom(NOW), NOW)).toBe(30);
    expect(daysLeft(new Date(NOW.getTime() + 1.2 * DAY), NOW)).toBe(2);
    expect(daysLeft(null, NOW)).toBeNull();
  });

  it("cleanup deletes only unpinned, expired rows and old rate-limit windows", async () => {
    const analyses = [
      { id: "old", pinned: false, expiresAt: new Date(NOW.getTime() - DAY) },
      { id: "pinned-old", pinned: true, expiresAt: null },
      { id: "fresh", pinned: false, expiresAt: expiryFrom(NOW) },
    ];
    const sessions = [{ expiresAt: new Date(NOW.getTime() - 1) }, { expiresAt: new Date(NOW.getTime() + DAY) }];
    const windows = [{ windowStart: new Date(NOW.getTime() - 2 * DAY) }, { windowStart: NOW }];
    let cutoffSeen: Date | null = null;

    const store: CleanupStore = {
      async deleteExpiredAnalyses(now) {
        const doomed = analyses.filter((a) => isExpired(a, now));
        doomed.forEach((d) => analyses.splice(analyses.indexOf(d), 1));
        return doomed.length;
      },
      async deleteExpiredSessions(now) {
        return sessions.filter((s) => s.expiresAt <= now).length;
      },
      async deleteRateLimitsBefore(cutoff) {
        cutoffSeen = cutoff;
        return windows.filter((w) => w.windowStart < cutoff).length;
      },
    };

    expect(await runCleanup(store, NOW)).toEqual({ analyses: 1, sessions: 1, rateLimits: 1 });
    expect(analyses.map((a) => a.id)).toEqual(["pinned-old", "fresh"]);
    expect(cutoffSeen!.getTime()).toBe(NOW.getTime() - DAY);
  });
});

describe("cron protection", () => {
  it("accepts only the exact bearer secret", () => {
    const secret = "s3cret-value-long-enough";
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCron(secret, secret)).toBe(false);
    expect(isAuthorizedCron(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorizedCron(null, secret)).toBe(false);
  });
});

describe("rate-limit windows", () => {
  it("aligns windows to fixed boundaries", () => {
    expect(windowStart(new Date("2027-05-01T10:07:30Z"), 600).toISOString()).toBe("2027-05-01T10:00:00.000Z");
    expect(minutesUntilReset(new Date("2027-05-01T10:07:30Z"), { name: "x", max: 1, windowSeconds: 600 })).toBe(3);
  });
});
