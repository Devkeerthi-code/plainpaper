import type { StateCode } from "@/config/professional-tax";
import type { AnalysisContent } from "@/lib/documents/types";
import { numberField, sourceLabel, textField, type ClauseMap } from "@/lib/client/present";

export const MONEY_KEYS = ["ctcAnnual", "fixedAnnual", "variableAnnual", "basicAnnual", "hraAnnual", "employerPfAnnual"] as const;
export type MoneyKey = (typeof MONEY_KEYS)[number];

export interface PayPrefill {
  values: Partial<Record<MoneyKey, number>>;
  /** "p.1 · clause 4" for each value that came from the letter. */
  sources: Partial<Record<MoneyKey, string>>;
  state?: StateCode;
  stateFrom?: string;
}

const CITY_STATE: [RegExp, StateCode][] = [
  [/bengaluru|bangalore|mysuru|mysore|mangaluru/i, "KA"],
  [/mumbai|pune|nagpur|nashik|thane/i, "MH"],
  [/chennai|coimbatore|madurai/i, "TN"],
  [/hyderabad|secunderabad|warangal/i, "TG"],
  [/visakhapatnam|vijayawada|amaravati/i, "AP"],
  [/kolkata|howrah/i, "WB"],
  [/kochi|cochin|thiruvananthapuram|trivandrum|kozhikode/i, "KL"],
  [/ahmedabad|surat|vadodara|gandhinagar/i, "GJ"],
  [/indore|bhopal/i, "MP"],
  [/delhi/i, "DL"],
  [/gurugram|gurgaon|faridabad/i, "HR"],
  [/noida|lucknow|ghaziabad/i, "UP"],
];

/** Pre-fills the calculator from the offer letter, keeping where each number came from. */
export function prefillFromContent(content: AnalysisContent, clauseMap: ClauseMap): PayPrefill {
  const prefill: PayPrefill = { values: {}, sources: {} };
  for (const key of MONEY_KEYS) {
    const value = numberField(content, key);
    const located = content.fields.scalars[key];
    if (value === null || !located) continue;
    prefill.values[key] = value;
    prefill.sources[key] = sourceLabel(clauseMap, located.clauseId, located.page);
  }
  const location = textField(content, "location");
  const hit = location ? CITY_STATE.find(([re]) => re.test(location)) : undefined;
  if (hit && location) {
    prefill.state = hit[1];
    prefill.stateFrom = location;
  }
  return prefill;
}
