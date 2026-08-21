#!/usr/bin/env python3
"""
Sauvegarde des données irremplaçables de Supabase → fichiers JSON.

Audit du 2026-08-15, vague 0 : le projet accumulait quatre mois de données
irremplaçables sans aucune sauvegarde (26 workflows, zéro dump/export).

Critère du périmètre : ce qu'aucun pipeline ne sait refabriquer À L'IDENTIQUE.

Le « à l'identique » a été ajouté le 2026-08-21 parce que la première version du
critère se lisait en regardant QUI produit la donnée — pipeline = refabriquable,
utilisateur = non — sans se demander si le producteur est encore capable de
reproduire la même chose. Il ne l'est pas dès que la donnée est datée : un
pipeline qui relit un flux RSS aujourd'hui n'y retrouve pas les items d'il y a
trois mois, il n'écrirait qu'un brief d'aujourd'hui. Sont donc dans le périmètre
en plus des saisies utilisateur : `daily_briefs`, `signal_tracking` (produites
par main.py, mais depuis des flux dont les items disparaissent),
`usage_events` (seule mesure de ce qui est réellement ouvert, horodatée, et
qu'aucun pipeline ne reconstruit) et `jarvis_conversations`.

Restent exclus les corpus qu'un pipeline sait re-remplir avec le même contenu
depuis une source qui, elle, ne s'efface pas : scrobbles Last.fm, bibliothèque
Steam, catalogues TMDB/IGDB/AniList, index vectoriel de Jarvis.

Comportement voulu face aux tables vides ou absentes, à ne pas « corriger » :
une table absente (404 PostgREST) fait échouer le run — un renommage ou un DROP
silencieux doit être bruyant, sinon la sauvegarde rétrécit sans prévenir. Une
table légitimement vide, elle, vaut 0 ligne et n'est pas un échec : le run ne
sort en 1 que si TOUTES les tables sont vides (sauvegarde blanche).

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
    # Daté, donc non refabricable à l'identique (ajouté le 2026-08-21).
    # Volumes relevés en base ce jour-là : usage_events 3 561 lignes / ~610 ko
    # de JSON, signal_tracking 522, daily_briefs 136, jarvis_conversations 102.
    # Aucune ne pèse assez pour gêner l'artefact GitHub.
    "usage_events": "id",
    "daily_briefs": "date",  # PK = la date du brief, pas un id
    "signal_tracking": "id",
    "jarvis_conversations": "id",
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
