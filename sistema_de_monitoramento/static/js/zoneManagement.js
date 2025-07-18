// sistema_de_monitoramento/static/js/zoneManagement.js

import { db } from '../firebaseConfig.js';
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container');
    const image = document.getElementById('reference-image');
    const canvas = document.getElementById('zone-canvas');
    const saveButton = document.getElementById('saveButton');
    const feedback = document.getElementById('feedback');
    const ctx = canvas.getContext('2d');

    const storage = getStorage();
    const imageRef = ref(storage, 'reference_image/camera_frame.jpg');
    const zoneDocRef = doc(db, "configuracoes", "zona_deteccao");

    let rect = {};
    let isDrawing = false;
    let isResizing = false;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let resizeHandle = null;
    const handleSize = 8;

    function setCanvasSize() {
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;
        loadZone();
    }

    function showFeedback(message, isError = false) {
        feedback.textContent = message;
        feedback.className = isError ? 'mt-4 text-center text-sm text-red-400' : 'mt-4 text-center text-sm text-green-400';
        setTimeout(() => feedback.textContent = '', 3000);
    }

    async function loadReferenceImage() {
        try {
            const url = await getDownloadURL(imageRef);
            image.src = url;
            image.onload = setCanvasSize;
        } catch (error) {
            console.error("Erro ao carregar imagem de referência:", error);
            showFeedback('Não foi possível carregar a imagem da câmera. Tente recarregar.', true);
            image.src = 'https://via.placeholder.com/800x600.png?text=Falha+ao+carregar+imagem';
        }
    }

    async function loadZone() {
        try {
            const docSnap = await getDoc(zoneDocRef);
            if (docSnap.exists()) {
                const zone = docSnap.data();
                // Convert normalized coordinates to pixel values
                rect = {
                    x: zone.x1 * canvas.width,
                    y: zone.y1 * canvas.height,
                    w: (zone.x2 - zone.x1) * canvas.width,
                    h: (zone.y2 - zone.y1) * canvas.height
                };
            } else {
                // Default rectangle if none is saved
                rect = { x: canvas.width * 0.2, y: canvas.height * 0.2, w: canvas.width * 0.6, h: canvas.height * 0.6 };
            }
            draw();
        } catch (error) {
            console.error("Erro ao carregar zona:", error);
            showFeedback('Erro ao carregar configuração da zona.', true);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (rect.w && rect.h) {
            ctx.strokeStyle = '#00FFFF'; // Cyan
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

            // Draw resize handles
            ctx.fillStyle = '#00FFFF';
            getHandles().forEach(handle => {
                ctx.fillRect(handle.x, handle.y, handle.w, handle.h);
            });
        }
    }

    function getHandles() {
        if (!rect.w || !rect.h) return [];
        return [
            { x: rect.x - handleSize / 2, y: rect.y - handleSize / 2, w: handleSize, h: handleSize, cursor: 'nwse-resize', position: 'tl' },
            { x: rect.x + rect.w - handleSize / 2, y: rect.y - handleSize / 2, w: handleSize, h: handleSize, cursor: 'nesw-resize', position: 'tr' },
            { x: rect.x - handleSize / 2, y: rect.y + rect.h - handleSize / 2, w: handleSize, h: handleSize, cursor: 'nesw-resize', position: 'bl' },
            { x: rect.x + rect.w - handleSize / 2, y: rect.y + rect.h - handleSize / 2, w: handleSize, h: handleSize, cursor: 'nwse-resize', position: 'br' }
        ];
    }

    function getMousePos(e) {
        const canvasRect = canvas.getBoundingClientRect();
        return { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };
    }

    canvas.addEventListener('mousedown', (e) => {
        const mousePos = getMousePos(e);
        resizeHandle = getHandles().find(h => mousePos.x >= h.x && mousePos.x <= h.x + h.w && mousePos.y >= h.y && mousePos.y <= h.y + h.h);

        if (resizeHandle) {
            isResizing = true;
        } else if (mousePos.x > rect.x && mousePos.x < rect.x + rect.w && mousePos.y > rect.y && mousePos.y < rect.y + rect.h) {
            isDragging = true;
            dragStart = { x: mousePos.x - rect.x, y: mousePos.y - rect.y };
        } else {
            isDrawing = true;
            rect = { x: mousePos.x, y: mousePos.y, w: 0, h: 0 };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const mousePos = getMousePos(e);
        const currentHandle = getHandles().find(h => mousePos.x >= h.x && mousePos.x <= h.x + h.w && mousePos.y >= h.y && mousePos.y <= h.y + h.h);
        canvas.style.cursor = currentHandle ? currentHandle.cursor : (isDrawing || isResizing || isDragging) ? canvas.style.cursor : 'crosshair';

        if (isDrawing) {
            rect.w = mousePos.x - rect.x;
            rect.h = mousePos.y - rect.y;
        } else if (isDragging) {
            rect.x = mousePos.x - dragStart.x;
            rect.y = mousePos.y - dragStart.y;
        } else if (isResizing) {
            const oldX = rect.x;
            const oldY = rect.y;
            if (resizeHandle.position.includes('l')) {
                rect.w += rect.x - mousePos.x;
                rect.x = mousePos.x;
            }
            if (resizeHandle.position.includes('t')) {
                rect.h += rect.y - mousePos.y;
                rect.y = mousePos.y;
            }
            if (resizeHandle.position.includes('r')) {
                rect.w = mousePos.x - oldX;
            }
            if (resizeHandle.position.includes('b')) {
                rect.h = mousePos.y - oldY;
            }
        }

        if (isDrawing || isDragging || isResizing) {
            draw();
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = isDragging = isResizing = false;
        resizeHandle = null;
        // Ensure width and height are positive
        if (rect.w < 0) { rect.x += rect.w; rect.w *= -1; }
        if (rect.h < 0) { rect.y += rect.h; rect.h *= -1; }
        draw();
    });

    saveButton.addEventListener('click', async () => {
        if (!rect.w || !rect.h) {
            showFeedback('Desenhe uma zona antes de salvar.', true);
            return;
        }
        // Normalize coordinates
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
            console.error("Erro ao salvar zona:", error);
            showFeedback('Falha ao salvar a configuração da zona.', true);
        }
    });

    // Initial Load
    loadReferenceImage();
    window.addEventListener('resize', setCanvasSize);
});
