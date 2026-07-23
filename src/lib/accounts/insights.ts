import type { FinancialContainer, LedgerTransaction } from "@/types";
import type { TwinSummary } from "./metrics";
import { convertAmount } from "@/lib/currency/currency.data";
import {
  getContainerMeta,
  isLiabilityType,
  isLiquidType,
} from "./types-meta";

export type AllocationSlice = {
  id: "cash" | "investments" | "liabilities";
  label: string;
  value: number;
  percent: number;
  color: string;
};

export type KpiDelta = {
  amount: number;
  percent: number | null;
};

export type KpiSeriesBundle = {
  netWorth: number[];
  cash: number[];
  investments: number[];
  liabilities: number[];
  netWorthDelta: KpiDelta;
  cashDelta: KpiDelta;
  investmentsDelta: KpiDelta;
  liabilitiesDelta: KpiDelta;
};

export type AccountInsight = {
  id: string;
  title: string;
  detail: string;
  tone: "blue" | "green" | "orange" | "purple";
  href?: string;
};

type FlowBucket = "cash" | "investments" | "liabilities" | "other";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function bucketForType(type: FinancialContainer["type"]): FlowBucket {
  if (isLiquidType(type)) return "cash";
  if (type === "investment" || type === "gold" || type === "crypto") {
    return "investments";
  }
  if (isLiabilityType(type)) return "liabilities";
  return "other";
}

function txnBaseAmount(txn: LedgerTransaction, baseCurrency: string): number {
  if (txn.amount_base != null && Number.isFinite(Number(txn.amount_base))) {
    return Number(txn.amount_base);
  }
  return convertAmount(
    Number(txn.amount) || 0,
    txn.currency || baseCurrency,
    baseCurrency,
  );
}

function containerMap(containers: FinancialContainer[]) {
  return new Map(containers.map((c) => [c.id, c]));
}

/** Signed monthly flow into a twin bucket (positive = balance up for assets / liability outstanding up). */
function monthlyFlows(
  containers: FinancialContainer[],
  transactions: LedgerTransaction[],
  baseCurrency: string,
  keys: string[],
): Record<FlowBucket, Record<string, number>> {
  const byId = containerMap(containers);
  const empty = () => Object.fromEntries(keys.map((k) => [k, 0])) as Record<
    string,
    number
  >;
  const flows: Record<FlowBucket, Record<string, number>> = {
    cash: empty(),
    investments: empty(),
    liabilities: empty(),
    other: empty(),
  };

  for (const txn of transactions) {
    const key = txn.date.slice(0, 7);
    if (!keys.includes(key)) continue;
    const amount = txnBaseAmount(txn, baseCurrency);
    const source = txn.source_container_id
      ? byId.get(txn.source_container_id)
      : undefined;
    const dest = txn.destination_container_id
      ? byId.get(txn.destination_container_id)
      : undefined;

    if (txn.type === "income" && dest) {
      const bucket = bucketForType(dest.type);
      flows[bucket][key] += isLiabilityType(dest.type) ? -amount : amount;
    } else if (txn.type === "expense" && source) {
      const bucket = bucketForType(source.type);
      flows[bucket][key] += isLiabilityType(source.type) ? amount : -amount;
    } else if (txn.type === "transfer") {
      if (source) {
        const bucket = bucketForType(source.type);
        flows[bucket][key] += isLiabilityType(source.type) ? amount : -amount;
      }
      if (dest) {
        const bucket = bucketForType(dest.type);
        flows[bucket][key] += isLiabilityType(dest.type) ? -amount : amount;
      }
    }
  }

  return flows;
}

function reconstructLevels(current: number, monthlyNet: number[]): number[] {
  const levels = new Array<number>(monthlyNet.length);
  levels[monthlyNet.length - 1] = current;
  for (let i = monthlyNet.length - 1; i > 0; i -= 1) {
    levels[i - 1] = levels[i] - monthlyNet[i];
  }
  return levels.map((v) => Math.round(v * 100) / 100);
}

