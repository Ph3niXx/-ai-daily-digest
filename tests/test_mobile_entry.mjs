// Verrouille le cablage du socle mobile dans les deux pages d'entree.
//
// Deux invariants que seule la production revelerait sinon, a ~3 min par
// iteration :
//   1. l'ordre de chargement (telemetry.js lit window.mobileView) ;
//   2. l'exclusion de components-mobile.jsx de mediatheque.html, dont
//      l'argument economique repose sur 2 scripts Babel et pas 3.
// Run: node tests/test_mobile_entry.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const PWA = fs.readFileSync(path.join(ROOT, "mediatheque.html"), "utf8");

let failures = 0;
function check(name, ok, detail) {
  if (ok) { console.log(`ok   ${name}`); return; }
  failures++;
  console.log(`FAIL ${name}${detail ? "\n  " + detail : ""}`);
}

const srcs = (html) => [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1].split("?")[0]);
const iIndex = srcs(INDEX);
const iPwa = srcs(PWA);

// ── index.html ───────────────────────────────────────────────
const mvIdx = iIndex.indexOf("cockpit/lib/mobile-view.js");
const telIdx = iIndex.indexOf("cockpit/lib/telemetry.js");
check("index.html charge mobile-view.js", mvIdx !== -1);
check("mobile-view.js precede telemetry.js dans index.html",
  mvIdx !== -1 && telIdx !== -1 && mvIdx < telIdx,
  `mobile-view a l'index ${mvIdx}, telemetry a l'index ${telIdx} — track() lit window.mobileView`);

const cmIdx = iIndex.indexOf("cockpit/components-mobile.jsx");
const homeIdx = iIndex.indexOf("cockpit/home.jsx");
check("index.html charge components-mobile.jsx", cmIdx !== -1);
check("components-mobile.jsx precede home.jsx",
  cmIdx !== -1 && homeIdx !== -1 && cmIdx < homeIdx,
  `components-mobile a l'index ${cmIdx}, home a l'index ${homeIdx} — home.jsx lit window.PanelSection`);

// ── mediatheque.html ─────────────────────────────────────────
// mobile-view.js est un script CLASSIQUE : il ne compte pas dans le budget
// Babel, et telemetry.js le lit ici aussi.
check("mediatheque.html charge mobile-view.js",
  iPwa.includes("cockpit/lib/mobile-view.js"),
  "sans lui, track() y perd son champ viewport (le garde evite le crash, pas la perte)");

check("mediatheque.html ne charge PAS components-mobile.jsx",
  !iPwa.includes("cockpit/components-mobile.jsx"),
  "ce serait un 3e script Babel : la Mediatheque est deja auditee mobile, elle n'en a pas besoin");

// Redondant avec test_mediatheque_entry.mjs, et c'est voulu : l'invariant se
// casse precisement quand on ajoute un composant partage a cette page.
const babelTags = [...PWA.matchAll(/<script\b[^>]*>/g)]
  .map((m) => m[0])
  .filter((tag) => /type="text\/babel"/.test(tag));
check("mediatheque.html transpile toujours exactement 2 scripts Babel",
  babelTags.length === 2, `${babelTags.length} script(s)`);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
