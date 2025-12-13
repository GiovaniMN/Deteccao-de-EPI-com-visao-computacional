// import firebase sdk
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

//configuracao do firebase
const firebaseConfig = {
    apiKey: "AIzaSyBkgN9tJxWc3jVPSQ6DpQpOhNhFZyi5W3Y",
    authDomain: "jupiter-supervision.firebaseapp.com",
    projectId: "jupiter-supervision",
    storageBucket: "jupiter-supervision.appspot.com",
    messagingSenderId: "118412161335",
    appId: "1:118412161335:web:13aa2d9bc240935db56ab2",
    measurementId: "G-GNL7NRGM1S",
    databaseURL: "https://jupiter-supervision-default-rtdb.firebaseio.com/"
};

//inicializar firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

//constantes de resolucao para conversao de coordenadas
const WEB_REFERENCE_RESOLUTION = { width: 640, height: 480 };
const CAMERA_RESOLUTION = { width: 1280, height: 720 };
const SCALE_X = CAMERA_RESOLUTION.width / WEB_REFERENCE_RESOLUTION.width;
const SCALE_Y = CAMERA_RESOLUTION.height / WEB_REFERENCE_RESOLUTION.height;

const canvas = document.getElementById('zone-canvas');
const img = document.getElementById('reference-image');
const ctx = canvas.getContext('2d');
const statusIndicator = document.getElementById('status-indicator');
const noImagePlaceholder = document.getElementById('no-image-placeholder');
const imageError = document.getElementById('image-error');
const imageStatusText = document.getElementById('image-status-text');
const imageTimestamp = document.getElementById('image-timestamp');
const imageLoadingSpinner = document.getElementById('image-loading');

let startX, startY, endX, endY;
let drawing = false;
let zone = null;
let currentImageData = null;

function updateDebugInfo(operation) {
    document.getElementById('canvas-size').textContent = `${canvas.width}x${canvas.height}px`;
    document.getElementById('last-operation').textContent = operation;
    document.getElementById('image-loaded-status').textContent = currentImageData ? 'Sim' : 'Não';
}

function showImageLoading(show = true) {
    if (show) {
        imageLoadingSpinner.classList.remove('hidden');
        imageStatusText.textContent = 'Carregando imagem...';
        imageStatusText.className = 'text-xs text-yellow-400';
    } else {
        imageLoadingSpinner.classList.add('hidden');
    }
}

function showImageError(message = 'Erro ao carregar imagem') {
    noImagePlaceholder.classList.add('hidden');
    img.classList.add('hidden');
    imageError.classList.remove('hidden');

    imageStatusText.textContent = message;
    imageStatusText.className = 'text-xs text-red-400';
    imageTimestamp.textContent = '-';

    updateDebugInfo('Erro ao carregar imagem');
}

function showImageSuccess(timestamp) {
    noImagePlaceholder.classList.add('hidden');
    imageError.classList.add('hidden');
    img.classList.remove('hidden');

    imageStatusText.textContent = 'Imagem carregada com sucesso';
    imageStatusText.className = 'text-xs text-green-400';

    const date = new Date(timestamp);
    imageTimestamp.textContent = date.toLocaleString('pt-BR');

    updateDebugInfo('Imagem carregada com sucesso');
}

