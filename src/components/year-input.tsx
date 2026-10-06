"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";

import { toLatinDigits } from "./number-input-util";

type YearInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type"
> & {
  value: number | null | undefined;
  /** The year typed so far as a number, or null for an empty box. */
  onChange: (year: number | null) => void;
};

/**
 * A year, typed YYYY on the number pad: never grouped ("2,019") as a
 * number box would show it. Khmer digits are read as 0–9, and anything else
 * is left out. A partial year goes to the form as typed, so the schema says
 * it is not a valid year.
 */
export function YearInput({ value, onChange, ...props }: YearInputProps) {
  const shown = (year: number | null | undefined) =>
    year === null || year === undefined ? "" : String(year);
  const [text, setText] = useState(shown(value));
  const [seen, setSeen] = useState(value);

  // A year written from outside (a reset) replaces the text; the echo of our
  // own `onChange` does not.
  if (value !== seen) {
    setSeen(value);
    if (shown(value) !== text) setText(shown(value));
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={4}
      value={text}
      onChange={(e) => {
        const digits = toLatinDigits(e.target.value)
          .replace(/\D/g, "")
          .slice(0, 4);
        setText(digits);
        onChange(digits === "" ? null : Number(digits));
      }}
    />
  );
}
