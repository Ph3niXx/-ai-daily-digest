#!/usr/bin/env python3
"""TMDB tracker sync — rafraîchit les franchises films/séries de la médiathèque.

Jumeau de anime_tracker_sync.py pour la source TMDB. La traduction vers le
contrat AniList (airing_status, episodes_total, next_episode_*) duplique
volontairement cockpit/lib/tmdb.js : un pipeline Python ne peut pas importer
un module JS. Les deux implémentations sont verrouillées par des tests
miroirs — tests/test_tmdb_map.py et tests/test_tmdb_map.mjs. Si elles
divergent, c'est un test qui le dira.

NE PAS confondre avec pipelines/tmdb_sync.py, qui alimente `anime_articles`
pour le calendrier de l'onglet Veille. Les deux ne partagent que le secret.

Spec : docs/superpowers/specs/2026-07-25-mediatheque-films-series-ce-soir-design.md

Usage:
    TMDB_API_KEY=xxx SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
        python pipelines/tmdb_tracker_sync.py [--dry-run]

Sans TMDB_API_KEY : message [skip] et sortie 0 (le workflow ne casse pas).
"""
from __future__ import annotations
import argparse
import os
import sys
import time
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("FATAL: requests not installed. pip install -r pipelines/requirements-tmdb.txt")
    sys.exit(1)

from media_tracker_common import sb_env, sb_get, sb_upsert, sb_patch, diff_events

BASE = "https://api.themoviedb.org/3"
POSTER = "https://image.tmdb.org/t/p/w342"
BACKDROP = "https://image.tmdb.org/t/p/w780"
LANG = "fr-FR"
THROTTLE_S = 0.25          # TMDB tolère ~50 req/s ; on reste très en deçà.
RETRY_ON_429 = 3

# TMDB expose son statut au niveau SÉRIE (ou film), jamais saison.
# Défaut FINISHED plutôt que None : une valeur inconnue ne doit pas faire
# croire à released() qu'une saison diffuse encore.
STATUS = {
    "Returning Series": "RELEASING",
    "In Production": "RELEASING",
    "Ended": "FINISHED",
    "Released": "FINISHED",
    "Canceled": "CANCELLED",
    "Cancelled": "CANCELLED",
    "Planned": "NOT_YET_RELEASED",
    "Rumored": "NOT_YET_RELEASED",
    "Post Production": "NOT_YET_RELEASED",
}


def map_status(s):
    return STATUS.get(s, "FINISHED")


def img(path, base):
    return base + path if path else None


def strip_synopsis(text):
    if not text:
        return None
    return text.strip()[:2000] or None


# Toute lecture est bornée aux sources TMDB — symétrique de franchises_qs()
# dans anime_tracker_sync.py. Sans ce filtre, ce pipeline enverrait un
# source_root_id AniList à TMDB.
def franchises_qs():
    return ("source=in.(tmdb_movie,tmdb_tv)"
            "&select=id,source,source_root_id,title_english&order=added_at")


def entries_qs():
    return ("source=in.(tmdb_movie,tmdb_season)"
            "&select=id,franchise_id,source_id,airing_status,start_date&order=sort_order")


def to_franchise_row(detail, kind):
    is_tv = kind == "tv"
    return {
        "media_type": "tv" if is_tv else "movie",
        "source": "tmdb_tv" if is_tv else "tmdb_movie",
        "source_root_id": detail["id"],
        "title_romaji": None,
        "title_english": detail.get("name") if is_tv else detail.get("title"),
        "title_native": detail.get("original_name") if is_tv else detail.get("original_title"),
        "synopsis": strip_synopsis(detail.get("overview")),
        "genres": [g["name"] for g in (detail.get("genres") or [])],
        "cover_url": img(detail.get("poster_path"), POSTER),
        "banner_url": img(detail.get("backdrop_path"), BACKDROP),
    }


