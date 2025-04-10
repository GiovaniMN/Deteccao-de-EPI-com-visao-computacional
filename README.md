# **Detecção de EPI´s com com YOLO aplicado na Raspberry Pi 4**

## PASSO A PASSO DE CONFIGURAÇÃO NA RASPBERRY:

### comandos no terminal:

### VERIFICA E ATUALIZA A RASPBERRY PI
sudo apt update && sudo apt upgrade -y

### CRIA UM AMBIENTE VIRTUAL PARA INSTALAR AS BIBLIOTECAS E EVITAR CONFLITOS
python3 -m venv --system-site-packages venv

### ATIVA O AMBIENTE VIRTUAL
source venv/bin/activate

### INSTALA A BIBLIOTECA ULTRALYTICS COM A EXTENSÃO NCNN
pip install ultralytics ncnn

### APÓS CONECTAR A WEBCAM RODAR O CÓDIGO PARA VER SE ELE FOI RECONHECIDA NO SISTEMA
ls /dev/video*

### EXPORTAR O MODELO CUSTOMIZADO DO YOLO DO FORMATO PYTORCH PARA NCNN QUE É MAIS LEVE PARA A RASPBERRY PI
yolo export model=modelo_v1.pt format=ncnn

**Deu erro. Pra arrumar:**

pip install ultralytics==8.3.70 torch==2.5.0 torchvision==0.20

**rodar denovo:**

yolo export model=modelo_v1.pt format=ncnn

wget https://ejtech.io/code/yolo_detect.py

python yolol_detect.py --model=modelo_v1_ncnn_model --source=usb0 --resolution=1280x720
