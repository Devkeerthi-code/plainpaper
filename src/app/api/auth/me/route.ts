import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { route } from "@/lib/http/route";

export const runtime = "nodejs";

export const GET = route(async () => {
  return NextResponse.json({ user: await currentUser() }, { headers: { "cache-control": "no-store" } });
});
