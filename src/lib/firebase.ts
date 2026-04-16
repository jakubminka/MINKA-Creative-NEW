import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app, auth, db;

// Vyčištění klíčů od případných uvozovek, které tam lidé často dávají v .env
const cleanKey = (key: string | undefined) => key?.replace(/['"]/g, '');

const isConfigValid = cleanKey(firebaseConfig.apiKey) && 
                     cleanKey(firebaseConfig.apiKey) !== "undefined";

if (isConfigValid) {
  try {
    app = initializeApp({
      ...firebaseConfig,
      apiKey: cleanKey(firebaseConfig.apiKey)
    });
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase failed to initialize check config:", error);
  }
} else {
  console.error("Firebase API Key is missing in .env file!");
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LIST = "LIST"
}

export const handleFirestoreError = (error: any, operation: OperationType, path: string) => {
  console.error(`Firestore Error during ${operation} at ${path}:`, error);
  // Zde můžeš přidat toast notifikaci pro uživatele
};