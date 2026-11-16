import type { CompareRow } from "@/lib/compare/diff";
import { summarizeDiff } from "@/lib/compare/diff";
import type { AnalysisContent, Located } from "@/lib/documents/types";
import { buildClauseMap, formatValue, isFictionalSample, shortName, sourceLabel, type ClauseMap } from "@/lib/client/present";
import { formatINR } from "@/lib/format";
import { betterNote, dependsNote, inHandRow } from "./notes";

interface Side {
  content: AnalysisContent;
  map: ClauseMap;
  name: string;
}

function Cell({ row, side, which, docType }: { row: CompareRow; side: Side; which: "a" | "b"; docType: AnalysisContent["docType"] }) {
  const value: Located | null = which === "a" ? row.a : row.b;
  const items = which === "a" ? row.aItems : row.bItems;
  const better = row.better === which;
  const note = better ? betterNote(row, docType) : null;
  return (
    <td className={better ? "better" : undefined}>
      {row.kind === "list" && items?.length ? (
        <span className="cval">
          <ul>
            {items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </span>
      ) : value && row.kind !== "list" ? (
        <span className="cval">{formatValue(row.kind, value.value)}</span>
      ) : (
        <span className="cval is-missing">Not mentioned</span>
      )}
      {better && (
        <span className="better-note">
          {note ?? "Better for you"}
          <span className="sr-only"> — better for you</span>
        </span>
      )}
      {value && <span className="cmp-src">{sourceLabel(side.map, value.clauseId, value.page)}</span>}
    </td>
  );
}

function Summary({ rows, a, b, inHand }: { rows: CompareRow[]; a: Side; b: Side; inHand: ReturnType<typeof inHandRow> }) {
  const { different, betterA, betterB } = summarizeDiff(rows);
  const parts: string[] = [];
  const headline =
    inHand?.better && inHand.a !== null && inHand.b !== null
      ? `${inHand.better === "a" ? a.name : b.name} leaves about ${formatINR(Math.abs(inHand.a - inHand.b))} more in your account each month.`
      : null;
  parts.push(`${different} of ${rows.length} rows differ.`);
  if (betterA || betterB) parts.push(`${a.name} is kinder to you on ${betterA}, ${b.name} on ${betterB}.`);
  parts.push("Rows marked “depends on what matters to you” come down to your own plans.");
  return (
    <p className="compare-summary" aria-live="polite">
      {headline && <strong>{headline} </strong>}
      {parts.join(" ")}
    </p>
  );
}

export function CompareTable({ a, b, rows }: { a: AnalysisContent; b: AnalysisContent; rows: CompareRow[] }) {
  const sa: Side = { content: a, map: buildClauseMap(a.pages), name: shortName(a) };
  const sb: Side = { content: b, map: buildClauseMap(b.pages), name: shortName(b) };
  const inHand = inHandRow(a, b);
  const groups = [...new Set(rows.map((r) => r.group))];
  let i = 0;

  return (
    <>
      <Summary rows={rows} a={sa} b={sb} inHand={inHand} />
      <div className="table-wrap">
        <table className="ctable">
          <caption className="sr-only">
            {sa.name} compared with {sb.name}, row by row
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">What’s compared</span>
              </th>
              {[sa, sb].map((s, n) => (
                <th key={n} scope="col">
                  <div className="offer-head">
                    <span className={`badge ${isFictionalSample(s.content.pages) ? "badge-demo" : "badge-type"}`}>
                      {isFictionalSample(s.content.pages) ? `Fictional sample · ${n ? "B" : "A"}` : n ? "B" : "A"}
                    </span>
                    <strong>{s.name}</strong>
                    <small>{s.content.title}</small>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g}>
              <tr className="group-row">
                <th colSpan={3} scope="colgroup">
                  {g}
                </th>
              </tr>
              {g === "Pay" && inHand && (
                <tr className="row" style={{ ["--i" as string]: i++ }}>
                  <th scope="row">Lands in your account each month (new regime)</th>
                  {(["a", "b"] as const).map((w) => (
                    <td key={w} className={inHand.better === w ? "better" : undefined}>
                      <span className={`cval${inHand[w] === null ? " is-missing" : ""}`}>{inHand[w] === null ? "CTC not mentioned" : formatINR(inHand[w])}</span>
                      {inHand.better === w && <span className="better-note">{inHand.note}</span>}
                      <span className="cmp-src">Worked out from the letter</span>
                    </td>
                  ))}
                </tr>
              )}
              {rows
                .filter((r) => r.group === g)
                .map((r) => {
                  const depends = dependsNote(r);
                  return (
                    <tr key={r.key} className="row" style={{ ["--i" as string]: i++ }}>
                      <th scope="row">
                        {r.label}
                        {r.status === "same" ? <span className="row-note">Same in both</span> : depends && <span className="row-note">{depends}</span>}
                      </th>
                      <Cell row={r} side={sa} which="a" docType={a.docType} />
                      <Cell row={r} side={sb} which="b" docType={a.docType} />
                    </tr>
                  );
                })}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}
