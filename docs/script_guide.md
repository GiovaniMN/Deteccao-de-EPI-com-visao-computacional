# Guia Detalhado do Script de Detecção (`deteccao_example.py`)

Este documento fornece uma análise aprofundada do script `deteccao_example.py`, explicando sua arquitetura, lógica de funcionamento e opções de configuração.

## 1. Visão Geral da Arquitetura

O script é modular e orientado a objetos, dividido em várias classes, cada uma com uma responsabilidade específica para manter o código organizado e de fácil manutenção.

- **`HybridEPIDetector`**: É a classe principal que orquestra todo o processo. Ela inicializa os demais componentes, gerencia o loop de detecção, processa os resultados e aciona os alertas.
- **`OptimizedConfig`**: Centraliza todas as configurações e parâmetros ajustáveis do sistema, desde caminhos de arquivos até limiares de detecção.
- **`WebcamStream`**: Gerencia a captura de vídeo da webcam em uma thread separada para garantir que o processamento não seja bloqueado pela leitura de frames.
- **`FirebaseManager`**: Encapsula toda a comunicação com o Google Firebase, incluindo o salvamento de alertas no Firestore e a busca por configurações de zonas de monitoramento.
- **`TelegramManager`**: Lida com o envio de notificações para um chat do Telegram através da API de Bots.
- **Classes de Suporte**:
  - `PerformanceMonitor`: Calcula e exibe a taxa de quadros por segundo (FPS).
  - `SimplePreprocessor`: Realiza o pré-processamento básico dos frames antes da inferência.
  - `ZoneScaleManager`: Converte as coordenadas das zonas de monitoramento (definidas via web) para a resolução da câmera.

## 2. Lógica de Detecção e Alerta (Máquina de Estados)

Para evitar alertas falsos (por exemplo, quando uma pessoa está apenas passando pela área), o script implementa uma máquina de estados simples.

1.  **Estado `Vazio`**:
    - Este é o estado inicial. Nenhuma pessoa está sendo monitorada.
    - O sistema procura por uma **presença estável** de uma pessoa na zona. A presença é considerada "estável" quando uma pessoa é detectada em mais de `PRESENCE_CONFIDENCE_RATIO` (padrão: 50%) dos frames em um buffer de `STABILITY_BUFFER_SIZE` (padrão: 15 frames).
    - Ao confirmar a presença estável, o estado muda para `Analisando`.

2.  **Estado `Analisando`**:
    - Uma pessoa foi detectada. O sistema agora aguarda por um curto período definido por `ANALYSIS_PERIOD_SECONDS` (padrão: 3 segundos).
    - Este período de "carência" garante que a pessoa de fato permaneceu na zona.
    - Se a pessoa sair da zona durante este tempo, o sistema volta ao estado `Vazio`.
    - Se a pessoa permanecer, o estado muda para `MONITORING`.

3.  **Estado `MONITORING`**:
    - O sistema agora monitora ativamente a presença dos EPIs (`capacete`, `bota`, `oculos`).
    - A presença de cada EPI também é validada usando um buffer de histórico (`epi_presence_history`) para garantir estabilidade na detecção.
    - Se um ou mais EPIs estiverem faltando de forma consistente, o status muda para `EPI_Nao_Conforme`.
    - Um timer (`non_compliance_start_time`) é iniciado. Se a não conformidade persistir pelo tempo definido em `NON_COMPLIANCE_THRESHOLD_SECONDS` (padrão: 3 segundos), um alerta é enviado.
    - O alerta é enviado apenas **uma vez por sessão** de não conformidade para evitar spam. O sistema precisa retornar ao estado `EPI_Conforme` antes que um novo alerta possa ser gerado.

## 3. Guia de Configuração (`OptimizedConfig`)

Todos os parâmetros a seguir podem ser ajustados na classe `OptimizedConfig` dentro do script.

### Credenciais e Caminhos
- `TELEGRAM_TOKEN`: Token do seu bot do Telegram.
- `TELEGRAM_CHAT_ID`: ID do chat para onde as notificações serão enviadas.
- `MODEL_PATH`: Caminho para o arquivo do modelo (`.pt` ou `.tflite`).
- `CLASSES_PATH`: Caminho para o arquivo `classes.txt`.
- `FIREBASE_KEY_PATH`: Caminho para o arquivo JSON da sua chave de serviço do Firebase.

### Parâmetros da Câmera e Inferência
- `CAMERA_RESOLUTION`: Resolução desejada para a captura da câmera (ex: `(1920, 1080)`).
- `WEB_REFERENCE_RESOLUTION`: Resolução de referência usada no painel web para definir as zonas (padrão: `(640, 480)`).
- `INFERENCE_SIZE`: Tamanho para o qual os frames são redimensionados antes de serem enviados ao modelo (padrão: `(640, 640)`).

### Limiares de Detecção
- `DETECTION_CONFIDENCE`: Dicionário com o limiar de confiança mínimo para cada classe. Permite ajustar a sensibilidade para cada tipo de objeto.
  ```python
  {'pessoa': 0.4, 'capacete': 0.6, 'bota': 0.3, 'oculos': 0.2}
  ```
- `MIN_DETECTION_AREA` / `MAX_DETECTION_AREA`: Dicionários para filtrar detecções com base na área (em pixels) do bounding box. Útil para ignorar objetos muito pequenos ou muito grandes que provavelmente são detecções falsas.

### Lógica de Alerta e Estabilidade
- `ANALYSIS_PERIOD_SECONDS`: Tempo (em segundos) que o sistema aguarda no estado `Analisando` antes de começar a monitorar os EPIs.
- `NON_COMPLIANCE_THRESHOLD_SECONDS`: Tempo (em segundos) que uma não conformidade deve persistir antes que um alerta seja disparado.
- `STABILITY_BUFFER_SIZE`: Número de frames usados no histórico para determinar a presença estável de uma pessoa ou EPI.
- `PRESENCE_CONFIDENCE_RATIO`: Proporção de frames nos quais uma **pessoa** deve ser detectada no buffer para ser considerada "presente".
- `EPI_PRESENCE_RATIO`: Proporção de frames nos quais um **EPI** deve ser detectado no buffer para ser considerado "presente". O valor padrão de `0.15` é permissivo para evitar alertas por oclusões momentâneas.

### Outros
- `LOG_THROTTLE_SECONDS`: Intervalo mínimo entre logs de depuração de memória de EPIs para evitar poluir o console.
- `ZONE_UPDATE_INTERVAL`: Frequência (em segundos) com que o script verifica o Firebase por atualizações nas zonas de monitoramento.
