import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["packages/**/*.test.ts", "apps/server/**/*.test.ts", "apps/web/**/*.test.ts"]
  }
});
