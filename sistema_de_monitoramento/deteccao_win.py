import cv2
import numpy as np
from ultralytics import YOLO
import time
from collections import deque, defaultdict
from threading import Thread, Lock
import firebase_admin
from firebase_admin import credentials, firestore
import requests
import logging
import os
from enum import Enum
import base64
from datetime import datetime

#LOGGIN
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

#ESTADOS
class EntryState(Enum):
    EMPTY = "VAZIO"
    ENTERING = "ENTRANDO"
    ANALYZING = "ANALISANDO"
    APPROVED = "APROVADO"
    REJECTED = "REJEITADO"
    EXITING = "SAINDO"

#WEBCAM
class FixedWebcamStream:
    def __init__(self, src=0):
        self.stream = cv2.VideoCapture(src, cv2.CAP_DSHOW)
        if not self.stream.isOpened(): 
            raise IOError("Camera indisponivel")
        
        self.stream.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        self.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
        self.stream.set(cv2.CAP_PROP_FPS, 30)
        self.stream.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        ret, test_frame = self.stream.read()
        if ret:
            actual_w = int(self.stream.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_h = int(self.stream.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        self.frame = test_frame
        self.frame_lock = Lock()
        self.stopped = False
        
        self.thread = Thread(target=self._update, daemon=True)
        self.thread.start()

    def _update(self):
        while not self.stopped:
            ret, frame = self.stream.read()
            if ret:
                with self.frame_lock:
                    self.frame = frame
            else:
                time.sleep(0.001)

    def read(self):
        with self.frame_lock:
            return self.frame.copy() if self.frame is not None else None

    def stop(self):
        self.stopped = True
        if self.thread.is_alive():
            self.thread.join(timeout=0.5)
        if self.stream.isOpened():
            self.stream.release()

#CONFIGURACOES
class CleanConfig:
    TELEGRAM_TOKEN = '7683594838:AAFNpr3hQuKIlWK7MGg0kFnoxeZiA4k94OQ'
    TELEGRAM_CHAT_ID = '-4842024226'
    
    MODEL_PATH = os.path.join(os.getcwd(), 'modelos', 'epi.pt')
    CLASSES_PATH = os.path.join(os.getcwd(), 'modelos', 'classes.txt')
    FIREBASE_KEY_PATH = os.path.join(os.getcwd(), 'firebase_key.json')
    
    WEB_REFERENCE_RESOLUTION = (640, 480)
    INFERENCE_SIZE = (640, 640)
    
    DETECTION_CONFIDENCE = {
        'pessoa': 0.30,
        'capacete': 0.58,
        'bota': 0.35,
        'oculos': 0.30
    }
    
    MIN_DETECTION_AREA = {
        'pessoa': 5500,
        'capacete': 500,
        'bota': 150,
        'oculos': 130
    }
    
    MAX_DETECTION_AREA = {
        'pessoa': 600000,
        'capacete': 60000,
        'bota': 100000,
        'oculos': 32000
    }
    
    PERSON_FRAMES = 8
    EPI_FRAMES = 20
    EPI_RATIO = 0.30
    EXIT_FRAMES = 10
    
    ALERT_MIN_PRESENCE_RATE = {
        'pessoa': 0.50,
        'capacete': 0.40,
        'bota': 0.3,
        'oculos': 0.3
    }
    
    COLORS = {
        EntryState.EMPTY: (128, 128, 128),
        EntryState.ENTERING: (255, 255, 0),
        EntryState.ANALYZING: (255, 165, 0),
        EntryState.APPROVED: (0, 255, 0),
        EntryState.REJECTED: (0, 0, 255),
        EntryState.EXITING: (128, 0, 128)
    }
    
    CLASS_COLORS = {
        'pessoa': (0, 255, 255),
        'capacete': (255, 0, 0),
        'bota': (0, 165, 255),
        'oculos': (255, 0, 255)
    }
    
    REQUIRED_EPIS = {'capacete', 'bota', 'oculos'}


config = CleanConfig()

#TRACKER DE DETECCOES FILTRADAS
class FilteredDetectionTracker:
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.detection_regions = defaultdict(lambda: {
            'bboxes': [],
            'confidences': [],
            'total_frames': 0,
            'detected_frames': 0,
            'avg_bbox': None,
            'max_confidence': 0.0
        })
        self.total_analysis_frames = 0
    
    def add_frame_detections(self, detections):
        self.total_analysis_frames += 1
        detected_classes = set()
        
        for detection in detections:
            if detection['in_zone']:
                class_name = detection['class_name']
                detected_classes.add(class_name)
                
                region = self.detection_regions[class_name]
                region['bboxes'].append(detection['bbox'])
                region['confidences'].append(detection['confidence'])
                region['detected_frames'] += 1
                region['max_confidence'] = max(region['max_confidence'], detection['confidence'])
        
        for class_name in ['pessoa', 'capacete', 'bota', 'oculos']:
            self.detection_regions[class_name]['total_frames'] = self.total_analysis_frames
    
    def get_filtered_representative_detections(self):
        representative_detections = []
        
        for class_name, region in self.detection_regions.items():
            if region['total_frames'] == 0:
                continue
            
            presence_rate = region['detected_frames'] / region['total_frames']
            min_rate = config.ALERT_MIN_PRESENCE_RATE.get(class_name, 0.30)
            
            if presence_rate >= min_rate and region['bboxes']:
                avg_bbox = self._calculate_average_bbox(region['bboxes'])
                
                representative_detections.append({
                    'class_name': class_name,
                    'bbox': avg_bbox,
                    'presence_rate': presence_rate,
                    'max_confidence': region['max_confidence'],
                    'detected_frames': region['detected_frames'],
                    'total_frames': region['total_frames'],
                    'is_reliable': True
                })
        
        return representative_detections
    
    def _calculate_average_bbox(self, bboxes):
        if not bboxes:
            return None
        
        x1_sum = y1_sum = x2_sum = y2_sum = 0
        count = len(bboxes)
        
        for x1, y1, x2, y2 in bboxes:
            x1_sum += x1
            y1_sum += y1
            x2_sum += x2
            y2_sum += y2
        
        return (int(x1_sum / count), int(y1_sum / count), 
                int(x2_sum / count), int(y2_sum / count))

#FPS
class SimpleFPSMonitor:
    def __init__(self):
        self.times = deque(maxlen=30)
        self.last_update = 0
        self.cached_fps = 0
        
    def update(self, frame_time):
        self.times.append(frame_time)
        if time.time() - self.last_update > 0.5:
            if len(self.times) >= 5:
                avg_time = sum(self.times) / len(self.times)
                self.cached_fps = 1.0 / avg_time if avg_time > 0 else 0
            self.last_update = time.time()
    
    def get_fps(self):
        return self.cached_fps

#PREPROCESSAMENTO
class FixedPreprocessor:
    def __init__(self):
        self.target_size = config.INFERENCE_SIZE
        
    def process(self, frame):
        h, w = frame.shape[:2]
        scale = min(self.target_size[0]/w, self.target_size[1]/h)
        new_w, new_h = int(w * scale), int(h * scale)
        
        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        top = (self.target_size[1] - new_h) // 2
        bottom = self.target_size[1] - new_h - top
        left = (self.target_size[0] - new_w) // 2
        right = self.target_size[0] - new_w - left
        
        padded = cv2.copyMakeBorder(resized, top, bottom, left, right, 
                                   cv2.BORDER_CONSTANT, value=[114, 114, 114])
        
        return padded, scale, top, left

#CONTROLADOR
class CleanEPIController:
    def __init__(self):
        self.firebase_manager = CompatibleFirebaseManager()
        self.telegram_manager = FastTelegramManager()
        self.preprocessor = FixedPreprocessor()
        self.fps_monitor = SimpleFPSMonitor()
        
        self.detection_tracker = FilteredDetectionTracker()
        
        self.state = EntryState.EMPTY
        self.state_time = time.time()
        
        self.person_history = deque(maxlen=max(config.PERSON_FRAMES, config.EXIT_FRAMES))
        self.epi_history = {epi: deque(maxlen=config.EPI_FRAMES) for epi in config.REQUIRED_EPIS}
        
        self.detection_cache = []
        self.counts_cache = {}
        
        self.last_alert = 0
        self.clean_analysis_frame = None
        
        print(f"Carregando modelo: {config.MODEL_PATH}")
        self.model = YOLO(config.MODEL_PATH, task='detect')
        
        # Usar classes do modelo
        self.classes = list(self.model.names.values())
        print(f"DEBUG: Usando classes do modelo: {self.classes}")
        
        self.zones = []
        self.last_zone_update = 0
        self.camera_resolution = None
        self.frame_counter = 0

    def should_skip_frame(self):
        self.frame_counter += 1
        
        if self.state == EntryState.EMPTY:
            return self.frame_counter % 2 != 0
        elif self.state == EntryState.ANALYZING:
            return False
        elif self.state in [EntryState.APPROVED, EntryState.REJECTED]:
            return self.frame_counter % 2 != 0
        else:
            return False

    def detect_objects(self, frame):
        if self.should_skip_frame() and self.detection_cache:
            return self.detection_cache, self.counts_cache
        
        try:
            results = self.model.predict(
                frame,
                conf=0.1,
                iou=0.45,
                verbose=False,
                imgsz=640,
                device='cpu',
                half=False,
                augment=False,
                save=False
            )
            
            detections = []
            counts = defaultdict(int)
            
            if results and len(results) > 0:
                result = results[0]
                
                if result.boxes is not None and len(result.boxes.data) > 0:
                    if self.frame_counter % 50 == 0:
                        print(f"DEBUG: === PROCESSANDO {len(result.boxes.data)} DETECÇÕES ===")
                    
                    for i, box in enumerate(result.boxes):
                        xyxy = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0].cpu().numpy())
                        cls = int(box.cls[0].cpu().numpy())
                        
                        class_name = self.model.names[cls]
                        
                        detection = self._process_detection_balanced(
                            [xyxy[0], xyxy[1], xyxy[2], xyxy[3], conf, class_name], 
                            1.0, 0, 0, frame.shape
                        )
                        
                        if detection:
                            detections.append(detection)
                            if detection['in_zone']:
                                counts[detection['class_name']] += 1
                
                # DEBUG: Resumo final
                if self.frame_counter % 50 == 0:
                    print(f"DEBUG: FINAL: {len(detections)} detecções aprovadas, counts: {dict(counts)}")
            
            if self.state == EntryState.ANALYZING:
                self.detection_tracker.add_frame_detections(detections)
                if self.clean_analysis_frame is None:
                    self.clean_analysis_frame = frame.copy()
            
            self.detection_cache = detections
            self.counts_cache = dict(counts)
            
            return detections, counts
            
        except Exception as e:
            print(f"Erro deteccao: {e}")
            import traceback
            traceback.print_exc()
            return self.detection_cache, self.counts_cache

    def _process_detection_balanced(self, data, scale, pad_top, pad_left, frame_shape):
        try:
            x1, y1, x2, y2, conf, class_name = data
            
            # DEBUG: Log inicial
            if self.frame_counter % 50 == 0 and conf > 0.3:
                print(f"DEBUG: Processando {class_name} conf={conf:.3f} bbox=[{x1:.1f},{y1:.1f},{x2:.1f},{y2:.1f}]")
            
            # Filtro 1: Classe válida
            if class_name not in config.REQUIRED_EPIS and class_name != 'pessoa':
                if self.frame_counter % 50 == 0 and conf > 0.3:
                    print(f"DEBUG: REJEITADA - Classe inválida: {class_name}")
                return None
                
            # Filtro 2: Confiança mínima  
            min_conf = config.DETECTION_CONFIDENCE.get(class_name, 0.5)
            if conf < min_conf:
                if self.frame_counter % 50 == 0 and conf > 0.2:
                    print(f"DEBUG: REJEITADA - Confiança baixa: {conf:.3f} < {min_conf}")
                return None
            
            # Coordenadas
            x1 = max(0, min(int(x1), frame_shape[1] - 1))
            y1 = max(0, min(int(y1), frame_shape[0] - 1))
            x2 = max(0, min(int(x2), frame_shape[1] - 1))
            y2 = max(0, min(int(y2), frame_shape[0] - 1))
            
            # Filtro 3: Área válida
            area = (x2 - x1) * (y2 - y1)
            min_area = config.MIN_DETECTION_AREA.get(class_name, 0)
            max_area = config.MAX_DETECTION_AREA.get(class_name, 999999)
            
            if area < min_area or area > max_area:
                if self.frame_counter % 50 == 0 and conf > 0.3:
                    print(f"DEBUG: REJEITADA - Área inválida: {area} (min:{min_area} max:{max_area})")
                return None
            
            # Filtro 4: Proporções pessoa
            if class_name == 'pessoa':
                h, w = y2 - y1, x2 - x1
                if h <= 0 or w <= 0 or w/h > 2.8 or h < frame_shape[0] * 0.07:
                    if self.frame_counter % 50 == 0 and conf > 0.3:
                        print(f"DEBUG: REJEITADA - Proporção pessoa inválida: w/h={w/h:.2f} h={h} min_h={frame_shape[0] * 0.07:.1f}")
                    return None
            
            # Filtro 5: Posição óculos
            if class_name == 'oculos':
                center_y = (y1 + y2) / 2
                if center_y > frame_shape[0] * 0.65:
                    if self.frame_counter % 50 == 0 and conf > 0.3:
                        print(f"DEBUG: REJEITADA - Óculos muito baixo: center_y={center_y} > {frame_shape[0] * 0.65}")
                    return None
                    
            # Filtro 6: Posição bota
            elif class_name == 'bota':
                center_y = (y1 + y2) / 2
                if center_y < frame_shape[0] * 0.35:
                    if self.frame_counter % 50 == 0 and conf > 0.3:
                        print(f"DEBUG: REJEITADA - Bota muito alta: center_y={center_y} < {frame_shape[0] * 0.35}")
                    return None
            
            # APROVADA!
            detection = {
                'bbox': (x1, y1, x2, y2),
                'class_name': class_name,
                'confidence': float(conf),
                'in_zone': self._is_in_zone(x1, y1, x2, y2),
                'area': area
            }
            
            if self.frame_counter % 50 == 0 and conf > 0.3:
                print(f"DEBUG: APROVADA: {class_name} conf={conf:.3f} area={area} in_zone={detection['in_zone']}")
            
            return detection
            
        except Exception as e:
            print(f"DEBUG: Erro processar detecção: {e}")
            return None

    def _is_in_zone(self, x1, y1, x2, y2):
        if not self.zones: 
            return True
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        for zone in self.zones:
            if (zone['x'] <= cx <= zone['x'] + zone['width'] and 
                zone['y'] <= cy <= zone['y'] + zone['height']):
                return True
        return False

    def update_state(self, counts):
        person_detected = counts.get('pessoa', 0) > 0
        self.person_history.append(person_detected)
        
        if len(self.person_history) >= config.PERSON_FRAMES:
            stable = sum(list(self.person_history)[-config.PERSON_FRAMES:]) >= config.PERSON_FRAMES * 0.75
        else:
            stable = False
            
        if len(self.person_history) >= config.EXIT_FRAMES:
            exiting = sum(list(self.person_history)[-config.EXIT_FRAMES:]) <= config.EXIT_FRAMES * 0.25
        else:
            exiting = False
        
        duration = time.time() - self.state_time
        
        if self.state == EntryState.EMPTY:
            if stable:
                self._change_state(EntryState.ENTERING)
                
        elif self.state == EntryState.ENTERING:
            if not stable:
                self._change_state(EntryState.EMPTY)
            elif duration >= 1.5:
                self._change_state(EntryState.ANALYZING)
                self.detection_tracker.reset()
                self.clean_analysis_frame = None
                for epi in config.REQUIRED_EPIS:
                    self.epi_history[epi].clear()
                    
        elif self.state == EntryState.ANALYZING:
            if not stable:
                self._change_state(EntryState.EXITING)
            else:
                for epi in config.REQUIRED_EPIS:
                    self.epi_history[epi].append(counts.get(epi, 0) > 0)
                
                min_samples = min(len(h) for h in self.epi_history.values() if h)
                if min_samples >= config.EPI_FRAMES:
                    if self._all_epis_ok():
                        self._change_state(EntryState.APPROVED)
                    else:
                        self._change_state(EntryState.REJECTED)
                        self._send_alert()
                        
        elif self.state in [EntryState.APPROVED, EntryState.REJECTED]:
            if exiting:
                self._change_state(EntryState.EXITING)
                
        elif self.state == EntryState.EXITING:
            if not person_detected and len(self.person_history) >= config.EXIT_FRAMES:
                recent = list(self.person_history)[-config.EXIT_FRAMES:]
                if not any(recent):
                    self._change_state(EntryState.EMPTY)

    def _all_epis_ok(self):
        for epi, history in self.epi_history.items():
            if not history or sum(history) < len(history) * config.EPI_RATIO:
                return False
        return True

    def _change_state(self, new_state):
        if new_state != self.state:
            print(f"Estado: {self.state.value} → {new_state.value}")
            self.state = new_state
            self.state_time = time.time()

    def _send_alert(self):
        if time.time() - self.last_alert < 8:
            return
        
        missing = []
        for epi, history in self.epi_history.items():
            if not history or sum(history) < len(history) * config.EPI_RATIO:
                missing.append(epi)
        
        if missing:
            names = {'capacete': 'Capacete', 'bota': 'Bota', 'oculos': 'Óculos'}
            missing_names = [names.get(e, e) for e in missing]
            msg = f"ACESSO NEGADO\nFaltando: {', '.join(missing_names)}"
            
            Thread(target=self.telegram_manager.send, args=(msg,), daemon=True).start()
            Thread(target=self._send_clean_firebase_alert, 
                   args=(missing, msg), daemon=True).start()
            
            self.last_alert = time.time()

    def _create_clean_alert_image(self):
        if self.clean_analysis_frame is None:
            h, w = self.camera_resolution[1], self.camera_resolution[0]
            alert_frame = np.zeros((h, w, 3), dtype=np.uint8)
        else:
            alert_frame = self.clean_analysis_frame.copy()
        
        reliable_detections = self.detection_tracker.get_filtered_representative_detections()
        
        for detection in reliable_detections:
            x1, y1, x2, y2 = detection['bbox']
            class_name = detection['class_name']
            presence_rate = detection['presence_rate']
            
            color = config.CLASS_COLORS.get(class_name, (255, 255, 255))
            thickness = 2
            
            cv2.rectangle(alert_frame, (x1, y1), (x2, y2), color, thickness)
            
            label = f"{class_name.upper()}: {presence_rate:.0%}"
            font_scale = 0.6
            font_thickness = 2
            
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)[0]

            bg_padding = 4
            bg_x1 = x1
            bg_y1 = y1 - 28
            bg_x2 = x1 + label_size[0] + (bg_padding * 2)
            bg_y2 = y1 - 2
            
            cv2.rectangle(alert_frame, (bg_x1, bg_y1), (bg_x2, bg_y2), color, -1)
            
            text_x = x1 + bg_padding
            text_y = y1 - 8
            
            cv2.putText(alert_frame, label, (text_x, text_y), 
                       cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), font_thickness)
    
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
        cv2.putText(alert_frame, timestamp, (10, alert_frame.shape[0] - 15), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        return alert_frame

    def _send_clean_firebase_alert(self, missing_epis, message):
        try:
            clean_image = self._create_clean_alert_image()
            
            _, buffer = cv2.imencode('.jpg', clean_image, 
                                   [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            alert_data = {
                'mensagem': message,
                'epis_faltantes': missing_epis,
                'data_hora': datetime.now().isoformat(),
                'imagem_base64': img_base64
            }
            
            self.firebase_manager.save_alert(alert_data)
            print("Alerta limpo salvo no Firebase")
            
        except Exception as e:
            print(f"Erro ao enviar alerta: {e}")

    def draw_fixed_ui(self, frame, detections, counts):
        self._current_frame = frame.copy()
        
        display_frame = frame.copy()
        h, w = display_frame.shape[:2]
        
        state_color = config.COLORS.get(self.state, (255, 255, 255))
        
        for zone in self.zones:
            cv2.rectangle(display_frame, 
                        (zone['x'], zone['y']), 
                        (zone['x'] + zone['width'], zone['y'] + zone['height']), 
                        state_color, 3)
            
            overlay = display_frame.copy()
            cv2.rectangle(overlay, 
                        (zone['x'], zone['y']), 
                        (zone['x'] + zone['width'], zone['y'] + zone['height']), 
                        state_color, -1)
            cv2.addWeighted(overlay, 0.25, display_frame, 0.75, 0, display_frame)
        
        for det in detections:
            if not det['in_zone']:
                continue
                
            x1, y1, x2, y2 = det['bbox']
            class_name = det['class_name']
            conf = det['confidence']
            
            color = config.CLASS_COLORS.get(class_name, (255, 255, 255))
            thickness = max(2, int(conf * 3))
            
            cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, thickness)
            
            label = f"{class_name.upper()}: {conf:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            cv2.rectangle(display_frame, (x1, y1 - 20), 
                        (x1 + label_size[0] + 5, y1), color, -1)
            
            cv2.putText(display_frame, label, (x1 + 2, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        panel_w = 250
        panel_x = w - panel_w
        
        cv2.rectangle(display_frame, (panel_x, 0), (w, 180), (25, 25, 25), -1)
        
        y = 25
        cv2.putText(display_frame, "CONTROLE EPI", (panel_x + 10, y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        y += 35
        
        fps = self.fps_monitor.get_fps()
        cv2.putText(display_frame, f"FPS: {fps:.1f}", (panel_x + 10, y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        y += 25
        
        cv2.circle(display_frame, (panel_x + 15, y + 5), 6, state_color, -1)
        cv2.putText(display_frame, self.state.value, (panel_x + 30, y + 8), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, state_color, 1)
        y += 25
        
        for cls in ['pessoa', 'capacete', 'bota', 'oculos']:
            count = counts.get(cls, 0)
            color = config.CLASS_COLORS.get(cls, (255, 255, 255))
            
            cv2.circle(display_frame, (panel_x + 12, y - 2), 4, color, -1)
            cv2.putText(display_frame, f"{cls}: {count}", (panel_x + 25, y), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            y += 18
        
        return display_frame

    def update_zones(self):
        if time.time() - self.last_zone_update > 25:
            try:
                web_zones = self.firebase_manager.get_zones()
                if web_zones and self.camera_resolution:
                    scale_x = self.camera_resolution[0] / config.WEB_REFERENCE_RESOLUTION[0]
                    scale_y = self.camera_resolution[1] / config.WEB_REFERENCE_RESOLUTION[1]
                    
                    self.zones = []
                    for wz in web_zones:
                        zone = {
                            'nome': wz.get('nome', 'ENTRADA'),
                            'x': int(wz['x'] * scale_x),
                            'y': int(wz['y'] * scale_y),
                            'width': int(wz['width'] * scale_x),
                            'height': int(wz['height'] * scale_y)
                        }
                        self.zones.append(zone)
                    
                    if self.zones:
                        print(f"Zona configurada: {self.zones[0]['width']}x{self.zones[0]['height']}")
            except:
                pass
            self.last_zone_update = time.time()

    def run(self):
        print("Sistema de deteccao de EPI iniciado - Windows")
        
        camera = None
        try:
            camera = FixedWebcamStream(src=0)
            time.sleep(1.5)
            
            test_frame = camera.read()
            if test_frame is None:
                raise RuntimeError("Câmera indisponível")
            
            self.camera_resolution = (test_frame.shape[1], test_frame.shape[0])
            print(f"Sistema usando: {self.camera_resolution}")
            
        except Exception as e:
            print(f"Erro câmera: {e}")
            return

        cv2.namedWindow("Detector de EPI - Windows", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Detector de EPI - Windows", 800, 600)
        
        frame_count = 0
        start_time = time.time()

        try:
            while True:
                loop_start = time.time()
                
                frame = camera.read()
                if frame is None:
                    continue
                
                frame_count += 1
                
                if frame_count % 100 == 1:
                    self.update_zones()
                
                detections, counts = self.detect_objects(frame)
                self.update_state(counts)
                
                display_frame = self.draw_fixed_ui(frame, detections, counts)
                cv2.imshow("Detector de EPI - Windows", display_frame)
                
                frame_time = time.time() - loop_start
                self.fps_monitor.update(frame_time)
                
                if frame_count % 500 == 0:
                    fps = self.fps_monitor.get_fps()
                    uptime = (time.time() - start_time) / 60
                    print(f"FPS: {fps:.1f} | Estado: {self.state.value} | {uptime:.1f}min")
                
                key = cv2.waitKey(1) & 0xFF
                if key == 27 or cv2.getWindowProperty("Detector de EPI - Windows", cv2.WND_PROP_VISIBLE) < 1:
                    break
                elif key == ord('r'):
                    print("Reset")
                    self.state = EntryState.EMPTY
                    self.state_time = time.time()
                    self.person_history.clear()
                    self.detection_tracker.reset()
                    self.clean_analysis_frame = None
                    for epi in config.REQUIRED_EPIS:
                        self.epi_history[epi].clear()
                
        except KeyboardInterrupt:
            print("Parado")
        finally:
            print("Finalizando...")
            
            if frame_count > 0:
                total_time = time.time() - start_time
                avg_fps = frame_count / total_time
                print(f"FPS medio final: {avg_fps:.2f}")
            
            if camera:
                camera.stop()
            cv2.destroyAllWindows()

#FIREBASE E TELEGRAM
class CompatibleFirebaseManager:
    def __init__(self):
        self.db = None
        self.connected = False
        self._initialize()
    
    def _initialize(self):
        try:
            if not firebase_admin._apps:
                if not os.path.exists(config.FIREBASE_KEY_PATH):
                    print("Arquivo Firebase nao encontrado")
                    return
                    
                cred = credentials.Certificate(config.FIREBASE_KEY_PATH)
                firebase_admin.initialize_app(cred)
                
            self.db = firestore.client()
            self.connected = True
            print("Firebase conectado")
            
        except Exception as e:
            print(f"Erro Firebase: {e}")
            self.connected = False
    
    def is_connected(self):
        return self.connected and self.db is not None
    
    def get_zones(self):
        if not self.is_connected():
            return []
        try:
            doc = self.db.collection('configuracoes').document('zones').get()
            return doc.to_dict().get('zones', []) if doc.exists else []
        except Exception as e:
            print(f"Erro zonas: {e}")
            return []
    
    def save_alert(self, alert_data):
        if not self.is_connected():
            print("Firebase indisponvel - alerta nao salvo")
            return
            
        try:
            self.db.collection('alertas_epi').add(alert_data)
            print("Alerta salvo no Firebase")
            
        except Exception as e:
            print(f"Erro ao salvar alerta: {e}")

class FastTelegramManager:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = 5
        
    def send(self, message):
        if not config.TELEGRAM_TOKEN:
            return False
        try:
            url = f"https://api.telegram.org/bot{config.TELEGRAM_TOKEN}/sendMessage" 
            self.session.post(url, data={'chat_id': config.TELEGRAM_CHAT_ID, 'text': message})
            return True
        except:
            return False

#MAIN
def main():
    required_files = [config.MODEL_PATH, config.CLASSES_PATH]
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print(f"Arquivos nao encontrados: {missing_files}")
        print(f"Diretorio atual: {os.getcwd()}")
        return
    
    try:
        controller = CleanEPIController()
        controller.run()
    except Exception as e:
        print(f"Erro critico: {e}")

if __name__ == "__main__":
    main()
