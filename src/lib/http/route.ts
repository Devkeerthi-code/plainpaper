import type { NextRequest, NextResponse } from "next/server";
import { currentUser, type CurrentUser } from "@/lib/auth/session";
import { HttpError, toResponse } from "./errors";
import { assertSameOrigin } from "./request";

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<NextResponse>;

/** Wraps a route handler: same-origin check on writes and one consistent error format. */
export function route<P = Record<string, never>>(handler: Handler<P>): Handler<P> {
  return async (req, ctx) => {
    try {
      if (req.method !== "GET") assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      return toResponse(err);
    }
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please log in to do that.", "unauthenticated");
  return user;
}
