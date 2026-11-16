"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { prefersReducedMotion } from "@/lib/client/spring";
import type { ClauseMap } from "@/lib/client/present";

export interface Lit {
  clauseId: string;
  quote: string | null;
  nonce: number;
}

interface ReadingCtx {
  clauseMap: ClauseMap;
  lit: Lit | null;
  isMobile: boolean;
  sheet: ReturnType<typeof useBottomSheet>;
  docScrollRef: RefObject<HTMLDivElement | null>;
  plainRef: RefObject<HTMLDivElement | null>;
  openFlags: ReadonlySet<number>;
  toggleFlag: (index: number, open?: boolean) => void;
  light: (clauseId: string, quote?: string | null) => void;
  showInOriginal: (clauseId: string, quote?: string | null) => void;
  showInPlain: (clauseId: string) => void;
}

const Ctx = createContext<ReadingCtx | null>(null);
const SCROLL_OFFSET = 72;

/** Waits for a smooth scroll to land before the pen pass, so the sweep is seen. */
function afterScroll(el: HTMLElement | Window, distance: number, cb: () => void) {
  if (distance < 4 || prefersReducedMotion()) return cb();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.removeEventListener("scrollend", finish);
    cb();
  };
  el.addEventListener("scrollend", finish);
  window.setTimeout(finish, 600);
}

function flash(el: Element) {
  el.classList.remove("is-lit-plain");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("is-lit-plain");
  window.setTimeout(() => el.classList.remove("is-lit-plain"), 1400);
}

export function ReadingProvider({ clauseMap, children }: { clauseMap: ClauseMap; children: ReactNode }) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const sheet = useBottomSheet(isMobile);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const plainRef = useRef<HTMLDivElement>(null);
  const nonce = useRef(0);
  const [lit, setLit] = useState<Lit | null>(null);
  const [openFlags, setOpenFlags] = useState<ReadonlySet<number>>(new Set());

  const light = useCallback((clauseId: string, quote: string | null = null) => {
    setLit({ clauseId, quote, nonce: ++nonce.current });
  }, []);

  const toggleFlag = useCallback((index: number, open?: boolean) => {
    setOpenFlags((prev) => {
      const next = new Set(prev);
      const want = open ?? !next.has(index);
      if (want) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);

  const showInOriginal = useCallback(
    (clauseId: string, quote: string | null = null) => {
      const run = () => {
        const scroller = docScrollRef.current;
        const el = document.getElementById(`clause-${clauseId}`);
        if (!scroller || !el) return;
        const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - SCROLL_OFFSET;
        const distance = Math.abs(scroller.scrollTop - top);
        scroller.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        afterScroll(scroller, distance, () => {
          light(clauseId, quote);
          el.focus({ preventScroll: true });
        });
      };
      if (isMobile && sheet.position() === "peek") sheet.snapTo("half", run);
      else run();
    },
    [isMobile, light, sheet],
  );

  const showInPlain = useCallback(
    (clauseId: string) => {
      light(clauseId);
      const target = plainRef.current?.querySelector(`[data-refs~="${clauseId}"]`);
      if (!target) {
        toast("Nothing in the plain reading points to this part. It's usually standard wording.", { type: "info" });
        return;
      }
      const smooth = prefersReducedMotion() ? "auto" : "smooth";
      if (isMobile) {
        sheet.snapTo("peek");
        const bar = document.querySelector(".docbar")?.getBoundingClientRect().bottom ?? 0;
        const top = target.getBoundingClientRect().top + window.scrollY - bar - SCROLL_OFFSET;
        window.scrollTo({ top, behavior: smooth });
      } else {
        const pane = plainRef.current?.closest(".plain-pane");
        if (pane) {
          const top = target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - SCROLL_OFFSET - 24;
          pane.scrollTo({ top, behavior: smooth });
        }
      }
      window.setTimeout(() => flash(target), prefersReducedMotion() ? 0 : 280);
    },
    [isMobile, light, sheet, toast],
  );

  const value = useMemo<ReadingCtx>(
    () => ({ clauseMap, lit, isMobile, sheet, docScrollRef, plainRef, openFlags, toggleFlag, light, showInOriginal, showInPlain }),
    [clauseMap, lit, isMobile, sheet, openFlags, toggleFlag, light, showInOriginal, showInPlain],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReading(): ReadingCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReading must be used inside ReadingProvider");
  return ctx;
}
