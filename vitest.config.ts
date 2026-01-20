import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", "dist", "build"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["server/**/*.ts", "shared/**/*.ts", "client/src/hooks/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/node_modules/**"],
    },
    setupFiles: ["./tests/setup.ts"],
    // Use jsdom for client tests, node for server tests
    environmentMatchGlobs: [
      ["tests/client/**", "jsdom"],
      ["tests/server/**", "node"],
      ["tests/shared/**", "node"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
