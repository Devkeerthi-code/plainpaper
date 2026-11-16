import type { DocType } from "@/lib/documents/types";

export type ClientUsageKind = "calculator_used" | "compare_used" | "read_aloud" | "guest_start";

const sent = new Set<string>();

/**
 * Anonymous, fire-and-forget counter. `onceKey` dedupes within this tab so one action is
 * counted once, not once per keystroke or re-render.
 */
export function trackUsage(kind: ClientUsageKind, docType?: DocType, onceKey: string = kind): void {
  const key = `plainpaper:tracked:${onceKey}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage blocked: the in-memory set still prevents repeats on this page.
  }
  void fetch("/api/usage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(docType ? { kind, docType } : { kind }),
    keepalive: true,
  }).catch(() => undefined);
}
