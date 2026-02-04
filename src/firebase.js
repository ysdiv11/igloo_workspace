// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDpUV5G7onQvAdqqKdQilDVrcI41bcpMyE",
    authDomain: "igloo-workspace.firebaseapp.com",
    projectId: "igloo-workspace",
    storageBucket: "igloo-workspace.firebasestorage.app",
    messagingSenderId: "140110906967",
    appId: "1:140110906967:web:4e95783f638a8977550512",
    measurementId: "G-RP40KM45D5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Analytics (only in browser)
let analytics = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export { auth, googleProvider, analytics };
export default app;
