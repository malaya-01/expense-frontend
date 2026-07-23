import type { ContainerType } from "@/types";

export const CONTAINER_TYPES: Array<{
  value: ContainerType;
  label: string;
  group: "liquid" | "invest" | "credit" | "people" | "other";
  isLiability: boolean;
  defaultColor: string;
}> = [
  { value: "cash", label: "Cash", group: "liquid", isLiability: false, defaultColor: "#10B981" },
  { value: "wallet", label: "Wallet", group: "liquid", isLiability: false, defaultColor: "#059669" },
  { value: "bank", label: "Bank account", group: "liquid", isLiability: false, defaultColor: "#0072F5" },
  {
    value: "credit_card",
    label: "Credit card",
    group: "credit",
    isLiability: true,
    defaultColor: "#F97316",
  },
  {
    value: "investment",
    label: "Investment",
    group: "invest",
    isLiability: false,
    defaultColor: "#7C3AED",
  },
  { value: "gold", label: "Gold", group: "invest", isLiability: false, defaultColor: "#F59E0B" },
  { value: "crypto", label: "Crypto", group: "invest", isLiability: false, defaultColor: "#6366F1" },
  { value: "loan", label: "Loan", group: "credit", isLiability: true, defaultColor: "#DC2626" },
  {
    value: "receivable",
    label: "Receivable (owed to you)",
    group: "people",
    isLiability: false,
    defaultColor: "#22C55E",
  },
  {
    value: "payable",
    label: "Payable (you owe)",
    group: "people",
    isLiability: true,
    defaultColor: "#EA580C",
  },
  { value: "other", label: "Other", group: "other", isLiability: false, defaultColor: "#8F8F8F" },
];

export function getContainerMeta(type: ContainerType) {
  return CONTAINER_TYPES.find((t) => t.value === type) ?? CONTAINER_TYPES[CONTAINER_TYPES.length - 1];
}

export function isLiabilityType(type: ContainerType) {
  return getContainerMeta(type).isLiability;
}

export function isLiquidType(type: ContainerType) {
  return type === "cash" || type === "wallet" || type === "bank";
}

export const GROUP_LABELS: Record<string, string> = {
  liquid: "Cash & Bank Accounts",
  invest: "Investments",
  credit: "Credit Cards & Loans",
  people: "People",
  other: "Other",
};
