"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastItem, type ToastData, type ToastOptions } from "./ToastItem";

type Notify = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<Notify | null>(null);
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(1);

  const notify = useCallback<Notify>((message, options = {}) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, message, ...options }]);
  }, []);

  const remove = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
