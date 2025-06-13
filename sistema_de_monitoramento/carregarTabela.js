// carregarTabela.js
import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const tabelaBody = document.querySelector("tbody");
const selectOrdenar = document.getElementById("ordenarPor");

let dadosOcorrencias = []; // This will store all data, including imagem_base64

async function carregarDados() {
  if (!db) {
    console.error("Firestore database instance (db) is not available from firebaseConfig.js");
    if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3' class='text-center py-8 text-gray-400'>Erro de configuração do Firebase.</td></tr>";
    return;
  }
  const colecao = collection(db, "alertas_epi");
  try {
    const snapshot = await getDocs(colecao);

    if (snapshot.empty) {
      if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3' class='text-center py-8 text-gray-400'>Nenhuma ocorrência encontrada.</td></tr>";
      return;
    }

    dadosOcorrencias = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            mensagem: data.mensagem || "(sem mensagem)",
            data_hora: data.data_hora || new Date().toISOString(), 
            imagem_base64: data.imagem_base64 || null 
        };
    });

    ordenarEDesenharTabela(); 
  } catch (error) {
    console.error("Erro ao carregar dados do Firestore:", error);
    if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3' class='text-center py-8 text-red-400'>Erro ao carregar ocorrências.</td></tr>";
  }
}

function ordenarEDesenharTabela() {
  if (!selectOrdenar || !tabelaBody) {
    console.error("Required elements (selectOrdenar or tabelaBody) not found in DOM.");
    return;
  }
  const criterio = selectOrdenar.value;

  dadosOcorrencias.sort((a, b) => {
    const dateA = new Date(a.data_hora);
    const dateB = new Date(b.data_hora);
    return criterio === "data_asc" ? dateA - dateB : dateB - dateA;
  });

  tabelaBody.innerHTML = ""; 

  dadosOcorrencias.forEach((doc, index) => {
    const linha = document.createElement("tr");
    linha.className = "border-t border-dark-700/30 hover:bg-dark-800/30 transition-colors duration-300";

    const tdMensagem = document.createElement("td");
    tdMensagem.textContent = doc.mensagem;
    tdMensagem.className = "px-6 py-4 text-gray-300 text-sm font-normal leading-relaxed";

    const tdDataHora = document.createElement("td");
    const dataFormatada = new Date(doc.data_hora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    tdDataHora.textContent = dataFormatada;
    tdDataHora.className = "px-6 py-4 text-gray-300 text-sm font-normal leading-relaxed";

    const tdButton = document.createElement("td");
    tdButton.className = "px-6 py-4"; 

    const viewButton = document.createElement("button");
    viewButton.textContent = "Ver Imagem";
    viewButton.className = "group relative overflow-hidden bg-gradient-to-r from-primary-500/20 to-primary-600/20 hover:from-primary-500/30 hover:to-primary-600/30 text-primary-300 hover:text-primary-200 font-medium py-2 px-4 rounded-lg transition-all duration-300 border border-primary-500/30 hover:border-primary-400/50 transform hover:scale-105";
    viewButton.dataset.index = index; 
    
    // Add icon to button
    const icon = document.createElement("span");
    icon.innerHTML = `
      <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
    `;
    viewButton.prepend(icon);
    
    tdButton.appendChild(viewButton);

    linha.appendChild(tdMensagem);
    linha.appendChild(tdDataHora);
    linha.appendChild(tdButton);

    tabelaBody.appendChild(linha);
  });
}

// Function to display image in modal
function displayImageInModal(index) {
  if (dadosOcorrencias[index] && dadosOcorrencias[index].imagem_base64) {
    console.log("Attempting to display image in modal for index:", index);
    const modalImageElement = document.getElementById('modalImage'); 
    const imageModal = document.getElementById('imageModal'); 
    
    if (modalImageElement && imageModal) {
        modalImageElement.src = `data:image/jpeg;base64,${dadosOcorrencias[index].imagem_base64}`;
        imageModal.classList.remove('hidden'); // Show the modal
        // Add a class to body to prevent scrolling when modal is open, if desired
        document.body.classList.add('modal-open'); 
    } else {
        console.error("Modal elements ('modalImage' or 'imageModal') not found. Cannot display image.");
        alert("Erro ao tentar exibir a imagem: elementos do modal não encontrados. Verifique o HTML da página.");
    }
  } else {
    console.error("Image data (imagem_base64) not found for index:", index, dadosOcorrencias[index]);
    alert("Dados da imagem não encontrados para esta ocorrência.");
  }
}

if (selectOrdenar) {
    selectOrdenar.addEventListener("change", ordenarEDesenharTabela);
}

if (tabelaBody) {
  tabelaBody.addEventListener('click', function(event) {
    const targetButton = event.target.closest('button[data-index]'); 
    if (targetButton) {
      event.preventDefault(); 
      const index = parseInt(targetButton.dataset.index, 10);
      if (!isNaN(index)) {
        displayImageInModal(index);
      } else {
        console.error("Invalid index obtained from button:", targetButton.dataset.index);
      }
    }
  });
}

window.addEventListener("DOMContentLoaded", carregarDados);