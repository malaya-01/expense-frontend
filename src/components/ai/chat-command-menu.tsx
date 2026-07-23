"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Command, Hash } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  AI_AT_TOOLS,
  AI_SLASH_COMMANDS,
  type AiAtToolDef,
  type AiSlashCommandDef,
} from "@/lib/ai/command-catalog";

export type CommandMenuState = {
  kind: "at" | "slash";
  query: string;
  start: number;
  end: number;
} | null;

export function ChatCommandMenu({
  state,
  onPickAt,
  onPickSlash,
}: {
  state: CommandMenuState;
  onPickAt: (tool: AiAtToolDef) => void;
  onPickSlash: (cmd: AiSlashCommandDef) => void;
}) {
  const [active, setActive] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const items = useMemo(() => {
    if (!state) return [];
    const q = state.query;
    if (state.kind === "at") {
      return AI_AT_TOOLS.filter(
        (t) =>
          !q ||
          t.id.includes(q) ||
          t.label.toLowerCase().includes(q) ||
          t.tool.includes(q),
      ).slice(0, 8);
    }
    return AI_SLASH_COMMANDS.filter(
      (c) =>
        !q ||
        c.command.slice(1).includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.id.includes(q),
    ).slice(0, 8);
  }, [state]);

  useEffect(() => {
    setActive(0);
  }, [state?.kind, state?.query, items.length]);

  useEffect(() => {
    itemRefs.current[active]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [active, items.length]);

  useEffect(() => {
    if (!state || !items.length) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % items.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i - 1 + items.length) % items.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        const item = items[active];
        if (!item) return;
        if (state.kind === "at") onPickAt(item as AiAtToolDef);
        else onPickSlash(item as AiSlashCommandDef);
      } else if (event.key === "Escape") {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [state, items, active, onPickAt, onPickSlash]);

  if (!state || !items.length) return null;

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-0 z-30 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] shadow-[var(--ds-shadow-md,0_8px_24px_rgba(0,0,0,0.12))]"
      role="listbox"
      aria-label={state.kind === "at" ? "Mention tools" : "Slash commands"}
    >
      <div className="flex items-center gap-2 border-b border-[var(--ds-gray-200)] px-3 py-2 text-[11px] text-[var(--ds-gray-700)]">
        {state.kind === "at" ? <AtSign size={12} /> : <Command size={12} />}
        <span>
          {state.kind === "at"
            ? "Mention a data source"
            : "Run a slash command"}
        </span>
      </div>
      <ul className="max-h-64 overflow-y-auto py-1">
        {items.map((item, index) => {
          const isAt = state.kind === "at";
          const at = item as AiAtToolDef;
          const slash = item as AiSlashCommandDef;
          return (
            <li key={isAt ? at.id : slash.id}>
              <button
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() =>
                  isAt ? onPickAt(at) : onPickSlash(slash)
                }
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2 text-left ds-focus",
                  index === active
                    ? "bg-[color-mix(in_srgb,var(--ds-focus-color)_10%,transparent)]"
                    : "hover:bg-[var(--ds-gray-100)]",
                )}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--ds-background-100)] text-[var(--ds-gray-800)]">
                  {isAt ? <AtSign size={12} /> : <Hash size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--ds-gray-1000)]">
                    {isAt ? `@${at.id}` : slash.command}
                    <span className="ml-2 font-normal text-[var(--ds-gray-700)]">
                      {isAt ? at.label : slash.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--ds-gray-700)]">
                    {isAt ? at.description : slash.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
