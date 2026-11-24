"""Configuração do EvMetrics.

Descoberta automática: o manifest assina o tópico de discovery do evento do sentinela que só o app EvMetrics publica
(homeassistant/event/<node_id>/sentinel_motion/config). Quando o app conecta, o HA oferece "EvMetrics descoberto" e
basta confirmar. Sem isso (prefixo de discovery diferente), dá para escolher o dispositivo à mão.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr, selector
from homeassistant.helpers.service_info.mqtt import MqttServiceInfo
from homeassistant.util.json import json_loads_object

from .const import (
    CONF_CAMERAS,
    CONF_DEVICE,
    CONF_IMAGE,
    CONF_NODE_ID,
    CONF_SIDEBAR,
    CONF_TITLE,
    DEFAULT_SIDEBAR,
    DOMAIN,
)

MQTT_DOMAIN = "mqtt"
DEFAULT_NAME = "BYD"


def _node_from_device(device: dr.DeviceEntry) -> str | None:
    """node_id do app = identificador MQTT do dispositivo."""
    for domain, ident in device.identifiers:
        if domain == MQTT_DOMAIN:
            return ident
    return None


class EvMetricsConfigFlow(ConfigFlow, domain=DOMAIN):
    """Fluxo de configuração."""

    VERSION = 1

    def __init__(self) -> None:
        """Inicializa."""
        self._node_id: str | None = None
        self._name: str = DEFAULT_NAME

    async def async_step_mqtt(self, discovery_info: MqttServiceInfo) -> ConfigFlowResult:
        """Config de discovery do app chegou no MQTT."""
        payload = discovery_info.payload
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8", "replace")
        if not payload:
            return self.async_abort(reason="not_supported")  # config vazia = entidade removida
        try:
            data = json_loads_object(payload)
            device = data.get("device") or data.get("dev") or {}
            idents = device.get("identifiers") or device.get("ids")
        except (ValueError, AttributeError):
            return self.async_abort(reason="not_supported")
        if isinstance(idents, str):
            idents = [idents]
        if not idents:
            return self.async_abort(reason="not_supported")

        self._node_id = str(idents[0])
        self._name = str(device.get("name") or DEFAULT_NAME)
        await self.async_set_unique_id(self._node_id)
        self._abort_if_unique_id_configured()
        self.context["title_placeholders"] = {"name": self._name}
        return await self.async_step_confirm()

    async def async_step_confirm(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Confirma o carro descoberto."""
        if user_input is not None:
            return self.async_create_entry(title=self._name, data={CONF_NODE_ID: self._node_id})
        self._set_confirm_only()
        return self.async_show_form(
            step_id="confirm", description_placeholders={"name": self._name}
        )

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Escolher o dispositivo do app à mão."""
        errors: dict[str, str] = {}
        if user_input is not None:
            device = dr.async_get(self.hass).async_get(user_input[CONF_DEVICE])
            node_id = _node_from_device(device) if device else None
            if node_id is None:
                errors[CONF_DEVICE] = "not_mqtt_device"
            else:
                await self.async_set_unique_id(node_id)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=device.name_by_user or device.name or DEFAULT_NAME,
                    data={CONF_NODE_ID: node_id},
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_DEVICE): selector.DeviceSelector(
                    selector.DeviceSelectorConfig(
                        filter=selector.DeviceFilterSelectorConfig(integration=MQTT_DOMAIN)
                    )
                )
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Opções do dashboard."""
        return EvMetricsOptionsFlow()


class EvMetricsOptionsFlow(OptionsFlow):
    """Título, barra lateral, imagem do carro e câmeras ao vivo."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Única tela de opções."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        schema = vol.Schema(
            {
                vol.Optional(CONF_TITLE): selector.TextSelector(),
                vol.Optional(CONF_SIDEBAR, default=DEFAULT_SIDEBAR): selector.BooleanSelector(),
                # texto livre: aceita caminho relativo como /local/images/seal.png (o tipo URL do navegador recusa)
                vol.Optional(CONF_IMAGE): selector.TextSelector(),
                vol.Optional(CONF_CAMERAS, default=[]): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="camera", multiple=True)
                ),
            }
        )
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(schema, self.config_entry.options),
        )
