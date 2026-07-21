import { Input } from "./input";

export function ColorField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safeValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#0072f5";
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="relative flex size-11 shrink-0 cursor-pointer overflow-hidden rounded-[9px] bg-[var(--ds-background-elevated)] p-1 ds-border ds-focus"
        style={{ color: safeValue }}
      >
        <span
          aria-hidden
          className="size-full rounded-[6px]"
          style={{ background: safeValue }}
        />
        <input
          id={id}
          type="color"
          value={safeValue}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Choose color"
        />
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono text-xs uppercase"
        maxLength={7}
        pattern="^#[0-9A-Fa-f]{6}$"
        aria-label="Color hex value"
      />
    </div>
  );
}
