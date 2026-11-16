import { DOC_TYPES, type DocType } from "./types";

/** Weighted phrases typical of each document type. Matching is case-insensitive. */
const SIGNALS: Record<DocType, [RegExp, number][]> = {
  OFFER_LETTER: [
    [/offer (letter|of employment)/, 5],
    [/\bctc\b|cost to (the )?company/, 4],
    [/designation|\brole\b|position of/, 2],
    [/date of joining|joining date|join us/, 3],
    [/probation/, 2],
    [/notice period/, 1],
    [/service (agreement|bond)|\bbond\b/, 2],
    [/salary|compensation|remuneration/, 2],
    [/human resources|\bhr\b/, 1],
  ],
  RENT_AGREEMENT: [
    [/rent(al)? agreement|leave and licen[cs]e|lease deed|tenancy/, 5],
    [/landlord|licensor|lessor|owner/, 2],
    [/tenant|licensee|lessee/, 3],
    [/security deposit/, 3],
    [/monthly rent|rent of rs|rent of ₹|per month/, 2],
    [/lock[- ]in/, 3],
    [/premises|flat no|apartment/, 2],
    [/maintenance/, 1],
  ],
  INSURANCE_POLICY: [
    [/policy (schedule|wording|document)|insurance policy/, 5],
    [/sum insured|sum assured/, 4],
    [/premium/, 3],
    [/insured|policyholder|insurer/, 2],
    [/exclusion/, 3],
    [/waiting period/, 3],
    [/co-?pay|room rent/, 3],
    [/claim/, 2],
    [/hospitali[sz]ation|cashless|network hospital/, 2],
  ],
};

export interface Detection {
  docType: DocType | null;
  confidence: number;
  scores: Record<DocType, number>;
}

export function detectDocType(text: string): Detection {
  const lower = text.toLowerCase();
  const scores = Object.fromEntries(
    DOC_TYPES.map((type) => [type, SIGNALS[type].reduce((sum, [re, w]) => (re.test(lower) ? sum + w : sum), 0)]),
  ) as Record<DocType, number>;

  const ranked = [...DOC_TYPES].sort((a, b) => scores[b] - scores[a]);
  const [best, second] = ranked as [DocType, DocType, DocType];
  const top = scores[best];
  if (top < 5) return { docType: null, confidence: 0, scores };

  const confidence = Math.min(1, (top - scores[second]) / top);
  return { docType: confidence < 0.2 ? null : best, confidence: Number(confidence.toFixed(2)), scores };
}
