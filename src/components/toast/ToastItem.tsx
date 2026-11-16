"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Spring } from "@/lib/client/spring";

export interface ToastOptions {
  type?: "ok" | "info" | "error";
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export interface ToastData extends ToastOptions {
  id: number;
  message: string;
}

const ICONS = {
  ok: <path d="M5 12.5 10 17l9-10" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  error: (
    <>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
};

const FLICK_DISTANCE = 90;
const FLICK_SPEED = 700;

/** Springs up into place; drag sideways and let go to flick it away. */
export function ToastItem({ toast, onDone }: { toast: ToastData; onDone: (id: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 28 });
  const springs = useRef<{ x: Spring; y: Spring } | null>(null);
  const timer = useRef<number>(0);
  const drag = useRef({ on: false, startX: 0, lastX: 0, lastT: 0, vel: 0 });
  const type = toast.type ?? "ok";

  const paint = useCallback(() => {
    const node = el.current;
    if (!node) return;
    node.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
    node.style.opacity = String(Math.max(0, 1 - Math.abs(pos.current.x) / 260));
  }, []);

  useEffect(() => {
    const x = new Spring(0, { stiffness: 300, damping: 28, precision: 0.5, onUpdate: (v) => ((pos.current.x = v), paint()) });
    const y = new Spring(28, { stiffness: 420, damping: 30, precision: 0.2, onUpdate: (v) => ((pos.current.y = v), paint()) });
    springs.current = { x, y };
    paint();
    y.to(0);
    timer.current = window.setTimeout(() => onDone(toast.id), toast.duration ?? 5200);
    return () => {
      window.clearTimeout(timer.current);
      x.stop();
      y.stop();
    };
  }, [onDone, paint, toast.duration, toast.id]);

  const restartTimer = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onDone(toast.id), ms);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { on: true, startX: e.clientX - pos.current.x, lastX: e.clientX, lastT: performance.now(), vel: 0 };
    window.clearTimeout(timer.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on || !springs.current) return;
    const now = performance.now();
    d.vel = ((e.clientX - d.lastX) / Math.max(1, now - d.lastT)) * 1000;
    d.lastX = e.clientX;
    d.lastT = now;
    pos.current.x = e.clientX - d.startX;
    springs.current.x.set(pos.current.x);
    paint();
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (!d.on || !springs.current) return;
    d.on = false;
    const x = pos.current.x;
    if (Math.abs(x) > FLICK_DISTANCE || Math.abs(d.vel) > FLICK_SPEED) {
      const dir = x + d.vel * 0.1 > 0 ? 1 : -1;
      springs.current.x.to(dir * 420, { velocity: d.vel, onRest: () => onDone(toast.id) });
    } else {
      springs.current.x.to(0, { velocity: d.vel });
      restartTimer(3000);
    }
  };

  return (
    <div
      ref={el}
      className={`toast${type === "error" ? " is-error" : ""}`}
      role={type === "error" ? "alert" : "status"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="toast-icon" viewBox="0 0 24 24" aria-hidden="true">
        {ICONS[type]}
      </svg>
      <span className="toast-msg">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action?.onClick();
            onDone(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDone(toast.id)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
