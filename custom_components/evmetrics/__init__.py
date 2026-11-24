"""EvMetrics: dashboard e automações do carro para o app EvMetrics (BYD, MQTT Discovery).

A integração não cria sensores: as entidades vêm do MQTT Discovery do app. Ela junta o que antes se colava à mão:
- o dashboard do carro (strategy em frontend/, montada a partir das entidades do dispositivo);
- os blueprints de automação (sentinela, carro que não dormiu, recarga);
- avisos em Reparações quando o app ou o dispositivo não batem com o pacote.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv, issue_registry as ir
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from . import dashboard
from .blueprints import async_sync_blueprints
from .const import (
    CONF_NODE_ID,
    DOMAIN,
    FILES_URL,
    MIN_APP_VERSION,
    STATIC_URL,
    STRATEGY_FILE,
)
from .images import folder as images_folder, remove_images
from .resources import async_ensure_resource, async_remove_resource
from .vehicle import (
    app_outdated,
    dashboard_title,
    dashboard_url_path,
    find_device,
    show_in_sidebar,
    vehicle_info,
)

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Frontend (strategy), websocket e blueprints: uma vez, valem para todas as entradas."""
    integration = await async_get_integration(hass, DOMAIN)
    uploads = images_folder(hass)
    await hass.async_add_executor_job(lambda: uploads.mkdir(parents=True, exist_ok=True))
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False),
            StaticPathConfig(FILES_URL, str(uploads), cache_headers=False),
        ]
    )
    # ?v= muda a cada versão: o navegador não fica com a strategy velha em cache depois de uma atualização
    url = strategy_url(integration.version)
    add_extra_js_url(hass, url)
    # também como recurso do Lovelace: vale para abas abertas antes da instalação (ver resources.py)
    try:
        await async_ensure_resource(hass, url)
    except Exception:  # noqa: BLE001 - recurso é um extra; o add_extra_js_url já cobre depois de recarregar
        _LOGGER.warning("Não deu para registrar a strategy nos recursos do dashboard", exc_info=True)
    websocket_api.async_register_command(hass, ws_vehicles)
    await async_sync_blueprints(hass)
    return True


def strategy_url(version: str | None) -> str:
    """URL da strategy com a versão (cache)."""
    return f"{STATIC_URL}/{STRATEGY_FILE}?v={version}"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Registra o dashboard do carro e confere app/dispositivo."""
    node_id = entry.data[CONF_NODE_ID]
    url_path = dashboard_url_path(entry)

    _check_device(hass, entry)

    problem = dashboard.async_register(
        hass, url_path, dashboard_title(entry), entry.entry_id, show_in_sidebar(entry)
    )
    for key in ("dashboard_conflict", "dashboard_unsupported"):
        issue_id = f"{key}_{entry.entry_id}"
        if problem == key:
            ir.async_create_issue(
                hass,
                DOMAIN,
                issue_id,
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key=key,
                translation_placeholders={"url_path": url_path, "title": entry.title},
            )
        else:
            ir.async_delete_issue(hass, DOMAIN, issue_id)

    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    _LOGGER.debug("EvMetrics %s: dashboard /%s (node %s)", entry.title, url_path, node_id)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Tira o dashboard."""
    dashboard.async_unregister(hass, dashboard_url_path(entry))
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Limpa os avisos e a imagem da entrada; sem carros, tira o recurso do dashboard."""
    for key in ("app_outdated", "device_not_found", "dashboard_conflict", "dashboard_unsupported"):
        ir.async_delete_issue(hass, DOMAIN, f"{key}_{entry.entry_id}")
    await hass.async_add_executor_job(remove_images, hass, entry.entry_id)
    others = [e for e in hass.config_entries.async_entries(DOMAIN) if e.entry_id != entry.entry_id]
    if not others:
        await async_remove_resource(hass, strategy_url(None))


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Opções mudaram (título, barra lateral, imagem, câmeras): recarrega a entrada."""
    await hass.config_entries.async_reload(entry.entry_id)


@callback
def _check_device(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Avisos em Reparações: dispositivo do app não encontrado, ou app mais velho que o pacote."""
    device = find_device(hass, entry.data[CONF_NODE_ID])
    missing_id = f"device_not_found_{entry.entry_id}"
    if device is None:
        ir.async_create_issue(
            hass,
            DOMAIN,
            missing_id,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="device_not_found",
            translation_placeholders={"node_id": entry.data[CONF_NODE_ID], "title": entry.title},
        )
    else:
        ir.async_delete_issue(hass, DOMAIN, missing_id)

    info = vehicle_info(hass, entry)
    outdated_id = f"app_outdated_{entry.entry_id}"
    if app_outdated(info.app_version):
        ir.async_create_issue(
            hass,
            DOMAIN,
            outdated_id,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="app_outdated",
            translation_placeholders={
                "title": entry.title,
                "version": info.app_version or "?",
                "min_version": MIN_APP_VERSION,
            },
        )
    else:
        ir.async_delete_issue(hass, DOMAIN, outdated_id)


@websocket_api.websocket_command(
    {vol.Required("type"): "evmetrics/vehicles", vol.Optional("entry_id"): str}
)
@callback
def ws_vehicles(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Carros configurados com o mapa chave → entity_id (lido pela strategy do dashboard)."""
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if entry_id := msg.get("entry_id"):
        entries = [e for e in entries if e.entry_id == entry_id]
    connection.send_result(msg["id"], [vehicle_info(hass, e).as_dict() for e in entries])