async function loadLatestImage() {
    try {
        showImageLoading(true);

        const alertasCollection = collection(db, 'alertas_epi');
        const q = query(alertasCollection, orderBy('data_hora', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        showImageLoading(false);

        if (snapshot.empty) {
            showImageError('Nenhuma imagem encontrada na base de dados');
            showFeedback('Nenhuma imagem encontrada. Adicione ocorrências para poder configurar a zona.', 'warning');
            return;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        currentImageData = data;

        if (!data.imagem_base64) {
            showImageError('Imagem não disponível no documento');
            showFeedback('A ocorrência mais recente não contém imagem.', 'error');
            return;
        }

        //carrega a imagem
        const imageDataUrl = `data:image/jpeg;base64,${data.imagem_base64}`;

        return new Promise((resolve, reject) => {
            img.onload = () => {
                showImageSuccess(data.data_hora);
                resizeCanvas();
                listenForZoneChanges(); //inicia o listener para a zona
                showFeedback('Imagem carregada com sucesso! Agora você pode definir a zona de detecção.', 'success');
                resolve();
            };

            img.onerror = () => {
                showImageError('Erro ao decodificar imagem');
                showFeedback('Erro ao carregar a imagem. Tente novamente.', 'error');
                reject(new Error('Erro ao carregar imagem'));
            };

            img.src = imageDataUrl;
        });

    } catch (error) {
        console.error('Erro ao buscar imagem mais recente:', error);
        showImageLoading(false);
        showImageError('Erro de conexão com a base de dados');
        showFeedback('Erro ao carregar imagem: ' + error.message, 'error');
        updateDebugInfo('Erro: ' + error.message);
    }
}

function resizeCanvas() {
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    updateDebugInfo('Canvas redimensionado');

    if (zone) {
        drawZone();
    }
}

function drawZone() {
    if (!zone) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

    const cornerSize = 20;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 4;

    //canto superior esquerdo
    ctx.beginPath();
    ctx.moveTo(zone.x, zone.y + cornerSize);
    ctx.lineTo(zone.x, zone.y);
    ctx.lineTo(zone.x + cornerSize, zone.y);
    ctx.stroke();

    //canto superior direito
    ctx.beginPath();
    ctx.moveTo(zone.x + zone.width - cornerSize, zone.y);
    ctx.lineTo(zone.x + zone.width, zone.y);
    ctx.lineTo(zone.x + zone.width, zone.y + cornerSize);
    ctx.stroke();

    //canto inferior esquerdo
    ctx.beginPath();
    ctx.moveTo(zone.x, zone.y + zone.height - cornerSize);
    ctx.lineTo(zone.x, zone.y + zone.height);
    ctx.lineTo(zone.x + cornerSize, zone.y + zone.height);
    ctx.stroke();

    //canto inferior direito
    ctx.beginPath();
    ctx.moveTo(zone.x + zone.width - cornerSize, zone.y + zone.height);
    ctx.lineTo(zone.x + zone.width, zone.y + zone.height);
    ctx.lineTo(zone.x + zone.width, zone.y + zone.height - cornerSize);
    ctx.stroke();

    //adiciona texto centralizado
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('ZONA DE DETECÇÃO',
        zone.x + zone.width / 2,
        zone.y + zone.height / 2);

    updateDebugInfo('Zona desenhada no canvas');
}

//converte coordenadas do canvas para coordenadas de referencia web (640x480)
function canvasToWebCoords(canvasZone) {
    const scaleX = WEB_REFERENCE_RESOLUTION.width / canvas.width;
    const scaleY = WEB_REFERENCE_RESOLUTION.height / canvas.height;

    return {
        nome: canvasZone.nome || 'zona1',
        x: Math.round(canvasZone.x * scaleX),
        y: Math.round(canvasZone.y * scaleY),
        width: Math.round(canvasZone.width * scaleX),
        height: Math.round(canvasZone.height * scaleY)
    };
}

//converte coordenadas web para coordenadas da camera
function webToCameraCoords(webZone) {
    return {
        nome: webZone.nome,
        x: Math.round(webZone.x * SCALE_X),
        y: Math.round(webZone.y * SCALE_Y),
        width: Math.round(webZone.width * SCALE_X),
        height: Math.round(webZone.height * SCALE_Y)
    };
}

//converte coordenadas web para coordenadas do canvas atual
function webToCanvasCoords(webZone) {
    const scaleX = canvas.width / WEB_REFERENCE_RESOLUTION.width;
    const scaleY = canvas.height / WEB_REFERENCE_RESOLUTION.height;

    return {
        nome: webZone.nome,
        x: Math.round(webZone.x * scaleX),
        y: Math.round(webZone.y * scaleY),
        width: Math.round(webZone.width * scaleX),
        height: Math.round(webZone.height * scaleY)
    };
}

function updateCoordinatesDisplay() {
    const coordX = document.getElementById('coord-x');
    const coordY = document.getElementById('coord-y');
    const coordWidth = document.getElementById('coord-width');
    const coordHeight = document.getElementById('coord-height');
    const zoneArea = document.getElementById('zone-area');
    const zoneStatus = document.getElementById('zone-status');

    const camCoordX = document.getElementById('cam-coord-x');
    const camCoordY = document.getElementById('cam-coord-y');
    const camCoordWidth = document.getElementById('cam-coord-width');
    const camCoordHeight = document.getElementById('cam-coord-height');

    if (zone) {
        //converte para coordenadas web de referencia
        const webZone = canvasToWebCoords(zone);
        const cameraZone = webToCameraCoords(webZone);

        //coordenadas web (640x480)
        coordX.textContent = `${webZone.x}px`;
        coordY.textContent = `${webZone.y}px`;
        coordWidth.textContent = `${webZone.width}px`;
        coordHeight.textContent = `${webZone.height}px`;
        zoneArea.textContent = `${(webZone.width * webZone.height).toLocaleString()} px²`;

        //coordenadas da camera (1280x720)
        camCoordX.textContent = `${cameraZone.x}px`;
        camCoordY.textContent = `${cameraZone.y}px`;
        camCoordWidth.textContent = `${cameraZone.width}px`;
        camCoordHeight.textContent = `${cameraZone.height}px`;

        zoneStatus.textContent = 'Zona definida';
        zoneStatus.className = 'text-green-400';
        statusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full';

        updateDebugInfo(`Coordenadas atualizadas - Web: ${webZone.x},${webZone.y} ${webZone.width}x${webZone.height} | Câmera: ${cameraZone.x},${cameraZone.y} ${cameraZone.width}x${cameraZone.height}`);
    } else {
        coordX.textContent = '-';
        coordY.textContent = '-';
        coordWidth.textContent = '-';
        coordHeight.textContent = '-';
        zoneArea.textContent = '- px²';

        camCoordX.textContent = '-';
        camCoordY.textContent = '-';
        camCoordWidth.textContent = '-';
        camCoordHeight.textContent = '-';

        zoneStatus.textContent = 'Nenhuma zona definida';
        zoneStatus.className = 'text-yellow-400';
        statusIndicator.className = 'w-3 h-3 bg-yellow-500 rounded-full status-indicator';
    }
}

window.addEventListener('resize', resizeCanvas);

function listenForZoneChanges() {
    try {
        const docRef = doc(db, 'configuracoes', 'zones');

        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.zones && data.zones.length > 0) {
                    const existingWebZone = data.zones[0];
                    zone = webToCanvasCoords(existingWebZone);
                    drawZone();
                    updateCoordinatesDisplay();
                    showFeedback('Zona de detecção foi atualizada!', 'info');
                } else {
                    zone = null;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    updateCoordinatesDisplay();
                }
            } else {
                zone = null;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                updateCoordinatesDisplay();
            }
        });

    } catch (error) {
        console.error('Erro ao escutar por zonas:', error);
        showFeedback('Erro ao carregar zona: ' + error.message, 'error');
    }
}

