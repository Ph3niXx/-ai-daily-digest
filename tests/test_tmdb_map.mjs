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
const V = require(join(here, "..", "cockpit", "lib", "mediatheque-view.js"));
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
