// Miroir JS des tests Python — mêmes fixtures, mêmes attentes.
// Run: node tests/test_franchise_walk.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { buildFranchise, missingIds, pruneDanglingEdges } = require(join(here, "..", "cockpit", "lib", "anilist.js"));
const FIXTURES = JSON.parse(readFileSync(join(here, "fixtures", "franchise_graphs.json"), "utf-8"));

const mediaMap = (c) => Object.fromEntries(c.media.map((m) => [m.id, m]));
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let failures = 0;
for (const c of FIXTURES.cases) {
  const got = buildFranchise(mediaMap(c), c.anchor);
  if (!deepEq(got, c.expected)) {
    failures++;
    console.log(`FAIL ${c.name}\n  expected: ${JSON.stringify(c.expected)}\n  got:      ${JSON.stringify(got)}`);
  } else console.log(`ok   ${c.name}`);
}
for (const mc of FIXTURES.missing_cases) {
  const full = mediaMap(FIXTURES.cases.find((c) => mediaMap(c)[mc.anchor]));
  const known = Object.fromEntries(Object.entries(full).filter(([k]) => mc.known.includes(Number(k))));
  const got = [...missingIds(known, mc.anchor)].sort((a, b) => a - b);
  if (!deepEq(got, [...mc.expected_missing].sort((a, b) => a - b))) {
    failures++;
    console.log(`FAIL ${mc.name}: expected ${mc.expected_missing}, got ${got}`);
  } else console.log(`ok   ${mc.name}`);
}
// Tombstone: un id disparu (type OTHER) ne doit jamais entrer dans la franchise.
{
  const tomb = {
    100: { id: 100, type: "ANIME", format: "TV", status: "FINISHED",
      startDate: { year: 2020, month: 1, day: 1 },
      relations: { edges: [
        { relationType: "SEQUEL", node: { id: 999, type: "ANIME", format: "TV" } } ] } },
    999: { id: 999, type: "OTHER" },
  };
  pruneDanglingEdges(tomb);
  const got = buildFranchise(tomb, 100);
  const exp = { root_id: 100, entries: [
    { source_id: 100, in_main_chain: true, kind: "season", season_number: 1, sort_order: 1 } ] };
  if (!deepEq(got, exp)) { failures++; console.log(`FAIL tombstone_pruned\n  expected: ${JSON.stringify(exp)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log("ok   tombstone_pruned");
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log("\nAll JS walk tests passed.");
