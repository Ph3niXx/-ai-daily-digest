#!/usr/bin/env python3
"""IGDB tracker sync — bibliotheque de jeux, licences suivies, sorties annoncees.

Quatre phases :
  A. seed  — les jeux Steam joues deviennent des game_titles, via external_games
  B. refresh — les collections `watched` sont re-remontees depuis IGDB
  C. diff  — les changements deviennent des game_releases
  D. duree — game_time_to_beat pour les titres qui n'en ont pas

N'ecrit JAMAIS game_progress : c'est la table de l'utilisateur.

Reutilise le transport Supabase de media_tracker_common (sb_get / sb_upsert /
sb_patch) mais PAS diff_events, qui parle episodes et statuts de diffusion.

Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md

Usage:
    TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy \
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
        python pipelines/igdb_tracker_sync.py [--dry-run] [--import-wishlist]

Sans les secrets Twitch : message [skip] et sortie 0.
"""
from __future__ import annotations
import argparse
import os
import sys
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("FATAL: requests not installed. pip install -r pipelines/requirements-igdb.txt")
    sys.exit(1)

from media_tracker_common import sb_env, sb_get, sb_upsert, sb_patch
from igdb_client import get_token, IgdbClient, chunks, id_list, quoted_list
from igdb_map import to_title_row, diff_game_events

STEAM_SOURCE = 1          # ExternalGameCategoryEnum.steam
SEED_MIN_MINUTES = 1      # tout jeu lance au moins une fois entre en bibliotheque
WATCH_MIN_MINUTES = 600   # >= 10 h : la licence passe sous surveillance
MAX_TITLES_PER_COLLECTION = 100
MAX_TTB_PER_RUN = 50

GAME_FIELDS = ("fields id,name,slug,summary,status,hypes,first_release_date,"
               "cover.image_id,genres.name,platforms.name,collection,"
               "release_dates.date,release_dates.human,release_dates.date_format;")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Phase A : seed depuis Steam ─────────────────────────────
def steam_appids(url, headers):
    """Les jeux Steam lances au moins une fois, dans le snapshot le plus recent."""
    rows = sb_get(url, headers, "steam_games_snapshot",
                  "select=appid,name,playtime_forever_minutes,snapshot_date"
                  "&order=snapshot_date.desc&limit=2000")
    if not rows:
        return {}
    latest = rows[0]["snapshot_date"]
    return {r["appid"]: r.get("playtime_forever_minutes") or 0
            for r in rows
            if r["snapshot_date"] == latest
            and (r.get("playtime_forever_minutes") or 0) >= SEED_MIN_MINUTES}


def resolve_steam(client, appids):
    """appid Steam -> id IGDB, via external_games. Retourne {appid: igdb_id}.

    `category` est marque deprecated par IGDB au profit de
    `external_game_source`, mais reste servi. Si une requete revient
    systematiquement vide alors que les appids sont valides, basculer sur
    `where external_game_source = 1` — le champ, pas la valeur, a change.
    """
    out = {}
    for batch in chunks(sorted(appids), 100):
        rows = client.query("external_games",
                            f"fields game,uid; where category = {STEAM_SOURCE} "
                            f"& uid = {quoted_list(batch)}; limit 500;")
        for r in rows:
            uid, game = r.get("uid"), r.get("game")
            if uid is None or game is None:
                continue
            try:
                out[int(uid)] = game
            except (TypeError, ValueError):
                continue
    return out


def fetch_games(client, igdb_ids):
    games = []
    for batch in chunks(sorted(igdb_ids), 100):
        games += client.query("games",
                              f"{GAME_FIELDS} where id = {id_list(batch)}; limit 500;")
    return games


def fetch_collections(client, collection_ids):
    out = {}
    for batch in chunks(sorted(collection_ids), 50):
        for c in client.query("collections",
                              f"fields id,name,slug; where id = {id_list(batch)}; limit 500;"):
            out[c["id"]] = c
    return out


