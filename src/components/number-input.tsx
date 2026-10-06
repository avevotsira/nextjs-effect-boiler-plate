"use client";

import * as React from "react";

import { InputGroup, InputGroupInput } from "@/components/ui/input-group";

import { useTranslations } from "next-intl";
import { match } from "ts-pattern";

import {
  type NumberTypingError,
  formatRawNumber,
  numberTypingError,
  parseRawNumber,
  rawNumberOf,
  toRawNumber,
} from "./number-input-util";

type NumberInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type" | "children"
> & {
  value: number | null | undefined;
  /** A number, or null for an empty box: never 0 for nothing. */
  onChange: (value: number | null) => void;
  /** Most digits after the point: 0 for whole numbers, unset for no limit. */
  decimals?: number;
  allowNegative?: boolean;
  /** `InputGroupAddon`s around the box, such as a "$". */
  children?: React.ReactNode;
};

/**
 * A number box that shows "1,250,000.50" and gives the form the number. It
 * keeps the typed text, so "12." or "-" survive while typing, and refuses a
 * keystroke that cannot be part of a number, saying why under the box. Khmer
 * digits are read as 0–9. Ranges (≥ 0, the maximum) are the schema's errors.
 */
export function NumberInput({
  value,
  onChange,
  decimals,
  allowNegative = false,
  children,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  onBlur,
  ...props
}: NumberInputProps) {
  const t = useTranslations("validation");
  const errorId = React.useId();
  const [raw, setRaw] = React.useState(() => rawNumberOf(value));
  const [seen, setSeen] = React.useState(value);
  const [typingError, setTypingError] =
    React.useState<NumberTypingError | null>(null);

  // A value written from outside (a reset) replaces the text; the echo of our
  // own `onChange` does not, so "12." keeps its point.
  if (value !== seen) {
    setSeen(value);
    if (parseRawNumber(raw) !== (value ?? null)) setRaw(rawNumberOf(value));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = toRawNumber(e.target.value);
    const problem = numberTypingError(next, { decimals, allowNegative });
    setTypingError(problem);
    if (problem) return; // no onChange: React puts the old text back
    setRaw(next);
    onChange(parseRawNumber(next));
  }

  const message =
    typingError &&
    match(typingError)
      .with("not_a_number", () => t("number_invalid"))
      .with("negative", () => t("not_negative"))
      .with("decimals", () =>
        decimals === 0
          ? t("whole_number")
          : t("decimals_max", { count: decimals ?? 0 }),
      )
      .exhaustive();

  return (
    <div data-slot="number-input">
      <InputGroup className={className}>
        {children}
        <InputGroupInput
          {...props}
          type="text"
          // Phone number pads have no minus sign, so a signed box gets the
          // full keyboard.
          inputMode={
            allowNegative ? "text" : decimals === 0 ? "numeric" : "decimal"
          }
          autoComplete="off"
          value={formatRawNumber(raw)}
          onChange={handleChange}
          // A refused keystroke's message goes once the box is left.
          onBlur={(e) => {
            setTypingError(null);
            onBlur?.(e);
          }}
          aria-invalid={typingError ? true : ariaInvalid}
          aria-describedby={[ariaDescribedBy, errorId]
            .filter(Boolean)
            .join(" ")}
        />
      </InputGroup>
      {/* Always rendered so aria-live announces the message when it appears */}
      <p
        id={errorId}
        aria-live="polite"
        className="text-sm text-destructive not-empty:mt-1.5"
      >
        {message}
      </p>
    </div>
  );
}
