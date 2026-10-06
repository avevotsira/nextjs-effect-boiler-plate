import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { km } from "date-fns/locale/km";
import { twMerge } from "tailwind-merge";

interface FormatDateOptions {
  formatStr?: string; // date-fns format string
  localeCode?: string;
  isUtc?: boolean;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const numberFormatters = {
  en: new Intl.NumberFormat("en", { useGrouping: false }),
  km: new Intl.NumberFormat("km-KH", {
    numberingSystem: "khmr",
    useGrouping: false,
  }),
} as const;

export function formatNumberByLocale(
  value: number,
  locale: string = "en",
): string {
  const key = locale === "km" ? "km" : "en";
  return numberFormatters[key].format(value);
}

const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];

function toKhmerDigits(text: string) {
  return text.replace(/\d/g, (d) => khmerDigits[Number(d)]);
}

export function formatNumber(
  value: number,
  locale: string = "en",
  useGrouping = false,
  minimumIntegerDigits = 1,
) {
  const formatted = new Intl.NumberFormat("en-US", {
    useGrouping,
    minimumIntegerDigits,
  }).format(value);

  return locale.startsWith("km") ? toKhmerDigits(formatted) : formatted;
}

/**
 * Formats a date using date-fns with locale string from i18n.
 */
export function formatDate(
  input: string | Date,
  options: FormatDateOptions = {},
): string {
  const { formatStr = "yyyy-MM-dd", localeCode = "en" } = options;

  const date = new Date(input);

  if (isNaN(date.getTime())) return "";

  const currentLocale = localeCode.split("-")[0];
  const selectedLocale = currentLocale === "km" ? km : enUS;

  const formattedDate = format(date, formatStr, {
    locale: selectedLocale,
  });

  if (currentLocale === "km") {
    return formattedDate.replace(/\d/g, (digit) => "០១២៣៤៥៦៧៨៩"[Number(digit)]);
  }

  return formattedDate;
}

/** Cambodia's zone: server and browser show every time in it. */
export const TIME_ZONE = "Asia/Phnom_Penh";

// Chrome and Edge have no Khmer `Intl` data and fall back to English, while
// the server has it, so anything Intl spells out in Khmer (a month name, the
// USD pattern) differs between server and browser and breaks hydration.
// Times and money are therefore built from en-US, which every browser has,
// and read the same in both languages.
const timestampFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const usdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** "05/10/2026 16:30" in Cambodia's time: DD/MM/YYYY plus the time. */
export function formatTimestamp(iso: string): string {
  const part = Object.fromEntries(
    timestampFormat
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value]),
  );
  return `${part.day}/${part.month}/${part.year} ${part.hour}:${part.minute}`;
}

/** "$1,200,000.00" in both languages. */
export const formatUsd = (amount: number) => usdFormat.format(amount);

/** "482 KB", "2.3 MB": a file's size as people read it (ported from PRS). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
