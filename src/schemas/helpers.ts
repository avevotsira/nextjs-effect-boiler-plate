import { z } from "zod";

/** `?page=` on list endpoints. Anything unreadable means the first page. */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

/** The keys of a dropdown list as a Zod enum: what a record stores. */
export const enumOfKeys = <T extends object>(list: T) =>
  z.enum(
    // SAFETY: `Object.keys` of a literal object returns exactly its keys.
    Object.keys(list) as [keyof T & string, ...(keyof T & string)[]],
    { error: "validation.required" },
  );

/**
 * A list's state back into its URL: "?q=angkor&page=2". Empty values and the
 * first page are left out, so an unfiltered list is just its path.
 */
export function toQueryString(
  query: Readonly<Record<string, string | number | undefined>>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== "" && !(key === "page" && value === 1))
      params.set(key, String(value));
  const text = params.toString();
  return text ? `?${text}` : "";
}

// --- form fields -------------------------------------------------------------
// Messages are `validation.*` keys the forms translate.

/** Longest name and note; the forms' boxes stop typing at the same lengths. */
export const NAME_MAX_LENGTH = 255;
export const NOTE_MAX_LENGTH = 2000;

// Zero-width characters survive `trim()`. Khmer puts U+200B between words,
// so only a name made of nothing else is refused.
export const requiredText = z
  .string({ error: "validation.required" })
  .trim()
  .max(NAME_MAX_LENGTH, { error: "validation.too_long" })
  .regex(/[^\s\u200B-\u200D\u2060\uFEFF]/u, {
    error: "validation.required",
  });

/** Optional text up to `NAME_MAX_LENGTH`; a blank box is no value. */
export const optionalText = z
  .string({ error: "validation.required" })
  .trim()
  .max(NAME_MAX_LENGTH, { error: "validation.too_long" })
  .nullable()
  .transform((value) => value || null);

/** A note up to `NOTE_MAX_LENGTH`; a blank note is no note. */
export const optionalNote = z
  .string({ error: "validation.required" })
  .trim()
  .max(NOTE_MAX_LENGTH, { error: "validation.too_long" })
  .nullable()
  .transform((value) => value || null);

// An empty box is "required", not "not a number": the forms' number and date
// inputs send null or "" when blank.
const requiredOr =
  (invalid: string) =>
  ({ input }: z.core.$ZodRawIssue) =>
    input === undefined || input === null || input === ""
      ? "validation.required"
      : invalid;

const number = z.number({ error: requiredOr("validation.number_invalid") });

/** A count of people: a whole number, 0 or more. */
export const wholeCount = number
  .int({ error: "validation.whole_number" })
  .nonnegative({ error: "validation.not_negative" })
  .max(2_147_483_647, { error: "validation.number_invalid" });

// Zod's date check knows month lengths and leap years: 31/02 is refused.
export const isoDate = z.iso.date({
  error: requiredOr("validation.date_invalid"),
});

/** A date that may be left blank; the date input sends "" for blank. */
export const optionalIsoDate = z
  .string({ error: "validation.date_invalid" })
  .nullable()
  .transform((value) => value || null)
  .pipe(z.iso.date({ error: "validation.date_invalid" }).nullable());

// A filter the URL gets wrong (an edited link, a list key since removed) is
// dropped rather than failing the page.
export const optionalFilter = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined);

/** A year from 1900 up to this one, such as 2019. */
export const pastYear = number
  .int({ error: "validation.year_invalid" })
  .min(1900, { error: "validation.year_invalid" })
  .refine((year) => year <= new Date().getFullYear(), {
    error: "validation.year_future",
  });

/** Several choices from one list, at least one, each kept once. */
export const oneOrMore = <T extends z.ZodType<string>>(choice: T) =>
  z
    .array(choice, { error: "validation.choose_one_or_more" })
    .min(1, { error: "validation.choose_one_or_more" })
    .transform((choices) => [...new Set(choices)]);

/** An email address that may be left blank. */
export const optionalEmail = optionalText.refine(
  (email) => email === null || z.email().safeParse(email).success,
  { error: "validation.email_invalid" },
);
