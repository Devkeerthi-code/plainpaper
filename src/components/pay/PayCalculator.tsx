"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateInHand, type InHandInput } from "@/lib/calculator/inhand";
import type { Regime } from "@/config/tax-rates";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSpringValues } from "@/hooks/useSpringValues";
import { trackUsage } from "@/lib/client/usage";
import { formatINR } from "@/lib/format";
import { MONEY_KEYS, type MoneyKey, type PayPrefill } from "./prefill";
import { digits, PayInputs, type PayForm } from "./PayInputs";
import { PayRibbon } from "./PayRibbon";
import { PayWorking, RatesLabel } from "./PayWorking";

const MIN_CTC = 100_000;
const MAX_CTC = 100_000_000;

function initialForm(prefill?: PayPrefill): PayForm {
  const money = Object.fromEntries(MONEY_KEYS.map((k) => [k, prefill?.values[k]?.toLocaleString("en-IN") ?? ""])) as Record<MoneyKey, string>;
  return { money, state: prefill?.state ?? "OTHER", pfMode: "full-basic", rent: "", metro: false, other80C: "", s80D: "" };
}

function validate(form: PayForm): { input: Omit<InHandInput, "regime"> | null; errors: Partial<Record<MoneyKey, string>> } {
  const errors: Partial<Record<MoneyKey, string>> = {};
  const n = (k: MoneyKey) => (form.money[k].trim() ? digits(form.money[k]) : null);
  const ctc = n("ctcAnnual");
  if (ctc === null) return { input: null, errors };
  if (ctc < MIN_CTC || ctc > MAX_CTC) errors.ctcAnnual = "Enter a yearly CTC between ₹1,00,000 and ₹10,00,00,000.";
  for (const k of MONEY_KEYS) {
    const v = n(k);
    if (k !== "ctcAnnual" && v !== null && v > ctc) errors[k] = "Can't be more than the CTC.";
  }
  if (Object.keys(errors).length) return { input: null, errors };
  return {
    errors,
    input: {
      ctcAnnual: ctc,
      fixedAnnual: n("fixedAnnual"),
      variableAnnual: n("variableAnnual"),
      basicAnnual: n("basicAnnual"),
      hraAnnual: n("hraAnnual"),
      employerPfAnnual: n("employerPfAnnual"),
      pfMode: form.pfMode,
      state: form.state,
      rentPaidMonthly: digits(form.rent),
      metroCity: form.metro,
      other80C: digits(form.other80C),
      section80D: digits(form.s80D),
    },
  };
}

/** CTC flows down through each deduction into the monthly figure. Works with or without a letter. */
export function PayCalculator({ prefill, standalone = false }: { prefill?: PayPrefill; standalone?: boolean }) {
  const [form, setForm] = useState(() => initialForm(prefill));
  const [regime, setRegime] = useState<Regime>("new");
  const { input, errors } = useMemo(() => validate(form), [form]);
  const results = useMemo(
    () => (input ? { new: calculateInHand({ ...input, regime: "new" }), old: calculateInHand({ ...input, regime: "old" }) } : null),
    [input],
  );
  const result = results?.[regime] ?? null;
  const shown = useSpringValues({ monthly: result?.monthlyInHand ?? 0 });

  useEffect(() => {
    if (results) trackUsage("calculator_used", standalone ? undefined : "OFFER_LETTER");
  }, [results, standalone]);

  const other: Regime = regime === "new" ? "old" : "new";
  const diff = results ? results[regime].monthlyInHand - results[other].monthlyInHand : 0;
  const ctcMonthly = input ? input.ctcAnnual / 12 : 0;
  const Heading = standalone ? "h1" : "h2";

  return (
    <div className="pay">
      <div className="pay-side">
        <p className="eyebrow">In-hand pay{standalone ? "" : " · from this offer"}</p>
        <Heading className="h2 serif">What actually reaches your bank account</Heading>
        {result ? (
          <div aria-live="polite">
            <p className="inhand">
              <span className="inhand-num">
                <span className="cur">₹</span>
                {Math.round(Math.max(0, shown.monthly ?? 0)).toLocaleString("en-IN")}
              </span>
              <span className="inhand-per">a month</span>
              <span className="sr-only">
                {formatINR(result.monthlyInHand)} a month under the {regime} regime
              </span>
            </p>
            <p className="inhand-note">
              That’s {Math.round((result.monthlyInHand / ctcMonthly) * 100)}% of the {formatINR(ctcMonthly)} a month your CTC suggests.
            </p>
          </div>
        ) : (
          <div className="inhand-empty">
            <strong>Enter a CTC to begin</strong>
            Type the yearly CTC from an offer letter. You’ll see each deduction, and both tax regimes side by side.
          </div>
        )}
        <div className="pay-regime">
          <SegmentedControl
            label="Tax regime"
            size="lg"
            value={regime}
            onChange={setRegime}
            options={[
              { value: "new", label: "New regime" },
              { value: "old", label: "Old regime" },
            ]}
          />
          {results && (
            <div className="regimes" aria-label="Both regimes, per month">
              {(["new", "old"] as const).map((r) => {
                const better = results[r].monthlyInHand > results[r === "new" ? "old" : "new"].monthlyInHand;
                return (
                  <div key={r} className={`regime-card${better ? " is-better" : ""}`}>
                    <span>{r === "new" ? "New regime" : "Old regime"}</span>
                    <strong>{formatINR(results[r].monthlyInHand)}</strong>
                    {better && <em>{formatINR(Math.abs(diff))} more a month</em>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <PayInputs form={form} regime={regime} errors={errors} sources={prefill?.sources ?? {}} stateFrom={prefill?.stateFrom} onChange={setForm} />
        <RatesLabel />
      </div>
      <div className="pay-main">
        {result ? (
          <>
            <PayRibbon result={result} />
            <PayWorking result={result} />
          </>
        ) : (
          <div className="empty" style={{ marginTop: 0 }}>
            <div className="empty-art" aria-hidden="true">
              <div className="ea-sheet ea-a">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="ea-sheet ea-b">
                <span>₹</span>
              </div>
            </div>
            <p className="muted">The flow from CTC to your bank account appears here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
