import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest/shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "_8_08_bundle/**"],
  },
});