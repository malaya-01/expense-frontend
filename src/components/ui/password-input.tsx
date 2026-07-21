"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "endAdornment"
>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex size-8 items-center justify-center rounded-lg text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
        >
          {visible ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}
