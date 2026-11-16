"use client";

import { useEffect, useState } from "react";

/**
 * Skeleton of the reading view with honest, time-based steps. The last step stays
 * active until the server answers, so it never claims to be done early.
 */
interface Props {
  title: string;
  steps: { label: string; at: number }[];
  note: string;
  onCancel: () => void;
}

const WIDTHS = ["38%", "24%", "gap", "100%", "100%", "82%", "gap", "100%", "91%", "100%", "64%", "gap", "100%", "100%", "76%"];

export function ReadingProgress({ title, steps, note, onCancel }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - started), 250);
    return () => window.clearInterval(id);
  }, []);

  const active = steps.reduce((idx, s, i) => (elapsed >= s.at ? i : idx), 0);

  return (
    <section className="read-skel" aria-labelledby="progress-title" aria-busy="true">
      <div className="skel-doc" aria-hidden="true">
        <div className="skel-page">
          <span className="scanline" />
          {WIDTHS.map((w, i) => (w === "gap" ? <i key={i} className="gap" /> : <i key={i} style={{ width: w }} />))}
        </div>
      </div>
      <div className="skel-plain">
        <h1 id="progress-title" className="h2">
          {title}
        </h1>
        <ol className="steps" aria-live="polite">
          {steps.map((s, i) => (
            <li key={s.label} className={i < active ? "is-done" : i === active ? "is-active" : ""}>
              {s.label}
              {i < active && <span className="sr-only"> (done)</span>}
            </li>
          ))}
        </ol>
        <div className="skel-lines" aria-hidden="true">
          <i className="shimmer" style={{ width: "30%" }} />
          <i className="shimmer" />
          <i className="shimmer" />
          <i className="shimmer" style={{ width: "70%" }} />
          <div className="skel-fields">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} className="shimmer" />
            ))}
          </div>
        </div>
        <p className="muted small">{note}</p>
        <div className="skel-actions">
          <button type="button" className="btn btn-quiet btn-small" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
