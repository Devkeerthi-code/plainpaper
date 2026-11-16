import type { InHandResult } from "@/lib/calculator/inhand";
import { TAX_RULES } from "@/config/tax-rates";
import { formatINR } from "@/lib/format";
import { formatDay } from "@/lib/client/present";

export function RatesLabel() {
  return (
    <p className="rates-label">
      <span className="dot" aria-hidden="true" />
      <span>
        Tax rates as of {formatDay(TAX_RULES.asOf)} (FY {TAX_RULES.financialYear}) — check{" "}
        <a href={TAX_RULES.source} target="_blank" rel="noopener noreferrer" className="link">
          incometax.gov.in
        </a>
      </span>
    </p>
  );
}

/** The slab-by-slab tax and every assumption, so no figure is a black box. */
export function PayWorking({ result }: { result: InHandResult }) {
  const regime = TAX_RULES.regimes[result.regime].label;
  return (
    <details className="working">
      <summary>Show the working</summary>
      <h3>Income tax by slab · {regime}</h3>
      <table className="slab-table">
        <caption className="sr-only">Income tax slab by slab for taxable income {formatINR(result.taxableIncome)}</caption>
        <thead>
          <tr>
            <th scope="col">Income range</th>
            <th scope="col" className="n">
              Rate
            </th>
            <th scope="col" className="n">
              Tax
            </th>
          </tr>
        </thead>
        <tbody>
          {result.slabs.map((s) => (
            <tr key={s.from}>
              <td>
                {formatINR(s.from)} – {s.to === null ? "and above" : formatINR(Math.min(s.to, result.taxableIncome))}
              </td>
              <td className="n">{Math.round(s.rate * 100)}%</td>
              <td className="n">{formatINR(s.tax)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {result.rebate > 0 && (
            <tr>
              <th scope="row" colSpan={2}>
                Rebate (taxable income {formatINR(result.taxableIncome)} is within the limit)
              </th>
              <td className="n">− {formatINR(result.rebate)}</td>
            </tr>
          )}
          {result.surcharge > 0 && (
            <tr>
              <th scope="row" colSpan={2}>
                Surcharge
              </th>
              <td className="n">{formatINR(result.surcharge)}</td>
            </tr>
          )}
          <tr>
            <th scope="row" colSpan={2}>
              Health and education cess (4%)
            </th>
            <td className="n">{formatINR(result.cess)}</td>
          </tr>
          <tr>
            <th scope="row" colSpan={2}>
              Income tax for the year
            </th>
            <td className="n">{formatINR(result.totalTax)}</td>
          </tr>
        </tfoot>
      </table>
      {result.assumptions.length > 0 && (
        <>
          <h3>What we assumed</h3>
          <ul className="assumptions">
            {result.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small" style={{ marginTop: 16 }}>
        Rounded to the nearest rupee. Your payslip can differ if the employer splits pay differently, or if you have other income.
      </p>
    </details>
  );
}
