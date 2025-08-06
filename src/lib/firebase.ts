import { initializeApp, getApp, getApps } from 'firebase/app';
import { getPerformance } from 'firebase/performance';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function initFirebase() {
  if (typeof window === 'undefined') return;
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase config values: ${missingKeys.join(', ')}`,
    );
  }
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  getPerformance(app);
}
