import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Every key must be present, otherwise `initializeApp` is called with
// `undefined` values and fails in a way that's hard to diagnose.
const hasCompleteConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0
);

let app = null;
let auth = null;
let db = null;
let firebaseInitialized = false;

if (hasCompleteConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseInitialized = true;
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
} else {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  console.warn(
    `Firebase disabled — missing config values: ${missing.join(", ")}. ` +
      "Watchlist features will be unavailable."
  );
}

export { auth, db, firebaseInitialized };
