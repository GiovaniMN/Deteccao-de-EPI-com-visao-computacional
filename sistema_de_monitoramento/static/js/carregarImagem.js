// carregarImagem.js
import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

//captura o parametro 'index' da url
function getIndexFromURL() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("index") || "0"); //define 0 como padrao para a imagem mais recente
}

async function carregarImagemPorIndice() {
  const colecao = collection(db, "alertas_epi");
  const snapshot = await getDocs(colecao);

  if (snapshot.empty) {
    console.warn("Nenhuma imagem encontrada.");
    return;
  }

  //ordena os documentos do mais recente para o mais antigo
  const docs = snapshot.docs.map(doc => doc.data());
  docs.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));

  //obtem o indice da url, com fallback para o primeiro (mais recente)
  const index = getIndexFromURL();
  const dado = docs[index] || docs[0]; 

  const imagemBase64 = dado.imagem_base64;
  const mensagem = dado.mensagem;

  //atualiza a imagem no dom
  const imgEl = document.getElementById("imagemAlvo");
  if (imgEl && imagemBase64) {
    imgEl.src = `data:image/jpeg;base64,${imagemBase64}`;
  }

  //atualiza a mensagem no dom
  const ocorrenciaEl = document.getElementById("informacoesOcorrencia");
  if (ocorrenciaEl) {
    ocorrenciaEl.innerHTML = `<p>${mensagem}</p>`;
  }
}

window.addEventListener("DOMContentLoaded", carregarImagemPorIndice);