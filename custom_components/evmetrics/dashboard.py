"""Dashboard do carro, registrado pela integração.

O conteúdo não fica gravado no HA: o dashboard só aponta para a strategy "custom:evmetrics" (frontend/), que monta
as views na hora a partir das entidades do carro. Atualizar o pacote atualiza o dashboard, sem colar YAML.

É o mesmo caminho que o próprio HA usa no dashboard "Mapa" (um LovelaceConfig com {"strategy": ...}), mas em memória
e em modo "yaml" (não editável). Para personalizar, o usuário cria um dashboard próprio a partir da mesma strategy em
Configurações › Painéis › Adicionar painel › EvMetrics e usa "Assumir o controle".
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_YAML
from homeassistant.components.lovelace.dashboard import LovelaceConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.json import json_bytes, json_fragment

from .const import STRATEGY_TYPE

_LOGGER = logging.getLogger(__name__)

LOVELACE_COMPONENT = "lovelace"
ICON = "mdi:car-electric"


class EvMetricsDashboard(LovelaceConfig):
    """Dashboard só com a strategy, ligado a uma entrada."""

    def __init__(self, hass: HomeAssistant, url_path: str, title: str, entry_id: str) -> None:
        """Inicializa."""
        super().__init__(hass, url_path, {"title": title, "mode": MODE_YAML})
        self._config: dict[str, Any] = {
            "strategy": {"type": f"custom:{STRATEGY_TYPE}", "entry_id": entry_id}
        }
        self._json = json_fragment(json_bytes(self._config))

    @property
    def mode(self) -> str:
        """Modo (yaml = não editável pela interface)."""
        return MODE_YAML

    async def async_get_info(self) -> dict[str, Any]:
        """Informação do dashboard."""
        return {"mode": self.mode, "views": 0}

    async def async_load(self, force: bool) -> dict[str, Any]:
        """Configuração (só a strategy)."""
        return self._config

    async def async_json(self, force: bool) -> json_fragment:
        """Configuração em JSON."""
        return self._json


def async_register(
    hass: HomeAssistant, url_path: str, title: str, entry_id: str, sidebar: bool
) -> str | None:
    """Registra o dashboard. Devolve None se deu certo ou o motivo da falha (chave da Reparação)."""
    data = hass.data.get(LOVELACE_DATA)
    if data is None:
        return "dashboard_unsupported"
    existing = data.dashboards.get(url_path)
    if existing is not None and not isinstance(existing, EvMetricsDashboard):
        _LOGGER.warning("Já existe um dashboard em /%s; o do EvMetrics não foi criado", url_path)
        return "dashboard_conflict"

    data.dashboards[url_path] = EvMetricsDashboard(hass, url_path, title, entry_id)
    kwargs: dict[str, Any] = {
        "frontend_url_path": url_path,
        "config": {"mode": MODE_YAML},
        "require_admin": False,
        "update": existing is not None,
    }
    if sidebar:
        kwargs["sidebar_title"] = title
        kwargs["sidebar_icon"] = ICON
    try:
        frontend.async_register_built_in_panel(hass, LOVELACE_COMPONENT, **kwargs)
    except ValueError:
        data.dashboards.pop(url_path, None)
        _LOGGER.warning("O painel /%s já existe; o dashboard do EvMetrics não foi criado", url_path)
        return "dashboard_conflict"
    return None


def async_unregister(hass: HomeAssistant, url_path: str) -> None:
    """Remove o dashboard (descarregar ou apagar a entrada)."""
    data = hass.data.get(LOVELACE_DATA)
    if data is None:
        return
    if isinstance(data.dashboards.get(url_path), EvMetricsDashboard):
        data.dashboards.pop(url_path, None)
        frontend.async_remove_panel(hass, url_path, warn_if_unknown=False)
