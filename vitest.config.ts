import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/features/**/*.service.ts",
        "src/lib/accessible-sort.ts",
        "src/lib/balance.ts",
        "src/lib/money.ts",
        "src/lib/recurrence.ts",
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
})
