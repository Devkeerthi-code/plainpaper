export const DOC_TYPES = ["OFFER_LETTER", "RENT_AGREEMENT", "INSURANCE_POLICY"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  OFFER_LETTER: "Job offer letter",
  RENT_AGREEMENT: "Rent agreement",
  INSURANCE_POLICY: "Insurance policy",
};

export const LANGUAGES = ["en", "hi", "ta", "kn", "te", "ml", "bn", "mr"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, { english: string; native: string; speech: string }> = {
  en: { english: "English", native: "English", speech: "en-IN" },
  hi: { english: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  ta: { english: "Tamil", native: "தமிழ்", speech: "ta-IN" },
  kn: { english: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN" },
  te: { english: "Telugu", native: "తెలుగు", speech: "te-IN" },
  ml: { english: "Malayalam", native: "മലയാളം", speech: "ml-IN" },
  bn: { english: "Bengali", native: "বাংলা", speech: "bn-IN" },
  mr: { english: "Marathi", native: "मराठी", speech: "mr-IN" },
};

/** One clause (paragraph or numbered item) of the original document. */
export interface Clause {
  /** Stable id like "p2-c7": page 2, 7th clause on that page. */
  id: string;
  page: number;
  /** Clause number printed in the document ("7", "4.2"), when there is one. */
  label: string | null;
  text: string;
}

export interface Page {
  number: number;
  clauses: Clause[];
}

export type Scalar = string | number | boolean;

/** A value pulled from the document, with the exact place it came from. */
export interface Located<T extends Scalar = Scalar> {
  value: T;
  clauseId: string;
  page: number;
  quote: string;
}

export interface Extraction {
  scalars: Record<string, Located | null>;
  lists: Record<string, Located<string>[]>;
}

export interface SummaryPoint {
  text: string;
  clauseIds: string[];
}

export type FlagSeverity = "amber" | "red";

export interface Flag {
  ruleId: string;
  severity: FlagSeverity;
  title: string;
  why: string;
  questions: string[];
  clauseId: string | null;
  page: number | null;
  quote: string | null;
}

export interface Translation {
  summary: string[];
  flags: { title: string; why: string; questions: string[] }[];
}

/** Everything the reading view needs. Saved analyses add id/pinned/dates. */
export interface AnalysisContent {
  docType: DocType;
  title: string;
  pages: Page[];
  fields: Extraction;
  summary: SummaryPoint[];
  flags: Flag[];
  translations: Partial<Record<Language, Translation>>;
}

export interface SavedAnalysis extends AnalysisContent {
  id: string;
  pinned: boolean;
  createdAt: string;
  expiresAt: string | null;
}
