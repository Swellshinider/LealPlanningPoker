import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@lealplanningpoker/shared": fileURLToPath(
        new URL("./packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["packages/**/*.test.ts", "apps/server/**/*.test.ts", "apps/web/**/*.test.ts"],
    css: {
      modules: {
        // Tests assert class names by substring (e.g. `seat-ring`, `table-seat--ring`).
        // Return the un-scoped local name so those assertions keep passing once
        // components import co-located `*.module.css` files.
        classNameStrategy: "non-scoped",
      },
    },
  },
});
