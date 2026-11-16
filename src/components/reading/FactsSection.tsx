"use client";

import type { Flag } from "@/lib/documents/types";
import { formatValue, type FieldGroup, type FieldRow } from "@/lib/client/present";
import { SourceChip } from "./SourceChip";

function FactValue({ row }: { row: FieldRow }) {
  if (row.kind === "list") {
    return (
      <ul>
        {row.items.map((item, i) => (
          <li key={i}>{item.value}</li>
        ))}
      </ul>
    );
  }
  return <>{row.value ? formatValue(row.kind, row.value.value) : null}</>;
}

interface Props {
  groups: FieldGroup[];
  flags: Flag[];
  onOpenPay?: () => void;
}

/** Every catalogued fact, grouped. Missing ones say so plainly; nothing is guessed. */
export function FactsSection({ groups, flags, onOpenPay }: Props) {
  const severityFor = (clauseId: string | undefined) => {
    const hits = flags.filter((f) => f.clauseId && f.clauseId === clauseId);
    if (hits.length === 0) return null;
    return hits.some((f) => f.severity === "red") ? "red" : "amber";
  };

  return (
    <section aria-labelledby="facts-title">
      <h2 id="facts-title">The key facts</h2>
      {groups.map((g) => (
        <div key={g.name}>
          <h3 className="group">{g.name}</h3>
          <ul className="facts">
            {g.rows.map((row) => {
              const sev = severityFor(row.value?.clauseId);
              const refs = [...new Set((row.kind === "list" ? row.items : row.value ? [row.value] : []).map((l) => l.clauseId))];
              return (
                <li key={row.key} className={`fact${row.value ? "" : " is-missing"}`} data-refs={refs.join(" ") || undefined}>
                  <span className="fact-label">{row.label}</span>
                  <span className="fact-value">
                    {sev && <span className={`flag-dot${sev === "red" ? " red" : ""}`} aria-label="Has a warning" role="img" />}
                    {row.value ? <FactValue row={row} /> : "Not mentioned in the document"}
                    {row.key === "ctcAnnual" && row.value && onOpenPay && (
                      <span className="fact-pay">
                        <br />
                        <button type="button" className="text-btn small" onClick={onOpenPay}>
                          See what reaches your account each month
                        </button>
                      </span>
                    )}
                  </span>
                  {row.value && <SourceChip clauseId={row.value.clauseId} page={row.value.page} quote={row.value.quote} />}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
