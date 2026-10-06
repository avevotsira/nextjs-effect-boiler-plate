import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Link } from "@/i18n/routing";
import { lastPageOf } from "@/lib/api/response";
import { cn, formatNumber } from "@/lib/utils";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

/**
 * Previous, Next, and where you are: "Page 3 of 50". No row of page numbers:
 * nobody jumps to page 37 of a thousand records, and the row overflowed on
 * phones. Search and filters are how people find a
 * record. `hrefFor` keeps the page in the URL, so a row opened and closed
 * comes back to the same page, and every link is a real link.
 */
export function DataPagination({
  page,
  pageSize,
  total,
  hrefFor,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Pagination>, "children"> & {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const lastPage = lastPageOf({ total, pageSize });
  if (lastPage <= 1) return null;

  return (
    <Pagination
      data-slot="data-pagination"
      className={cn("justify-end", className)}
      {...props}
    >
      <PaginationContent>
        <PaginationItem>
          <StepLink href={page > 1 ? hrefFor(page - 1) : null}>
            <ChevronLeftIcon />
            {t("previous_page")}
          </StepLink>
        </PaginationItem>
        <PaginationItem className="px-2 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
          {t("page_of", {
            page: formatNumber(page, locale),
            total: formatNumber(lastPage, locale),
          })}
        </PaginationItem>
        <PaginationItem>
          <StepLink href={page < lastPage ? hrefFor(page + 1) : null}>
            {t("next_page")}
            <ChevronRightIcon />
          </StepLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/** Previous or Next; greyed out and not a link at either end. */
function StepLink({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  return (
    <PaginationLink
      asChild
      size="default"
      aria-disabled={href === null}
      className={cn(
        "gap-1 px-2.5",
        href === null && "pointer-events-none opacity-50",
      )}
    >
      {href === null ? (
        <span className="flex items-center">{children}</span>
      ) : (
        <Link href={href}>{children}</Link>
      )}
    </PaginationLink>
  );
}
