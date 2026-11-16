import type { FieldKind } from "./catalog";

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, eighteen: 18, twenty: 20, thirty: 30, "twenty four": 24,
  "thirty six": 36, forty: 40, "forty five": 45, sixty: 60, ninety: 90, "forty eight": 48,
};

const UNIT_MULTIPLIER: Record<string, number> = {
  lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, l: 1e5, lpa: 1e5,
  crore: 1e7, crores: 1e7, cr: 1e7, k: 1e3, thousand: 1e3,
};

function toNumber(token: string): number | null {
  const n = Number(token.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Every number in the text, with Indian units (lakh, crore, LPA, k) applied. */
export function parseAmounts(text: string): number[] {
  const lower = text.toLowerCase();
  const out: number[] = [];
  const re = /(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|lpa|crores?|cr|thousand|k|l)?\b/g;
  for (const m of lower.matchAll(re)) {
    const base = toNumber(m[1] ?? "");
    if (base === null) continue;
    const unit = m[2];
    out.push(unit ? Math.round(base * (UNIT_MULTIPLIER[unit] ?? 1)) : base);
  }
  for (const [word, n] of Object.entries(WORD_NUMBERS)) {
    const unitMatch = lower.match(new RegExp(`\\b${word}\\s+(lakhs?|lacs?|crores?)\\b`));
    if (unitMatch) out.push(n * (UNIT_MULTIPLIER[unitMatch[1] ?? ""] ?? 1));
  }
  return out;
}

type DurationUnit = "day" | "week" | "month" | "year" | "hour";
const DURATION_RE =
  /(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|eighteen|twenty four|twenty|thirty six|thirty|forty eight|forty five|forty|sixty|ninety)\s*(?:\(\s*\d+\s*\)\s*)?(days?|weeks?|months?|years?|yrs?|hours?|hrs?)\b/g;

function unitOf(token: string): DurationUnit {
  if (token.startsWith("d")) return "day";
  if (token.startsWith("w")) return "week";
  if (token.startsWith("m")) return "month";
  if (token.startsWith("h")) return "hour";
  return "year";
}

const IN_DAYS: Record<DurationUnit, number> = { hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 };

/** Durations mentioned in the text, converted to the requested unit. */
export function parseDurations(text: string, target: "days" | "months" | "hours"): number[] {
  const lower = text.toLowerCase().replace(/-/g, " ");
  const out: number[] = [];
  for (const m of lower.matchAll(DURATION_RE)) {
    const raw = m[1] ?? "";
    const n = WORD_NUMBERS[raw] ?? Number(raw);
    if (!Number.isFinite(n)) continue;
    const unit = unitOf(m[2] ?? "");
    if (target === "months") out.push(unit === "year" ? n * 12 : unit === "month" ? n : (n * IN_DAYS[unit]) / 30);
    else if (target === "days") out.push(unit === "month" ? n * 30 : unit === "year" ? n * 365 : n * IN_DAYS[unit]);
    else out.push(unit === "hour" ? n : n * IN_DAYS[unit] * 24);
  }
  return out;
}

export function parsePercents(text: string): number[] {
  return [...text.toLowerCase().matchAll(/(\d+(?:\.\d+)?)\s*(?:%|per\s*cent|percent)/g)].map((m) => Number(m[1]));
}

function near(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= Math.max(tolerance * Math.abs(b), 0.5);
}

/**
 * Does the quote actually contain the number the model reported?
 * Returns true when the quote states no number at all (e.g. "as per company policy"),
 * because then there is nothing to contradict.
 */
export function valueSupportedByQuote(kind: FieldKind, value: number, quote: string): boolean {
  switch (kind) {
    case "money": {
      const amounts = parseAmounts(quote).filter((n) => n >= 100);
      if (!amounts.length) return true;
      return amounts.some((n) => near(n, value, 0.01) || near(n * 12, value, 0.01) || near(n / 12, value, 0.01));
    }
    case "months":
    case "days":
    case "hours": {
      const durations = parseDurations(quote, kind);
      if (!durations.length) return !parseAmounts(quote).length || parseAmounts(quote).some((n) => n === value);
      return durations.some((n) => near(n, value, kind === "days" ? 0.05 : 0.02));
    }
    case "percent": {
      const percents = parsePercents(quote);
      return !percents.length || percents.some((n) => near(n, value, 0.001));
    }
    default:
      return true;
  }
}
