import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL, IS_PRODUCTION } from "../config.js";
import { childLogger } from "../utils/logger.js";
import * as schema from "./schema.js";

const log = childLogger("db");

export type Database = PostgresJsDatabase<typeof schema>;

let client: postgres.Sql | null = null;
let database: Database | null = null;

if (DATABASE_URL) {
  client = postgres(DATABASE_URL, {
    // Serverless Postgres (Neon, Supabase) charges for idle connections and
    // caps how many you may hold. Ten is comfortable for a single API
    // instance and well inside every free tier.
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Neon and Supabase both require TLS; a local instance generally does not.
    ssl: IS_PRODUCTION ? "require" : undefined,
    onnotice: () => {},
  });
  database = drizzle(client, { schema });
  log.info("Postgres configured");
} else {
  log.warn(
    "DATABASE_URL not set — history and taste profiles are disabled. " +
      "Search and discovery are unaffected."
  );
}

/**
 * The Drizzle client, or null when DATABASE_URL is unset.
 *
 * Nullable rather than throwing, because persistence is genuinely optional
 * here: the database records history and powers taste profiles, and none of
 * search, discovery or the watchlist depends on it. A contributor with three
 * API keys and no Postgres should still get a working app.
 *
 * Callers should prefer the repositories, which encapsulate the null check.
 */
export const db = database;

export const isDatabaseEnabled = (): boolean => database !== null;

/** True if the database answers a trivial query. Used by /health. */
export async function pingDatabase(): Promise<boolean> {
  if (!client) return false;
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    log.warn({ err: (error as Error).message }, "Database ping failed");
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await client?.end({ timeout: 5 });
}

export { schema };
