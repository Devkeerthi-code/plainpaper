export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 3h13l6 6v20H7z" className="bm-sheet" />
      <path d="M20 3v6h6" className="bm-fold" />
      <rect x="10" y="15" width="12" height="5" rx="1" className="bm-hl" />
      <path d="M11 18h10M11 24h7" className="bm-line" />
    </svg>
  );
}

export const ADVICE_TEXT = "This is not legal or financial advice. For big decisions, talk to a lawyer, CA or insurance adviser.";

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

/** Fixed strip on every screen that shows a reading. */
export function AdviceStrip() {
  return (
    <p className="advice" role="note">
      <InfoIcon />
      <span>{ADVICE_TEXT}</span>
    </p>
  );
}

export function AdviceInline() {
  return (
    <p className="advice-inline" role="note">
      <InfoIcon />
      <span>{ADVICE_TEXT}</span>
    </p>
  );
}
