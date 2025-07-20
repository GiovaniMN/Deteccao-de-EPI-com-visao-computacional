# src/teste_deteccao.py

import cv2
import pandas as pd
import numpy as np
from ultralytics import YOLO
import cvzone
import time
from collections import defaultdict
from threading import Thread, Event
import firebase_admin
from firebase_admin import credentials, firestore, storage, db
import base64
from io import BytesIO
from datetime import datetime
import requests
import os

# --- Configurações --- (Mantidas do arquivo original)
FIREBASE_KEY_PATH = os.getenv('FIREBASE_KEY_PATH', '../config/firebase_key.json')
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN', 'YOUR_TELEGRAM_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', 'YOUR_TELEGRAM_CHAT_ID')
MODEL_PATH = os.getenv('MODEL_PATH', '../models/yolov8n_full_integer_quant_edgetpu.tflite')
CLASSES_PATH = os.getenv('CLASSES_PATH', '../models/classes.txt')
VIDEO_SOURCE = int(os.getenv('VIDEO_SOURCE', 0))
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.3))
FRAME_SKIP = int(os.getenv('FRAME_SKIP', 6))
ALERT_DURATION_SECONDS = int(os.getenv('ALERT_DURATION_SECONDS', 3))
ALERT_COOLDOWN_SECONDS = int(os.getenv('ALERT_COOLDOWN_SECONDS', 60))
EPIS_MONITORADOS = ['capacete', 'oculos', 'bota']
CORES_POR_CLASSE = {
    'pessoa': (0, 255, 0), 'capacete': (255, 0, 0),
    'bota': (0, 128, 255), 'oculos': (128, 0, 128)
}
# --- Fim das Configurações ---

# --- Funções Auxiliares (incluindo novas funções) ---

def initialize_firebase():
    """Inicializa a conexão com o Firebase e o bucket de armazenamento."""
    try:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        project_id = cred.project_id
        bucket_name = f"{project_id}.appspot.com"
        database_url = f"https://{project_id}-default-rtdb.firebaseio.com/"
        firebase_admin.initialize_app(cred, {
            'storageBucket': bucket_name,
            'databaseURL': database_url
        })
        print("🔥 Firebase inicializado com sucesso.")
        return firestore.client(), storage.bucket(), db.reference()
    except Exception as e:
        print(f"❌ Erro ao inicializar Firebase: {e}")
        return None, None, None

def get_detection_zone(db_client):
    """Busca a zona de detecção do Firestore."""
    if not db_client:
        return {'x1': 0.0, 'y1': 0.0, 'x2': 1.0, 'y2': 1.0} # Zona padrão
    try:
        zona_ref = db_client.collection('configuracoes').document('zona_deteccao')
        doc = zona_ref.get()
        if doc.exists:
            print("✅ Zona de detecção carregada do Firestore.")
            return doc.to_dict()
        else:
            print("⚠️ Nenhuma zona de detecção configurada. Usando tela cheia.")
            return {'x1': 0.0, 'y1': 0.0, 'x2': 1.0, 'y2': 1.0}
    except Exception as e:
        print(f"❌ Erro ao buscar zona de detecção: {e}")
        return {'x1': 0.0, 'y1': 0.0, 'x2': 1.0, 'y2': 1.0}

def upload_reference_image(bucket, frame):
    """Faz upload de uma imagem de referência para o Firebase Storage."""
    if not bucket or frame is None:
        print("⚠️ Bucket ou frame nulo, upload da imagem de referência ignorado.")
        return
    try:
        _, buffer = cv2.imencode('.jpg', frame)
        blob = bucket.blob('reference_image/camera_frame.jpg')
        blob.upload_from_string(buffer.tobytes(), content_type='image/jpeg')
        print("🖼️ Imagem de referência atualizada no Firebase Storage.")
    except Exception as e:
        print(f"❌ Erro ao fazer upload da imagem de referência: {e}")

def capture_request_listener(event):
    """Callback para o listener do Realtime Database."""
    if event.data is True:
        print("📸 Solicitação de captura de imagem recebida!")
        # Acessa o frame mais recente do VideoStream
        latest_frame = vs.frame
        if latest_frame is not None:
            # Inicia o upload em uma nova thread para não bloquear
            upload_thread = Thread(target=upload_reference_image, args=(bucket, latest_frame))
            upload_thread.start()
        else:
            print("⚠️ Não foi possível capturar o frame para o upload.")
        
        # Reseta o gatilho no Firebase
        try:
            capture_ref = db.reference('configuracoes/tirar_foto_request')
            capture_ref.set(False)
            print("✅ Gatilho de captura resetado no Firebase.")
        except Exception as e:
            print(f"❌ Erro ao resetar o gatilho de captura: {e}")

