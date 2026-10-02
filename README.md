<h1 align="center">🔥CineBlaze</h1>

<p align="center">
    <img src="https://img.shields.io/badge/Tech-Generative%20AI-blueviolet.svg" alt="Generative AI">
    <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue.svg" alt="React + Vite">
    <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green.svg" alt="Node.js">
    <img src="https://img.shields.io/badge/Database-Firebase-orange.svg" alt="Firebase">
    <img src="https://img.shields.io/badge/Status-Completed-brightgreen.svg" alt="Project Status">
</p>

<h3 align="center">
    AI-Powered Movie & TV Series Discovery Platform
</h3>

<h2>📜 Project Overview</h2>

<p>
    CineBlaze is designed to simplify content discovery by allowing users to search for movies and television series using descriptive inputs such as plot summaries, genres, moods, actors, or release periods. Instead of relying on exact titles, the system utilizes Generative AI to interpret user intent and return accurate, context-aware results.
    <br><br>
    The platform follows a decoupled client-server architecture, where a React-based frontend communicates with a Node.js backend that processes semantic queries using Groq (powered by ultra-fast LLM inference). Additional metadata, including cast details, ratings, and streaming availability, is enriched through third-party APIs (TMDB and OMDb), while user watchlists are synchronized in real time using Firebase Cloud Firestore.
</p>

<h2>🚀 Live Deployment</h2>

<p>
    The application is deployed using modern cloud platforms to ensure scalability and performance.
</p>

<ul>
    <li><strong>Vercel Link:</strong> 
        <a href="https://cine-blaze-movie-finder-web-app.vercel.app/" target="_blank">
            https://cine-blaze-movie-finder-web-app.vercel.app/
        </a>
    </li>
</ul>

<p>
    <em>Note: Guest login is enabled for quick access. AI-based search responses take minimal time thanks to low-latency Groq inference.</em>
</p>

## 🧠 Skills & Concepts Demonstrated

- GenAI Integration & Prompt Engineering
- RAG & Grounded Context Pipelines
- Semantic Search & Natural Language Processing
- Full-Stack Web Development
- Client–Server Architecture
- REST API Design
- Real-Time Database Synchronization
- Authentication & Authorization
- Responsive UI / Mobile-First Design
- Performance Optimization & Multi-tier In-Memory Caching
- Cloud Deployment (Vercel, Render, Firebase)

---

## 🚀 Key Features

- 🧠 **AI Semantic Search** — Find movies and series using natural language descriptions powered by Groq
- 📋 **Kanban Watchlist** — Drag & drop content across watch states ("Want to Watch", "Watching Now", "Watched")
- 🔥 **Trending & Platform Discovery** — Netflix, Prime Video, Hotstar, Indian & Global content
- 📺 **Streaming Availability** — Know where to watch instantly with platform logos
- ⭐ **Unified Ratings** — IMDb, Rotten Tomatoes & TMDB in one place
- 📱 **Fully Responsive Design** — Mobile-first UX with touch and swipe-friendly carousels
- 🔐 **Authentication** — Secure Email/Password login, prefilled Demo access, and Guest login powered by Firebase Auth

---

## 📸 Screenshots

<h3>Home / Discover</h3>
<img src="images/Screenshot%201.png" alt="CineBlaze Home Page" width="800"/>

<h3>AI Search Result</h3>
<img src="images/Screenshot%202.png" alt="AI Search Result" width="800"/>

<h3>Movie / Series Details</h3>
<img src="images/Screenshot%203.png" alt="Movie / Series Details" width="800"/>

<h3>My Watchlist</h3>
<img src="images/Screenshot%204.png" alt="My Watchlist" width="800"/>

---

## 🏗️ Architecture & Workflow

CineBlaze follows a **decoupled Client–Server architecture** for scalability, security, and performance.

<img src="images/CineBlaze_Workflow.png" alt="CineBlaze Workflow" width="600"/>

Client (React 19 + Vite)  
→ Backend (Node.js + Express)  
→ Groq API (High-Speed Semantic Query Parsing & Grounded Recommendations)  
→ TMDB & OMDb (Metadata, Credits, Providers & Ratings)  
→ Firebase Firestore (Real-time Watchlist Sync)

---

## 🛠️ Tech Stack

### Web app (`web/`)

- Next.js 16 (App Router, Server Components, Turbopack)
- TypeScript
- Tailwind CSS v4
- Lucide Icons
- Axios
- Firebase SDK (Auth & Firestore)
- Native HTML5 Drag & Drop API

### Backend (`backend/`)

- Node.js + Express + TypeScript
- Groq API (High-throughput, low-latency LLM inference)
- TMDB API & OMDb API
- Drizzle ORM + PostgreSQL (search history, taste profiles)
- Redis (distributed cache, token-bucket rate limiting)
- Zod (request validation) · Pino (structured JSON logging) · Sentry

### Shared (`shared/`)

