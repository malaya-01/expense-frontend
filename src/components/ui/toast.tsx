"use client";

import { useCallback } from "react";
import {
  Check,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { getAppStore } from "@/lib/store/store-ref";
import {
  dismissToast,
  showToast as showToastAction,
  type ToastInput,
  type ToastTone,
} from "@/lib/store/slices/uiSlice";

const toneStyles: Record<
  ToastTone,
  { icon: typeof Check; iconClass: string; progressClass: string }
> = {
  success: {
    icon: Check,
    iconClass:
      "bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] text-[var(--ds-status-green)]",
    progressClass: "bg-[var(--ds-status-green)]",
  },
  error: {
    icon: CircleAlert,
    iconClass:
      "bg-[color-mix(in_srgb,var(--ds-status-red)_12%,transparent)] text-[var(--ds-status-red)]",
    progressClass: "bg-[var(--ds-status-red)]",
  },
  warning: {
    icon: TriangleAlert,
    iconClass: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    progressClass: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconClass:
      "bg-[color-mix(in_srgb,var(--ds-focus-color)_12%,transparent)] text-[var(--ds-focus-color)]",
    progressClass: "bg-[var(--ds-focus-color)]",
  },
};

export function ToastViewport() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.ui.toasts);

  return (
    <div
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-3 bottom-20 z-[200] flex flex-col items-end gap-2.5 sm:left-auto sm:right-4 sm:w-[380px] md:bottom-4"
    >
      {items.map((item) => {
        const tone = item.tone ?? "info";
        const style = toneStyles[tone];
        const Icon = style.icon;
        const duration = item.duration ?? (tone === "error" ? 7000 : 4500);

        return (
          <div
            key={item.id}
            role={tone === "error" ? "alert" : "status"}
            className="group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] bg-[color-mix(in_srgb,var(--ds-background-elevated)_94%,transparent)] p-3.5 pr-11 shadow-[0_16px_45px_-18px_color-mix(in_srgb,var(--ds-gray-1000)_38%,transparent)] backdrop-blur-xl ds-toast-enter"
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-xl",
                style.iconClass,
              )}
            >
              <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold leading-5 tracking-[-0.01em] text-[var(--ds-gray-1000)]">
                {item.title}
              </p>
              {item.description ? (
                <p className="mt-0.5 text-xs leading-[1.55] text-[var(--ds-gray-700)]">
                  {item.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dispatch(dismissToast(item.id))}
              aria-label="Dismiss notification"
              className="absolute right-2.5 top-2.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--ds-gray-700)] opacity-70 transition hover:bg-[var(--ds-gray-100)] hover:opacity-100 ds-focus"
            >
              <X size={14} />
            </button>
            <span
              aria-hidden="true"
              className={cn(
                "ds-toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-70",
                style.progressClass,
              )}
              style={{ animationDuration: `${duration}ms` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function useToast() {
  const dispatch = useAppDispatch();
  const showToast = useCallback(
    (toast: ToastInput) => {
      dispatch(showToastAction(toast));
    },
    [dispatch],
  );
  const dismiss = useCallback(
    (id: string) => {
      dispatch(dismissToast(id));
    },
    [dispatch],
  );

  return {
    showToast,
    dismissToast: dismiss,
    success: (title: string, description?: string) => {
      dispatch(showToastAction({ title, description, tone: "success" }));
    },
    error: (title: string, description?: string) => {
      dispatch(showToastAction({ title, description, tone: "error" }));
    },
    warning: (title: string, description?: string) => {
      dispatch(showToastAction({ title, description, tone: "warning" }));
    },
    info: (title: string, description?: string) => {
      dispatch(showToastAction({ title, description, tone: "info" }));
    },
  };
}

function dispatchToast(input: ToastInput) {
  getAppStore()?.dispatch(showToastAction(input));
}

export const toast = {
  show: dispatchToast,
  success: (title: string, description?: string) =>
    dispatchToast({ title, description, tone: "success" }),
  error: (title: string, description?: string) =>
    dispatchToast({ title, description, tone: "error" }),
  warning: (title: string, description?: string) =>
    dispatchToast({ title, description, tone: "warning" }),
  info: (title: string, description?: string) =>
    dispatchToast({ title, description, tone: "info" }),
};
