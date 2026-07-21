"use client";

import { useRef, type ReactNode } from "react";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/cn";

const DEFAULT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,application/json";

export function FileDropzone({
  onFiles,
  disabled,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  className,
  children,
}: {
  onFiles: (files: FileList) => void;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[8px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] disabled:opacity-40 ds-focus",
          className,
        )}
        aria-label="Attach file"
      >
        {children || <Paperclip size={16} />}
      </button>
    </>
  );
}
