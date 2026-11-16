/**
 * Field-level accuracy on the six fictional sample documents.
 * Runs the real pipeline: PDF -> layout text -> clauses -> Gemini -> zod + quote checks -> flag rules.
 * Run: npm run samples:pdf && npm run eval   (needs GEMINI_API_KEY in .env)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { explainDocument } from "@/lib/ai/pipeline";
import { normalizeForMatch } from "@/lib/documents/segment";
import { classifyUpload, readDocument } from "@/lib/documents/ingest";
import type { AnalysisContent, DocType, Scalar } from "@/lib/documents/types";
import { CATALOG } from "@/lib/extraction/catalog";

type Expected = Scalar | null | (Scalar | null)[];
interface ExpectedFile {
  docType: DocType;
  scalars: Record<string, Expected>;
  lists: Record<string, number>;
  flags: string[];
}

interface FieldResult {
  key: string;
  expected: Expected;
  actual: Scalar | null;
  ok: boolean;
}

function matches(expected: Scalar | null, actual: Scalar | null): boolean {
  if (expected === null) return actual === null;
  if (actual === null) return false;
  if (typeof expected === "number") return typeof actual === "number" && Math.abs(actual - expected) <= Math.max(1, expected * 0.005);
  if (typeof expected === "string" && typeof actual === "string") {
    return normalizeForMatch(actual).includes(normalizeForMatch(expected));
  }
  return expected === actual;
}

function score(content: AnalysisContent, expected: ExpectedFile) {
  const fields: FieldResult[] = [];
  for (const def of CATALOG[expected.docType].scalars) {
    if (!(def.key in expected.scalars)) continue;
    const exp = expected.scalars[def.key] ?? null;
    const actual = content.fields.scalars[def.key]?.value ?? null;
    const ok = Array.isArray(exp) ? exp.some((e) => matches(e, actual)) : matches(exp, actual);
    fields.push({ key: def.key, expected: exp, actual, ok });
  }
  for (const [key, count] of Object.entries(expected.lists)) {
    const actual = content.fields.lists[key]?.length ?? 0;
    fields.push({ key: `${key} (count)`, expected: count, actual, ok: actual === count });
  }
  const gotFlags = new Set(content.flags.map((f) => f.ruleId));
  const wantFlags = new Set(expected.flags);
  const truePos = [...wantFlags].filter((f) => gotFlags.has(f)).length;
  const linked = Object.values(content.fields.scalars).filter(Boolean).length;
  return {
    fields,
    correct: fields.filter((f) => f.ok).length,
    total: fields.length,
    flags: { expected: [...wantFlags], got: [...gotFlags], truePos },
    linkedFields: linked,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const samplesDir = path.join(process.cwd(), "public", "samples");
  const expectedDir = path.join(process.cwd(), "eval", "expected");
  const rows: string[] = [];
  const all: unknown[] = [];
  let correct = 0;
  let total = 0;
  let flagTp = 0;
  let flagWant = 0;
  let flagGot = 0;

  for (const file of readdirSync(expectedDir).filter((f) => f.endsWith(".json"))) {
    const name = file.replace(".json", "");
    const expected = JSON.parse(readFileSync(path.join(expectedDir, file), "utf8")) as ExpectedFile;
    const bytes = new Uint8Array(readFileSync(path.join(samplesDir, `${name}.pdf`)));
    const started = Date.now();
    const { pages, detection } = await readDocument(classifyUpload([bytes]));
    const { content, dropped } = await explainDocument(expected.docType, pages);
    const s = score(content, expected);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    correct += s.correct;
    total += s.total;
    flagTp += s.flags.truePos;
    flagWant += s.flags.expected.length;
    flagGot += s.flags.got.length;
    const typeOk = detection.docType === expected.docType ? "yes" : `no (${detection.docType})`;
    rows.push(`| ${name} | ${typeOk} | ${s.correct}/${s.total} | ${s.flags.truePos}/${s.flags.expected.length} expected, ${s.flags.got.length} raised | ${dropped.length} | ${seconds}s |`);
    for (const f of s.fields.filter((x) => !x.ok)) console.log(`  ✗ ${name}.${f.key}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`);
    all.push({ name, detection, score: s, dropped, summary: content.summary });
    console.log(`${name}: ${s.correct}/${s.total} fields, type detected: ${typeOk}`);
    await sleep(1500);
  }

  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "n/a");
  const report = [
    `Run on ${new Date().toISOString().slice(0, 10)} with ${process.env.GEMINI_MODEL ?? "gemini-3.5-flash"}.`,
    "",
    "| Sample | Type detected | Fields correct | Flags | Values dropped by checks | Time |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
    `**Field-level accuracy: ${correct}/${total} (${pct(correct, total)})**. Correct "not stated" (null) answers count as correct.`,
    `**Flag recall: ${flagTp}/${flagWant} (${pct(flagTp, flagWant)}), precision: ${flagTp}/${flagGot} (${pct(flagTp, flagGot)})**.`,
  ].join("\n");

  mkdirSync(path.join(process.cwd(), "eval", "results"), { recursive: true });
  writeFileSync(path.join(process.cwd(), "eval", "results", "latest.json"), JSON.stringify(all, null, 2));
  writeFileSync(path.join(process.cwd(), "eval", "RESULTS.md"), `# Evaluation results\n\n${report}\n`);
  console.log(`\n${report}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
