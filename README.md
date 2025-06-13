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

Este projeto utiliza as seguintes tecnologias principais:

-   **Hardware:**
    -   Raspberry Pi 4 (ou similar, para a borda)
    -   Webcam
    -   Coral Edge TPU (opcional, para aceleração de modelos `.tflite` quantizados)
-   **Software de Detecção:**
    -   Python 3.9+
    -   YOLOv8 (ultralytics)
    -   OpenCV (`opencv-python`)
    -   `cvzone` (para utilidades de desenho e processamento)
    -   `modelo_v1.pt` (modelo PyTorch YOLOv8 fornecido)
-   **Backend e Cloud:**
    -   Firebase Firestore (para banco de dados de alertas e configurações)
    -   Firebase Hosting (para a interface web)
    -   Firebase Admin SDK (`firebase-admin`) para Python (necessário se o backend Python interagir diretamente com o Firebase de forma administrativa)
-   **Notificações:**
    -   Telegram Bot API (via `pyTelegramBotAPI` ou `requests` em Python, se implementado)
-   **Interface Web:**
    -   HTML, CSS, JavaScript
    -   Firebase SDK para JavaScript (para interagir com Firebase no frontend)
-   **Ferramentas de Desenvolvimento:**
    -   Git & GitHub
    -   Visual Studio Code (ou outro editor de preferência)
    -   `virtualenv` (para ambientes Python isolados)
    -   Node.js & npm (para Firebase CLI e potenciais ferramentas de build de frontend)

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- pip (Python package installer)
- virtualenv (recomendado para criar ambientes isolados)

### 🐍 Backend Setup (Real-time Detection)

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
    ```
    *Substitua `https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git` pelo URL real do seu repositório.*

2.  **Navegue até o diretório do projeto:**
    ```bash
    cd SEU_REPOSITORIO
    ```
    *Substitua `SEU_REPOSITORIO` pelo nome real da pasta do projeto.*

3.  **Crie e ative um ambiente virtual (recomendado):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # No Windows: venv\Scripts\activate
    ```

4.  **Instale as dependências Python:**
    ```bash
    pip install opencv-python ultralytics
    ```
    *Nota: Para funcionalidades completas como notificações via Telegram ou interações diretas com Firebase Admin pelo backend Python (além do que `deteccao.py` já faz), outras bibliotecas podem ser necessárias. Por exemplo:*
    ```bash
    # Para interagir com a API do Telegram
    # pip install pyTelegramBotAPI
    # Para interagir com Firebase Admin SDK (se o backend Python precisar)
    # pip install firebase-admin
    ```
    *Consulte os scripts específicos para verificar as importações exatas necessárias para funcionalidades adicionais.*

### 🔥 Firebase Setup

Firebase é utilizado para o registro de alertas e armazenamento de imagens capturadas.

