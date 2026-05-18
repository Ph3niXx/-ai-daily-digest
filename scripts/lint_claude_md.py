#!/usr/bin/env python3
r"""
Lint pour CLAUDE.md — garantit la stabilité du slim down.

Contexte : CLAUDE.md a été slim down de 611 à 100 lignes le 2026-05-18. Sans
garde-fou, l'experience montre que ce fichier re-gonfle par accumulation
incrementale (ajout d'une table ici, d'un secret la, d'un event telemetrie).
A 600 lignes, le cout est de ~14k tokens par tour Claude — recharge a chaque
tour, cache 5min casse a chaque modif.

Ce script applique 5 regles :

1. Taille — fail si > 200 lignes (cf. best practices Anthropic 2026 :
   60-200 cible, 300 plafond avant perte de signal).
2. Pas d'arborescence ASCII (`├──` / `└──`) — ces blocs vivent dans
   docs/architecture/repo-structure.md.
3. Pas de listing "inventaire" : 5+ lignes consecutives type
   `- \`xxx_yyy\` — description`. Ce pattern signale un inventaire (tables
   Supabase, colonnes, secrets, events) qui devrait vivre dans docs/.
4. Pas de tableau avec colonne "Secret" ou "GitHub Secret" — vit dans
   docs/secrets.md.
5. Pas de tableau avec colonne "event_type" — vit dans docs/telemetry.md.

Une 6e regle "douce" verifie la presence de la section
"## Pointeurs vers la doc longue" — sans elle, Claude futur ne sait pas ou
chercher les fichiers externalisés.

Usage CI : .github/workflows/lint-claude-md.yml (phase 1 : warning-only via
continue-on-error, phase 2 : bloquant apres ~2-3 semaines de mesure).

Usage local : python scripts/lint_claude_md.py
Exit 0 = OK, 1 = violations detectees, 2 = fichier introuvable.
"""

from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

CLAUDE_MD = Path(__file__).resolve().parent.parent / "CLAUDE.md"

# Seuils. Best practices Anthropic 2026 : cible 60-200 lignes, plafond 300.
# On choisit 200 pour avoir une marge confortable au-dessus du shape actuel
# (~100 lignes) sans laisser deriver vers le plafond.
HARD_LIMIT = 200
SOFT_LIMIT = 180

# Run minimal pour considerer un bloc de lignes comme "inventaire".
INVENTORY_RUN_THRESHOLD = 5


@dataclass(frozen=True)
class Violation:
    rule: str
    line: int
    excerpt: str
    suggestion: str


def is_github_actions() -> bool:
    return os.environ.get("GITHUB_ACTIONS") == "true"


def emit(violation: Violation) -> None:
    """Emit a violation in the most useful format for the current environment."""
    if is_github_actions():
        # Annotation GitHub Actions visible dans l'UI de PR.
        msg = f"L{violation.line} [{violation.rule}] {violation.excerpt} -> {violation.suggestion}"
        print(f"::warning file=CLAUDE.md,line={violation.line}::{msg}")
    else:
        print(f"  L{violation.line} [{violation.rule}] : {violation.excerpt}")
        print(f"    -> {violation.suggestion}\n")


def check_size(lines: list[str]) -> list[Violation]:
    n = len(lines)
    if n > HARD_LIMIT:
        return [Violation(
            rule="size_hard",
            line=1,
            excerpt=f"CLAUDE.md fait {n} lignes (plafond {HARD_LIMIT})",
            suggestion=(
                "Deplacer des sections vers docs/. Cibles existantes : "
                "docs/architecture/repo-structure.md (arborescence), "
                "docs/architecture/dependencies.yaml (tables), "
                "docs/secrets.md, docs/telemetry.md, "
                "docs/specs/MAINTENANCE.md, jarvis/README.md, "
                "docs/weekly-pipeline.md."
            ),
        )]
    if n > SOFT_LIMIT:
        # Soft warning : affiche mais ne compte pas comme violation.
        print(f"WARN: CLAUDE.md fait {n} lignes (soft limit {SOFT_LIMIT}, hard {HARD_LIMIT}).", file=sys.stderr)
    return []


