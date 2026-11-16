/**
 * Indian income-tax rules for salaried residents, FY 2026-27.
 *
 * VERIFY EVERY YEAR against https://www.incometax.gov.in after the Union Budget (1 Feb)
 * and update `asOf`, `financialYear` and `lastVerified`. The UI shows `asOf` next to every figure.
 *
 * Budget 2026 kept the FY 2025-26 slabs, the ₹12 lakh rebate ceiling and the standard deductions.
 * From 1 April 2026 the Income-tax Act, 2025 replaces the 1961 Act (section 87A is renumbered),
 * but the amounts below are unchanged.
 */
export interface Slab {
  /** Upper bound of the slab in rupees; null means no upper bound. */
  upTo: number | null;
  rate: number;
}

export interface RegimeRules {
  label: string;
  standardDeduction: number;
  slabs: readonly Slab[];
  rebate: { maxTaxableIncome: number; maxRebate: number; marginalRelief: boolean };
  maxSurchargeRate: number;
}

export const TAX_RULES = {
  financialYear: "2026-27",
  asOf: "2026-04-01",
  lastVerified: "2026-11-15",
  source: "https://www.incometax.gov.in",
  cessRate: 0.04,
  regimes: {
    new: {
      label: "New regime",
      standardDeduction: 75_000,
      slabs: [
        { upTo: 400_000, rate: 0 },
        { upTo: 800_000, rate: 0.05 },
        { upTo: 1_200_000, rate: 0.1 },
        { upTo: 1_600_000, rate: 0.15 },
        { upTo: 2_000_000, rate: 0.2 },
        { upTo: 2_400_000, rate: 0.25 },
        { upTo: null, rate: 0.3 },
      ],
      rebate: { maxTaxableIncome: 1_200_000, maxRebate: 60_000, marginalRelief: true },
      maxSurchargeRate: 0.25,
    },
    old: {
      label: "Old regime",
      standardDeduction: 50_000,
      slabs: [
        { upTo: 250_000, rate: 0 },
        { upTo: 500_000, rate: 0.05 },
        { upTo: 1_000_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
      rebate: { maxTaxableIncome: 500_000, maxRebate: 12_500, marginalRelief: false },
      maxSurchargeRate: 0.37,
    },
  } satisfies Record<"new" | "old", RegimeRules>,
  surcharge: [
    { above: 50_000_000, rate: 0.37 },
    { above: 20_000_000, rate: 0.25 },
    { above: 10_000_000, rate: 0.15 },
    { above: 5_000_000, rate: 0.1 },
  ],
  oldRegimeDeductions: { section80CMax: 150_000, section80DMax: 25_000 },
  pf: { rate: 0.12, wageCeilingMonthly: 15_000 },
  gratuityRate: 0.0481,
  /** Share of fixed pay assumed to be basic when the letter doesn't say (Code on Wages: wages ≥ 50%). */
  assumedBasicShare: 0.5,
} as const;

export type Regime = keyof typeof TAX_RULES.regimes;
