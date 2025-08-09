// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ATENÇÃO: As configurações do Firebase são injetadas automaticamente durante o deploy pelo GitHub Actions.
// Para desenvolvimento local, você pode preencher os valores abaixo com suas chaves do Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBkgN9tJxWc3jVPSQ6DpQpOhNhFZyi5W3Y",
  authDomain: "jupiter-supervision.firebaseapp.com",
  projectId: "jupiter-supervision",
  storageBucket: "jupiter-supervision.appspot.com",
  messagingSenderId: "118412161335",
  appId: "1:118412161335:web:13aa2d9bc240935db56ab2",
  measurementId: "G-GNL7NRGM1S",
  databaseURL: "https://jupiter-supervision-default-rtdb.firebaseio.com/" 
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta as instâncias do Firestore e Auth para serem usadas em outros arquivos
export { db, auth, app };