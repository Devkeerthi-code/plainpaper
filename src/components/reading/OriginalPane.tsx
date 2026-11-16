"use client";

import { useLayoutEffect, useRef } from "react";
import type { Flag, Language, Page } from "@/lib/documents/types";
import { ClauseBlock } from "./ClauseBlock";
import { MarginNote } from "./MarginNote";
import { useReading } from "./ReadingContext";

interface Props {
  pages: Page[];
  flags: Flag[];
  lang: Language;
  plainRefs: ReadonlySet<string>;
  sample: boolean;
}

const NOTE_GAP = 12;

/** Notes sit level with their clause; when two collide, the later one is pushed down. */
function layoutNotes(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".page").forEach((page) => {
    const notes = [...page.querySelectorAll<HTMLElement>(".note")];
    if (!notes[0]) return;
    const inMargin = getComputedStyle(notes[0]).position === "absolute";
    const pageTop = page.getBoundingClientRect().top;
    let floor = 0;
    for (const note of notes) {
      if (!inMargin) {
        note.style.top = "";
        continue;
      }
      const target = note.dataset.for ? document.getElementById(`clause-${note.dataset.for}`) : null;
      const top = Math.max(target ? target.getBoundingClientRect().top - pageTop : 0, floor);
      note.style.top = `${top}px`;
      floor = top + note.offsetHeight + NOTE_GAP;
    }
  });
}

export function OriginalPane({ pages, flags, lang, plainRefs, sample }: Props) {
  const { sheet, docScrollRef } = useReading();
  const inner = useRef<HTMLDivElement>(null);
  const total = pages.length;

  useLayoutEffect(() => {
    const root = inner.current;
    if (!root) return;
    const run = () => layoutNotes(root);
    run();
    const ro = new ResizeObserver(run);
    ro.observe(root);
    root.querySelectorAll(".note").forEach((n) => ro.observe(n));
    void document.fonts?.ready.then(run);
    return () => ro.disconnect();
  }, [pages, flags, lang]);

  let noteOrder = 0;
  return (
    <div className="doc-pane" ref={sheet.paneRef} aria-label="Original document">
      <button type="button" className="sheet-handle" ref={sheet.handleRef} aria-expanded="false" aria-controls="doc-scroll" {...sheet.handleProps}>
        <span className="grabber" aria-hidden="true" />
        <span>
          <strong>Original document</strong> · {total} page{total === 1 ? "" : "s"}
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
      <div className="doc-scroll" id="doc-scroll" ref={docScrollRef} data-sheet-body>
        <p className="doc-note">
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3h8l4 4v14H7z" />
              <path d="M10 12h6M10 16h4" />
            </svg>
            Text from your document
          </span>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3" />
            </svg>
            Original file deleted after reading
          </span>
        </p>
        <div className="doc-inner" ref={inner}>
          {pages.map((page) => (
            <article key={page.number} className="page" aria-label={`Page ${page.number} of ${total}`}>
              <span className="page-tag" aria-hidden="true">
                {sample ? "Fictional sample" : "Text from your document"}
              </span>
              {page.clauses.map((clause, i) => (
                <div key={clause.id}>
                  <ClauseBlock clause={clause} position={i + 1} hasPlain={plainRefs.has(clause.id)} />
                  {flags.map((f, fi) =>
                    f.clauseId === clause.id ? <MarginNote key={f.ruleId + fi} flag={f} index={fi} order={noteOrder++} lang={lang} /> : null,
                  )}
                </div>
              ))}
              <p className="page-foot">
                Page {page.number} of {total}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
