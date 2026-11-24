"""Imagem do carro enviada pelas opções (upload).

Fica em <config>/evmetrics/<entry_id>.<ext>, servida em /evmetrics_files/. O ?v= na URL muda a cada envio para o
navegador não mostrar a imagem antiga do cache.
"""

from __future__ import annotations

from pathlib import Path
import time

from homeassistant.components.file_upload import process_uploaded_file
from homeassistant.core import HomeAssistant

from .const import FILES_URL, UPLOAD_FOLDER

MAX_BYTES = 10 * 1024 * 1024


class InvalidImage(Exception):
    """Arquivo que não é PNG, JPEG, WebP nem SVG (ou grande demais)."""


def _extension(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    head = data[:1024].lstrip().lower()
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") and b"<svg" in head):
        return "svg"
    raise InvalidImage


def folder(hass: HomeAssistant) -> Path:
    """Pasta das imagens enviadas."""
    return Path(hass.config.path(UPLOAD_FOLDER))


def save_uploaded_image(hass: HomeAssistant, file_id: str, entry_id: str) -> str:
    """Salva o arquivo enviado e devolve a URL (roda no executor)."""
    with process_uploaded_file(hass, file_id) as path:
        if path.stat().st_size > MAX_BYTES:
            raise InvalidImage
        data = path.read_bytes()
    ext = _extension(data)
    target = folder(hass)
    target.mkdir(parents=True, exist_ok=True)
    for old in target.glob(f"{entry_id}.*"):
        old.unlink(missing_ok=True)
    (target / f"{entry_id}.{ext}").write_bytes(data)
    return f"{FILES_URL}/{entry_id}.{ext}?v={int(time.time())}"


def remove_images(hass: HomeAssistant, entry_id: str) -> None:
    """Apaga a imagem da entrada removida (roda no executor)."""
    target = folder(hass)
    if target.is_dir():
        for old in target.glob(f"{entry_id}.*"):
            old.unlink(missing_ok=True)
