import type { DocType } from "@/lib/documents/types";
import { db } from "@/lib/db";

export const CLIENT_USAGE_KINDS = ["calculator_used", "compare_used", "read_aloud", "guest_start"] as const;

export type UsageKind =
  | (typeof CLIENT_USAGE_KINDS)[number]
  | "signup"
  | "document_read"
  | "analysis_created"
  | "analysis_saved"
  | "translation"
  | "delete_everything";

/** Anonymous counter. Never blocks or fails the user's request. */
export async function track(kind: UsageKind, docType?: DocType): Promise<void> {
  try {
    await db.usageEvent.create({ data: { kind, docType } });
  } catch (err) {
    console.warn("[usage] could not record event", (err as Error).message);
  }
}