- `@cineblaze/shared` — the request/response types both sides import, so the
  API contract is enforced by the compiler rather than by convention

### Rendering strategy

| Route                   | Strategy                                             |
| ----------------------- | ---------------------------------------------------- |
| `/` — Discover          | ISR (trending shelves stream in behind Suspense)     |
| `/search?q=`            | SSR — shareable, refreshable search URLs             |
| `/movie/:id`, `/tv/:id` | SSR with Open Graph tags + JSON-LD structured data   |
| `/watchlist`            | CSR — live Firestore sync, drag-and-drop, auth-gated |

### Infrastructure is optional

Redis, PostgreSQL, Firebase token verification, the internal API key and
Sentry are each independently optional. With only the three API keys the app
runs end to end: the cache falls back to an in-process one, history becomes a
no-op, and requests are anonymous.

`GET /health` reports which dependencies are actually live, and distinguishes
**disabled** (a deployment choice) from **degraded** (an incident) — because a
missing env var fails open, and silently losing a layer is worse than not
having it.

### Deployment & Services

- **Web**: Vercel
- **Backend**: Render
- **Database / Auth**: Firebase Cloud Firestore & Firebase Auth
- **External APIs**: Groq, TMDB, OMDb

---

## 🚀 Getting Started

### Prerequisites

- Node.js v22.19.0 (see `.nvmrc`)
- npm v10+ (workspaces)
- API keys for:
  - Groq API (`GROQ_API_KEY`)
  - TMDB API (`TMDB_API_KEY`)
  - OMDb API (`OMDB_API_KEY`)
  - Firebase Project Configuration

### Setup & Run Locally

1. **Clone and install.** One install at the root covers `shared`, `backend`
   and `web` — they are npm workspaces.

   ```bash
   git clone https://github.com/YOUR_USERNAME/cineblaze.git
   cd cineblaze
   npm install
   ```

2. **Backend environment** — copy `backend/.env.example` to `backend/.env`.
   Only the three API keys are required; everything else is optional and
   documented inline.

   ```env
   PORT=5001
   GROQ_API_KEY=your_groq_api_key
   TMDB_API_KEY=your_tmdb_api_key
   OMDB_API_KEY=your_omdb_api_key

   # Optional — see backend/.env.example
   # REDIS_URL=            # unset: in-process cache
   # DATABASE_URL=         # unset: history disabled
   # FIREBASE_PROJECT_ID=  # unset: requests are anonymous
   # INTERNAL_API_KEY=     # unset: API is open
   ```

3. **Web environment** — copy `web/.env.example` to `web/.env.local` and fill
   in the Firebase values. Leave them blank to run without auth: discovery,
   search and detail pages all work signed out, only the watchlist is disabled.

   ```env
   BACKEND_API_URL=http://localhost:5001
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
   # ...see web/.env.example for the full list
   ```

   The browser never calls the backend directly. Client requests go to the
   Next.js Route Handler at `src/app/api/[...path]/route.ts`, which forwards
   them to `BACKEND_API_URL` and attaches `INTERNAL_API_KEY` server-side — so
   there is no CORS setup, and neither the API origin nor the shared secret
   reaches the client bundle.

4. **Run everything:**

   ```bash
   npm run dev          # shared (watch) + Express API + Next.js
   ```

   Then open http://localhost:3000.

5. **Optional — set up the database.** Only needed for search history and
   taste profiles.
   ```bash
   # with DATABASE_URL set in backend/.env
   npm run db:migrate -w movie-finder-backend
   ```

### Useful scripts

| Command                                       | What it does                                      |
| --------------------------------------------- | ------------------------------------------------- |
| `npm run dev`                                 | Shared types watcher + Express API + Next.js      |
| `npm run dev:legacy`                          | The Phase 2 React + Vite app + Express API        |
| `npm run build`                               | Builds shared, backend and web                    |
| `npm run typecheck`                           | Type-checks every workspace                       |
| `npm run lint`                                | Lints `web/` and `frontend/`                      |
| `npm run format`                              | Prettier across the repo                          |
| `npm run db:generate -w movie-finder-backend` | Generates a SQL migration from the Drizzle schema |
| `npm run db:migrate -w movie-finder-backend`  | Applies pending migrations                        |
| `npm run db:studio -w movie-finder-backend`   | Drizzle Studio                                    |

### Operational endpoints

| Endpoint   | Purpose                                                           |
| ---------- | ----------------------------------------------------------------- |
| `/health`  | Per-dependency status; 503 when a _configured_ dependency is down |
| `/metrics` | Request counts, error rates and p50/p95 latency per route         |

> `frontend/` is the previous React + Vite client, kept for reference. It is
> not an npm workspace, so it keeps its own `package-lock.json` — install it
> separately with `npm install --prefix frontend` if you want to run it.

<h2>📄 License</h2>

<p>
    This project is licensed under the <strong>MIT License</strong>.  
    You are free to use, modify, and distribute this software with proper attribution.
</p>
