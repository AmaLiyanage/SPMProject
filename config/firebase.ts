import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDl1FAyQ0qWJ_IiUmSphFy5VXNNmBdA4nU",
  authDomain: "herpower-c04b5.firebaseapp.com",
  projectId: "herpower-c04b5",
  storageBucket: "herpower-c04b5.firebasestorage.app",
  messagingSenderId: "238631878503",
  appId: "1:238631878503:web:b3adf6caa48a72249bf9c2",
  measurementId: "G-GZC7FWV2LS"
};

// Only initialize if not already initialized
let app;
let auth;
let db;

if (getApps().length === 0) {
  // Initialize Firebase App
  app = initializeApp(firebaseConfig);

  // Initialize Auth with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  // Initialize Firestore  
  db = getFirestore(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
export default app;