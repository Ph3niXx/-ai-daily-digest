#!/usr/bin/env python3
r"""
Lint pour CLAUDE.md — garantit la stabilité du slim down.

Contexte : CLAUDE.md a été slim down de 611 à 100 lignes le 2026-05-18. Sans
garde-fou, l'experience montre que ce fichier re-gonfle par accumulation
incrementale (ajout d'une table ici, d'un secret la, d'un event telemetrie).

Le plafond de 200 lignes est la cible officielle Anthropic (verifiee le
2026-08-31 sur code.claude.com/docs/en/memory : "target under 200 lines per
CLAUDE.md file"), et /doctor >= v2.1.206 propose les memes coupes : il retire
ce qui est derivable du code (arborescences, listes de dependances, vues
d'ensemble) et garde pieges, rationale et conventions.

NB : le rationale d'origine de ce script avancait "~14k tokens par tour" et
"cache 5min casse a chaque modif". Les deux sont faux. Le TTL du cache est
d'1 h sur abonnement et editer CLAUDE.md en cours de session ne l'invalide pas
(en revanche l'edition ne s'applique pas avant un /clear) ; le contexte est
relu a 0,1x le prix input. Et "un CLAUDE.md long degrade l'adherence" n'est
pas mesure : arXiv 2605.10039 (1 650 sessions Claude Code, tailles 25 a 500
lignes) ne detecte aucun effet des variables de structure. La regle tient pour
la discipline de budget contexte et la surface de derive, pas pour l'adherence.

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


# Ligne de separation d'un tableau markdown : |---|:--:|---|
TABLE_SEPARATOR = re.compile(r"^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$")


def is_table_header(lines: list[str], idx: int) -> bool:
    """Vrai si lines[idx] est le HEADER d'un tableau, pas une ligne de donnees.

    Un header markdown est toujours suivi d'une ligne de separation. Sans ce
    test, `| ANTHROPIC_API_KEY | Secret utilise par ... |` — une ligne de
    donnees parfaitement legitime — declenchait un faux positif.
    """
    return idx + 1 < len(lines) and bool(TABLE_SEPARATOR.match(lines[idx + 1]))


def check_no_secret_table(lines: list[str]) -> list[Violation]:
    violations = []
    header_re = re.compile(r"^\|.*\bsecrets?\b", re.IGNORECASE)
    for i, line in enumerate(lines):
        if header_re.match(line) and is_table_header(lines, i):
            violations.append(Violation(
                rule="secret_table",
                line=i + 1,
                excerpt=line.rstrip()[:100],
                suggestion="Tableau de secrets -> docs/secrets.md",
            ))
    return violations


def check_no_event_table(lines: list[str]) -> list[Violation]:
    violations = []
    # Tableau qui a "event_type" dans son header.
    header_re = re.compile(r"^\|.*event_type", re.IGNORECASE)
    for i, line in enumerate(lines):
        if header_re.match(line) and is_table_header(lines, i):
            violations.append(Violation(
                rule="event_table",
                line=i + 1,
                excerpt=line.rstrip()[:100],
                suggestion="Tableau d'events telemetrie -> docs/telemetry.md",
            ))
    return violations


# Titres acceptes pour la section d'index. L'egalite de chaine exacte faisait
# echouer des CLAUDE.md par ailleurs impeccables dont le titre differait d'un mot.
POINTER_SECTION = re.compile(r"^#{2,3}\s+.*\bpointeurs?\b", re.IGNORECASE)


def check_pointer_section(lines: list[str]) -> list[Violation]:
    """Regle DOUCE : avertit sans faire echouer (cf. docstring du module).

    Elle etait declaree douce et implementee comme bloquante — une divergence
    qui fait echouer la CI sur un fichier sain.
    """
    if not any(POINTER_SECTION.match(line) for line in lines):
        print(
            "WARN: aucune section '## Pointeurs ...' trouvee. C'est l'index qui "
            "permet de savoir ou vivent les fichiers docs/ externalises.",
            file=sys.stderr,
        )
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
