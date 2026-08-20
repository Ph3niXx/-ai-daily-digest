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

// ── curLabel() ────────────────────────────────────────────────
const PROG = new Map([["s2", 12], ["film", 1], ["ova", 0]]);
check("curLabel: null si pas de saison courante", V.curLabel(null, PROG), null);
check("curLabel: saison en cours de rattrapage",
  V.curLabel({ id: "s2", kind: "season", season_number: 2, airing_status: "FINISHED", episodes_total: 28 }, PROG),
  "S2 · 12/28");
check("curLabel: film",
  V.curLabel({ id: "film", kind: "movie", airing_status: "FINISHED", episodes_total: 1 }, PROG), "Film · 1/1");
check("curLabel: kind manquant durci (pas de .toUpperCase() sur undefined)",
  V.curLabel({ id: "ova", kind: null, airing_status: "FINISHED", episodes_total: 3 }, PROG), "? · 0/3");
check("curLabel: denominateur inconnu quand rien n'est sorti",
  V.curLabel({ id: "ova", kind: "ova", airing_status: "NOT_YET_RELEASED", episodes_total: 12 }, PROG), "OVA · 0/?");

// ── status() ──────────────────────────────────────────────────
// « à jour » vs « vu » se joue sur la présence d'une saison RELEASING,
// pas sur le fait que tout soit FINISHED.
const S = (id, st, total, next) => ({ id, in_main_chain: true, airing_status: st, episodes_total: total, next_episode_number: next });
const P = (pairs) => new Map(pairs);
check("status: rien de vu => a voir",
  V.status([S("a", "FINISHED", 12)], P([])).id, "to_watch");
check("status: retard sur les episodes sortis => en cours",
  V.status([S("a", "FINISHED", 12)], P([["a", 5]])).id, "watching");
check("status: tout vu mais une saison diffuse => a jour",
  V.status([S("a", "FINISHED", 12), S("b", "RELEASING", null, 4)], P([["a", 12], ["b", 3]])).id, "up_to_date");
check("status: tout vu et rien en diffusion => vu",
  V.status([S("a", "FINISHED", 12), S("b", "FINISHED", 10)], P([["a", 12], ["b", 10]])).id, "seen");
check("status: saison annoncee non diffusee ne retient pas en 'a jour'",
  V.status([S("a", "FINISHED", 12), S("b", "NOT_YET_RELEASED", 12)], P([["a", 12]])).id, "seen");
check("status: compteurs vus/sortis agreges sur la chaine",
  (({ watched, released }) => [watched, released])(
    V.status([S("a", "FINISHED", 12), S("b", "RELEASING", null, 4)], P([["a", 12], ["b", 1]]))),
  [13, 15]);
check("status: libelles",
  [V.status([S("a", "FINISHED", 12)], P([])).label,
   V.status([S("a", "FINISHED", 12)], P([["a", 5]])).label,
   V.status([S("a", "RELEASING", null, 4)], P([["a", 3]])).label,
   V.status([S("a", "FINISHED", 12)], P([["a", 12]])).label],
  ["À voir", "En cours", "En cours · à jour", "Vu"]);

// ── currentEntryOf() ──────────────────────────────────────────
const CHAIN = [
  { id: "c2", in_main_chain: true, sort_order: 2, airing_status: "FINISHED", episodes_total: 12 },
  { id: "c1", in_main_chain: true, sort_order: 1, airing_status: "FINISHED", episodes_total: 24 },
  { id: "bonus", in_main_chain: false, sort_order: 0, airing_status: "FINISHED", episodes_total: 3 },
];
check("currentEntryOf: premiere entree non rattrapee, dans l'ordre de la chaine",
  V.currentEntryOf(CHAIN, P([["c1", 10]])).id, "c1");
check("currentEntryOf: saute les saisons rattrapees",
  V.currentEntryOf(CHAIN, P([["c1", 24], ["c2", 3]])).id, "c2");
check("currentEntryOf: ignore les bonus hors chaine",
  V.currentEntryOf([CHAIN[2]], P([])), null);
check("currentEntryOf: tout rattrape => null",
  V.currentEntryOf(CHAIN, P([["c1", 24], ["c2", 12]])), null);

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
  V.pickRail(CARDS, ["apothecary"]).map((c) => c.f.id), ["black-clover", "code-geass"]);
