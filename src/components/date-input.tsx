"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

import { useTranslations } from "next-intl";

import {
  dateDigitsOf,
  dateValueOf,
  formatDateDigits,
  toDateDigits,
} from "./date-input-util";

type DateInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type"
> & {
  value: string | undefined;
  /** An ISO date once complete; "" when empty; the partial text otherwise. */
  onChange: (value: string) => void;
};

/**
 * A date typed as DD/MM/YYYY on the number pad: the slashes appear by
 * themselves. Not `<input type="date">`,
 * whose order follows the browser's region, so a US-English browser shows
 * MM/DD/YYYY.
 */
export function DateInput({
  value = "",
  onChange,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  onBlur,
  ...props
}: DateInputProps) {
  const t = useTranslations("validation");
  const errorId = React.useId();
  const [digits, setDigits] = React.useState(() => dateDigitsOf(value));
  const [seen, setSeen] = React.useState(value);
  const [typingError, setTypingError] = React.useState(false);

  // A value written from outside (a reset) replaces the digits; the echo of
  // our own `onChange` does not.
  if (value !== seen) {
    setSeen(value);
    if (dateValueOf(digits) !== value) setDigits(dateDigitsOf(value));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = toDateDigits(e.target.value);
    setTypingError(next === null);
    // A letter, or a ninth digit: React puts the old text back.
    if (next === null || next.length > 8) return;
    setDigits(next);
    onChange(dateValueOf(next));
  }

  return (
    <div data-slot="date-input">
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatDateDigits(digits)}
        onChange={handleChange}
        // A refused keystroke's message goes once the box is left.
        onBlur={(e) => {
          setTypingError(false);
          onBlur?.(e);
        }}
        aria-invalid={typingError ? true : ariaInvalid}
        aria-describedby={[ariaDescribedBy, errorId].filter(Boolean).join(" ")}
      />
      {/* Always rendered so aria-live announces the message when it appears */}
      <p
        id={errorId}
        aria-live="polite"
        className="text-sm text-destructive not-empty:mt-1.5"
      >
        {typingError ? t("date_typing") : null}
      </p>
    </div>
  );
}
