import type { TransactionType } from "@/types";

/**
 * App preferences persisted server-side in users.preferences (JSONB) and
 * cached in localStorage so the offline / mobile app applies them at startup
 * before any network request. Keep in sync with the backend
 * src/api/user/dto/user-preferences.dto.ts.
 */
export type DateFormat =
  | "auto"
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "D MMM YYYY"
  | "MMM D, YYYY";

export type NumberFormat =
  | "auto"
  | "indian"
  | "comma_dot"
  | "dot_comma"
  | "space_comma";

/** JS Date#getDay numbering: 0 Sunday, 1 Monday, 6 Saturday. */
export type WeekStart = 0 | 1 | 6;

export type Density = "comfortable" | "compact";

export type UserPreferences = {
  date_format: DateFormat;
  number_format: NumberFormat;
  week_start: WeekStart;
  /** Legacy single defaults; superseded by the per-type keys below. */
  default_account_id: string | null;
  default_category_id: string | null;
  /** Type "New transaction" opens with. */
  default_transaction_type: TransactionType;
  /** Per-type defaults so each type keeps its own account / category. */
  default_expense_account_id: string | null;
  default_expense_category_id: string | null;
  default_income_account_id: string | null;
  default_income_category_id: string | null;
  default_transfer_from_account_id: string | null;
  default_transfer_to_account_id: string | null;
  remember_last_account: boolean;
  confirm_before_delete: boolean;
  density: Density;
  reduce_motion: boolean;
  /** Percent, 90–120. */
  font_scale: number;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  date_format: "auto",
  number_format: "auto",
  week_start: 1,
  default_account_id: null,
  default_category_id: null,
  default_transaction_type: "expense",
  default_expense_account_id: null,
  default_expense_category_id: null,
  default_income_account_id: null,
  default_income_category_id: null,
  default_transfer_from_account_id: null,
  default_transfer_to_account_id: null,
  remember_last_account: true,
  confirm_before_delete: true,
  density: "comfortable",
  reduce_motion: false,
  font_scale: 100,
};

export const PREFERENCES_STORAGE_KEY = "opal:preferences:v1";
/** Set while a preferences change is queued offline (not yet on the server). */
export const PREFERENCES_PENDING_KEY = "opal:preferences:pending";

