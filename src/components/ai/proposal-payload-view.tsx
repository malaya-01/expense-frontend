"use client";

import { useEffect, useState } from "react";
import { listAccounts } from "@/lib/api/accounts";
import { listBudgets } from "@/lib/api/budgets";
import { listCategories } from "@/lib/api/categories";
import { listGoals } from "@/lib/api/goals";
import { listInvestments } from "@/lib/api/investments";
import { listLoans } from "@/lib/api/loans";
import { listRecurringSchedules } from "@/lib/api/recurring";
import {
  actionTypeLabel,
  buildProposalDisplayRows,
  type ProposalNameMaps,
} from "@/lib/ai/proposal-display";
import type { AiActionProposal } from "@/types";

const EMPTY_MAPS: ProposalNameMaps = {
  accounts: {},
  categories: {},
  goals: {},
  budgets: {},
  loans: {},
  holdings: {},
  recurring: {},
};

let cachedMaps: ProposalNameMaps | null = null;
let cachePromise: Promise<ProposalNameMaps> | null = null;

async function loadProposalNameMaps(): Promise<ProposalNameMaps> {
  if (cachedMaps) return cachedMaps;
  if (cachePromise) return cachePromise;

  cachePromise = Promise.allSettled([
    listAccounts(),
    listCategories(),
    listGoals(),
    listBudgets(),
    listLoans(),
    listInvestments(),
    listRecurringSchedules(),
  ]).then((results) => {
    const value = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === "fulfilled" ? r.value : fallback;

    const accounts = value(
      results[0],
      [] as Awaited<ReturnType<typeof listAccounts>>,
    );
    const categories = value(
      results[1],
      [] as Awaited<ReturnType<typeof listCategories>>,
    );
    const goals = value(results[2], [] as Awaited<ReturnType<typeof listGoals>>);
    const budgets = value(
      results[3],
      [] as Awaited<ReturnType<typeof listBudgets>>,
    );
    const loans = value(results[4], [] as Awaited<ReturnType<typeof listLoans>>);
    const investments = value(
      results[5],
      { holdings: [] } as unknown as Awaited<ReturnType<typeof listInvestments>>,
    );
    const recurring = value(
      results[6],
      [] as Awaited<ReturnType<typeof listRecurringSchedules>>,
    );

    const toMap = (
      rows: Array<{ id: string; name?: string | null }>,
    ): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const row of rows || []) {
        if (row?.id && row.name) out[row.id] = String(row.name);
      }
      return out;
    };

    cachedMaps = {
      accounts: toMap(accounts),
      categories: toMap(categories),
      goals: toMap(goals),
      budgets: toMap(budgets),
      loans: toMap(loans),
      holdings: toMap(investments.holdings || []),
      recurring: toMap(recurring),
    };
    return cachedMaps;
  });

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}

/** Call after confirming creates so new names appear in later reviews. */
export function invalidateProposalNameMaps() {
  cachedMaps = null;
}

export function ProposalPayloadView({
  proposal,
}: {
  proposal: AiActionProposal;
}) {
  const [maps, setMaps] = useState<ProposalNameMaps>(cachedMaps || EMPTY_MAPS);
  const [ready, setReady] = useState(Boolean(cachedMaps));

  useEffect(() => {
    let cancelled = false;
    void loadProposalNameMaps().then((loaded) => {
      if (!cancelled) {
        setMaps(loaded);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [proposal.id]);

  const rows = buildProposalDisplayRows(proposal, maps);

  return (
    <div className="space-y-3 text-sm">
      {proposal.summary ? (
        <p className="text-[var(--ds-gray-900)]">{proposal.summary}</p>
      ) : (
        <p className="text-[var(--ds-gray-900)]">
          Review what FinOS will apply.
        </p>
      )}
      <p className="text-xs text-[var(--ds-gray-700)]">
        Action:{" "}
        <span className="font-medium text-[var(--ds-gray-900)]">
          {actionTypeLabel(proposal.action_type)}
        </span>
      </p>
      <dl className="overflow-hidden rounded-[12px] bg-[var(--ds-background-100)]">
        {!ready && !rows.length ? (
          <div className="px-3.5 py-4 text-xs text-[var(--ds-gray-700)]">
            Loading details…
          </div>
        ) : rows.length ? (
          rows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="grid grid-cols-[minmax(7rem,34%)_1fr] gap-3 border-b border-[var(--ds-gray-200)] px-3.5 py-2.5 last:border-b-0"
            >
              <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-gray-700)]">
                {row.label}
              </dt>
              <dd className="break-words text-[13px] leading-5 text-[var(--ds-gray-1000)]">
                {row.value}
              </dd>
            </div>
          ))
        ) : (
          <div className="px-3.5 py-4 text-xs text-[var(--ds-gray-700)]">
            No additional details for this action.
          </div>
        )}
      </dl>
    </div>
  );
}
