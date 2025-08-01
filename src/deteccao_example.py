# improved_epi_detector_hybrid_v17_final_debug.py - Versão com Depuração de Memória de EPI

import cv2
import numpy as np
from ultralytics import YOLO
import time
from collections import deque, defaultdict
from threading import Thread
import firebase_admin
from firebase_admin import credentials, firestore
import base64
from datetime import datetime
import requests
import logging
import os
import tkinter as tk

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# === CLASSE PARA LEITURA DE CÂMERA EM THREAD ===
class WebcamStream:
    def __init__(self, src=0):
        self.stream = cv2.VideoCapture(src)
        if not self.stream.isOpened(): raise IOError("Não foi possível abrir a câmera")
        self.stream.set(cv2.CAP_PROP_FRAME_WIDTH, config.CAMERA_RESOLUTION[0])
        self.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, config.CAMERA_RESOLUTION[1])
        self.stream.set(cv2.CAP_PROP_FPS, 15)
        self.stream.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        (self.grabbed, self.frame) = self.stream.read()
        self.stopped = False
        self.thread = Thread(target=self.update, args=(), daemon=True).start()

    def update(self):
        while not self.stopped: (self.grabbed, self.frame) = self.stream.read()
    def read(self): return self.frame
    def stop(self): self.stopped = True

# === Configurações Otimizadas ===
class OptimizedConfig:
    TELEGRAM_TOKEN = 'TELEGRAM_TOKEN'
    TELEGRAM_CHAT_ID = 'TELEGRAM_CHAT_ID'
    
    MODEL_PATH = '/home/epirasp/Desktop/coral_epi/modelos/yolo_last_full_integer_quant_edgetpu.tflite'
    CLASSES_PATH = '/home/epirasp/Desktop/coral_epi/modelos/classes.txt'
    FIREBASE_KEY_PATH = '/home/epirasp/Desktop/coral_epi/firebase_key.json'
    
    CAMERA_RESOLUTION = (1920, 1080)
    WEB_REFERENCE_RESOLUTION = (640, 480)
    INFERENCE_SIZE = (640, 640)
    
    DETECTION_CONFIDENCE = {'pessoa': 0.4, 'capacete': 0.6, 'bota': 0.3, 'oculos': 0.2}
    MIN_DETECTION_AREA = {'pessoa': 7000, 'capacete': 400, 'bota': 500, 'oculos': 100}
    MAX_DETECTION_AREA = {'pessoa': 80000, 'capacete': 15000, 'bota': 15000, 'oculos': 8000}
    
    ANALYSIS_PERIOD_SECONDS = 3.0
    NON_COMPLIANCE_THRESHOLD_SECONDS = 3.0
    
    STABILITY_BUFFER_SIZE = 15 
    PRESENCE_CONFIDENCE_RATIO = 0.5
    # --- AJUSTE PREVENTIVO ---
    # Um EPI precisa ser visto em apenas 15% dos frames do buffer para ser considerado "presente"
    EPI_PRESENCE_RATIO = 0.15 
    LOG_THROTTLE_SECONDS = 2.0
    ZONE_UPDATE_INTERVAL = 20

config = OptimizedConfig()

# === Monitor de Performance ===
class PerformanceMonitor:
    def __init__(self): self.frame_times = deque(maxlen=30)
    def update_frame_time(self, ft): self.frame_times.append(ft)
    def get_avg_fps(self):
        if not self.frame_times: return 0
        return 1.0 / (sum(self.frame_times) / len(self.frame_times))

# === Preprocessador Simples ===
class SimplePreprocessor:
    def enhance_frame(self, frame):
        return cv2.resize(frame, config.INFERENCE_SIZE, interpolation=cv2.INTER_AREA), (0, 0, frame.shape[1], frame.shape[0])

