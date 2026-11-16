import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  CRON_SECRET: z.string().min(16),
  IP_HASH_SALT: z.string().min(16),
  ADMIN_EMAILS: z.string().default(""),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | null = null;

/** Validated server env. Throws a readable error listing what's missing. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export function adminEmails(): Set<string> {
  return new Set(
    serverEnv()
      .ADMIN_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
