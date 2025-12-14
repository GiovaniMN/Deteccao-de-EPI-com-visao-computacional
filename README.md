# Sistema de Monitoramento de EPIs com Visão Computacional 🛡️👁️

> **Nota:** Este README é uma demonstração do projeto. Para guias de instalação, configuração e execução, consulte a **[Documentação Técnica](docs/USAGE.md)**.

Este projeto apresenta uma solução completa de **IoT e Inteligência Artificial** para a segurança no trabalho, capaz de monitorar automaticamente o uso de Equipamentos de Proteção Individual (EPIs) em tempo real. Desenvolvido para rodar na borda (Edge AI) com **Raspberry Pi 4** e **Google Coral Edge TPU**, o sistema garante alta performance e baixa latência, integrando-se à nuvem para gestão e alertas.

---

## 🎯 O Problema e a Solução

A fiscalização manual de EPIs é sujeita a falhas humanas e não pode estar presente em todos os lugares o tempo todo. Nosso sistema automatiza esse processo usando a infraestrutura de câmeras existente ou pontos de verificação dedicados.

### Arquitetura do Sistema
O sistema opera em um fluxo contínuo de detecção, análise e notificação:

1.  **Captura & Processamento na Borda:** Uma Raspberry Pi 4, acelerada por um Coral USB, processa o vídeo localmente usando um modelo **YOLOv8n (nano)** otimizado.
2.  **Lógica de Estado:** Uma máquina de estados filtra ruídos e monitora o ciclo de entrada do colaborador: `Entrando` ➔ `Analisando` ➔ `Aprovado/Rejeitado`.
3.  **Nuvem & Alertas:**
    *   **Firebase Firestore:** Armazena logs de acesso e links para imagens de evidência.
    *   **Telegram Bot:** Envia alertas instantâneos com foto para os supervisores em caso de infração.
    *   **Dashboard Web:** Interface para gestão, visualização de histórico e configuração de zonas de detecção.

---

## 🚀 Performance e Resultados

O modelo foi treinado e validado com um dataset personalizado, alcançando métricas expressivas que viabilizam o uso em ambientes reais.

### Métricas de Detecção (YOLOv8n)

| Métrica Global | Valor |
| :--- | :--- |
| **mAP@0.5** | **93.9%** |
| **Precisão (P)** | **94.7%** |
| **Revocação (R)** | **87.3%** |

**Desempenho por Classe:**

| Classe | Precisão | Análise |
| :--- | :--- | :--- |
| 👤 **Pessoa** | **97.4%** | Alta confiabilidade na detecção de presença humana. |
| ⛑️ **Capacete** | **96.9%** | Excelente distinção, fundamental para segurança em obras. |
| 👓 **Óculos** | **94.7%** | Detecção robusta mesmo sendo objetos pequenos. |
| 🥾 **Bota** | **89.7%** | Bom desempenho, com oportunidades de melhoria via dataset. |

### Visualizações do Modelo
<div align="center">
  <img src="models/yolov8n_pt/confusion_matrix_normalized.png" alt="Matriz de Confusão" width="45%">
  <img src="models/yolov8n_pt/results.png" alt="Gráficos de Treinamento" width="45%">
</div>
<br>

### Benchmark de Hardware (FPS)

A utilização do acelerador **Google Coral Edge TPU** provou-se essencial para a viabilidade do projeto em hardware embarcado.

| Hardware | FPS Médio | Status |
| :--- | :---: | :--- |
| **PC (i5-13500 + Windows)** | **30 FPS** | Ideal para testes e servidores centrais. |
| **Raspberry Pi 4 + Coral TPU** | **7 - 15 FPS** | **Produção.** Fluido e responsivo em tempo real. |
| Raspberry Pi 4 (CPU pura) | < 1 FPS | Inviável para monitoramento em tempo real. |

---

## 🧠 Inteligência do Sistema

O software não apenas detecta objetos, mas entende o contexto através de uma **Máquina de Estados Finitos**:

1.  **VAZIO:** Monitoramento passivo (economia de recursos).
2.  **ENTRANDO:** Detecta uma pessoa se aproximando de forma estável.
3.  **ANALISANDO:** Coleta amostras por `N` frames (buffer temporal) para garantir que a detecção não é um falso positivo momentâneo.
4.  **DECISÃO (APROVADO/REJEITADO):**
    *   ✅ **Aprovado:** Todos os EPIs (Capacete, Óculos, Bota) detectados na proporção exigida.
    *   ❌ **Rejeitado:** Alerta visual na tela, envio de notificação ao Telegram e registro no banco de dados.
5.  **SAINDO:** Aguarda a pessoa liberar a zona para reiniciar o ciclo.

---

## 📸 Demonstração Visual

*As imagens abaixo representam saídas reais do modelo durante a fase de validação.*

<div align="center">
  <img src="models/yolov8n_pt/val_batch0_pred.jpg" alt="Exemplo de Predição" width="80%">
  <p><em>Identificação simultânea de múltiplos EPIs em colaboradores.</em></p>
</div>

---

## 🛠️ Tecnologias Utilizadas

*   **Hardware:** Raspberry Pi 4, Google Coral USB Accelerator, Webcam.
*   **IA/Visão:** YOLOv8 (Ultralytics), TensorFlow Lite (EdgeTPU), OpenCV.
*   **Backend/Cloud:** Firebase (Firestore, Storage, Hosting), Python.
*   **Frontend:** HTML5, JavaScript, Tailwind CSS (Dashboard).
*   **Comunicação:** Telegram Bot API.

---

## 📚 Documentação Técnica

Deseja replicar este projeto ou entender o código a fundo?
Acesse nossa documentação completa na pasta `docs/`:

*   [🔌 **Hardware Setup:**](docs/HARDWARE_SETUP.md) Montagem e drivers do Coral.
*   [💻 **Software Setup:**](docs/SOFTWARE_SETUP.md) Instalação do ambiente Python.
*   [⚙️ **Configuração:**](docs/CONFIGURATION.md) Chaves de API e variáveis.
*   [▶️ **Como Executar:**](docs/USAGE.md) Rodando os scripts de produção e teste.

---
*Projeto desenvolvido pelo Grupo 6 - Engenharia da Computação*