def check_no_tree_block(lines: list[str]) -> list[Violation]:
    violations = []
    for i, line in enumerate(lines, start=1):
        if "├──" in line or "└──" in line:
            violations.append(Violation(
                rule="tree_block",
                line=i,
                excerpt=line.rstrip()[:100],
                suggestion="Arborescence ASCII detectee -> docs/architecture/repo-structure.md",
            ))
    return violations


# Pattern d'une ligne "inventaire" : `- nom` ou `- **nom**` ou `- \`nom\``
# suivi d'un separateur (— : -) et d'une description.
INVENTORY_LINE = re.compile(
    r"^[\s]*-\s+\*{0,2}`?[A-Za-z_][\w.\-/]*`?\*{0,2}\s+[—:|\-]\s"
)


def check_no_inventory_run(lines: list[str]) -> list[Violation]:
    violations = []
    run_start = None
    run_count = 0

    def flush():
        nonlocal run_start, run_count
        if run_count >= INVENTORY_RUN_THRESHOLD and run_start is not None:
            violations.append(Violation(
                rule="inventory_run",
                line=run_start,
                excerpt=f"{run_count} lignes consecutives d'inventaire a partir de L{run_start}",
                suggestion=(
                    "Inventaire/listing detecte -> deplacer vers le fichier docs/ adequat "
                    "(dependencies.yaml pour tables, secrets.md pour secrets, "
                    "telemetry.md pour events, jarvis/README.md pour Jarvis)."
                ),
            ))
        run_start = None
        run_count = 0

    for i, line in enumerate(lines, start=1):
        if INVENTORY_LINE.match(line):
            if run_start is None:
                run_start = i
            run_count += 1
        else:
            flush()
    flush()
    return violations


def check_no_secret_table(lines: list[str]) -> list[Violation]:
    violations = []
    header_re = re.compile(r"^\|.*\b(?:Secret|GitHub\s+Secret)\b", re.IGNORECASE)
    for i, line in enumerate(lines, start=1):
        if header_re.match(line):
            violations.append(Violation(
                rule="secret_table",
                line=i,
                excerpt=line.rstrip()[:100],
                suggestion="Tableau de secrets -> docs/secrets.md",
            ))
    return violations


def check_no_event_table(lines: list[str]) -> list[Violation]:
    violations = []
    # Tableau qui a "event_type" dans son header.
    header_re = re.compile(r"^\|.*event_type", re.IGNORECASE)
    for i, line in enumerate(lines, start=1):
        if header_re.match(line):
            violations.append(Violation(
                rule="event_table",
                line=i,
                excerpt=line.rstrip()[:100],
                suggestion="Tableau d'events telemetrie -> docs/telemetry.md",
            ))
    return violations


def check_pointer_section(lines: list[str]) -> list[Violation]:
    content = "\n".join(lines)
    if "## Pointeurs vers la doc longue" not in content:
        return [Violation(
            rule="missing_pointer_section",
            line=len(lines),
            excerpt="Section '## Pointeurs vers la doc longue' absente",
            suggestion=(
                "Reintroduire cette section : c'est l'index qui permet a Claude (et au PO-agent "
                "Symphony) de savoir ou trouver les fichiers docs/ externalises."
            ),
        )]
    return []


CHECKS = (
    check_size,
    check_no_tree_block,
    check_no_inventory_run,
    check_no_secret_table,
    check_no_event_table,
    check_pointer_section,
)


def main() -> int:
    if not CLAUDE_MD.exists():
        print(f"ERROR: CLAUDE.md introuvable a {CLAUDE_MD}", file=sys.stderr)
        return 2

    lines = CLAUDE_MD.read_text(encoding="utf-8").splitlines()

    all_violations: list[Violation] = []
    for check in CHECKS:
        all_violations.extend(check(lines))

    if not all_violations:
        print(f"OK CLAUDE.md ({len(lines)} lignes, 0 violations).")
        return 0

    if not is_github_actions():
        print(f"FAIL {len(all_violations)} violation(s) dans CLAUDE.md ({len(lines)} lignes) :\n")
    for v in all_violations:
        emit(v)

    if is_github_actions():
        # En CI, l'agregation finale aide a comprendre dans les logs.
        print(f"::error::{len(all_violations)} violation(s) detectee(s) dans CLAUDE.md.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
