// sistema_de_monitoramento/static/js/zoneManagement.js
import { db, storage, rtdb } from '../config/firebaseConfig.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import { ref as dbRef, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container');
    const image = document.getElementById('reference-image');
    const canvas = document.getElementById('zone-canvas');
    const saveButton = document.getElementById('saveButton');
    const captureImageButton = document.getElementById('captureImageButton');
    const feedback = document.getElementById('feedback');
    const ctx = canvas.getContext('2d');

    const clearAllButton = document.createElement('button');
    clearAllButton.textContent = 'Limpar Zona';
    clearAllButton.className = 'bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-5 rounded-xl transition-all';
    saveButton.parentElement.insertBefore(clearAllButton, saveButton);

    const imageStorageRef = storageRef(storage, 'reference_image/camera_frame.jpg');
    const zoneDocRef = doc(db, 'configuracoes', 'zona_deteccao');
    const captureRequestRef = dbRef(rtdb, 'configuracoes/tirar_foto_request');

    let rect = {};
    let isDrawing = false;

    function setCanvasSize() {
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;
        loadZone();
    }

    function showFeedback(message, isError = false) {
        feedback.textContent = message;
        feedback.className = isError ? 'mt-4 text-center text-sm text-red-400' : 'mt-4 text-center text-sm text-green-400';
        setTimeout(() => feedback.textContent = '', 4000);
    }

    async function loadReferenceImage() {
        try {
            const url = await getDownloadURL(imageStorageRef);
            image.src = url;
            image.onload = setCanvasSize;
        } catch (error) {
            console.error("Erro ao carregar imagem de referência:", error);
            image.onload = setCanvasSize;
        }
    }

    async function loadZone() {
        try {
            const docSnap = await getDoc(zoneDocRef);
            if (docSnap.exists()) {
                const zone = docSnap.data();
                rect = {
                    x: zone.x1 * canvas.width,
                    y: zone.y1 * canvas.height,
                    w: (zone.x2 - zone.x1) * canvas.width,
                    h: (zone.y2 - zone.y1) * canvas.height
                };
            } else {
                rect = {};
            }
            draw();
        } catch (error) {
            console.error("Erro ao carregar zona:", error);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (rect.w && rect.h) {
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        }
    }

    function getMousePos(e) {
        const canvasRect = canvas.getBoundingClientRect();
        return { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };
    }

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const pos = getMousePos(e);
        rect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        rect.w = pos.x - rect.x;
        rect.h = pos.y - rect.y;
        draw();
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        if (rect.w < 0) { rect.x += rect.w; rect.w *= -1; }
        if (rect.h < 0) { rect.y += rect.h; rect.h *= -1; }
        draw();
    });

    saveButton.addEventListener('click', async () => {
        if (!rect.w || !rect.h) {
            showFeedback('Desenhe uma zona antes de salvar.', true);
            return;
        }
        const zoneToSave = {
            x1: rect.x / canvas.width,
            y1: rect.y / canvas.height,
            x2: (rect.x + rect.w) / canvas.width,
            y2: (rect.y + rect.h) / canvas.height
        };
        try {
            await setDoc(zoneDocRef, zoneToSave);
            showFeedback('Zona de detecção salva com sucesso!');
        } catch (error) {
            showFeedback('Falha ao salvar a configuração da zona.', true);
        }
    });

    clearAllButton.addEventListener('click', () => {
        rect = {};
        draw();
    });

    captureImageButton.addEventListener('click', async () => {
        try {
            await set(captureRequestRef, true);
            showFeedback('Solicitando nova imagem da câmera...');
        } catch (error) {
            showFeedback('Falha ao solicitar imagem da câmera.', true);
        }
    });

    async function init() {
        await loadReferenceImage();
        window.addEventListener('resize', setCanvasSize);
    }

    init();
});
