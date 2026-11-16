import { NextResponse, type NextRequest } from "next/server";
import { prismaCleanupStore } from "@/lib/analyses";
import { serverEnv } from "@/lib/env";
import { isAuthorizedCron } from "@/lib/privacy/cron-auth";
import { runCleanup } from "@/lib/privacy/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daily job (vercel.json): deletes unpinned readings older than 30 days, expired sessions and old rate-limit rows. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), serverEnv().CRON_SECRET)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  try {
    const report = await runCleanup(prismaCleanupStore, new Date());
    return NextResponse.json({ ok: true, deleted: report });
  } catch (err) {
    console.error("[cron] cleanup failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
