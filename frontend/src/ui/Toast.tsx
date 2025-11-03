import React, { createContext, useContext, useMemo, useState } from "react";
import "./Toast.css";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; kind: ToastKind; text: string; ms?: number };

type Ctx = {
  push: (text: string, kind?: ToastKind, ms?: number) => void;
  success: (text: string, ms?: number) => void;
  error: (text: string, ms?: number) => void;
  info: (text: string, ms?: number) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  function add(text: string, kind: ToastKind = "info", ms = 3500) {
    const id = Math.random().toString(36).slice(2);
    const t: ToastItem = { id, kind, text, ms };
    setItems(prev => [...prev, t]);
    window.setTimeout(() => {
      setItems(prev => prev.filter(x => x.id !== id));
    }, ms);
  }

  const api: Ctx = useMemo(() => ({
    push: add,
    success: (t, ms) => add(t, "success", ms),
    error:   (t, ms) => add(t, "error", ms),
    info:    (t, ms) => add(t, "info", ms),
  }), []);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {items.map(it => (
          <div key={it.id} className={`toast ${it.kind}`}>
            <span className="dot" />
            <div className="text">{it.text}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