function deltaFromSeries(series: number[]): KpiDelta {
  if (series.length < 2) return { amount: 0, percent: null };
  const prev = series[series.length - 2];
  const curr = series[series.length - 1];
  const amount = curr - prev;
  const percent =
    Math.abs(prev) < 0.0001 ? null : (amount / Math.abs(prev)) * 100;
  return { amount, percent };
}

export function allocationSlices(summary: TwinSummary): AllocationSlice[] {
  const cash = Math.max(0, summary.totalCash);
  const investments = Math.max(0, summary.investmentValue);
  const liabilities = Math.max(0, summary.totalLiabilities);
  const total = cash + investments + liabilities;
  const pct = (value: number) =>
    total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;

  return [
    {
      id: "cash",
      label: "Cash",
      value: cash,
      percent: pct(cash),
      color: "#16A34A",
    },
    {
      id: "investments",
      label: "Investments",
      value: investments,
      percent: pct(investments),
      color: "#7C3AED",
    },
    {
      id: "liabilities",
      label: "Liabilities",
      value: liabilities,
      percent: pct(liabilities),
      color: "#F97316",
    },
  ];
}

export function buildKpiSeries(
  containers: FinancialContainer[],
  transactions: LedgerTransaction[],
  summary: TwinSummary,
  baseCurrency = summary.baseCurrency,
  months = 6,
): KpiSeriesBundle {
  const keys = monthKeys(months);
  const flows = monthlyFlows(containers, transactions, baseCurrency, keys);

  const cashNet = keys.map((k) => flows.cash[k] || 0);
  const investNet = keys.map((k) => flows.investments[k] || 0);
  const liabilityNet = keys.map((k) => flows.liabilities[k] || 0);
  const netWorthNet = keys.map(
    (_, i) => cashNet[i] + investNet[i] - liabilityNet[i],
  );

  const cash = reconstructLevels(summary.totalCash, cashNet);
  const investments = reconstructLevels(summary.investmentValue, investNet);
  const liabilities = reconstructLevels(summary.totalLiabilities, liabilityNet);
  const netWorth = reconstructLevels(summary.netWorth, netWorthNet);

  return {
    netWorth,
    cash,
    investments,
    liabilities,
    netWorthDelta: deltaFromSeries(netWorth),
    cashDelta: deltaFromSeries(cash),
    investmentsDelta: deltaFromSeries(investments),
    liabilitiesDelta: deltaFromSeries(liabilities),
  };
}

