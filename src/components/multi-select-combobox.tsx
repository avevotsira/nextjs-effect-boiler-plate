"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

type MultiSelectComboboxProps = Omit<
  React.ComponentProps<typeof Button>,
  "value" | "onChange" | "children"
> & {
  options: readonly { value: string; label: string }[];
  value: readonly string[];
  onChange: (values: string[]) => void;
  /** Shown on the button while nothing is chosen. */
  placeholder: string;
};

/**
 * Several choices from one list: a searchable list that stays open while ticking, with the chosen
 * values as removable chips under the button. A pure input: `value` and
 * `onChange` carry the list of chosen keys, in the list's order.
 */
export function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder,
  className,
  ...props
}: MultiSelectComboboxProps) {
  const t = useTranslations("form");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const chosen = options.filter((option) => value.includes(option.value));
  // The list's order, not the order of clicks, so a record reads the same.
  const toggle = (key: string) =>
    onChange(
      options
        .map((option) => option.value)
        .filter((one) =>
          one === key ? !value.includes(one) : value.includes(one),
        ),
    );

  return (
    <div data-slot="multi-select-combobox" className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            className={cn(
              "w-full justify-between border-input px-3 font-normal has-[>svg]:px-3",
              chosen.length === 0 && "text-muted-foreground",
              className,
            )}
            {...props}
          >
            <span className="truncate">
              {chosen.length === 0
                ? placeholder
                : t("chosen_count", { count: chosen.length })}
            </span>
            <ChevronsUpDownIcon aria-hidden className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        >
          <Command>
            <CommandInput placeholder={t("search")} />
            <CommandList id={listId} aria-multiselectable>
              <CommandEmpty>{t("nothing_found")}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const selected = value.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label]}
                      aria-selected={selected}
                      onSelect={() => toggle(option.value)}
                    >
                      {option.label}
                      <CheckIcon
                        aria-hidden
                        className={cn(
                          "ml-auto",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chosen.map((option) => (
            <li
              key={option.value}
              className="flex min-h-9 max-w-full min-w-0 items-center rounded-[1.125rem] border bg-card pl-3 text-sm"
            >
              {/* Margin, not padding: padding would show a clipped third line. */}
              <span
                title={option.label}
                className="my-1 line-clamp-2 min-w-0 wrap-break-word"
              >
                {option.label}
              </span>
              <button
                type="button"
                onClick={() => toggle(option.value)}
                aria-label={t("remove_choice", { label: option.label })}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <XIcon aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
