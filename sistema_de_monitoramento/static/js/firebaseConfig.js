// static/js/firebaseConfig.js
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
firebase.initializeApp(firebaseConfig);

db = firebase.firestore();
auth = firebase.auth();
storage = firebase.storage();
rtdb = firebase.database();
// Variáveis globais (sem var/let/const para ficarem disponíveis em outros scripts) 