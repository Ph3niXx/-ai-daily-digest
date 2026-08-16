#!/usr/bin/env python3
"""
Sauvegarde des données saisies par l'utilisateur → fichiers JSON.

Audit du 2026-08-15, vague 0 : le projet accumulait quatre mois de données
irremplaçables sans aucune sauvegarde (26 workflows, zéro dump/export).

Périmètre volontairement restreint : uniquement ce qu'AUCUN pipeline ne sait
refabriquer. Les corpus RSS, les scrobbles, les snapshots Steam et l'index
vectoriel de Jarvis sont exclus — ils se régénèrent depuis leur source. Un
statut « relancé le 12/08 » sur une offre, non.

Transport : PostgREST avec la service key. `pg_dump` n'est pas utilisable ici,
faute de mot de passe Postgres dans les secrets du dépôt (docs/secrets.md).

Usage :
    python pipelines/backup_supabase.py                # écrit dans ./backup
    python pipelines/backup_supabase.py --out /tmp/bk  # autre destination
    python pipelines/backup_supabase.py --dry-run      # n'écrit aucun fichier
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import requests

PAGE_SIZE = 1000
TIMEOUT = 60

# table -> colonne de tri, pour une pagination déterministe.
# Les clefs primaires ont été relevées en base le 2026-08-15 ; toutes sont
# mono-colonne. Trier est indispensable : sans ORDER BY, PostgREST ne garantit
# pas la stabilité des pages et un offset peut sauter ou dupliquer des lignes.
TABLES = {
    # Carrière — le cœur de ce qui n'est pas refabricable
    "jobs": "id",
    "job_scans": "id",
    # Profil et réflexion personnelle
    "user_profile": "key",
    "user_profile_history": "id",
    "profile_facts": "id",
    "skill_radar": "id",
    "business_ideas": "id",
    "commitments": "id",
    "uncomfortable_questions": "id",
    # Médiathèque — saisies et progression
    "media_entries": "id",
    "media_progress": "id",
    "media_franchises": "id",
    "media_releases": "id",
    # Tracker jeux — saisies et progression
    "game_titles": "id",
    "game_progress": "id",
    "game_franchises": "id",
    "game_releases": "id",
    "gaming_wishlist": "id",
    # Divers saisis à la main
    "jp_seen": "word",
    "article_feedback": "id",
    "challenge_attempts": "id",
    "history_notes": "iso",
}


def env_required(name):
    """Read a required environment variable or exit."""
    value = os.environ.get(name)
    if not value:
        print(f"FATAL: Missing required environment variable: {name}")
        sys.exit(1)
    return value


def fetch_table(base_url, headers, table, order_col):
    """Fetch every row of a table, page by page, ordered by its primary key."""
    rows = []
    offset = 0
    while True:
        url = (
            f"{base_url}/rest/v1/{table}"
            f"?select=*&order={order_col}.asc&limit={PAGE_SIZE}&offset={offset}"
        )
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
        # Pas de rattrapage silencieux : une sauvegarde partielle qui se croit
        # complète est pire que pas de sauvegarde du tout.
        resp.raise_for_status()
        page = resp.json()
        if not isinstance(page, list):
            raise RuntimeError(f"{table}: réponse inattendue ({type(page).__name__})")
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="backup", help="dossier de destination")
    parser.add_argument("--dry-run", action="store_true", help="n'écrit aucun fichier")
    args = parser.parse_args()

    base_url = env_required("SUPABASE_URL").rstrip("/")
    service_key = env_required("SUPABASE_SERVICE_KEY")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    }

    if not args.dry_run:
        os.makedirs(args.out, exist_ok=True)

    counts = {}
    failures = []

    for table, order_col in TABLES.items():
        try:
            rows = fetch_table(base_url, headers, table, order_col)
        except Exception as exc:  # noqa: BLE001 — on veut le nom de la table dans le rapport
            print(f"   [FAIL] {table}: {exc}")
            failures.append(table)
            continue

        counts[table] = len(rows)
        print(f"   [OK]   {table}: {len(rows)} lignes")

        if not args.dry_run:
            path = os.path.join(args.out, f"{table}.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(rows, handle, ensure_ascii=False, indent=1, default=str)

    total = sum(counts.values())
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project_url": base_url,
        "tables": counts,
        "failed_tables": failures,
        "total_rows": total,
    }

    if not args.dry_run:
        with open(os.path.join(args.out, "manifest.json"), "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)

    print(f"\n{len(counts)}/{len(TABLES)} tables, {total} lignes au total")

    # Échouer bruyamment — c'est précisément le défaut relevé sur weekly_analysis
    # et sur les 4 pipelines RSS : un run vert qui n'a rien produit.
    if failures:
        print(f"FATAL: {len(failures)} table(s) en échec : {', '.join(failures)}")
        sys.exit(1)
    if total == 0:
        print("FATAL: sauvegarde vide — aucune ligne récupérée sur aucune table.")
        sys.exit(1)

    print("Sauvegarde complète.")


if __name__ == "__main__":
    main()
