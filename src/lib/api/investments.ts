import type {
  CreateInvestmentInput,
  InvestmentHolding,
  InvestmentsPayload,
} from "@/types";
import { investmentsRepo } from "@/lib/offline/repos";
import { convertAmount } from "@/lib/currency/currency.data";
import { USER_STORAGE_KEY } from "@/lib/store/slices/authSlice";

/** The signed-in user's base currency, as cached by the auth store. */
function storedBaseCurrency(): string {
  if (typeof window === "undefined") return "USD";
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    const currency = raw ? JSON.parse(raw)?.currency : null;
    return typeof currency === "string" && currency ? currency.toUpperCase() : "USD";
  } catch {
    return "USD";
  }
}

function normalizeHolding(
  row: any,
  baseCurrency = storedBaseCurrency(),
): InvestmentHolding {
  const quantity = Number(row.quantity || 0);
  const avg_cost = Number(row.avg_cost || 0);
  const current_price = Number(row.current_price || 0);
  const cost_basis = Number(row.cost_basis ?? quantity * avg_cost);
  const market_value = Number(row.market_value ?? quantity * current_price);
  const gain = Number(row.gain ?? market_value - cost_basis);
  return {
    ...row,
    quantity,
    avg_cost,
    current_price,
    cost_basis,
    market_value,
    gain,
    gain_percent: Number(
      row.gain_percent ?? (cost_basis ? (gain / cost_basis) * 100 : 0),
    ),
    // Rows created offline have no server-computed base values yet.
    market_value_base: Number(
      row.market_value_base ??
        convertAmount(market_value, row.currency || baseCurrency, baseCurrency),
    ),
    cost_basis_base: Number(
      row.cost_basis_base ??
        convertAmount(cost_basis, row.currency || baseCurrency, baseCurrency),
    ),
    base_currency: row.base_currency || baseCurrency,
  };
}

function summarize(
  holdings: InvestmentHolding[],
  baseCurrency: string,
): InvestmentsPayload {
  // Sum in the base currency; holdings can each be in a different currency.
  const total_value = holdings.reduce(
    (s, h) => s + Number(h.market_value_base),
    0,
  );
  const total_cost = holdings.reduce(
    (s, h) => s + Number(h.cost_basis_base),
    0,
  );
  const total_gain = total_value - total_cost;
  const byType = new Map<string, number>();
  for (const h of holdings) {
    byType.set(
      h.asset_type,
      (byType.get(h.asset_type) || 0) + Number(h.market_value_base),
    );
  }
  const allocation = [...byType.entries()]
    .map(([asset_type, value]) => ({
      asset_type,
      value,
      percent:
        total_value > 0 ? Math.round((value / total_value) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);
  return {
    holdings,
    summary: {
      total_value,
      total_cost,
      total_gain,
      gain_percent: total_cost ? (total_gain / total_cost) * 100 : 0,
      holding_count: holdings.length,
      allocation,
      base_currency: baseCurrency,
    },
  };
}

export async function listInvestments(): Promise<InvestmentsPayload> {
  const baseCurrency = storedBaseCurrency();
  const holdings = (await investmentsRepo.list()).map((row) =>
    normalizeHolding(row, baseCurrency),
  );
  return summarize(holdings, baseCurrency);
}

export async function createInvestment(
  payload: CreateInvestmentInput,
): Promise<InvestmentHolding> {
  return normalizeHolding(await investmentsRepo.create(payload as any));
}

export async function updateInvestment(
  id: string,
  payload: Partial<CreateInvestmentInput>,
): Promise<InvestmentHolding> {
  return normalizeHolding(await investmentsRepo.update(id, payload as any));
}

export async function deleteInvestment(id: string): Promise<void> {
  await investmentsRepo.remove(id);
}
