"""La traduction TMDB cote pipeline doit coller a celle de cockpit/lib/tmdb.js.
Run: python tests/test_tmdb_map.py

Jumeau de tests/test_tmdb_map.mjs : memes cas, memes attendus. Un ecart entre
les deux signale que les implementations du meme contrat ont derive.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from tmdb_tracker_sync import map_status, to_entry_rows, to_franchise_row

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


check("status: Returning Series", map_status("Returning Series"), "RELEASING")
check("status: In Production", map_status("In Production"), "RELEASING")
check("status: Ended", map_status("Ended"), "FINISHED")
check("status: Canceled", map_status("Canceled"), "CANCELLED")
check("status: Planned", map_status("Planned"), "NOT_YET_RELEASED")
check("status: Rumored", map_status("Rumored"), "NOT_YET_RELEASED")
check("status: inconnu => FINISHED, pas None", map_status("Zorglub"), "FINISHED")

TV = {
    "id": 1396, "name": "Breaking Bad", "original_name": "Breaking Bad",
    "overview": "Un prof de chimie.", "genres": [{"name": "Drame"}],
    "poster_path": "/p.jpg", "backdrop_path": "/b.jpg",
    "status": "Returning Series", "episode_run_time": [47],
    "next_episode_to_air": {"episode_number": 3, "air_date": "2026-08-02"},
    "seasons": [
        {"season_number": 0, "episode_count": 4, "air_date": "2008-01-01", "id": 900},
        {"season_number": 1, "episode_count": 7, "air_date": "2008-01-20", "id": 901},
        {"season_number": 2, "episode_count": 13, "air_date": "2009-03-08", "id": 902},
    ],
}
TV_ROWS = to_entry_rows(TV, "tv")
by_season = {r["season_number"]: r for r in TV_ROWS}

check("tv: une entree par saison, saison 0 comprise", len(TV_ROWS), 3)
check("tv: saison 0 => special hors chaine principale",
      [r["in_main_chain"] for r in TV_ROWS if r["kind"] == "special"], [False])
check("tv: saisons numerotees => kind season",
      len([r for r in TV_ROWS if r["kind"] == "season"]), 2)
check("tv: source discrimine le namespace des saisons", TV_ROWS[0]["source"], "tmdb_season")
check("tv: episodes_total depuis episode_count", by_season[2]["episodes_total"], 13)
check("tv: runtime depuis episode_run_time", by_season[2]["runtime_minutes"], 47)
check("tv: la derniere saison herite du statut de la serie",
      by_season[2]["airing_status"], "RELEASING")
check("tv: les saisons precedentes sont FINISHED", by_season[1]["airing_status"], "FINISHED")
check("tv: next_episode accroche a la seule saison en diffusion",
      [r["season_number"] for r in TV_ROWS if r["next_episode_number"] is not None], [2])
check("tv: next_episode_airing_at porte la date TMDB",
      by_season[2]["next_episode_airing_at"][:10], "2026-08-02")
check("tv: les speciaux passent en queue de tri",
      [r["sort_order"] for r in TV_ROWS if r["kind"] == "special"], [999])
check("tv: serie sans saison => aucune entree", to_entry_rows({**TV, "seasons": []}, "tv"), [])

TV_FR = to_franchise_row(TV, "tv")
check("tv: media_type", TV_FR["media_type"], "tv")
check("tv: source", TV_FR["source"], "tmdb_tv")
check("tv: source_root_id", TV_FR["source_root_id"], 1396)
check("tv: cover_url prefixee", TV_FR["cover_url"], "https://image.tmdb.org/t/p/w342/p.jpg")
check("tv: banner_url prefixee", TV_FR["banner_url"], "https://image.tmdb.org/t/p/w780/b.jpg")
check("tv: genres aplatis", TV_FR["genres"], ["Drame"])
check("poster absent => None, pas une URL cassee",
      to_franchise_row({**TV, "poster_path": None}, "tv")["cover_url"], None)

MOVIE = {
    "id": 550, "title": "Fight Club", "original_title": "Fight Club",
    "overview": "Un narrateur insomniaque.", "genres": [{"name": "Drame"}],
    "poster_path": "/f.jpg", "backdrop_path": None,
    "status": "Released", "release_date": "1999-10-15", "runtime": 139,
}
M_ROWS = to_entry_rows(MOVIE, "movie")
check("film: une seule entree", len(M_ROWS), 1)
check("film: kind movie", M_ROWS[0]["kind"], "movie")
check("film: episodes_total = 1", M_ROWS[0]["episodes_total"], 1)
check("film: source", M_ROWS[0]["source"], "tmdb_movie")
check("film: runtime", M_ROWS[0]["runtime_minutes"], 139)
check("film sorti => FINISHED", M_ROWS[0]["airing_status"], "FINISHED")
check("film: dans la chaine principale", M_ROWS[0]["in_main_chain"], True)
check("film sans runtime => None, jamais 0",
      to_entry_rows({**MOVIE, "runtime": None}, "movie")[0]["runtime_minutes"], None)

FUTURE = {**MOVIE, "status": "Post Production", "release_date": "2027-03-01"}
check("film a sortir => NOT_YET_RELEASED",
      to_entry_rows(FUTURE, "movie")[0]["airing_status"], "NOT_YET_RELEASED")
check("film a sortir => start_date renseignee pour l'agenda",
      to_entry_rows(FUTURE, "movie")[0]["start_date"], "2027-03-01")
check("film a sortir => end_date vide",
      to_entry_rows(FUTURE, "movie")[0]["end_date"], None)

# ── Formes REELLES de l'API (relevees en live le 2026-07-25) ───
# Trouvees en interrogeant l'API, pas en ecrivant des fixtures : TMDB a vide
# episode_run_time sur les series modernes, et « Returning Series » ne veut PAS
# dire qu'une saison diffuse en ce moment.

DANDADAN = {
    "id": 240411, "name": "DAN DA DAN", "original_name": "ダンダダン",
    "overview": "…", "genres": [], "poster_path": "/d.jpg", "backdrop_path": None,
    "status": "Returning Series", "episode_run_time": [],
    "next_episode_to_air": None,
    "last_episode_to_air": {"season_number": 1, "episode_number": 24,
                            "air_date": "2025-09-19", "runtime": 24},
    "seasons": [{"season_number": 1, "episode_count": 24, "air_date": "2024-10-04", "id": 380001}],
}
DD = to_entry_rows(DANDADAN, "tv")
check("live: episode_run_time vide => repli sur last_episode_to_air.runtime",
      DD[0]["runtime_minutes"], 24)
check("live: « Returning Series » SANS next_episode => la saison sortie est FINISHED",
      DD[0]["airing_status"], "FINISHED")

SEVERANCE = {
    "id": 95396, "name": "Severance", "original_name": "Severance",
    "overview": "…", "genres": [], "poster_path": "/s.jpg", "backdrop_path": None,
    "status": "Returning Series", "episode_run_time": [],
    "next_episode_to_air": None,
    "last_episode_to_air": {"season_number": 2, "episode_number": 10,
                            "air_date": "2025-03-20", "runtime": 76},
    "seasons": [
        {"season_number": 0, "episode_count": 1, "air_date": "2021-12-15", "id": 700},
        {"season_number": 1, "episode_count": 9, "air_date": "2022-02-17", "id": 701},
        {"season_number": 2, "episode_count": 10, "air_date": "2025-01-16", "id": 702},
        {"season_number": 3, "episode_count": 0, "air_date": None, "id": 703},
    ],
}
SV = {r["season_number"]: r for r in to_entry_rows(SEVERANCE, "tv")}
check("live: saison annoncee sans date ni episode => NOT_YET_RELEASED",
      SV[3]["airing_status"], "NOT_YET_RELEASED")
check("live: saisons deja sorties => FINISHED",
      [SV[1]["airing_status"], SV[2]["airing_status"]], ["FINISHED", "FINISHED"])
check("live: aucune saison marquee RELEASING sans next_episode",
      len([r for r in to_entry_rows(SEVERANCE, "tv") if r["airing_status"] == "RELEASING"]), 0)
check("live: duree portee par toutes les saisons via last_episode_to_air",
      SV[1]["runtime_minutes"], 76)

MID = {**SEVERANCE,
       "next_episode_to_air": {"season_number": 2, "episode_number": 6,
                               "air_date": "2026-08-02", "runtime": 70},
       "last_episode_to_air": {"season_number": 2, "episode_number": 5,
                               "air_date": "2026-07-26", "runtime": 70}}
MD = {r["season_number"]: r for r in to_entry_rows(MID, "tv")}
check("live: RELEASING sur la saison designee par next_episode, pas la derniere listee",
      [MD[2]["airing_status"], MD[3]["airing_status"]], ["RELEASING", "NOT_YET_RELEASED"])
check("live: next_episode accroche a cette saison-la", MD[2]["next_episode_number"], 6)
check("live: episode_run_time renseigne reste prioritaire",
      to_entry_rows({**MID, "episode_run_time": [52]}, "tv")[1]["runtime_minutes"], 52)

# Le mapper ne fabrique PAS de `id` : c'est l'uuid attribue par Supabase a
# l'insert. Meme invariant que cote JS.
check("le mapper ne fabrique pas d'id (attribue par Supabase)",
      all("id" not in r for r in TV_ROWS + M_ROWS), True)

# Les query strings restent bornees aux sources TMDB (symetrique de la Task 1).
from tmdb_tracker_sync import franchises_qs, entries_qs
check("franchises bornees aux sources TMDB",
      "source=in.(tmdb_movie,tmdb_tv)" in franchises_qs(), True)
check("entrees bornees aux sources TMDB",
      "source=in.(tmdb_movie,tmdb_season)" in entries_qs(), True)

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
