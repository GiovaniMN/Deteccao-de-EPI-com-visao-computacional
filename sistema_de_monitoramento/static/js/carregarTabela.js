// carregarTabela.js
import { db } from './firebaseConfig.js';
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const tabelaBody = document.querySelector("tbody");
const selectOrdenar = document.getElementById("ordenarPor");
const emptyState = document.getElementById("emptyState");
const totalRegistrosEl = document.getElementById('total-registros');

let dadosOcorrencias = []; // Armazena todos os dados para modais e ordenação

function listenForData() {
  if (!db) {
    console.error("Instância do Firestore (db) não está disponível.");
    if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3'>Erro de configuração do Firebase.</td></tr>";
    return;
  }

  const colecao = collection(db, "alertas_epi");
  const q = query(colecao); // Pode adicionar orderBy aqui se quiser uma ordem padrão do DB

  onSnapshot(q, (snapshot) => {
    console.log("🔥 Histórico atualizado em tempo real!");

    if (totalRegistrosEl) {
        totalRegistrosEl.textContent = snapshot.size;
    }

    if (snapshot.empty) {
      if (tabelaBody) tabelaBody.innerHTML = "";
      if (emptyState) emptyState.classList.remove('hidden');
      dadosOcorrencias = [];
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    dadosOcorrencias = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            mensagem: data.mensagem || "(sem mensagem)",
            data_hora: data.data_hora || new Date().toISOString(), 
            imagem_base64: data.imagem_base64 || null 
        };
    });

    ordenarEDesenharTabela(); // Redesenha a tabela com os novos dados

  }, (error) => {
    console.error("Erro ao escutar por atualizações do Firestore:", error);
    if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3'>Erro ao carregar ocorrências.</td></tr>";
  });
}

function ordenarEDesenharTabela() {
  if (!selectOrdenar || !tabelaBody) {
    console.error("Elementos necessários (selectOrdenar ou tabelaBody) não encontrados no DOM.");
    return;
  }
  const criterio = selectOrdenar.value;

  // Cria uma cópia antes de ordenar para não modificar a ordem original se necessário
  const dadosOrdenados = [...dadosOcorrencias];

  dadosOrdenados.sort((a, b) => {
    const dateA = new Date(a.data_hora);
    const dateB = new Date(b.data_hora);
    return criterio === "data_asc" ? dateA - dateB : dateB - dateA;
  });

  tabelaBody.innerHTML = ""; 

  dadosOrdenados.forEach((doc, index) => {
    const linha = document.createElement("tr");
    linha.className = "border-t border-t-[#474747]";

    const tdMensagem = document.createElement("td");
    tdMensagem.setAttribute('data-label', 'Ocorrência');
    tdMensagem.className = "px-4 py-2 text-[#ababab] text-sm font-normal leading-normal";
    const spanMensagem = document.createElement('span');
    spanMensagem.textContent = doc.mensagem;
    spanMensagem.className = 'min-w-0 break-words';
    tdMensagem.appendChild(spanMensagem);

    const tdDataHora = document.createElement("td");
    tdDataHora.setAttribute('data-label', 'Data e Hora');
    tdDataHora.className = "px-4 py-2 text-[#ababab] text-sm font-normal leading-normal";
    const spanDataHora = document.createElement('span');
    const dataFormatada = new Date(doc.data_hora).toLocaleString('pt-BR');
    spanDataHora.textContent = dataFormatada;
    tdDataHora.appendChild(spanDataHora);

    const tdButton = document.createElement("td");
    tdButton.setAttribute('data-label', 'Ação');
    tdButton.className = "px-4 py-2 text-sm font-bold leading-normal tracking-[0.015em]"; 
    const viewButton = document.createElement("button");
    viewButton.textContent = "Ver Imagem";
    viewButton.className = "view-image-btn text-blue-400 hover:text-blue-300 underline cursor-pointer bg-transparent border-none p-0"; 
    viewButton.dataset.index = index; 
    tdButton.appendChild(viewButton);

    linha.appendChild(tdMensagem);
    linha.appendChild(tdDataHora);
    linha.appendChild(tdButton);

    tabelaBody.appendChild(linha);
  });
}

function displayImageInModal(index) {
  const doc = dadosOcorrencias.find((d, i) => i === index);
  if (doc && doc.imagem_base64) {
    const modalImageElement = document.getElementById('modalImage'); 
    const imageModal = document.getElementById('imageModal'); 
    
    if (modalImageElement && imageModal) {
        modalImageElement.src = `data:image/jpeg;base64,${doc.imagem_base64}`;
        imageModal.classList.remove('hidden');
        document.body.classList.add('modal-open'); 
    } else {
        alert("Erro ao tentar exibir a imagem: elementos do modal não encontrados.");
    }
  } else {
    alert("Dados da imagem não encontrados para esta ocorrência.");
  }
}

if (selectOrdenar) {
    selectOrdenar.addEventListener("change", ordenarEDesenharTabela);
}

if (tabelaBody) {
  tabelaBody.addEventListener('click', function(event) {
    const targetButton = event.target.closest('.view-image-btn'); 
    if (targetButton) {
      event.preventDefault(); 
      const index = parseInt(targetButton.dataset.index, 10);
      if (!isNaN(index)) {
        // Encontra o documento correto nos dados ordenados na tela
        const criterio = selectOrdenar.value;
        const dadosOrdenados = [...dadosOcorrencias].sort((a, b) => {
            const dateA = new Date(a.data_hora);
            const dateB = new Date(b.data_hora);
            return criterio === "data_asc" ? dateA - dateB : dateB - dateA;
        });
        const docParaMostrar = dadosOrdenados[index];
        // Encontra o índice original para passar para a função do modal
        const originalIndex = dadosOcorrencias.findIndex(d => d.data_hora === docParaMostrar.data_hora && d.mensagem === docParaMostrar.mensagem);
        displayImageInModal(originalIndex);
      } else {
        console.error("Índice inválido obtido do botão:", targetButton.dataset.index);
      }
    }
  });
}

// Inicia o listener quando o DOM estiver pronto
window.addEventListener("DOMContentLoaded", listenForData);
