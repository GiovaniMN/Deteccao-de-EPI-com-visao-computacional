// sistema_de_monitoramento/static/js/dashboard.js
import { db, rtdb } from './firebaseConfig.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard script loaded.");

    // Elementos do DOM
    const kpiTotalOcorrencias = document.getElementById('kpi-total-ocorrencias');
    const kpiDiaCritico = document.getElementById('kpi-dia-critico');
    const kpiPrincipalInfracao = document.getElementById('kpi-principal-infracao');
    const kpiStatus = document.getElementById('kpi-status');
    const statusCard = document.getElementById('status-card');
    const statusIconContainer = document.getElementById('status-icon-container');

    // Contextos dos Gráficos
    const ctxOcorrencias = document.getElementById('ocorrenciasSemanaChart').getContext('2d');
    const ctxInfracoes = document.getElementById('infracoesChart').getContext('2d');

    let ocorrenciasChart, infracoesChart;

    // --- Lógica de Status do Sistema (Heartbeat) ---
    const heartbeatRef = ref(rtdb, 'status/last_beat');
    onValue(heartbeatRef, (snapshot) => {
        const lastBeat = snapshot.val();
        if (!lastBeat) {
            updateStatus(false);
            return;
        }
        const now = Date.now();
        const diffSeconds = (now - lastBeat) / 1000;
        updateStatus(diffSeconds < 120); // Offline se o último sinal foi há mais de 2 minutos
    });

    function updateStatus(isOnline) {
        kpiStatus.textContent = isOnline ? "Online" : "Offline";
        const baseClass = 'bg-opacity-20 rounded-xl flex items-center justify-center';
        statusIconContainer.className = isOnline ? `bg-green-500 ${baseClass}` : `bg-red-500 ${baseClass}`;
        kpiStatus.className = isOnline ? 'text-green-400' : 'text-red-400';
    }

    // --- Lógica Principal para buscar e processar dados ---
    async function fetchDataAndRender() {
        console.log("Buscando dados dos últimos 7 dias da coleção 'alertas_epi'...");
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString();

        const alertasRef = collection(db, "alertas_epi");
        const q = query(alertasRef, where("data_hora", ">=", sevenDaysAgoISO));

        try {
            const querySnapshot = await getDocs(q);
            const alertas = querySnapshot.docs.map(doc => {
                const data = doc.data();
                data.timestamp = new Date(data.data_hora);
                const match = data.mensagem.match(/sem os seguintes EPIs: (.*?)\./);
                data.tipo_alerta = match ? match[1].replace(/, /g, '_') : 'desconhecido';
                return { id: doc.id, ...data };
            });
            console.log(`Encontrados ${alertas.length} alertas.`);

            if (alertas.length === 0) {
                displayNoData();
                return;
            }

            processAndRenderKPIs(alertas);
            processAndRenderCharts(alertas);

        } catch (error) {
            console.error("Erro ao buscar alertas: ", error);
            displayNoData();
        }
    }
    
    function displayNoData() {
        kpiTotalOcorrencias.textContent = "0";
        kpiDiaCritico.textContent = "Nenhum";
        kpiPrincipalInfracao.textContent = "Nenhuma";
        if (ocorrenciasChart) ocorrenciasChart.destroy();
        if (infracoesChart) infracoesChart.destroy();
        ctxOcorrencias.canvas.parentElement.innerHTML = '<p class="text-center text-gray-400 py-10">Sem dados de ocorrências para exibir.</p>';
        ctxInfracoes.canvas.parentElement.innerHTML = '<p class="text-center text-gray-400 py-10">Sem dados de infrações para exibir.</p>';
    }

    function processAndRenderKPIs(alertas) {
        kpiTotalOcorrencias.textContent = alertas.length;

        const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const contagemPorDia = new Array(7).fill(0);
        alertas.forEach(alerta => {
            if (alerta.timestamp) {
                contagemPorDia[alerta.timestamp.getDay()]++;
            }
        });
        const maxOcorrenciasDia = Math.max(...contagemPorDia);
        const indiceDiaCritico = contagemPorDia.indexOf(maxOcorrenciasDia);
        kpiDiaCritico.textContent = diasDaSemana[indiceDiaCritico];

        const contagemInfracoes = {};
        alertas.forEach(alerta => {
            contagemInfracoes[alerta.tipo_alerta] = (contagemInfracoes[alerta.tipo_alerta] || 0) + 1;
        });
        const principalInfracao = Object.keys(contagemInfracoes).reduce((a, b) => contagemInfracoes[a] > contagemInfracoes[b] ? a : b, 'Nenhuma');
        kpiPrincipalInfracao.textContent = principalInfracao.replace(/_/g, ' ').replace(/sem /g, '');
    }

    function processAndRenderCharts(alertas) {
        const diasDaSemanaLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const hoje = new Date().getDay();
        const labelsOrdenados = [...diasDaSemanaLabels.slice(hoje + 1), ...diasDaSemanaLabels.slice(0, hoje + 1)];

        const dadosGraficoDiario = new Array(7).fill(0);
        alertas.forEach(alerta => {
            if (alerta.timestamp) {
                const diaOcorrencia = alerta.timestamp.getDay();
                const diff = (hoje - diaOcorrencia + 7) % 7;
                dadosGraficoDiario[6 - diff]++;
            }
        });

        if (ocorrenciasChart) ocorrenciasChart.destroy();
        ocorrenciasChart = new Chart(ctxOcorrencias, {
            type: 'bar',
            data: {
                labels: labelsOrdenados,
                datasets: [{
                    label: 'Ocorrências',
                    data: dadosGraficoDiario,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#9CA3AF', stepSize: 1 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

        const contagemInfracoes = {};
        alertas.forEach(alerta => {
            contagemInfracoes[alerta.tipo_alerta] = (contagemInfracoes[alerta.tipo_alerta] || 0) + 1;
        });

        const labelsInfracoes = Object.keys(contagemInfracoes).map(k => k.replace(/_/g, ' ').replace(/sem /g, ''));
        const dataInfracoes = Object.values(contagemInfracoes);

        if (infracoesChart) infracoesChart.destroy();
        infracoesChart = new Chart(ctxInfracoes, {
            type: 'doughnut',
            data: {
                labels: labelsInfracoes,
                datasets: [{
                    data: dataInfracoes,
                    backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(16, 185, 129, 0.7)'],
                    borderColor: '#1F2937',
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#D1D5DB', padding: 15, font: { size: 14 } } } }
            }
        });
    }

    fetchDataAndRender();
});
