# Guia de Deploy (CI/CD com GitHub Actions)

Este documento explica como funciona o processo de deploy automatizado (CI/CD) do painel web para o Firebase Hosting usando GitHub Actions.

## 1. Visão Geral

O projeto está configurado para fazer o deploy automático de qualquer alteração enviada para a branch `main`. Isso significa que, ao fazer um `git push` para a `main`, o site será atualizado e publicado automaticamente, sem a necessidade de intervenção manual.

O processo é definido no arquivo `.github/workflows/firebase-deploy.yml`.

## 2. O Workflow do GitHub Actions

O workflow `firebase-deploy.yml` é acionado em dois cenários:
1.  **Push na branch `main`**: Qualquer commit enviado para a branch `main` iniciará o workflow.
2.  **Manualmente (`workflow_dispatch`)**: É possível acionar o deploy manualmente através da aba "Actions" no repositório do GitHub.

O workflow executa os seguintes passos:

### Passo 1: Checkout do Repositório
```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```
Este passo simplesmente baixa o código do seu repositório para o ambiente de execução do GitHub Actions.

### Passo 2: Criação Dinâmica do `firebaseConfig.js`
```yaml
- name: Create firebaseConfig.js
  run: |
    mkdir -p sistema_de_monitoramento/static/js
    echo "..." > sistema_de_monitoramento/static/js/firebaseConfig.js
```
Este é o passo mais importante do workflow. Ele cria o arquivo `sistema_de_monitoramento/static/js/firebaseConfig.js` do zero. O conteúdo deste arquivo é preenchido com as credenciais do seu projeto Firebase, que são extraídas dos **Secrets** do repositório.

Por exemplo, a linha `apiKey: '${{ secrets.FIREBASE_API_KEY }}'` pega o valor do secret `FIREBASE_API_KEY` e o insere no arquivo. Isso garante que suas chaves e credenciais nunca sejam expostas diretamente no código-fonte, o que é uma prática de segurança fundamental.

### Passo 3: Deploy para o Firebase Hosting
```yaml
- name: Deploy to Firebase
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    repoToken: '${{ secrets.GITHUB_TOKEN }}'
    firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_JUPITER_SUPERVISION }}'
    channelId: live
    projectId: jupiter-supervision
```
Este passo utiliza uma action pré-construída pela equipe do Firebase para fazer o deploy.
- `repoToken`: Token do GitHub para autenticação.
- `firebaseServiceAccount`: Uma chave de conta de serviço do Firebase (em formato JSON) que também deve ser armazenada como um secret. Isso autoriza o GitHub Actions a fazer o deploy em seu nome.
- `projectId`: O ID do seu projeto no Firebase.

## 3. Configuração Necessária

Para que o deploy automático funcione no seu próprio fork ou versão do projeto, você precisa configurar os seguintes **Secrets** no seu repositório do GitHub.

Vá para `Settings` > `Secrets and variables` > `Actions` e crie os seguintes secrets:

- `FIREBASE_API_KEY`: A chave de API do seu app web no Firebase.
- `FIREBASE_AUTH_DOMAIN`: O domínio de autenticação do seu projeto.
- `FIREBASE_PROJECT_ID`: O ID do seu projeto.
- `FIREBASE_STORAGE_BUCKET`: O bucket de armazenamento do seu projeto.
- `FIREBASE_MESSAGING_SENDER_ID`: O ID do remetente de mensagens.
- `FIREBASE_APP_ID`: O ID do seu app web.
- `FIREBASE_DATABASE_URL`: A URL do seu Realtime Database (se aplicável).
- `FIREBASE_SERVICE_ACCOUNT_JUPITER_SUPERVISION`: O conteúdo completo do arquivo JSON da sua conta de serviço do Firebase. Você pode gerar uma nova chave de conta de serviço no console do Firebase em "Configurações do projeto" > "Contas de serviço".

Com esses secrets configurados, o workflow de deploy funcionará automaticamente no seu repositório.
