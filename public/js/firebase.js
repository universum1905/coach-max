// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, getDocs, collection, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === Deine Firebase-Konfiguration ===
const firebaseConfig = {
  apiKey: "AIzaSyCSekyhXJXgx2pEDcLllpMgKeRlnlY_0dY",
  authDomain: "coach-max.firebaseapp.com",
  projectId: "coach-max",
  storageBucket: "coach-max.firebasestorage.app",
  messagingSenderId: "156803412822",
  appId: "1:156803412822:web:4ce6340bde758ab3bfdcf7",
  measurementId: "G-C5J92W6SSS"
};

// === Initialisierung ===
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// === Hilfs-Exporte ===
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  arrayUnion,
  serverTimestamp
};