def update_heartbeat(rtdb_ref, stop_event):
    """Atualiza um timestamp no Firebase a cada 60 segundos para indicar que o sistema está ativo."""
    heartbeat_ref = rtdb_ref.child('status/last_beat')
    while not stop_event.is_set():
        try:
            # Usa o timestamp do servidor para consistência
            heartbeat_ref.set(db.SERVER_TIMESTAMP)
            print("💓 Heartbeat enviado.")
        except Exception as e:
            print(f"❌ Erro ao enviar heartbeat: {e}")
        # Espera 60 segundos ou até o evento de parada ser acionado
        stop_event.wait(60)

# ... (manter as funções enviar_notificacao_telegram, enviar_alerta_firebase, e a classe VideoStream) ...

# --- Função Principal Modificada ---
def main():
    global db, bucket, vs # Torna as variáveis globais para acesso no listener
    db, bucket, rtdb_ref = initialize_firebase()
    if not db or not bucket:
        return

    detection_zone = get_detection_zone(db)

    # Configura o listener para o pedido de captura
    capture_ref = rtdb_ref.child('configuracoes/tirar_foto_request')
    capture_ref.listen(capture_request_listener)
    print("👂 Escutando por solicitações de captura de imagem...")

    # Inicia a thread de heartbeat
    stop_event = Event()
    heartbeat_thread = Thread(target=update_heartbeat, args=(rtdb_ref, stop_event))
    heartbeat_thread.daemon = True
    heartbeat_thread.start()

    # ... (carregar modelo e classes como no original) ...
    try:
        model = YOLO(MODEL_PATH, task='detect')
    except Exception as e:
        print(f"❌ Erro ao carregar modelo YOLO: {e}")
        return

    try:
        with open(CLASSES_PATH, "r") as my_file:
            class_list = my_file.read().strip().split("\n")
    except Exception as e:
        print(f"❌ Erro ao carregar arquivo de classes: {e}")
        return

    vs = VideoStream(src=VIDEO_SOURCE).start()
    time.sleep(2.0)

    print("\n🚀 Iniciando loop de detecção com zona customizada...")
    while True:
        ret, frame = vs.read()
        if not ret or frame is None:
            break

        # Converte a zona de percentual para pixels
        h, w, _ = frame.shape
        zone_px = {
            'x1': int(detection_zone['x1'] * w),
            'y1': int(detection_zone['y1'] * h),
            'x2': int(detection_zone['x2'] * w),
            'y2': int(detection_zone['y2'] * h)
        }

        # Lógica de detecção (resumida para focar na mudança)
        results = model.predict(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
        if results and results[0].boxes:
            px = results[0].boxes.data.cpu().numpy()
            for det in px:
                x1, y1, x2, y2, conf, class_id_float = det
                class_id = int(class_id_float)
                
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2

                # **A MUDANÇA PRINCIPAL: VERIFICA SE O OBJETO ESTÁ NA ZONA**
                if not (zone_px['x1'] < center_x < zone_px['x2'] and zone_px['y1'] < center_y < zone_px['y2']):
                    continue # Pula para a próxima detecção

                # Se estiver dentro da zona, desenha e processa normalmente
                detected_class_name = class_list[class_id]
                cor = CORES_POR_CLASSE.get(detected_class_name, (200, 200, 200))
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), cor, 2)
                cvzone.putTextRect(frame, f'{detected_class_name} {conf:.2f}', (int(x1), int(y1) - 10), scale=0.7, thickness=1)

        # Desenha a zona de detecção no frame
        cv2.rectangle(frame, (zone_px['x1'], zone_px['y1']), (zone_px['x2'], zone_px['y2']), (255, 255, 0), 2) # Ciano
        cvzone.putTextRect(frame, 'Zona de Deteccao', (zone_px['x1'], zone_px['y1'] - 10), scale=0.7, thickness=1, colorR=(255, 255, 0))

        cv2.imshow("Teste de Deteccao com Zona", frame)
        if cv2.waitKey(1) & 0xFF in [ord('q'), 27]:
            break

    # ... (código do loop while) ...

    # Encerra a thread de heartbeat e outros processos
    print("🛑 Encerrando processos...")
    stop_event.set()
    heartbeat_thread.join(timeout=5)
    vs.stop()
    cv2.destroyAllWindows()
    print("Programa de teste encerrado.")

if __name__ == "__main__":
    main()
