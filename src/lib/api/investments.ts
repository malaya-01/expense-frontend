import { api, unwrap } from "./client";
import type {
  CreateInvestmentInput,
  InvestmentHolding,
  InvestmentsPayload,
} from "@/types";
import { investmentsRepo } from "@/lib/offline/repos";
import { isOnline } from "@/lib/offline/network";
import { offlineDb } from "@/lib/offline/db";

function normalizeHolding(row: any): InvestmentHolding {
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
    market_value_base: Number(row.market_value_base ?? market_value),
    cost_basis_base: Number(row.cost_basis_base ?? cost_basis),
  };
}

function summarize(holdings: InvestmentHolding[]): InvestmentsPayload {
  const total_value = holdings.reduce((s, h) => s + Number(h.market_value), 0);
  const total_cost = holdings.reduce((s, h) => s + Number(h.cost_basis), 0);
  const total_gain = total_value - total_cost;
  return {
    holdings,
    summary: {
      total_value,
      total_cost,
      total_gain,
      gain_percent: total_cost ? (total_gain / total_cost) * 100 : 0,
      holding_count: holdings.length,
      allocation: [],
      base_currency: "USD",
    },
  };
}

export async function listInvestments(): Promise<InvestmentsPayload> {
  if (isOnline()) {
    try {
      const res = await api.get("/investments");
      const data = unwrap<InvestmentsPayload>(res);
      const holdings = (data.holdings || []).map(normalizeHolding);
      await offlineDb.transaction("rw", offlineDb.investments, async () => {
        for (const h of holdings) {
          await offlineDb.investments.put({ ...h, _pending: false } as any);
        }
      });
      return {
        holdings,
        summary: {
          ...data.summary,
          total_value: Number(data.summary?.total_value || 0),
          total_cost: Number(data.summary?.total_cost || 0),
          total_gain: Number(data.summary?.total_gain || 0),
          gain_percent: Number(data.summary?.gain_percent || 0),
          holding_count: Number(data.summary?.holding_count || 0),
          allocation: (data.summary?.allocation || []).map((a) => ({
            ...a,
            value: Number(a.value),
            percent: Number(a.percent),
          })),
        },
      };
    } catch {
      /* fall through */
    }
  }
  const holdings = (await investmentsRepo.list()).map(normalizeHolding);
  return summarize(holdings);
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