def upsert_franchise(url, headers, name, collection_id, watched):
    """Une franchise par collection IGDB ; les jeux sans collection en ont une
    a eux seuls (igdb_collection_id null), donc pas de contrainte d'unicite
    exploitable : on cherche d'abord par nom."""
    if collection_id is not None:
        rows = sb_upsert(url, headers, "game_franchises", [{
            "igdb_collection_id": collection_id,
            "name": name,
            "updated_at": now_iso(),
        }], "igdb_collection_id")
        row = rows[0]
    else:
        existing = sb_get(url, headers, "game_franchises",
                          f"igdb_collection_id=is.null&name=eq.{requests.utils.quote(name)}"
                          "&select=id,bootstrapped_at,watched&limit=1")
        if existing:
            row = existing[0]
        else:
            row = sb_upsert(url, headers, "game_franchises",
                            [{"name": name, "updated_at": now_iso()}], "id")[0]
    if watched and not row.get("watched"):
        sb_patch(url, headers, "game_franchises", f"id=eq.{row['id']}", {"watched": True})
        row["watched"] = True
    return row


# Le parametre s'appelle import_wishlist_flag et non import_wishlist : sinon
# il masquerait la fonction import_wishlist() ajoutee a la Task 6.
def run_sync(dry_run, import_wishlist_flag=False):
    cid = os.environ.get("TWITCH_CLIENT_ID")
    secret = os.environ.get("TWITCH_CLIENT_SECRET")
    if not cid or not secret:
        print("[skip] TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET absents — rien a faire. "
              "Cree une application sur https://dev.twitch.tv/console/apps.")
        return 0

    url, headers = sb_env()
    client = IgdbClient(cid, get_token(cid, secret))

    known_franchises = sb_get(url, headers, "game_franchises",
                              "select=id,igdb_collection_id,name,watched,bootstrapped_at")
    # steam_appid est INDISPENSABLE ici : c'est lui qui dit quels appids sont
    # deja connus. Sans cette colonne, la phase A re-resout les 80 memes jeux
    # a chaque run et brule du quota IGDB pour rien.
    known_titles = sb_get(url, headers, "game_titles",
                          "select=id,franchise_id,igdb_id,igdb_status,"
                          "first_release_date,name,steam_appid")
    titles_by_igdb = {t["igdb_id"]: t for t in known_titles}
    # Fige l'etat AVANT ce run : une franchise peuplee pendant ce run ne doit
    # pas emettre d'evenement, meme si on la relit plus tard dans la boucle.
    bootstrapped_before = {f["id"] for f in known_franchises if f.get("bootstrapped_at")}

    print(f"IGDB sync: {len(known_franchises)} franchises, {len(known_titles)} titres, "
          f"dry_run={dry_run}")

    # ── Phase A : seed Steam ────────────────────────────────
    playtime = steam_appids(url, headers)
    unknown = {a for a in playtime if not any(
        t.get("steam_appid") == a for t in known_titles)}
    seeded = 0
    if unknown:
        mapping = resolve_steam(client, unknown)
        missing = sorted(unknown - set(mapping))
        if missing:
            print(f"  {len(missing)} appid(s) Steam inconnus d'IGDB, ignores : {missing[:10]}")
        games = fetch_games(client, set(mapping.values()))
        by_igdb = {g["id"]: g for g in games}
        collections = fetch_collections(
            client, {g["collection"] for g in games if g.get("collection")})

        appid_by_igdb = {v: k for k, v in mapping.items()}
        for gid, game in by_igdb.items():
            appid = appid_by_igdb.get(gid)
            minutes = playtime.get(appid, 0)
            cid_col = game.get("collection")
            fname = (collections.get(cid_col) or {}).get("name") or game.get("name") or f"#{gid}"
            if dry_run:
                print(f"    [dry-run] seed {game.get('name')} -> licence {fname} "
                      f"({minutes} min, watched={minutes >= WATCH_MIN_MINUTES})")
                continue
            fr = upsert_franchise(url, headers, fname, cid_col,
                                  minutes >= WATCH_MIN_MINUTES)
            row = {**to_title_row(game), "franchise_id": fr["id"], "steam_appid": appid}
            sb_upsert(url, headers, "game_titles", [row], "igdb_id")
            if not fr.get("bootstrapped_at"):
                sb_patch(url, headers, "game_franchises", f"id=eq.{fr['id']}",
                         {"bootstrapped_at": now_iso()})
            seeded += 1
        print(f"  Phase A: {seeded} jeu(x) Steam ajoute(s)")
    else:
        print("  Phase A: rien de nouveau cote Steam")

    if dry_run:
        print("\n[dry-run] phases B/C/D non executees (elles dependent des ecritures de A).")
        return 0

    # ── Phases B et C : refresh + diff ──────────────────────
    watched = sb_get(url, headers, "game_franchises",
                     "watched=eq.true&igdb_collection_id=not.is.null"
                     "&select=id,igdb_collection_id,name,bootstrapped_at")
    total_events = 0
    for fr in watched:
        try:
            games = client.query("games",
                                 f"{GAME_FIELDS} where collection = {fr['igdb_collection_id']}; "
                                 f"sort first_release_date desc; limit {MAX_TITLES_PER_COLLECTION};")
        except Exception as exc:
            print(f"  WARN {fr['name']}: fetch KO ({exc}) — licence sautee")
            continue
        if len(games) >= MAX_TITLES_PER_COLLECTION:
            print(f"  WARN {fr['name']}: collection plafonnee a "
                  f"{MAX_TITLES_PER_COLLECTION} titres — des titres anciens sont ignores")

        fresh = [{**to_title_row(g), "franchise_id": fr["id"]} for g in games]
        old = {gid: t for gid, t in titles_by_igdb.items()
               if t["franchise_id"] == fr["id"]}

        try:
            saved = sb_upsert(url, headers, "game_titles", fresh, "igdb_id")
        except Exception as exc:
            print(f"  WARN {fr['name']}: ecriture KO ({exc}) — licence sautee")
            continue

        if fr["id"] not in bootstrapped_before:
            sb_patch(url, headers, "game_franchises", f"id=eq.{fr['id']}",
                     {"bootstrapped_at": now_iso()})
            print(f"  {fr['name']}: {len(fresh)} titres (peuplement initial, aucun evenement)")
            continue

        events = diff_game_events(old, fresh)
        if events:
            id_by_igdb = {r["igdb_id"]: r["id"] for r in saved}
            sb_upsert(url, headers, "game_releases", [{
                "franchise_id": fr["id"],
                "title_id": id_by_igdb.get(gid),
                "event_type": etype,
                "title": title,
                "event_date": edate,
            } for (etype, title, edate, gid) in events if id_by_igdb.get(gid)],
                "title_id,event_type", ignore_dupes=True)
        total_events += len(events)
        print(f"  {fr['name']}: {len(fresh)} titres, {len(events)} evenement(s)")

    # ── Phase D : duree de jeu ──────────────────────────────
    sans_ttb = sb_get(url, headers, "game_titles",
                      f"time_to_beat_minutes=is.null&select=id,igdb_id&limit={MAX_TTB_PER_RUN}")
    if sans_ttb:
        by_igdb = {t["igdb_id"]: t["id"] for t in sans_ttb}
        rows = client.query("game_time_to_beats",
                            f"fields game_id,normally; where game_id = {id_list(list(by_igdb))}; "
                            f"limit 500;")
        patched = 0
        for r in rows:
            tid = by_igdb.get(r.get("game_id"))
            if tid and r.get("normally"):
                sb_patch(url, headers, "game_titles", f"id=eq.{tid}",
                         {"time_to_beat_minutes": int(r["normally"] // 60)})
                patched += 1
        print(f"  Phase D: {patched} duree(s) renseignee(s)")

    print(f"\nDone. {seeded} jeux seedes, {total_events} evenements, "
          f"{client.calls} appels IGDB.")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Sync IGDB du tracker jeux.")
    p.add_argument("--dry-run", action="store_true", help="aucune ecriture")
    p.add_argument("--import-wishlist", action="store_true",
                   help="importe gaming_wishlist dans game_progress (one-shot)")
    args = p.parse_args()
    sys.exit(run_sync(args.dry_run, args.import_wishlist))
