import type { AnalysisContent, Flag, Language, SummaryPoint, Translation } from "@/lib/documents/types";

export interface LocalizedReading {
  lang: Language;
  summary: SummaryPoint[];
  flags: Flag[];
}

/** Swaps in a translation's text while keeping every clause link from the English original. */
export function localize(content: AnalysisContent, lang: Language, translation: Translation | undefined): LocalizedReading {
  if (lang === "en" || !translation) return { lang: "en", summary: content.summary, flags: content.flags };
  return {
    lang,
    summary: content.summary.map((p, i) => ({ ...p, text: translation.summary[i] ?? p.text })),
    flags: content.flags.map((f, i) => {
      const t = translation.flags[i];
      return t ? { ...f, title: t.title, why: t.why, questions: t.questions } : f;
    }),
  };
}

export function translationRequest(content: AnalysisContent) {
  return {
    summary: content.summary.map((p) => p.text),
    flags: content.flags.map((f) => ({ title: f.title, why: f.why, questions: f.questions })),
  };
}

/** Text for read-aloud: the summary, then each warning's title. */
export function speechText(reading: LocalizedReading): string {
  return [...reading.summary.map((p) => p.text), ...reading.flags.map((f) => f.title)].map((t) => t.trim().replace(/[.।]?$/, ".")).join(" ");
}
