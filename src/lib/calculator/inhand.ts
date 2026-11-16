import { PROFESSIONAL_TAX, type StateCode } from "@/config/professional-tax";
import { TAX_RULES, type Regime, type RegimeRules } from "@/config/tax-rates";
import { formatINR } from "@/lib/format";

export interface InHandInput {
  ctcAnnual: number;
  fixedAnnual?: number | null;
  variableAnnual?: number | null;
  basicAnnual?: number | null;
  hraAnnual?: number | null;
  employerPfAnnual?: number | null;
  /** Employer PF is usually included inside CTC in Indian offers. */
  employerPfInCtc?: boolean;
  /** "ceiling" = 12% of basic capped at ₹15,000/month, a common choice for employers. */
  pfMode?: "full-basic" | "ceiling";
  gratuityInCtc?: boolean;
  state?: StateCode;
  regime: Regime;
  /** Old regime only. */
  rentPaidMonthly?: number;
  metroCity?: boolean;
  other80C?: number;
  section80D?: number;
}

export interface Step {
  label: string;
  /** Negative for deductions. */
  amount: number;
  working: string;
}

export interface SlabLine {
  from: number;
  to: number | null;
  rate: number;
  taxable: number;
  tax: number;
}

export interface InHandResult {
  regime: Regime;
  steps: Step[];
  grossAnnual: number;
  taxableIncome: number;
  slabs: SlabLine[];
  slabTax: number;
  rebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  employeePf: number;
  professionalTax: number;
  annualInHand: number;
  monthlyInHand: number;
  assumptions: string[];
  ratesAsOf: string;
}

const round = (n: number) => Math.round(n);

export function slabTax(taxable: number, rules: RegimeRules): { lines: SlabLine[]; total: number } {
  const lines: SlabLine[] = [];
  let from = 0;
  for (const slab of rules.slabs) {
    const to = slab.upTo;
    const portion = Math.max(0, Math.min(taxable, to ?? Infinity) - from);
    if (portion > 0) lines.push({ from, to, rate: slab.rate, taxable: portion, tax: portion * slab.rate });
    if (to === null || taxable <= to) break;
    from = to;
  }
  return { lines, total: lines.reduce((s, l) => s + l.tax, 0) };
}

/** Rebate (sec 87A / 156) plus new-regime marginal relief just above the ceiling. */
export function applyRebate(taxable: number, tax: number, rules: RegimeRules): number {
  const { maxTaxableIncome, maxRebate, marginalRelief } = rules.rebate;
  if (taxable <= maxTaxableIncome) return Math.min(tax, maxRebate);
  if (marginalRelief) {
    const excess = taxable - maxTaxableIncome;
    if (tax > excess) return tax - excess;
  }
  return 0;
}

export function surchargeRate(taxable: number, regime: Regime): number {
  const band = TAX_RULES.surcharge.find((s) => taxable > s.above);
  return band ? Math.min(band.rate, TAX_RULES.regimes[regime].maxSurchargeRate) : 0;
}

function pfOn(basicAnnual: number, mode: "full-basic" | "ceiling"): number {
  const wage = mode === "ceiling" ? Math.min(basicAnnual, TAX_RULES.pf.wageCeilingMonthly * 12) : basicAnnual;
  return wage * TAX_RULES.pf.rate;
}

function hraExemption(input: InHandInput, basic: number): number {
  const hra = input.hraAnnual ?? 0;
  const rent = (input.rentPaidMonthly ?? 0) * 12;
  if (!hra || !rent) return 0;
  return Math.max(0, Math.min(hra, rent - 0.1 * basic, (input.metroCity ? 0.5 : 0.4) * basic));
}

