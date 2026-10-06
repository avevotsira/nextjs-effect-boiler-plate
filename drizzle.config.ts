import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";

import { env } from "./src/env";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DB_URL || "postgresql://app:app@localhost:5433/app",
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
}) satisfies Config;
