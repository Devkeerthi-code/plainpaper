"use client";

import { useEffect, useRef, useState } from "react";
import { Spring } from "@/lib/client/spring";

type Values = Record<string, number>;

/**
 * Springs a whole set of numbers towards new targets together, so a figure and its bar
 * settle as one (with a little overshoot). Keys that appear start from `fromForNew`.
 */
export function useSpringValues(target: Values, opts: { fromForNew?: number; stiffness?: number; damping?: number } = {}): Values {
  const [shown, setShown] = useState<Values>(target);
  const shownRef = useRef<Values>(target);
  const fromRef = useRef<Values>(target);
  const toRef = useRef<Values>(target);
  const springRef = useRef<Spring | null>(null);
  const { fromForNew = 0, stiffness = 170, damping = 19 } = opts;
  const signature = JSON.stringify(target);

  useEffect(() => {
    const next = JSON.parse(signature) as Values;
    const from: Values = {};
    for (const k of Object.keys(next)) from[k] = shownRef.current[k] ?? fromForNew;
    fromRef.current = from;
    toRef.current = next;
    springRef.current ??= new Spring(1, {
      stiffness,
      damping,
      precision: 0.0015,
      onUpdate: (p) => {
        const cur: Values = {};
        for (const [k, to] of Object.entries(toRef.current)) {
          const f = fromRef.current[k] ?? to;
          cur[k] = f + (to - f) * p;
        }
        shownRef.current = cur;
        setShown(cur);
      },
    });
    springRef.current.set(0);
    springRef.current.to(1);
  }, [signature, fromForNew, stiffness, damping]);

  useEffect(() => () => springRef.current?.stop(), []);
  return shown;
}
