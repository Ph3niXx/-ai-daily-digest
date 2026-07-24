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

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
