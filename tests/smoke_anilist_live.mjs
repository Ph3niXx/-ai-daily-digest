// Smoke test AniList RÉEL (réseau) — usage manuel/debug, pas en CI.
// Run: node tests/smoke_anilist_live.mjs [anchorId]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const anilist = require("../cockpit/lib/anilist.js");

const anchor = Number(process.argv[2]) || 154587; // Frieren
const results = await anilist.searchAnime("frieren");
console.log("search:", results.slice(0, 3).map((m) => `${m.id} ${m.title.romaji} [${m.format}]`));
const { built, mediaById } = await anilist.fetchFranchiseLive(anchor);
console.log("root:", built.root_id, mediaById[built.root_id].title.romaji);
for (const e of built.entries) {
  const m = mediaById[e.source_id];
  console.log(` ${e.in_main_chain ? "chain" : "bonus"} ${e.kind}${e.season_number ? " S" + e.season_number : ""} · ${m.title.romaji} · ${m.status} · ${anilist.fuzzyDate(m.startDate) || "?"}`);
}
console.log("franchiseRow:", JSON.stringify(anilist.toFranchiseRow(built, mediaById)).slice(0, 200));
