import type { AnalysisContent, Language, Translation } from "@/lib/documents/types";

/**
 * "Try without an account" readings live only in this tab's sessionStorage.
 *
 *   plainpaper:readings          -> string[] of local ids, newest first
 *   plainpaper:reading:<localId> -> StoredReading (JSON)
 *
 * Closing the tab clears them; nothing reaches the server unless the user saves.
 */
export interface StoredReading {
  v: 1;
  localId: string;
  createdAt: string;
  content: AnalysisContent;
}

export interface SessionReadingSummary {
  localId: string;
  title: string;
  docType: AnalysisContent["docType"];
  createdAt: string;
  flagCount: number;
}

const INDEX_KEY = "plainpaper:readings";
const itemKey = (id: string) => `plainpaper:reading:${id}`;
const MAX_READINGS = 12;

export class StorageFullError extends Error {
  constructor() {
    super("This tab is out of space for readings. Remove an older reading, or log in to save them.");
  }
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function readIndex(store: Storage): string[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function newLocalId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function saveSessionReading(content: AnalysisContent): string {
  const store = storage();
  if (!store) throw new StorageFullError();
  const localId = newLocalId();
  const record: StoredReading = { v: 1, localId, createdAt: new Date().toISOString(), content };
  const index = [localId, ...readIndex(store)];
  for (const old of index.splice(MAX_READINGS)) store.removeItem(itemKey(old));
  try {
    store.setItem(itemKey(localId), JSON.stringify(record));
    store.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    throw new StorageFullError();
  }
  return localId;
}

export function getSessionReading(localId: string): StoredReading | null {
  const raw = storage()?.getItem(itemKey(localId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredReading;
    return parsed?.v === 1 && parsed.content ? parsed : null;
  } catch {
    return null;
  }
}

export function listSessionReadings(): SessionReadingSummary[] {
  const store = storage();
  if (!store) return [];
  return readIndex(store)
    .map(getSessionReading)
    .filter((r): r is StoredReading => r !== null)
    .map((r) => ({
      localId: r.localId,
      title: r.content.title,
      docType: r.content.docType,
      createdAt: r.createdAt,
      flagCount: r.content.flags.length,
    }));
}

export function removeSessionReading(localId: string): void {
  const store = storage();
  if (!store) return;
  store.removeItem(itemKey(localId));
  store.setItem(INDEX_KEY, JSON.stringify(readIndex(store).filter((id) => id !== localId)));
}

export function cacheSessionTranslation(localId: string, language: Language, translation: Translation): void {
  const record = getSessionReading(localId);
  if (!record) return;
  record.content.translations = { ...record.content.translations, [language]: translation };
  try {
    storage()?.setItem(itemKey(localId), JSON.stringify(record));
  } catch {
    // Out of space: the translation still works for this view, it just won't be cached.
  }
}
