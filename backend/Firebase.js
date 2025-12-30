type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCzssTwnoEc8DPS8s6XW7lW3Ab9_VOFgKY",
    authDomain: "fitbuddy-ai-498dd.firebaseapp.com",
    projectId: "fitbuddy-ai-498dd",
    storageBucket: "fitbuddy-ai-498dd.firebasestorage.app",
    messagingSenderId: "996918206824",
    appId: "1:996918206824:web:d7848d63708a136c9b36dd",
    measurementId: "G-0NL8RFKDVY"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
