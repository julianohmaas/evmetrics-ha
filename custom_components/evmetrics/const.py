"""Constantes do EvMetrics."""

from __future__ import annotations

DOMAIN = "evmetrics"

# Dados da entrada: node_id do MQTT Discovery do app ("evmetrics_seal" para o tópico base "evmetrics/seal").
# É o identificador do dispositivo no HA e o prefixo dos unique_id ("evmetrics_seal_<CHAVE>").
CONF_NODE_ID = "node_id"
CONF_DEVICE = "device"

# Opções
CONF_SIDEBAR = "show_in_sidebar"
CONF_TITLE = "title"
CONF_IMAGE = "image"
CONF_IMAGE_UPLOAD = "image_upload"
CONF_CAMERAS = "live_cameras"

DEFAULT_SIDEBAR = True

# Arquivos do frontend (strategy e imagem do carro) servidos pela integração.
STATIC_URL = "/evmetrics_static"
STRATEGY_FILE = "evmetrics-strategy.js"
STRATEGY_TYPE = "evmetrics"  # usado no dashboard como "custom:evmetrics"

# Imagem do carro enviada pelas opções: <config>/evmetrics/<entry_id>.<ext>, servida em /evmetrics_files/.
UPLOAD_FOLDER = "evmetrics"
FILES_URL = "/evmetrics_files"

# Blueprints copiados para <config>/blueprints/automation/evmetrics/.
BLUEPRINT_FOLDER = "evmetrics"

# Versão mínima do app EvMetrics (campo sw_version do dispositivo, "EvMetrics 1.0") que publica todas as chaves que o
# dashboard e os blueprints usam. Subir junto quando o pacote passar a depender de uma chave nova.
MIN_APP_VERSION = "1.0"
