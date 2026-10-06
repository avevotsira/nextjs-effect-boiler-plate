import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // `src/env.ts` validates at import; tests never read real secrets.
    env: { SKIP_ENV_VALIDATION: "1" },
  },
});
