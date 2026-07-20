import type { FinancialContainer } from "@/types";
import { isLiabilityType, isLiquidType } from "./types-meta";
import { convertAmount } from "@/lib/currency/currency.data";

export type TwinSummary = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalCash: number;
  investmentValue: number;
  containerCount: number;
  baseCurrency: string;
};

/** Summarize twin values converted into the user's base currency. */
export function summarizeTwin(
  containers: FinancialContainer[],
  baseCurrency = "USD",
): TwinSummary {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalCash = 0;
  let investmentValue = 0;
  const base = baseCurrency.toUpperCase();

  for (const c of containers) {
    if (!c.include_in_net_worth) continue;
    const native = Number(c.balance) || 0;
    const amount = convertAmount(native, c.currency || base, base);
    if (isLiabilityType(c.type)) {
      totalLiabilities += amount;
    } else {
      totalAssets += amount;
      if (isLiquidType(c.type)) totalCash += amount;
      if (
        c.type === "investment" ||
        c.type === "gold" ||
        c.type === "crypto"
      ) {
        investmentValue += amount;
      }
    }
  }

  return {
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    totalCash,
    investmentValue,
    containerCount: containers.length,
    baseCurrency: base,
  };
}
