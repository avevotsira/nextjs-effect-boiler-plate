"use client";

import { useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { LanguagesIcon } from "lucide-react";
import { useLocale } from "next-intl";

/**
 * Switches km ↔ en on the current page. Labelled with the language
 * it switches *to*, written in that language, so a user who cannot read the
 * current one can still find it. A link, not a button: switching language is
 * a navigation to the same page under the other locale, query kept.
 */
export function LanguageToggle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href" | "locale">) {
  const locale = useLocale();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const target =
    locale === "km"
      ? { locale: "en", label: "English" }
      : { locale: "km", label: "ភាសាខ្មែរ" };

  return (
    <Link
      href={query ? `${pathname}?${query}` : pathname}
      locale={target.locale}
      hrefLang={target.locale}
      lang={target.locale}
      data-slot="language-toggle"
      className={cn(buttonVariants({ variant: "outline" }), "gap-2", className)}
      {...props}
    >
      <LanguagesIcon aria-hidden className="size-4" />
      {target.label}
    </Link>
  );
}
