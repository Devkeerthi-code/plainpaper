"use client";

import type { Clause } from "@/lib/documents/types";
import { quoteRange } from "@/lib/extraction/locate";
import { useReading, type Lit } from "./ReadingContext";

const looksLikeHeading = (c: Clause) => !c.label && c.text.length <= 70 && !/[.,:;]$/.test(c.text);

/** The exact quote gets the pen pass; if the quote isn't word-for-word, the whole clause does. */
function Highlighted({ text, lit }: { text: string; lit: Lit }) {
  const range = lit.quote ? quoteRange(text, lit.quote) : null;
  if (!range) {
    return (
      <span key={lit.nonce} className="hl">
        {text}
      </span>
    );
  }
  return (
    <>
      {text.slice(0, range.start)}
      <span key={lit.nonce} className="hl">
        {text.slice(range.start, range.end)}
      </span>
      {text.slice(range.end)}
    </>
  );
}

export function ClauseBlock({ clause, position, hasPlain }: { clause: Clause; position: number; hasPlain: boolean }) {
  const { lit, showInPlain } = useReading();
  const isLit = lit?.clauseId === clause.id;
  const name = clause.label ? `clause ${clause.label}` : `paragraph ${position}`;

  return (
    <div
      id={`clause-${clause.id}`}
      className={`clause${looksLikeHeading(clause) ? " clause-head" : ""}${isLit ? " is-lit" : ""}${hasPlain ? " has-plain" : ""}`}
      tabIndex={-1}
      onClick={() => {
        if (String(window.getSelection() ?? "")) return;
        showInPlain(clause.id);
      }}
    >
      <button
        type="button"
        className="clause-mark"
        aria-label={`Show the plain version of ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          showInPlain(clause.id);
        }}
      >
        {clause.label ?? "¶"}
      </button>
      <p className="clause-text">{isLit && lit ? <Highlighted text={clause.text} lit={lit} /> : clause.text}</p>
    </div>
  );
}
