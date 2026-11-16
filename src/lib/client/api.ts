/** Small fetch wrapper: every failure becomes an ApiError with a calm, user-facing message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

const FALLBACK: Record<number, string> = {
  401: "Please log in to do that.",
  413: "That's more than 4 MB. Try fewer or smaller photos.",
  429: "That's a lot of requests in a short time. Please wait a minute and try again.",
};

function messageFor(status: number): string {
  return FALLBACK[status] ?? (status >= 500 ? "Something went wrong on our side. Please try again." : "That didn't work. Please try again.");
}

interface ApiInit extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit;
  /** Give up after this long so a stuck server never leaves someone waiting forever. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export async function api<T>(url: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward);
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: json !== undefined ? { "content-type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch (err) {
    if (timedOut) throw new ApiError(0, "This is taking much longer than usual. Please try again in a minute.", "timeout");
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "We couldn't reach PlainPaper. Check your connection and try again.", "network");
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = data as { error?: unknown; code?: unknown } | null;
    const message = typeof body?.error === "string" ? body.error : messageFor(res.status);
    const code = typeof body?.code === "string" ? body.code : String(res.status);
    throw new ApiError(res.status, message, code);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
