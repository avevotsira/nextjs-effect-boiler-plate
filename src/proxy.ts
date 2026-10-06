import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware({
  ...routing,
  localeDetection: false,
});
export const config = {
  matcher: [
    // i18n routes
    "/",
    "/(km|en)/:path*",
    "/((?!_next|_vercel|api|.*\\..*).*)",
  ],
};
