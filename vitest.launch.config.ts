import path from "node:path";

import { defineConfig } from "vitest/config";

import { LAUNCH_REGRESSION_TEST_FILES } from "./src/lib/launch/launch-regression.files";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest/shims/server-only.ts"),
    },
  },
  test: {
    name: "launch-regression",
    environment: "node",
    include: [...LAUNCH_REGRESSION_TEST_FILES],
  },
});
