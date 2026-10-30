# Phase 5 Closeout Snapshot (2026-10-31)

Scope-focused eval run executed with:

```bash
npm run eval:phase5 -w movie-finder-backend
```

Report file:

- `backend/eval/results/run-2026-10-30T19-31-44-850Z.json`

## Snapshot Metrics

- Cases: `10`
- Failed cases (runner-level): `0`
- hit@1: `10.0%`
- hit@3: `10.0%`
- p50 latency: `1986ms`
- p95 latency: `5460ms`

## Segment Highlights

- By mode:
  - `direct`: hit@1 `100%` (1 case)
  - `ai`: hit@3 `0%` (5 cases)
  - `recommend`: hit@3 `0%` (4 cases)
- By tag:
  - `regional`: hit@3 `16.7%` (6 cases)
  - `recommend`: hit@3 `0%` (4 cases)
  - `conversational`: hit@3 `0%` (2 cases)

## Observed Blocking Issues

1. **Groq JSON-schema validation failures** in recommend/identify flows:
   - error pattern requires `media_type` to be included in JSON schema `required` array
   - this causes multiple recommend/AI paths to short-circuit
2. **Embedding model access mismatch**:
   - configured model `nomic-embed-text-v1.5` returned provider-side not-found/no-access in this environment
   - semantic fallback/indexing therefore degrades to best-effort no-op

## Closeout Interpretation

Phase 5 implementation branches (5.0-5.6) are complete from an architecture/features perspective.
Current eval quality is gated by provider/runtime configuration and schema compatibility issues above, which should be resolved before calling quality stabilization complete.