1.  **Crie um projeto no Firebase:**
    Acesse o [console do Firebase](https://console.firebase.google.com/) e crie um novo projeto.

2.  **Configure o Firestore:**
    No seu projeto Firebase, habilite e configure o Cloud Firestore. Este será o banco de dados NoSQL para armazenar os dados dos alertas.

3.  **Obtenha sua chave de serviço (`firebase_key.json`):**
    -   No console do Firebase, vá para "Configurações do projeto" (ícone de engrenagem).
    -   Selecione a aba "Contas de serviço".
    -   Clique em "Gerar nova chave privada" e confirme. Um arquivo JSON (`firebase_key.json`) será baixado.
    -   Salve este arquivo na raiz do diretório do seu projeto.

    **⚠️ Importante Nota de Segurança:**
    O arquivo `firebase_key.json` contém credenciais sensíveis que concedem acesso administrativo ao seu projeto Firebase. **NUNCA** o envie para o seu repositório Git público.
    -   Adicione `firebase_key.json` ao seu arquivo `.gitignore` imediatamente para evitar commits acidentais.
    -   Se você acidentalmente commitar esta chave, revogue-a imediatamente no console do Firebase e gere uma nova.
    ```
    # Exemplo de .gitignore
    venv/
    __pycache__/
    *.pyc
    firebase_key.json # ESSENCIAL!
    ```

### 📲 Telegram Bot Setup

Um Bot do Telegram pode ser usado para enviar notificações instantâneas (esta funcionalidade precisaria ser implementada no script `deteccao.py` ou em um script complementar).

1.  **Crie um novo Bot com BotFather:**
    -   Abra o Telegram, procure por "BotFather" e inicie uma conversa.
    -   Use o comando `/newbot` para criar um novo bot. Siga as instruções.
    -   O BotFather fornecerá um **Token de Acesso HTTP API**. Guarde este token com segurança, ele é a "senha" do seu bot.

2.  **Obtenha o Chat ID (se aplicável):**
    Para o bot enviar mensagens para você ou um grupo, você precisará do `Chat ID` correspondente.
    -   Para mensagens diretas: Envie uma mensagem para o seu bot e use a API do Telegram (com seu token) para consultar o endpoint `getUpdates`. O `Chat ID` estará na resposta.
    -   Para grupos: Adicione o bot ao grupo. Envie uma mensagem no grupo. Consulte `getUpdates`.

3.  **Configure o Token (e Chat ID) no seu script:**
    O token (e o Chat ID) precisariam ser configurados no script Python responsável pelo envio das mensagens. É altamente recomendável usar variáveis de ambiente ou um arquivo de configuração não versionado (adicionado ao `.gitignore`) para armazenar essas informações sensíveis, em vez de codificá-las diretamente no script.
    ```python
    # Exemplo em Python (requer biblioteca como python-telegram-bot ou requests)
    # BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    # CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
    #
    # def enviar_alerta_telegram(mensagem):
    #     # Lógica para enviar mensagem usando o BOT_TOKEN e CHAT_ID
    #     pass
    ```

---

## 💻 Usage

### Running the Real-time Detection

O script `deteccao.py` é o coração do sistema de detecção de EPIs em tempo real.

1.  **Certifique-se de que uma webcam esteja conectada** ao sistema onde o script será executado.
2.  **Ative seu ambiente virtual** (se você criou um):
    ```bash
    source venv/bin/activate  # No Windows: venv\Scripts\activate
    ```
3.  **Execute o script** a partir do diretório raiz do projeto:
    ```bash
    python deteccao.py
    ```
4.  **Observações sobre a execução:**
    -   **Modelo Utilizado:** O script utiliza o modelo `modelo_v1.pt`. Atualmente, o caminho para este modelo está definido de forma fixa (hardcoded) no código:
        ```python
        model_path = "/home/tcc-epi/Desktop/epi_yolo/modelo_v1.pt"
        ```
        **Recomendação:** Para maior portabilidade, considere mover `modelo_v1.pt` para a raiz do projeto e alterar o `model_path` no script para `model_path = "modelo_v1.pt"`. Se o modelo for grande, use Git LFS ou armazene-o externamente. Se o caminho absoluto for mantido, outros usuários precisarão obrigatoriamente alterá-lo.
    -   **Fonte de Vídeo:** A fonte de vídeo é definida como `0` (webcam padrão). Se você tiver múltiplas câmeras ou quiser usar um arquivo de vídeo, precisará alterar a variável `video_source` no script.
    -   Uma janela do OpenCV aparecerá mostrando o feed da webcam com as detecções.
    -   Para **parar o script**, pressione a tecla 'q' com a janela do OpenCV em foco.

### Configuration Notes (Hardcoded values)

Atualmente, algumas configurações importantes no script `deteccao.py` são definidas diretamente no código (hardcoded):

-   **Caminho do Modelo (`model_path`):**
    ```python
    # Linha relevante em deteccao.py
    model_path = "/home/tcc-epi/Desktop/epi_yolo/modelo_v1.pt"
    ```
-   **Fonte de Vídeo (`video_source`):**
    ```python
    # Linha relevante em deteccao.py
    video_source = 0  # Geralmente a webcam padrão
    ```

Para maior flexibilidade, considere modificar o script `deteccao.py` para:
-   Aceitar esses valores como argumentos de linha de comando (usando `argparse`, por exemplo).
-   Ler esses valores de um arquivo de configuração (como `.env`, `config.ini` ou `config.json`).

Isso facilitará a execução do script em diferentes ambientes ou com diferentes configurações sem a necessidade de alterar o código diretamente.

---

## 🌐 Web Interface (Sistema de Monitoramento)

O projeto inclui uma interface web localizada na pasta `sistema_de_monitoramento/`. Esta interface serve como um painel para visualizar alertas, gerenciar usuários e, potencialmente, configurar parâmetros do sistema.

### Features

    Com base nos nomes dos arquivos HTML e JavaScript na pasta `sistema_de_monitoramento/`, a interface web parece oferecer as seguintes funcionalidades (o conteúdo exato e a funcionalidade dependem da implementação interna desses arquivos):

-   **Autenticação:**
    -   `login.html`: Página para login de usuários.
    -   `back.js`: Potencialmente lógica de backend ou helpers para o login/autenticação Firebase.
-   **Visualização de Dados:**
    -   `dashboard.html`: Painel principal após o login, possivelmente para exibir dados de detecção em tempo real ou resumos.
    -   `historico.html`: Para visualizar o histórico de alertas ou eventos de detecção.
    -   `carregarTabela.js`: Script para carregar dados em tabelas (provavelmente no `historico.html`).
    -   `carregarImagem.js`: Script para carregar e exibir imagens (provavelmente associadas aos alertas no histórico).
-   **Gerenciamento:**
    -   `usuarios.html`: Página para gerenciamento de usuários (cadastro, permissões, etc.).
    -   `userManagement.js`: Lógica para as operações de gerenciamento de usuários.
-   **Navegação/Estrutura:**
    -   `home.html`: Página inicial ou de boas-vindas.
-   **Configuração Firebase:**
    -   `firebaseConfig.js`: Arquivo crucial para configurar a conexão do frontend com o seu projeto Firebase.

### Deployment

A interface web foi projetada para ser hospedada utilizando o **Firebase Hosting**. Siga os passos abaixo para realizar o deploy:

1.  **Instale o Firebase CLI:**
    Se ainda não o tiver, instale a interface de linha de comando do Firebase globalmente via npm:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Faça login no Firebase:**
    Autentique-se na sua conta Firebase:
    ```bash
    firebase login
    ```

3.  **Configure o Firebase para o seu projeto:**
    Navegue até o diretório raiz do seu projeto clonado e inicie a configuração do Firebase:
    ```bash
    firebase init hosting
    ```
    Siga as instruções:
    -   Selecione "Use an existing project" e escolha o projeto Firebase que você criou anteriormente.
    -   Especifique `sistema_de_monitoramento` como o diretório público (public directory).
    -   Responda "N" (Não) para a pergunta sobre configurar como um single-page app, a menos que a estrutura dos arquivos `html` e `js` seja especificamente para isso. Com múltiplos arquivos HTML, o padrão é "N".

4.  **Configure o `firebaseConfig.js`:**
    O arquivo `sistema_de_monitoramento/firebaseConfig.js` contém a configuração para conectar a interface web ao seu projeto Firebase. Você precisará preenchê-lo com os detalhes específicos do seu projeto Firebase. Geralmente, você pode obter esses detalhes na seção "Configurações do Projeto" > "Geral" > "Seus apps" > "Configuração do SDK" no console do Firebase.

    **Importante:** O arquivo `sistema_de_monitoramento/firebaseConfig.js` **DEVE** ser configurado com os detalhes específicos do seu projeto Firebase para que a interface web possa se conectar aos seus serviços Firebase (Authentication, Firestore, etc.).

    Você pode obter os valores para `firebaseConfig` no Console do Firebase:
    - Vá para "Configurações do Projeto" (ícone de engrenagem).
    - Na aba "Geral", role para baixo até "Seus apps".
    - Se você ainda não tiver um app da Web, crie um.
    - Em "Configuração do SDK", selecione "Config" para ver o objeto `firebaseConfig`.

    Copie e cole esses valores no seu arquivo `sistema_de_monitoramento/firebaseConfig.js`. Exemplo:
    ```javascript
    // sistema_de_monitoramento/firebaseConfig.js
    const firebaseConfig = {
      apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXX", // Substitua pelo seu valor
      authDomain: "seu-projeto-id.firebaseapp.com", // Substitua pelo seu valor
      projectId: "seu-projeto-id", // Substitua pelo seu valor
      storageBucket: "seu-projeto-id.appspot.com", // Substitua pelo seu valor
      messagingSenderId: "123456789012", // Substitua pelo seu valor
      appId: "1:123456789012:web:XXXXXXXXXXXXXXXXXXXXXX" // Substitua pelo seu valor
    };

    // Initialize Firebase
    // Certifique-se de que o SDK do Firebase está carregado antes desta linha,
    // geralmente através de um <script> tag no seu HTML.
    firebase.initializeApp(firebaseConfig);
    // Se estiver usando módulos ES6 (import/export), a inicialização pode variar.
    ```

5.  **Faça o deploy da interface:**
    Após a configuração do `firebaseConfig.js` e do Firebase Hosting, envie os arquivos:
    ```bash
    firebase deploy --only hosting
    ```
    Após o deploy, o Firebase CLI fornecerá a URL pública onde sua interface web estará acessível (e.g., `https://seu-projeto-id.web.app`).

---

## 🤝 Contributing

Contribuições são muito bem-vindas! Se você tem sugestões para melhorias, novas funcionalidades ou correção de bugs, sinta-se à vontade para contribuir com o projeto.

### Como Contribuir

1.  **Faça um Fork do Repositório:**
    Clique no botão "Fork" no canto superior direito da página do repositório no GitHub.

2.  **Clone o seu Fork:**
    ```bash
    git clone https://github.com/SEU_USUARIO/NOME_DO_SEU_FORK.git
    cd NOME_DO_SEU_FORK
    ```

3.  **Crie uma Nova Branch:**
    Crie uma branch para sua feature ou correção. Use um nome descritivo.
    ```bash
    # Para uma nova funcionalidade
    git checkout -b feature/sua-nova-feature
    # Para uma correção de bug
    git checkout -b fix/corrige-bug-especifico
    ```

4.  **Faça suas Alterações:**
    Implemente sua funcionalidade ou corrija o bug. Certifique-se de que seu código segue o estilo do projeto (se houver um guia) e as boas práticas gerais de desenvolvimento.

5.  **Teste suas Alterações:**
    Garanta que suas mudanças não quebram nenhuma funcionalidade existente e que sua nova funcionalidade opera como esperado.

6.  **Faça o Commit das suas Alterações:**
    Use mensagens de commit claras e descritivas.
    ```bash
    git add .
    git commit -m "feat: Adiciona nova funcionalidade X"
    # ou "fix: Corrige bug Y na funcionalidade Z"
    ```

7.  **Envie suas Alterações para o seu Fork:**
    ```bash
    git push origin feature/sua-nova-feature
    ```

8.  **Crie um Pull Request (PR):**
    Vá para a página do repositório original no GitHub e você verá uma sugestão para criar um Pull Request a partir da sua branch recém-enviada. Clique nela.
    -   Certifique-se de que o PR é direcionado para a branch principal do repositório original (geralmente `main` ou `master`).
    -   Descreva claramente as alterações que você fez no PR. Inclua o motivo da alteração e qualquer informação relevante que possa ajudar os mantenedores a entender e revisar seu código.

### Discussão

Para mudanças significativas, como a adição de uma funcionalidade complexa ou uma refatoração importante, é uma boa prática **abrir uma Issue primeiro** para discutir a proposta antes de começar o desenvolvimento. Isso pode economizar tempo e garantir que sua contribuição esteja alinhada com os objetivos do projeto.

---

## 📁 Estrutura do Projeto

A estrutura de arquivos do projeto é a seguinte:

```
.
├── README.md                   # Este arquivo de documentação
├── deteccao.py                 # Script principal para detecção de EPIs em tempo real
├── modelo_v1.pt                # Modelo pré-treinado YOLOv8 para detecção de EPIs
├── LICENSE                     # Arquivo de licença do projeto (MIT)
└── sistema_de_monitoramento/   # Diretório contendo a interface web
    ├── back.js
    ├── carregarImagem.js
    ├── carregarTabela.js
    ├── dashboard.html
    ├── firebaseConfig.js       # Configuração do Firebase para o frontend (IMPORTANTE: precisa ser preenchido)
    ├── historico.html
    ├── home.html
    ├── login.html
    ├── userManagement.js
    └── usuarios.html
```

**Descrições:**

-   `README.md`: Documentação principal do projeto.
-   `deteccao.py`: Script Python que utiliza OpenCV e YOLOv8 para realizar a detecção de EPIs a partir de uma fonte de vídeo (webcam).
-   `modelo_v1.pt`: Arquivo contendo os pesos do modelo YOLOv8 treinado para identificar os EPIs especificados. (Recomenda-se verificar se este arquivo deve estar no Git LFS se for muito grande).
-   `LICENSE`: Contém a licença MIT sob a qual o projeto é distribuído.
-   `sistema_de_monitoramento/`: Pasta com todos os arquivos estáticos (HTML, JS, CSS - se houver) para a interface web de monitoramento, projetada para ser hospedada no Firebase Hosting.
    -   `firebaseConfig.js`: Crucial para conectar o frontend ao seu projeto Firebase. **Requer configuração manual com suas chaves Firebase.**

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


