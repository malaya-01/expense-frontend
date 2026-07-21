import { api, unwrap } from "./client";
import type {
  CreateInvestmentInput,
  InvestmentHolding,
  InvestmentsPayload,
} from "@/types";

function normalizeHolding(row: InvestmentHolding): InvestmentHolding {
  return {
    ...row,
    quantity: Number(row.quantity),
    avg_cost: Number(row.avg_cost),
    current_price: Number(row.current_price),
    cost_basis: Number(row.cost_basis),
    market_value: Number(row.market_value),
    gain: Number(row.gain),
    gain_percent: Number(row.gain_percent),
    market_value_base: Number(row.market_value_base),
    cost_basis_base: Number(row.cost_basis_base),
  };
}

export async function listInvestments(): Promise<InvestmentsPayload> {
  const res = await api.get("/investments");
  const data = unwrap<InvestmentsPayload>(res);
  return {
    holdings: (data.holdings || []).map(normalizeHolding),
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
}

export async function createInvestment(
  payload: CreateInvestmentInput,
): Promise<InvestmentHolding> {
  const res = await api.post("/investments", payload);
  return normalizeHolding(unwrap<InvestmentHolding>(res));
}

export async function updateInvestment(
  id: string,
  payload: Partial<CreateInvestmentInput>,
): Promise<InvestmentHolding> {
  const res = await api.patch(`/investments/${id}`, payload);
  return normalizeHolding(unwrap<InvestmentHolding>(res));
}

export async function deleteInvestment(id: string): Promise<void> {
  await api.delete(`/investments/${id}`);
}
