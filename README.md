# Sistema de Monitoramento de EPIs com Raspberry Pi e YOLOv8 🚨📷

Este projeto tem como objetivo detectar a presença ou ausência de Equipamentos de Proteção Individual (EPIs) — como **capacete**, **óculos de proteção** e **botas de segurança** — utilizando uma **Raspberry Pi 4**, **modelo YOLOv8** quantizado para Coral Edge TPU, e alertar via **Telegram** e **Firebase** quando um ou mais EPIs estiverem ausentes.

## 🎯 Funcionalidades

- 📦 Detecção em tempo real com YOLOv8 quantizado (TensorFlow Lite).
- 🧠 Integração com **Coral Edge TPU** para aceleração da inferência.
- 🔥 Integração com **Firebase Firestore** para registrar alertas e salvar imagens.
- 📲 Notificações instantâneas via **Telegram Bot** para usuários cadastrados.
- 🌐 Painel web (Firebase Hosting) para:
  - Configuração de parâmetros do sistema
  - Cadastro de usuários para notificações
  - Visualização de alertas

---

## 🛠️ Tecnologias e Ferramentas

- **Raspberry Pi 4** com Raspbian
- **YOLOv8n quantizado** (`.tflite`) com **Coral Edge TPU**
- **OpenCV + cvzone** para visualização e desenho dos resultados
- **Firebase Firestore** (armazenamento de alertas e configurações)
- **Firebase Hosting** (interface web de administração)
- **Telegram Bot** para envio de mensagens e imagens
- **Python 3.9+**
- **pyTelegramBotAPI** ou `requests` para envio via Telegram

---

# 📷 Exemplo de Detecção 

![Exemplo de Detecção](docs/exemplo-deteccao.jpg)

---

## 📁 Estrutura do Projeto

```bash
📦 projeto/
 ┣ 📁 modelos/
 ┃ ┗ 📄 yolov8n_full_integer_quant_edgetpu.tflite
 ┣ 📁 docs/
 ┃ ┗ 📄 exemplo-deteccao.jpg
 ┣ 📄 firebase_key.json
 ┣ 📄 classes.txt
 ┣ 📄 main.py
 ┣ 📄 README.md


