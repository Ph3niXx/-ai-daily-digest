// Tests de la logique pure du portage mobile (JS pur, sans DOM).
// Run: node tests/test_mobile_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "mobile-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── Le palier ────────────────────────────────────────────────
// Valeur unique partagee par le CSS et le JS. Si elle change ici,
// styles-mobile.css doit changer dans le meme commit.
check("le palier vaut 760", V.MOBILE_MAX_WIDTH, 760);

// ── viewportKind : la frontiere est inclusive ────────────────
// 760 est mobile, 761 est desktop. Un off-by-one ici cree une largeur
// ou le CSS replie et la telemetrie dit "desktop".
check("390 (iPhone) => mobile",  V.viewportKind(390), "mobile");
check("760 (palier) => mobile",  V.viewportKind(760), "mobile");
check("761 => desktop",          V.viewportKind(761), "desktop");
check("1440 => desktop",         V.viewportKind(1440), "desktop");

// ── viewportKind : entrees degradees ─────────────────────────
// track() appelle cette fonction dans un contexte best-effort : elle ne
// doit jamais lever, et son repli doit etre "desktop" (ne pas inventer
// du mobile sur une mesure absente, ce qui gonflerait la sonde d'usage).
check("undefined => desktop", V.viewportKind(undefined), "desktop");
check("NaN => desktop",       V.viewportKind(NaN), "desktop");
check("chaine => desktop",    V.viewportKind("390"), "desktop");

// ── bootStageLabel : chaque etape a un libelle lisible ───────
// L'interet du delai de garde est que l'utilisateur LISE ou ca bloque.
// Un libelle manquant renverrait "undefined" a l'ecran.
for (const stage of ["libs", "auth", "tier1", "tier2", "mount"]) {
  const label = V.bootStageLabel(stage);
  check(`bootStageLabel(${stage}) est une phrase non vide`,
    typeof label === "string" && label.length > 10, true);
}
check("etape inconnue => repli generique, jamais undefined",
  typeof V.bootStageLabel("nawak") === "string" && V.bootStageLabel("nawak").length > 10, true);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
