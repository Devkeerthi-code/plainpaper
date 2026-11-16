import { describe, expect, it } from "vitest";
import { detectDocType } from "@/lib/documents/detect";
import { normalizeForMatch, segmentPage } from "@/lib/documents/segment";
import { layoutPageText, type TextItem } from "@/lib/documents/pdf-layout";
import { needsOcr, sniffKind, classifyUpload, UploadError } from "@/lib/documents/ingest";
import { OFFER_PAGES } from "./helpers";

describe("segmentation", () => {
  it("splits numbered clauses and keeps their labels", () => {
    const page = segmentPage("1. Rent: Rs. 18,000.\n2. Deposit: Rs. 50,000.\n3.1 Lock-in: 6 months.", 1);
    expect(page.clauses.map((c) => c.label)).toEqual(["1", "2", "3.1"]);
    expect(page.clauses.map((c) => c.id)).toEqual(["p1-c1", "p1-c2", "p1-c3"]);
  });

  it("joins wrapped lines of one clause and attaches a heading to the next paragraph", () => {
    const page = segmentPage("Security Deposit\nThe tenant shall pay a deposit\nof Rs. 50,000 before moving in.", 3);
    expect(page.clauses).toHaveLength(1);
    expect(page.clauses[0]?.text).toBe("Security Deposit The tenant shall pay a deposit of Rs. 50,000 before moving in.");
    expect(page.clauses[0]?.page).toBe(3);
  });

  it("numbers clause ids per page", () => {
    expect(OFFER_PAGES[1]?.clauses[0]?.id).toBe("p2-c1");
  });

  it("normalises punctuation, case and unicode for matching", () => {
    expect(normalizeForMatch("“Rs. 2,00,000/-”  per   ANNUM")).toBe("rs 2 00 000 per annum");
    expect(normalizeForMatch("किराया ₹18,000")).toBe("किराया 18 000");
  });
});

describe("PDF layout", () => {
  const item = (str: string, y: number, x = 64): TextItem => ({ str, transform: [1, 0, 0, 1, x, y], height: 10 });

  it("inserts a blank line where the vertical gap is larger than normal line spacing", () => {
    const text = layoutPageText([item("1. First clause line one", 800), item("line two", 785), item("2. Second", 760), item("end", 745)]);
    expect(text).toBe("1. First clause line one\nline two\n\n2. Second\nend");
  });

  it("merges items on the same baseline in left-to-right order", () => {
    expect(layoutPageText([item("world", 700, 120), item("hello", 700, 64)])).toBe("hello world");
  });
});

describe("document type detection", () => {
  it("recognises each type", () => {
    expect(detectDocType("Offer letter. Your CTC is Rs 8 lakh. Date of joining 1 July. Probation 6 months.").docType).toBe("OFFER_LETTER");
    expect(detectDocType("Rental agreement between landlord and tenant. Security deposit. Lock-in 11 months.").docType).toBe("RENT_AGREEMENT");
    expect(detectDocType("Policy schedule. Sum insured Rs 5 lakh. Premium. Waiting period. Exclusions. Co-pay.").docType).toBe("INSURANCE_POLICY");
  });

  it("returns null when it is unsure, so the user picks", () => {
    expect(detectDocType("Minutes of the meeting held on Monday.").docType).toBeNull();
  });
});

describe("upload checks", () => {
  const pdf = new TextEncoder().encode("%PDF-1.7 rest");
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);

  it("trusts magic bytes, not names", () => {
    expect(sniffKind(pdf)).toBe("pdf");
    expect(sniffKind(jpg)).toBe("jpeg");
    expect(sniffKind(new TextEncoder().encode("<html>"))).toBeNull();
  });

  it("rejects mixed uploads, unknown files and oversize uploads", () => {
    expect(() => classifyUpload([pdf, jpg])).toThrow(UploadError);
    expect(() => classifyUpload([new TextEncoder().encode("MZ executable")])).toThrow(UploadError);
    expect(() => classifyUpload([new Uint8Array(5 * 1024 * 1024)])).toThrow(/4 MB/);
    expect(() => classifyUpload([])).toThrow(UploadError);
  });

  it("detects scans that need OCR", () => {
    expect(needsOcr(["", " "])).toBe(true);
    expect(needsOcr(["A real text layer ".repeat(10)])).toBe(false);
  });
});
