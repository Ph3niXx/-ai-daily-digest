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


TERMINAL_STATUS = ("cancelled", "delisted", "offline")
UPCOMING_MIN_HYPES = 20   # sans date, seul un titre reellement attendu compte


def is_upcoming(row, today):
    """Vrai si le titre n'est pas encore sorti.

    **La date fait foi, pas `status`.** IGDB laisse `status` a NULL sur la
    grande majorite de son catalogue, y compris les jeux a venir, et
    `map_status()` retombe alors sur « released ». S'y fier classait donc
    « sorti » des jeux qui sortent en 2026 et 2027 — constate en production
    le 2026-08-13 sur Marvel's Wolverine (sept. 2026), Trails in the Sky
    2nd Chapter (sept. 2026) et God of War Laufey (fev. 2027), tous invisibles
    alors qu'ils sont exactement ce que le tracker existe pour annoncer.

    `status` ne sert plus qu'a ecarter les impasses (annule, retire, serveurs
    fermes) : « Annonce : Mass Effect Corsair » pour un jeu annule serait faux.

    Sans date, IGDB melange les annonces sans calendrier (« Untitled God of
    War Sequel ») et de vieilles fiches mortes (« CivWorld ») ; `hypes`, le
    nombre de gens qui suivent le titre, est ce qui les separe.
    """
    if row.get("igdb_status") in TERMINAL_STATUS:
        return False
    date = row.get("first_release_date")
    if date:
        return str(date) > str(today)
    return (row.get("hypes") or 0) >= UPCOMING_MIN_HYPES


def upcoming_events(fresh_rows, today):
    """Les titres pas encore sortis, sous forme d'evenements `announced`.

    Emis a CHAQUE run, y compris au peuplement initial d'une licence — et
    c'est voulu. Un jeu a venir dans une licence qu'on aime est la nouvelle
    qu'on attend, qu'il ait ete decouvert aujourd'hui ou il y a un mois ;
    l'etouffer au bootstrap laissait l'ecran vide alors que sept titres
    reels attendaient. L'unicite `(title_id, event_type)` en base fait que
    chaque titre ne le dit qu'une fois, jamais deux, et un evenement
    acquitte ne revient pas.
    """
    return [("announced", f"À venir : {r.get('name') or '#' + str(r['igdb_id'])}",
             r.get("first_release_date"), r["igdb_id"])
            for r in fresh_rows if is_upcoming(r, today)]


def diff_game_events(old_by_igdb_id, fresh_rows, today=None):
    """Compare l'etat DB aux lignes fraiches -> [(event_type, title, event_date, igdb_id)].

    Ne couvre que les TRANSITIONS (date qui tombe, sortie, annulation). Ce qui
    est simplement « pas encore sorti » releve de upcoming_events(), qui n'a
    pas besoin d'un etat anterieur pour le dire.

    L'appelant est responsable de NE PAS appeler cette fonction pour une
    franchise dont bootstrapped_at est null : au premier peuplement, tous
    ses titres sont « inedits » et l'inondation serait garantie.
    """
    if today is None:
        today = datetime.now(timezone.utc).date().isoformat()
    events = []
    for row in fresh_rows:
        gid = row["igdb_id"]
        old = old_by_igdb_id.get(gid)
        label = row.get("name") or f"#{gid}"
        date = row.get("first_release_date")

        if old is None:
            # Un titre inedit ne produit rien ici : s'il est a venir,
            # upcoming_events() s'en charge ; s'il est deja sorti, c'est un
            # frere de collection decouvert au fil de l'eau, et l'annoncer
            # serait faux.
            continue

        if not old.get("first_release_date") and date:
            events.append(("date_announced", f"Date annoncée : {label} — {date}", date, gid))
        if old.get("igdb_status") != "released" and row.get("igdb_status") == "released":
            events.append(("released", f"Sorti : {label}", date, gid))
        if old.get("igdb_status") != "cancelled" and row.get("igdb_status") == "cancelled":
            events.append(("cancelled", f"Annulé : {label}", None, gid))
    return events
