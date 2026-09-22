"use client";

import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/cn";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  "aria-label"?: string;
};

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  id = "otp",
  "aria-label": ariaLabel = "One-time code",
}: OtpInputProps) {
  const digits = Array.from({ length }, (_, i) => value[i] || "");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!autoFocus) return;
    refs.current[0]?.focus();
  }, [autoFocus]);

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, length));
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setDigit(index, "");
      return;
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, length - index).split("");
      const next = digits.slice();
      chars.forEach((ch, offset) => {
        next[index + offset] = ch;
      });
      onChange(next.join("").slice(0, length));
      const focusAt = Math.min(index + chars.length, length - 1);
      refs.current[focusAt]?.focus();
      return;
    }

    setDigit(index, cleaned);
    if (index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigit(index, "");
        return;
      }
      if (index > 0) {
        e.preventDefault();
        setDigit(index - 1, "");
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length) - 1]?.focus();
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center justify-between gap-2 sm:gap-2.5"
    >
      {digits.map((digit, index) => (
        <input
          key={`${id}-${index}`}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "h-12 w-10 shrink-0 rounded-[10px] text-center text-lg font-semibold tracking-tight sm:h-14 sm:w-11 sm:text-xl",
            "bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)]",
            "ds-border outline-none transition-[box-shadow,border-color,background-color]",
            "focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
            "disabled:opacity-45",
          )}
        />
      ))}
    </div>
  );
}
