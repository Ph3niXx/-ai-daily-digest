#!/usr/bin/env python3
"""Traduction IGDB -> lignes game_titles, et detection d'evenements.

Module PUR : aucun appel reseau, aucun secret. Tout ce qui touche a IGDB
en tant qu'API vit dans igdb_client.py. Verrouille par tests/test_igdb_map.py.

Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md
"""
from __future__ import annotations
from datetime import datetime, timezone

COVER_BASE = "https://images.igdb.com/igdb/image/upload/t_cover_big/"

# Game.status — enum verifiee le 2026-08-12 contre les types generes depuis
# les docs officielles (github.com/DmitryScaletta/igdb-api-types).
STATUS = {
    0: "released", 2: "alpha", 3: "beta", 4: "early_access",
    5: "offline", 6: "cancelled", 7: "rumored", 8: "delisted",
}

# ReleaseDate.date_format — ids historiques de ReleaseDateCategoryEnum.
# A confirmer contre GET /v4/date_formats au premier run (voir Task 4, Step 6).
PRECISION = {
    0: "day", 1: "month", 2: "year",
    3: "quarter", 4: "quarter", 5: "quarter", 6: "quarter",
    7: "tbd",
}


def map_status(value):
    """IGDB omet `status` sur la majorite des jeux sortis : l'absence vaut released."""
    return STATUS.get(value, "released")


def map_precision(date_format_id):
    return PRECISION.get(date_format_id, "tbd")


def cover_url(cover):
    if not cover or not cover.get("image_id"):
        return None
    return f"{COVER_BASE}{cover['image_id']}.jpg"


def _iso_date(ts):
    """Timestamp Unix IGDB -> date ISO. Ancree en UTC pour etre stable
    quel que soit le fuseau de la machine qui fait tourner le pipeline."""
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()


def _names(items):
    return [x["name"] for x in (items or []) if x.get("name")]


def _earliest_release(game):
    """La date de reference et sa precision.

    first_release_date donne le timestamp mais pas la precision : un jeu
    annonce « 2027 » porte quand meme un timestamp (au 1er janvier). C'est
    release_dates qui dit s'il s'agit d'un jour, d'un trimestre ou d'une
    annee — sans quoi l'UI afficherait « 1 janvier 2027 » pour un jeu dont
    on ne sait que l'annee.
    """
    dates = sorted(
        [d for d in (game.get("release_dates") or []) if d.get("date")],
        key=lambda d: d["date"],
    )
    if dates:
        first = dates[0]
        return _iso_date(first["date"]), first.get("human"), map_precision(first.get("date_format"))
    ts = game.get("first_release_date")
    # first_release_date est le minimum des release_dates ; sans date_format
    # correspondant, on ne connait que l'annee. Sous-affirmer (year) est sans
    # danger, sur-affirmer (day) invente une information.
    precision = "year" if ts else "tbd"
    return _iso_date(ts), None, precision


def to_title_row(game):
    """Une ligne game_titles, franchise_id exclu (ajoute par l'appelant)."""
    iso, human, precision = _earliest_release(game)
    return {
        "igdb_id": game["id"],
        "name": game.get("name") or f"#{game['id']}",
        "slug": game.get("slug"),
        "summary": (game.get("summary") or "").strip()[:2000] or None,
        "cover_url": cover_url(game.get("cover")),
        "genres": _names(game.get("genres")),
        "platforms": _names(game.get("platforms")),
        "igdb_status": map_status(game.get("status")),
        "first_release_date": iso,
        "release_human": human,
        "release_precision": precision,
        "hypes": game.get("hypes"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def diff_game_events(old_by_igdb_id, fresh_rows):
    """Compare l'etat DB aux lignes fraiches -> [(event_type, title, event_date, igdb_id)].

    L'appelant est responsable de NE PAS appeler cette fonction pour une
    franchise dont bootstrapped_at est null : au premier peuplement, tous
    ses titres sont « inedits » et l'inondation serait garantie.
    """
    events = []
    for row in fresh_rows:
        gid = row["igdb_id"]
        old = old_by_igdb_id.get(gid)
        label = row.get("name") or f"#{gid}"
        date = row.get("first_release_date")

        if old is None:
            # Un jeu deja sorti qui apparait pour la premiere fois n'est pas
            # une annonce : c'est un frere de collection decouvert au fil de
            # l'eau. Seul ce qui n'est pas encore sorti merite une alerte.
            if row.get("igdb_status") != "released":
                events.append(("announced", f"Annoncé : {label}", date, gid))
            continue

        if not old.get("first_release_date") and date:
            events.append(("date_announced", f"Date annoncée : {label} — {date}", date, gid))
        if old.get("igdb_status") != "released" and row.get("igdb_status") == "released":
            events.append(("released", f"Sorti : {label}", date, gid))
        if old.get("igdb_status") != "cancelled" and row.get("igdb_status") == "cancelled":
            events.append(("cancelled", f"Annulé : {label}", None, gid))
    return events
