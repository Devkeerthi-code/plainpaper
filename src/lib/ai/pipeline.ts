import { z } from "zod";
import { allClauses } from "@/lib/documents/segment";
import { DOC_TYPE_LABELS, type AnalysisContent, type DocType, type Language, type Page, type Translation } from "@/lib/documents/types";
import { cleanTitle, hasContactDetails, rawModelOutputSchema, validateExtraction, validateSummary, type Dropped } from "@/lib/extraction/validate";
import { evaluateFlags } from "@/lib/flags/engine";
import { AiError, generateJson } from "./gemini";
import { extractionSystemPrompt, fenceClauses, newFenceToken, translationSystemPrompt } from "./prompts";

export interface ExplainResult {
  content: AnalysisContent;
  dropped: Dropped[];
}

/** Turn already-validated model output into the reading-view content. Pure, so it's testable. */
export function buildContent(docType: DocType, pages: Page[], rawOutput: unknown): ExplainResult {
  const parsed = rawModelOutputSchema.safeParse(rawOutput);
  if (!parsed.success) throw new AiError("AI response had the wrong shape", "bad-output");
  const clauses = allClauses(pages);
  const { extraction, dropped } = validateExtraction(docType, parsed.data, clauses);
  return {
    content: {
      docType,
      title: cleanTitle(parsed.data.title, DOC_TYPE_LABELS[docType]),
      pages,
      fields: extraction,
      summary: validateSummary(parsed.data.summary, clauses),
      flags: evaluateFlags(docType, extraction),
      translations: {},
    },
    dropped,
  };
}

export async function explainDocument(docType: DocType, pages: Page[]): Promise<ExplainResult> {
  const token = newFenceToken();
  const raw = await generateJson({
    system: extractionSystemPrompt(docType, token),
    parts: [{ text: fenceClauses(allClauses(pages), token) }],
    thinking: "low",
    timeoutMs: 55_000,
  });
  return buildContent(docType, pages, raw);
}

const translationSchema = z.object({
  summary: z.array(z.string().max(1200)),
  flags: z.array(z.object({ title: z.string().max(400), why: z.string().max(1500), questions: z.array(z.string().max(600)) })),
});

export interface TranslatableContent {
  summary: string[];
  flags: { title: string; why: string; questions: string[] }[];
}

export function validateTranslation(source: TranslatableContent, raw: unknown): Translation {
  const parsed = translationSchema.safeParse(raw);
  if (!parsed.success) throw new AiError("Translation had the wrong shape", "bad-output");
  const t = parsed.data;
  const sameShape =
    t.summary.length === source.summary.length &&
    t.flags.length === source.flags.length &&
    t.flags.every((f, i) => f.questions.length === source.flags[i]?.questions.length);
  if (!sameShape) throw new AiError("Translation dropped or added items", "bad-output");
  const texts = [...t.summary, ...t.flags.flatMap((f) => [f.title, f.why, ...f.questions])];
  if (texts.some(hasContactDetails)) throw new AiError("Translation contained contact details", "bad-output");
  return t;
}

export async function translateContent(source: TranslatableContent, language: Language): Promise<Translation> {
  const raw = await generateJson({
    system: translationSystemPrompt(language),
    parts: [{ text: JSON.stringify(source) }],
    timeoutMs: 45_000,
  });
  return validateTranslation(source, raw);
}