check("pickRail: sans hero connu, tout le watching non range",
  V.pickRail(CARDS, []).map((c) => c.f.id), ["apothecary", "black-clover", "code-geass"]);
check("pickRail: aucune serie en cours => vide",
  V.pickRail([card("slime", "up_to_date", 1)], []), []);

// ── nextAiringOf() / pickHero() ───────────────────────────────
const hcard = (id, stId, touch, opts) => Object.assign({
  f: { id, shelved: false, title_english: id, added_at: "2026-01-01" },
  entries: [], st: { id: stId }, lastTouch: touch,
}, opts || {});
const airingIn = (d) => ({ airing_status: "RELEASING", next_episode_airing_at: new Date(2026, 6, d, 12, 0).toISOString() });
check("nextAiringOf: aucune diffusion connue => null", V.nextAiringOf(hcard("x", "seen", 0)), null);
check("nextAiringOf: retient la plus proche des diffusions annoncees",
  V.nextAiringOf({ entries: [airingIn(30), airingIn(26),
    { airing_status: "NOT_YET_RELEASED", next_episode_airing_at: new Date(2026, 6, 25, 12, 0).toISOString() }] }),
  new Date(2026, 6, 26, 12, 0).getTime());

const heroOf = (cards) => { const h = V.pickHero(cards); return h && [h.card.f.id, h.kind]; };
check("pickHero: bibliotheque vide => null", V.pickHero([]), null);
check("pickHero: uniquement des franchises rangees => null",
  V.pickHero([{ f: { id: "r", shelved: true }, entries: [], st: { id: "watching" }, lastTouch: 9 }]), null);
check("pickHero: regle 1 = la franchise 'en cours' la plus recemment touchee",
  heroOf(CARDS), ["apothecary", "resume"]);
check("pickHero: sans 'en cours', l'a-jour dont l'episode arrive le plus tot",
  heroOf([hcard("slime", "up_to_date", 900, { entries: [airingIn(30)] }),
          hcard("dandadan", "up_to_date", 100, { entries: [airingIn(26)] })]),
  ["dandadan", "next_ep"]);
check("pickHero: a-jour sans date connue => repli sur l'activite",
  heroOf([hcard("slime", "up_to_date", 100), hcard("dandadan", "up_to_date", 900)]),
  ["dandadan", "next_ep"]);
check("pickHero: sinon 'a voir' le plus recemment ajoute",
  heroOf([
    { f: { id: "vieux", shelved: false, added_at: "2026-01-01" }, entries: [], st: { id: "to_watch" }, lastTouch: 0 },
    { f: { id: "neuf", shelved: false, added_at: "2026-07-01" }, entries: [], st: { id: "to_watch" }, lastTouch: 0 },
    hcard("naruto", "seen", 900)]),
  ["neuf", "discover"]);
check("pickHero: en dernier recours, un titre deja vu",
  heroOf([hcard("naruto", "seen", 800), hcard("bleach", "seen", 900)]), ["bleach", "seen"]);

// INVARIANT CENTRAL : hero et rail ne montrent jamais la même franchise.
// pickRail retire la franchise du hero, ce qui ne suffit QUE parce que pickHero
// choisit une franchise « en cours » en règle 1. Réordonner ses règles casserait
// la déduplication en silence — c'est cette assertion qui tient le contrat.
const HERO_PICK = V.pickHero(CARDS);
check("hero ∉ rail : la franchise du hero n'apparait jamais dans le rail",
  V.pickRail(CARDS, [HERO_PICK.card.f.id]).some((c) => c.f.id === HERO_PICK.card.f.id), false);
check("hero ∉ rail : le rail garde les autres 'en cours'",
  V.pickRail(CARDS, [HERO_PICK.card.f.id]).map((c) => c.f.id), ["black-clover", "code-geass"]);

// ── buildWeek() ───────────────────────────────────────────────
// Ancrage : vendredi 24 juillet 2026, 10 h locales (construit en heure locale
// pour rester indépendant du fuseau de la machine de test).
const NOW = new Date(2026, 6, 24, 10, 0, 0).getTime();
const localAt = (y, m, d, h, min) => new Date(y, m, d, h, min, 0).toISOString();

