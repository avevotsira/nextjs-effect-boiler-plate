import { toLatinDigits } from "./number-input-util";

/**
 * `DateInput`'s text rules, pure so they have a test. The box keeps up to
 * eight digits, DDMMYYYY, shows them as DD/MM/YYYY, and gives the form
 * an ISO date once all eight are in. Whether that date exists (31/02) is the
 * schema's check.
 */

/** Typed text → its digits, or null when it holds anything but digits and "/". */
export function toDateDigits(text: string): string | null {
  const digits = toLatinDigits(text).replaceAll("/", "");
  return /^\d*$/.test(digits) ? digits : null;
}

/**
 * "25122024" → "25/12/2024". A slash appears only once a digit follows it,
 * so Backspace never lands on a slash that comes straight back.
 */
export const formatDateDigits = (digits: string) =>
  [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join("/");

/**
 * What the form gets: "" for nothing, an ISO date for eight digits, and the
 * partial text otherwise, which the schema refuses as not a valid date.
 */
export const dateValueOf = (digits: string) =>
  digits.length === 8
    ? `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
    : formatDateDigits(digits);

/** The digits for a value the form already holds: the reverse of `dateValueOf`. */
export function dateDigitsOf(value: string) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return iso[3] + iso[2] + iso[1];
  return value.replace(/\D/g, "").slice(0, 8);
}
