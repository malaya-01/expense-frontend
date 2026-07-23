"use client";

import { memo, useMemo } from "react";
import {
  Archive,
  ArrowLeft,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Search,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { cn } from "@/lib/cn";
import type { AiConversation } from "@/types";

function groupConversations(items: AiConversation[]) {
  const pinned = items.filter((item) => item.pinned_at);
  const unpinned = items.filter((item) => !item.pinned_at);
  const buckets: Array<{ label: string; items: AiConversation[] }> = [];
  if (pinned.length) buckets.push({ label: "Pinned", items: pinned });

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 6 * 86_400_000;

  const today: AiConversation[] = [];
  const yesterday: AiConversation[] = [];
  const lastWeek: AiConversation[] = [];
  const older: AiConversation[] = [];

  for (const item of unpinned) {
    const ts = new Date(item.updated_at).getTime();
    if (ts >= startOfToday) today.push(item);
    else if (ts >= startOfYesterday) yesterday.push(item);
    else if (ts >= startOfWeek) lastWeek.push(item);
    else older.push(item);
  }

  if (today.length) buckets.push({ label: "Today", items: today });
  if (yesterday.length) buckets.push({ label: "Yesterday", items: yesterday });
  if (lastWeek.length) buckets.push({ label: "Last Week", items: lastWeek });
  if (older.length) buckets.push({ label: "Earlier", items: older });
  return buckets;
}

export const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  activeId,
  search,
  collapsed,
  archivedView,
  onSearchChange,
  onToggleCollapsed,
  onNewChat,
  onSelect,
  onRename,
  onPin,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onToggleArchivedView,
}: {
  conversations: AiConversation[];
  activeId: string | null;
  search: string;
  collapsed: boolean;
  archivedView: boolean;
  onSearchChange: (value: string) => void;
  onToggleCollapsed: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onPin: (id: string, pinned: boolean) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onUnarchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleArchivedView: () => void;
}) {
  const groups = useMemo(
    () => groupConversations(conversations),
    [conversations],
  );

  if (collapsed) {
    return (
      <aside
        className="flex h-full w-12 flex-col items-center gap-2 border-r border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)] py-3"
        aria-label="Conversations collapsed"
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] ds-focus"
          aria-label="Expand conversations"
        >
          <PanelLeftOpen size={15} />
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--ds-focus-color)] text-white ds-focus"
          aria-label="New chat"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={onToggleArchivedView}
          className={cn(
            "flex size-8 items-center justify-center rounded-[8px] ds-focus",
            archivedView
              ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]"
              : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
          )}
          aria-label={archivedView ? "Back to chats" : "Archived chats"}
          title={archivedView ? "Back to chats" : "Archived chats"}
        >
          <Archive size={15} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full w-[272px] shrink-0 flex-col border-r border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)]"
      aria-label={archivedView ? "Archived conversations" : "Conversation history"}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        {archivedView ? (
          <button
            type="button"
            onClick={onToggleArchivedView}
            className="inline-flex items-center gap-1.5 rounded-[7px] px-1 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
          >
            <ArrowLeft size={12} />
            Archived
          </button>
        ) : (
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--ds-gray-700)]">
            Chats
          </p>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex size-7 items-center justify-center rounded-[7px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
          aria-label="Collapse conversations"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <div className="space-y-2 px-3">
        {!archivedView ? (
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--ds-focus-color)] text-[13px] font-medium text-white transition-opacity hover:opacity-90 ds-focus"
          >
            <Plus size={14} />
            New chat
          </button>
        ) : null}
        <label className="flex h-9 items-center gap-2 rounded-[10px] bg-[var(--ds-background-elevated)] px-3">
          <Search size={14} className="text-[var(--ds-gray-700)]" aria-hidden />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={
              archivedView ? "Search archived…" : "Search chats…"
            }
            className="w-full bg-transparent text-xs text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-700)]"
            aria-label={
              archivedView ? "Search archived conversations" : "Search conversations"
            }
          />
        </label>
      </div>

      <div className="app-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <MessageSquare
              size={18}
              className="mx-auto text-[var(--ds-gray-700)]"
            />
            <p className="mt-3 text-xs font-medium text-[var(--ds-gray-1000)]">
              {archivedView ? "No archived chats" : "No conversations yet"}
            </p>
            <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
              {archivedView
                ? "Archive a chat from its menu to see it here."
                : "Start a chat to see history here."}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ds-gray-700)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <ConversationItem
                    key={item.id}
                    item={item}
                    active={activeId === item.id}
                    archivedView={archivedView}
                    onSelect={() => onSelect(item.id)}
                    onRename={(title) => onRename(item.id, title)}
                    onPin={() => onPin(item.id, !item.pinned_at)}
                    onDuplicate={() => onDuplicate(item.id)}
                    onArchive={() => onArchive(item.id)}
                    onUnarchive={() => onUnarchive(item.id)}
                    onDelete={() => onDelete(item.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {!archivedView ? (
        <div className="shrink-0 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-3 py-2">
          <button
            type="button"
            onClick={onToggleArchivedView}
            className="flex h-9 w-full items-center gap-2 rounded-[9px] px-2 text-[13px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] ds-focus"
          >
            <Archive size={15} className="text-[var(--ds-gray-700)]" />
            Archived chats
          </button>
        </div>
      ) : null}
    </aside>
  );
});

