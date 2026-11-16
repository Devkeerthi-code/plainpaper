import { describe, expect, it } from "vitest";
import { segmentDocument, allClauses } from "@/lib/documents/segment";
import { buildClauseIndex, locateQuote, quoteRange } from "@/lib/extraction/locate";
import { parseAmounts, parseDurations, valueSupportedByQuote } from "@/lib/extraction/numbers";
import { rawModelOutputSchema, validateExtraction, validateSummary } from "@/lib/extraction/validate";
import { CATALOG } from "@/lib/extraction/catalog";
import { OFFER_CLAUSES } from "./helpers";

const raw = (fields: Record<string, unknown>, lists: Record<string, unknown[]> = {}) =>
  rawModelOutputSchema.parse({ title: "t", fields, lists, summary: [] });

describe("clause-to-page mapping", () => {
  const index = buildClauseIndex(OFFER_CLAUSES);

  it("uses the suggested clause when the quote is in it", () => {
    expect(locateQuote(index, "Rs. 2,00,000", "p2-c1")?.id).toBe("p2-c1");
  });

  it("corrects a wrong clause id by finding the quote elsewhere, with its real page", () => {
    const clause = locateQuote(index, "giving 90 days written notice", "p1-c2");
    expect(clause?.id).toBe("p2-c2");
    expect(clause?.page).toBe(2);
  });

  it("tolerates case, punctuation and spacing differences", () => {
    expect(locateQuote(index, "probation for   6 MONTHS", null)?.id).toBe("p1-c4");
  });

  it("finds quotes that run across two neighbouring clauses", () => {
    expect(locateQuote(index, "per annum. 6. Probation", null)?.id).toBe("p1-c3");
  });

  it("returns null for text that is not in the document", () => {
    expect(locateQuote(index, "a bond of Rs. 5,00,000 for 36 months", "p2-c1")).toBeNull();
    expect(locateQuote(index, "ab", null)).toBeNull();
  });

  it("finds the exact character range for the highlight", () => {
    const text = OFFER_CLAUSES.find((c) => c.id === "p2-c2")!.text;
    const range = quoteRange(text, "90 days written notice");
    expect(text.slice(range!.start, range!.end)).toBe("90 days written notice");
    expect(quoteRange(text, "not there")).toBeNull();
  });
});

describe("number parsing", () => {
  it("reads Indian amounts and units", () => {
    expect(parseAmounts("Rs. 2,00,000/- (Two Lakh)")).toContain(200000);
    expect(parseAmounts("CTC of 12 LPA")).toContain(1200000);
    expect(parseAmounts("₹1.5 crore")).toContain(15000000);
    expect(parseAmounts("bond of two lakh rupees")).toContain(200000);
  });

  it("converts durations", () => {
    expect(parseDurations("a lock-in of two years", "months")).toContain(24);
    expect(parseDurations("3 months notice", "days")).toContain(90);
    expect(parseDurations("within 24 hours", "hours")).toContain(24);
  });

  it("checks the reported value against the quote", () => {
    expect(valueSupportedByQuote("money", 200000, "pay Rs. 2,00,000 if you leave")).toBe(true);
    expect(valueSupportedByQuote("money", 600000, "Rs. 50,000 per month")).toBe(true);
    expect(valueSupportedByQuote("money", 500000, "pay Rs. 2,00,000 if you leave")).toBe(false);
    expect(valueSupportedByQuote("months", 24, "serve for a minimum of 2 years")).toBe(true);
    expect(valueSupportedByQuote("days", 60, "giving 90 days notice")).toBe(false);
    expect(valueSupportedByQuote("percent", 20, "bear 20% of every claim")).toBe(true);
    expect(valueSupportedByQuote("money", 1000, "as per company policy")).toBe(true);
  });
});

