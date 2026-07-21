export const ASSET_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "mutual_fund", label: "Mutual fund" },
  { value: "etf", label: "ETF" },
  { value: "gold", label: "Gold" },
  { value: "crypto", label: "Crypto" },
  { value: "bond", label: "Bond" },
  { value: "real_estate", label: "Real estate" },
  { value: "other", label: "Other" },
] as const;

export function assetTypeLabel(type: string): string {
  return ASSET_TYPES.find((t) => t.value === type)?.label || type;
}