canvas.addEventListener('mousedown', (e) => {
    if (!currentImageData) {
        showFeedback('Carregue uma imagem antes de definir a zona.', 'warning');
        return;
    }

    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    drawing = true;
    updateDebugInfo(`Início do desenho: ${startX},${startY}`);
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing || !currentImageData) return;

    const rect = canvas.getBoundingClientRect();
    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;

    const width = endX - startX;
    const height = endY - startY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(startX, startY, width, height);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(startX, startY, width, height);
});

canvas.addEventListener('mouseup', () => {
    if (!drawing || !currentImageData) return;

    drawing = false;
    const width = endX - startX;
    const height = endY - startY;

    if (Math.abs(width) < 10 || Math.abs(height) < 10) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateDebugInfo('Zona muito pequena - ignorada');
        showFeedback('Zona muito pequena. Desenhe uma área maior.', 'warning');
        return;
    }

    zone = {
        nome: 'zona1',
        x: Math.round(Math.min(startX, endX)),
        y: Math.round(Math.min(startY, endY)),
        width: Math.round(Math.abs(width)),
        height: Math.round(Math.abs(height))
    };

    drawZone();
    updateCoordinatesDisplay();
    showFeedback('Zona definida! Clique em "Salvar Zona" para confirmar.', 'info');
});

