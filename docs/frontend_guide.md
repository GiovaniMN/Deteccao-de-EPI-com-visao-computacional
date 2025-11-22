# Guia do Frontend (Painel Web)

Este documento detalha a estrutura e o funcionamento do painel web, que serve como interface de usuário para o sistema de monitoramento de EPIs. O painel é construído com HTML, Tailwind CSS e JavaScript puro (ES6 Modules) e se integra diretamente ao Firebase.

## 1. Estrutura de Arquivos

Todos os arquivos do frontend estão localizados no diretório `sistema_de_monitoramento/`. Este é o diretório que deve ser usado como "diretório público" ao configurar o Firebase Hosting.

- **HTML:**
  - `index.html`: A página de marketing/apresentação do projeto.
  - `login.html`: Página de autenticação de usuários.
  - `dashboard.html`: Painel principal com KPIs e gráficos de ocorrências.
  - `historico.html`: Tabela com o histórico detalhado de todas as ocorrências.
  - `usuarios.html`: Interface para gerenciamento de contas de usuário.
  - `configuracao.html`: Ferramenta para definir a zona de detecção.

- **JavaScript (`static/js/`):**
  - `firebaseConfig.js`: Script de configuração e inicialização do Firebase. **Importante:** Este arquivo é gerado dinamicamente durante o deploy pelo GitHub Actions.

  - `dashboard.js`: Carrega os dados para os gráficos e KPIs da página `dashboard.html`.
  - `carregarTabela.js`: Popula a tabela de ocorrências na página `historico.html`.
  - `carregarImagem.js`: Carrega a imagem de uma ocorrência específica (usado em conjunto com `historico.html`).
  - `userManagement.js`: Gerencia a criação e exclusão de usuários na página `usuarios.html`.
  - `zoneManagement.js`: Controla a lógica de desenho e salvamento da zona de detecção na página `configuracao.html`.

## 2. Funcionalidades das Páginas

### Login (`login.html`)

- Autentica os usuários comparando o email e a senha fornecidos com os dados armazenados na coleção `senha_login` no Firestore.
- **Não utiliza o serviço Firebase Authentication**, mas sim uma coleção customizada para validação.
- Em caso de sucesso, armazena os dados do usuário no `sessionStorage` e redireciona para o `dashboard.html`.

### Dashboard (`dashboard.html`)
- Utiliza o script `dashboard.js`.
- Exibe KPIs (Key Performance Indicators) como:
  - Total de ocorrências.
  - Dia da semana com mais ocorrências.
  - Principal tipo de infração.
- Renderiza dois gráficos usando **Chart.js**:
  - Um gráfico de barras com o número de ocorrências por dia da semana.
  - Um gráfico de rosca (doughnut) com a distribuição dos tipos de infração.
- Todos os dados são carregados da coleção `alertas_epi` no Firestore.

### Histórico de Ocorrências (`historico.html`)
- Utiliza os scripts `carregarTabela.js` e `carregarImagem.js`.
- Exibe uma tabela com todas as ocorrências da coleção `alertas_epi`.
- Permite a ordenação dos registros por data (mais recente ou mais antigo).
- Cada registro possui um botão "Ver Imagem" que abre um modal para exibir a imagem da ocorrência, que está armazenada como uma string `base64` no documento do Firestore.

### Gerenciamento de Usuários (`usuarios.html`)
- Utiliza o script `userManagement.js`.
- Permite a criação de novos usuários (email e senha), que são salvos na coleção `senha_login`.
- Lista todos os usuários cadastrados.
- Permite a exclusão de usuários, com uma verificação para impedir a exclusão do usuário administrador padrão (`adm`).

### Configuração da Zona (`configuracao.html`)
- Utiliza o script `zoneManagement.js`.
- Exibe uma imagem de referência estática.
- Permite que o usuário desenhe um retângulo sobre a imagem para definir a zona de monitoramento.
- As coordenadas da zona desenhada são salvas no documento `configuracoes/zones` no Firestore.
- **Importante:** O script de detecção na Raspberry Pi lê este documento do Firestore para saber em qual área da imagem da câmera ele deve focar a detecção.

## 3. Integração com Firebase

O frontend é totalmente dependente do Firebase para funcionar.

- **Firestore:** É o banco de dados principal.
  - `alertas_epi`: Coleção que armazena cada ocorrência de não conformidade detectada, incluindo a mensagem, data, hora e a imagem em formato base64.
  - `senha_login`: Coleção usada para autenticar os usuários do painel.
  - `configuracoes/zones`: Documento que armazena as coordenadas da zona de detecção.
- **Firebase Hosting:** Onde o site é hospedado. O deploy é automatizado via GitHub Actions.
