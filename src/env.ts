import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";

/**
 * Every env var, validated at startup. A server secret also needs a
 * `--mount=type=secret` line in the Dockerfile; a `NEXT_PUBLIC_*` var goes
 * under `client` and is baked in at build time.
 */
export const env = createEnv({
  server: {
    APP_ENV: z
      .enum(["development", "production", "staging"])
      .default("development"),
    DB_URL: z.string(),
  },
  client: {
    // Absolute origin, e.g. https://app.example.com: for links users copy out
    // of the app, and the base of a sign-in method's redirect URIs.
    NEXT_PUBLIC_BASE_DOMAIN: z.url(),
  },
  runtimeEnv: {
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN,
    DB_URL: process.env.DB_URL,
  },
  // CI sets SKIP_ENV_VALIDATION=1 so `next build` runs without real secrets;
  // nothing reads a secret at build time.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
