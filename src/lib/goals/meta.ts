export const GOAL_TYPES = [
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "vacation", label: "Vacation" },
  { value: "house", label: "House" },
  { value: "marriage", label: "Marriage" },
  { value: "education", label: "Education" },
  { value: "retirement", label: "Retirement" },
  { value: "vehicle", label: "Vehicle" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
] as const;

export function goalTypeLabel(type: string): string {
  return GOAL_TYPES.find((t) => t.value === type)?.label || type;
}
