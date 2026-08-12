"use client";

import { memo } from "react";
import Link from "next/link";
import {
  FileText,
  Lightbulb,
  LoaderCircle,
  PlusCircle,
  ShieldAlert,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/ui/action-menu";
import { StatusDot } from "@/components/ui/status-dot";
import { formatCurrency } from "@/lib/format";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { canCrud } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import type {
  AiActionProposal,
  AiDocument,
  AiMessage,
  ReportOverview,
} from "@/types";

export const PendingActionCard = memo(function PendingActionCard({
  proposal,
  busy,
  onReview,
  onReject,
}: {
  proposal: AiActionProposal;
  busy?: boolean;
  onReview: () => void;
  onReject: () => void;
}) {
  const perms = useModulePermissions("ai");
  return (
    <article className="rounded-[14px] bg-[var(--ds-background-elevated)] p-3 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))] transition-transform hover:-translate-y-0.5 motion-reduce:transform-none">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
            {proposal.title}
          </p>
          {proposal.summary ? (
            <p className="mt-1 text-[11px] leading-4 text-[var(--ds-gray-700)]">
              {proposal.summary}
            </p>
          ) : null}
        </div>
        <Badge tone="warning">Pending</Badge>
      </div>
      {perms.create ? (
        <div className="mt-3 flex gap-1.5">
          <Button size="sm" onClick={onReview}>
            Approve
          </Button>
          <Button size="sm" variant="secondary" loading={busy} onClick={onReject}>
            Reject
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-[var(--ds-gray-700)]">
          AI create permission required to decide
        </p>
      )}
    </article>
  );
});

export const ContextSidebar = memo(function ContextSidebar({
  overview,
  activeId,
  messages,
  pending,
  documents,
  selectedDocument,
  busyProposal,
  onReview,
  onReject,
  onReviewBatch,
  onSelectDocument,
  onDeleteDocument,
  onClearDocument,
  onSendFollowUp,
}: {
  overview: ReportOverview | null;
  activeId: string | null;
  messages: AiMessage[];
  pending: AiActionProposal[];
  documents: AiDocument[];
  selectedDocument: AiDocument | null;
  busyProposal: string | null;
  onReview: (p: AiActionProposal) => void;
  onReject: (id: string) => void;
  onReviewBatch?: (ids: string[]) => void;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onClearDocument: () => void;
  onSendFollowUp?: (prompt: string) => void;
}) {
  if (selectedDocument) {
    return (
      <aside
        className="flex h-full w-[320px] shrink-0 flex-col border-l border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)]"
        aria-label="Document analysis"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">
              Document Summary
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--ds-gray-700)]">
              {selectedDocument.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearDocument}
            className="rounded-[8px] px-2 py-1 text-[11px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
          >
            Close
          </button>
        </div>
        <div className="app-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          <section className="grid grid-cols-2 gap-2">
            <ContextValue
              label="Detected Type"
              value={selectedDocument.detected_type || "Document"}
            />
            <ContextValue
              label="Confidence"
              value={
                selectedDocument.analysis_confidence != null
                  ? `${Number(selectedDocument.analysis_confidence).toFixed(0)}%`
                  : selectedDocument.status === "ready"
                    ? "Ready"
                    : selectedDocument.status
              }
            />
          </section>
          <section>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ds-gray-700)]">
              Summary
            </p>
            <p className="mt-1.5 text-xs leading-5 text-[var(--ds-gray-900)]">
              {selectedDocument.summary || "No summary yet."}
            </p>
          </section>
          <section>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ds-gray-700)]">
              Related Transactions
            </p>
            {(selectedDocument.related_transactions || []).length ? (
              <div className="space-y-1.5">
                {(selectedDocument.related_transactions || []).map(
                  (transaction, index) => (
                    <div
                      key={index}
                      className="rounded-[12px] bg-[var(--ds-background-elevated)] p-3"
                    >
                      {Object.entries(transaction).map(([key, value]) => (
                        <p
                          key={key}
                          className="flex justify-between gap-3 text-[10px]"
                        >
                          <span className="capitalize text-[var(--ds-gray-700)]">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="truncate text-right text-[var(--ds-gray-900)]">
                            {String(value)}
                          </span>
                        </p>
                      ))}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--ds-gray-700)]">
                No related transactions detected yet.
              </p>
            )}
          </section>
          <section>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ds-gray-700)]">
              Extracted Information
            </p>
            <div className="space-y-2">
              {(selectedDocument.extracted_sections || []).map((section) => (
                <details
                  key={section.title}
                  className="rounded-[12px] bg-[var(--ds-background-elevated)] p-3"
                >
                  <summary className="cursor-pointer text-xs font-medium">
                    {section.title}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-[11px] leading-4 text-[var(--ds-gray-700)]">
                    {section.content}
                  </p>
                </details>
              ))}
            </div>
          </section>
          {(selectedDocument.suggested_actions || []).length ? (
            <section>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ds-gray-700)]">
                Suggested Actions
              </p>
              <div className="space-y-1.5">
                {(selectedDocument.suggested_actions || []).map((action) =>
                  onSendFollowUp ? (
                    <button
                      key={action}
                      type="button"
                      onClick={() => onSendFollowUp(action)}
                      className="w-full rounded-[10px] bg-[var(--ds-background-elevated)] px-3 py-2 text-left text-[11px] hover:bg-[var(--ds-gray-100)] ds-focus"
                    >
                      {action}
                    </button>
                  ) : (
                    <p
                      key={action}
                      className="rounded-[10px] bg-[var(--ds-background-elevated)] px-3 py-2 text-[11px]"
                    >
                      {action}
                    </p>
                  ),
                )}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    );
  }

  const inConversation = Boolean(activeId || messages.length);
  const referencedDocuments = documents.filter((document) =>
    messages.some((message) =>
      message.attachments?.some(
        (attachment) => attachment.name === document.name,
      ),
    ),
  );

  return (
    <aside
      className="flex h-full w-[320px] shrink-0 flex-col border-l border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)]"
      aria-label="Conversation context"
    >
      <div className="app-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {inConversation ? (
          <>
            {referencedDocuments.length ? (
              <DocumentList
                title="Referenced Documents"
                documents={referencedDocuments}
                onSelect={onSelectDocument}
                onDelete={onDeleteDocument}
              />
            ) : null}
          </>
        ) : (
          <>
            <FinancialSnapshot overview={overview} />
            <QuickActions />
            <DocumentList
              title="Recent Documents"
              documents={documents.slice(0, 6)}
              onSelect={onSelectDocument}
              onDelete={onDeleteDocument}
              empty
            />
            <section className="rounded-[14px] bg-[color-mix(in_srgb,var(--ds-focus-color)_8%,var(--ds-background-elevated))] p-3">
              <div className="flex items-start gap-2">
                <Lightbulb
                  size={15}
                  className="mt-0.5 shrink-0 text-[var(--ds-focus-color)]"
                />
                <p className="text-[11px] leading-4 text-[var(--ds-gray-900)]">
                  Start with a real decision: ask about spending, upload a
                  statement, or have Opal propose a budget for approval.
                </p>
              </div>
            </section>
          </>
        )}

        {pending.length ? (
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Pending Actions</p>
              <div className="flex items-center gap-1.5">
                <Badge tone="warning">{pending.length}</Badge>
                {pending.length > 1 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onReviewBatch?.(pending.map((p) => p.id))}
                  >
                    Review all
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              {pending.map((proposal) => (
                <PendingActionCard
                  key={proposal.id}
                  proposal={proposal}
                  busy={busyProposal === proposal.id}
                  onReview={() => onReview(proposal)}
                  onReject={() => onReject(proposal.id)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
});

function FinancialSnapshot({ overview }: { overview: ReportOverview | null }) {
  return (
    <section className="rounded-[16px] bg-[var(--ds-background-elevated)] p-4 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Financial Snapshot</p>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ds-status-green)]">
          <StatusDot tone="green" />
          Active
        </span>
      </div>
      {overview ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric
              label="Net worth"
              value={formatCurrency(
                overview.twin.net_worth,
                overview.base_currency,
              )}
            />
            <Metric
              label="Cash flow"
              value={formatCurrency(
                overview.this_month.net,
                overview.base_currency,
              )}
            />
            <Metric
              label="Savings rate"
              value={`${overview.this_month.savings_rate.toFixed(1)}%`}
              icon={TrendingUp}
            />
            <Metric
              label="Budget left"
              value={formatCurrency(
                overview.budgets.remaining,
                overview.base_currency,
              )}
              icon={Wallet}
            />
          </div>
          {overview.budgets.over_count > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-[var(--ds-danger-hover)] px-3 py-2">
              <ShieldAlert
                size={14}
                className="mt-0.5 shrink-0 text-[var(--ds-status-red)]"
              />
              <p className="text-[11px] text-[var(--ds-status-red)]">
                {overview.budgets.over_count} budget{" "}
                {overview.budgets.over_count === 1 ? "area is" : "areas are"}{" "}
                over plan.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs text-[var(--ds-gray-700)]">
          Twin context will appear once reports load.
        </p>
      )}
    </section>
  );
}

function QuickActions() {
  const { user } = useAuth();
  const { openTransactionModal } = useTransactionModal();
  const canCreateTx = canCrud(user, "expenses", "create");

  return (
    <section>
      <p className="mb-2 text-sm font-semibold">Quick Actions</p>
      <div className="grid grid-cols-2 gap-2">
        {canCreateTx ? (
          <button
            type="button"
            onClick={openTransactionModal}
            className="flex items-center gap-2 rounded-[12px] bg-[var(--ds-background-elevated)] p-3 text-left transition-colors hover:bg-[var(--ds-gray-100)] ds-focus"
          >
            <PlusCircle size={15} className="text-[var(--ds-focus-color)]" />
            <span className="text-[11px] font-medium">Add Expense</span>
          </button>
        ) : null}
        {[
          ["/accounts", "Upload Statement", Upload],
          ["/budgets", "Create Budget", Wallet],
          ["/reports", "Generate Report", TrendingUp],
        ].map(([href, label, Icon]) => {
          const Glyph = Icon as typeof PlusCircle;
          return (
            <Link
              key={href as string}
              href={href as string}
              className="flex items-center gap-2 rounded-[12px] bg-[var(--ds-background-elevated)] p-3 transition-colors hover:bg-[var(--ds-gray-100)] ds-focus"
            >
              <Glyph size={15} className="text-[var(--ds-focus-color)]" />
              <span className="text-[11px] font-medium">{label as string}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DocumentList({
  title,
  documents,
  onSelect,
  onDelete,
  empty = false,
}: {
  title: string;
  documents: AiDocument[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  empty?: boolean;
}) {
  const perms = useModulePermissions("ai");
  if (!documents.length && !empty) return null;
  return (
    <section>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      {documents.length ? (
        <div className="space-y-1">
          {documents.map((document) => {
            const menuItems = [
              {
                id: "preview",
                label: "Preview",
                onSelect: () => onSelect(document.id),
              },
              ...(perms.delete
                ? [
                    {
                      id: "delete",
                      label: "Delete",
                      tone: "danger" as const,
                      onSelect: () => onDelete(document.id),
                    },
                  ]
                : []),
            ];
            return (
            <article
              key={document.id}
              className="group flex items-start gap-2 rounded-[12px] px-2 py-2 transition-colors hover:bg-[var(--ds-background-elevated)]"
            >
              <button
                type="button"
                onClick={() => {
                  if (!document.id.startsWith("upload-")) onSelect(document.id);
                }}
                disabled={document.id.startsWith("upload-")}
                className="flex min-w-0 flex-1 items-start gap-2 text-left ds-focus"
              >
                <span className="relative flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[var(--ds-background-elevated)]">
                  {document.id.startsWith("upload-") ||
                  document.status === "analyzing" ? (
                    <LoaderCircle
                      size={15}
                      className="animate-spin text-[var(--ds-focus-color)]"
                    />
                  ) : (
                    <FileText size={15} className="text-[var(--ds-status-red)]" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">
                    {document.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--ds-gray-700)]">
                    {document.status === "analyzing"
                      ? "Analyzing…"
                      : `${(document.size_bytes / 1024).toFixed(0)} KB · ${new Date(
                          document.created_at,
                        ).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}`}
                  </span>
                </span>
              </button>
              {!document.id.startsWith("upload-") && menuItems.length ? (
                <ActionMenu
                  label={`Actions for ${document.name}`}
                  items={menuItems}
                />
              ) : null}
            </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] bg-[var(--ds-background-elevated)] px-3 py-4 text-center">
          <Upload size={18} className="mx-auto text-[var(--ds-gray-700)]" />
          <p className="mt-2 text-xs font-medium">Upload your first statement</p>
          <p className="mt-1 text-[10px] text-[var(--ds-gray-700)]">
            Attach a PDF, CSV, JSON, image, or text file in chat.
          </p>
        </div>
      )}
    </section>
  );
}

function ContextValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--ds-background-elevated)] p-3">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--ds-gray-700)]">
        {label}
      </p>
      <p className="mt-1 text-xs font-medium capitalize">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof TrendingUp;
}) {
  return (
    <div className="rounded-[11px] bg-[var(--ds-background-100)] p-2.5">
      <p className="flex items-center gap-1 text-[10px] text-[var(--ds-gray-700)]">
        {Icon ? <Icon size={11} /> : null}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}
