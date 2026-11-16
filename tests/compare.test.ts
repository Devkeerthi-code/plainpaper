import { describe, expect, it } from "vitest";
import { compareAnalyses, CompareTypeMismatchError, summarizeDiff } from "@/lib/compare/diff";
import type { AnalysisContent } from "@/lib/documents/types";
import type { Scalar } from "@/lib/documents/types";
import { extraction } from "./helpers";

function doc(docType: AnalysisContent["docType"], scalars: Record<string, Scalar | null>, lists: Record<string, string[]> = {}): AnalysisContent {
  return { docType, title: "t", pages: [], fields: extraction(scalars, lists), summary: [], flags: [], translations: {} };
}

describe("comparison diffing", () => {
  const a = doc("OFFER_LETTER", { employer: "Northwind", ctcAnnual: 800000, noticeDays: 90, bondAmount: 200000, probationMonths: 6 });
  const b = doc("OFFER_LETTER", { employer: "Bluefern", ctcAnnual: 950000, noticeDays: 60, probationMonths: 6, stocks: "ESOPs worth Rs. 50,000" });
  const rows = compareAnalyses(a, b);
  const row = (key: string) => rows.find((r) => r.key === key);

  it("aligns rows in catalog order and skips fields neither document states", () => {
    expect(rows.map((r) => r.key)).toEqual(["employer", "ctcAnnual", "stocks", "probationMonths", "noticeDays", "bondAmount"]);
  });

  it("marks same, different and one-sided values", () => {
    expect(row("probationMonths")?.status).toBe("same");
    expect(row("ctcAnnual")?.status).toBe("different");
    expect(row("bondAmount")?.status).toBe("only-a");
    expect(row("stocks")?.status).toBe("only-b");
  });

  it("picks the better side only where 'better' is objective", () => {
    expect(row("ctcAnnual")?.better).toBe("b"); // higher pay
    expect(row("noticeDays")?.better).toBe("b"); // shorter notice
    expect(row("bondAmount")?.better).toBe("b"); // no bond beats a bond
    expect(row("employer")?.better).toBeNull();
    expect(row("probationMonths")?.better).toBeNull();
  });

  it("treats text that differs only in case or punctuation as the same", () => {
    const x = doc("RENT_AGREEMENT", { property: "Flat No. 304, Greenview" });
    const y = doc("RENT_AGREEMENT", { property: "flat no 304 greenview" });
    expect(compareAnalyses(x, y)[0]?.status).toBe("same");
  });

  it("compares list fields as sets, fewer exclusions being better", () => {
    const p = doc("INSURANCE_POLICY", {}, { exclusions: ["Cosmetic surgery", "Obesity", "War"] });
    const q = doc("INSURANCE_POLICY", {}, { exclusions: ["cosmetic surgery", "Adventure sports"] });
    const [ex] = compareAnalyses(p, q);
    expect(ex).toMatchObject({ key: "exclusions", status: "different", better: "b" });
    expect(ex?.aItems).toHaveLength(3);
  });

  it("summarises the differences", () => {
    expect(summarizeDiff(rows)).toEqual({ different: 5, betterA: 0, betterB: 3 });
  });

  it("refuses to compare different document types", () => {
    expect(() => compareAnalyses(a, doc("RENT_AGREEMENT", {}))).toThrow(CompareTypeMismatchError);
  });
});
