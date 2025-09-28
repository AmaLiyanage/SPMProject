// config/firebase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth initialization
let auth: Auth;
try {
  auth = initializeAuth(app, { persistence: AsyncStorage as any });
} catch {
  auth = getAuth(app);
}

// Firestore & Storage
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { auth, db, storage };
export default app;
