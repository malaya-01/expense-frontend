"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Expand, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function ReceiptPreviewStage({
  src,
  alt,
  className,
  fill = false,
  caption,
  onRemove,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  caption?: string;
  onRemove?: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setZoomed(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [zoomed]);

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden",
          fill ? "absolute inset-0 h-full min-h-0" : "rounded-[18px]",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="group relative block h-full w-full text-left ds-focus"
          aria-label="Enlarge receipt"
        >
          <div
            className={cn(
              "receipt-stage relative overflow-hidden",
              fill
                ? "flex h-full min-h-0 items-center justify-center rounded-none"
                : "min-h-[220px] rounded-[18px] sm:min-h-[280px] lg:min-h-[360px]",
            )}
          >
            <div className="receipt-stage-grid pointer-events-none absolute inset-0 opacity-40" />
            {/* Local preview only — never uploaded for storage. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className={cn(
                "relative z-[1] mx-auto object-contain",
                fill
                  ? "h-auto max-h-full max-w-full p-6 sm:p-8 lg:p-10"
                  : "w-full max-h-[46vh] p-5 sm:max-h-[52vh] sm:p-6 lg:max-h-none lg:min-h-[320px]",
              )}
            />
            <span className="absolute left-3 top-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
              <Expand size={12} />
              View full
            </span>
            {caption ? (
              <span className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-10 text-left text-[11px] leading-4 text-white/70">
                {caption}
              </span>
            ) : null}
          </div>
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove receipt"
            className="absolute right-3 top-3 z-[3] flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black ds-focus"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
      {zoomed && typeof document !== "undefined"
        ? createPortal(
            <div
              data-nested-overlay
              className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-10"
            >
              <button
                type="button"
                aria-label="Close receipt preview"
                className="receipt-lightbox-backdrop absolute inset-0"
                onClick={() => setZoomed(false)}
              />
              <figure className="receipt-lightbox-glass relative z-10 w-max max-w-[min(420px,calc(100vw-2rem))]">
                <button
                  type="button"
                  onClick={() => setZoomed(false)}
                  aria-label="Close"
                  className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 ds-focus"
                >
                  <X size={16} />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  className="block max-h-[min(88dvh,920px)] w-auto max-w-full object-contain"
                />
              </figure>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
