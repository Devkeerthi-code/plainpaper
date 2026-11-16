/** Only same-site paths, so a crafted link can't bounce someone to another site after login. */
export function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
