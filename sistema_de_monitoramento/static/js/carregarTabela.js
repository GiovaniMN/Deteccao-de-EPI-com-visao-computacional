// carregarTabela.js
import { db } from './firebaseConfig.js';
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const tabelaBody = document.querySelector("tbody");
const selectOrdenar = document.getElementById("ordenarPor");
const selectFiltrar = document.getElementById("filtrarPorEquipamento");
const datePicker = document.getElementById("filtrarPorData");
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
  const q = query(colecao); 

  onSnapshot(q, (snapshot) => {
    // Atualiza o total de registros
    if (totalRegistrosEl) {
        totalRegistrosEl.textContent = snapshot.size;
    }

    dadosOcorrencias = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            mensagem: data.mensagem || "(sem mensagem)",
            data_hora: data.data_hora || new Date().toISOString(), 
            imagem_base64: data.imagem_base64 || null 
        };
    });

    // Notifica o seletor de data sobre os dias com ocorrências
    const datasComOcorrencias = new Set(dadosOcorrencias.map(doc => {
        return new Date(doc.data_hora).toISOString().split('T')[0]; // Formato YYYY-MM-DD
    }));

    const event = new CustomEvent('datesLoaded', { detail: { dates: datasComOcorrencias } });
    document.dispatchEvent(event);

    filtrarEOrdenarTabela(); // Ação inicial para desenhar a tabela

  }, (error) => {
    console.error("Erro ao escutar por atualizações do Firestore:", error);
    if (tabelaBody) tabelaBody.innerHTML = "<tr><td colspan='3'>Erro ao carregar ocorrências.</td></tr>";
  });
}

function removerAcentos(texto) {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function filtrarEOrdenarTabela() {
  if (!selectOrdenar || !selectFiltrar || !datePicker || !tabelaBody) {
    console.error("Elementos de filtro ou corpo da tabela não encontrados no DOM.");
    return;
  }
  const criterioOrdenacao = selectOrdenar.value;
  const criterioFiltro = selectFiltrar.value;
  const dataFiltro = datePicker.value;

  let dadosFiltrados = [...dadosOcorrencias];

  // 1. Filtrar por equipamento
  if (criterioFiltro !== "todos") {
    const filtroNormalizado = removerAcentos(criterioFiltro.toLowerCase());
    dadosFiltrados = dadosFiltrados.filter(doc => {
      const mensagemNormalizada = removerAcentos((doc.mensagem || "").toLowerCase());
      return mensagemNormalizada.includes(filtroNormalizado);
    });
  }

  // 2. Filtrar por data
  if (dataFiltro) {
    const [dia, mes, ano] = dataFiltro.split('/').map(Number);
    const dataSelecionada = new Date(ano, mes - 1, dia);
    
    dadosFiltrados = dadosFiltrados.filter(doc => {
        const dataOcorrencia = new Date(doc.data_hora);
        return dataOcorrencia.getFullYear() === dataSelecionada.getFullYear() &&
               dataOcorrencia.getMonth() === dataSelecionada.getMonth() &&
               dataOcorrencia.getDate() === dataSelecionada.getDate();
    });
  }
  
  // 3. Ordenar dados filtrados
  dadosFiltrados.sort((a, b) => {
    const dateA = new Date(a.data_hora);
    const dateB = new Date(b.data_hora);

    // Tratar datas inválidas, colocando-as no final
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;

    return criterioOrdenacao === "data_asc" ? dateA - dateB : dateB - dateA;
  });

  // 4. Desenhar tabela
  desenharTabela(dadosFiltrados);
}

function desenharTabela(dados) {
  if (!tabelaBody) return;
  tabelaBody.innerHTML = ""; 

  if (dados.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
  } else {
      if (emptyState) emptyState.classList.add('hidden');
  }

  dados.forEach((doc, index) => {
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
    const dataFormatada = new Date(doc.data_hora).toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    spanDataHora.textContent = dataFormatada;
    tdDataHora.appendChild(spanDataHora);

    const tdButton = document.createElement("td");
    tdButton.setAttribute('data-label', 'Ação');
    tdButton.className = "px-4 py-2 text-sm font-bold leading-normal tracking-[0.015em]"; 
    const viewButton = document.createElement("button");
    viewButton.textContent = "Ver Imagem";
    viewButton.className = "view-image-btn text-blue-400 hover:text-blue-300 underline cursor-pointer bg-transparent border-none p-0"; 
    viewButton.dataset.originalIndex = dadosOcorrencias.indexOf(doc);
    tdButton.appendChild(viewButton);

    linha.appendChild(tdMensagem);
    linha.appendChild(tdDataHora);
    linha.appendChild(tdButton);

    tabelaBody.appendChild(linha);
  });
}

function displayImageInModal(originalIndex) {
    if (originalIndex === -1) {
        console.warn("Ocorrência não encontrada nos dados originais.");
        return;
    }
  const doc = dadosOcorrencias[originalIndex];
  if (doc && doc.imagem_base64) {
    const modalImageElement = document.getElementById('modalImage'); 
    const imageModal = document.getElementById('imageModal'); 
    
    if (modalImageElement && imageModal) {
        modalImageElement.src = `data:image/jpeg;base64,${doc.imagem_base64}`;
        imageModal.classList.remove('hidden');
        document.body.classList.add('modal-open'); 
    } else {
        console.warn("Erro ao tentar exibir a imagem: elementos do modal não encontrados.");
    }
  } else {
    console.warn("Dados da imagem não encontrados para esta ocorrência.");
  }
}

// Listeners de Eventos
if (selectOrdenar) {
    selectOrdenar.addEventListener("change", filtrarEOrdenarTabela);
}

if(selectFiltrar) {
    selectFiltrar.addEventListener("change", filtrarEOrdenarTabela);
}

if(datePicker) {
    datePicker.addEventListener("change", filtrarEOrdenarTabela);
}

if (tabelaBody) {
  tabelaBody.addEventListener('click', function(event) {
    const targetButton = event.target.closest('.view-image-btn'); 
    if (targetButton) {
      event.preventDefault(); 
      const originalIndex = parseInt(targetButton.dataset.originalIndex, 10);
      if (!isNaN(originalIndex)) {
        displayImageInModal(originalIndex);
      } else {
        console.error("Índice original inválido:", targetButton.dataset.originalIndex);
      }
    }
  });
}

// Inicia o listener quando o DOM estiver pronto
window.addEventListener("DOMContentLoaded", listenForData);
