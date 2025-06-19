import cv2
import pandas as pd
import numpy as np
from ultralytics import YOLO
import cvzone
import time
from collections import defaultdict
from threading import Thread
import firebase_admin
from firebase_admin import credentials, firestore
import base64
from io import BytesIO
from datetime import datetime
import requests

# === Configurações do Telegram ===
TELEGRAM_TOKEN = '7683594838:AAFNpr3hQuKIlWK7MGg0kFnoxeZiA4k94OQ'
TELEGRAM_CHAT_ID = '5481967834'

def enviar_telegram(mensagem):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    params = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': mensagem
    }

    try:
        resposta = requests.get(url, params=params)
        if resposta.status_code == 200:
            print("📩 Mensagem enviada no Telegram com sucesso.")
        else:
            print("⚠️ Falha ao enviar no Telegram:", resposta.text)
    except Exception as e:
        print("❌ Erro ao tentar enviar mensagem Telegram:", e)

def enviar_imagem_telegram(imagem_buffer, legenda):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"

    files = {
        'photo': ('alerta.jpg', imagem_buffer.tobytes(), 'image/jpeg')
    }

    data = {
        'chat_id': TELEGRAM_CHAT_ID,
        'caption': legenda
    }

    try:
        resposta = requests.post(url, data=data, files=files)
        if resposta.status_code == 200:
            print("🖼️ Imagem enviada para o Telegram com sucesso.")
        else:
            print("⚠️ Falha ao enviar imagem no Telegram:", resposta.text)
    except Exception as e:
        print("❌ Erro ao enviar imagem para o Telegram:", e)




# Inicializa o Firebase
cred = credentials.Certificate("/home/epirasp/Desktop/coral_epi/firebase_key.json")  # Substitua pelo caminho correto
firebase_admin.initialize_app(cred)
db = firestore.client()

def enviar_alerta_imagem(imagem, mensagem):
    _, buffer = cv2.imencode('.jpg', imagem)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    alerta = {
        'mensagem': mensagem,
        'data_hora': datetime.now().isoformat(),
        'imagem_base64': img_base64
    }

    # Envia para o Firebase
    db.collection('alertas_epi').add(alerta)
    print(f'🚨 Alerta enviado para Firebase: {mensagem}')

    # Envia para o Telegram
    enviar_telegram(mensagem)

    # Envia imagem para o Telegram
    enviar_imagem_telegram(buffer, mensagem)

# Thread para captura de vídeo
class VideoStream:
    def __init__(self, src=0):
        self.cap = cv2.VideoCapture(src)
        self.ret, self.frame = self.cap.read()
        self.stopped = False

    def start(self):
        Thread(target=self.update, args=()).start()
        return self

    def update(self):
        while not self.stopped:
            if self.cap.isOpened():
                self.ret, self.frame = self.cap.read()

    def read(self):
        return self.ret, self.frame

    def stop(self):
        self.stopped = True
        self.cap.release()

# Inicializa modelo YOLO
model = YOLO('/home/epirasp/Desktop/coral_epi/modelos/yolov8n_full_integer_quant_edgetpu.tflite', task='detect')

vs = VideoStream().start()
time.sleep(3)

with open("/home/epirasp/Desktop/coral_epi/modelos/classes.txt", "r") as my_file:
    class_list = my_file.read().split("\n")

frame_count = 0
start_time = time.time()
total_inference_time = 0
inference_frame_count = 0

# Dicionário para controlar presença/ausência temporizada de cada EPI
estado_epi = {
    'capacete': {'ausente_desde': None, 'presente': False},
    'oculos': {'ausente_desde': None, 'presente': False},
    'bota': {'ausente_desde': None, 'presente': False}
}
duracao_para_alerta = 3  # segundos
ultimo_alerta = {'chave': '', 'timestamp': 0}

# Dicionário com cores em formato BGR para cada classe
cores_por_classe = {
    'pessoa': (0, 255, 0),     # Verde
    'capacete': (255, 0, 0),   # Azul
    'bota': (0, 128, 255),     # Laranja
    'oculos': (128, 0, 128)    # Roxo
}

