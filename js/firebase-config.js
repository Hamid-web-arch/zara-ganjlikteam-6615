import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAIxHLeMpePzJKCnoD2GDDnsgaQxTgGhPk",
    authDomain: "zara-ganjlik-6615.firebaseapp.com",
    projectId: "zara-ganjlik-6615",
    storageBucket: "zara-ganjlik-6615.firebasestorage.app",
    messagingSenderId: "1083900874117",
    appId: "1:1083900874117:web:ea51e535e698a2f338c8ec",
    measurementId: "G-YE37TH5ZK1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);