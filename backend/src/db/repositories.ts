import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./index.js";
import {
  searchQueries,
  users,
  userTasteProfiles,
  watchHistory,
  type NewSearchQuery,
  type NewWatchHistoryEntry,
  type TasteProfile,
  type User,
} from "./schema.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("db:repo");

/**
 * Persistence is best-effort.
 *
 * Recording that a search happened must never be the reason a search fails.
 * Every write below is wrapped so a database outage degrades analytics rather
 * than the product, and returns a sentinel instead of throwing.
 */
async function attempt<T>(
  operation: string,
  work: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!db) return fallback;
  try {
    return await work();
  } catch (error) {
    log.error(
      { operation, err: (error as Error).message },
      "Database write failed"
    );
    return fallback;
  }
}

/**
 * Finds or creates the local row for a Firebase user.
 *
 * Upsert rather than select-then-insert: two concurrent requests from a newly
 * signed-in user would both see no row and both insert, and the unique
 * constraint on firebase_uid would turn the loser into a 500.
 */
export async function upsertUser(input: {
  firebaseUid: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<User | null> {
  return attempt(
    "upsertUser",
    async () => {
      const [row] = await db!
        .insert(users)
        .values({
          firebaseUid: input.firebaseUid,
          email: input.email ?? null,
          displayName: input.displayName ?? null,
          lastLoginAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.firebaseUid,
          set: {
            lastLoginAt: new Date(),
            // COALESCE so a token that happens to omit email does not wipe a
            // value we already have.
            email: sql`COALESCE(${input.email ?? null}, ${users.email})`,
          },
        })
        .returning();
      return row ?? null;
    },
    null
  );
}

export async function recordSearch(entry: NewSearchQuery): Promise<void> {
  await attempt(
    "recordSearch",
    async () => {
      await db!.insert(searchQueries).values(entry);
    },
    undefined
  );
}

/** Attaches the clicked result to the most recent matching query. */
export async function recordSearchSelection(
  userId: string,
  query: string,
  selectedResultId: number
): Promise<void> {
  await attempt(
    "recordSearchSelection",
    async () => {
      await db!
        .update(searchQueries)
        .set({ selectedResultId })
        .where(
          and(
            eq(searchQueries.userId, userId),
            eq(searchQueries.query, query),
            sql`${searchQueries.selectedResultId} IS NULL`
          )
        );
    },
    undefined
  );
}

export async function recordWatchEvent(
  entry: NewWatchHistoryEntry
): Promise<void> {
  await attempt(
    "recordWatchEvent",
    async () => {
      await db!.insert(watchHistory).values(entry);
    },
    undefined
  );
}

export async function getRecentHistory(
  userId: string,
  sinceDays = 180,
  limit = 500
) {
  return attempt(
    "getRecentHistory",
    async () => {
      const since = new Date(Date.now() - sinceDays * 86_400_000);
      return db!
        .select()
        .from(watchHistory)
        .where(
          and(
            eq(watchHistory.userId, userId),
            gte(watchHistory.createdAt, since)
          )
        )
        .orderBy(desc(watchHistory.createdAt))
        .limit(limit);
    },
    []
  );
}

export async function getTasteProfile(
  userId: string
): Promise<TasteProfile | null> {
  return attempt(
    "getTasteProfile",
    async () => {
      const [row] = await db!
        .select()
        .from(userTasteProfiles)
        .where(eq(userTasteProfiles.userId, userId))
        .limit(1);
      return row ?? null;
    },
    null
  );
}

export async function saveTasteProfile(
  userId: string,
  profile: {
    topGenres: { genre: string; weight: number }[];
    topActors: { name: string; count: number }[];
    topDirectors: { name: string; count: number }[];
    preferredLanguages: string[];
    avgRatingPreference: string | null;
  }
): Promise<void> {
  await attempt(
    "saveTasteProfile",
    async () => {
      await db!
        .insert(userTasteProfiles)
        .values({ userId, ...profile, profileUpdatedAt: new Date() })
        .onConflictDoUpdate({
          target: userTasteProfiles.userId,
          set: { ...profile, profileUpdatedAt: new Date() },
        });
    },
    undefined
  );
}

/** Users with activity since the cutoff — the taste-profile job's work list. */
export async function getUsersWithRecentActivity(sinceHours = 24) {
  return attempt(
    "getUsersWithRecentActivity",
    async () => {
      const since = new Date(Date.now() - sinceHours * 3_600_000);
      return db!
        .selectDistinct({ userId: watchHistory.userId })
        .from(watchHistory)
        .where(gte(watchHistory.createdAt, since));
    },
    []
  );
}

/**
 * The most-searched queries, used to warm the cache.
 *
 * Only queries that actually returned something: pre-computing a search that
 * reliably answers nothing would just burn Groq quota on a known failure.
 */
export async function getPopularQueries(limit = 20, sinceDays = 7) {
  return attempt(
    "getPopularQueries",
    async () => {
      const since = new Date(Date.now() - sinceDays * 86_400_000);
      return db!
        .select({
          query: searchQueries.query,
          hits: sql<number>`count(*)::int`,
        })
        .from(searchQueries)
        .where(
          and(
            gte(searchQueries.createdAt, since),
            gte(searchQueries.resultsCount, 1)
          )
        )
        .groupBy(searchQueries.query)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);
    },
    []
  );
}