export function calculateInHand(input: InHandInput): InHandResult {
  const rules = TAX_RULES.regimes[input.regime];
  const assumptions: string[] = [];
  const steps: Step[] = [];
  const pfMode = input.pfMode ?? "full-basic";

  const variable = input.variableAnnual ?? 0;
  const fixed = input.fixedAnnual ?? input.ctcAnnual - variable;
  if (input.fixedAnnual == null) assumptions.push("Fixed pay is taken as CTC minus variable pay, because the letter doesn't state it.");

  const basic = input.basicAnnual ?? fixed * TAX_RULES.assumedBasicShare;
  if (input.basicAnnual == null) assumptions.push("Basic salary assumed to be 50% of fixed pay (the letter doesn't state it).");

  steps.push({ label: "CTC", amount: input.ctcAnnual, working: "Total cost to company per year, from the letter" });
  if (variable > 0) {
    steps.push({ label: "Variable pay", amount: -variable, working: "Paid later and not guaranteed, so it is left out of monthly pay" });
  }
  const otherNonMonthly = input.ctcAnnual - variable - fixed;
  if (otherNonMonthly > 0) {
    steps.push({ label: "Bonuses, stocks and benefits", amount: -otherNonMonthly, working: "Part of CTC that isn't monthly cash" });
  }

  const employerPf = input.employerPfAnnual ?? (input.employerPfInCtc === false ? 0 : pfOn(basic, pfMode));
  if (employerPf > 0) {
    steps.push({
      label: "Employer PF",
      amount: -employerPf,
      working: input.employerPfAnnual != null ? "As listed in the letter" : `12% of basic ${formatINR(basic)}${pfMode === "ceiling" ? " (capped at ₹15,000/month)" : ""}`,
    });
  }
  const gratuity = input.gratuityInCtc ? basic * TAX_RULES.gratuityRate : 0;
  if (gratuity > 0) steps.push({ label: "Gratuity", amount: -gratuity, working: "4.81% of basic, paid only after 5 years" });

  const gross = fixed - employerPf - gratuity;
  steps.push({ label: "Gross salary", amount: gross, working: "What your payslip shows before deductions" });

  const employeePf = input.employerPfAnnual ?? pfOn(basic, pfMode);
  steps.push({ label: "Your PF", amount: -employeePf, working: "12% of basic, saved in your PF account (you get it back later)" });

  const ptRule = PROFESSIONAL_TAX[input.state ?? "OTHER"];
  const professionalTax = gross / 12 >= ptRule.fromMonthlyGross ? ptRule.annual : 0;
  if (professionalTax > 0) steps.push({ label: "Professional tax", amount: -professionalTax, working: `${ptRule.name}, per year` });
  if (!input.state || input.state === "OTHER") assumptions.push("Professional tax not included. Pick your state to add it.");

  let taxable = gross - rules.standardDeduction;
  const deductionNotes = [`standard deduction ${formatINR(rules.standardDeduction)}`];
  if (input.regime === "old") {
    const hra = hraExemption(input, basic);
    const s80c = Math.min(TAX_RULES.oldRegimeDeductions.section80CMax, employeePf + (input.other80C ?? 0));
    const s80d = Math.min(TAX_RULES.oldRegimeDeductions.section80DMax, input.section80D ?? 0);
    taxable -= professionalTax + hra + s80c + s80d;
    deductionNotes.push(`professional tax ${formatINR(professionalTax)}`, `80C ${formatINR(s80c)}`);
    if (hra) deductionNotes.push(`HRA exemption ${formatINR(hra)}`);
    if (s80d) deductionNotes.push(`80D ${formatINR(s80d)}`);
  }
  taxable = Math.max(0, round(taxable));

  const { lines, total } = slabTax(taxable, rules);
  const rebate = applyRebate(taxable, total, rules);
  const afterRebate = total - rebate;
  const surcharge = afterRebate * surchargeRate(taxable, input.regime);
  const cess = (afterRebate + surcharge) * TAX_RULES.cessRate;
  const totalTax = round(afterRebate + surcharge + cess);

  steps.push({
    label: "Income tax",
    amount: -totalTax,
    working:
      totalTax === 0
        ? `Taxable income ${formatINR(taxable)} after ${deductionNotes.join(", ")}: no tax after rebate`
        : `Taxable income ${formatINR(taxable)} after ${deductionNotes.join(", ")}; slab tax ${formatINR(total)}${rebate ? ` − rebate ${formatINR(rebate)}` : ""}${surcharge ? ` + surcharge ${formatINR(surcharge)}` : ""} + 4% cess`,
  });

  const annualInHand = round(gross - employeePf - professionalTax - totalTax);
  steps.push({ label: "In-hand per year", amount: annualInHand, working: "Gross − your PF − professional tax − income tax" });

  return {
    regime: input.regime,
    steps: steps.map((s) => ({ ...s, amount: round(s.amount) })),
    grossAnnual: round(gross),
    taxableIncome: taxable,
    slabs: lines.map((l) => ({ ...l, tax: round(l.tax) })),
    slabTax: round(total),
    rebate: round(rebate),
    surcharge: round(surcharge),
    cess: round(cess),
    totalTax,
    employeePf: round(employeePf),
    professionalTax,
    annualInHand,
    monthlyInHand: round(annualInHand / 12),
    assumptions,
    ratesAsOf: TAX_RULES.asOf,
  };
}
