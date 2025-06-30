// config/firebaseConfig.example.js
// Copie este arquivo para config/firebaseConfig.js e preencha com suas credenciais reais do Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js"; // Adicionado para Auth

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Substitua pelo seu valor
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // Substitua pelo seu valor
  projectId: "YOUR_PROJECT_ID", // Substitua pelo seu valor
  storageBucket: "YOUR_PROJECT_ID.appspot.com", // Substitua pelo seu valor
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Substitua pelo seu valor
  appId: "YOUR_APP_ID" // Substitua pelo seu valor
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Exporte as instâncias do Firebase que seus outros módulos usarão
export { db, auth, app };