const ConversationItem = memo(function ConversationItem({
  item,
  active,
  archivedView,
  onSelect,
  onRename,
  onPin,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  item: AiConversation;
  active: boolean;
  archivedView: boolean;
  onSelect: () => void;
  onRename: (title: string) => Promise<void>;
  onPin: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onArchive: () => Promise<void>;
  onUnarchive: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-start gap-1 rounded-[9px] px-2 py-1.5 transition-colors",
        active
          ? "bg-[var(--ds-gray-100)]"
          : "hover:bg-[color-mix(in_srgb,var(--ds-gray-1000)_4%,transparent)]",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left ds-focus"
        aria-current={active ? "true" : undefined}
      >
        <span className="flex items-center gap-1.5">
          {item.pinned_at && !archivedView ? (
            <Pin
              size={11}
              className="shrink-0 text-[var(--ds-focus-color)]"
              aria-label="Pinned"
            />
          ) : null}
          <span className="truncate text-[13px] font-medium text-[var(--ds-gray-1000)]">
            {item.title}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--ds-gray-700)]">
          <span className="min-w-0 flex-1 truncate">
            {item.last_message_preview || "No messages yet"}
          </span>
          <time className="shrink-0 text-[10px]">
            {formatConversationTime(item.updated_at)}
          </time>
        </span>
      </button>
      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <ActionMenu
          label={`Actions for ${item.title}`}
          items={
            archivedView
              ? [
                  {
                    id: "unarchive",
                    label: "Unarchive",
                    onSelect: () => void onUnarchive(),
                  },
                  {
                    id: "delete",
                    label: "Delete",
                    tone: "danger",
                    onSelect: () => {
                      if (window.confirm(`Delete “${item.title}”?`)) {
                        void onDelete();
                      }
                    },
                  },
                ]
              : [
                  {
                    id: "rename",
                    label: "Rename",
                    onSelect: () => {
                      const next = window.prompt(
                        "Rename conversation",
                        item.title,
                      );
                      if (next?.trim()) void onRename(next.trim());
                    },
                  },
                  {
                    id: "pin",
                    label: item.pinned_at ? "Unpin" : "Pin",
                    onSelect: () => void onPin(),
                  },
                  {
                    id: "duplicate",
                    label: "Duplicate",
                    onSelect: () => void onDuplicate(),
                  },
                  {
                    id: "archive",
                    label: "Archive",
                    onSelect: () => void onArchive(),
                  },
                  {
                    id: "delete",
                    label: "Delete",
                    tone: "danger",
                    onSelect: () => {
                      if (window.confirm(`Delete “${item.title}”?`)) {
                        void onDelete();
                      }
                    },
                  },
                ]
          }
        />
      </div>
    </div>
  );
});

function formatConversationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
