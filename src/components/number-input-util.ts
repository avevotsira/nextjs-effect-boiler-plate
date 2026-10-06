/**
 * `NumberInput`'s text rules, pure so they have a test. The box keeps the
 * typed text as `raw` ("1234.5", "-", "12."), shows it grouped ("1,234.5"),
 * and gives the form `parseRawNumber(raw)`. Khmer and English write numbers
 * the same way here (1,234.5), so there is one format.
 */

/** Khmer digits ០–៩ become 0–9, so a Khmer keyboard types numbers too. */
export const toLatinDigits = (text: string) =>
  text.replace(/[០-៩]/g, (digit) =>
    String(digit.charCodeAt(0) - "០".charCodeAt(0)),
  );

/** Typed text → raw: Latin digits, no group separators or spaces. */
export const toRawNumber = (text: string) =>
  toLatinDigits(text).replace(/[,\s]/g, "");

export type NumberTypingError = "not_a_number" | "negative" | "decimals";

/** Why `raw` cannot be typed, or null. Range limits are the schema's job. */
export function numberTypingError(
  raw: string,
  { decimals, allowNegative }: { decimals?: number; allowNegative: boolean },
): NumberTypingError | null {
  if (!/^-?\d*(\.\d*)?$/.test(raw)) return "not_a_number";
  if (raw.startsWith("-") && !allowNegative) return "negative";
  const fraction = raw.split(".")[1];
  if (decimals !== undefined && fraction !== undefined)
    if (decimals === 0 || fraction.length > decimals) return "decimals";
  return null;
}

/** The number `raw` stands for; null while it has no digit ("", "-", "."). */
export const parseRawNumber = (raw: string): number | null =>
  /\d/.test(raw) ? Number(raw) : null;

/** The text for a value the form already holds. */
export const rawNumberOf = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

/** "-1234567.5" → "-1,234,567.5". A trailing "." stays, so typing goes on. */
export function formatRawNumber(raw: string) {
  const sign = raw.startsWith("-") ? "-" : "";
  const [whole = "", ...fraction] = raw.slice(sign.length).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + grouped + (fraction.length > 0 ? `.${fraction.join("")}` : "");
}
