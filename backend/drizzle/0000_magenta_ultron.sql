CREATE TABLE "search_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"query" text NOT NULL,
	"results_count" integer,
	"selected_result_id" integer,
	"resolved_by" varchar(20),
	"duration_ms" integer,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_taste_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"top_genres" jsonb DEFAULT '[]'::jsonb,
	"top_actors" jsonb DEFAULT '[]'::jsonb,
	"top_directors" jsonb DEFAULT '[]'::jsonb,
	"preferred_languages" text[],
	"avg_rating_preference" numeric(3, 1),
	"profile_updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"email" varchar(255),
	"display_name" varchar(100),
	"created_at" timestamp with time zone DEFAULT now(),
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "watch_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"tmdb_id" integer NOT NULL,
	"media_type" varchar(10) NOT NULL,
	"title" varchar(500) NOT NULL,
	"genres" text[],
	"action" varchar(20) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_taste_profiles" ADD CONSTRAINT "user_taste_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_queries_user_time_idx" ON "search_queries" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "search_queries_created_idx" ON "search_queries" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "watch_history_user_time_idx" ON "watch_history" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "watch_history_tmdb_idx" ON "watch_history" USING btree ("tmdb_id","media_type");