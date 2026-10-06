import { TIME_ZONE } from "@/lib/utils";

import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // One zone for server and browser, so a date formats the same on both
    // sides of hydration, and in the province's own time.
    timeZone: TIME_ZONE,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
