import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable, connectFunctionsEmulator  } from "firebase/functions";


const firebaseConfig = {
  apiKey: "AIzaSyC5boNtw0wzHirwFDMGeYdqQM0ZZfoSN0g",
  authDomain: "fansmeed-quiz-app.firebaseapp.com",
  databaseURL: "https://fansmeed-quiz-app-default-rtdb.firebaseio.com",
  projectId: "fansmeed-quiz-app",
  storageBucket: "fansmeed-quiz-app.firebasestorage.app",
  messagingSenderId: "112553870407",
  appId: "1:112553870407:web:cfc7852dbba84c457f5d62",
  measurementId: "G-WDMR9CQT27"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics = null;
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch(() => {
    // analytics unavailable — skip initialization
  });

// const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');


export { auth, db, analytics, database, storage, functions }
