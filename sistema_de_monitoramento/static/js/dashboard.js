// sistema_de_monitoramento/static/js/dashboard.js

// Removidos os imports, db e rtdb já estão disponíveis globalmente via firebaseConfig.js
// Assumindo que firebaseConfig.js está em sistema_de_monitoramento/static/js/firebaseConfig.js durante o deploy

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
    const heartbeatRef = rtdb.ref('status/last_beat');
    heartbeatRef.on('value', (snapshot) => {
        const lastBeat = snapshot.val();
        if (!lastBeat) {
            updateStatus(false); // Nenhum sinal recebido
            return;
        }
        const now = Date.now();
        const diffSeconds = (now - lastBeat) / 1000;

        // Considera offline se o último sinal foi há mais de 2 minutos
        updateStatus(diffSeconds < 120);
    });

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

    // --- Lógica Principal para buscar e processar dados ---
    async function fetchDataAndRender() {
        console.log("Buscando dados dos últimos 7 dias...");
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // Timestamp compatível
        const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);

        const ocorrenciasRef = db.collection("ocorrencias");
        const q = ocorrenciasRef.where("timestamp", ">=", sevenDaysAgoTimestamp);

        try {
            const querySnapshot = await q.get();
            const ocorrencias = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Encontradas ${ocorrencias.length} ocorrências.`);

            // Processar e renderizar os dados
            processAndRenderKPIs(ocorrencias);
            processAndRenderCharts(ocorrencias);

        } catch (error) {
            console.error("Erro ao buscar ocorrências: ", error);
            kpiTotalOcorrencias.textContent = "Erro";
        }
    }

    function processAndRenderKPIs(ocorrencias) {
        // 1. Total de Ocorrências
        kpiTotalOcorrencias.textContent = ocorrencias.length;

        if (ocorrencias.length === 0) {
            kpiDiaCritico.textContent = "Nenhum";
            kpiPrincipalInfracao.textContent = "Nenhuma";
            return;
        }

        // 2. Dia Mais Crítico
        const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const contagemPorDia = new Array(7).fill(0);
        ocorrencias.forEach(o => {
            const dia = o.timestamp.toDate().getDay();
            contagemPorDia[dia]++;
        });
        const maxOcorrenciasDia = Math.max(...contagemPorDia);
        const indiceDiaCritico = contagemPorDia.indexOf(maxOcorrenciasDia);
        kpiDiaCritico.textContent = diasDaSemana[indiceDiaCritico];

        // 3. Principal Infração
        const contagemInfracoes = {};
        ocorrencias.forEach(o => {
            const tipo = o.tipo_alerta || 'Desconhecido';
            contagemInfracoes[tipo] = (contagemInfracoes[tipo] || 0) + 1;
        });
        const principalInfracao = Object.keys(contagemInfracoes).reduce((a, b) => contagemInfracoes[a] > contagemInfracoes[b] ? a : b);
        kpiPrincipalInfracao.textContent = principalInfracao.replace(/_/g, ' ').replace(/sem /g, ''); // Formatação
    }

    function processAndRenderCharts(ocorrencias) {
        const diasDaSemanaLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const hoje = new Date().getDay();
        // Reordena os labels para começar hoje
        const labelsOrdenados = [...diasDaSemanaLabels.slice(hoje + 1), ...diasDaSemanaLabels.slice(0, hoje + 1)];

        // 1. Gráfico de Ocorrências por Dia
        const dadosGraficoDiario = new Array(7).fill(0);
        ocorrencias.forEach(o => {
            const diaOcorrencia = o.timestamp.toDate().getDay();
            const diff = (hoje - diaOcorrencia + 7) % 7;
            dadosGraficoDiario[6 - diff]++;
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
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#9CA3AF' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#9CA3AF' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // 2. Gráfico de Distribuição de Infrações
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
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(139, 92, 246, 0.7)',
                        'rgba(16, 185, 129, 0.7)'
                    ],
                    borderColor: '#1F2937',
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#D1D5DB',
                            padding: 15,
                            font: { size: 14 }
                        }
                    }
                }
            }
        });
    }

    // Iniciar a busca de dados
    fetchDataAndRender();
});
