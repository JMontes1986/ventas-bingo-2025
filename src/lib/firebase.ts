
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getPerformance } from "firebase/performance";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "bingo-salesmate",
  "appId": "1:5672574260:web:6befb0e6bd9670a1e4d961",
  "storageBucket": "bingo-salesmate.appspot.com",
  "apiKey": "AIzaSyCZqO61AEKaoz542SJV-9spx9nU4Uvvak4",
  "authDomain": "bingo-salesmate.firebaseapp.com",
  "measurementId": "G-YSJMFBWMXE",
  "messagingSenderId": "5672574260"
};

// Initialize Firebase
let app;
if (typeof window !== 'undefined') {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

let performance;
if (app && typeof window !== 'undefined') {
    performance = getPerformance(app);
}


export { app, performance };
