import { relations, sql } from "drizzle-orm";
import {
  customType,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    const dimensions =
      (config as { dimensions?: number } | undefined)?.dimensions ?? 768;
    return `vector(${dimensions})`;
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    if (!value) return [];
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => Number(part));
  },
});

/**
 * Users, mirrored from Firebase Auth.
 *
 * Firebase stays the identity provider — this row exists only so the other
 * tables have a stable local key to hang foreign keys off, and so a user's
 * history survives independently of Firestore.
 *
 * Rows are created lazily on the first authenticated request rather than by a
 * signup webhook, which keeps the two systems from needing to be transactional
 * with each other.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // `.unique()` already creates a btree index, so an explicit index on the
  // same column would only add write cost for no read benefit.
  firebaseUid: varchar("firebase_uid", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  displayName: varchar("display_name", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const mediaTypeValues = ["movie", "tv"] as const;
export const historyActionValues = [
  "searched",
  "viewed",
  "watchlisted",
  "watched",
] as const;

/**
 * What a user has looked at, saved or finished.
 *
 * The feed for Phase 5's taste profiles. Kept as an append-only event log
 * rather than a mutable "current state" table, because the interesting
 * questions are temporal — what someone watched *recently* matters more than
 * what they watched two years ago, and a state table throws that away.
 */
export const watchHistory = pgTable(
  "watch_history",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: varchar("media_type", { length: 10 })
      .notNull()
      .$type<(typeof mediaTypeValues)[number]>(),
    title: varchar("title", { length: 500 }).notNull(),
    genres: text("genres").array(),
    action: varchar("action", { length: 20 })
      .notNull()
      .$type<(typeof historyActionValues)[number]>(),
    createdAt: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Every read of this table is "this user's recent activity", so the index
    // is the composite in that order with time descending — a plain index on
    // user_id alone would still leave a sort.
    index("watch_history_user_time_idx").on(
      table.userId,
      table.createdAt.desc()
    ),
    index("watch_history_tmdb_idx").on(table.tmdbId, table.mediaType),
  ]
);

/**
 * Every search, and which result the user clicked.
 *
 * `selectedResultId` is the valuable column: it is the only ground-truth
 * signal about whether a search actually answered the question, and Phase
 * 5.0's eval harness needs exactly that to measure retrieval quality instead
 * of guessing.
 */
export const searchQueries = pgTable(
  "search_queries",
  {
    id: serial("id").primaryKey(),
    // Nullable: anonymous searching is allowed, and the query itself is still
    // worth recording for aggregate retrieval-quality analysis.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    query: text("query").notNull(),
    resultsCount: integer("results_count"),
    selectedResultId: integer("selected_result_id"),
    /** Which branch of findMovies answered: title, generic, ai, fallback. */
    resolvedBy: varchar("resolved_by", { length: 20 }),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("search_queries_user_time_idx").on(
      table.userId,
      table.createdAt.desc()
    ),
    index("search_queries_created_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Derived, not authoritative — safe to drop and recompute from watch_history.
 *
 * Denormalised into JSONB because it is written by one job and read whole by
 * one consumer; there is nothing to query *inside* these arrays, so columns
 * and join tables would be cost without benefit.
 */
export const userTasteProfiles = pgTable("user_taste_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  topGenres: jsonb("top_genres")
    .$type<{ genre: string; weight: number }[]>()
    .default(sql`'[]'::jsonb`),
  topActors: jsonb("top_actors")
    .$type<{ name: string; count: number }[]>()
    .default(sql`'[]'::jsonb`),
  topDirectors: jsonb("top_directors")
    .$type<{ name: string; count: number }[]>()
    .default(sql`'[]'::jsonb`),
  preferredLanguages: text("preferred_languages").array(),
  avgRatingPreference: decimal("avg_rating_preference", {
    precision: 3,
    scale: 1,
  }),
  profileUpdatedAt: timestamp("profile_updated_at", {
    withTimezone: true,
  }).defaultNow(),
});

/**
 * Content embeddings for semantic fallback and similarity retrieval.
 *
 * Stored per TMDB id/media type and updated opportunistically from live search
 * traffic, so the index grows with real usage before a full backfill job lands.
 */
export const mediaEmbeddings = pgTable(
  "media_embeddings",
  {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: varchar("media_type", { length: 10 })
      .notNull()
      .$type<(typeof mediaTypeValues)[number]>(),
    title: varchar("title", { length: 500 }).notNull(),
    overview: text("overview"),
    releaseDate: varchar("release_date", { length: 20 }),
    posterPath: varchar("poster_path", { length: 255 }),
    voteAverage: decimal("vote_average", {
      precision: 4,
      scale: 2,
    }),
    originalLanguage: varchar("original_language", { length: 10 }),
    genres: text("genres").array(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    source: varchar("source", { length: 30 }).default("search"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("media_embeddings_tmdb_media_unique").on(
      table.tmdbId,
      table.mediaType
    ),
    index("media_embeddings_updated_idx").on(table.updatedAt.desc()),
  ]
);

export const usersRelations = relations(users, ({ many, one }) => ({
  watchHistory: many(watchHistory),
  searchQueries: many(searchQueries),
  tasteProfile: one(userTasteProfiles, {
    fields: [users.id],
    references: [userTasteProfiles.userId],
  }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
}));

export const searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  user: one(users, {
    fields: [searchQueries.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WatchHistoryEntry = typeof watchHistory.$inferSelect;
export type NewWatchHistoryEntry = typeof watchHistory.$inferInsert;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;
export type TasteProfile = typeof userTasteProfiles.$inferSelect;
export type MediaEmbedding = typeof mediaEmbeddings.$inferSelect;
export type NewMediaEmbedding = typeof mediaEmbeddings.$inferInsert;
