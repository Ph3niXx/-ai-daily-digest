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

// ── bootStageLabel : les 5 cles, et rien d'autre ─────────────
// Le repli generique fait lui aussi plus de 10 caracteres. Un test qui ne
// verifie que la longueur laisserait donc passer une cle disparue : l'appel
// tomberait sur le repli et le test dirait `ok`. Or c'est exactement la
// panne que ce test existe pour empecher — bootstrap.js (tache 5) pose ces
// cinq valeurs et rien d'autre.
const FALLBACK = V.bootStageLabel("cle-qui-n-existe-pas");
check("BOOT_STAGES porte exactement les 5 cles attendues",
  Object.keys(V.BOOT_STAGES).sort(),
  ["auth", "libs", "mount", "tier1", "tier2"]);

// Chaque cle doit rendre SON libelle, distinct du repli. C'est ce check-la
// qui casse si une cle disparait.
for (const stage of ["libs", "auth", "tier1", "tier2", "mount"]) {
  check(`bootStageLabel(${stage}) rend le libelle de BOOT_STAGES, pas le repli`,
    V.bootStageLabel(stage) === V.BOOT_STAGES[stage] && V.bootStageLabel(stage) !== FALLBACK,
    true);
}

// Les cinq libelles sont distincts entre eux : deux etapes qui rendraient le
// meme message ne diraient a l'utilisateur ou ca bloque qu'a moitie.
check("les 5 libelles sont tous distincts",
  new Set(Object.values(V.BOOT_STAGES)).size, 5);

// Une etape inconnue rend le repli, jamais undefined.
check("etape inconnue => repli generique, jamais undefined",
  typeof FALLBACK === "string" && FALLBACK.length > 10, true);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
