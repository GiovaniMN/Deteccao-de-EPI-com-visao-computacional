// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Configurações do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCtej6q8PEyBxtzjXQiNIvNoeLGUZpp5VU",
    authDomain: "testerasp1-fd9ce.firebaseapp.com",
    projectId: "testerasp1-fd9ce",
    storageBucket: "testerasp1-fd9ce.appspot.com",
    messagingSenderId: "859378752124",
    appId: "1:859378752124:web:8cf3eba575d121700a07f9",
    databaseURL: "https://testerasp1-fd9ce-default-rtdb.firebaseio.com"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta as instâncias do Firestore e Auth para serem usadas em outros arquivos
export { db, auth, app };