export function buildAccountInsights(
  summary: TwinSummary,
  containers: FinancialContainer[],
  transactions: LedgerTransaction[],
): AccountInsight[] {
  const currency = summary.baseCurrency;
  const insights: AccountInsight[] = [];
  const liquidCount = containers.filter((c) => isLiquidType(c.type)).length;
  const liabilityCount = containers.filter((c) =>
    isLiabilityType(c.type),
  ).length;
  const investCount = containers.filter((c) =>
    ["investment", "gold", "crypto"].includes(c.type),
  ).length;

  const now = new Date();
  const thisMonth = monthKey(now);
  const monthTxns = transactions.filter((t) => t.date.startsWith(thisMonth));
  const monthIncome = monthTxns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + txnBaseAmount(t, currency), 0);
  const monthExpense = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + txnBaseAmount(t, currency), 0);
  const cashDelta = monthIncome - monthExpense;

  if (summary.containerCount === 0) {
    insights.push({
      id: "empty",
      title: "Start your financial twin",
      detail: "Add cash, bank, or investment containers to unlock live net worth.",
      tone: "blue",
      href: `/ai?q=${encodeURIComponent("Help me set up my financial accounts.")}`,
    });
    return insights;
  }

  insights.push({
    id: "net-worth",
    title: `Net worth across ${summary.containerCount} account${summary.containerCount === 1 ? "" : "s"}`,
    detail: `Your twin currently tracks a combined net worth position.`,
    tone: "blue",
    href: `/ai?q=${encodeURIComponent("/health Summarize my financial twin in 5 bullets.")}`,
  });

  if (liquidCount > 0) {
    const direction = cashDelta >= 0 ? "increased" : "decreased";
    const pct =
      summary.totalCash > 0
        ? Math.abs((cashDelta / summary.totalCash) * 100)
        : 0;
    insights.push({
      id: "cash",
      title:
        Math.abs(cashDelta) < 1
          ? "Cash balance is steady this month"
          : `Cash balance ${direction}${pct >= 1 ? ` by ~${pct.toFixed(0)}%` : ""}`,
      detail:
        cashDelta >= 0
          ? "Great job maintaining liquidity."
          : "Review recent outflows if this was unplanned.",
      tone: cashDelta >= 0 ? "green" : "orange",
      href: `/ai?q=${encodeURIComponent("@accounts Where is my liquid cash and is it enough?")}`,
    });
  } else {
    insights.push({
      id: "cash-missing",
      title: "Add a cash or bank account",
      detail: "Liquidity tracking starts with at least one liquid container.",
      tone: "green",
    });
  }

  if (liabilityCount > 0) {
    const ratio =
      summary.totalAssets > 0
        ? (summary.totalLiabilities / summary.totalAssets) * 100
        : 100;
    insights.push({
      id: "liabilities",
      title:
        ratio > 40
          ? "Liabilities are elevated vs assets"
          : "Liabilities look manageable",
      detail:
        ratio > 40
          ? "Consider prioritizing high-interest balances."
          : "Debt stays well below your asset base.",
      tone: ratio > 40 ? "orange" : "green",
      href: `/ai?q=${encodeURIComponent("/loans How risky are my liabilities right now?")}`,
    });
  }

  if (investCount > 0) {
    const share =
      summary.totalAssets > 0
        ? (summary.investmentValue / summary.totalAssets) * 100
        : 0;
    insights.push({
      id: "invest",
      title: `Investments are ${share.toFixed(0)}% of assets`,
      detail:
        share < 20
          ? "Room to grow long-term allocation if cash is ample."
          : "Portfolio share is a meaningful part of your twin.",
      tone: "purple",
      href: `/ai?q=${encodeURIComponent("@investments How is my investment portfolio allocated?")}`,
    });
  } else {
    insights.push({
      id: "invest-missing",
      title: "No investment containers yet",
      detail: "Add brokerage, gold, or crypto to track growth assets.",
      tone: "purple",
    });
  }

  return insights.slice(0, 4);
}

export function groupSectionTotal(
  items: FinancialContainer[],
  baseCurrency: string,
): number {
  return items.reduce((sum, c) => {
    if (!c.include_in_net_worth) return sum;
    const amount = convertAmount(
      Number(c.balance) || 0,
      c.currency || baseCurrency,
      baseCurrency,
    );
    return sum + (isLiabilityType(c.type) ? -amount : amount);
  }, 0);
}

export function groupAccent(group: string): string {
  switch (group) {
    case "liquid":
      return "#16A34A";
    case "invest":
      return "#7C3AED";
    case "credit":
      return "#F97316";
    case "people":
      return "#0D9488";
    default:
      return "#6B7280";
  }
}

export function recentAccountActivity(
  containers: FinancialContainer[],
  transactions: LedgerTransaction[],
  limit = 8,
) {
  const byId = containerMap(containers);
  return [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .filter(
      (t) =>
        (t.source_container_id && byId.has(t.source_container_id)) ||
        (t.destination_container_id && byId.has(t.destination_container_id)),
    )
    .slice(0, limit)
    .map((txn) => {
      const linked =
        (txn.source_container_id
          ? byId.get(txn.source_container_id)
          : undefined) ||
        (txn.destination_container_id
          ? byId.get(txn.destination_container_id)
          : undefined);
      const meta = linked ? getContainerMeta(linked.type) : null;
      const signed =
        txn.type === "expense"
          ? -Number(txn.amount)
          : txn.type === "income"
            ? Number(txn.amount)
            : Number(txn.amount);
      return {
        id: txn.id,
        accountName: linked?.name || txn.source_name || "Account",
        accountColor: linked?.color || meta?.defaultColor || "#6B7280",
        description: txn.description || txn.merchant || txn.type,
        amount: signed,
        currency: txn.currency || linked?.currency || "USD",
        date: txn.date,
        type: txn.type,
      };
    });
}
