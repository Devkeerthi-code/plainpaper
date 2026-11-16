import { NextResponse } from "next/server";
import { credentialsSchema, dummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http/errors";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { clientKey, readJson } from "@/lib/http/request";
import { route } from "@/lib/http/route";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  await enforceLimit(LIMITS.auth, clientKey(req));
  const { email, password } = credentialsSchema.parse(await readJson(req, 10_000));
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
  if (!user || !ok) throw new HttpError(401, "That email and password don't match.", "bad-credentials");
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email } });
});
