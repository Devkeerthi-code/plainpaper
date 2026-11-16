import { describe, expect, it } from "vitest";
import { FLAG_RULES } from "@/config/flag-rules";
import { evaluateFlags } from "@/lib/flags/engine";
import { extraction } from "./helpers";

const ids = (flags: { ruleId: string }[]) => flags.map((f) => f.ruleId);
const severityOf = (flags: { ruleId: string; severity: string }[], id: string) => flags.find((f) => f.ruleId === id)?.severity;

describe("offer letter flags", () => {
  it("flags a large bond as red and a small one as amber", () => {
    expect(severityOf(evaluateFlags("OFFER_LETTER", extraction({ bondAmount: 200000, bondMonths: 24 })), "offer.bond")).toBe("red");
    expect(severityOf(evaluateFlags("OFFER_LETTER", extraction({ bondAmount: 50000, bondMonths: 12 })), "offer.bond")).toBe("amber");
    expect(severityOf(evaluateFlags("OFFER_LETTER", extraction({ bondAmount: 50000, bondMonths: 24 })), "offer.bond")).toBe("red");
  });

  it("uses notice-period thresholds at the boundaries", () => {
    expect(ids(evaluateFlags("OFFER_LETTER", extraction({ noticeDays: 59 })))).not.toContain("offer.notice");
    expect(severityOf(evaluateFlags("OFFER_LETTER", extraction({ noticeDays: 60 })), "offer.notice")).toBe("amber");
    expect(severityOf(evaluateFlags("OFFER_LETTER", extraction({ noticeDays: 90 })), "offer.notice")).toBe("red");
  });

  it("flags a variable-heavy CTC and a low fixed share", () => {
    const flags = evaluateFlags("OFFER_LETTER", extraction({ ctcAnnual: 1000000, fixedAnnual: 700000, variableAnnual: 250000 }));
    expect(ids(flags)).toEqual(expect.arrayContaining(["offer.variable-heavy", "offer.ctc-vs-fixed"]));
  });

  it("raises nothing for a plain offer", () => {
    const flags = evaluateFlags(
      "OFFER_LETTER",
      extraction({ ctcAnnual: 900000, fixedAnnual: 850000, variableAnnual: 50000, noticeDays: 30, probationMonths: 3 }),
    );
    expect(flags).toEqual([]);
  });

  it("anchors each flag to the clause of its field", () => {
    const [flag] = evaluateFlags("OFFER_LETTER", extraction({ noticeDays: 90 }));
    expect(flag).toMatchObject({ clauseId: "p1-c1", page: 1, quote: "quote" });
  });
});

describe("rent agreement flags", () => {
  it("measures the deposit in months of rent", () => {
    expect(ids(evaluateFlags("RENT_AGREEMENT", extraction({ monthlyRent: 20000, deposit: 40000 })))).toEqual([]);
    expect(severityOf(evaluateFlags("RENT_AGREEMENT", extraction({ monthlyRent: 20000, deposit: 60000 })), "rent.deposit-size")).toBe("amber");
    expect(severityOf(evaluateFlags("RENT_AGREEMENT", extraction({ monthlyRent: 18000, deposit: 108000 })), "rent.deposit-size")).toBe("red");
  });

  it("flags long lock-ins, non-refundable deposits, tenant-paid major repairs and uneven notice", () => {
    const flags = evaluateFlags(
      "RENT_AGREEMENT",
      extraction({ lockInMonths: 12, depositNonRefundable: true, majorRepairsBy: "tenant", tenantNoticeMonths: 2, landlordNoticeMonths: 1 }),
    );
    expect(ids(flags)).toEqual(expect.arrayContaining(["rent.lock-in", "rent.non-refundable", "rent.major-repairs", "rent.notice-imbalance"]));
    expect(severityOf(flags, "rent.lock-in")).toBe("red");
    expect(flags[0]?.severity).toBe("red"); // red flags come first
  });

  it("does not flag a balanced agreement", () => {
    const flags = evaluateFlags(
      "RENT_AGREEMENT",
      extraction({ lockInMonths: 3, depositNonRefundable: false, majorRepairsBy: "landlord", tenantNoticeMonths: 1, landlordNoticeMonths: 1, incrementPercent: 5 }),
    );
    expect(flags).toEqual([]);
  });
});

describe("insurance flags", () => {
  it("grades co-pay", () => {
    expect(ids(evaluateFlags("INSURANCE_POLICY", extraction({ copayPercent: 5 })))).toEqual([]);
    expect(severityOf(evaluateFlags("INSURANCE_POLICY", extraction({ copayPercent: 10 })), "insurance.copay")).toBe("amber");
    expect(severityOf(evaluateFlags("INSURANCE_POLICY", extraction({ copayPercent: 20 })), "insurance.copay")).toBe("red");
  });

  it("treats 'no room rent capping' as no limit", () => {
    expect(ids(evaluateFlags("INSURANCE_POLICY", extraction({ roomRentLimit: "There is no room rent capping." })))).toEqual([]);
    expect(ids(evaluateFlags("INSURANCE_POLICY", extraction({ roomRentLimit: "1% of sum insured per day" })))).toEqual(["insurance.room-rent"]);
  });

  it("counts sub-limits from the list field", () => {
    const flags = evaluateFlags("INSURANCE_POLICY", extraction({}, { subLimits: ["Cataract Rs. 40,000", "Knee Rs. 1,50,000"] }));
    expect(flags[0]?.title).toBe("2 treatments have their own cap");
  });
});

describe("flag wording", () => {
  it("never calls a clause illegal or gives instructions to sign or not sign", () => {
    const everything = extraction(
      {
        bondAmount: 300000, bondMonths: 36, noticeDays: 90, probationMonths: 12, nonCompeteMonths: 24, ctcAnnual: 1000000, fixedAnnual: 500000,
        variableAnnual: 400000, joiningBonusClawbackMonths: 24, lockInMonths: 12, monthlyRent: 10000, deposit: 100000, depositNonRefundable: true,
        incrementPercent: 15, majorRepairsBy: "tenant", tenantNoticeMonths: 3, landlordNoticeMonths: 1, depositRefundDays: 60, copayPercent: 30,
        roomRentLimit: "Rs 3000 per day", preExistingWaitingMonths: 48, specificDiseaseWaitingMonths: 36, initialWaitingDays: 90, claimIntimationHours: 12,
      },
      { subLimits: ["x"] },
    );
    const all = (["OFFER_LETTER", "RENT_AGREEMENT", "INSURANCE_POLICY"] as const).flatMap((t) => evaluateFlags(t, everything));
    expect(all).toHaveLength(FLAG_RULES.length);
    const text = all.flatMap((f) => [f.title, f.why, ...f.questions]).join(" ").toLowerCase();
    expect(text).not.toMatch(/illegal|unlawful|void|don't sign|do not sign|you should sign|legal advice/);
  });
});
