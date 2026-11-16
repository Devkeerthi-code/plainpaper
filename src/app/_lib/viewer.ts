import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { currentUser, type CurrentUser } from "@/lib/auth/session";

/**
 * The logged-in user for this request, or null. A database hiccup shouldn't take the
 * whole page down, so it falls back to the logged-out view. Next's own control-flow
 * errors (dynamic rendering, redirects) are passed through untouched.
 */
export const getViewer = cache(async (): Promise<CurrentUser | null> => {
  try {
    return await currentUser();
  } catch (err) {
    unstable_rethrow(err);
    console.warn("[viewer] could not read session", (err as Error).message);
    return null;
  }
});
