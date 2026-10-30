# Embeddings Backfill

Seeds `media_embeddings` with a broader starting corpus so semantic fallback does not depend only on live traffic.

## Command

```bash
npm run embeddings:backfill -w movie-finder-backend
```

## What it indexes

1. Trending shelves (`all`, `indian`, platform shelves)
2. Popular historical queries (from `search_queries`)

Results are deduplicated by `media_type:id` and upserted, so rerunning is safe and acts as resume.

## Options

Pass options after `--`:

```bash
npm run embeddings:backfill -w movie-finder-backend -- --max-items 500 --popular-limit 40 --popular-offset 0
```

- `--max-items` max unique titles to embed in one run (default: `500`)
- `--popular-limit` number of popular queries to replay (default: `40`)
- `--popular-offset` skip N popular queries before processing (default: `0`)

## Requirements

- `DATABASE_URL` configured (script no-ops without DB)
- migration `0001_lonely_revanche.sql` applied (includes `media_embeddings`)
- Groq API key configured for embedding generation
