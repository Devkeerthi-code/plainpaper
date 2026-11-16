"use client";

import { sourceLabel } from "@/lib/client/present";
import { useReading } from "./ReadingContext";

/** "p.2 · clause 7": tap to see the exact words in the original, highlighted. */
export function SourceChip({ clauseId, page, quote }: { clauseId: string; page?: number; quote?: string | null }) {
  const { clauseMap, showInOriginal } = useReading();
  const label = sourceLabel(clauseMap, clauseId, page);
  return (
    <button type="button" className="src" onClick={() => showInOriginal(clauseId, quote ?? null)} aria-label={`Show in the original: ${label}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
      {label}
    </button>
  );
}
