"use client";

import { useState } from "react";
import { DOC_TYPE_LABELS, DOC_TYPES, type DocType, type Page } from "@/lib/documents/types";

const HINTS: Record<DocType, string> = {
  OFFER_LETTER: "Salary, bond, notice period",
  RENT_AGREEMENT: "Rent, deposit, lock-in",
  INSURANCE_POLICY: "Cover, exclusions, waiting periods",
};

const ARTICLE: Record<DocType, string> = {
  OFFER_LETTER: "a job offer letter",
  RENT_AGREEMENT: "a rent agreement",
  INSURANCE_POLICY: "an insurance policy",
};

interface Props {
  fileLabel: string;
  pages: Page[];
  detected: DocType | null;
  usedOcr: boolean;
  error: string | null;
  onConfirm: (docType: DocType) => void;
  onBack: () => void;
}

export function ConfirmType({ fileLabel, pages, detected, usedOcr, error, onConfirm, onBack }: Props) {
  const [choice, setChoice] = useState<DocType | null>(detected);
  const pageCount = pages.length;
  const clauseCount = pages.reduce((n, p) => n + p.clauses.length, 0);

  return (
    <section className="view-confirm" aria-labelledby="confirm-title">
      <div className="confirm-card">
        <div className="confirm-thumbs" aria-hidden="true">
          {pages.slice(0, 2).map((p) => (
            <div key={p.number} className="thumb">
              <i />
              <i />
              <i />
              <i />
              <i />
              <b>{p.number}</b>
            </div>
          ))}
        </div>
        <form
          className="confirm-body"
          onSubmit={(e) => {
            e.preventDefault();
            if (choice) onConfirm(choice);
          }}
        >
          <p className="file-line">
            {fileLabel} · {pageCount} page{pageCount === 1 ? "" : "s"} · {clauseCount} parts found
            {usedOcr ? " · read from the image" : ""}
          </p>
          <h1 id="confirm-title" className="h2">
            {detected ? `This looks like ${ARTICLE[detected]}. Is that right?` : "What kind of document is this?"}
          </h1>
          <p className="muted">
            {detected
              ? "If it's something else, pick the right type. It decides what PlainPaper looks for."
              : "We couldn't tell from the wording. Pick the closest one and PlainPaper will look for the right things."}
          </p>
          <fieldset className="choice">
            <legend className="sr-only">Document type</legend>
            {DOC_TYPES.map((t) => (
              <label key={t} className="choice-item">
                <input type="radio" name="doctype" value={t} checked={choice === t} onChange={() => setChoice(t)} />
                <span>
                  <strong>{DOC_TYPE_LABELS[t]}</strong>
                  <small>{HINTS[t]}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="confirm-actions">
            <button type="submit" className="btn btn-primary" disabled={!choice}>
              {error ? "Try again" : "Yes, read it"}
            </button>
            <button type="button" className="btn btn-quiet" onClick={onBack}>
              Choose a different file
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
