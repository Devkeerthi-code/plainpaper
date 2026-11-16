"use client";

import type { Language, SummaryPoint } from "@/lib/documents/types";
import { SourceChip } from "./SourceChip";
import { useReading } from "./ReadingContext";

export function SummarySection({ points, lang }: { points: SummaryPoint[]; lang: Language }) {
  const { clauseMap } = useReading();
  const indic = lang !== "en";
  return (
    <section aria-labelledby="sum-title">
      <h2 id="sum-title">In short</h2>
      <ul className="summary">
        {points.map((p, i) => {
          const refs = p.clauseIds.filter((id) => clauseMap.has(id));
          return (
            <li key={i} data-refs={refs.join(" ") || undefined} lang={lang} className={indic ? "indic" : undefined}>
              {p.text}
              {refs.length > 0 && (
                <span className="chips" lang="en">
                  {refs.slice(0, 3).map((id) => (
                    <SourceChip key={id} clauseId={id} />
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
