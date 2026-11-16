"use client";

import type { CSSProperties } from "react";
import type { InHandResult, Step } from "@/lib/calculator/inhand";
import { useSpringValues } from "@/hooks/useSpringValues";

const inr = (n: number) => Math.round(Math.max(0, n)).toLocaleString("en-IN");

interface Segment {
  stage: Step;
  deductions: Step[];
}

/** Positive steps are levels of the flow (CTC, gross, in-hand); negatives peel off between them. */
function segments(steps: Step[]): Segment[] {
  const out: Segment[] = [];
  for (const step of steps) {
    if (step.amount >= 0 && !step.label.startsWith("Income tax")) out.push({ stage: step, deductions: [] });
    else out[out.length - 1]?.deductions.push(step);
  }
  return out;
}

const STAGE_COPY: Record<string, { label: string; note?: string }> = {
  CTC: { label: "Cost to company (CTC)", note: "What the letter promises, per year" },
  "Gross salary": { label: "Paid to you through the year", note: "Before your own deductions" },
};

export function PayRibbon({ result }: { result: InHandResult }) {
  const segs = segments(result.steps);
  const target: Record<string, number> = { monthly: result.monthlyInHand };
  result.steps.forEach((s, i) => (target[`s${i}`] = Math.abs(s.amount)));
  const shown = useSpringValues(target);
  const ctc = Math.max(1, shown.s0 ?? 1);
  const width = (i: number) => Math.min(1, Math.max(0, (shown[`s${i}`] ?? 0) / ctc));
  const indexOf = (step: Step) => result.steps.indexOf(step);

  return (
    <div className="flow" aria-label="How your CTC becomes monthly in-hand pay">
      {segs.map((seg, si) => {
        const i = indexOf(seg.stage);
        const last = si === segs.length - 1;
        const next = segs[si + 1];
        const copy = STAGE_COPY[seg.stage.label];
        return (
          <div key={seg.stage.label}>
            <div className={`stage${last ? " stage-final" : ""}`}>
              <div className="stage-head">
                <span className="stage-label">
                  {last ? "Lands in your account" : (copy?.label ?? seg.stage.label)}
                  <small>{last ? `₹${inr(shown[`s${i}`] ?? 0)} a year, after everything below the line` : copy?.note}</small>
                </span>
                <span className="stage-amt">
                  ₹{inr(last ? shown.monthly ?? 0 : (shown[`s${i}`] ?? 0))}
                  <small>{last ? "a month" : "a year"}</small>
                </span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ transform: `scaleX(${width(i)})` }} />
              </div>
            </div>
            {next && seg.deductions.length > 0 && (
              <div className="peel">
                <div
                  className="ribbon"
                  aria-hidden="true"
                  style={{ clipPath: `polygon(0 0, ${width(i) * 100}% 0, ${width(indexOf(next.stage)) * 100}% 100%, 0 100%)` } as CSSProperties}
                />
                <ul className="peel-list">
                  {seg.deductions.map((d, di) => {
                    const amt = shown[`s${indexOf(d)}`] ?? 0;
                    return (
                      <li key={d.label} className={Math.abs(d.amount) < 1 ? "is-zero" : undefined} style={{ ["--i" as string]: di }}>
                        <span className="peel-name">{d.label}</span>
                        <span className="peel-why">{d.working}</span>
                        <span className="peel-amt">
                          {Math.abs(d.amount) < 1 ? "None" : `− ₹${inr(amt)} /yr`}
                          {Math.abs(d.amount) >= 1 && <small>₹{inr(amt / 12)} a month</small>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
