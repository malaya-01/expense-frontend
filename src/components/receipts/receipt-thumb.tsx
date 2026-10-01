"use client";

import { resolveAvatarUrl } from "@/lib/api/user";
import { cn } from "@/lib/cn";

export function receiptMediaUrl(url?: string | null) {
  return resolveAvatarUrl(url);
}

export function isReceiptImage(mime?: string | null) {
  return !mime || mime.startsWith("image/");
}

export function ReceiptThumb({
  url,
  mime,
  alt,
  className,
}: {
  url?: string | null;
  mime?: string | null;
  alt: string;
  className?: string;
}) {
  const src = receiptMediaUrl(url);
  if (!src) return null;
  if (!isReceiptImage(mime)) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--ds-background-100)] text-[9px] font-semibold uppercase tracking-wide text-[var(--ds-gray-800)]",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        File
      </a>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "size-10 shrink-0 rounded-[8px] object-cover",
        className,
      )}
    />
  );
}
