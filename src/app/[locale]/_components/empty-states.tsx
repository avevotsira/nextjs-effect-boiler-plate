import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

import { ConstructionIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/** A page whose content is still to be built. */
export function NotBuiltYet({
  className,
  ...props
}: React.ComponentProps<typeof Empty>) {
  const t = useTranslations("placeholder");
  return (
    <Empty
      data-slot="not-built-yet"
      className={cn("border bg-card", className)}
      {...props}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ConstructionIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{t("not_built_title")}</EmptyTitle>
        <EmptyDescription>{t("not_built_description")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
