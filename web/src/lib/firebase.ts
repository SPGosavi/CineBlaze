import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Every key must be present, otherwise `initializeApp` is called with
 * `undefined` values and fails in a way that is hard to diagnose.
 */
const hasCompleteConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (hasCompleteConfig) {
  try {
    // Next.js re-evaluates modules across dev refreshes and across the
    // server/client boundary, so initialising unconditionally throws
    // "Firebase App named '[DEFAULT]' already exists".
    app =
      getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase init error:", error);
    app = null;
    auth = null;
    db = null;
  }
} else if (typeof window !== "undefined") {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  console.warn(
    `Firebase disabled — missing config values: ${missing.join(", ")}. ` +
      "Watchlist features will be unavailable."
  );
}

export const firebaseInitialized = auth !== null && db !== null;

/**
 * Narrowed accessors.
 *
 * `auth` and `db` are nullable because the app is designed to run without
 * Firebase configured — discovery, search and detail pages work fine signed
 * out. These throw rather than return null so callers that have already
 * checked `firebaseInitialized` do not each have to re-narrow.
 */
export function requireAuth(): Auth {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  return auth;
}

export function requireDb(): Firestore {
  if (!db) throw new Error("Firebase Firestore is not configured.");
  return db;
}

export { auth, db };
