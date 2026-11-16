import { serverEnv } from "@/lib/env";

export class AiError extends Error {
  constructor(
    message: string,
    readonly code: "unavailable" | "rate-limited" | "bad-output" | "blocked" | "not-configured",
  ) {
    super(message);
  }
}

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export interface GenerateOptions {
  system: string;
  parts: GeminiPart[];
  /** Low thinking levels keep latency predictable on the free tier. */
  thinking?: "minimal" | "low";
  timeoutMs?: number;
  maxOutputTokens?: number;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

async function callOnce(opts: GenerateOptions): Promise<Response> {
  const { GEMINI_API_KEY, GEMINI_MODEL } = serverEnv();
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 50_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: opts.parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: opts.maxOutputTokens ?? 16_384,
        thinkingConfig: { thinkingLevel: opts.thinking ?? "minimal" },
      },
    }),
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ask Gemini for JSON. Retries transient failures with backoff; never retries bad output. */
export async function generateJson(opts: GenerateOptions): Promise<unknown> {
  let response: Response | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      response = await callOnce(opts);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw new AiError(`Gemini request failed: ${(err as Error).name}`, "unavailable");
      await sleep(600 * attempt);
      continue;
    }
    if (response.ok || !RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) break;
    await sleep(800 * attempt * attempt);
  }
  if (!response) throw new AiError("Gemini request failed", "unavailable");
  if (response.status === 429) throw new AiError("Gemini quota reached", "rate-limited");
  if (!response.ok) throw new AiError(`Gemini returned ${response.status}`, "unavailable");

  const body = (await response.json()) as GeminiResponse;
  if (body.promptFeedback?.blockReason) throw new AiError("The document was blocked by the AI safety filter", "blocked");
  const candidate = body.candidates?.[0];
  const text = candidate?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new AiError(`Empty AI response (${candidate?.finishReason ?? "unknown"})`, "bad-output");
  try {
    return JSON.parse(stripFences(text));
  } catch {
    throw new AiError("AI response was not valid JSON", "bad-output");
  }
}