def _movie_rows(detail):
    status = map_status(detail.get("status"))
    return [{
        "source": "tmdb_movie",
        "source_id": detail["id"],
        "in_main_chain": True,
        "kind": "movie",
        "season_number": None,
        "title_romaji": None,
        "title_english": detail.get("title"),
        "title_native": detail.get("original_title"),
        "format": "MOVIE",
        "airing_status": status,
        "episodes_total": 1,
        # Renseignée même pour un film à sortir : c'est elle qui le fait
        # apparaître dans l'agenda via la branche « premiere » de buildWeek().
        "start_date": detail.get("release_date") or None,
        "end_date": detail.get("release_date") if status == "FINISHED" else None,
        "next_episode_number": None,
        "next_episode_airing_at": None,
        "cover_url": img(detail.get("poster_path"), POSTER),
        "runtime_minutes": detail.get("runtime"),
        "sort_order": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }]


def _tv_runtime(detail):
    """Durée d'un épisode.

    TMDB a vidé `episode_run_time` sur les séries modernes (constaté en live sur
    Severance et Dan Da Dan, 2026-07-25) : la durée ne vit plus que dans les
    épisodes. Sans ce repli, AUCUNE série n'aurait de durée et le filtre par
    budget de « Ce soir » serait inerte sur tout le catalogue séries.
    """
    declared = detail.get("episode_run_time") or []
    if declared and declared[0]:
        return declared[0]
    for key in ("last_episode_to_air", "next_episode_to_air"):
        ep = detail.get(key) or {}
        if ep.get("runtime"):
            return ep["runtime"]
    return None


def _last_numbered(seasons):
    """Repli quand next_episode_to_air omet son season_number."""
    numbered = [s for s in seasons if (s.get("season_number") or 0) >= 1]
    return numbered[-1]["season_number"] if numbered else None


