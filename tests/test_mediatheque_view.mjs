// Tests du module de présentation Médiathèque (JS pur, sans DOM).
// Run: node tests/test_mediatheque_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "mediatheque-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── released() ────────────────────────────────────────────────
check("released: saison terminee", V.released({ airing_status: "FINISHED", episodes_total: 24 }), 24);
check("released: saison en diffusion (ep 4 a venir => 3 sortis)",
  V.released({ airing_status: "RELEASING", next_episode_number: 4, episodes_total: null }), 3);
check("released: saison annoncee", V.released({ airing_status: "NOT_YET_RELEASED", episodes_total: 12 }), 0);
check("released: annulee compte ses episodes sortis",
  V.released({ airing_status: "CANCELLED", episodes_total: 6 }), 6);

// ── nextEpLabel() ─────────────────────────────────────────────
check("nextEpLabel: null si pas de saison courante", V.nextEpLabel(null, 0), null);
check("nextEpLabel: saison terminee, prochain = vus + 1",
  V.nextEpLabel({ kind: "season", season_number: 2, airing_status: "FINISHED", episodes_total: 24 }, 15),
  "S2 · ép. 16 sur 24");
check("nextEpLabel: saison en diffusion sans total => episodes sortis au denominateur",
  V.nextEpLabel({ kind: "season", season_number: 3, airing_status: "RELEASING", next_episode_number: 4, episodes_total: null }, 0),
  "S3 · ép. 1 sur 3");
check("nextEpLabel: film non vu",
  V.nextEpLabel({ kind: "movie", airing_status: "FINISHED", episodes_total: 1 }, 0), "Film · non vu");
check("nextEpLabel: bonus ova",
  V.nextEpLabel({ kind: "ova", airing_status: "FINISHED", episodes_total: 3 }, 1), "OVA · ép. 2 sur 3");

// ── normalize() / matchesQuery() ──────────────────────────────
check("normalize: accents et casse", V.normalize("Frieren: Au-delà"), "frieren: au-dela");
check("normalize: null tolere", V.normalize(null), "");

const FR = { title_english: "The Apothecary Diaries", title_romaji: "Kusuriya no Hitorigoto", title_native: "薬屋のひとりごと" };
check("matchesQuery: titre anglais partiel", V.matchesQuery(FR, "apoth"), true);
check("matchesQuery: titre romaji", V.matchesQuery(FR, "kusuriya"), true);
check("matchesQuery: titre natif", V.matchesQuery(FR, "薬屋"), true);
check("matchesQuery: insensible aux accents", V.matchesQuery({ title_english: "Café Terrace" }, "cafe"), true);
check("matchesQuery: aucune correspondance", V.matchesQuery(FR, "naruto"), false);
check("matchesQuery: requete vide = faux", V.matchesQuery(FR, "   "), false);
check("matchesQuery: titres manquants toleres", V.matchesQuery({ title_english: null, title_romaji: null }, "x"), false);

// ── pickRail() ────────────────────────────────────────────────
const card = (id, stId, touch, shelved) => ({
  f: { id, shelved: !!shelved, title_english: id }, entries: [],
  st: { id: stId }, lastTouch: touch,
});
const CARDS = [
  card("black-clover", "watching", 300),
  card("apothecary", "watching", 500),
  card("code-geass", "watching", 100),
  card("slime", "up_to_date", 900),
  card("naruto", "seen", 800),
  card("range", "watching", 999, true),
];
check("pickRail: watching seuls, tries par activite, hero exclu, shelved exclu",
  V.pickRail(CARDS, "apothecary").map((c) => c.f.id), ["black-clover", "code-geass"]);
check("pickRail: sans hero connu, tout le watching non range",
  V.pickRail(CARDS, null).map((c) => c.f.id), ["apothecary", "black-clover", "code-geass"]);
check("pickRail: aucune serie en cours => vide",
  V.pickRail([card("slime", "up_to_date", 1)], null), []);

// ── buildWeek() ───────────────────────────────────────────────
// Ancrage : vendredi 24 juillet 2026, 10 h locales (construit en heure locale
// pour rester indépendant du fuseau de la machine de test).
const NOW = new Date(2026, 6, 24, 10, 0, 0).getTime();
const localAt = (y, m, d, h, min) => new Date(y, m, d, h, min, 0).toISOString();

