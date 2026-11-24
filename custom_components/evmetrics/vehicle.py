"""Liga uma entrada ao dispositivo do app e às entidades que o MQTT Discovery dele criou.

O contrato entre o app e este pacote são as **chaves** (as mesmas do JSON do app e do SensorCatalog), não os
entity_id: o app publica cada entidade com unique_id "<node_id>_<chave>", então o mapa chave → entity_id continua certo
mesmo se o usuário renomear uma entidade no HA.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Any

from awesomeversion import AwesomeVersion, AwesomeVersionException

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .const import (
    CONF_CAMERAS,
    CONF_IMAGE,
    CONF_NODE_ID,
    CONF_SIDEBAR,
    CONF_TITLE,
    DEFAULT_SIDEBAR,
    DOMAIN,
    MIN_APP_VERSION,
    STATIC_URL,
)

MQTT_DOMAIN = "mqtt"


@dataclass
class VehicleInfo:
    """O que a strategy do dashboard recebe pelo websocket."""

    entry_id: str
    title: str
    url_path: str
    node_id: str
    device_id: str | None = None
    app_version: str | None = None
    entities: dict[str, str] = field(default_factory=dict)
    image: str | None = None
    cameras: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        """Formato enviado ao frontend."""
        return {
            "entry_id": self.entry_id,
            "title": self.title,
            "url_path": self.url_path,
            "node_id": self.node_id,
            "device_id": self.device_id,
            "app_version": self.app_version,
            "min_app_version": MIN_APP_VERSION,
            "entities": self.entities,
            "image": self.image or f"{STATIC_URL}/seal.svg",
            "cameras": self.cameras,
        }


def dashboard_url_path(entry: ConfigEntry) -> str:
    """URL do dashboard da entrada (precisa ter hífen): node_id "evmetrics_seal" → "evmetrics-seal"."""
    node = re.sub(r"[^a-z0-9]+", "-", entry.data[CONF_NODE_ID].lower()).strip("-")
    return node if node.startswith(f"{DOMAIN}-") else f"{DOMAIN}-{node}"


def dashboard_title(entry: ConfigEntry) -> str:
    """Título do dashboard (opção, senão o nome da entrada)."""
    return entry.options.get(CONF_TITLE) or entry.title


def show_in_sidebar(entry: ConfigEntry) -> bool:
    """Se o dashboard aparece na barra lateral."""
    return entry.options.get(CONF_SIDEBAR, DEFAULT_SIDEBAR)


def find_device(hass: HomeAssistant, node_id: str) -> dr.DeviceEntry | None:
    """Dispositivo do MQTT Discovery do app (identifiers = [node_id])."""
    return dr.async_get(hass).async_get_device(identifiers={(MQTT_DOMAIN, node_id)})


def app_version(device: dr.DeviceEntry | None) -> str | None:
    """Versão do app no sw_version do dispositivo ("EvMetrics 1.0" → "1.0")."""
    if device is None or not device.sw_version:
        return None
    match = re.search(r"(\d+(?:\.\d+)*)", device.sw_version)
    return match.group(1) if match else None


def app_outdated(version: str | None) -> bool:
    """True se a versão conhecida do app é menor que a mínima do pacote."""
    if version is None:
        return False
    try:
        return AwesomeVersion(version) < AwesomeVersion(MIN_APP_VERSION)
    except AwesomeVersionException:
        return False


def entity_map(hass: HomeAssistant, node_id: str, device_id: str | None) -> dict[str, str]:
    """Mapa chave do app → entity_id, a partir do registro de entidades.

    Se a mesma chave existir em dois domínios (o app trocou um sensor por binary_sensor e o antigo ainda não sumiu),
    fica o que não é "sensor".
    """
    registry = er.async_get(hass)
    prefix = f"{node_id}_"
    if device_id is not None:
        entries = er.async_entries_for_device(registry, device_id)
    else:
        entries = [e for e in registry.entities.values() if e.platform == MQTT_DOMAIN]
    out: dict[str, str] = {}
    for entry in entries:
        if entry.platform != MQTT_DOMAIN or not entry.unique_id.startswith(prefix):
            continue
        if entry.disabled_by is not None:
            continue
        key = entry.unique_id[len(prefix):]
        current = out.get(key)
        if current is not None and not current.startswith("sensor."):
            continue
        out[key] = entry.entity_id
    return out


def vehicle_info(hass: HomeAssistant, entry: ConfigEntry) -> VehicleInfo:
    """Monta o VehicleInfo da entrada com o estado atual dos registros."""
    node_id = entry.data[CONF_NODE_ID]
    device = find_device(hass, node_id)
    device_id = device.id if device else None
    return VehicleInfo(
        entry_id=entry.entry_id,
        title=dashboard_title(entry),
        url_path=dashboard_url_path(entry),
        node_id=node_id,
        device_id=device_id,
        app_version=app_version(device),
        entities=entity_map(hass, node_id, device_id),
        image=entry.options.get(CONF_IMAGE) or None,
        cameras=list(entry.options.get(CONF_CAMERAS, [])),
    )
