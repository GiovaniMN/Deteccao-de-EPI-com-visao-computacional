// sistema_de_monitoramento/static/js/zoneManagement.js
import { db, storage } from '../config/firebaseConfig.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container');
    const image = document.getElementById('reference-image');
    const canvas = document.getElementById('zone-canvas');
    const saveButton = document.getElementById('saveButton');
    const captureImageButton = document.getElementById('captureImageButton');
    const feedback = document.getElementById('feedback');
    const ctx = canvas.getContext('2d');

    // --- Botões Adicionais ---
    // Criando novos botões dinamicamente para melhor controle
    const clearLastButton = document.createElement('button');
    clearLastButton.textContent = 'Limpar Última Zona';
    clearLastButton.className = 'bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-5 rounded-xl transition-all';
    
    const clearAllButton = document.createElement('button');
    clearAllButton.textContent = 'Limpar Tudo';
    clearAllButton.className = 'bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-5 rounded-xl transition-all';

    // Adicionando os botões ao lado do botão de salvar
    saveButton.parentElement.insertBefore(clearLastButton, saveButton);
    saveButton.parentElement.insertBefore(clearAllButton, clearLastButton);


    // --- Variáveis de Estado ---
    const imageRef = ref(storage, 'reference_image/camera_frame.jpg');
    const zoneDocRef = doc(db, 'configuracoes', 'camera_1_zones'); // Documento específico para zonas da câmera 1

    let zones = []; // Array para armazenar múltiplas zonas
    let currentZone = {};
    let isDrawing = false;

    // --- Funções Principais ---
    function setCanvasSize() {
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;
        draw();
    }

    function showFeedback(message, isError = false) {
        feedback.textContent = message;
        feedback.className = isError ? 'mt-4 text-center text-sm text-red-400' : 'mt-4 text-center text-sm text-green-400';
        setTimeout(() => feedback.textContent = '', 4000);
    }

    async function loadReferenceImage() {
        try {
            const url = await getDownloadURL(imageRef);
            image.src = url;
            image.onload = setCanvasSize;
        } catch (error) {
            console.error("Erro ao carregar imagem de referência:", error);
            if (error.code === 'storage/object-not-found') {
                showFeedback('Nenhuma imagem de referência encontrada. Usando placeholder.', true);
            } else {
                showFeedback('Falha ao carregar imagem da câmera.', true);
            }
            image.onload = setCanvasSize; // Garante que o canvas seja dimensionado mesmo com o placeholder
        }
    }

    async function loadZones() {
        try {
            const docSnap = await getDoc(zoneDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Converte as zonas normalizadas para coordenadas de pixel
                zones = data.zones.map(zone => ({
                    x: zone.x1 * canvas.width,
                    y: zone.y1 * canvas.height,
                    w: (zone.x2 - zone.x1) * canvas.width,
                    h: (zone.y2 - zone.y1) * canvas.height
                }));
            } else {
                zones = []; // Nenhuma zona salva ainda
            }
            draw();
        } catch (error) {
            console.error("Erro ao carregar zonas:", error);
            showFeedback('Erro ao carregar configuração de zonas.', true);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#00FFFF'; // Cyan
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Linha tracejada

        // Desenha todas as zonas salvas
        zones.forEach(zone => {
            ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
        });

        // Desenha a zona atual que está sendo criada
        if (isDrawing && currentZone.w && currentZone.h) {
            ctx.strokeRect(currentZone.x, currentZone.y, currentZone.w, currentZone.h);
        }
    }

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // --- Event Listeners ---
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const pos = getMousePos(e);
        currentZone = { x: pos.x, y: pos.y, w: 0, h: 0 };
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        currentZone.w = pos.x - currentZone.x;
        currentZone.h = pos.y - currentZone.y;
        draw();
    });

    canvas.addEventListener('mouseup', () => {
        if (!isDrawing) return;
        isDrawing = false;
        
        // Garante que a largura e altura sejam positivas
        if (currentZone.w < 0) {
            currentZone.x += currentZone.w;
            currentZone.w *= -1;
        }
        if (currentZone.h < 0) {
            currentZone.y += currentZone.h;
            currentZone.h *= -1;
        }
        
        // Adiciona a nova zona ao array se ela tiver um tamanho mínimo
        if (currentZone.w > 5 && currentZone.h > 5) {
            zones.push(currentZone);
        }
        currentZone = {}; // Limpa a zona atual
        draw();
    });

    saveButton.addEventListener('click', async () => {
        if (zones.length === 0) {
            showFeedback('Desenhe pelo menos uma zona antes de salvar.', true);
            return;
        }
        
        // Normaliza as coordenadas de todas as zonas para salvar
        const zonesToSave = {
            zones: zones.map(zone => ({
                x1: zone.x / canvas.width,
                y1: zone.y / canvas.height,
                x2: (zone.x + zone.w) / canvas.width,
                y2: (zone.y + zone.h) / canvas.height
            }))
        };

        try {
            await setDoc(zoneDocRef, zonesToSave);
            showFeedback('Zonas de detecção salvas com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar zonas:", error);
            showFeedback('Falha ao salvar a configuração das zonas.', true);
        }
    });

    clearLastButton.addEventListener('click', () => {
        if (zones.length > 0) {
            zones.pop(); // Remove a última zona adicionada
            draw();
            showFeedback('Última zona removida.', false);
        }
    });

    clearAllButton.addEventListener('click', () => {
        if (zones.length > 0) {
            zones = []; // Limpa todas as zonas
            draw();
            showFeedback('Todas as zonas foram removidas.', false);
        }
    });

    // Botão de captura de imagem (funcionalidade simplificada)
    captureImageButton.addEventListener('click', () => {
        showFeedback('Funcionalidade de captura de imagem não implementada nesta versão.', true);
        // A lógica do RTDB foi removida para simplificar.
        // A atualização da imagem deve ser feita manualmente no Firebase Storage.
        // Para ver a nova imagem, o usuário pode recarregar a página.
    });

    // --- Inicialização ---
    async function init() {
        await loadReferenceImage();
        await loadZones();
        window.addEventListener('resize', setCanvasSize);
    }

    init();
});