const FRANCHISES = new Map([
  ["f-slime", { id: "f-slime", shelved: false, title_english: "Slime" }],
  ["f-rezero", { id: "f-rezero", shelved: false, title_english: "Re:ZERO" }],
  ["f-frieren", { id: "f-frieren", shelved: false, title_english: "Frieren" }],
  ["f-range", { id: "f-range", shelved: true, title_english: "Rangee" }],
]);
const ENTRIES = [
  { id: "e-slime", franchise_id: "f-slime", kind: "season", in_main_chain: true, title_english: "Slime S5",
    airing_status: "RELEASING", next_episode_number: 16, next_episode_airing_at: localAt(2026, 6, 24, 16, 0) },
  { id: "e-rezero", franchise_id: "f-rezero", kind: "season", in_main_chain: true, title_english: "Re:ZERO S5",
    airing_status: "RELEASING", next_episode_number: 12, next_episode_airing_at: localAt(2026, 7, 12, 15, 0) },
  { id: "e-frieren-s3", franchise_id: "f-frieren", kind: "season", in_main_chain: true, title_english: null,
    title_romaji: "Frieren S3", airing_status: "NOT_YET_RELEASED", start_date: "2027-10-01" },
  { id: "e-frieren-bonus", franchise_id: "f-frieren", kind: "other", in_main_chain: false, title_english: null,
    title_romaji: null, airing_status: "RELEASING", next_episode_number: null, next_episode_airing_at: null },
  { id: "e-main-undated", franchise_id: "f-slime", kind: "season", in_main_chain: true, title_english: "Slime S6",
    airing_status: "RELEASING", next_episode_number: null, next_episode_airing_at: null },
  { id: "e-range", franchise_id: "f-range", kind: "season", in_main_chain: true, title_english: "Rangee S2",
    airing_status: "RELEASING", next_episode_number: 3, next_episode_airing_at: localAt(2026, 6, 26, 12, 0) },
];
const W = V.buildWeek(ENTRIES, FRANCHISES, NOW);

check("buildWeek: 7 colonnes", W.days.length, 7);
check("buildWeek: la premiere colonne est aujourd'hui minuit",
  W.days[0].ts, new Date(2026, 6, 24, 0, 0, 0).getTime());
check("buildWeek: diffusion du jour dans la colonne 0",
  W.days[0].items.map((i) => i.entryId), ["e-slime"]);
check("buildWeek: numero d'episode remonte", W.days[0].items[0].ep, 16);
check("buildWeek: franchise rangee exclue de la grille",
  W.days.flatMap((d) => d.items).filter((i) => i.franchiseId === "f-range"), []);
check("buildWeek: un seul item dans la grille", W.count, 1);
check("buildWeek: au-dela de J+6 en 'plus tard'",
  W.later.filter((i) => i.reason === "airing").map((i) => i.entryId), ["e-rezero"]);
check("buildWeek: premiere annoncee en 2027 hors horizon J+90",
  W.later.filter((i) => i.entryId === "e-frieren-s3"), []);
check("buildWeek: bonus hors chaine sans date ignore",
  W.later.filter((i) => i.entryId === "e-frieren-bonus"), []);
check("buildWeek: saison de la chaine sans date => 'date inconnue' en dernier",
  W.later.map((i) => [i.entryId, i.reason]), [["e-rezero", "airing"], ["e-main-undated", "undated"]]);
check("buildWeek: libelle replie sur le titre de la franchise quand l'entree n'a aucun titre",
  V.buildWeek([{ id: "x", franchise_id: "f-slime", kind: "season", in_main_chain: true,
    airing_status: "RELEASING", next_episode_number: 2,
    next_episode_airing_at: localAt(2026, 6, 25, 12, 0) }], FRANCHISES, NOW).days[1].items[0].label,
  "Slime");
check("buildWeek: libelle prend le titre romaji de l'entree avant celui de la franchise",
  V.buildWeek([{ id: "y", franchise_id: "f-slime", kind: "season", in_main_chain: true,
    title_english: null, title_romaji: "Slime S7 (romaji)", airing_status: "RELEASING", next_episode_number: 2,
    next_episode_airing_at: localAt(2026, 6, 25, 12, 0) }], FRANCHISES, NOW).days[1].items[0].label,
  "Slime S7 (romaji)");

// Première annoncée dans la fenêtre => elle entre dans la grille, sans numéro d'épisode.
const W2 = V.buildWeek([{ id: "p", franchise_id: "f-slime", kind: "season", in_main_chain: true,
  title_english: "Slime S6", airing_status: "NOT_YET_RELEASED", start_date: "2026-07-27" }], FRANCHISES, NOW);
check("buildWeek: premiere proche placee dans la grille",
  W2.days.map((d) => d.items.length), [0, 0, 0, 1, 0, 0, 0]);
check("buildWeek: premiere sans numero d'episode", W2.days[3].items[0].ep, null);
check("buildWeek: semaine vide et rien apres => tout a zero",
  V.buildWeek([], FRANCHISES, NOW), { days: W.days.map((d) => ({ ts: d.ts, items: [] })), later: [], laterTotal: 0, count: 0 });

// « plus tard » plafonne a LATER_CAP (6) mais laterTotal garde le vrai compte.
const LATER_OVERFLOW = Array.from({ length: 9 }, (_, i) => ({
  id: `later-${i}`, franchise_id: "f-slime", kind: "season", in_main_chain: true,
  title_english: `Slime E${i}`, airing_status: "RELEASING", next_episode_number: i + 1,
  next_episode_airing_at: localAt(2026, 7, i + 1, 12, 0),
}));
const W3 = V.buildWeek(LATER_OVERFLOW, FRANCHISES, NOW);
check("buildWeek: 'plus tard' plafonne a 6 items malgre 9 candidats", W3.later.length, 6);
check("buildWeek: laterTotal garde le vrai compte avant plafonnage", W3.laterTotal, 9);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
