// carregarTabela.js
import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const tabelaBody = document.querySelector("tbody");
const selectOrdenar = document.getElementById("ordenarPor");

let dadosOcorrencias = [];

async function carregarDados() {
  const colecao = collection(db, "alertas_epi");
  const snapshot = await getDocs(colecao);

  if (snapshot.empty) {
    tabelaBody.innerHTML = "<tr><td colspan='3'>Nenhuma ocorrência encontrada.</td></tr>";
    return;
  }

  dadosOcorrencias = snapshot.docs.map(doc => doc.data());

  ordenarEDesenharTabela(); // Desenha ao carregar
}

function ordenarEDesenharTabela() {
  const criterio = selectOrdenar.value;

  if (criterio === "data_asc") {
    dadosOcorrencias.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  } else {
    // padrão: data_desc
    dadosOcorrencias.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  }

  tabelaBody.innerHTML = "";

  dadosOcorrencias.forEach((doc, index) => {
    const linha = document.createElement("tr");

    const tdMensagem = document.createElement("td");
    tdMensagem.textContent = doc.mensagem || "(sem mensagem)";

    const tdDataHora = document.createElement("td");
    const dataFormatada = new Date(doc.data_hora).toLocaleString();
    tdDataHora.textContent = dataFormatada;

    const tdLink = document.createElement("td");
    const link = document.createElement("a");
    link.textContent = "Ver";
    link.className = "link-ver";
    link.href = `pagina-principal.html?index=${index}`;
    tdLink.appendChild(link);

    linha.appendChild(tdMensagem);
    linha.appendChild(tdDataHora);
    linha.appendChild(tdLink);

    tabelaBody.appendChild(linha);
  });
}

selectOrdenar.addEventListener("change", ordenarEDesenharTabela);

window.addEventListener("DOMContentLoaded", carregarDados);
