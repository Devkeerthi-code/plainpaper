import { describe, expect, it } from "vitest";
import { TAX_RULES } from "@/config/tax-rates";
import { applyRebate, calculateInHand, slabTax, surchargeRate } from "@/lib/calculator/inhand";

const NEW = TAX_RULES.regimes.new;
const OLD = TAX_RULES.regimes.old;

describe("slab tax", () => {
  it("new regime slabs", () => {
    expect(slabTax(400000, NEW).total).toBe(0);
    expect(slabTax(800000, NEW).total).toBe(20000);
    expect(slabTax(1200000, NEW).total).toBe(60000);
    expect(slabTax(1600000, NEW).total).toBe(120000);
    expect(slabTax(2400000, NEW).total).toBe(300000);
    expect(slabTax(3000000, NEW).total).toBe(480000);
  });

  it("old regime slabs", () => {
    expect(slabTax(250000, OLD).total).toBe(0);
    expect(slabTax(500000, OLD).total).toBe(12500);
    expect(slabTax(1000000, OLD).total).toBe(112500);
    expect(slabTax(1500000, OLD).total).toBe(262500);
  });

  it("shows one line per slab used", () => {
    const { lines } = slabTax(900000, NEW);
    expect(lines.map((l) => [l.from, l.rate, l.taxable])).toEqual([
      [0, 0, 400000],
      [400000, 0.05, 400000],
      [800000, 0.1, 100000],
    ]);
  });
});

describe("rebate at slab boundaries", () => {
  it("new regime: zero tax up to exactly ₹12 lakh taxable", () => {
    expect(applyRebate(1200000, 60000, NEW)).toBe(60000);
  });

  it("new regime: marginal relief just above ₹12 lakh", () => {
    // ₹12,10,000 taxable: slab tax 61,500, but tax can't exceed the 10,000 earned above 12L.
    const tax = slabTax(1210000, NEW).total;
    expect(tax).toBe(61500);
    expect(tax - applyRebate(1210000, tax, NEW)).toBe(10000);
  });

  it("new regime: marginal relief ends once normal tax is lower than the excess", () => {
    const taxable = 1280000;
    const tax = slabTax(taxable, NEW).total; // 72,000 vs excess 80,000
    expect(applyRebate(taxable, tax, NEW)).toBe(0);
  });

  it("old regime: rebate up to ₹5 lakh, no marginal relief", () => {
    expect(applyRebate(500000, 12500, OLD)).toBe(12500);
    expect(applyRebate(500001, 12500.05, OLD)).toBe(0);
  });
});

describe("surcharge", () => {
  it("applies bands and caps the new regime at 25%", () => {
    expect(surchargeRate(5000000, "new")).toBe(0);
    expect(surchargeRate(5000001, "new")).toBe(0.1);
    expect(surchargeRate(30000000, "new")).toBe(0.25);
    expect(surchargeRate(60000000, "new")).toBe(0.25);
    expect(surchargeRate(60000000, "old")).toBe(0.37);
  });
});

describe("in-hand calculator", () => {
  it("₹8L CTC offer with full breakup, new regime: no income tax", () => {
    const r = calculateInHand({
      ctcAnnual: 800000, fixedAnnual: 720000, variableAnnual: 80000, basicAnnual: 360000, employerPfAnnual: 21600, state: "KA", regime: "new",
    });
    expect(r.grossAnnual).toBe(698400);
    expect(r.employeePf).toBe(21600);
    expect(r.professionalTax).toBe(2500);
    expect(r.taxableIncome).toBe(623400);
    expect(r.totalTax).toBe(0);
    expect(r.annualInHand).toBe(674300);
    expect(r.monthlyInHand).toBe(56192);
    expect(r.assumptions).toEqual([]);
  });

  it("₹20L CTC, new regime: slab tax plus cess", () => {
    const r = calculateInHand({ ctcAnnual: 2000000, fixedAnnual: 2000000, basicAnnual: 800000, employerPfInCtc: false, state: "MH", regime: "new" });
    // gross 20,00,000; taxable 19,25,000; slab tax 1,85,000 (+4% cess)
    expect(r.taxableIncome).toBe(1925000);
    expect(r.slabTax).toBe(185000);
    expect(r.totalTax).toBe(192400);
    expect(r.monthlyInHand).toBe(Math.round((2000000 - 96000 - 2500 - 192400) / 12));
  });

  it("same ₹20L CTC under the old regime uses 80C, PT and HRA", () => {
    const r = calculateInHand({
      ctcAnnual: 2000000, fixedAnnual: 2000000, basicAnnual: 800000, hraAnnual: 400000, employerPfInCtc: false,
      state: "MH", regime: "old", rentPaidMonthly: 30000, metroCity: true,
    });
    // HRA exemption = min(4,00,000; 3,60,000 - 80,000; 4,00,000) = 2,80,000
    // 80C = employee PF 96,000; taxable = 20,00,000 - 50,000 - 2,500 - 2,80,000 - 96,000 = 15,71,500
    expect(r.taxableIncome).toBe(1571500);
    expect(r.slabTax).toBe(283950);
    expect(r.totalTax).toBe(295308);
  });

  it("gross of exactly ₹12.75L has zero tax under the new regime", () => {
    const r = calculateInHand({ ctcAnnual: 1275000, fixedAnnual: 1275000, basicAnnual: 500000, employerPfInCtc: false, regime: "new" });
    expect(r.taxableIncome).toBe(1200000);
    expect(r.totalTax).toBe(0);
  });

  it("one rupee over the rebate ceiling pays only about a rupee (marginal relief)", () => {
    const r = calculateInHand({ ctcAnnual: 1275001, fixedAnnual: 1275001, basicAnnual: 500000, employerPfInCtc: false, regime: "new" });
    expect(r.taxableIncome).toBe(1200001);
    expect(r.totalTax).toBe(1);
  });

  it("states its assumptions when the letter has only a CTC", () => {
    const r = calculateInHand({ ctcAnnual: 600000, regime: "new" });
    expect(r.assumptions).toHaveLength(3);
    expect(r.employeePf).toBe(36000); // 12% of assumed basic (50% of 6L)
    expect(r.professionalTax).toBe(0);
  });

  it("PF ceiling mode caps PF at ₹1,800 a month", () => {
    const r = calculateInHand({ ctcAnnual: 1200000, basicAnnual: 600000, pfMode: "ceiling", regime: "new" });
    expect(r.employeePf).toBe(21600);
  });

  it("skips professional tax below the state's threshold", () => {
    const r = calculateInHand({ ctcAnnual: 240000, fixedAnnual: 240000, employerPfInCtc: false, state: "KA", regime: "new" });
    expect(r.professionalTax).toBe(0);
  });

  it("steps add up to the in-hand figure", () => {
    const r = calculateInHand({ ctcAnnual: 1500000, variableAnnual: 150000, state: "TN", regime: "new" });
    const gross = r.steps.find((s) => s.label === "Gross salary")!.amount;
    const after = r.steps.slice(r.steps.findIndex((s) => s.label === "Gross salary") + 1, -1).reduce((s, x) => s + x.amount, 0);
    expect(gross + after).toBe(r.annualInHand);
    expect(r.ratesAsOf).toBe(TAX_RULES.asOf);
  });
});