# === Gerenciador de Escala de Zonas ===
class ZoneScaleManager:
    @staticmethod
    def web_to_camera_coords(web_zone, cam_res):
        scale_x = cam_res[0] / config.WEB_REFERENCE_RESOLUTION[0]
        scale_y = cam_res[1] / config.WEB_REFERENCE_RESOLUTION[1]
        return {'nome': web_zone.get('nome', 'Monitor'), 'x': int(web_zone['x'] * scale_x), 'y': int(web_zone['y'] * scale_y), 'width': int(web_zone['width'] * scale_x), 'height': int(web_zone['height'] * scale_y)}

# === Sistema Principal Híbrido ===
class HybridEPIDetector:
    def __init__(self):
        self.firebase_manager = FirebaseManager()
        self.telegram_manager = TelegramManager()
        self.preprocessor = SimplePreprocessor()
        self.performance_monitor = PerformanceMonitor()
        self.zone_scale_manager = ZoneScaleManager()
        
        self.required_epis = {'capacete', 'bota', 'oculos'}
        self.zone_state = 'Vazio'
        self.stable_status = 'Vazio'
        
        self.entry_time = None
        self.non_compliance_start_time = None
        self.alert_sent_this_session = False
        
        self.person_presence_history = deque(maxlen=config.STABILITY_BUFFER_SIZE)
        self.epi_presence_history = {epi: deque(maxlen=config.STABILITY_BUFFER_SIZE) for epi in self.required_epis}
        
        self.model = YOLO(config.MODEL_PATH, task='detect')
        with open(config.CLASSES_PATH, "r") as f: self.class_list = f.read().strip().split("\n")
        
        self.zones = []
        self.last_zone_update = 0
        self.camera_resolution = config.CAMERA_RESOLUTION
        self.status_colors = {'Vazio': (255, 255, 0), 'Analisando': (255, 191, 0), 'EPI_Conforme': (0, 255, 0), 'EPI_Nao_Conforme': (0, 0, 255)}
        self.class_colors = {'pessoa': (0, 255, 0), 'capacete': (255, 0, 0), 'bota': (0, 165, 255), 'oculos': (255, 0, 255)}
        
        self.last_log_time = 0
        
        logger.info("Detector EPI inicializado - Versão com Depuração de Memória")

    def detect_objects(self, frame, zones):
        frame_start = time.time()
        try:
            processed_frame, _ = self.preprocessor.enhance_frame(frame)
            results = self.model.predict(processed_frame, conf=0.1, verbose=False, imgsz=640)
            detections, counts = [], defaultdict(int)
            if results and results[0].boxes:
                scale_x, scale_y = frame.shape[1] / config.INFERENCE_SIZE[0], frame.shape[0] / config.INFERENCE_SIZE[1]
                for data in results[0].boxes.data.cpu().numpy():
                    detection = self._process_detection(data, scale_x, scale_y, zones, frame.shape)
                    if detection:
                        detections.append(detection)
                        if detection['in_zone']: counts[detection['class_name']] += 1
            self.performance_monitor.update_frame_time(time.time() - frame_start)
            return detections, counts
        except Exception as e: logger.error(f"Erro na detecção: {e}"); return [], defaultdict(int)
    
    def _validate_person_properties(self, x1, y1, x2, y2, frame_shape):
        h, w = y2 - y1, x2 - y1
        if h <= 0 or w <= 0: return False
        aspect_ratio = w / h
        if not (0.4 < aspect_ratio < 1.6): return False
        min_height_px = frame_shape[0] * 0.15
        if h < min_height_px: return False
        return True

    def _process_detection(self, data, scale_x, scale_y, zones, frame_shape):
        try:
            x1, y1, x2, y2, conf, class_id = data
            class_name = self.class_list[int(class_id)]
            
            if class_name not in self.required_epis and class_name != 'pessoa': return None
            if conf < config.DETECTION_CONFIDENCE.get(class_name, 0.5): return None

            orig_x1, orig_y1 = int(x1 * scale_x), int(y1 * scale_y)
            orig_x2, orig_y2 = int(x2 * scale_x), int(y2 * scale_y)

            area = (orig_x2 - orig_x1) * (orig_y2 - orig_y1)
            min_area, max_area = config.MIN_DETECTION_AREA.get(class_name, 0), config.MAX_DETECTION_AREA.get(class_name, float('inf'))
            if not (min_area < area < max_area): return None

            if class_name == 'pessoa' and not self._validate_person_properties(orig_x1, orig_y1, orig_x2, orig_y2, frame_shape):
                return None

            return {'bbox': (orig_x1, orig_y1, orig_x2, orig_y2), 'class_name': class_name, 'in_zone': self._is_in_zone(orig_x1, orig_y1, orig_x2, orig_y2, zones)}
        except: return None
    
    def _is_in_zone(self, x1, y1, x2, y2, zones):
        if not zones: return True
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        return any(z['x'] <= cx <= z['x'] + z['width'] and z['y'] <= cy <= z['y'] + z['height'] for z in zones)

    def _reset_state(self):
        if self.zone_state != 'Vazio': logger.info("Zona esvaziada. Resetando estado.")
        self.zone_state = 'Vazio'
        self.stable_status = 'Vazio'
        self.entry_time = None
        self.non_compliance_start_time = None
        self.alert_sent_this_session = False
        self.person_presence_history.clear()
        for epi in self.required_epis: self.epi_presence_history[epi].clear()

    def process_and_alert(self, detections, counts, frame):
        instant_person_present = counts.get('pessoa', 0) > 0
        self.person_presence_history.append(instant_person_present)
        is_person_stably_present = self.person_presence_history.count(True) > (len(self.person_presence_history) * config.PRESENCE_CONFIDENCE_RATIO)

        if self.zone_state == 'Vazio':
            if is_person_stably_present:
                self.zone_state = 'Analisando'
                self.entry_time = time.time()
                logger.info("Presença estável detectada. Iniciando período de ANÁLISE.")
        
        elif self.zone_state == 'Analisando':
            if not is_person_stably_present: self._reset_state(); return
            elapsed = time.time() - self.entry_time
            if elapsed >= config.ANALYSIS_PERIOD_SECONDS:
                self.zone_state = 'MONITORING'
                # CORREÇÃO: Limpa o histórico dos EPIs ao iniciar o monitoramento
                for epi in self.required_epis: self.epi_presence_history[epi].clear()
                logger.info("Análise concluída. Iniciando MONITORAMENTO contínuo.")
        
        elif self.zone_state == 'MONITORING':
            if not is_person_stably_present: self._reset_state(); return

            for epi in self.required_epis:
                self.epi_presence_history[epi].append(counts.get(epi, 0) > 0)

            missing_epis_now = set()
            for epi, history in self.epi_presence_history.items():
                if history.count(True) < (len(history) * config.EPI_PRESENCE_RATIO):
                    missing_epis_now.add(epi)
            
            self.stable_status = 'EPI_Nao_Conforme' if missing_epis_now else 'EPI_Conforme'

            # --- LOG DE MEMÓRIA ---
            current_time = time.time()
            if current_time - self.last_log_time > config.LOG_THROTTLE_SECONDS:
                log_msg = "[MEMÓRIA EPI] "
                for epi, history in self.epi_presence_history.items():
                    log_msg += f"{epi.capitalize()}: {history.count(True)}/{len(history)} | "
                logger.info(log_msg)
                self.last_log_time = current_time

            if self.stable_status == 'EPI_Conforme':
                self.non_compliance_start_time = None
            elif self.stable_status == 'EPI_Nao_Conforme':
                if self.non_compliance_start_time is None:
                    logger.warning(f"NÃO CONFORMIDADE ESTÁVEL. Itens faltantes na memória: {missing_epis_now}. Iniciando timer.")
                    self.non_compliance_start_time = time.time()
                else:
                    elapsed = time.time() - self.non_compliance_start_time
                    if elapsed >= config.NON_COMPLIANCE_THRESHOLD_SECONDS and not self.alert_sent_this_session:
                        logger.critical("ALERTA! Não conformidade persistiu. Enviando alerta.")
                        self._send_alert(list(missing_epis_now), frame, detections, counts)
                        self.alert_sent_this_session = True

    def _send_alert(self, missing_epis, frame, detections, counts):
        epi_names = {'capacete': 'Capacete', 'bota': 'Bota', 'oculos': 'Óculos'}
        missing_names = [epi_names.get(epi, epi) for epi in missing_epis]
        message = f"🚨 ALERTA: NÃO CONFORMIDADE DE EPI\n- Itens Faltantes: {', '.join(missing_names)}"
        alert_frame = self.draw_frame(frame, detections, counts, self.zones)
        Thread(target=self.telegram_manager.send_message, args=(message,), daemon=True).start()
        Thread(target=self.firebase_manager.save_alert, args=(missing_epis, message, alert_frame), daemon=True).start()

    def draw_frame(self, frame, detections, counts, zones):
        display_frame = frame.copy()
        
        if self.zone_state == 'Analisando': zone_color = self.status_colors['Analisando']
        else: zone_color = self.status_colors.get(self.stable_status, (255, 255, 255))

        for zone in zones:
            cv2.rectangle(display_frame, (zone['x'], zone['y']), (zone['x'] + zone['width'], zone['y'] + zone['height']), zone_color, 3)
            overlay = display_frame.copy(); cv2.rectangle(overlay, (zone['x'], zone['y']), (zone['x'] + zone['width'], zone['y'] + zone['height']), zone_color, -1)
            cv2.addWeighted(overlay, 0.2, display_frame, 0.8, 0, display_frame)

        for detection in detections:
            x1, y1, x2, y2 = detection['bbox']
            class_name = detection['class_name']
            color = self.class_colors.get(class_name, (200, 200, 200))
            cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
        
        return self._add_ui_overlay(display_frame, counts)
    
    def _add_ui_overlay(self, frame, counts):
        h, w = frame.shape[:2]; panel_x = w - 200
        overlay = frame.copy(); cv2.rectangle(overlay, (panel_x, 0), (w, h), (20, 20, 20), -1)
        frame = cv2.addWeighted(frame, 0.8, overlay, 0.2, 0)
        
        y = 40; cv2.putText(frame, "MONITOR DE EPI", (panel_x + 10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
        
        y += 50
        if self.zone_state == 'Analisando':
            status_text = 'ANALISANDO...'; status_color = self.status_colors['Analisando']
        else:
            status_text = self.stable_status.replace('_', ' '); status_color = self.status_colors.get(self.stable_status, (255, 255, 255))
        # Linha 1: "Status:"
        cv2.putText(frame, "Status:", (panel_x + 10, y), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 1)

        # Linha 2: o valor de `status_text`, com y deslocado (+25 é um bom valor)
        cv2.putText(frame, status_text, (panel_x + 10, y + 25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 1)

        y += 50; cv2.putText(frame, f"FPS: {self.performance_monitor.get_avg_fps():.1f}", (panel_x + 10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        y += 40; cv2.putText(frame, "Contagem na Zona:", (panel_x + 10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        for class_name in ['pessoa', 'capacete', 'bota', 'oculos']:
            y += 30  # substitui o y_pos += 30
            count = counts.get(class_name, 0)
            color = self.class_colors.get(class_name, (255, 255, 255))

            # Retângulo colorido da classe
            cv2.rectangle(frame, (panel_x + 15, y - 10), 
                        (panel_x + 35, y + 5), color, -1)

            # Borda branca do retângulo
            cv2.rectangle(frame, (panel_x + 15, y - 10), 
                        (panel_x + 35, y + 5), (255, 255, 255), 1)

            # Texto com o nome da classe e a contagem
            text = f"{class_name.capitalize()}: {count}"
            cv2.putText(frame, text, (panel_x + 45, y), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        if self.zone_state == 'MONITORING' and self.non_compliance_start_time and not self.alert_sent_this_session:
            y += 40; elapsed = time.time() - self.non_compliance_start_time
            remaining = max(0, config.NON_COMPLIANCE_THRESHOLD_SECONDS - elapsed)
            cv2.putText(frame, f"Alerta em: {remaining:.1f}s", (panel_x + 10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 1)

        cv2.putText(frame, "ESC: Sair", (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        return frame
    
    def update_zones(self):
        if time.time() - self.last_zone_update > config.ZONE_UPDATE_INTERVAL:
            try:
                web_zones = self.firebase_manager.get_zones()
                if web_zones: self.zones = [self.zone_scale_manager.web_to_camera_coords(wz, self.camera_resolution) for wz in web_zones]
            except Exception as e: logger.error(f"Erro ao atualizar zonas: {e}")
            finally: self.last_zone_update = time.time()
    
    def run(self):
        logger.info("=== INICIANDO SISTEMA DE DETECÇÃO ===")
        cap = None
        try:
            cap = WebcamStream(src=0); time.sleep(2.0)
            test_frame = cap.read()
            if test_frame is None: raise RuntimeError("Câmera não está capturando frames.")
            self.camera_resolution = (test_frame.shape[1], test_frame.shape[0])
        except Exception as e: logger.error(f"ERRO CRÍTICO AO INICIAR CÂMERA: {e}"); cap and cap.stop(); return

        cv2.namedWindow("Detecção de EPI", cv2.WINDOW_NORMAL); cv2.resizeWindow("Detecção de EPI", 800, 600)

        try:
            while True:
                frame = cap.read()
                if frame is None: time.sleep(0.1); continue
                
                self.update_zones()
                detections, counts = self.detect_objects(frame, self.zones)
                self.process_and_alert(detections, counts, frame)
                
                display_frame = self.draw_frame(frame, detections, counts, self.zones)
                cv2.imshow("Detecção de EPI", display_frame)
                
                if cv2.waitKey(1) & 0xFF == 27: break
                
        except KeyboardInterrupt: logger.info("Interrompido pelo usuário")
        finally: logger.info("Finalizando..."); cap and cap.stop(); cv2.destroyAllWindows()

# === Classes Auxiliares (Firebase e Telegram) ===
class FirebaseManager:
    def __init__(self): self.db = None; self._initialize()
    def _initialize(self):
        try:
            if not firebase_admin._apps:
                if not os.path.exists(config.FIREBASE_KEY_PATH): logger.warning("Arquivo Firebase não encontrado."); return
                cred = credentials.Certificate(config.FIREBASE_KEY_PATH)
                firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            logger.info("Firebase inicializado.")
        except Exception as e: logger.error(f"Erro ao inicializar Firebase: {e}")
    
    def get_zones(self):
        if not self.db: return []
        try:
            doc = self.db.collection('configuracoes').document('zones').get()
            return doc.to_dict().get('zones', []) if doc.exists else []
        except Exception as e: logger.error(f"Erro ao carregar zonas: {e}"); return []
    
    def save_alert(self, missing_epis, message, alert_frame):
        if not self.db: logger.warning("Alerta não salvo. Firebase indisponível."); return
        try:
            _, buffer = cv2.imencode('.jpg', alert_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            alert_data = {'mensagem': message, 'epis_faltantes': missing_epis, 'data_hora': datetime.now().isoformat(), 'imagem_base64': img_base64}
            self.db.collection('alertas_epi').add(alert_data)
            logger.info("✅ Alerta salvo no Firebase.")
        except Exception as e: logger.error(f"❌ Erro ao salvar alerta no Firebase: {e}")

class TelegramManager:
    def __init__(self): self.session = requests.Session()
    def send_message(self, message):
        if not config.TELEGRAM_TOKEN or not config.TELEGRAM_CHAT_ID: return False
        url = f"https://api.telegram.org/bot{config.TELEGRAM_TOKEN}/sendMessage"
        try:
            self.session.post(url, data={'chat_id': config.TELEGRAM_CHAT_ID, 'text': message}, timeout=10)
        except Exception as e: logger.error(f"❌ Exceção no Telegram: {e}")

# === Função Principal ===
def main():
    if any(not os.path.exists(f) for f in [config.MODEL_PATH, config.CLASSES_PATH]):
        logger.error("Arquivos de modelo ou classes não encontrados."); return
    try:
        HybridEPIDetector().run()
    except Exception as e:
        logger.error(f"Erro crítico: {e}", exc_info=True)

if __name__ == "__main__":
    main()