import cv2
from ultralytics import YOLO

#Configuracoes iniciais
model_path = "/home/tcc-epi/Desktop/epi_yolo/modelo_v1.pt"  #Caminho do modelo
video_source = 0  #0 para webcam USB

#Carrega o modelo customizado
model = YOLO(model_path)

# Configurar a webcam
cap = cv2.VideoCapture(video_source)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Verificar se a camera esta aberta
if not cap.isOpened():
    print("Erro ao acessar a camera!")
    exit()

try:
    while True:
        #Captura frame
        ret, frame = cap.read()
        if not ret:
            break

        #Executa inferencia
        results = model.predict(source=frame, imgsz=320, conf=0.5)

        #Mostrar resultados
        annotated_frame = results[0].plot()
        cv2.imshow('YOLOv8 Customizado', annotated_frame)

        #'q' para sair
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()
