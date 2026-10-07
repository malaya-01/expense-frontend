import type {
  DateFormat,
  NumberFormat,
  WeekStart,
} from "@/lib/preferences/types";

/* -------------------------------------------------------------------------- */
/* Formatting context                                                         */
/*                                                                            */
/* The user's regional preferences (Settings > Regional & formatting) are     */
/* pushed here at startup from the locally cached profile, and again whenever */
/* they change (see src/lib/preferences/listeners.ts). Every helper below     */
/* reads them, so amounts and dates across the app follow the user's choice   */
/* without each call site passing a locale.                                   */
/* -------------------------------------------------------------------------- */

export type FormatSettings = {
  /** BCP 47 locale for month names, currency symbol placement, "auto" formats. */
  locale: string;
  /** IANA zone for instants (timestamps). Calendar dates are never shifted. */
  timeZone?: string;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  /** 0 Sunday, 1 Monday, 6 Saturday. */
  weekStart: WeekStart;
};

const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  locale: "en-US",
  timeZone: undefined,
  dateFormat: "auto",
  numberFormat: "auto",
  weekStart: 1,
};

let settings: FormatSettings = { ...DEFAULT_FORMAT_SETTINGS };
const formatterCache = new Map<string, Intl.NumberFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function validLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

function validTimeZone(timeZone: string | undefined): string | undefined {
  if (!timeZone) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Replace the formatting context. Missing / invalid values fall back to the
 * defaults (en-US, device timezone, locale-driven formats, Monday weeks).
 */
export function configureFormatting(next: Partial<FormatSettings>) {
  settings = {
    locale: validLocale(next.locale) ?? DEFAULT_FORMAT_SETTINGS.locale,
    timeZone: validTimeZone(next.timeZone),
    dateFormat: next.dateFormat ?? DEFAULT_FORMAT_SETTINGS.dateFormat,
    numberFormat: next.numberFormat ?? DEFAULT_FORMAT_SETTINGS.numberFormat,
    weekStart: next.weekStart ?? DEFAULT_FORMAT_SETTINGS.weekStart,
  };
}

export function getFormatSettings(): FormatSettings {
  return settings;
}

/* ------------------------------- Numbers ---------------------------------- */

function numberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, options);
    } catch {
      // Unknown currency code etc. — fall back to a plain decimal.
      const { style: _style, currency: _currency, ...rest } = options;
      formatter = new Intl.NumberFormat(locale, rest);
    }
    formatterCache.set(key, formatter);
  }
  return formatter;
}

const SEPARATORS: Partial<Record<NumberFormat, { group: string; decimal: string }>> = {
  comma_dot: { group: ",", decimal: "." },
  dot_comma: { group: ".", decimal: "," },
  space_comma: { group: " ", decimal: "," },
};

/**
 * Format with the user's number style. An explicit `locale` argument wins
 * over preferences (used where a fixed style is required, e.g. UPI receipts).
 */
function formatNumberWith(
  value: number,
  options: Intl.NumberFormatOptions,
  explicitLocale?: string,
): string {
  if (explicitLocale) {
    return numberFormatter(explicitLocale, options).format(value);
  }
  const style = settings.numberFormat;
  const locale = style === "indian" ? "en-IN" : settings.locale;
  const formatter = numberFormatter(locale, options);
  const separators = SEPARATORS[style];
  if (!separators) return formatter.format(value);
  return formatter
    .formatToParts(value)
    .map((part) =>
      part.type === "group"
        ? separators.group
        : part.type === "decimal"
          ? separators.decimal
          : part.value,
    )
    .join("");
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale?: string,
): string {
  return formatNumberWith(
    Number(amount) || 0,
    { style: "currency", currency, maximumFractionDigits: 2 },
    locale,
  );
}

export function formatCompactCurrency(
  amount: number,
  currency = "USD",
  locale?: string,
): string {
  return formatNumberWith(
    Number(amount) || 0,
    {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    },
    locale,
  );
}

/** Plain number in the user's number style (no currency symbol). */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 2 },
): string {
  return formatNumberWith(Number(value) || 0, options);
}

/* -------------------------------- Dates ----------------------------------- */

function dateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = dateFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatterCache.set(key, formatter);
  }
  return formatter;
}

type YMD = { year: number; month: number; day: number };

const pad2 = (n: number) => String(n).padStart(2, "0");

function monthShortName(ymd: YMD, locale: string): string {
  // Build at noon UTC and format in UTC so the month never shifts.
  const date = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12));
  return dateFormatter(locale, { month: "short", timeZone: "UTC" }).format(date);
}

