import { initializeApp } from "firebase/app";
import {
  getAuth, setPersistence,
  browserLocalPersistence, browserSessionPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missing = required.filter(k => !import.meta.env[k]);
if (missing.length) {
  throw new Error(`Missing Firebase env vars: ${missing.join(", ")}.
Create a .env file in /web with these keys (see .env.example).`);
}

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(cfg);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export function setAuthPersistence(remember) {
  return setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

const useEmu = (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true");
if (useEmu) {
  const { connectAuthEmulator } = await import("firebase/auth");
  const { connectFirestoreEmulator } = await import("firebase/firestore");
  const { connectStorageEmulator } = await import("firebase/storage");
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// ...existing imports & init unchanged
import { httpsCallable } from "firebase/functions";
export const callCompleteRegistration = httpsCallable(functions, "completeRegistration");

export async function getRoleClaim() {
  const u = auth.currentUser;
  if (!u) return null;
  const tok = await u.getIdTokenResult(true);
  return tok.claims?.role || null;
}

// Where Firebase is initialized…
export const resetAction = {
  url: `${window.location.origin}/forgot`,
  handleCodeInApp: true,
};
