"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { StatusDot } from "@/components/ui/status-dot";
import { personalAccounts } from "@/lib/accounts/personal";
import {
  buildCashFlowBuckets,
  cashFlowWindow,
  filterCashFlowTransactions,
  type CashFlowRange,
  type CashFlowSeries,
} from "@/lib/cash-flow";
import {
  formatCompactCurrency,
  formatCurrency,
  formatRelativeDate,
} from "@/lib/format";
import type { FinancialContainer, LedgerTransaction } from "@/types";
import { cn } from "@/lib/cn";

const RANGES: Array<{ id: CashFlowRange; label: string }> = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "month", label: "Month" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "12m", label: "1Y" },
];

const SERIES: Array<{ id: CashFlowSeries; label: string }> = [
  { id: "both", label: "In + Out" },
  { id: "in", label: "Inflow" },
  { id: "out", label: "Outflow" },
];

export function CashFlowChart({
  transactions,
  accounts,
  currency,
}: {
  transactions: LedgerTransaction[];
  accounts: FinancialContainer[];
  currency: string;
}) {
  const personal = useMemo(() => personalAccounts(accounts), [accounts]);
  const [range, setRange] = useState<CashFlowRange>("month");
  const [accountId, setAccountId] = useState("all");
  const [series, setSeries] = useState<CashFlowSeries>("both");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setWidth(el.clientWidth);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelectedKey(null);
  }, [range, accountId, series]);

  const window = cashFlowWindow(range);
  const narrow = width > 0 && width < 560;
  const granularity =
    window.granularity === "day" && (range === "30d" || range === "month") && narrow
      ? "week"
      : window.granularity;

  const buckets = useMemo(
    () =>
      buildCashFlowBuckets(transactions, {
        range,
        accountId,
        granularity,
      }),
    [transactions, range, accountId, granularity],
  );

  const totals = useMemo(() => {
    return buckets.reduce(
      (acc, bucket) => {
        acc.inflow += bucket.inflow;
        acc.outflow += bucket.outflow;
        acc.txCount += bucket.txCount;
        return acc;
      },
      { inflow: 0, outflow: 0, txCount: 0 },
    );
  }, [buckets]);

  const selected =
    buckets.find((bucket) => bucket.key === selectedKey) ||
    buckets.reduce<(typeof buckets)[number] | null>((best, bucket) => {
      if (!best || bucket.txCount > best.txCount) return bucket;
      return best;
    }, null);

  const selectedTx = useMemo(() => {
    if (!selected) return [];
    return filterCashFlowTransactions(transactions, {
      accountId,
      start: selected.start,
      end: selected.end,
      series,
    }).slice(0, 6);
  }, [transactions, accountId, selected, series]);

  const accountMix = useMemo(() => {
    if (!selected) return [];
    const rows = new Map<
      string,
      { id: string; name: string; inflow: number; outflow: number }
    >();
    for (const tx of filterCashFlowTransactions(transactions, {
      accountId,
      start: selected.start,
      end: selected.end,
      series,
    })) {
      const ids = [tx.source_container_id, tx.destination_container_id].filter(
        Boolean,
      ) as string[];
      for (const id of ids) {
        if (accountId !== "all" && id !== accountId) continue;
        const account = personal.find((item) => item.id === id);
        const name =
          account?.name ||
          (id === tx.source_container_id
            ? tx.source_name
            : tx.destination_name) ||
          "Account";
        const current = rows.get(id) || {
          id,
          name,
          inflow: 0,
          outflow: 0,
        };
        if (tx.type === "income" || (tx.type === "transfer" && tx.destination_container_id === id)) {
          current.inflow += Math.abs(Number(tx.amount_base ?? tx.amount) || 0);
        }
        if (tx.type === "expense" || (tx.type === "transfer" && tx.source_container_id === id)) {
          current.outflow += Math.abs(Number(tx.amount_base ?? tx.amount) || 0);
        }
        rows.set(id, current);
      }
    }
    return [...rows.values()]
      .sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow))
      .slice(0, 4);
  }, [selected, transactions, accountId, series, personal]);

  const net = totals.inflow - totals.outflow;
  const showIn = series !== "out";
  const showOut = series !== "in";

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2>Cash flow</h2>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
              Inflow and outflow from your ledger
              {accountId === "all"
                ? ", excluding transfers between your own accounts"
                : ", including transfers through this account"}
              .
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Select
              aria-label="Account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="h-9 min-w-0 sm:h-10 sm:w-44"
            >
              <option value="all">All accounts</option>
              {personal.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-1 overflow-x-auto pb-0.5">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRange(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ds-focus",
                  range === item.id
                    ? "bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)]"
                    : "bg-[var(--ds-background-100)] text-[var(--ds-gray-900)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {SERIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSeries(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ds-focus",
                  series === item.id
                    ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]"
                    : "text-[var(--ds-gray-700)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Inflow"
            value={formatCurrency(totals.inflow, currency)}
            tone="green"
          />
          <Stat
            label="Outflow"
            value={formatCurrency(totals.outflow, currency)}
            tone="orange"
          />
          <Stat
            label="Net"
            value={`${net >= 0 ? "+" : "−"}${formatCurrency(Math.abs(net), currency)}`}
            tone={net >= 0 ? "green" : "orange"}
          />
          <Stat
            label="Transactions"
            value={String(totals.txCount)}
            tone="blue"
          />
        </div>

        <div ref={wrapRef} className="min-w-0">
          {totals.txCount === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--ds-gray-700)]">
              No matching inflow or outflow in this window.
            </p>
          ) : (
            <CashFlowArea
              buckets={buckets}
              currency={currency}
              width={width}
              showIn={showIn}
              showOut={showOut}
              selectedKey={selected?.key ?? null}
              onSelect={setSelectedKey}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-[11px] text-[var(--ds-gray-700)]">
          {showIn ? (
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="green" /> Inflow
            </span>
          ) : null}
          {showOut ? (
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="orange" /> Outflow
            </span>
          ) : null}
          <span>
            {granularity === "day"
              ? "By day"
              : granularity === "week"
                ? "By week"
                : "By month"}
          </span>
        </div>

        {selected && totals.txCount > 0 ? (
          <div className="min-w-0 space-y-3 rounded-[10px] bg-[var(--ds-background-100)] p-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--ds-gray-1000)]">
                  {selected.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--ds-gray-700)]">
                  {selected.txCount} tx ·{" "}
                  {formatCurrency(selected.inflow, currency)} in ·{" "}
                  {formatCurrency(selected.outflow, currency)} out
                </p>
              </div>
              <Link
                href="/expenses"
                className="shrink-0 text-xs text-[var(--ds-focus-color)]"
              >
                All transactions
              </Link>
            </div>

            {accountMix.length > 0 ? (
              <ul className="grid min-w-0 gap-2 sm:grid-cols-2">
                {accountMix.map((row) => (
                  <li
                    key={row.id}
                    className="min-w-0 rounded-[8px] bg-[var(--ds-background-elevated)] px-2.5 py-2"
                  >
                    <p className="truncate text-xs font-medium text-[var(--ds-gray-1000)]">
                      {row.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--ds-gray-700)]">
                      {row.inflow > 0
                        ? `+${formatCurrency(row.inflow, currency)}`
                        : ""}
                      {row.inflow > 0 && row.outflow > 0 ? " · " : ""}
                      {row.outflow > 0
                        ? `−${formatCurrency(row.outflow, currency)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            {selectedTx.length ? (
              <ul className="min-w-0 divide-y divide-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)]">
                {selectedTx.map((tx) => {
                  const flow =
                    tx.type === "transfer"
                      ? `${tx.source_name || "—"} → ${tx.destination_name || "—"}`
                      : tx.type === "expense"
                        ? tx.source_name || "Expense"
                        : tx.destination_name || "Income";
                  const sign =
                    tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
                  return (
                    <li
                      key={tx.id}
                      className="flex min-w-0 items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-xs text-[var(--ds-gray-1000)]">
                          {tx.description}
                        </p>
                        <p className="truncate text-[10px] text-[var(--ds-gray-700)]">
                          {formatRelativeDate(tx.date)} · {flow}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-medium tabular-nums">
                        {sign}
                        {formatCurrency(tx.amount, tx.currency || currency)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "orange" | "blue";
}) {
  return (
    <div className="min-w-0 rounded-[10px] bg-[var(--ds-background-100)] px-2.5 py-2">
      <p className="truncate text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-sm font-semibold tabular-nums"
        style={{
          color:
            tone === "green"
              ? "var(--ds-status-green)"
              : tone === "orange"
                ? "var(--ds-status-orange)"
                : "var(--ds-gray-1000)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function seriesPath(
  points: Array<{ x: number; y: number }>,
  baseline: number,
  closed: boolean,
) {
  if (!points.length) return "";
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  if (!closed) return line;
  return `${line} L${points[points.length - 1].x} ${baseline} L${points[0].x} ${baseline} Z`;
}

function CashFlowArea({
  buckets,
  currency,
  width,
  showIn,
  showOut,
  selectedKey,
  onSelect,
}: {
  buckets: ReturnType<typeof buildCashFlowBuckets>;
  currency: string;
  width: number;
  showIn: boolean;
  showOut: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const height = width > 0 && width < 480 ? 196 : 228;
  const pad = { top: 14, right: 14, bottom: 28, left: 40 };
  const stepMin = width >= 720 ? 28 : 36;
  const innerWidth = Math.max(
    width - pad.left - pad.right,
    Math.max(1, buckets.length - 1) * stepMin,
  );
  const svgWidth = pad.left + innerWidth + pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const peak = Math.max(
    1,
    ...buckets.map((bucket) =>
      Math.max(showIn ? bucket.inflow : 0, showOut ? bucket.outflow : 0),
    ),
  );
  const step = buckets.length > 1 ? innerWidth / (buckets.length - 1) : 0;
  const points = buckets.map((bucket, index) => {
    const x = pad.left + (buckets.length === 1 ? innerWidth / 2 : index * step);
    return {
      x,
      inY: pad.top + chartHeight - (bucket.inflow / peak) * chartHeight,
      outY: pad.top + chartHeight - (bucket.outflow / peak) * chartHeight,
    };
  });
  const baseline = pad.top + chartHeight;
  const inLine = points.map((point) => ({ x: point.x, y: point.inY }));
  const outLine = points.map((point) => ({ x: point.x, y: point.outY }));
  const active = hover ?? buckets.findIndex((bucket) => bucket.key === selectedKey);
  const labelEvery = buckets.length > 16 ? 4 : buckets.length > 10 ? 2 : 1;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  function indexFromClientX(clientX: number, target: SVGSVGElement) {
    const rect = target.getBoundingClientRect();
    const scale = svgWidth / rect.width;
    const x = (clientX - rect.left) * scale;
    if (!points.length) return 0;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((point, index) => {
      const dist = Math.abs(point.x - x);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    });
    return best;
  }

  const tip = active >= 0 ? buckets[active] : null;
  const tipX = active >= 0 ? points[active]?.x ?? 0 : 0;
  const tipLeft = Math.min(Math.max(tipX - 78, 8), svgWidth - 164);

  return (
    <div className="relative min-w-0 overflow-x-auto">
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="block max-w-none touch-pan-y"
        role="img"
        aria-label="Inflow and outflow area chart"
        onPointerMove={(event) => {
          setHover(indexFromClientX(event.clientX, event.currentTarget));
        }}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(event) => {
          const index = indexFromClientX(event.clientX, event.currentTarget);
          setHover(index);
          onSelect(buckets[index].key);
        }}
      >
        {ticks.map((tick) => {
          const y = pad.top + chartHeight - tick * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={svgWidth - pad.right}
                y1={y}
                y2={y}
                stroke="color-mix(in srgb, var(--ds-gray-1000) 9%, transparent)"
                strokeWidth={1}
              />
              <text
                x={pad.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-[var(--ds-gray-700)]"
                fontSize={9}
              >
                {formatCompactCurrency(peak * tick, currency)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) =>
          index % labelEvery === 0 ? (
            <line
              key={`v-${buckets[index].key}`}
              x1={point.x}
              x2={point.x}
              y1={pad.top}
              y2={baseline}
              stroke="color-mix(in srgb, var(--ds-gray-1000) 6%, transparent)"
              strokeWidth={1}
            />
          ) : null,
        )}

        {showOut ? (
          <>
            <path
              d={seriesPath(outLine, baseline, true)}
              fill="color-mix(in srgb, var(--ds-status-orange) 22%, transparent)"
            />
            <path
              d={seriesPath(outLine, baseline, false)}
              fill="none"
              stroke="var(--ds-status-orange)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : null}
        {showIn ? (
          <>
            <path
              d={seriesPath(inLine, baseline, true)}
              fill="color-mix(in srgb, var(--ds-status-green) 22%, transparent)"
            />
            <path
              d={seriesPath(inLine, baseline, false)}
              fill="none"
              stroke="var(--ds-status-green)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {active >= 0 && points[active] ? (
          <line
            x1={points[active].x}
            x2={points[active].x}
            y1={pad.top}
            y2={baseline}
            stroke="color-mix(in srgb, var(--ds-gray-1000) 35%, transparent)"
            strokeWidth={1.25}
            strokeDasharray="3 3"
          />
        ) : null}

        {points.map((point, index) => (
          <g key={buckets[index].key}>
            {showOut ? (
              <circle
                cx={point.x}
                cy={point.outY}
                r={active === index ? 5 : 3.5}
                fill="var(--ds-background-elevated)"
                stroke="var(--ds-status-orange)"
                strokeWidth={2}
              />
            ) : null}
            {showIn ? (
              <circle
                cx={point.x}
                cy={point.inY}
                r={active === index ? 5 : 3.5}
                fill="var(--ds-background-elevated)"
                stroke="var(--ds-status-green)"
                strokeWidth={2}
              />
            ) : null}
            {index % labelEvery === 0 ? (
              <text
                x={point.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-[var(--ds-gray-700)]"
                fontSize={9}
              >
                {buckets[index].shortLabel}
              </text>
            ) : null}
          </g>
        ))}
      </svg>

      {tip ? (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[148px] max-w-[180px] rounded-[10px] bg-[var(--ds-background-elevated)] px-2.5 py-2 shadow-[var(--ds-shadow-menu)]"
          style={{ left: tipLeft }}
        >
          <p className="truncate text-[10px] font-medium text-[var(--ds-gray-1000)]">
            {tip.label}
          </p>
          {showIn ? (
            <p className="mt-1 truncate text-[11px] text-[var(--ds-status-green)]">
              In {formatCurrency(tip.inflow, currency)}
            </p>
          ) : null}
          {showOut ? (
            <p className="truncate text-[11px] text-[var(--ds-status-orange)]">
              Out {formatCurrency(tip.outflow, currency)}
            </p>
          ) : null}
          <p className="truncate text-[10px] text-[var(--ds-gray-700)]">
            {tip.txCount} tx
          </p>
        </div>
      ) : null}
    </div>
  );
}
