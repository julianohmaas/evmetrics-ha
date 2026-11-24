"""Checagens rápidas do pacote (rodam no CI): blueprints, traduções e manifest.

Uso: python scripts/check.py  (precisa de PyYAML)
"""

from __future__ import annotations

import json
from pathlib import Path
import re
import sys

import yaml

ROOT = Path(__file__).resolve().parent.parent
COMP = ROOT / "custom_components" / "evmetrics"
errors: list[str] = []


class Input(str):
    """!input <nome>."""


class Loader(yaml.SafeLoader):
    """SafeLoader que entende !input."""


Loader.add_constructor("!input", lambda loader, node: Input(loader.construct_scalar(node)))


def walk(node):
    """Todos os valores de uma árvore YAML."""
    yield node
    if isinstance(node, dict):
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for value in node:
            yield from walk(value)


def declared_inputs(inputs: dict) -> set[str]:
    """Entradas do blueprint, inclusive as de dentro de seções."""
    names: set[str] = set()
    for name, spec in inputs.items():
        if isinstance(spec, dict) and "input" in spec:
            names |= declared_inputs(spec["input"])
        else:
            names.add(name)
    return names


def check_blueprints() -> None:
    files = sorted((COMP / "blueprints" / "automation").glob("*.yaml"))
    if not files:
        errors.append("nenhum blueprint encontrado")
    for path in files:
        data = yaml.load(path.read_text(encoding="utf-8"), Loader=Loader)
        meta = data.get("blueprint", {})
        for key in ("name", "domain", "input", "source_url"):
            if key not in meta:
                errors.append(f"{path.name}: blueprint sem '{key}'")
        if not meta.get("source_url", "").endswith(f"/{path.name}"):
            errors.append(f"{path.name}: source_url não aponta para o próprio arquivo")
        declared = declared_inputs(meta.get("input", {}))
        used = {str(v) for v in walk({k: v for k, v in data.items() if k != "blueprint"}) if isinstance(v, Input)}
        for name in sorted(used - declared):
            errors.append(f"{path.name}: !input {name} não declarado")
        for name in sorted(declared - used):
            errors.append(f"{path.name}: entrada {name} declarada e não usada")
        for key in ("triggers", "actions"):
            if key not in data:
                errors.append(f"{path.name}: sem '{key}'")


def keys(tree: dict, prefix: str = "") -> set[str]:
    out: set[str] = set()
    for key, value in tree.items():
        path = f"{prefix}.{key}" if prefix else key
        out |= keys(value, path) if isinstance(value, dict) else {path}
    return out


def check_translations() -> None:
    files = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in (COMP / "translations").glob("*.json")}
    if "en" not in files:
        errors.append("translations/en.json é obrigatório")
        return
    base = keys(files["en"])
    for lang, data in files.items():
        other = keys(data)
        for missing in sorted(base - other):
            errors.append(f"translations/{lang}.json sem {missing}")
        for extra in sorted(other - base):
            errors.append(f"translations/{lang}.json tem {extra} que o en.json não tem")
    code = "\n".join(p.read_text(encoding="utf-8") for p in COMP.glob("*.py"))
    for issue in set(re.findall(r'translation_key="([a-z_]+)"', code)) | set(
        re.findall(r'"(dashboard_conflict|dashboard_unsupported)"', code)
    ):
        if f"issues.{issue}.title" not in base:
            errors.append(f"aviso '{issue}' sem tradução em issues")


def check_manifest() -> None:
    manifest = json.loads((COMP / "manifest.json").read_text(encoding="utf-8"))
    if not re.fullmatch(r"\d+\.\d+\.\d+(b\d+|rc\d+)?", manifest.get("version", "")):
        errors.append(f"manifest.json: version inválida {manifest.get('version')!r}")
    for key in ("domain", "name", "documentation", "issue_tracker", "codeowners", "version"):
        if key not in manifest:
            errors.append(f"manifest.json sem {key}")
    hacs = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
    if "name" not in hacs:
        errors.append("hacs.json sem name")
    for name in ("icon.png", "logo.png"):
        if not (COMP / "brand" / name).is_file():
            errors.append(f"brand/{name} faltando")


check_blueprints()
check_translations()
check_manifest()

if errors:
    print("\n".join(f"ERRO: {e}" for e in errors))
    sys.exit(1)
print("ok")
