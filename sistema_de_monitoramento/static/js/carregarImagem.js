// Removidos os imports, db já está disponível globalmente via firebaseConfig.js
// Assumindo que firebaseConfig.js está em sistema_de_monitoramento/static/js/firebaseConfig.js durante o deploy

// Captura o parâmetro 'index' da URL
function getIndexFromURL() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("index") || "0"); // Default = 0 (imagem mais recente)
}

async function carregarImagemPorIndice() {
  const colecao = db.collection("alertas_epi");
  const snapshot = await colecao.get();

  if (snapshot.empty) {
    console.warn("Nenhuma imagem encontrada.");
    return;
  }

  // Ordenar do mais recente para o mais antigo
  const docs = snapshot.docs.map(doc => doc.data());
  docs.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));

  // Pega o índice da URL
  const index = getIndexFromURL();
  const dado = docs[index] || docs[0]; // fallback para a mais recente

  const imagemBase64 = dado.imagem_base64;
  const mensagem = dado.mensagem;

  // Atualiza a imagem
  const imgEl = document.getElementById("imagemAlvo");
  if (imgEl && imagemBase64) {
    imgEl.src = `data:image/jpeg;base64,${imagemBase64}`;
  }

  // Atualiza a mensagem
  const ocorrenciaEl = document.getElementById("informacoesOcorrencia");
  if (ocorrenciaEl) {
    ocorrenciaEl.innerHTML = `<p>${mensagem}</p>`;
  }
}

window.addEventListener("DOMContentLoaded", carregarImagemPorIndice);
