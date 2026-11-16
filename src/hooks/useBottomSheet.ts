"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Spring } from "@/lib/client/spring";

export type SheetSnap = "full" | "half" | "peek";
const HANDLE_H = 64;
const RUBBER = 0.3;
const FLICK_PROJECTION = 0.2;

/**
 * The phone's "Original document" sheet: drag the handle with momentum, rubber-band past the
 * ends, and settle on the nearest snap point (projected from release velocity) with a spring.
 */
export function useBottomSheet(enabled: boolean) {
  const paneRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const spring = useRef<Spring | null>(null);
  const y = useRef(0);
  const drag = useRef({ down: false, moved: false, startY: 0, startSheet: 0, lastY: 0, lastT: 0, vel: 0 });

  const snaps = useCallback((): Record<SheetSnap, number> => {
    const h = paneRef.current?.offsetHeight ?? 0;
    return { full: 0, half: Math.round(h * 0.46), peek: Math.max(0, h - HANDLE_H) };
  }, []);

  const paint = useCallback(
    (v: number) => {
      y.current = v;
      paneRef.current?.style.setProperty("--sheet-y", `${v}px`);
      const open = v < snaps().peek - 2;
      handleRef.current?.setAttribute("aria-expanded", String(open));
      // A closed sheet's pages are off-screen, so keep them out of the tab order too.
      paneRef.current?.querySelector("[data-sheet-body]")?.toggleAttribute("inert", !open);
    },
    [snaps],
  );

  const nearest = useCallback(
    (value: number): SheetSnap => {
      const s = snaps();
      return (Object.keys(s) as SheetSnap[]).reduce((best, k) => (Math.abs(s[k] - value) < Math.abs(s[best] - value) ? k : best), "peek");
    },
    [snaps],
  );

  const snapTo = useCallback(
    (name: SheetSnap, onRest?: () => void, velocity?: number) => {
      if (!spring.current) return onRest?.();
      spring.current.to(snaps()[name], { onRest, velocity });
    },
    [snaps],
  );

  const position = useCallback((): SheetSnap => nearest(spring.current?.target ?? snaps().peek), [nearest, snaps]);

  useEffect(() => {
    const pane = paneRef.current;
    if (!enabled || !pane) {
      pane?.style.removeProperty("--sheet-y");
      return;
    }
    const s = new Spring(snaps().peek, { stiffness: 380, damping: 34, precision: 0.5, onUpdate: paint });
    spring.current = s;
    s.jump(snaps().peek);
    const onResize = () => {
      if (!drag.current.down) s.jump(snaps()[nearest(s.target)]);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      s.stop();
      spring.current = null;
      pane.style.removeProperty("--sheet-y");
      pane.querySelector("[data-sheet-body]")?.removeAttribute("inert");
    };
  }, [enabled, nearest, paint, snaps]);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!enabled || !spring.current) return;
    drag.current = { down: true, moved: false, startY: e.clientY, startSheet: y.current, lastY: e.clientY, lastT: performance.now(), vel: 0 };
    spring.current.set(y.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.down || !spring.current) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 5) d.moved = true;
    const now = performance.now();
    d.vel = ((e.clientY - d.lastY) / Math.max(1, now - d.lastT)) * 1000;
    d.lastY = e.clientY;
    d.lastT = now;
    const max = snaps().peek;
    let next = d.startSheet + dy;
    if (next < 0) next *= RUBBER;
    if (next > max) next = max + (next - max) * RUBBER;
    spring.current.set(next);
    paint(next);
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    if (d.moved) snapTo(nearest(y.current + d.vel * FLICK_PROJECTION), undefined, d.vel);
  };

  const onClick = () => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    if (enabled) snapTo(position() === "peek" ? "full" : "peek");
  };

  return {
    paneRef,
    handleRef,
    snapTo,
    position,
    handleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClick },
  };
}
