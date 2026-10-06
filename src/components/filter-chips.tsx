import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { XIcon } from "lucide-react";

/**
 * The filters in force as chips: they start from the left
 * and wrap, never scroll sideways. Each chip says its label and value and
 * removes itself; Clear all ends the row. The caller builds the chips, so any
 * list can use it:
 *
 *   <FilterChips>
 *     <FilterChips.Chip label="District" value="Tram Kak" … />
 *     <FilterChips.ClearAll onClick={…}>Clear all</FilterChips.ClearAll>
 *   </FilterChips>
 */
function FilterChipsRoot({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="filter-chips"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

function FilterChip({
  label,
  value,
  removeLabel,
  onRemove,
  className,
  ...props
}: Omit<React.ComponentProps<"li">, "children"> & {
  label: string;
  value: string;
  /** "Remove filter: District", for screen readers. */
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <li
      data-slot="filter-chip"
      className={cn(
        "flex min-h-9 max-w-full min-w-0 items-center rounded-[1.125rem] border bg-card pl-3 text-sm",
        className,
      )}
      {...props}
    >
      {/* A long value wraps to a second line, then is cut short; pointing at
          it shows all of it. */}
      <span
        className="line-clamp-2 min-w-0 py-1 wrap-break-word"
        title={`${label}: ${value}`}
      >
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-medium">{value}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <XIcon aria-hidden className="size-4" />
      </button>
    </li>
  );
}

function FilterChipsClearAll({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <li data-slot="filter-chips-clear-all">
      <Button
        type="button"
        variant="link"
        className={cn("h-9 px-2", className)}
        {...props}
      />
    </li>
  );
}

export const FilterChips = Object.assign(FilterChipsRoot, {
  Chip: FilterChip,
  ClearAll: FilterChipsClearAll,
});
