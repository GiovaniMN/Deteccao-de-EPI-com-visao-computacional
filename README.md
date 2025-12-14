# Sistema de Monitoramento de EPIs com Raspberry Pi e YOLOv8 🚨📷

Este repositório contém o código fonte para um sistema de visão computacional em tempo real projetado para verificar o uso de Equipamentos de Proteção Individual (EPIs). O sistema é otimizado para rodar em **Raspberry Pi 4** com aceleração **Google Coral Edge TPU**, mas também inclui versões para execução em desktops (Windows/Linux) para fins de teste.

O sistema monitora a presença de pessoas e verifica se estão utilizando **Capacete**, **Botas** e **Óculos**. Em caso de inconformidade, alertas são enviados para o **Telegram** e registrados no **Firebase**.

## 📚 Documentação

A documentação detalhada foi organizada na pasta `docs/`:

- **[Configuração de Hardware](docs/HARDWARE_SETUP.md)**: Detalhes sobre Raspberry Pi e Coral Edge TPU.
- **[Configuração de Software](docs/SOFTWARE_SETUP.md)**: Instalação de dependências e ambiente Python.
- **[Configuração do Sistema](docs/CONFIGURATION.md)**: Como configurar chaves do Firebase, Bot do Telegram e caminhos de arquivos.
- **[Guia de Uso](docs/USAGE.md)**: Como rodar os scripts de detecção em produção e teste.

## 🚀 Começando Rapidamente

### 1. Clonar o Repositório
```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

### 2. Instalar Dependências
```bash
pip install -r requirements.txt
```

### 3. Configurar
Edite os arquivos de script ou siga o guia de **[Configuração](docs/CONFIGURATION.md)** para adicionar suas chaves do Firebase e Telegram.

### 4. Executar
**No Windows (Teste):**
```bash
python src/deteccao_win.py
```

**Na Raspberry Pi (Produção):**
```bash
python raspberry/coral_epi/detect_zona.py
```

## 📁 Estrutura do Projeto

*   **`raspberry/coral_epi/`**: Contém o código de produção para Raspberry Pi.
    *   `detect_zona.py`: Script principal com lógica de detecção, máquina de estados e integração com hardware/cloud.
*   **`src/`**: Scripts de desenvolvimento e teste.
    *   `deteccao_win.py`: Versão adaptada para rodar em Windows com webcam padrão e modelo PyTorch.
*   **`models/`**: Armazena os modelos YOLOv8 treinados (`.pt` e `.tflite`) e metadados.
*   **`sistema_de_monitoramento/`**: Interface web (Frontend) para visualização de dashboards e histórico.
*   **`docs/`**: Documentação detalhada do projeto.

## ✨ Funcionalidades

- **Detecção em Tempo Real:** Monitoramento contínuo usando YOLOv8.
- **Aceleração de Hardware:** Suporte a Google Coral Edge TPU para alta performance na borda.
- **Máquina de Estados Inteligente:** Lógica para filtrar falsos positivos e gerenciar o fluxo de entrada (Vazio -> Entrando -> Analisando -> Aprovado/Rejeitado -> Saindo).
- **Notificações:** Alertas imediatos via Telegram com detalhes dos EPIs faltantes.
- **Nuvem:** Integração com Firebase Firestore para log de eventos e imagens.
- **Zonas de Interesse:** Suporte a definição de zonas de detecção configuráveis remotamente via Firebase.

## 📄 Licença

Este projeto é licenciado sob a MIT License. Veja o arquivo [LICENSE](LICENSE) para detalhes.