export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: "auto", label: "Match language" },
  { value: "D MMM YYYY", label: "D MMM YYYY" },
  { value: "MMM D, YYYY", label: "MMM D, YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

export const NUMBER_FORMAT_OPTIONS: Array<{
  value: NumberFormat;
  label: string;
  example: string;
}> = [
  { value: "auto", label: "Match language", example: "" },
  { value: "indian", label: "Indian (lakh, crore)", example: "12,34,567.89" },
  { value: "comma_dot", label: "1,234,567.89", example: "1,234,567.89" },
  { value: "dot_comma", label: "1.234.567,89", example: "1.234.567,89" },
  { value: "space_comma", label: "1 234 567,89", example: "1 234 567,89" },
];

export const WEEK_START_OPTIONS: Array<{ value: WeekStart; label: string }> = [
  { value: 1, label: "Monday" },
  { value: 0, label: "Sunday" },
  { value: 6, label: "Saturday" },
];

export const FONT_SCALE_MIN = 90;
export const FONT_SCALE_MAX = 120;
export const FONT_SCALE_STEP = 5;

const DATE_FORMATS = DATE_FORMAT_OPTIONS.map((o) => o.value);
const NUMBER_FORMATS = NUMBER_FORMAT_OPTIONS.map((o) => o.value);
const WEEK_STARTS: WeekStart[] = [0, 1, 6];
const TX_TYPES: TransactionType[] = ["expense", "income", "transfer"];

export const TYPE_DEFAULT_KEYS = [
  "default_expense_account_id",
  "default_expense_category_id",
  "default_income_account_id",
  "default_income_category_id",
  "default_transfer_from_account_id",
  "default_transfer_to_account_id",
] as const;

/** Where the legacy single category lands, by the default type it was set for. */
const LEGACY_CATEGORY_SLOT: Partial<
  Record<TransactionType, (typeof TYPE_DEFAULT_KEYS)[number]>
> = {
  expense: "default_expense_category_id",
  income: "default_income_category_id",
};

export type TransactionTypeDefaults = {
  sourceId: string;
  destinationId: string;
  categoryId: string;
};

/**
 * Pre-filled accounts / category for a new transaction of `type`.
 * `lastSourceId` is the last-used paying account ("Remember last used
 * account"); it wins over the configured default for expenses and transfers.
 */
export function transactionDefaultsFor(
  prefs: UserPreferences,
  type: TransactionType,
  lastSourceId = "",
): TransactionTypeDefaults {
  const remembered = prefs.remember_last_account ? lastSourceId : "";
  if (type === "income") {
    return {
      sourceId: "",
      destinationId: prefs.default_income_account_id || "",
      categoryId: prefs.default_income_category_id || "",
    };
  }
  if (type === "transfer") {
    const sourceId = remembered || prefs.default_transfer_from_account_id || "";
    const to = prefs.default_transfer_to_account_id || "";
    return {
      sourceId,
      destinationId: to && to !== sourceId ? to : "",
      categoryId: "",
    };
  }
  return {
    sourceId: remembered || prefs.default_expense_account_id || "",
    destinationId: "",
    categoryId: prefs.default_expense_category_id || "",
  };
}

/** Coerce stored / remote data into a complete, valid preferences object. */
export function normalizePreferences(input: unknown): UserPreferences {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const out: UserPreferences = { ...DEFAULT_PREFERENCES };
  if (DATE_FORMATS.includes(raw.date_format as DateFormat)) {
    out.date_format = raw.date_format as DateFormat;
  }
  if (NUMBER_FORMATS.includes(raw.number_format as NumberFormat)) {
    out.number_format = raw.number_format as NumberFormat;
  }
  const week = Number(raw.week_start);
  if (raw.week_start != null && WEEK_STARTS.includes(week as WeekStart)) {
    out.week_start = week as WeekStart;
  }
  for (const key of ["default_account_id", "default_category_id"] as const) {
    const value = raw[key];
    if (typeof value === "string" && value) out[key] = value;
  }
  if (TX_TYPES.includes(raw.default_transaction_type as TransactionType)) {
    out.default_transaction_type =
      raw.default_transaction_type as TransactionType;
  }
  const perTypeSaved = TYPE_DEFAULT_KEYS.some((key) => key in raw);
  for (const key of TYPE_DEFAULT_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value) out[key] = value;
  }
  if (!perTypeSaved) {
    // Saved before per-type defaults existed. The single account applied to
    // every type; the category only to the default type.
    out.default_expense_account_id = out.default_account_id;
    out.default_income_account_id = out.default_account_id;
    out.default_transfer_from_account_id = out.default_account_id;
    const categorySlot = LEGACY_CATEGORY_SLOT[out.default_transaction_type];
    if (categorySlot) out[categorySlot] = out.default_category_id;
  }
  for (const key of [
    "remember_last_account",
    "confirm_before_delete",
    "reduce_motion",
  ] as const) {
    if (typeof raw[key] === "boolean") out[key] = raw[key] as boolean;
  }
  if (raw.density === "compact" || raw.density === "comfortable") {
    out.density = raw.density;
  }
  const scale = Number(raw.font_scale);
  if (
    Number.isFinite(scale) &&
    scale >= FONT_SCALE_MIN &&
    scale <= FONT_SCALE_MAX
  ) {
    out.font_scale = Math.round(scale);
  }
  return out;
}

export function preferencesEqual(a: UserPreferences, b: UserPreferences) {
  return (Object.keys(DEFAULT_PREFERENCES) as Array<keyof UserPreferences>).every(
    (key) => a[key] === b[key],
  );
}
