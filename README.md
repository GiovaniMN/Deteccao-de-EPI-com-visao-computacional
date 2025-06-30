# Sistema de Monitoramento de EPIs com Raspberry Pi e YOLOv8 🚨📷

Este projeto tem como objetivo detectar a presença ou ausência de Equipamentos de Proteção Individual (EPIs) — como **capacete**, **óculos de proteção** e **botas de segurança** — utilizando uma **Raspberry Pi 4**, **modelo YOLOv8** quantizado para Coral Edge TPU, e alertar via **Telegram** e **Firebase** quando um ou mais EPIs estiverem ausentes.

## 🎯 Funcionalidades

- 📦 Detecção em tempo real com YOLOv8 quantizado (TensorFlow Lite) ou modelo PyTorch.
- 🧠 Integração com **Coral Edge TPU** para aceleração da inferência (com modelo `.tflite`).
- 🔥 Integração com **Firebase Firestore** para registrar alertas e salvar imagens.
- 📲 Notificações instantâneas via **Telegram Bot**.
- 🌐 Painel web (Firebase Hosting) para:
  - Autenticação de usuários.
  - Visualização de histórico de ocorrências com imagens.
  - Cadastro de novos usuários para o painel.
  - Dashboard com visão geral (atualmente com dados estáticos, necessita integração).

---

## 🛠️ Tecnologias e Ferramentas

-   **Hardware:**
    -   Raspberry Pi 4 (ou similar, para a borda)
    -   Webcam
    -   Coral Edge TPU (opcional, para aceleração de modelos `.tflite` quantizados)
-   **Software de Detecção (Python):**
    -   Python 3.9+
    -   YOLOv8 (`ultralytics`)
    -   OpenCV (`opencv-python`)
    -   `cvzone`
    -   `firebase-admin`
    -   `requests` (para API do Telegram)
-   **Interface Web (Frontend):**
    -   HTML, CSS (Tailwind CSS)
    -   JavaScript (Vanilla JS, ES6 Modules)
    -   Firebase SDK para JavaScript (Auth, Firestore)
-   **Backend e Cloud:**
    -   Firebase Firestore (banco de dados)
    -   Firebase Hosting (hospedagem da interface web)
    -   Firebase Authentication (autenticação de usuários do painel)
-   **Notificações:**
    -   Telegram Bot API
-   **Ferramentas de Desenvolvimento:**
    -   Git & GitHub
    -   Visual Studio Code (ou outro editor)
    -   `virtualenv`
    -   Node.js & npm (para Firebase CLI)

---

## 📁 Estrutura do Projeto

```
.
├── config/
│   ├── firebase_key.example.json     # Template para credenciais do Firebase Admin SDK (backend)
│   └── firebaseConfig.example.js   # Template para configuração do Firebase SDK (frontend)
├── models/
│   ├── yolov8n.pt                    # Modelo YOLOv8 Pytorch
│   ├── yolov8n_full_integer_quant_edgetpu.tflite # Modelo TFLite para Edge TPU
│   └── classes.txt                   # Lista de classes para os modelos
├── src/
│   └── deteccao.py.example           # Script principal de detecção (renomear para deteccao.py)
├── sistema_de_monitoramento/
│   ├── static/
│   │   ├── js/
│   │   │   ├── back.js               # Lógica de login
│   │   │   ├── carregarImagem.js     # Lógica para carregar imagens no modal
│   │   │   ├── carregarTabela.js     # Lógica para carregar tabela de histórico
│   │   │   └── userManagement.js     # Lógica de gerenciamento de usuários
│   │   └── css/                      # (Vazio, Tailwind CSS é usado via CDN)
│   │   └── img/                      # (Vazio, imagens usadas são via CDN ou embutidas)
│   ├── dashboard.html
│   ├── historico.html
│   ├── home.html
│   ├── login.html
│   └── usuarios.html
├── .gitignore
├── LICENSE
└── README.md                       # Este arquivo
```

---

## 🚀 Configuração e Execução

### 1. Pré-requisitos

- Python 3.9+ e pip
- Node.js e npm (para Firebase CLI)
- Conta no Firebase
- Bot no Telegram

### 2. Clone o Repositório

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

### 3. Configuração do Ambiente Python (Backend de Detecção)

