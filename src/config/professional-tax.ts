/**
 * Professional tax by state: the usual yearly amount for a salaried person above the threshold.
 * States charge in small monthly slabs; this uses the top slab most graduates fall into.
 * VERIFY with the state's commercial taxes department each year. Last checked: 2026-11-15.
 */
export interface ProfessionalTaxRule {
  name: string;
  /** Yearly amount once monthly gross pay reaches `fromMonthlyGross`. */
  annual: number;
  fromMonthlyGross: number;
}

export const PROFESSIONAL_TAX = {
  KA: { name: "Karnataka", annual: 2_500, fromMonthlyGross: 25_000 },
  MH: { name: "Maharashtra", annual: 2_500, fromMonthlyGross: 10_000 },
  TN: { name: "Tamil Nadu", annual: 2_500, fromMonthlyGross: 12_500 },
  TG: { name: "Telangana", annual: 2_400, fromMonthlyGross: 20_000 },
  AP: { name: "Andhra Pradesh", annual: 2_400, fromMonthlyGross: 20_000 },
  WB: { name: "West Bengal", annual: 2_400, fromMonthlyGross: 40_000 },
  KL: { name: "Kerala", annual: 2_500, fromMonthlyGross: 20_834 },
  GJ: { name: "Gujarat", annual: 2_400, fromMonthlyGross: 12_000 },
  MP: { name: "Madhya Pradesh", annual: 2_500, fromMonthlyGross: 33_334 },
  DL: { name: "Delhi", annual: 0, fromMonthlyGross: 0 },
  HR: { name: "Haryana", annual: 0, fromMonthlyGross: 0 },
  UP: { name: "Uttar Pradesh", annual: 0, fromMonthlyGross: 0 },
  OTHER: { name: "Other / not sure", annual: 0, fromMonthlyGross: 0 },
} as const satisfies Record<string, ProfessionalTaxRule>;

export type StateCode = keyof typeof PROFESSIONAL_TAX;
export const STATE_CODES = Object.keys(PROFESSIONAL_TAX) as StateCode[];
