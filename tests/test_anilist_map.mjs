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

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
