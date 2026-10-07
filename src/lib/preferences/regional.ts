import type { SearchOption } from "@/components/settings/settings-ui";

/** Languages / regions offered for formatting (users.locale, max 10 chars). */
export const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-IN", label: "English (India)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-SG", label: "English (Singapore)" },
  { value: "en-AE", label: "English (UAE)" },
  { value: "en-ZA", label: "English (South Africa)" },
  { value: "hi-IN", label: "हिन्दी (India)" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "it-IT", label: "Italiano (Italia)" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "nl-NL", label: "Nederlands (Nederland)" },
  { value: "sv-SE", label: "Svenska (Sverige)" },
  { value: "ja-JP", label: "日本語 (日本)" },
  { value: "zh-CN", label: "中文 (中国)" },
  { value: "ar-AE", label: "العربية (الإمارات)" },
];

/** Suggested language for a country when the user changes country. */
export function suggestLocaleForCountry(country: string): string | null {
  const code = country.toUpperCase();
  const direct = LOCALE_OPTIONS.find((o) => o.value.endsWith(`-${code}`));
  if (!direct) return null;
  // Prefer English for countries where we also list English.
  const english = LOCALE_OPTIONS.find((o) => o.value === `en-${code}`);
  return (english ?? direct).value;
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function offsetMinutes(timeZone: string, at: Date): number {
  try {
    const name =
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "longOffset",
      })
        .formatToParts(at)
        .find((part) => part.type === "timeZoneName")?.value || "GMT";
    const match = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!match) return 0;
    const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
    return match[1] === "-" ? -minutes : minutes;
  } catch {
    return 0;
  }
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

let timeZoneCache: SearchOption[] | null = null;

/** All IANA zones with their current UTC offset, sorted west → east. */
export function timeZoneOptions(): SearchOption[] {
  if (timeZoneCache) return timeZoneCache;
  let zones: string[] = FALLBACK_TIMEZONES;
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported?.length) zones = supported;
  } catch {
    /* older engines: fallback list */
  }
  if (!zones.includes("UTC")) zones = ["UTC", ...zones];
  const now = new Date();
  timeZoneCache = zones
    .map((zone) => {
      const offset = offsetMinutes(zone, now);
      return {
        value: zone,
        label: zone.replace(/_/g, " "),
        hint: formatOffset(offset),
        keywords: zone.split("/").pop()?.replace(/_/g, " "),
        offset,
      };
    })
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label))
    .map(({ offset: _offset, ...option }) => option);
  return timeZoneCache;
}

export function currencyName(code: string, locale = "en"): string {
  try {
    const names = new Intl.DisplayNames([locale], { type: "currency" });
    return names.of(code) || code;
  } catch {
    return code;
  }
}
