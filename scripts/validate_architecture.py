#!/usr/bin/env python3
"""
Validateur structurel des fichiers docs/architecture/*.yaml.

Vérifie :
- pipelines.yaml : chaque workflow_file existe réellement + schéma minimal.
- dependencies.yaml : chaque panel référence un .jsx qui existe + les tables
  mentionnées dans panels.reads/writes existent dans tables[].
- layers.yaml : schéma + chaque edge.from/edge.to pointe vers une box existante
  (format "<layer_id>.<box_id>") + type ∈ {cross_layer, adjacent, intra_layer}.
- flows/*.yaml : schéma minimal (id, label, domain, status, source_api,
  pipeline, tables, panels).

Sortie : exit 0 si tout OK, exit 1 avec liste des violations. Annotation
GitHub Actions `::error file=...::` pour chaque violation en CI.

Usage local : python scripts/validate_architecture.py [--strict]
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    import yaml
except ImportError:
    print("fail -- PyYAML manquant. Install : pip install pyyaml", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCH_DIR = REPO_ROOT / "docs" / "architecture"

EDGE_TYPES = {"cross_layer", "adjacent", "intra_layer"}
RLS_VALUES = {"authenticated", "service_role", "public"}
FLOW_REQUIRED_KEYS = {"id", "label", "domain", "status", "source_api", "pipeline", "tables", "panels"}

# Sections de l'onglet Santé. Vocabulaire FERMÉ : une brique dont le domaine
# n'est pas là tomberait dans la section « Non classé » de la page sans que
# personne le sache. Ajouter une valeur ici est un acte délibéré.
HEALTH_DOMAINS = {
    "veille_ia",
    "apprentissage",
    "veille_satellite",
    "mediatheque",
    "perso",
    "business",
    "socle",
}


@dataclass
class Violation:
    file: str
    line: int | None
    message: str

    def as_gh_annotation(self) -> str:
        line_part = f",line={self.line}" if self.line else ""
        return f"::error file={self.file}{line_part},title=validate-arch::{self.message}"


@dataclass
class Report:
    violations: list[Violation] = field(default_factory=list)
    checked_files: list[str] = field(default_factory=list)

    def add(self, file: str, msg: str, line: int | None = None) -> None:
        self.violations.append(Violation(file=file, line=line, message=msg))


def _load_yaml(path: Path, rpt: Report) -> dict | None:
    if not path.exists():
        rpt.add(str(path.relative_to(REPO_ROOT).as_posix()), f"fichier manquant : {path}")
        return None
    try:
        with path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        rpt.add(str(path.relative_to(REPO_ROOT).as_posix()), f"YAML invalide : {e}")
        return None
    rpt.checked_files.append(path.relative_to(REPO_ROOT).as_posix())
    return data


def _validate_health(rpt: Report, rel: str, ident: str, health: dict) -> None:
    """Valide un bloc `health` — le contrat lu par pipelines/pipeline_health.py."""
    if not isinstance(health, dict):
        rpt.add(rel, f"{ident}.health : doit être un objet")
        return
    domain = health.get("domain")
    if domain not in HEALTH_DOMAINS:
        rpt.add(
            rel,
            f"{ident}.health.domain : '{domain}' absent ou hors vocabulaire "
            f"{sorted(HEALTH_DOMAINS)}",
        )
    # Sans panels, la phrase d'effet ne peut pas se dériver : elle doit être
    # écrite. Sinon la ligne s'affiche sans dire ce qu'elle coûte.
    if not (health.get("panels") or []) and not health.get("impact"):
        rpt.add(
            rel,
            f"{ident}.health : 'panels' vide exige 'impact' "
            "(sinon aucune phrase d'effet n'est possible)",
        )
    # Une sonde de fraîcheur se déclare en entier ou pas du tout.
    if bool(health.get("table")) != bool(health.get("date_column")):
        rpt.add(
            rel,
            f"{ident}.health : 'table' et 'date_column' vont ensemble "
            "(l'une sans l'autre ne mesure rien)",
        )


def _validate_pipelines(rpt: Report) -> None:
    path = ARCH_DIR / "pipelines.yaml"
    data = _load_yaml(path, rpt)
    if not data:
        return
    rel = path.relative_to(REPO_ROOT).as_posix()
    pipelines = data.get("pipelines") or []
    if not isinstance(pipelines, list):
        rpt.add(rel, "pipelines: doit être une liste")
        return
    seen_ids: set[str] = set()
    for i, p in enumerate(pipelines):
        if not isinstance(p, dict):
            rpt.add(rel, f"pipelines[{i}] : doit être un objet")
            continue
        pid = p.get("id")
        if not pid:
            rpt.add(rel, f"pipelines[{i}] : 'id' manquant")
        elif pid in seen_ids:
            rpt.add(rel, f"pipelines[{i}] : id '{pid}' dupliqué")
        else:
            seen_ids.add(pid)
        wf = p.get("workflow_file")
        if wf:
            wf_path = REPO_ROOT / wf
            if not wf_path.exists():
                rpt.add(
                    rel,
                    f"pipelines[{pid or i}].workflow_file : '{wf}' n'existe pas dans le repo",
                )
        script = p.get("script")
        if script:
            script_path = REPO_ROOT / script
            if not script_path.exists():
                rpt.add(
                    rel,
                    f"pipelines[{pid or i}].script : '{script}' n'existe pas dans le repo",
                )
        cron = p.get("cron")
        if cron and not re.match(r"^[\d*/,\s-]+$", str(cron)):
            rpt.add(rel, f"pipelines[{pid or i}].cron : '{cron}' n'a pas la forme d'un cron")
        health = p.get("health")
        if health is not None and p.get("status") == "active":
            _validate_health(rpt, rel, f"pipelines[{pid or i}]", health)

    # Les routines distantes (claude.ai, hors GitHub Actions) portent le même
    # contrat de santé, sans workflow_file. La boucle no-ope tant qu'aucune
    # n'a déclaré de bloc `health`.
    for i, r in enumerate(data.get("external_routines") or []):
        if not isinstance(r, dict):
            continue
        health = r.get("health")
        if health is not None and r.get("status") == "active":
            _validate_health(rpt, rel, f"external_routines[{r.get('id') or i}]", health)


def _validate_dependencies(rpt: Report) -> None:
    path = ARCH_DIR / "dependencies.yaml"
    data = _load_yaml(path, rpt)
    if not data:
        return
    rel = path.relative_to(REPO_ROOT).as_posix()
    panels = data.get("panels") or []
    tables = data.get("tables") or []

    known_tables = set()
    seen_table_names: set[str] = set()
    for i, t in enumerate(tables):
        if not isinstance(t, dict):
            rpt.add(rel, f"tables[{i}] : doit être un objet")
            continue
        name = t.get("name")
        if not name:
            rpt.add(rel, f"tables[{i}] : 'name' manquant")
            continue
        if name in seen_table_names:
            rpt.add(rel, f"tables : nom '{name}' dupliqué")
        seen_table_names.add(name)
        known_tables.add(name)
        rls = t.get("rls")
        if rls and rls not in RLS_VALUES:
            rpt.add(rel, f"tables[{name}].rls : '{rls}' pas dans {sorted(RLS_VALUES)}")

    seen_panels: set[str] = set()
    for i, p in enumerate(panels):
        if not isinstance(p, dict):
            rpt.add(rel, f"panels[{i}] : doit être un objet")
            continue
        pid = p.get("id")
        if not pid:
            rpt.add(rel, f"panels[{i}] : 'id' manquant")
            continue
        if pid in seen_panels:
            rpt.add(rel, f"panels : id '{pid}' dupliqué")
        seen_panels.add(pid)
        jsx = p.get("file")
        if jsx:
            jsx_path = REPO_ROOT / jsx
            if not jsx_path.exists():
                rpt.add(
                    rel,
                    f"panels[{pid}].file : '{jsx}' n'existe pas dans le repo",
                )
        for key in ("reads", "writes"):
            ts = p.get(key) or []
            if not isinstance(ts, list):
                rpt.add(rel, f"panels[{pid}].{key} : doit être une liste")
                continue
            for t in ts:
                if t not in known_tables:
                    rpt.add(
                        rel,
                        f"panels[{pid}].{key} : table '{t}' non déclarée dans tables[]",
                    )


def _validate_layers(rpt: Report) -> None:
    path = ARCH_DIR / "layers.yaml"
    data = _load_yaml(path, rpt)
    if not data:
        return
    rel = path.relative_to(REPO_ROOT).as_posix()
    layers = data.get("layers") or []
    box_ids: set[str] = set()
    for i, layer in enumerate(layers):
        if not isinstance(layer, dict):
            rpt.add(rel, f"layers[{i}] : doit être un objet")
            continue
        lid = layer.get("id")
        if not lid:
            rpt.add(rel, f"layers[{i}] : 'id' manquant")
            continue
        boxes = layer.get("boxes") or []
        for bi, box in enumerate(boxes):
            if not isinstance(box, dict):
                rpt.add(rel, f"layers[{lid}].boxes[{bi}] : doit être un objet")
                continue
            bid = box.get("id")
            if not bid:
                rpt.add(rel, f"layers[{lid}].boxes[{bi}] : 'id' manquant")
                continue
            qid = f"{lid}.{bid}"
            if qid in box_ids:
                rpt.add(rel, f"layers : box id '{qid}' dupliqué")
            box_ids.add(qid)

    edges = data.get("edges") or []
    seen_edges: set[str] = set()
    for i, edge in enumerate(edges):
        if not isinstance(edge, dict):
            rpt.add(rel, f"edges[{i}] : doit être un objet")
            continue
        eid = edge.get("id")
        if not eid:
            rpt.add(rel, f"edges[{i}] : 'id' manquant")
        elif eid in seen_edges:
            rpt.add(rel, f"edges : id '{eid}' dupliqué")
        else:
            seen_edges.add(eid)
        for side in ("from", "to"):
            ref = edge.get(side)
            if not ref:
                rpt.add(rel, f"edges[{eid or i}].{side} : manquant")
            elif ref not in box_ids:
                rpt.add(
                    rel,
                    f"edges[{eid or i}].{side} : '{ref}' ne correspond à aucune box de layers[]",
                )
        etype = edge.get("type") or "adjacent"
        if etype not in EDGE_TYPES:
            rpt.add(
                rel,
                f"edges[{eid or i}].type : '{etype}' pas dans {sorted(EDGE_TYPES)}",
            )


def _validate_flows(rpt: Report) -> None:
    flows_dir = ARCH_DIR / "flows"
    if not flows_dir.exists():
        rpt.add("docs/architecture/flows", "dossier manquant")
        return
    for path in sorted(flows_dir.glob("*.yaml")):
        data = _load_yaml(path, rpt)
        if not data:
            continue
        rel = path.relative_to(REPO_ROOT).as_posix()
        missing = FLOW_REQUIRED_KEYS - set(data.keys())
        if missing:
            rpt.add(rel, f"clés requises manquantes : {sorted(missing)}")
        if data.get("status") not in {"active", "todo", "archived"}:
            rpt.add(
                rel,
                f"status : '{data.get('status')}' pas dans {{active, todo, archived}}",
            )
        pipeline = data.get("pipeline") or {}
        if isinstance(pipeline, dict):
            wf = pipeline.get("workflow")
            if wf:
                wf_path = REPO_ROOT / wf
                if not wf_path.exists():
                    rpt.add(rel, f"pipeline.workflow : '{wf}' n'existe pas")


def main(argv: list[str]) -> int:
    rpt = Report()
    _validate_layers(rpt)
    _validate_pipelines(rpt)
    _validate_dependencies(rpt)
    _validate_flows(rpt)

    if not rpt.violations:
        print(f"ok -- {len(rpt.checked_files)} fichiers archi validés, aucune violation.")
        for f in rpt.checked_files:
            print(f"  - {f}")
        return 0

    for v in rpt.violations:
        print(v.as_gh_annotation())
        print(f"  {v.file}{':' + str(v.line) if v.line else ''}  {v.message}")

    print(
        f"\nfail -- {len(rpt.violations)} violations dans {len({v.file for v in rpt.violations})} fichier(s)."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
