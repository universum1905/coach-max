import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSekyhXJXgx2pEDcLllpMgKeRlnlY_0dY",
  authDomain: "coach-max.firebaseapp.com",
  projectId: "coach-max",
  storageBucket: "coach-max.appspot.com",
  messagingSenderId: "156803412822",
  appId: "1:156803412822:web:4ce6340bde758ab3bfdcf7",
  measurementId: "G-C5J92W6SSS"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);