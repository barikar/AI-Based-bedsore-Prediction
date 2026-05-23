// Import the functions you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "",
  authDomain: "bedsore-prediction.firebaseapp.com",
  databaseURL: "https://bedsore-prediction-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bedsore-prediction",
  storageBucket: "bedsore-prediction.firebasestorage.app",
  messagingSenderId: "231922592711",
  appId: "1:231922592711:web:6ac24cf05bea77a36207e2",
  measurementId: "G-V0ZVKJQ94S",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// ✅ Export all instances
export { app, analytics, database };
