<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCSekyhXJXgx2pEDcLllpMgKeRlnlY_0dY",
    authDomain: "coach-max.firebaseapp.com",
    projectId: "coach-max",
    storageBucket: "coach-max.firebasestorage.app",
    messagingSenderId: "156803412822",
    appId: "1:156803412822:web:4ce6340bde758ab3bfdcf7",
    measurementId: "G-C5J92W6SSS"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>