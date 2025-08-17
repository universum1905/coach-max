import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,      // <- NEU
  signOut          // <- NEU
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  arrayUnion,
  serverTimestamp,
  deleteDoc,
  addDoc       // <-- DAS FEHLT DIR!
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === Firebase-Konfiguration (Production) ===
const firebaseConfig = {
  apiKey: "AIzaSyCSekyhXJXgx2pEDcLllpMgKeRlnlY_0dY",
  authDomain: "coach-max.firebaseapp.com",
  projectId: "coach-max",
  storageBucket: "coach-max.appspot.com",
  messagingSenderId: "156803412822",
  appId: "1:156803412822:web:4ce6340bde758ab3bfdcf7",
  measurementId: "G-C5J92W6SSS"
  };

// === Initialisierung ===
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// === Emulator nur lokal aktivieren ===
if (location.hostname === "localhost") {
  connectAuthEmulator(auth, "http://localhost:4002");
  connectFirestoreEmulator(db, "localhost", 4001);
}

// === Exporte für alle Seiten (Auth & Firestore) ===
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  deleteDoc,
  addDoc    // <-- DAS FEHLT DIR!
};