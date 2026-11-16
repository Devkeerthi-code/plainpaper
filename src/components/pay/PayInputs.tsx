"use client";

import { PROFESSIONAL_TAX, STATE_CODES, type StateCode } from "@/config/professional-tax";
import type { Regime } from "@/config/tax-rates";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { MoneyKey } from "./prefill";

export interface PayForm {
  money: Record<MoneyKey, string>;
  state: StateCode;
  pfMode: "full-basic" | "ceiling";
  rent: string;
  metro: boolean;
  other80C: string;
  s80D: string;
}

const MONEY_FIELDS: { key: MoneyKey; label: string }[] = [
  { key: "ctcAnnual", label: "CTC (₹ a year)" },
  { key: "fixedAnnual", label: "Fixed pay (₹ a year)" },
  { key: "variableAnnual", label: "Variable pay (₹ a year)" },
  { key: "basicAnnual", label: "Basic salary (₹ a year)" },
  { key: "hraAnnual", label: "HRA (₹ a year)" },
  { key: "employerPfAnnual", label: "Employer PF (₹ a year)" },
];

export const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const grouped = (s: string) => {
  const n = digits(s);
  return n ? n.toLocaleString("en-IN") : "";
};

interface Props {
  form: PayForm;
  regime: Regime;
  errors: Partial<Record<MoneyKey, string>>;
  sources: Partial<Record<MoneyKey, string>>;
  stateFrom?: string;
  onChange: (form: PayForm) => void;
}

function MoneyInput({ id, label, value, help, error, onChange }: { id: string; label: string; value: string; help?: string; error?: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-money">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          aria-invalid={!!error}
          aria-describedby={`${id}-help`}
          onChange={(e) => onChange(e.target.value.replace(/[^\d,]/g, ""))}
          onBlur={() => onChange(grouped(value))}
        />
      </div>
      <small id={`${id}-help`} className={error ? "err" : undefined}>
        {error ?? help}
      </small>
    </div>
  );
}

export function PayInputs({ form, regime, errors, sources, stateFrom, onChange }: Props) {
  const set = (patch: Partial<PayForm>) => onChange({ ...form, ...patch });
  const setMoney = (key: MoneyKey, v: string) => set({ money: { ...form.money, [key]: v } });
  const [ctcField, ...detailFields] = MONEY_FIELDS;

  return (
    <div className="pay-inputs">
      {ctcField && (
        <MoneyInput
          id="pay-ctcAnnual"
          label={ctcField.label}
          value={form.money.ctcAnnual}
          error={errors.ctcAnnual}
          help={sources.ctcAnnual ? `Filled in from ${sources.ctcAnnual}. Change it to try other offers.` : "The yearly CTC from the offer letter."}
          onChange={(v) => setMoney("ctcAnnual", v)}
        />
      )}
      <div className="field">
        <label htmlFor="pay-state">State you’ll work in</label>
        <select id="pay-state" value={form.state} onChange={(e) => set({ state: e.target.value as StateCode })} aria-describedby="pay-state-help">
          {STATE_CODES.map((c) => (
            <option key={c} value={c}>
              {PROFESSIONAL_TAX[c].name}
              {PROFESSIONAL_TAX[c].annual ? ` — ₹${PROFESSIONAL_TAX[c].annual.toLocaleString("en-IN")} a year` : c === "OTHER" ? "" : " — no professional tax"}
            </option>
          ))}
        </select>
        <small id="pay-state-help">{stateFrom ? `Guessed from “${stateFrom}” in the letter.` : "Sets professional tax."}</small>
      </div>
      <details className="pay-more">
        <summary>Salary break-up and PF</summary>
        <div>
          <div className="two-col">
            {detailFields.map((f) => (
              <MoneyInput
                key={f.key}
                id={`pay-${f.key}`}
                label={f.label}
                value={form.money[f.key]}
                error={errors[f.key]}
                help={sources[f.key] ? `From ${sources[f.key]}` : "Not in the letter: leave empty to assume"}
                onChange={(v) => setMoney(f.key, v)}
              />
            ))}
          </div>
          <div className="field">
            <span className="label" aria-hidden="true">
              How PF is worked out
            </span>
            <SegmentedControl
              label="How PF is worked out"
              value={form.pfMode}
              onChange={(pfMode) => set({ pfMode })}
              options={[
                { value: "full-basic", label: "12% of full basic" },
                { value: "ceiling", label: "Capped at ₹15,000 basic" },
              ]}
            />
          </div>
        </div>
      </details>
      <details className="pay-more" open={regime === "old" || undefined}>
        <summary>Old regime deductions</summary>
        <div>
          <p className="small faint">These only change the old regime figure.</p>
          <MoneyInput id="pay-rent" label="Rent you pay (₹ a month)" value={form.rent} help="Counts as HRA exemption." onChange={(rent) => set({ rent })} />
          <label className="check">
            <input type="checkbox" checked={form.metro} onChange={(e) => set({ metro: e.target.checked })} />
            <span>I live in Delhi, Mumbai, Chennai or Kolkata</span>
          </label>
          <div className="two-col">
            <MoneyInput id="pay-80c" label="Other 80C savings (₹ a year)" value={form.other80C} help="PPF, ELSS, life insurance" onChange={(other80C) => set({ other80C })} />
            <MoneyInput id="pay-80d" label="Health insurance, 80D (₹ a year)" value={form.s80D} help="Premium you pay" onChange={(s80D) => set({ s80D })} />
          </div>
        </div>
      </details>
    </div>
  );
}