document.getElementById('saveButton').addEventListener('click', async () => {
    if (!zone) {
        showFeedback('Nenhuma zona definida.', 'error');
        return;
    }

    if (!currentImageData) {
        showFeedback('Carregue uma imagem antes de salvar a zona.', 'warning');
        return;
    }

    try {
        //converte as coordenadas do canvas para o formato de referencia web antes de salvar
        const webZone = canvasToWebCoords(zone);
        const cameraZone = webToCameraCoords(webZone);

        const docRef = doc(db, 'configuracoes', 'zones');

        //salva as coordenadas web (que serao convertidas pela aplicacao)
        await setDoc(docRef, {
            zones: [webZone],
            lastUpdated: new Date().toISOString(),
            baseImage: {
                timestamp: currentImageData.data_hora,
                message: currentImageData.mensagem
            },
            debug_info: {
                canvas_size: `${canvas.width}x${canvas.height}`,
                web_reference: `${WEB_REFERENCE_RESOLUTION.width}x${WEB_REFERENCE_RESOLUTION.height}`,
                camera_resolution: `${CAMERA_RESOLUTION.width}x${CAMERA_RESOLUTION.height}`,
                scale_factors: `${SCALE_X}x${SCALE_Y}`,
                canvas_zone: zone,
                camera_zone: cameraZone
            }
        });

        statusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full';
        showFeedback('Zona salva com sucesso! A aplicação será sincronizada automaticamente.', 'success');
        updateDebugInfo(`Zona salva - Web: ${webZone.x},${webZone.y} ${webZone.width}x${webZone.height}`);

    } catch (err) {
        console.error('Erro ao salvar zona:', err);
        showFeedback('Erro ao salvar: ' + err.message, 'error');
        updateDebugInfo('Erro ao salvar: ' + err.message);
    }
});

document.getElementById('clearButton').addEventListener('click', () => {
    zone = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCoordinatesDisplay();
    showFeedback('Zona limpa. Desenhe uma nova zona.', 'warning');
    updateDebugInfo('Zona limpa pelo usuário');
});

document.getElementById('refreshImageButton').addEventListener('click', () => {
    loadLatestImage();
});

document.getElementById('retryLoadImage').addEventListener('click', () => {
    loadLatestImage();
});

function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    const colors = {
        success: 'text-green-400 bg-green-500/10 border border-green-500/20',
        error: 'text-red-400 bg-red-500/10 border border-red-500/20',
        warning: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
        info: 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
    };

    feedback.textContent = message;
    feedback.className = `mt-6 text-center text-sm p-3 rounded-lg transition-all duration-300 ${colors[type] || colors.info}`;

    setTimeout(() => {
        feedback.className = 'mt-6 text-center text-sm transition-all duration-300';
        feedback.textContent = '';
    }, 5000);
}

//sidebar toggle functionality
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebarOverlay.classList.toggle('hidden');
}

if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

//inicializacao
updateCoordinatesDisplay();
updateDebugInfo('Sistema inicializado');

//carrega a imagem mais recente automaticamente
loadLatestImage();