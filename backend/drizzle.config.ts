import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

/**
 * drizzle-kit config, used only by the `db:generate` / `db:migrate` scripts.
 *
 * Migrations are generated as plain .sql into drizzle/ and committed, so a
 * schema change is reviewable in the PR rather than applied by an opaque
 * `push` at deploy time.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Only read when actually running a migration; `db:generate` is offline.
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