const FRANCHISES = new Map([
  ["f-slime", { id: "f-slime", shelved: false, title_english: "Slime", cover_url: "https://img/slime.jpg" }],
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
// Le poster accompagne l'item : l'agenda identifie une serie par sa jaquette,
// pas seulement par un titre tronque.
check("buildWeek: le poster de la franchise voyage avec l'item de grille",
  W.days[0].items[0].cover, "https://img/slime.jpg");
check("buildWeek: franchise sans poster => cover null (jamais undefined)",
  W.later.find((i) => i.entryId === "e-rezero").cover, null);
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

// ── Dates périmées (sync quotidien 07:30 UTC : entre la diffusion et le sync
// du lendemain, next_episode_airing_at pointe dans le passé) ──
const STALE_MAIN = { id: "e-stale", franchise_id: "f-slime", kind: "season", in_main_chain: true,
  title_english: "Slime S5", airing_status: "RELEASING", next_episode_number: 16,
  next_episode_airing_at: localAt(2026, 6, 23, 20, 0) };   // hier 20 h
const WS = V.buildWeek([STALE_MAIN], FRANCHISES, NOW);
check("buildWeek: chaine principale a la date perimee => 'plus tard' sans date, pas de disparition",
  WS.later.map((i) => [i.entryId, i.reason, i.at, i.daysAhead]), [["e-stale", "undated", null, null]]);
check("buildWeek: la chaine a la date perimee ne squatte aucune colonne",
  WS.days.flatMap((d) => d.items).length + WS.count, 0);
const WSB = V.buildWeek([Object.assign({}, STALE_MAIN, { id: "e-stale-bonus", in_main_chain: false })], FRANCHISES, NOW);
check("buildWeek: bonus hors chaine a la date perimee => ecarte (aucun repli)",
  [WSB.later.length, WSB.count], [0, 0]);
check("buildWeek: diffuse plus tot aujourd'hui => reste dans la colonne 0",
  V.buildWeek([Object.assign({}, STALE_MAIN, { next_episode_airing_at: localAt(2026, 6, 24, 8, 0) })],
    FRANCHISES, NOW).days[0].items.map((i) => [i.entryId, i.reason]), [["e-stale", "airing"]]);
check("buildWeek: premiere annoncee dans le passe reste ecartee (pas de repli 'undated')",
  V.buildWeek([{ id: "e-old-prem", franchise_id: "f-slime", kind: "season", in_main_chain: true,
    title_english: "Slime S0", airing_status: "NOT_YET_RELEASED", start_date: "2026-07-01" }], FRANCHISES, NOW),
  { days: W.days.map((d) => ({ ts: d.ts, items: [] })), later: [], laterTotal: 0, count: 0 });

// ── daysAhead (Finding 1 : plus de division ms/86400000 dans la vue) ──
check("buildWeek: daysAhead d'un item de grille = index de colonne",
  W2.days[3].items[0].daysAhead, 3);
check("buildWeek: daysAhead d'un item 'plus tard' date = ecart calendaire (jamais une division ms)",
  W.later.find((i) => i.entryId === "e-rezero").daysAhead, 19);
check("buildWeek: daysAhead null pour un item 'plus tard' sans date",
  W.later.find((i) => i.entryId === "e-main-undated").daysAhead, null);

// « plus tard » plafonne a LATER_CAP (6) mais laterTotal garde le vrai compte.
const LATER_OVERFLOW = Array.from({ length: 9 }, (_, i) => ({
  id: `later-${i}`, franchise_id: "f-slime", kind: "season", in_main_chain: true,
  title_english: `Slime E${i}`, airing_status: "RELEASING", next_episode_number: i + 1,
  next_episode_airing_at: localAt(2026, 7, i + 1, 12, 0),
}));
const W3 = V.buildWeek(LATER_OVERFLOW, FRANCHISES, NOW);
check("buildWeek: 'plus tard' plafonne a 6 items malgre 9 candidats", W3.later.length, 6);
check("buildWeek: laterTotal garde le vrai compte avant plafonnage", W3.laterTotal, 9);

// ── isEvening() / pickTonight() ────────────────────────────────
const at = (h, m = 0) => new Date(2026, 6, 25, h, m, 0).getTime();

check("isEvening: 9 h du matin => non", V.isEvening(at(9)), false);
check("isEvening: 18 h => oui", V.isEvening(at(18)), true);
check("isEvening: 23 h => oui", V.isEvening(at(23)), true);
check("isEvening: 1 h du matin => oui", V.isEvening(at(1)), true);
check("isEvening: 2 h du matin => non", V.isEvening(at(2)), false);

// Fabrique de cartes. `st` est fourni tel que le panel le calcule.
function mkCard(id, stId, entries, opts) {
  const o = opts || {};
  return {
    f: { id, source_root_id: id, title_english: id, shelved: !!o.shelved, added_at: o.added_at || "2026-01-01" },
    entries,
    st: { id: stId, label: stId },
    lastTouch: o.lastTouch || 0,
  };
}
function mkEntry(id, o) {
  return {
    id, in_main_chain: o.chain !== false, kind: o.kind || "season", season_number: o.season || 1,
    airing_status: o.status || "FINISHED", episodes_total: o.total != null ? o.total : 12,
    next_episode_number: o.nextEp || null, next_episode_airing_at: o.airingAt || null,
    runtime_minutes: o.runtime === undefined ? 24 : o.runtime, sort_order: o.sort || 1,
  };
}
const EMPTY_CTX = { budgetMin: 60, dayLoad: null };
const roles = (picks) => picks.map((p) => p.role);
const ids = (picks) => picks.map((p) => p.card.f.id);

check("pickTonight: bibliotheque vide => aucune proposition",
  V.pickTonight([], new Map(), EMPTY_CTX, at(21)), []);

// « Vient de sortir » : la date stockée est AUJOURD'HUI et déjà passée.
const FRESH_E = mkEntry("e1", { status: "RELEASING", total: 24, nextEp: 13, airingAt: new Date(at(18)).toISOString() });
const FRESH = mkCard("fresh", "up_to_date", [FRESH_E]);
check("pickTonight: episode diffuse aujourd'hui non vu => role fresh",
  roles(V.pickTonight([FRESH], new Map([["e1", 12]]), EMPTY_CTX, at(21))), ["fresh"]);
check("pickTonight: episode d'aujourd'hui deja vu => pas de fresh",
  V.pickTonight([FRESH], new Map([["e1", 13]]), EMPTY_CTX, at(21)), []);
check("pickTonight: episode d'aujourd'hui pas encore diffuse => pas de fresh",
  V.pickTonight([FRESH], new Map([["e1", 12]]), EMPTY_CTX, at(12)), []);

// Budget : un film de 120 min ne rentre pas dans 30 minutes.
const FILM = mkCard("film", "to_watch", [mkEntry("f1", { kind: "movie", total: 1, runtime: 120 })]);
check("pickTonight: budget 30 min face a un seul film de 120 min => rien",
  V.pickTonight([FILM], new Map(), { budgetMin: 30, dayLoad: null }, at(21)), []);
check("pickTonight: budget 2 h+ (null) => le film passe",
  roles(V.pickTonight([FILM], new Map(), { budgetMin: null, dayLoad: null }, at(21))), ["discover"]);

// Durée inconnue : acceptée partout, mais classée derrière une durée connue compatible.
const UNK = mkCard("unk", "to_watch", [mkEntry("u1", { runtime: null })], { added_at: "2026-06-01" });
const KNOWN = mkCard("known", "to_watch", [mkEntry("k1", { runtime: 22 })], { added_at: "2026-01-01" });
check("pickTonight: duree inconnue acceptee mais classee apres une duree connue",
  ids(V.pickTonight([UNK, KNOWN], new Map(), { budgetMin: 30, dayLoad: null }, at(21))), ["known"]);

// Une franchise ne peut occuper qu'un rôle.
const BOTH_E = mkEntry("b1", { status: "RELEASING", total: 24, nextEp: 13, airingAt: new Date(at(18)).toISOString() });
const BOTH = mkCard("both", "watching", [BOTH_E], { lastTouch: 99 });
check("pickTonight: une franchise eligible a deux roles n'apparait qu'une fois",
  ids(V.pickTonight([BOTH], new Map([["b1", 5]]), EMPTY_CTX, at(21))), ["both"]);

// Mis de côté : jamais proposé.
const SHELVED = mkCard("shelved", "watching", [mkEntry("s1", {})], { shelved: true });
check("pickTonight: franchise mise de cote jamais proposee",
  V.pickTonight([SHELVED], new Map([["s1", 1]]), EMPTY_CTX, at(21)), []);

// Après 23 h, un format long recule derrière un format court.
const LONG = mkCard("long", "to_watch", [mkEntry("l1", { kind: "movie", total: 1, runtime: 118 })], { added_at: "2026-06-01" });
const SHORT = mkCard("short", "to_watch", [mkEntry("sh1", { runtime: 24 })], { added_at: "2026-01-01" });
check("pickTonight: a 21 h, budget illimite => le plus proche du budget d'abord (le long)",
  ids(V.pickTonight([SHORT, LONG], new Map(), { budgetMin: null, dayLoad: null }, at(21))), ["long"]);
check("pickTonight: a 23 h, le format long recule derriere le court",
  ids(V.pickTonight([SHORT, LONG], new Map(), { budgetMin: null, dayLoad: null }, at(23, 30))), ["short"]);

// Le tri de nuit est CROISSANT, pas un seuil binaire long/court : sinon trois
// candidats de 76, 139 et 201 min tombent du meme cote et c'est le plus long
// qui sort. Cas constate sur donnees reelles le 2026-07-25.
const L76 = mkCard("l76", "to_watch", [mkEntry("a76", { runtime: 76 })], { added_at: "2026-01-01" });
const L139 = mkCard("l139", "to_watch", [mkEntry("a139", { kind: "movie", total: 1, runtime: 139 })], { added_at: "2026-02-01" });
const L201 = mkCard("l201", "to_watch", [mkEntry("a201", { kind: "movie", total: 1, runtime: 201 })], { added_at: "2026-03-01" });
const LONGS = [L139, L201, L76];
check("pickTonight: a 21 h, budget illimite => le plus long (au plus pres du budget)",
  ids(V.pickTonight(LONGS, new Map(), { budgetMin: null, dayLoad: null }, at(21))), ["l201"]);
check("pickTonight: a 23 h 30, trois formats longs => le MOINS long l'emporte",
  ids(V.pickTonight(LONGS, new Map(), { budgetMin: null, dayLoad: null }, at(23, 30))), ["l76"]);

// Rôle sans candidat : la carte se réduit, aucun remplissage.
const ONLY_RESUME = mkCard("r", "watching", [mkEntry("r1", { total: 12 })], { lastTouch: 5 });
check("pickTonight: un seul role servi => une seule proposition, pas de remplissage",
  roles(V.pickTonight([ONLY_RESUME], new Map([["r1", 3]]), EMPTY_CTX, at(21))), ["resume"]);

// Les trois rôles ensemble, dans l'ordre.
const THREE = V.pickTonight([FRESH, ONLY_RESUME, KNOWN],
  new Map([["e1", 12], ["r1", 3]]), EMPTY_CTX, at(21));
check("pickTonight: trois roles servis dans l'ordre fresh, resume, discover",
  roles(THREE), ["fresh", "resume", "discover"]);

// Accroche.
check("tonightHeadline: rien a proposer => null",
  V.tonightHeadline([], EMPTY_CTX, at(21)), null);
check("tonightHeadline: apres 23 h",
  V.tonightHeadline(THREE, EMPTY_CTX, at(23, 30)), "Il est tard — plutôt un format court");
check("tonightHeadline: grosse journee => la phrase change, pas le classement",
  V.tonightHeadline(THREE, { budgetMin: 60, dayLoad: { count: 6, total_minutes: 300 } }, at(21)),
  "Grosse journée — de quoi décrocher");
check("tonightHeadline: journee normale",
  V.tonightHeadline(THREE, EMPTY_CTX, at(21)), "Ce soir");

// ── pickRail() × pickTonight() ─────────────────────────────────
check("pickRail: liste d'exclusion vide => tout ce qui est en cours",
  V.pickRail([ONLY_RESUME], []).map((c) => c.f.id), ["r"]);
check("pickRail: exclut chaque id fourni",
  V.pickRail([ONLY_RESUME], ["r"]).map((c) => c.f.id), []);

// L'invariant : aucune franchise proposée par « Ce soir » ne réapparaît au rail.
const RAIL_A = mkCard("ra", "watching", [mkEntry("ra1", { total: 12 })], { lastTouch: 9 });
const RAIL_B = mkCard("rb", "watching", [mkEntry("rb1", { total: 12 })], { lastTouch: 8 });
const PROG_RAIL = new Map([["ra1", 3], ["rb1", 3]]);
const T_RAIL = V.pickTonight([RAIL_A, RAIL_B], PROG_RAIL, EMPTY_CTX, at(21));
const RAIL_OUT = V.pickRail([RAIL_A, RAIL_B], T_RAIL.map((p) => p.card.f.id));
check("invariant: tonight ∩ rail = vide",
  RAIL_OUT.filter((c) => T_RAIL.some((p) => p.card.f.id === c.f.id)).length, 0);
check("invariant: le rail garde bien l'autre franchise",
  RAIL_OUT.map((c) => c.f.id), ["rb"]);

// ── Sections (cardsOfSection / countBySection / typeOf) ───────
// Le piege : media_type est NULLABLE. Les 47 franchises anterieures a la
// migration TMDB n'en portent pas et doivent tomber dans « anime », sinon la
// section par defaut s'ouvre vide sur une bibliotheque pleine.
const secCard = (id, mediaType, shelved) => ({
  f: { id, media_type: mediaType, shelved: !!shelved, title_english: id },
  entries: [], st: { id: "watching" }, lastTouch: 1,
});
const SEC_CARDS = [
  secCard("frieren", "anime"),
  secCard("naruto", null),                 // legacy : pas de media_type
  secCard("severance", "tv"),
  secCard("dune", "movie"),
  secCard("shelved-anime", "anime", true),
  secCard("shelved-tv", "tv", true),
];
const SECTION_IDS = ["anime", "tv", "movie"];

check("typeOf: media_type absent => anime (defaut historique)",
  V.typeOf({ id: "x" }), "anime");
check("typeOf: media_type null => anime",
  V.typeOf({ id: "x", media_type: null }), "anime");
check("typeOf: media_type explicite respecte",
  V.typeOf({ id: "x", media_type: "tv" }), "tv");

check("cardsOfSection: anime ramasse les legacy sans media_type",
  V.cardsOfSection(SEC_CARDS, "anime").map((c) => c.f.id),
  ["frieren", "naruto", "shelved-anime"]);
check("cardsOfSection: tv n'attrape que les series",
  V.cardsOfSection(SEC_CARDS, "tv").map((c) => c.f.id), ["severance", "shelved-tv"]);
check("cardsOfSection: movie",
  V.cardsOfSection(SEC_CARDS, "movie").map((c) => c.f.id), ["dune"]);
check("cardsOfSection: section inconnue => vide, jamais un repli silencieux sur anime",
  V.cardsOfSection(SEC_CARDS, "manga"), []);
check("cardsOfSection: liste vide toleree", V.cardsOfSection([], "anime"), []);
// Le filtrage de section ne juge NI le statut NI les mises de cote : ces deux
// regles appartiennent aux chips de la collection. Une section qui les
// appliquerait ferait disparaitre le chip « Mis de cote » de son propre rayon.
check("cardsOfSection: garde les mises de cote (c'est le chip qui tranche)",
  V.cardsOfSection(SEC_CARDS, "tv").filter((c) => c.f.shelved).map((c) => c.f.id),
  ["shelved-tv"]);

check("countBySection: compteurs d'onglet, mises de cote exclues",
  V.countBySection(SEC_CARDS, SECTION_IDS), { anime: 2, tv: 1, movie: 1 });
check("countBySection: une section sans titre affiche 0, pas undefined",
  V.countBySection([secCard("frieren", "anime")], SECTION_IDS),
  { anime: 1, tv: 0, movie: 0 });
check("countBySection: un type hors sections declarees n'invente pas de cle",
  V.countBySection([secCard("berserk", "manga")], SECTION_IDS),
  { anime: 0, tv: 0, movie: 0 });

// Invariant de partition : chaque carte tombe dans exactement une section
// declaree (ou aucune, si son type n'est pas encore une section). Sans ca, une
// franchise deviendrait invisible partout — le mode d'echec le plus couteux ici,
// puisqu'elle reste en base et parait perdue.
check("invariant: les sections partitionnent la bibliotheque, aucune carte perdue",
  SECTION_IDS.reduce((n, s) => n + V.cardsOfSection(SEC_CARDS, s).length, 0),
  SEC_CARDS.length);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
