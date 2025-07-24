// carregarTabela.js
import { db } from './firebaseConfig.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// Assumindo que firebaseConfig.js está em sistema_de_monitoramento/firebaseConfig.js durante o deploy

const tabelaBody = document.querySelector("tbody");
const selectOrdenar = document.getElementById("ordenarPor");

let dadosOcorrencias = []; // This will store all data, including imagem_base64

async function carregarDados() {
  if (!db) {
    console.error("Firestore database instance (db) is not available from firebaseConfig.js");
    if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3'>Erro de configuração do Firebase.</td></tr>";
    return;
  }
  const colecao = collection(db, "alertas_epi");
  try {
    const snapshot = await getDocs(colecao);

    if (snapshot.empty) {
      if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3'>Nenhuma ocorrência encontrada.</td></tr>";
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
    if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3'>Erro ao carregar ocorrências.</td></tr>";
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
    linha.className = "border-t border-t-[#474747]";

    const tdMensagem = document.createElement("td");
    tdMensagem.textContent = doc.mensagem;
    tdMensagem.className = "h-[72px] px-4 py-2 text-[#ababab] text-sm font-normal leading-normal";

    const tdDataHora = document.createElement("td");
    const dataFormatada = new Date(doc.data_hora).toLocaleString();
    tdDataHora.textContent = dataFormatada;
    tdDataHora.className = "h-[72px] px-4 py-2 text-[#ababab] text-sm font-normal leading-normal";

    const tdButton = document.createElement("td"); // Changed variable name for clarity
    tdButton.className = "h-[72px] px-4 py-2 text-sm font-bold leading-normal tracking-[0.015em]"; 

    const viewButton = document.createElement("button");
    viewButton.textContent = "Ver Imagem";
    // Tailwind classes for button/link appearance, matching history page's new aesthetic
    viewButton.className = "view-image-btn text-blue-400 hover:text-blue-300 underline cursor-pointer bg-transparent border-none p-0"; 
    viewButton.dataset.index = index; 
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
    const targetButton = event.target.closest('.view-image-btn'); 
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
