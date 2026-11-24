"""Blueprints de automação que vêm com o pacote.

Ficam em custom_components/evmetrics/blueprints/ e são copiados para <config>/blueprints/automation/evmetrics/ ao
iniciar. Uma atualização do pacote troca o arquivo, e as automações criadas a partir dele seguem a versão nova no
próximo reinício do HA (que a atualização de uma integração já pede). Os arquivos copiados são do pacote: editar
lá não adianta, a próxima atualização sobrescreve. Para mudar o comportamento, use as entradas do blueprint ou
"Assumir o controle" na automação.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.core import HomeAssistant

from .const import BLUEPRINT_FOLDER

_LOGGER = logging.getLogger(__name__)

SOURCE = Path(__file__).parent / "blueprints" / "automation"


def _sync(target: Path) -> list[str]:
    """Copia os blueprints que mudaram. Devolve os nomes copiados."""
    target.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []
    for src in sorted(SOURCE.glob("*.yaml")):
        dst = target / src.name
        new = src.read_bytes()
        if dst.exists() and dst.read_bytes() == new:
            continue
        tmp = dst.with_suffix(".yaml.tmp")
        tmp.write_bytes(new)
        tmp.replace(dst)
        copied.append(src.name)
    return copied


async def async_sync_blueprints(hass: HomeAssistant) -> None:
    """Instala ou atualiza os blueprints do pacote."""
    target = Path(hass.config.path("blueprints", "automation", BLUEPRINT_FOLDER))
    try:
        copied = await hass.async_add_executor_job(_sync, target)
    except OSError as err:
        _LOGGER.error("Não deu para copiar os blueprints para %s: %s", target, err)
        return
    if copied:
        _LOGGER.info("Blueprints instalados/atualizados: %s", ", ".join(copied))

