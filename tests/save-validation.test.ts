import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

const { revalidateContent } = await import("@/lib/analyses");
const { analysisContentSchema, explainInputSchema, translateInputSchema } = await import("@/lib/api-schemas");
const { credentialsSchema } = await import("@/lib/auth/password");
const { OFFER_PAGES } = await import("./helpers");

const base = {
  docType: "OFFER_LETTER" as const,
  title: "Offer from Northwind",
  pages: OFFER_PAGES,
  summary: [{ text: "Notice is 90 days.", clauseIds: ["p2-c2", "p7-c1"] }],
  flags: [{ ruleId: "fake.flag", severity: "red" }],
  translations: {},
};

describe("re-checking content before it is saved", () => {
  it("recomputes flags and ignores any the browser sent", () => {
    const input = analysisContentSchema.parse({
      ...base,
      fields: {
        scalars: { noticeDays: { value: 90, clauseId: "p2-c2", page: 2, quote: "giving 90 days written notice" } },
        lists: {},
      },
    });
    const content = revalidateContent(input);
    expect(content.flags.map((f) => f.ruleId)).toEqual(["offer.notice"]);
    expect(content.summary[0]?.clauseIds).toEqual(["p2-c2"]);
  });

  it("drops fields whose quote is not in the document and unknown keys", () => {
    const input = analysisContentSchema.parse({
      ...base,
      fields: {
        scalars: {
          bondAmount: { value: 900000, clauseId: "p2-c1", page: 2, quote: "bond of Rs. 9,00,000" },
          hacked: { value: "x", clauseId: "p1-c1", page: 1, quote: "NORTHWIND" },
        },
        lists: {},
      },
    });
    const content = revalidateContent(input);
    expect(content.fields.scalars.bondAmount).toBeNull();
    expect("hacked" in content.fields.scalars).toBe(false);
  });

  it("fixes a tampered page number from the clause it really belongs to", () => {
    const input = analysisContentSchema.parse({
      ...base,
      fields: { scalars: { noticeDays: { value: 90, clauseId: "p2-c2", page: 9, quote: "90 days written notice" } }, lists: {} },
    });
    expect(revalidateContent(input).fields.scalars.noticeDays?.page).toBe(2);
  });
});

describe("request validation", () => {
  it("rejects malformed clause ids and oversized documents", () => {
    expect(explainInputSchema.safeParse({ docType: "OFFER_LETTER", pages: [{ number: 1, clauses: [{ id: "x", page: 1, label: null, text: "a" }] }] }).success).toBe(false);
    const huge = Array.from({ length: 25 }, (_, i) => ({
      number: i + 1,
      clauses: Array.from({ length: 2 }, (_, j) => ({ id: `p${i + 1}-c${j + 1}`, page: i + 1, label: null, text: "x".repeat(3999) })),
    }));
    expect(explainInputSchema.safeParse({ docType: "OFFER_LETTER", pages: huge }).success).toBe(false);
  });

  it("only translates into supported Indian languages", () => {
    expect(translateInputSchema.safeParse({ language: "ta", summary: [], flags: [] }).success).toBe(true);
    expect(translateInputSchema.safeParse({ language: "en", summary: [], flags: [] }).success).toBe(false);
    expect(translateInputSchema.safeParse({ language: "fr", summary: [], flags: [] }).success).toBe(false);
  });

  it("normalises and validates credentials", () => {
    expect(credentialsSchema.parse({ email: "  Someone@Example.COM ", password: "longenough" }).email).toBe("someone@example.com");
    expect(credentialsSchema.safeParse({ email: "nope", password: "longenough" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
  });
});
