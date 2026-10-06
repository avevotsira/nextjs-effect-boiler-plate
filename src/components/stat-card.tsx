import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { cn, formatNumber } from "@/lib/utils";

import { useLocale } from "next-intl";

/**
 * One figure on a dashboard. Multi-part so the caller arranges the slots
 * rather than passing nine props: `<StatCard><StatCard.Value/>…</StatCard>`.
 *
 * `href` makes the whole tile the FR-085 drill-down — a figure is only
 * actionable if the cases behind it can be reached — so a tile is a link
 * whenever there is a list to open, and a plain block when there is not.
 */
function StatCardRoot({
  href,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Card> & { href?: string }) {
  const card = (
    <Card
      data-slot="stat-card"
      className={cn(
        "gap-0 px-5 py-4",
        href && "transition-colors hover:border-primary hover:bg-primary/5",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

function Label({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="stat-card-label"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function Value({
  value,
  className,
  ...props
}: React.ComponentProps<"p"> & { value: number }) {
  const locale = useLocale();
  return (
    <p
      data-slot="stat-card-value"
      className={cn(
        "mt-1 text-3xl font-semibold text-foreground tabular-nums",
        className,
      )}
      {...props}
    >
      {formatNumber(value, locale)}
    </p>
  );
}

/** A colour chip tying the tile to its segment in the chart. */
function Swatch({
  color,
  className,
  ...props
}: React.ComponentProps<"span"> & { color: string }) {
  return (
    <span
      aria-hidden
      data-slot="stat-card-swatch"
      style={{ backgroundColor: color }}
      className={cn("inline-block size-2.5 shrink-0 rounded-sm", className)}
      {...props}
    />
  );
}

export const StatCard = Object.assign(StatCardRoot, { Label, Value, Swatch });
