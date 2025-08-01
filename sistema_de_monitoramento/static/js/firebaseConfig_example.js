// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Configurações do Firebase
const firebaseConfig = {

  apiKey: "apiKeyPlaceholder",
  authDomain: "authDomainPlaceholder",
  projectId: "projectIdPlaceholder",
  storageBucket: "storageBucketPlaceholder",
  messagingSenderId: "messagingSenderIdPlaceholder",
  appId: "appIdPlaceholder",
  measurementId: "measurementIdPlaceholder",
  databaseURL: "databaseURLPlaceholder" 
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta as instâncias do Firestore e Auth para serem usadas em outros arquivos
export { db, auth, app };