CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "media_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"media_type" varchar(10) NOT NULL,
	"title" varchar(500) NOT NULL,
	"overview" text,
	"release_date" varchar(20),
	"poster_path" varchar(255),
	"vote_average" numeric(4, 2),
	"original_language" varchar(10),
	"genres" text[],
	"embedding" vector(768) NOT NULL,
	"source" varchar(30) DEFAULT 'search',
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "media_embeddings_tmdb_media_unique" ON "media_embeddings" USING btree ("tmdb_id","media_type");--> statement-breakpoint
CREATE INDEX "media_embeddings_updated_idx" ON "media_embeddings" USING btree ("updated_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "media_embeddings_embedding_cos_idx" ON "media_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
