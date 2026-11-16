import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { credentialsSchema, hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http/errors";
import { enforceLimit, LIMITS } from "@/lib/http/rate-limit";
import { clientKey, readJson } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { track } from "@/lib/usage";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  await enforceLimit(LIMITS.auth, clientKey(req));
  const { email, password } = credentialsSchema.parse(await readJson(req, 10_000));
  try {
    const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password) }, select: { id: true, email: true } });
    await createSession(user.id);
    await track("signup");
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "There's already an account with this email. Try logging in.", "exists");
    }
    throw err;
  }
});
