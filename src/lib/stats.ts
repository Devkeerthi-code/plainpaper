import { db } from "@/lib/db";

export interface UsageStats {
  accounts: number;
  savedReadings: number;
  last30Days: { kind: string; count: number }[];
  allTime: { kind: string; count: number }[];
}

/** Aggregate counts only: the usage table holds no user ids, IPs or document text. */
export async function getUsageStats(now = new Date()): Promise<UsageStats> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [accounts, savedReadings, recent, allTime] = await Promise.all([
    db.user.count(),
    db.analysis.count(),
    db.usageEvent.groupBy({ by: ["kind"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    db.usageEvent.groupBy({ by: ["kind"], _count: { _all: true } }),
  ]);
  const shape = (rows: { kind: string; _count: { _all: number } }[]) =>
    rows.map((r) => ({ kind: r.kind, count: r._count._all })).sort((a, b) => b.count - a.count);
  return { accounts, savedReadings, last30Days: shape(recent), allTime: shape(allTime) };
}
