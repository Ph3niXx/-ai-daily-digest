// Tests du mapping AniList → lignes media_entries.
// Run: node tests/test_anilist_map.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const A = require(join(here, "..", "cockpit", "lib", "anilist.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

const BUILT = { root_id: 1, entries: [{ source_id: 1, in_main_chain: true, kind: "season", season_number: 1, sort_order: 1 }] };
const MEDIA = {
  1: { id: 1, title: { romaji: "R", english: "E", native: "N" }, format: "TV",
       status: "FINISHED", episodes: 12, duration: 24, genres: [], coverImage: { large: "c" } },
};

check("toEntryRows: duration AniList => runtime_minutes",
  A.toEntryRows(BUILT, MEDIA)[0].runtime_minutes, 24);

const NO_DURATION = { 1: { ...MEDIA[1], duration: null } };
check("toEntryRows: duration absente => null, jamais 0",
  A.toEntryRows(BUILT, NO_DURATION)[0].runtime_minutes, null);

// ── Manga ─────────────────────────────────────────────────────
// AniList rend `volumes` et `chapters` pour un MANGA, et `episodes`/`duration`
// a null. On compte en TOMES : episodes_total <- volumes, jamais chapters.
const MANGA_ROOT = {
  id: 30642, type: "MANGA", format: "MANGA", status: "FINISHED",
  volumes: 29, chapters: 224, episodes: null, duration: null,
  title: { romaji: "Vinland Saga", english: "Vinland Saga", native: "ヴィンランド・サガ" },
  startDate: { year: 2005, month: 4, day: 13 }, endDate: {},
  coverImage: { large: "http://x/c.jpg" }, bannerImage: null,
  genres: ["Adventure"], description: "…", nextAiringEpisode: null,
  relations: { edges: [] },
};
const MANGA_BUILT = {
  root_id: 30642,
  entries: [{ source_id: 30642, in_main_chain: true, kind: "manga",
              season_number: null, sort_order: 0 }],
};
const MANGA_BY_ID = { 30642: MANGA_ROOT };

check("toFranchiseRow: media_type derive du type AniList",
  A.toFranchiseRow(MANGA_BUILT, MANGA_BY_ID).media_type, "manga");
check("toFranchiseRow: source reste anilist (ids uniques, pas de namespace)",
  A.toFranchiseRow(MANGA_BUILT, MANGA_BY_ID).source, "anilist");
check("toEntryRows: episodes_total <- volumes (tomes), pas chapters",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].episodes_total, 29);
check("toEntryRows: manga sans duree",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].runtime_minutes, null);
check("toEntryRows: manga sans calendrier",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].next_episode_airing_at, null);
check("toEntryRows: kind manga preserve",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].kind, "manga");

// volumes null (serie en cours qu'AniList n'a pas comptee) : on n'invente pas
// un total a partir des chapitres.
const ONGOING = { ...MANGA_ROOT, id: 105398, status: "RELEASING",
  volumes: null, chapters: 179 };
check("toEntryRows: volumes null => episodes_total null, pas les chapitres",
  A.toEntryRows({ root_id: 105398, entries: [{ source_id: 105398, in_main_chain: true,
    kind: "manga", season_number: null, sort_order: 0 }] },
    { 105398: ONGOING })[0].episodes_total, null);

// Non-regression : un anime ne bouge pas.
check("toFranchiseRow: un anime reste media_type anime",
  A.toFranchiseRow({ root_id: 1, entries: [] },
    { 1: { id: 1, type: "ANIME", title: {}, genres: [], coverImage: {} } }).media_type,
  "anime");

// ── Walk d'un manga ───────────────────────────────────────────
// Le piege : relTargets filtrait node.type === "ANIME" en dur. Le walk d'un
// manga ne trouvait donc RIEN (ses SEQUEL/PREQUEL sont de type MANGA), et
// Vinland Saga porte deux ADAPTATION -> ANIME qu'il ne faut surtout pas
// aspirer dans la franchise manga.
const MG_GRAPH = {
  100: { id: 100, type: "MANGA", format: "MANGA", status: "FINISHED",
    title: { romaji: "Tome un" }, startDate: { year: 2005 }, relations: { edges: [
      { relationType: "SEQUEL", node: { id: 101, type: "MANGA", format: "MANGA" } },
      { relationType: "ADAPTATION", node: { id: 900, type: "ANIME", format: "TV" } },
    ] } },
  101: { id: 101, type: "MANGA", format: "MANGA", status: "RELEASING",
    title: { romaji: "Tome deux" }, startDate: { year: 2010 }, relations: { edges: [
      { relationType: "PREQUEL", node: { id: 100, type: "MANGA", format: "MANGA" } },
    ] } },
};
check("walk manga: la chaine suit les SEQUEL de type MANGA",
  [...A.chainIds(MG_GRAPH, 100)].sort(), [100, 101]);
check("walk manga: l'adaptation ANIME n'est jamais aspiree",
  [...A.missingIds(MG_GRAPH, 100)], []);
check("walk manga: buildFranchise produit des entrees kind manga",
  A.buildFranchise(MG_GRAPH, 100).entries.map((e) => e.kind), ["manga", "manga"]);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
