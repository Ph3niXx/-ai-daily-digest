"""Socle partagé des syncs de la médiathèque (AniList, TMDB).

Ces fonctions ne connaissent AUCUNE source : diff_events compare des lignes
déjà normalisées au contrat commun (source_id, kind, airing_status,
start_date), et les helpers Supabase sont du transport pur. Toute logique
spécifique à une API reste dans le pipeline qui la porte.

Extrait de pipelines/anime_tracker_sync.py sans réécriture — voir
tests/test_media_tracker_common.py qui verrouille le comportement.
"""
import os
import sys

import requests


# ── Supabase REST (service key) ─────────────────────────────────
def sb_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("FATAL: SUPABASE_URL / SUPABASE_SERVICE_KEY manquants")
        sys.exit(1)
    return url, {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def sb_get(url, headers, table, qs):
    r = requests.get(f"{url}/rest/v1/{table}?{qs}", headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_upsert(url, headers, table, rows, on_conflict, ignore_dupes=False):
    if not rows:
        return []
    prefer = "resolution=ignore-duplicates" if ignore_dupes else "resolution=merge-duplicates"
    h = {**headers, "Prefer": f"{prefer},return=representation"}
    r = requests.post(f"{url}/rest/v1/{table}?on_conflict={on_conflict}", headers=h, json=rows, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_patch(url, headers, table, qs, body):
    r = requests.patch(f"{url}/rest/v1/{table}?{qs}", headers=headers, json=body, timeout=30)
    r.raise_for_status()


# ── Détection d'événements ──────────────────────────────────────
def diff_events(franchise, old_by_source_id, fresh_rows):
    """Compare l'état DB aux lignes fraîches -> [(event_type, title, event_date, source_id)]."""
    events = []
    for row in fresh_rows:
        sid = row["source_id"]
        old = old_by_source_id.get(sid)
        label = row.get("title_english") or row.get("title_romaji") or f"#{sid}"
        if old is None:
            what = "Nouvelle saison annoncée" if row["kind"] == "season" else (
                "Nouveau film" if row["kind"] == "movie" else "Nouvelle entrée")
            events.append(("new_entry", f"{what} : {label}", row.get("start_date"), sid))
            continue
        if old.get("airing_status") != "RELEASING" and row.get("airing_status") == "RELEASING":
            events.append(("airing_started", f"Diffusion commencée : {label}", row.get("start_date"), sid))
        if not old.get("start_date") and row.get("start_date"):
            events.append(("date_announced", f"Date annoncée : {label} — {row['start_date']}", row["start_date"], sid))
    return events