describe("extraction validation per type", () => {
  it("offer letter: keeps located values, leaves unstated fields empty", () => {
    const { extraction, dropped } = validateExtraction(
      "OFFER_LETTER",
      raw({
        ctcAnnual: { value: 800000, clauseId: "p1-c3", quote: "Cost to Company (CTC) will be Rs. 8,00,000" },
        bondAmount: { value: "₹2,00,000", clauseId: "p2-c1", quote: "you shall pay Rs. 2,00,000" },
        noticeDays: { value: 90, clauseId: "p2-c2", quote: "giving 90 days written notice" },
        nonCompeteMonths: null,
      }),
      OFFER_CLAUSES,
    );
    expect(extraction.scalars.ctcAnnual).toMatchObject({ value: 800000, clauseId: "p1-c3", page: 1 });
    expect(extraction.scalars.bondAmount).toMatchObject({ value: 200000, page: 2 });
    expect(extraction.scalars.noticeDays?.value).toBe(90);
    expect(extraction.scalars.nonCompeteMonths).toBeNull();
    expect(Object.keys(extraction.scalars)).toEqual(CATALOG.OFFER_LETTER.scalars.map((f) => f.key));
    expect(dropped).toEqual([]);
  });

  it("drops invented values: quote missing from the document or number not in the quote", () => {
    const { extraction, dropped } = validateExtraction(
      "OFFER_LETTER",
      raw({
        bondMonths: { value: 36, clauseId: "p2-c1", quote: "a bond of 36 months" },
        bondAmount: { value: 500000, clauseId: "p2-c1", quote: "you shall pay Rs. 2,00,000" },
        probationMonths: { value: 6, clauseId: "p1-c4" },
      }),
      OFFER_CLAUSES,
    );
    expect(extraction.scalars.bondMonths).toBeNull();
    expect(extraction.scalars.bondAmount).toBeNull();
    expect(extraction.scalars.probationMonths).toBeNull();
    expect(dropped.map((d) => d.reason).sort()).toEqual(["quote-not-found", "quote-not-found", "value-not-in-quote"]);
  });

  it("rejects values of the wrong kind and ignores unknown fields", () => {
    const { extraction, dropped } = validateExtraction(
      "OFFER_LETTER",
      raw({
        noticeDays: { value: "three months-ish", clauseId: "p2-c2", quote: "90 days" },
        secretField: { value: "x", clauseId: "p1-c1", quote: "NORTHWIND" },
      }),
      OFFER_CLAUSES,
    );
    expect(extraction.scalars.noticeDays).toBeNull();
    expect(dropped).toEqual([{ key: "noticeDays", reason: "invalid-value" }]);
    expect("secretField" in extraction.scalars).toBe(false);
  });

  it("rent agreement: parses party fields and booleans", () => {
    const clauses = allClauses(
      segmentDocument(["1. Repairs: Major repairs shall be done by the Tenant.\n2. Rs. 10,000 of the deposit is non-refundable."]),
    );
    const { extraction } = validateExtraction(
      "RENT_AGREEMENT",
      raw({
        majorRepairsBy: { value: "Tenant", clauseId: "p1-c1", quote: "Major repairs shall be done by the Tenant" },
        depositNonRefundable: { value: "true", clauseId: "p1-c2", quote: "of the deposit is non-refundable" },
        minorRepairsBy: { value: "the owner", clauseId: "p1-c1", quote: "Major repairs" },
      }),
      clauses,
    );
    expect(extraction.scalars.majorRepairsBy?.value).toBe("tenant");
    expect(extraction.scalars.depositNonRefundable?.value).toBe(true);
    expect(extraction.scalars.minorRepairsBy).toBeNull();
  });

  it("insurance policy: validates each list item on its own", () => {
    const clauses = allClauses(segmentDocument(["9. Exclusions: cosmetic surgery, treatment for obesity and war risks are not covered."]));
    const { extraction, dropped } = validateExtraction(
      "INSURANCE_POLICY",
      raw(
        { copayPercent: { value: 120, clauseId: "p1-c1", quote: "cosmetic surgery" } },
        {
          exclusions: [
            { value: "Cosmetic surgery", clauseId: "p1-c1", quote: "cosmetic surgery" },
            { value: "Obesity treatment", clauseId: "p1-c1", quote: "treatment for obesity" },
            { value: "Dental", clauseId: "p1-c1", quote: "dental treatment" },
          ],
        },
      ),
      clauses,
    );
    expect(extraction.lists.exclusions?.map((e) => e.value)).toEqual(["Cosmetic surgery", "Obesity treatment"]);
    expect(extraction.scalars.copayPercent).toBeNull(); // 120% is out of range
    expect(dropped.map((d) => d.key)).toEqual(["copayPercent", "exclusions[2]"]);
  });

  it("summary keeps only real clause ids", () => {
    const summary = validateSummary(
      [
        { text: "You must give 90 days notice.", clauseIds: ["p2-c2", "p9-c9"] },
        { text: "   ", clauseIds: [] },
      ],
      OFFER_CLAUSES,
    );
    expect(summary).toEqual([{ text: "You must give 90 days notice.", clauseIds: ["p2-c2"] }]);
  });
});