1.  **Crie e ative um ambiente virtual:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # No Windows: venv\Scripts\activate
    ```

2.  **Instale as dependências Python:**
    ```bash
    pip install ultralytics opencv-python cvzone firebase-admin requests pandas
    ```

3.  **Configure o Script de Detecção:**
    -   Renomeie `src/deteccao.py.example` para `src/deteccao.py`.
    -   Edite `src/deteccao.py` e atualize os seguintes placeholders:
        -   `TELEGRAM_TOKEN`: Seu token do Bot do Telegram.
        -   `TELEGRAM_CHAT_ID`: O Chat ID para onde as notificações serão enviadas.
        -   Caminho para `firebase_key.json`: Mude de `/caminho/para/seu/firebase_key.json` para `config/firebase_key.json`.
        -   Caminho para o modelo YOLO: Mude de `/caminho/para/seu/modelo/...` para `models/NOMEDOMODELO` (ex: `models/yolov8n_full_integer_quant_edgetpu.tflite` ou `models/yolov8n.pt`).
        -   Caminho para `classes.txt`: Mude de `/caminho/para/seu/modelo/classes.txt` para `models/classes.txt`.

### 4. Configuração do Firebase

1.  **Crie um projeto no Firebase:** Acesse o [console do Firebase](https://console.firebase.google.com/).
2.  **Configure os seguintes serviços:**
    *   **Firestore:** Crie um banco de dados NoSQL.
    *   **Authentication:** Habilite o método de login "E-mail/Senha". (O sistema atual usa uma coleção `users` no Firestore para autenticação, não o Firebase Auth diretamente para o login inicial. O Firebase Auth pode ser usado para gerenciamento de usuários do *painel* se implementado.)
    *   **Hosting:** Para deploy da interface web.

3.  **Chave de Serviço para o Backend (`firebase_key.json`):**
    -   No console do Firebase: "Configurações do projeto" > "Contas de serviço".
    -   Clique em "Gerar nova chave privada" e baixe o arquivo JSON.
    -   Renomeie este arquivo para `firebase_key.json` e salve-o na pasta `config/`.
    -   **IMPORTANTE:** Adicione `config/firebase_key.json` ao seu `.gitignore` se ele não estiver lá, para não commitar suas credenciais. O template `config/firebase_key.example.json` já está no repositório como exemplo.

4.  **Configuração do Firebase para o Frontend (`firebaseConfig.js`):**
    -   Renomeie `config/firebaseConfig.example.js` para `config/firebaseConfig.js`.
    -   No console do Firebase: "Configurações do projeto" > "Geral".
    -   Em "Seus apps", crie um app da Web se ainda não tiver um.
    -   Copie o objeto de configuração do SDK do Firebase (o `const firebaseConfig = {...};`).
    -   Cole este objeto dentro de `config/firebaseConfig.js`, substituindo o conteúdo do template.
    -   **IMPORTANTE:** Adicione `config/firebaseConfig.js` ao seu `.gitignore` se ele não estiver lá. O template `config/firebaseConfig.example.js` já está no repositório.

### 5. Configuração do Bot do Telegram

1.  **Crie um Bot com o BotFather:**
    -   No Telegram, converse com o `BotFather`.
    -   Use `/newbot` para criar seu bot.
    -   Guarde o **Token de Acesso HTTP API** fornecido.
2.  **Obtenha o Chat ID:**
    -   Para enviar mensagens para você mesmo: Envie `/start` para seu bot e depois acesse `https://api.telegram.org/botSEU_TOKEN/getUpdates`. Seu chat ID estará em `result[0].message.chat.id`.
    -   Para um grupo: Adicione o bot ao grupo. Envie uma mensagem no grupo. Acesse a URL acima; o chat ID será um número negativo.
3.  **Atualize `src/deteccao.py`** com seu Token e Chat ID.

### 6. Executando o Sistema de Detecção

1.  **Certifique-se de que uma webcam esteja conectada.**
2.  **Ative o ambiente virtual:**
    ```bash
    source venv/bin/activate
    ```
3.  **Execute o script a partir do diretório raiz do projeto:**
    ```bash
    python src/deteccao.py
    ```
    -   Uma janela do OpenCV mostrará o feed da webcam com as detecções.
    -   Pressione 'ESC' (ou 'q' dependendo da configuração no script) para parar.

### 7. Deploy da Interface Web no Firebase Hosting

1.  **Instale o Firebase CLI:**
    ```bash
    npm install -g firebase-tools
    ```
2.  **Faça login no Firebase:**
    ```bash
    firebase login
    ```
3.  **Inicialize o Firebase Hosting no seu projeto:**
    Navegue até o diretório raiz do seu projeto clonado e execute:
    ```bash
    firebase init hosting
    ```
    Siga as instruções:
    -   Selecione "Use an existing project" e escolha seu projeto Firebase.
    -   Especifique `sistema_de_monitoramento` como o diretório público (public directory).
    -   Responda "N" (Não) para configurar como um single-page app.

4.  **Faça o deploy:**
    ```bash
    firebase deploy --only hosting
    ```
    O Firebase CLI fornecerá a URL pública da sua interface web.

    **Observação sobre `firebaseConfig.js` no Hosting:**
    Para que a interface web funcione após o deploy no Firebase Hosting:
    1.  Após preencher `config/firebaseConfig.js` com suas credenciais, **copie este arquivo** para a pasta `sistema_de_monitoramento/` (ou seja, `sistema_de_monitoramento/firebaseConfig.js`).
    2.  Os arquivos HTML (`historico.html`, `usuarios.html`) já estão configurados para carregar `<script type="module" src="firebaseConfig.js"></script>`.
    3.  Os scripts JavaScript em `sistema_de_monitoramento/static/js/` (como `back.js`, `carregarTabela.js`) estão configurados para importar de `../firebaseConfig.js`, o que é correto se `firebaseConfig.js` estiver na raiz de `sistema_de_monitoramento/`.

    Esta abordagem garante que o arquivo `firebaseConfig.js` com suas credenciais não seja commitado (pois `config/firebaseConfig.js` está no `.gitignore`), mas esteja presente no diretório público (`sistema_de_monitoramento`) no momento do deploy.

    Alternativamente, para uma configuração mais robusta e ideal com Firebase Hosting, considere usar a [inicialização automática do Firebase SDK](https://firebase.google.com/docs/hosting/reserved-urls#sdk_auto-configuration) (`/__/firebase/init.js`), o que eliminaria a necessidade de gerenciar o arquivo `firebaseConfig.js` manualmente para o deploy.

---

## 🤝 Contribuições

Contribuições são bem-vindas! Siga o processo padrão de Fork, Branch, Commit e Pull Request. Para mudanças maiores, abra uma Issue primeiro para discussão.

---

## 📜 Licença

Este projeto é licenciado sob a MIT License. Veja o arquivo [LICENSE](LICENSE) para detalhes.
