# CineBlaze Web Bundle Analysis & Optimization Report (Phase 6D)

This report documents the bundle structure, chunk breakdown, dependency footprint, and optimization roadmap for the CineBlaze Next.js application (`web/`).

---

## 1. Tooling & Setup

- **Analyzer**: `@next/bundle-analyzer` integrated via `web/next.config.ts`.
- **Execution**: Triggered via `npm run analyze -w web` (or root `npm run analyze:web`), which executes `cross-env ANALYZE=true next build --webpack`.
- **Output Reports**: Generated under `web/.next/analyze/`:
  - `client.html`: Browser bundle chunk composition and interactive treemap.
  - `nodejs.html`: Server component and server runtime dependency sizes.
  - `edge.html`: Edge runtime bundle metrics (middleware / edge routes).

---

## 2. Client Bundle Composition & Largest Chunks

| Dependency / Area                  | Role                                                            | Bundle Share                        | Optimization Status                                                                                                                                                              |
| ---------------------------------- | --------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Firebase SDK** (`@firebase/*`)   | Client auth & Firestore watchlist realtime sync                 | ~45% client JS                      | **Optimized**: Tree-shaken; only `firebase/app`, `firebase/auth`, and `firebase/firestore` are imported. Unused services (analytics, storage, database, messaging) are excluded. |
| **React 19 & Next.js Runtime**     | Core virtual DOM, scheduler, and App Router client navigation   | ~30% client JS                      | **Core runtime**: Minified and shared across all route segments.                                                                                                                 |
| **Axios** (`axios`)                | Client-side HTTP client with interceptors for Firebase ID token | ~7% client JS (~35 KB uncompressed) | **Candidate for Replacement**: Used only in `@/lib/api.ts` for browser-initiated requests. Next.js server components already use native `fetch`.                                 |
| **Lucide Icons** (`lucide-react`)  | UI icons across cards, search, and navigation                   | ~5% client JS                       | **Optimized**: Named imports ensure tree-shaking; only referenced SVG icons are bundled.                                                                                         |
| **Application Components & Hooks** | Custom interactive client components                            | ~13% client JS                      | **Optimized**: Strict separation between Server Components and Client Components.                                                                                                |

---

## 3. Server vs. Client Component Boundary Audit

Every component with `"use client"` in `web/src/` was audited:

- **Interactive / State-Driven Components** (Legitimate Client Components):
  - `LoginForm`: Form handling, authentication mutation, and redirect state.
  - `AccountPanel` & `MobileAccountButton`: User account popover and session management.
  - `NavLinks`: Reads `usePathname()` for active tab indicators.
  - `MediaCard`: Poster interaction, trailer triggers, and hover states.
  - `WatchlistButton` & `WatchlistBoard`: Interactive Kanban columns with drag-and-drop (`useWatchlist`).
  - `SearchBar`: Query input state, keyboard navigation, and tab toggling.
  - `SlidingRatings` & `SlidingTitle`: Touch hold, animation timing, and scroll overflow handlers.
  - `WebVitals`: Telemetry client hook (`useReportWebVitals`) for production performance reporting.
- **Server Components** (Zero client bundle weight):
  - `(main)/page.tsx`: Home page SSR/ISR with trending carousel queries.
  - `(main)/[mediaType]/[id]/page.tsx`: Media detail page with dynamic server rendering and SEO metadata generation.
  - `(main)/search/page.tsx`: Search results page with server-side query resolution.
  - `api/[...path]/route.ts`: BFF proxy route handler with internal secret injection.

---

## 4. Actionable Optimizations Implemented in Phase 6D

1. **Security & Performance HTTP Headers**:
   - `X-Content-Type-Options: nosniff` (prevents MIME type sniffing).
   - `X-Frame-Options: DENY` (clickjacking mitigation).
   - `X-XSS-Protection: 1; mode=block` (legacy XSS filtering).
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
   - `poweredByHeader: false` (removes identifying `X-Powered-By: Next.js` header).
2. **Error Recovery Boundaries**:
   - Added `web/src/app/global-error.tsx` client component with root fallback layout, self-contained HTML/body, and Sentry telemetry reporting.
   - Enhanced `web/src/app/(main)/error.tsx` with Sentry reporting and reset capabilities.
3. **Perceived Performance with Streaming Loading Skeletons**:
   - Added `web/src/app/(main)/search/loading.tsx` using `MediaGridSkeleton`.
   - Added `web/src/app/(main)/[mediaType]/[id]/loading.tsx` using media poster, details, and shelf skeletons.
4. **Production Web Vitals Telemetry**:
   - Upgraded `web/src/components/analytics/WebVitals.tsx` to report CLS, FCP, FID, INP, LCP, and TTFB to `/api/vitals` via `navigator.sendBeacon` (with `fetch` `keepalive` fallback).
   - Added backend `/api/vitals` endpoint with Zod schema validation and structured Pino logging.

---

## 5. Future Optimization Roadmap

- **Native `fetch` Migration**: Transition `@/lib/api.ts` from `axios` to native `fetch` with a lightweight interceptor wrapper to reduce client bundle size by ~35 KB.
- **Dynamic Imports for Watchlist Drag-and-Drop**: Load the Kanban drag-and-drop interactions via `next/dynamic` with `ssr: false` when navigating to `/watchlist`.