while True:
    ret, frame = vs.read()
    if not ret:
        print("Erro ao capturar frame")
        break

    frame_count += 1
    if frame_count % 6 != 0:
        continue

    resized_frame = cv2.resize(frame, (640, 640))
    inference_start = time.time()
    results = model.predict(resized_frame, conf=0.3)
    scale_x = frame.shape[1] / 640
    scale_y = frame.shape[0] / 640
    inference_end = time.time()

    total_inference_time += (inference_end - inference_start)
    inference_frame_count += 1

    label_count = defaultdict(int)

    if len(results) > 0:
        a = results[0].boxes.data
        if a is not None and len(a) > 0:
            px = pd.DataFrame(a).astype("float")

            for index, row in px.iterrows():
                x1 = int(row[0] * scale_x)
                y1 = int(row[1] * scale_y)
                x2 = int(row[2] * scale_x)
                y2 = int(row[3] * scale_y)
                confidence = float(row[4])
                d = int(row[5])
                c = class_list[d]

                cor = cores_por_classe.get(c, (255, 255, 255))  # Branco como padrão se a classe não estiver no dicionário

                cv2.rectangle(frame, (x1, y1), (x2, y2), cor, 2)
                cvzone.putTextRect(
                    frame,
                    f'{c} {confidence:.2f}',  # Nome da classe
                    (x1, y1 - 10),  # Posição acima do retângulo
                    scale=0.7,
                    thickness=1,
                    colorR=cor,  # Cor do retângulo de fundo do texto
                    colorT=(0, 0, 0)  # Texto em preto
                )

                label_count[c] += 1

    # Verifica se há "pessoa" e ausência de EPI's
    epis_faltando = []
    tempo_atual = time.time()

    if label_count['pessoa'] > 0:
        tempo_entre_alertas = 60  # segundos

        for epi in ['capacete', 'oculos', 'bota']:
            if label_count[epi] == 0:
                if not estado_epi[epi]['ausente_desde']:
                    estado_epi[epi]['ausente_desde'] = tempo_atual
                estado_epi[epi]['retorno_presenca'] = None  # Reset do retorno de presença
                if tempo_atual - estado_epi[epi]['ausente_desde'] >= duracao_para_alerta:
                    estado_epi[epi]['presente'] = False
            else:
                if estado_epi[epi]['ausente_desde']:
                    if not estado_epi[epi].get('retorno_presenca'):
                        estado_epi[epi]['retorno_presenca'] = tempo_atual
                    elif tempo_atual - estado_epi[epi]['retorno_presenca'] >= duracao_para_alerta:
                        estado_epi[epi]['presente'] = True
                        estado_epi[epi]['ausente_desde'] = None
                        estado_epi[epi]['retorno_presenca'] = None
                else:
                    # EPI estava presente o tempo todo
                    estado_epi[epi]['presente'] = True

        # Agora verificamos quais realmente estão ausentes
        epis_faltando = [epi for epi, estado in estado_epi.items() if not estado['presente']]

        if epis_faltando:
            chave_alerta = "-".join(sorted(epis_faltando))
            tempo_desde_ultimo_alerta = tempo_atual - ultimo_alerta['timestamp']

            # Envia alerta se:
            # 1. Os EPIs ausentes mudaram (nova combinação)
            # 2. Já passou o tempo mínimo desde o último alerta
            if chave_alerta != ultimo_alerta['chave'] or tempo_desde_ultimo_alerta >= tempo_entre_alertas:
                mensagem = f"Pessoa sem os EPIs: {', '.join(epis_faltando)}"
                enviar_alerta_imagem(frame, mensagem)
                ultimo_alerta['chave'] = chave_alerta
                ultimo_alerta['timestamp'] = tempo_atual

    end_time = time.time()
    elapsed_time = end_time - start_time
    fps = frame_count / elapsed_time
    cvzone.putTextRect(frame, f'FPS (visual): {round(fps, 2)}', (10, 30), 1, 1)

    if inference_frame_count > 0:
        inference_fps = inference_frame_count / total_inference_time
        cvzone.putTextRect(frame, f'FPS (inference): {round(inference_fps, 2)}', (10, 60), 1, 1)

    y_offset = 90
    for label, count in label_count.items():
        cvzone.putTextRect(frame, f'{count} {label}', (10, y_offset), 1, 1)
        y_offset += 30

    cv2.imshow("FRAME", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

vs.stop()
cv2.destroyAllWindows()
