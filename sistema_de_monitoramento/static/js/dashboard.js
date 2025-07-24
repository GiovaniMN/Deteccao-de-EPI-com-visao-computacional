// sistema_de_monitoramento/static/js/dashboard.js
import { db } from '../config/firebaseConfig.js';
import { collection, query, where, getDocs, Timestamp, addDoc, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
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

    // --- Lógica de Status do Sistema (Simplificada) ---
    function updateStatus(isOnline) {
        if (isOnline) {
            kpiStatus.textContent = "Online";
            statusCard.classList.remove('border-red-500/50');
            statusCard.classList.add('border-green-500/50');
            statusIconContainer.classList.remove('bg-red-500/20');
            statusIconContainer.classList.add('bg-green-500/20');
            kpiStatus.classList.remove('text-red-400');
            kpiStatus.classList.add('text-green-400');
        } else {
            kpiStatus.textContent = "Offline";
            statusCard.classList.remove('border-green-500/50');
            statusCard.classList.add('border-red-500/50');
            statusIconContainer.classList.remove('bg-green-500/20');
            statusIconContainer.classList.add('bg-red-500/20');
            kpiStatus.classList.remove('text-green-400');
            kpiStatus.classList.add('text-red-400');
        }
    }
    updateStatus(true);

    // --- Lógica para criar dados de exemplo ---
    async function criarDadosDeExemplo() {
        const ocorrenciasRef = collection(db, "ocorrencias");
        const snapshot = await getCountFromServer(ocorrenciasRef);
        
        if (snapshot.data().count > 0) {
            console.log("Dados de ocorrências já existem. Pulando a criação de exemplos.");
            return;
        }

        console.log("Criando dados de exemplo para o dashboard...");
        const tiposDeAlerta = ["sem_capacete", "sem_colete", "sem_luvas"];
        const promessas = [];

        for (let i = 0; i < 25; i++) {
            const diasAtras = Math.floor(Math.random() * 7);
            const data = new Date();
            data.setDate(data.getDate() - diasAtras);
            
            const novaOcorrencia = {
                timestamp: Timestamp.fromDate(data),
                tipo_alerta: tiposDeAlerta[Math.floor(Math.random() * tiposDeAlerta.length)],
                camera: `Camera_${Math.ceil(Math.random() * 3)}`,
                imagem_url: "https://via.placeholder.com/150" // URL de exemplo
            };
            promessas.push(addDoc(ocorrenciasRef, novaOcorrencia));
        }
        await Promise.all(promessas);
        console.log("Dados de exemplo criados com sucesso.");
    }

    // --- Lógica Principal para buscar e processar dados ---
    async function fetchDataAndRender() {
        console.log("Buscando dados dos últimos 7 dias...");
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

        const ocorrenciasRef = collection(db, "ocorrencias");
        const q = query(ocorrenciasRef, where("timestamp", ">=", sevenDaysAgoTimestamp));

        try {
            const querySnapshot = await getDocs(q);
            const ocorrencias = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Encontradas ${ocorrencias.length} ocorrências.`);

            if (ocorrencias.length === 0) {
                displayNoData();
                return;
            }

            processAndRenderKPIs(ocorrencias);
            processAndRenderCharts(ocorrencias);

        } catch (error) {
            console.error("Erro ao buscar ocorrências: ", error);
            kpiTotalOcorrencias.textContent = "Erro";
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

    function processAndRenderKPIs(ocorrencias) {
        kpiTotalOcorrencias.textContent = ocorrencias.length;

        const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const contagemPorDia = new Array(7).fill(0);
        ocorrencias.forEach(o => {
            if (o.timestamp) {
                const dia = o.timestamp.toDate().getDay();
                contagemPorDia[dia]++;
            }
        });
        const maxOcorrenciasDia = Math.max(...contagemPorDia);
        const indiceDiaCritico = contagemPorDia.indexOf(maxOcorrenciasDia);
        kpiDiaCritico.textContent = diasDaSemana[indiceDiaCritico];

        const contagemInfracoes = {};
        ocorrencias.forEach(o => {
            const tipo = o.tipo_alerta || 'Desconhecido';
            contagemInfracoes[tipo] = (contagemInfracoes[tipo] || 0) + 1;
        });
        const principalInfracao = Object.keys(contagemInfracoes).reduce((a, b) => contagemInfracoes[a] > contagemInfracoes[b] ? a : b, 'Nenhuma');
        kpiPrincipalInfracao.textContent = principalInfracao.replace(/_/g, ' ').replace(/sem /g, '');
    }

    function processAndRenderCharts(ocorrencias) {
        const diasDaSemanaLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const hoje = new Date().getDay();
        const labelsOrdenados = [...diasDaSemanaLabels.slice(hoje + 1), ...diasDaSemanaLabels.slice(0, hoje + 1)];

        const dadosGraficoDiario = new Array(7).fill(0);
        ocorrencias.forEach(o => {
            if (o.timestamp) {
                const diaOcorrencia = o.timestamp.toDate().getDay();
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
        ocorrencias.forEach(o => {
            const tipo = o.tipo_alerta || 'Desconhecido';
            contagemInfracoes[tipo] = (contagemInfracoes[tipo] || 0) + 1;
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

    // Iniciar a aplicação
    async function init() {
        await criarDadosDeExemplo();
        await fetchDataAndRender();
    }

    init();
});
