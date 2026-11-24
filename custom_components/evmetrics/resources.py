"""A strategy do dashboard como recurso do Lovelace.

A integração já põe a strategy na página inicial do HA (add_extra_js_url), mas isso só vale para abas abertas depois:
instalar pelo Marketplace não exige reiniciar, e uma aba aberta antes não tem a strategy ("Timeout waiting for strategy
element"). Os recursos do Lovelace, ao contrário, são carregados quando um dashboard abre. Com os dois apontando para a
mesma URL, o navegador carrega o módulo uma vez só.

Só no modo "storage" dos recursos (o padrão). No modo YAML, o add_extra_js_url continua valendo depois de recarregar a
página.
"""

from __future__ import annotations

import logging

from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.resources import ResourceStorageCollection
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


def _base(url: str) -> str:
    return url.split("?", 1)[0]


async def _collection(hass: HomeAssistant) -> ResourceStorageCollection | None:
    data = hass.data.get(LOVELACE_DATA)
    if data is None or not isinstance(data.resources, ResourceStorageCollection):
        return None
    resources = data.resources
    if not resources.loaded:
        await resources.async_load()
        resources.loaded = True
    return resources


async def async_ensure_resource(hass: HomeAssistant, url: str) -> None:
    """Cria ou atualiza (versão nova em ?v=) o recurso da strategy, sem duplicar."""
    resources = await _collection(hass)
    if resources is None:
        return
    mine = [i for i in resources.async_items() if _base(str(i.get("url", ""))) == _base(url)]
    if not mine:
        await resources.async_create_item({"res_type": "module", "url": url})
        _LOGGER.info("Recurso do dashboard adicionado: %s", url)
        return
    first, *duplicates = mine
    if first.get("url") != url or first.get("type") != "module":
        await resources.async_update_item(first["id"], {"res_type": "module", "url": url})
    for item in duplicates:
        await resources.async_delete_item(item["id"])


async def async_remove_resource(hass: HomeAssistant, url: str) -> None:
    """Tira o recurso (última entrada removida)."""
    resources = await _collection(hass)
    if resources is None:
        return
    for item in list(resources.async_items()):
        if _base(str(item.get("url", ""))) == _base(url):
            await resources.async_delete_item(item["id"])
