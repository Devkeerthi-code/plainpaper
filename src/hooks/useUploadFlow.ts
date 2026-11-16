"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import type { AnalysisContent, DocType, Page } from "@/lib/documents/types";
import { api, errorMessage, isAbort } from "@/lib/client/api";
import { saveSessionReading, StorageFullError } from "@/lib/client/session-store";
import { checkSelection, describeFiles, prepareFiles, UploadProblem } from "@/lib/client/upload";
import { trackUsage } from "@/lib/client/usage";

interface ReadResponse {
  pages: Page[];
  detection: { docType: DocType | null; confidence: number };
  usedOcr: boolean;
}

interface ExplainResponse {
  content: AnalysisContent;
  droppedCount: number;
}

export type FlowStage =
  | { kind: "idle" }
  | { kind: "reading"; fileLabel: string; photos: boolean; pageCount: number }
  | { kind: "confirm"; fileLabel: string; pages: Page[]; detected: DocType | null; usedOcr: boolean; error: string | null }
  | { kind: "explaining"; fileLabel: string; pages: Page[]; docType: DocType };

/** Upload → read → confirm the type → explain → open the reading. One request at a time. */
export function useUploadFlow(loggedIn: boolean) {
  const router = useRouter();
  const toast = useToast();
  const [stage, setStage] = useState<FlowStage>({ kind: "idle" });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const cancel = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setStage({ kind: "idle" });
  }, []);

  const start = useCallback(
    async (files: File[], label?: string) => {
      if (abort.current) return;
      let photos: boolean;
      try {
        photos = checkSelection(files) === "photos";
      } catch (err) {
        toast(err instanceof UploadProblem ? err.message : "That file can't be read.", { type: "error" });
        return;
      }
      if (!loggedIn) trackUsage("guest_start");
      const fileLabel = label ?? describeFiles(files);
      const controller = new AbortController();
      abort.current = controller;
      setStage({ kind: "reading", fileLabel, photos, pageCount: photos ? files.length : 0 });
      try {
        const ready = await prepareFiles(files);
        const form = new FormData();
        for (const f of ready) form.append("files", f);
        const res = await api<ReadResponse>("/api/documents/read", { method: "POST", body: form, signal: controller.signal, timeoutMs: 75_000 });
        setStage({ kind: "confirm", fileLabel, pages: res.pages, detected: res.detection.docType, usedOcr: res.usedOcr, error: null });
      } catch (err) {
        if (isAbort(err)) return;
        toast(err instanceof UploadProblem ? err.message : errorMessage(err), { type: "error" });
        setStage({ kind: "idle" });
      } finally {
        if (abort.current === controller) abort.current = null;
      }
    },
    [loggedIn, toast],
  );

  const explain = useCallback(
    async (docType: DocType) => {
      if (stage.kind !== "confirm" || abort.current) return;
      const { fileLabel, pages, detected, usedOcr } = stage;
      const controller = new AbortController();
      abort.current = controller;
      setStage({ kind: "explaining", fileLabel, pages, docType });
      try {
        const res = await api<ExplainResponse>("/api/documents/explain", { method: "POST", json: { docType, pages }, signal: controller.signal, timeoutMs: 75_000 });
        const localId = saveSessionReading(res.content);
        router.push(`/read/session/${localId}`);
        toast(
          res.droppedCount > 0
            ? `Done. ${res.droppedCount} detail${res.droppedCount === 1 ? " was" : "s were"} left out because we couldn't find ${res.droppedCount === 1 ? "it" : "them"} word for word in your document.`
            : "Done. Your file has been deleted; only the text is shown here.",
          { type: res.droppedCount > 0 ? "info" : "ok", duration: 7000 },
        );
      } catch (err) {
        if (isAbort(err)) return;
        const message = err instanceof StorageFullError ? err.message : errorMessage(err);
        setStage({ kind: "confirm", fileLabel, pages, detected, usedOcr, error: message });
      } finally {
        if (abort.current === controller) abort.current = null;
      }
    },
    [router, stage, toast],
  );

  return { stage, start, explain, cancel };
}
