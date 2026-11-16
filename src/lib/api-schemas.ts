import { z } from "zod";
import { DOC_TYPES, LANGUAGES } from "@/lib/documents/types";
import { CLIENT_USAGE_KINDS } from "@/lib/usage";
import { MAX_PAGES } from "@/lib/documents/ingest";

const MAX_DOC_CHARS = 150_000;

export const clauseSchema = z.object({
  id: z.string().regex(/^p\d{1,2}-c\d{1,4}$/),
  page: z.number().int().min(1).max(MAX_PAGES),
  label: z.string().max(20).nullable(),
  text: z.string().min(1).max(4000),
});

export const pagesSchema = z
  .array(z.object({ number: z.number().int().min(1).max(MAX_PAGES), clauses: z.array(clauseSchema).min(1).max(400) }))
  .min(1)
  .max(MAX_PAGES)
  .refine((pages) => pages.flatMap((p) => p.clauses).reduce((s, c) => s + c.text.length, 0) <= MAX_DOC_CHARS, {
    message: "This document is too long to read in one go.",
  });

export const docTypeSchema = z.enum(DOC_TYPES);
export const languageSchema = z.enum(LANGUAGES);

export const explainInputSchema = z.object({ docType: docTypeSchema, pages: pagesSchema });

const flagTextSchema = z.object({
  title: z.string().max(300),
  why: z.string().max(1000),
  questions: z.array(z.string().max(400)).max(8),
});

export const translateInputSchema = z.object({
  language: languageSchema.exclude(["en"]),
  summary: z.array(z.string().max(800)).max(15),
  flags: z.array(flagTextSchema).max(20),
});

const locatedSchema = z.object({
  value: z.union([z.string().max(600), z.number(), z.boolean()]),
  clauseId: z.string().max(20),
  page: z.number().int(),
  quote: z.string().max(2000),
});

const translationSchema = z.object({ summary: z.array(z.string().max(1200)).max(15), flags: z.array(flagTextSchema).max(20) });

export const analysisContentSchema = z.object({
  docType: docTypeSchema,
  title: z.string().trim().min(1).max(160),
  pages: pagesSchema,
  fields: z.object({
    scalars: z.record(z.string().max(40), locatedSchema.nullable()),
    lists: z.record(z.string().max(40), z.array(locatedSchema).max(60)),
  }),
  summary: z.array(z.object({ text: z.string().max(800), clauseIds: z.array(z.string().max(20)).max(10) })).max(15),
  flags: z.array(z.unknown()).max(30),
  translations: z.partialRecord(languageSchema, translationSchema).default({}),
});

export const patchAnalysisSchema = z
  .object({ pinned: z.boolean().optional(), title: z.string().trim().min(1).max(160).optional() })
  .refine((v) => v.pinned !== undefined || v.title !== undefined, { message: "Nothing to change." });

export const usageInputSchema = z.object({ kind: z.enum(CLIENT_USAGE_KINDS), docType: docTypeSchema.optional() });

export const deleteEverythingSchema = z.object({ deleteAccount: z.boolean().default(false) });
