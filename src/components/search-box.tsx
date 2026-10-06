"use client";

import { useId, useRef, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import { SearchIcon } from "lucide-react";

/** How long typing pauses before the search runs. */
const PAUSE_MS = 400;

/**
 * A list's search box: the search runs once typing pauses, or at once on
 * Enter, and gets the trimmed text, or undefined for an empty box. `value`
 * is the search in force; when something else changes it (its chip removed,
 * Clear all), the box shows the new one.
 */
export function SearchBox({
  value,
  onSearch,
  label,
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "value" | "onChange" | "type"
> & {
  value: string | undefined;
  onSearch: (text: string | undefined) => void;
  /** Read by screen readers; the placeholder says it to everyone else. */
  label: string;
}) {
  const id = useId();
  const [text, setText] = useState(value ?? "");
  const [seen, setSeen] = useState(value);
  // The last search this box ran: its echo must not overwrite newer typing.
  const [sent, setSent] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (value !== seen) {
    setSeen(value);
    if (value !== sent) setText(value ?? "");
  }

  function run(next: string) {
    clearTimeout(timer.current);
    const search = next.trim() || undefined;
    setSent(search);
    onSearch(search);
  }

  return (
    <form
      role="search"
      data-slot="search-box"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        run(text);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          {...props}
          id={id}
          type="search"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => run(next), PAUSE_MS);
          }}
        />
      </InputGroup>
    </form>
  );
}
