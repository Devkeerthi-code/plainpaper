"use client";

import type { Flag, Language } from "@/lib/documents/types";
import { useReading } from "./ReadingContext";

export const SEVERITY_LABEL = { red: "Ask before you sign", amber: "Worth a careful look" } as const;

interface Props {
  flag: Flag;
  index: number;
  order: number;
  lang: Language;
}

/** A warning written in the page margin beside its clause (inline under it on narrow panes). */
export function MarginNote({ flag, index, order, lang }: Props) {
  const { openFlags, toggleFlag, light } = useReading();
  const open = openFlags.has(index);
  const indic = lang !== "en";
  const bodyId = `note-body-${index}`;

  return (
    <aside
      className={`note sev-${flag.severity}${open ? " is-open" : ""}`}
      data-for={flag.clauseId ?? undefined}
      style={{ ["--i" as string]: order }}
      aria-label={`Watch out: ${flag.title}`}
    >
      <button
        type="button"
        className="note-btn"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          toggleFlag(index);
          if (flag.clauseId) light(flag.clauseId, flag.quote);
        }}
      >
        <span className="note-sev">{SEVERITY_LABEL[flag.severity]}</span>
        <span className={`note-title${indic ? " indic" : ""}`} lang={lang}>
          {flag.title}
        </span>
        <span className="note-more">Why it matters · what to ask</span>
      </button>
      <div className="disclose" id={bodyId}>
        <div lang={lang} className={indic ? "indic" : undefined}>
          <h4 lang="en">Why it matters</h4>
          <p>{flag.why}</p>
          <h4 lang="en">What to ask</h4>
          <ul>
            {flag.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
