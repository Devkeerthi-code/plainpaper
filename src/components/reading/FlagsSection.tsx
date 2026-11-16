"use client";

import type { Flag, Language } from "@/lib/documents/types";
import { useToast } from "@/components/toast/ToastProvider";
import { SEVERITY_LABEL } from "./MarginNote";
import { SourceChip } from "./SourceChip";
import { useReading } from "./ReadingContext";

export function FlagsSection({ flags, lang }: { flags: Flag[]; lang: Language }) {
  const { openFlags, toggleFlag, showInOriginal, isMobile } = useReading();
  const indic = lang !== "en";

  return (
    <section aria-labelledby="flags-title">
      <h2 id="flags-title">
        Watch out · {flags.length} {flags.length === 1 ? "thing" : "things"} to look at before you sign
      </h2>
      {flags.length === 0 ? (
        <p className="flags-empty">Nothing here stood out as unusual or costly for you. Still read the key facts, and ask about anything that isn’t clear.</p>
      ) : (
        <ul className="flags">
          {flags.map((f, i) => {
            const open = openFlags.has(i);
            return (
              <li key={f.ruleId + i} className={`flag sev-${f.severity}${open ? " is-open" : ""}`} data-refs={f.clauseId ?? undefined}>
                <button
                  type="button"
                  className="flag-btn"
                  aria-expanded={open}
                  aria-controls={`flag-body-${i}`}
                  onClick={() => {
                    toggleFlag(i);
                    if (!open && !isMobile && f.clauseId) showInOriginal(f.clauseId, f.quote);
                  }}
                >
                  <span className="flag-sev">{SEVERITY_LABEL[f.severity]}</span>
                  <span className={`flag-title${indic ? " indic" : ""}`} lang={lang}>
                    {f.title}
                  </span>
                  <svg className="flag-chev" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <div className="disclose" id={`flag-body-${i}`}>
                  <div>
                    {f.quote && (
                      <>
                        <h4>What it says</h4>
                        <blockquote lang="en">{f.quote}</blockquote>
                      </>
                    )}
                    <h4>Why it matters</h4>
                    <p lang={lang} className={indic ? "indic" : undefined}>
                      {f.why}
                    </p>
                    <h4>What to ask</h4>
                    <ul lang={lang} className={indic ? "indic" : undefined}>
                      {f.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                    {f.clauseId && <SourceChip clauseId={f.clauseId} page={f.page ?? undefined} quote={f.quote} />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AsksSection({ flags, lang }: { flags: Flag[]; lang: Language }) {
  const toast = useToast();
  const questions = [...new Set(flags.flatMap((f) => f.questions))];
  if (questions.length === 0) return null;
  const indic = lang !== "en";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(questions.map((q, i) => `${i + 1}. ${q}`).join("\n"));
      toast(`Copied ${questions.length} questions. Paste them into a message or email before you sign.`);
    } catch {
      toast("Copying isn't allowed here. Select the questions and copy them by hand.", { type: "error" });
    }
  };

  return (
    <section aria-labelledby="asks-title">
      <h2 id="asks-title">Questions to ask before you sign</h2>
      <ol className={`asks${indic ? " indic" : ""}`} lang={lang}>
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <div className="asks-actions">
        <button type="button" className="btn btn-small btn-quiet" onClick={copy}>
          Copy the questions
        </button>
      </div>
    </section>
  );
}
