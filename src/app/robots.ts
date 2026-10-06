import { MetadataRoute } from "next";

import { env } from "@/env";

export default function robots(): MetadataRoute.Robots {
  const isProduction = env.APP_ENV === "production";

  if (!isProduction) {
    // Block all search engines on staging/development
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  // Allow all search engines on production
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
