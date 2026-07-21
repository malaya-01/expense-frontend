"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "info" | "error";
type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{
  showToast: (toast: ToastInput) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-20 z-[150] flex flex-col items-end gap-2 md:bottom-4"
      >
        {items.map((item) => {
          const Icon =
            item.tone === "error"
              ? TriangleAlert
              : item.tone === "info"
                ? Info
                : CheckCircle2;
          return (
            <div
              key={item.id}
              role={item.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[12px] bg-[var(--ds-background-elevated)] p-3.5 ds-border-menu ds-strong-border ds-toast-enter"
            >
              <Icon
                size={18}
                className={cn(
                  "mt-0.5 shrink-0",
                  item.tone === "error"
                    ? "text-[var(--ds-status-red)]"
                    : item.tone === "info"
                      ? "text-[var(--ds-focus-color)]"
                      : "text-[var(--ds-status-green)]",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-5 text-[var(--ds-gray-700)]">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="flex size-7 shrink-0 items-center justify-center rounded-[7px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
