// ============================================================
// FIREBASE — inicialização do app e exportação dos serviços
// usados no site (Firestore para dados, Auth para login do admin).
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBcsVZH8Jo-dP30p38PD5K30bscS8fQNH4",
    authDomain: "brechosandrinha-722c7.firebaseapp.com",
    projectId: "brechosandrinha-722c7",
    storageBucket: "brechosandrinha-722c7.firebasestorage.app",
    messagingSenderId: "556332352498",
    appId: "1:556332352498:web:2b0f827557d113d278a16b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