function formatYMD(ymd: YMD, locale: string): string {
  const { year, month, day } = ymd;
  switch (settings.dateFormat) {
    case "DD/MM/YYYY":
      return `${pad2(day)}/${pad2(month)}/${year}`;
    case "MM/DD/YYYY":
      return `${pad2(month)}/${pad2(day)}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${pad2(month)}-${pad2(day)}`;
    case "D MMM YYYY":
      return `${day} ${monthShortName(ymd, locale)} ${year}`;
    case "MMM D, YYYY":
      return `${monthShortName(ymd, locale)} ${day}, ${year}`;
    default:
      return dateFormatter(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }
}

function localYMD(date: Date): YMD {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/** Y/M/D of an instant in the user's timezone (device zone if unset). */
function zonedYMD(date: Date): YMD {
  if (!settings.timeZone) return localYMD(date);
  const parts = dateFormatter("en-CA", {
    timeZone: settings.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Calendar date (YYYY-MM-DD or ISO) in the user's date format. */
export function formatDate(value: string, locale?: string): string {
  const date = parseCalendarDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatYMD(localYMD(date), locale || settings.locale);
}

/** Short day label for charts / chips, e.g. "8 Oct" or "Oct 8". */
export function formatShortDate(value: string | Date): string {
  const date = typeof value === "string" ? parseCalendarDate(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const ymd = localYMD(date);
  const month = monthShortName(ymd, settings.locale);
  switch (settings.dateFormat) {
    case "DD/MM/YYYY":
    case "D MMM YYYY":
      return `${ymd.day} ${month}`;
    case "MM/DD/YYYY":
    case "MMM D, YYYY":
    case "YYYY-MM-DD":
      return `${month} ${ymd.day}`;
    default:
      return dateFormatter(settings.locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12)));
  }
}

/** "Oct 2026" style month label in the user's language. */
export function formatMonthYear(value: string | Date, short = true): string {
  const date = typeof value === "string" ? parseCalendarDate(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const ymd = localYMD(date);
  return dateFormatter(settings.locale, {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ymd.year, ymd.month - 1, 1, 12)));
}

/** Weekday + short date, e.g. "Thu, 8 Oct". */
export function formatWeekdayDate(value: string | Date): string {
  const date = typeof value === "string" ? parseCalendarDate(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const ymd = localYMD(date);
  const weekday = dateFormatter(settings.locale, {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12)));
  return `${weekday}, ${formatShortDate(date)}`;
}

/** Time of an instant in the user's timezone, e.g. "3:45 PM". */
export function formatTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return dateFormatter(settings.locale, {
    hour: "numeric",
    minute: "2-digit",
    ...(settings.timeZone ? { timeZone: settings.timeZone } : {}),
  }).format(date);
}

/** Date only of an instant (timestamp), in the user's timezone + format. */
export function formatInstantDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatYMD(zonedYMD(date), settings.locale);
}

/** Date + time of an instant (created_at, paid_at, sync times …). */
export function formatDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${formatYMD(zonedYMD(date), settings.locale)}, ${formatTime(date)}`;
}

export function formatRelativeDay(value: string): string {
  const date = parseCalendarDate(value);
  const today = parseCalendarDate(todayISO());
  const todaySerial = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dateSerial = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round((todaySerial - dateSerial) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return formatDate(value);
}

export function formatRelativeDate(value: string): string {
  const relative = formatRelativeDay(value);
  return relative === "Today" || relative === "Yesterday"
    ? `${relative} · ${formatDate(value)}`
    : relative;
}

/**
 * Today's calendar date (YYYY-MM-DD) on this device. Deliberately the device
 * clock, not the account timezone: new transactions default to the day the
 * user is living in, even when travelling.
 */
export function todayISO(): string {
  const { year, month, day } = localYMD(new Date());
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Financial dates are calendar dates, not instants. Parse the YYYY-MM-DD
 * portion in local time so UTC conversion cannot shift it to another day.
 */
export function parseCalendarDate(value: string): Date {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Extract YYYY-MM-DD from API / form values without timezone shifting. */
export function toDateOnly(value: unknown): string | null {
  if (value == null || value === "") return null;
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function requireDateOnly(value: unknown, fallback = ""): string {
  return toDateOnly(value) ?? fallback;
}

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/* -------------------------------- Weeks ----------------------------------- */

export function getWeekStart(): WeekStart {
  return settings.weekStart;
}

/** First day (local midnight) of the week containing `date`. */
export function startOfWeek(date: Date, weekStart: number = settings.weekStart): Date {
  const offset = (date.getDay() - weekStart + 7) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

/** Short weekday names ordered from the user's first day of week. */
export function orderedWeekdays(
  weekStart: number = settings.weekStart,
  format: "short" | "long" | "narrow" = "short",
): string[] {
  const formatter = dateFormatter(settings.locale, {
    weekday: format,
    timeZone: "UTC",
  });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    formatter.format(new Date(Date.UTC(2023, 0, 1 + ((weekStart + i) % 7), 12))),
  );
}

/* -------------------------------- Misc ------------------------------------ */

export function initials(name?: string | null, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function formatLockRemaining(until: string | Date | number): string {
  const end = new Date(until).getTime();
  const totalSeconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
  if (totalSeconds <= 0) return "You can try signing in now.";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }
  if (seconds > 0 || minutes === 0) {
    parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  }
  return `Try again in ${parts.join(" ")}.`;
}