def _tv_rows(detail):
    seasons = sorted(detail.get("seasons") or [], key=lambda s: s.get("season_number") or 0)
    if not seasons:
        return []

    show_status = map_status(detail.get("status"))
    runtime = _tv_runtime(detail)
    nxt = detail.get("next_episode_to_air") or None
    # « Returning Series » décrit la SÉRIE, pas une saison : une série entre
    # deux saisons reste « Returning ». La seule preuve qu'une saison diffuse
    # en ce moment est l'existence d'un next_episode_to_air, qui désigne
    # lui-même sa saison — pas forcément la dernière listée, puisqu'une saison
    # future peut déjà figurer au catalogue.
    airing_season = None
    if nxt:
        airing_season = nxt.get("season_number")
        if airing_season is None:
            airing_season = _last_numbered(seasons)
    today = datetime.now(timezone.utc).date().isoformat()

    rows = []
    for i, s in enumerate(seasons):
        number = s.get("season_number") or 0
        is_special = number == 0
        is_airing = not is_special and airing_season is not None and number == airing_season
        # Statut dérivé des faits de la saison elle-même, jamais propagé depuis
        # la série : sans date, sans épisode, ou datée dans le futur => annoncée.
        if is_airing:
            status = "RELEASING"
        elif not s.get("air_date") or s["air_date"] > today or not s.get("episode_count"):
            status = "NOT_YET_RELEASED"
        elif show_status == "CANCELLED":
            status = "CANCELLED"
        else:
            status = "FINISHED"
        airing = bool(is_airing and nxt)
        rows.append({
            "source": "tmdb_season",
            "source_id": s["id"],
            "in_main_chain": not is_special,
            "kind": "special" if is_special else "season",
            "season_number": None if is_special else number,
            "title_romaji": None,
            "title_english": s.get("name") or ("Spéciaux" if is_special else f"Saison {number}"),
            "title_native": None,
            "format": "TV",
            "airing_status": status,
            "episodes_total": s.get("episode_count"),
            "start_date": s.get("air_date") or None,
            "end_date": None,
            "next_episode_number": nxt.get("episode_number") if airing else None,
            # air_date est une date nue : ancrée explicitement en UTC pour que
            # l'ISO stocké soit stable quel que soit le fuseau.
            "next_episode_airing_at": (
                f"{nxt['air_date']}T00:00:00+00:00" if airing and nxt.get("air_date") else None
            ),
            "cover_url": img(s.get("poster_path"), POSTER) or img(detail.get("poster_path"), POSTER),
            "runtime_minutes": runtime,
            # Les spéciaux passent en queue : hors chaîne, ils ne doivent jamais
            # être choisis comme « saison courante ».
            "sort_order": 999 if is_special else (number or i + 1),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    return rows


def to_entry_rows(detail, kind):
    return _tv_rows(detail) if kind == "tv" else _movie_rows(detail)


def tmdb_get(path, api_key):
    for _ in range(RETRY_ON_429):
        r = requests.get(f"{BASE}{path}",
                         params={"api_key": api_key, "language": LANG}, timeout=30)
        if r.status_code == 429:
            time.sleep(float(r.headers.get("Retry-After", 1)))
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"TMDB: 429 persistant sur {path}")


def run_sync(dry_run):
    api_key = os.environ.get("TMDB_API_KEY")
    if not api_key:
        print("[skip] TMDB_API_KEY absent — rien a faire. "
              "Enregistre-toi sur https://developer.themoviedb.org/ et pose le secret.")
        return 0

    url, headers = sb_env()
    franchises = sb_get(url, headers, "media_franchises", franchises_qs())
    entries = sb_get(url, headers, "media_entries", entries_qs())

    by_franchise = {}
    for e in entries:
        by_franchise.setdefault(e["franchise_id"], []).append(e)
    print(f"TMDB sync: {len(franchises)} franchises, {len(entries)} entrées, dry_run={dry_run}")

    total_new, total_events = 0, 0
    for fr in franchises:
        name = fr.get("title_english") or fr["id"]
        kind = "tv" if fr["source"] == "tmdb_tv" else "movie"
        try:
            detail = tmdb_get(f"/{kind}/{fr['source_root_id']}", api_key)
        except Exception as exc:
            # Même contrat que le sync anime : une franchise qui échoue est
            # sautée, jamais fatale — elle est rattrapée au prochain run.
            print(f"  WARN {name}: fetch KO ({exc}) — franchise sautée")
            continue
        time.sleep(THROTTLE_S)

        fresh_rows = [{**r, "franchise_id": fr["id"]} for r in to_entry_rows(detail, kind)]
        old_by_sid = {e["source_id"]: e for e in by_franchise.get(fr["id"], [])}
        events = diff_events(fr, old_by_sid, fresh_rows)
        new_count = sum(1 for r in fresh_rows if r["source_id"] not in old_by_sid)
        print(f"  {name}: {len(fresh_rows)} entrées ({new_count} nouvelles), {len(events)} événement(s)")
        total_new += new_count
        total_events += len(events)

        if dry_run:
            for ev in events:
                print(f"    [dry-run] {ev[0]}: {ev[1]}")
            continue

        try:
            saved = sb_upsert(url, headers, "media_entries", fresh_rows, "source,source_id")
            id_by_sid = {r["source_id"]: r["id"] for r in saved}
            release_rows = [{
                "franchise_id": fr["id"],
                "entry_id": id_by_sid.get(sid),
                "event_type": etype,
                "title": title,
                "event_date": edate,
            } for (etype, title, edate, sid) in events if id_by_sid.get(sid)]
            sb_upsert(url, headers, "media_releases", release_rows,
                      "entry_id,event_type", ignore_dupes=True)
            root = to_franchise_row(detail, kind)
            sb_patch(url, headers, "media_franchises", f"id=eq.{fr['id']}", {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "synopsis": root["synopsis"],
                "cover_url": root["cover_url"],
            })
        except Exception as exc:
            print(f"  WARN {name}: écriture Supabase KO ({exc}) — franchise sautée")
            continue

    print(f"\nDone. {total_new} nouvelles entrées, {total_events} événements.")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Sync TMDB des films et séries suivis.")
    p.add_argument("--dry-run", action="store_true", help="aucune écriture")
    sys.exit(run_sync(p.parse_args().dry_run))
