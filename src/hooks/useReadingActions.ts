"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import type { AnalysisContent, Language, SavedAnalysis, Translation } from "@/lib/documents/types";
import { daysLeft } from "@/lib/privacy/retention";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { cacheSessionTranslation, removeSessionReading } from "@/lib/client/session-store";
import { translationRequest } from "@/lib/client/localize";

export type ReadingSource =
  | { kind: "session"; localId: string }
  | { kind: "saved"; id: string; pinned: boolean; expiresAt: string | null };

export function readingRef(source: ReadingSource): string {
  return source.kind === "session" ? `session-${source.localId}` : source.id;
}

export function keepLine(pinned: boolean, expiresAt: string | null): string {
  if (pinned) return "Pinned — kept until you delete it.";
  const days = daysLeft(expiresAt ? new Date(expiresAt) : null, new Date());
  if (days === null) return "Kept until you delete it.";
  return days <= 1 ? "Deleted automatically within a day." : `Deleted automatically in ${days} days.`;
}

/** Save / pin / delete for a reading, each guarded against double submits. */
export function useReadingActions(source: ReadingSource, content: AnalysisContent) {
  const router = useRouter();
  const toast = useToast();
  const [pinned, setPinned] = useState(source.kind === "saved" && source.pinned);
  const [expiresAt, setExpiresAt] = useState(source.kind === "saved" ? source.expiresAt : null);
  const [pending, setPending] = useState<"save" | "pin" | "delete" | null>(null);

  const loginPrompt = useCallback(
    (next: string) =>
      toast("Log in to save readings. This one stays in this tab while you do.", {
        type: "info",
        action: { label: "Log in", onClick: () => router.push(`/login?next=${encodeURIComponent(next)}`) },
        duration: 9000,
      }),
    [router, toast],
  );

  const save = useCallback(async () => {
    if (source.kind !== "session" || pending) return;
    setPending("save");
    try {
      const { user } = await api<{ user: unknown }>("/api/auth/me");
      if (!user) {
        loginPrompt(`/read/session/${source.localId}`);
        setPending(null);
        return;
      }
      const { analysis } = await api<{ analysis: SavedAnalysis }>("/api/analyses", { method: "POST", json: content });
      removeSessionReading(source.localId);
      router.replace(`/read/${analysis.id}`);
      toast("Saved to your readings. It's deleted automatically in 30 days unless you pin it.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) loginPrompt(`/read/session/${source.localId}`);
      else toast(errorMessage(err), { type: "error" });
      setPending(null);
    }
  }, [content, loginPrompt, pending, router, source, toast]);

  const togglePin = useCallback(async () => {
    if (source.kind !== "saved" || pending) return;
    setPending("pin");
    try {
      const { analysis } = await api<{ analysis: SavedAnalysis }>(`/api/analyses/${source.id}`, { method: "PATCH", json: { pinned: !pinned } });
      setPinned(analysis.pinned);
      setExpiresAt(analysis.expiresAt);
      toast(analysis.pinned ? "Pinned. This reading won't be deleted on its own." : "Unpinned. It will be deleted automatically in 30 days.");
    } catch (err) {
      toast(errorMessage(err), { type: "error" });
    } finally {
      setPending(null);
    }
  }, [pending, pinned, source, toast]);

  const remove = useCallback(async () => {
    if (pending) return;
    if (source.kind === "session") {
      removeSessionReading(source.localId);
      router.push("/");
      toast("Removed. Nothing from this document is kept anywhere.");
      return;
    }
    setPending("delete");
    try {
      await api(`/api/analyses/${source.id}`, { method: "DELETE" });
      router.push("/readings");
      router.refresh();
      toast("Deleted. The text of this document is gone from our servers.");
    } catch (err) {
      toast(errorMessage(err), { type: "error" });
      setPending(null);
    }
  }, [pending, router, source, toast]);

  return { pinned, expiresAt, pending, save, togglePin, remove };
}

/** Fetches a translation once per language and caches it with the reading. */
export function useTranslations(source: ReadingSource, content: AnalysisContent) {
  const toast = useToast();
  const [translations, setTranslations] = useState(content.translations);
  const [lang, setLang] = useState<Language>("en");
  const [pendingLang, setPendingLang] = useState<Language | null>(null);

  const choose = useCallback(
    async (next: Language) => {
      if (pendingLang) return;
      if (next === "en" || translations[next]) return setLang(next);
      setPendingLang(next);
      try {
        const body = { language: next, ...translationRequest(content), ...(source.kind === "saved" ? { analysisId: source.id } : {}) };
        const { translation } = await api<{ translation: Translation }>("/api/documents/translate", { method: "POST", json: body, timeoutMs: 75_000 });
        setTranslations((t) => ({ ...t, [next]: translation }));
        if (source.kind === "session") cacheSessionTranslation(source.localId, next, translation);
        setLang(next);
      } catch (err) {
        toast(errorMessage(err), { type: "error" });
      } finally {
        setPendingLang(null);
      }
    },
    [content, pendingLang, source, toast, translations],
  );

  return { lang, pendingLang, translations, choose };
}
