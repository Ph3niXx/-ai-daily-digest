// Tests du module de présentation Gaming (JS pur, sans DOM).
// Run: node tests/test_games_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "games-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── buildLibrary : la regle centrale du lot ──────────────────
// game_titles contient les jeux de l'utilisateur ET les titres freres
// decouverts dans les collections. Seuls les premiers sont sa bibliotheque.
const TITLES = [
  { id: "t1", igdb_id: 1, name: "Civilization VI", steam_appid: 289070, franchise_id: "f1", genres: ["Strategy"], time_to_beat_minutes: 3000 },
  { id: "t2", igdb_id: 2, name: "Civ VI: Babylon Pack", steam_appid: null, franchise_id: "f1", genres: ["Strategy"] },
  { id: "t3", igdb_id: 3, name: "Silksong", steam_appid: null, franchise_id: "f2", genres: ["Platform"] },
  { id: "t4", igdb_id: 4, name: "Mass Effect 2", steam_appid: 24980, franchise_id: "f3", genres: ["RPG"] },
  // t5 : titre avec steam_appid mais SANS entree dans SNAP. Scenario reel = jeu
  // achete hier, appid rempli dans IGDB avant que le pipeline de snapshot
  // n'ait couru. Le code doit le garder ET lui mettre minutes: 0, jamais NaN.
  { id: "t5", igdb_id: 5, name: "Acheté hier", steam_appid: 111111, franchise_id: "f4", genres: [] },
];
const PROGRESS = [
  { title_id: "t3", status: "wishlist", rating: null, platform: null },
  { title_id: "t4", status: "finished", rating: 92, platform: "PC" },
];
const SNAP = [
  { appid: 289070, playtime_forever_minutes: 6733, playtime_2weeks_minutes: 0 },
  { appid: 24980, playtime_forever_minutes: 1427, playtime_2weeks_minutes: 120 },
  { appid: 999999, playtime_forever_minutes: 50, playtime_2weeks_minutes: 0 },
];

const lib = V.buildLibrary(TITLES, PROGRESS, SNAP);
check("bibliotheque = steam_appid OU progress, jamais les freres de collection",
      lib.map(c => c.t.id).sort(), ["t1", "t3", "t4", "t5"]);
check("le DLC sans appid ni progress est exclu",
      lib.some(c => c.t.id === "t2"), false);
check("les heures Steam sont jointes par appid",
      lib.find(c => c.t.id === "t1").minutes, 6733);
check("un titre sans appid n'a pas d'heures",
      lib.find(c => c.t.id === "t3").minutes, 0);
check("heures 14 jours jointes",
      lib.find(c => c.t.id === "t4").minutes2w, 120);
check("un appid Steam sans titre IGDB n'invente pas de carte",
      lib.some(c => c.minutes === 50), false);
check("titre avec appid mais sans snapshot = 0 minutes",
      lib.find(c => c.t.id === "t5").minutes, 0);

// ── statusOf : declare par l'utilisateur, jamais deduit ──────
check("statut declare gagne", V.statusOf(lib.find(c => c.t.id === "t4")), "finished");
check("statut wishlist", V.statusOf(lib.find(c => c.t.id === "t3")), "wishlist");
// 6733 minutes de jeu ne suffisent PAS a declarer « fini » : Steam ne sait pas.
check("jeu joue mais non declare => non qualifie",
      V.statusOf(lib.find(c => c.t.id === "t1")), "unqualified");
check("libelle de statut", V.STATUS_LABELS.dropped, "Lâché");

// ── tri ──────────────────────────────────────────────────────
check("tri par heures decroissantes",
      V.sortLibrary(lib, "hours").map(c => c.t.id), ["t1", "t4", "t5", "t3"]);
check("tri par nom",
      V.sortLibrary(lib, "name").map(c => c.t.id), ["t5", "t1", "t4", "t3"]);
check("tri par note, non notes en dernier",
      V.sortLibrary(lib, "rating").map(c => c.t.id), ["t4", "t5", "t1", "t3"]);

// ── recherche locale ─────────────────────────────────────────
check("recherche insensible a la casse", V.matchesQuery(lib.find(c => c.t.id === "t1"), "civ"), true);
check("recherche insensible aux accents",
      V.matchesQuery({ t: { name: "Pokémon" }, prog: null }, "pokemon"), true);
check("recherche vide accepte tout", V.matchesQuery(lib[0], "   "), true);
check("recherche qui ne matche pas", V.matchesQuery(lib.find(c => c.t.id === "t1"), "zelda"), false);

// ── filtre par statut ────────────────────────────────────────
check("filtre sur un statut",
      V.filterByStatus(lib, ["finished"]).map(c => c.t.id), ["t4"]);
check("filtre vide = tout",
      V.filterByStatus(lib, []).length, 4);

// ── rail « A venir » ─────────────────────────────────────────
const RELEASES = [
  { id: "r1", title_id: "t3", franchise_id: "f2", title: "À venir : Silksong", event_date: "2026-09-04", acknowledged: false },
  { id: "r2", title_id: "t2", franchise_id: "f1", title: "À venir : Babylon", event_date: null, acknowledged: false },
  { id: "r3", title_id: "t1", franchise_id: "f1", title: "Sorti : Civ VI", event_date: "2016-10-21", acknowledged: true },
];
const BY_ID = Object.fromEntries(TITLES.map(t => [t.id, t]));
const FR = { f1: { id: "f1", name: "Civilization" }, f2: { id: "f2", name: "Hollow Knight" } };
const up = V.buildUpcoming(RELEASES, BY_ID, FR);
check("les evenements acquittes sortent du rail", up.map(i => i.id), ["r1", "r2"]);
check("les dates connues passent avant les inconnues", up[0].id, "r1");
check("le rail porte le nom de la licence", up[0].licence, "Hollow Knight");
check("le rail porte le nom du jeu, pas le libelle d'evenement", up[0].name, "Silksong");

// ── libelles ─────────────────────────────────────────────────
check("heures : moins d'une heure", V.hoursLabel(45), "45 min");
check("heures : arrondi", V.hoursLabel(6733), "112 h");
check("heures : zero", V.hoursLabel(0), "jamais lancé");
check("duree pour finir", V.ttbLabel(3000), "≈ 50 h pour finir");
check("duree inconnue", V.ttbLabel(null), null);

// ── suggestion « tu y as joué » ──────────────────────────────
// Steam suggere, l'utilisateur declare : on ne fait que proposer.
check("suggere un jeu joue recemment et non declare en cours",
      V.suggestPlaying(lib).map(c => c.t.id), ["t4"]);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
