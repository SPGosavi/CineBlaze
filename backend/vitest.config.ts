import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load test environment variables before tests execute
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["eval/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/test-utils/**",
        "src/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@cineblaze/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
});
