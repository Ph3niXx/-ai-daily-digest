// Tests de la traduction TMDB → contrat AniList.
// Run: node tests/test_tmdb_map.mjs
//
// Jumeau de tests/test_tmdb_map.py : memes cas, memes attendus. Une divergence
// entre les deux signale que les implementations JS et Python du meme contrat
// ont derive — corriger celle qui a tort, jamais le test.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const T = require(join(here, "..", "cockpit", "lib", "tmdb.js"));
// Charge des le depart : les cas « live » plus bas s'en servent aussi.
const V = require(join(here, "..", "cockpit", "lib", "mediatheque-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── mapStatus ──────────────────────────────────────────────────
check("status: Returning Series", T.mapStatus("Returning Series"), "RELEASING");
check("status: In Production", T.mapStatus("In Production"), "RELEASING");
check("status: Ended", T.mapStatus("Ended"), "FINISHED");
check("status: Canceled", T.mapStatus("Canceled"), "CANCELLED");
check("status: Planned", T.mapStatus("Planned"), "NOT_YET_RELEASED");
check("status: Rumored", T.mapStatus("Rumored"), "NOT_YET_RELEASED");
check("status: inconnu => FINISHED (defaut sur), pas null", T.mapStatus("Zorglub"), "FINISHED");

// ── Série ──────────────────────────────────────────────────────
const TV = {
  id: 1396, name: "Breaking Bad", original_name: "Breaking Bad",
  overview: "Un prof de chimie.", genres: [{ name: "Drame" }],
  poster_path: "/p.jpg", backdrop_path: "/b.jpg",
  status: "Returning Series", episode_run_time: [47],
  next_episode_to_air: { episode_number: 3, air_date: "2026-08-02" },
  seasons: [
    { season_number: 0, episode_count: 4, air_date: "2008-01-01", id: 900 },
    { season_number: 1, episode_count: 7, air_date: "2008-01-20", id: 901 },
    { season_number: 2, episode_count: 13, air_date: "2009-03-08", id: 902 },
  ],
};

const TV_ROWS = T.toEntryRows(TV, "tv");
const bySeason = Object.fromEntries(TV_ROWS.map((r) => [r.season_number, r]));

check("tv: une entree par saison, saison 0 comprise", TV_ROWS.length, 3);
check("tv: saison 0 => special hors chaine principale",
  TV_ROWS.filter((r) => r.kind === "special").map((r) => r.in_main_chain), [false]);
check("tv: saisons numerotees => kind season", TV_ROWS.filter((r) => r.kind === "season").length, 2);
check("tv: source discrimine le namespace des saisons", TV_ROWS[0].source, "tmdb_season");
check("tv: episodes_total depuis episode_count", bySeason[2].episodes_total, 13);
check("tv: runtime depuis episode_run_time", bySeason[2].runtime_minutes, 47);

// Le status TMDB est au niveau SÉRIE : seule la dernière saison en hérite.
check("tv: la derniere saison herite du statut de la serie", bySeason[2].airing_status, "RELEASING");
check("tv: les saisons precedentes sont FINISHED", bySeason[1].airing_status, "FINISHED");
check("tv: next_episode accroche a la seule saison en diffusion",
  TV_ROWS.filter((r) => r.next_episode_number != null).map((r) => r.season_number), [2]);
check("tv: next_episode_airing_at au format ISO",
  bySeason[2].next_episode_airing_at.slice(0, 10), "2026-08-02");

const TV_FR = T.toFranchiseRow(TV, "tv");
check("tv: media_type", TV_FR.media_type, "tv");
check("tv: source", TV_FR.source, "tmdb_tv");
check("tv: source_root_id", TV_FR.source_root_id, 1396);
check("tv: cover_url prefixee", TV_FR.cover_url, "https://image.tmdb.org/t/p/w342/p.jpg");
check("tv: banner_url prefixee", TV_FR.banner_url, "https://image.tmdb.org/t/p/w780/b.jpg");
check("tv: genres aplatis", TV_FR.genres, ["Drame"]);

// ── Film ───────────────────────────────────────────────────────
const MOVIE = {
  id: 550, title: "Fight Club", original_title: "Fight Club",
  overview: "Un narrateur insomniaque.", genres: [{ name: "Drame" }],
  poster_path: "/f.jpg", backdrop_path: null,
  status: "Released", release_date: "1999-10-15", runtime: 139,
};
const MOVIE_ROWS = T.toEntryRows(MOVIE, "movie");
check("film: une seule entree", MOVIE_ROWS.length, 1);
check("film: kind movie", MOVIE_ROWS[0].kind, "movie");
check("film: episodes_total = 1", MOVIE_ROWS[0].episodes_total, 1);
check("film: source", MOVIE_ROWS[0].source, "tmdb_movie");
check("film: runtime", MOVIE_ROWS[0].runtime_minutes, 139);
check("film sorti => FINISHED", MOVIE_ROWS[0].airing_status, "FINISHED");
check("film: dans la chaine principale", MOVIE_ROWS[0].in_main_chain, true);

const FUTURE = { ...MOVIE, status: "Post Production", release_date: "2027-03-01" };
check("film a sortir => NOT_YET_RELEASED", T.toEntryRows(FUTURE, "movie")[0].airing_status, "NOT_YET_RELEASED");
check("film a sortir => start_date renseignee pour l'agenda",
  T.toEntryRows(FUTURE, "movie")[0].start_date, "2027-03-01");

// ── Formes RÉELLES de l'API (relevées en live le 2026-07-25) ───
// Ces deux cas ont ete trouves en interrogeant l'API, pas en ecrivant des
// fixtures : TMDB a vide episode_run_time sur les series modernes, et
// « Returning Series » ne veut PAS dire qu'une saison diffuse en ce moment.

// Dan Da Dan (tv/240411) : saison unique entierement sortie, show « Returning
// Series » (une S2 existe mais n'est pas encore listee), AUCUN next_episode.
const DANDADAN = {
  id: 240411, name: "DAN DA DAN", original_name: "ダンダダン",
  overview: "…", genres: [], poster_path: "/d.jpg", backdrop_path: null,
  status: "Returning Series", episode_run_time: [],
  next_episode_to_air: null,
  last_episode_to_air: { season_number: 1, episode_number: 24, air_date: "2025-09-19", runtime: 24 },
  seasons: [{ season_number: 1, episode_count: 24, air_date: "2024-10-04", id: 380001 }],
};
const DD = T.toEntryRows(DANDADAN, "tv");
check("live: episode_run_time vide => repli sur last_episode_to_air.runtime",
  DD[0].runtime_minutes, 24);
check("live: « Returning Series » SANS next_episode => la saison sortie est FINISHED",
  DD[0].airing_status, "FINISHED");
check("live: released() compte bien les 24 episodes, pas 0",
  V.released(DD[0]), 24);

// Severance (tv/95396) : S1 et S2 sorties, S3 annoncee sans date ni episodes,
// show « Returning Series », aucun next_episode.
const SEVERANCE = {
  id: 95396, name: "Severance", original_name: "Severance",
  overview: "…", genres: [], poster_path: "/s.jpg", backdrop_path: null,
  status: "Returning Series", episode_run_time: [],
  next_episode_to_air: null,
  last_episode_to_air: { season_number: 2, episode_number: 10, air_date: "2025-03-20", runtime: 76 },
  seasons: [
    { season_number: 0, episode_count: 1, air_date: "2021-12-15", id: 700 },
    { season_number: 1, episode_count: 9, air_date: "2022-02-17", id: 701 },
    { season_number: 2, episode_count: 10, air_date: "2025-01-16", id: 702 },
    { season_number: 3, episode_count: 0, air_date: null, id: 703 },
  ],
};
const SV = Object.fromEntries(T.toEntryRows(SEVERANCE, "tv").map((r) => [r.season_number, r]));
check("live: saison annoncee sans date ni episode => NOT_YET_RELEASED",
  SV[3].airing_status, "NOT_YET_RELEASED");
check("live: saisons deja sorties => FINISHED", [SV[1].airing_status, SV[2].airing_status],
  ["FINISHED", "FINISHED"]);
check("live: aucune saison marquee RELEASING sans next_episode",
  T.toEntryRows(SEVERANCE, "tv").filter((r) => r.airing_status === "RELEASING").length, 0);
check("live: released() sur une saison annoncee = 0", V.released(SV[3]), 0);
check("live: statut derive d'une serie non commencee",
  V.status(T.toEntryRows(SEVERANCE, "tv").filter((r) => r.in_main_chain)
    .map((r) => ({ ...r, id: `u${r.source_id}` })), new Map()).id, "to_watch");
check("live: duree portee par toutes les saisons via last_episode_to_air",
  SV[1].runtime_minutes, 76);

// La saison en diffusion est celle DÉSIGNÉE par next_episode_to_air, pas la
// derniere de la liste : une saison future annoncee ne doit pas voler le flag.
const MID = {
  ...SEVERANCE,
  next_episode_to_air: { season_number: 2, episode_number: 6, air_date: "2026-08-02", runtime: 70 },
  last_episode_to_air: { season_number: 2, episode_number: 5, air_date: "2026-07-26", runtime: 70 },
};
const MD = Object.fromEntries(T.toEntryRows(MID, "tv").map((r) => [r.season_number, r]));
check("live: RELEASING sur la saison designee par next_episode, pas la derniere listee",
  [MD[2].airing_status, MD[3].airing_status], ["RELEASING", "NOT_YET_RELEASED"]);
check("live: next_episode accroche a cette saison-la", MD[2].next_episode_number, 6);
check("live: la saison en diffusion compte les episodes deja sortis", V.released(MD[2]), 5);
check("live: episode_run_time renseigne reste prioritaire",
  T.toEntryRows({ ...MID, episode_run_time: [52] }, "tv")[1].runtime_minutes, 52);

// ── Cas dégradés ───────────────────────────────────────────────
check("serie sans saison => aucune entree, pas de crash",
  T.toEntryRows({ ...TV, seasons: [] }, "tv"), []);
check("poster absent => cover_url null, pas une URL cassee",
  T.toFranchiseRow({ ...TV, poster_path: null }, "tv").cover_url, null);
check("film sans runtime => null, jamais 0",
  T.toEntryRows({ ...MOVIE, runtime: null }, "movie")[0].runtime_minutes, null);

// ── Compatibilité avec la logique dérivée existante ────────────
// C'est le vrai test du contrat : les fonctions de mediatheque-view.js ne
// doivent rien savoir de TMDB et fonctionner sur ses lignes telles quelles.
check("contrat: released() lit une saison TMDB terminee", V.released(bySeason[1]), 7);
check("contrat: released() lit la saison TMDB en diffusion", V.released(bySeason[2]), 2);
check("contrat: released() lit un film TMDB sorti", V.released(MOVIE_ROWS[0]), 1);
check("contrat: nextEpLabel() rend un film TMDB non vu",
  V.nextEpLabel(MOVIE_ROWS[0], 0), "Film · non vu");
// Le mapper ne produit PAS de `id` : c'est l'uuid attribue par Supabase a
// l'insert. La logique derivee travaille sur des lignes relues de la base, on
// simule donc l'aller-retour en attribuant un id avant d'appeler status().
const AS_STORED = TV_ROWS.filter((r) => r.in_main_chain)
  .map((r) => ({ ...r, id: `uuid-${r.source_id}` }));
check("contrat: le mapper ne fabrique pas d'id (attribue par Supabase)",
  TV_ROWS.every((r) => r.id === undefined), true);
check("contrat: status() derive « en cours » sur une chaine TMDB relue",
  V.status(AS_STORED, new Map([["uuid-901", 3]])).id, "watching");
check("contrat: status() derive « vu » quand tout le sorti est vu",
  V.status(AS_STORED.filter((r) => r.airing_status === "FINISHED"),
    new Map([["uuid-901", 7]])).id, "seen");

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
