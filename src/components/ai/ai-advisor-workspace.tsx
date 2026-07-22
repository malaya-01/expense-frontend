"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, PanelRight } from "lucide-react";
import { ConversationSidebar } from "@/components/ai/conversation-sidebar";
import { ChatWorkspace } from "@/components/ai/chat-workspace";
import { ContextSidebar } from "@/components/ai/context-sidebar";
import { ProposalConfirmModal } from "@/components/ai/proposal-confirm-modal";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/feedback";
import { useAiAdvisorWorkspace } from "@/hooks/use-ai-advisor-workspace";

export function AiAdvisorWorkspace() {
  const router = useRouter();
  const workspace = useAiAdvisorWorkspace();
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  if (workspace.pageLoading) {
    return (
      <div className="flex h-full" aria-label="Loading AI Advisor" aria-busy>
        <div className="hidden w-[272px] shrink-0 space-y-3 border-r border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] p-4 lg:block">
          <Skeleton className="h-10 w-full rounded-[11px]" />
          <Skeleton className="h-9 w-full rounded-[10px]" />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-[10px]" />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-10">
          <div className="mx-auto my-auto w-full max-w-3xl">
            <Skeleton className="h-9 w-2/5 rounded-[10px]" />
            <Skeleton className="mt-3 h-5 w-1/3 rounded-[8px]" />
            <div className="mt-8 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-[14px]" />
              ))}
            </div>
          </div>
        </div>
        <div className="hidden w-[320px] shrink-0 space-y-4 border-l border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] p-4 xl:block">
          <Skeleton className="h-28 w-full rounded-[16px]" />
          <Skeleton className="h-20 w-full rounded-[14px]" />
          <Skeleton className="h-32 w-full rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (workspace.needsProvider) {
    return (
      <div className="mx-auto flex h-full max-w-3xl items-center px-6 py-10">
        <section className="w-full rounded-[20px] bg-[var(--ds-background-elevated)] px-6 py-10 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.08))] sm:px-10">
          <span className="mb-5 inline-flex rounded-full bg-[var(--ds-gray-100)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ds-gray-700)]">
            One step to start
          </span>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)]">
            Connect FinOS to an AI model
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ds-gray-900)]">
            Your financial context stays on the FinOS backend. Choose a
            provider, test it, and the Advisor can analyze your twin with
            confirmation before any change.
          </p>
          <ol className="mt-6 space-y-2 text-sm text-[var(--ds-gray-900)]">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-[11px] text-[var(--ds-primary-foreground)]">
                1
              </span>
              <span>
                <strong className="font-medium">Connect</strong> — Add an API
                key or Vertex JSON
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-[11px] text-[var(--ds-primary-foreground)]">
                2
              </span>
              <span>
                <strong className="font-medium">Test</strong> — Verify model
                access
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-[11px] text-[var(--ds-primary-foreground)]">
                3
              </span>
              <span>
                <strong className="font-medium">Ask</strong> — Start with a
                suggested question
              </span>
            </li>
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            {workspace.savedProvider ? (
              <Button
                loading={workspace.loading}
                onClick={workspace.activateSavedProvider}
              >
                Activate {workspace.savedProvider.provider}
              </Button>
            ) : null}
            <Button
              variant={workspace.savedProvider ? "secondary" : "primary"}
              onClick={() => router.push("/settings?section=ai")}
            >
              {workspace.savedProvider
                ? "Review provider settings"
                : "Connect a provider"}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ds-background-100)]">
      <div className="flex h-10 items-center justify-between px-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileConversationsOpen(true)}
          className="flex size-9 items-center justify-center rounded-[9px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] ds-focus"
          aria-label="Open conversations"
        >
          <Menu size={16} />
        </button>
        <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
          AI Advisor
        </p>
        <button
          type="button"
          onClick={() => setMobileContextOpen(true)}
          className="flex size-9 items-center justify-center rounded-[9px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] ds-focus"
          aria-label="Open context panel"
        >
          <PanelRight size={16} />
        </button>
      </div>

      {workspace.error ? (
        <div className="flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--ds-status-red)_8%,var(--ds-background-100))] px-4 py-2">
          <p className="text-sm text-[var(--ds-status-red)]" role="alert">
            {workspace.error}
          </p>
          {workspace.failedPrompt ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void workspace.onSend(undefined, workspace.failedPrompt)
              }
            >
              Retry
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => workspace.setError("")}
            >
              Dismiss
            </Button>
          )}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="hidden h-full lg:flex">
          <ConversationSidebar
            conversations={workspace.conversations}
            activeId={workspace.activeId}
            search={workspace.search}
            collapsed={workspace.railCollapsed}
            onSearchChange={workspace.setSearch}
            onToggleCollapsed={() =>
              workspace.setRailCollapsed((value) => !value)
            }
            onNewChat={workspace.startNewChat}
            onSelect={(id) => void workspace.loadConversation(id)}
            onRename={workspace.renameConversation}
            onPin={workspace.pinConversation}
            onDuplicate={workspace.duplicateConversation}
            onArchive={workspace.archiveConversation}
            onDelete={workspace.removeConversation}
          />
        </div>

        <ChatWorkspace
          messages={workspace.messages}
          proposals={workspace.proposals}
          starters={workspace.starters}
          draft={workspace.draft}
          attachments={workspace.attachments}
          loading={workspace.loading}
          streamingId={workspace.streamingId}
          status={workspace.status}
          dragActive={workspace.dragActive}
          listening={workspace.listening}
          voiceSupported={workspace.voiceSupported}
          webSearchEnabled={workspace.webSearchEnabled}
          busyProposal={workspace.busyProposal}
          messageEndRef={workspace.messageEndRef}
          onDraftChange={workspace.setDraft}
          onSend={workspace.onSend}
          onStop={() => workspace.abortRef.current?.abort()}
          onConfirm={(p) => workspace.setConfirming(p)}
          onReject={workspace.onReject}
          onAddFiles={workspace.addFiles}
          onRemoveAttachment={(index) =>
            workspace.setAttachments((items) =>
              items.filter((_, itemIndex) => itemIndex !== index),
            )
          }
          onDragState={workspace.setDragActive}
          onToggleVoice={workspace.toggleVoice}
          onToggleWebSearch={() =>
            workspace.setWebSearchEnabled((enabled) => !enabled)
          }
        />

        <div className="hidden h-full xl:flex">
          <ContextSidebar
            overview={workspace.overview}
            activeId={workspace.activeId}
            messages={workspace.messages}
            pending={workspace.pendingProposals}
            documents={workspace.documents}
            selectedDocument={workspace.selectedDocument}
            busyProposal={workspace.busyProposal}
            onReview={(p) => workspace.setConfirming(p)}
            onReject={workspace.onReject}
            onSelectDocument={(id) => void workspace.selectDocument(id)}
            onDeleteDocument={(id) => void workspace.removeDocument(id)}
            onClearDocument={() => void workspace.selectDocument(null)}
            onSendFollowUp={(prompt) => void workspace.onSend(undefined, prompt)}
          />
        </div>
      </div>

      <Drawer
        open={mobileConversationsOpen}
        title="Conversations"
        side="left"
        onClose={() => setMobileConversationsOpen(false)}
        className="w-[min(92vw,300px)]"
        contentClassName="p-0 overflow-hidden"
      >
        <div className="h-full [&_aside]:w-full [&_aside]:border-0">
          <ConversationSidebar
            conversations={workspace.conversations}
            activeId={workspace.activeId}
            search={workspace.search}
            collapsed={false}
            onSearchChange={workspace.setSearch}
            onToggleCollapsed={() => setMobileConversationsOpen(false)}
            onNewChat={() => {
              workspace.startNewChat();
              setMobileConversationsOpen(false);
            }}
            onSelect={(id) => {
              void workspace.loadConversation(id);
              setMobileConversationsOpen(false);
            }}
            onRename={workspace.renameConversation}
            onPin={workspace.pinConversation}
            onDuplicate={workspace.duplicateConversation}
            onArchive={workspace.archiveConversation}
            onDelete={workspace.removeConversation}
          />
        </div>
      </Drawer>

      <Drawer
        open={mobileContextOpen}
        title="Context"
        side="right"
        onClose={() => setMobileContextOpen(false)}
        className="w-[min(92vw,340px)]"
        contentClassName="p-0 overflow-hidden"
      >
        <div className="h-full [&_aside]:w-full [&_aside]:border-0">
          <ContextSidebar
            overview={workspace.overview}
            activeId={workspace.activeId}
            messages={workspace.messages}
            pending={workspace.pendingProposals}
            documents={workspace.documents}
            selectedDocument={workspace.selectedDocument}
            busyProposal={workspace.busyProposal}
            onReview={(p) => {
              workspace.setConfirming(p);
              setMobileContextOpen(false);
            }}
            onReject={workspace.onReject}
            onSelectDocument={(id) => void workspace.selectDocument(id)}
            onDeleteDocument={(id) => void workspace.removeDocument(id)}
            onClearDocument={() => void workspace.selectDocument(null)}
            onSendFollowUp={(prompt) => {
              void workspace.onSend(undefined, prompt);
              setMobileContextOpen(false);
            }}
          />
        </div>
      </Drawer>

      <ProposalConfirmModal
        proposal={workspace.confirming}
        busy={workspace.busyProposal === workspace.confirming?.id}
        onClose={() => workspace.setConfirming(null)}
        onConfirm={workspace.onConfirm}
      />
    </div>
  );
}
