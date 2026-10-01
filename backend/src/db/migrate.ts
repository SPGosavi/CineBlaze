import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { DATABASE_URL, IS_PRODUCTION } from "../config.js";
import { logger } from "../utils/logger.js";

/**
 * Applies pending migrations, then exits.
 *
 * A standalone script rather than something the server runs on boot: with
 * more than one instance, concurrent boots would race to apply the same
 * migration. Run it as a release step.
 */
async function main(): Promise<void> {
  if (!DATABASE_URL) {
    logger.error("DATABASE_URL is not set — nothing to migrate.");
    process.exit(1);
  }

  // max: 1 because migrations must run in order on a single connection.
  const client = postgres(DATABASE_URL, {
    max: 1,
    ssl: IS_PRODUCTION ? "require" : undefined,
    onnotice: () => {},
  });

  try {
    logger.info("Applying migrations…");
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    logger.info("Migrations applied.");
  } catch (error) {
    logger.error({ err: (error as Error).message }, "Migration failed");
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
