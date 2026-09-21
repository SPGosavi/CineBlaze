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

### Frontend
- React 19 + Vite  
- Tailwind CSS  
- Lucide Icons  
- Axios  
- Firebase SDK (Auth & Firestore)  
- Native HTML5 Drag & Drop API  

### Backend
- Node.js + Express  
- Groq API (High-throughput, low-latency LLM inference)  
- TMDB API & OMDb API  
- node-cache (Multi-tier caching)  
- node-fetch  

### Deployment & Services
- **Frontend**: Vercel  
- **Backend**: Render  
- **Database / Auth**: Firebase Cloud Firestore & Firebase Auth  
- **External APIs**: Groq, TMDB, OMDb  

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or higher  
- npm or yarn  
- API keys for:
  - Groq API (`GROQ_API_KEY`)
  - TMDB API (`TMDB_API_KEY`)
  - OMDb API (`OMDB_API_KEY`)
  - Firebase Project Configuration  

### Setup & Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cineblaze.git
   cd cineblaze
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in `backend/`:
   ```env
   PORT=5001
   GROQ_API_KEY=your_groq_api_key
   TMDB_API_KEY=your_tmdb_api_key
   OMDB_API_KEY=your_omdb_api_key
   ```
   Start the backend:
   ```bash
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in `frontend/`:
   ```env
   VITE_API_URL=http://localhost:5001
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
   Start the frontend:
   ```bash
   npm run dev
   ```

<h2>📄 License</h2>

<p>
    This project is licensed under the <strong>MIT License</strong>.  
    You are free to use, modify, and distribute this software with proper attribution.
</p>





