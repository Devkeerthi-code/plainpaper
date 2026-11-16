"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Live media-query match. Server and first client render assume `false`. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const MOBILE_QUERY = "(max-width: 899px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
