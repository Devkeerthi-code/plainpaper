"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { Spring } from "@/lib/client/spring";

export interface SegOption<T extends string> {
  value: T;
  label: string;
  lang?: string;
  className?: string;
}

interface Props<T extends string> {
  label: string;
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "lg";
  disabled?: boolean;
  className?: string;
}

/** A radio group whose highlight slides on a spring. Arrow keys move the choice, as radios do. */
export function SegmentedControl<T extends string>({ label, options, value, onChange, size = "md", disabled, className = "" }: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const springs = useRef<{ x: Spring; w: Spring } | null>(null);

  const place = useCallback((instant: boolean) => {
    const btn = root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    const s = springs.current;
    if (!btn || !s || !btn.offsetWidth) return;
    if (instant) {
      s.x.jump(btn.offsetLeft);
      s.w.jump(btn.offsetWidth);
    } else {
      s.x.to(btn.offsetLeft);
      s.w.to(btn.offsetWidth);
    }
    const r = root.current;
    if (r && r.scrollWidth > r.clientWidth) {
      r.scrollTo({ left: btn.offsetLeft - (r.clientWidth - btn.offsetWidth) / 2, behavior: instant ? "auto" : "smooth" });
    }
  }, []);

  useEffect(() => {
    const v = { x: 0, w: 0 };
    const paint = () => {
      if (!thumb.current) return;
      thumb.current.style.transform = `translateX(${v.x}px)`;
      thumb.current.style.width = `${v.w}px`;
    };
    const x = new Spring(0, { stiffness: 520, damping: 38, precision: 0.1, onUpdate: (n) => ((v.x = n), paint()) });
    const w = new Spring(0, { stiffness: 520, damping: 38, precision: 0.1, onUpdate: (n) => ((v.w = n), paint()) });
    springs.current = { x, w };
    place(true);
    const onResize = () => place(true);
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(() => place(true));
    return () => {
      window.removeEventListener("resize", onResize);
      x.stop();
      w.stop();
    };
  }, [place]);

  const first = useRef(true);
  useLayoutEffect(() => {
    place(first.current);
    first.current = false;
  }, [value, place]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(i + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    root.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[options.indexOf(next)]?.focus();
  };

  return (
    <div ref={root} className={`seg${size === "lg" ? " seg-lg" : ""} ${className}`} role="radiogroup" aria-label={label} aria-disabled={disabled || undefined}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          lang={o.lang}
          className={o.className}
          disabled={disabled}
          onClick={() => o.value !== value && onChange(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
        </button>
      ))}
      <span ref={thumb} className="seg-thumb" aria-hidden="true" />
    </div>
  );
}
