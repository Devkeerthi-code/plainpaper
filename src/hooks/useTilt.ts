"use client";

import { useEffect, useRef } from "react";
import { Spring } from "@/lib/client/spring";

/**
 * The drop sheet leans toward the cursor and lifts when a file hovers over it.
 * Fine pointers only; touch devices keep it flat.
 */
export function useTilt<Zone extends HTMLElement, Target extends HTMLElement>() {
  const zoneRef = useRef<Zone>(null);
  const targetRef = useRef<Target>(null);
  const lift = useRef<(px: number, velocity?: number) => void>(() => undefined);

  useEffect(() => {
    const zone = zoneRef.current;
    const target = targetRef.current;
    if (!zone || !target) return;
    const v = { rx: 0, ry: 0, lift: 0 };
    const paint = () => {
      target.style.setProperty("--rx", `${v.rx.toFixed(2)}deg`);
      target.style.setProperty("--ry", `${v.ry.toFixed(2)}deg`);
      target.style.setProperty("--lift", `${v.lift.toFixed(2)}px`);
    };
    const rx = new Spring(0, { stiffness: 120, damping: 14, onUpdate: (x) => ((v.rx = x), paint()) });
    const ry = new Spring(0, { stiffness: 120, damping: 14, onUpdate: (x) => ((v.ry = x), paint()) });
    const up = new Spring(0, { stiffness: 260, damping: 18, precision: 0.05, onUpdate: (x) => ((v.lift = x), paint()) });
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    lift.current = (px, velocity) => up.to(px, { velocity });

    const onMove = (e: PointerEvent) => {
      if (!fine.matches) return;
      const r = target.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry.to(px * 7);
      rx.to(-py * 5);
      up.to(6);
    };
    const onLeave = () => {
      rx.to(0);
      ry.to(0);
      up.to(0);
    };
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerleave", onLeave);
    return () => {
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerleave", onLeave);
      [rx, ry, up].forEach((s) => s.stop());
    };
  }, []);

  return { zoneRef, targetRef, lift };
}
