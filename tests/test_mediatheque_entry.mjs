// Verrouille l'accord entre les globales que panel-mediatheque.jsx LIT et les
// scripts que mediatheque.html CHARGE.
//
// Raison d'etre : le front se verifie en production (~3 min par iteration).
// Un <script> oublie coute un cycle complet pour un "undefined". C'est
// exactement ce qui est arrive avec PROFILE_DATA pendant la conception.
// Run: node tests/test_mediatheque_entry.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PANEL = fs.readFileSync(path.join(ROOT, "cockpit", "panel-mediatheque.jsx"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "mediatheque.html"), "utf8");

let failures = 0;
function check(name, ok, detail) {
  if (ok) { console.log(`ok   ${name}`); return; }
  failures++;
  console.log(`FAIL ${name}${detail ? "\n  " + detail : ""}`);
}

// Qui fournit quoi. A completer si le panel se met a lire une nouvelle globale.
const PROVIDERS = {
  MEDIATHEQUE_DATA: "cockpit/data-mediatheque.js",
  PROFILE_DATA:     "cockpit/data-profile.js",
  SUPABASE_URL:     "cockpit/lib/supabase.js",
  sb:               "cockpit/lib/supabase.js",
  anilist:          "cockpit/lib/anilist.js",
  tmdb:             "cockpit/lib/tmdb.js",
  mdtView:          "cockpit/lib/mediatheque-view.js",
  cockpitToast:     "cockpit/lib/dialog.js",
  track:            "cockpit/lib/telemetry.js",
  PanelMediatheque: "cockpit/panel-mediatheque.jsx",   // s'auto-fournit
};

// Globales LUES par le panel (on exclut les affectations `window.X =`).
const read = new Set(
  [...PANEL.matchAll(/window\.([A-Za-z_][A-Za-z0-9_]*)/g)]
    .map((m) => m[1])
    // Les globales du navigateur ne sont fournies par aucun script a nous.
    .filter((g) => !["location", "localStorage", "matchMedia", "innerWidth",
                     "addEventListener", "removeEventListener", "setTimeout",
                     "clearTimeout", "open", "scrollTo", "navigator", "document"].includes(g))
);

// Plancher anti-vacuite : si le panel cessait de lire la moindre globale
// (regex cassee par un refactor, filtre trop large...), les deux checks
// suivants passeraient trivialement sur un ensemble vide — "tout est
// couvert" parce qu'il n'y a plus rien a couvrir. C'est le seul garde-fou
// automatise sur l'invariant central de ce fichier.
check("le panel lit au moins une globale window.X", read.size > 0,
  `read.size = ${read.size} — regex cassee, ou panel qui ne lit plus rien via window.X ?`);

const assigned = new Set(
  [...PANEL.matchAll(/window\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g)].map((m) => m[1])
);

const scripts = [...HTML.matchAll(/src="([^"]+)"/g)].map((m) => m[1].split("?")[0]);

const unknown = [];
const notLoaded = [];
for (const g of read) {
  if (assigned.has(g) && g !== "PanelMediatheque") continue;   // le panel la definit lui-meme
  const provider = PROVIDERS[g];
  if (!provider) { unknown.push(g); continue; }
  if (!scripts.includes(provider)) notLoaded.push(`${g} → ${provider}`);
}

check("toute globale lue a un fournisseur connu", unknown.length === 0,
  `globales non repertoriees (ajouter a PROVIDERS ou verifier le panel) :\n  ${unknown.join(", ")}`);

check("mediatheque.html charge tous les fournisseurs necessaires", notLoaded.length === 0,
  `scripts manquants dans mediatheque.html :\n  ${notLoaded.join("\n  ")}`);

// nav.js doit preceder data-loader.js (data-loader.js:1167 lit COCKPIT_NAV).
const iNav = scripts.indexOf("cockpit/nav.js");
const iLoader = scripts.indexOf("cockpit/lib/data-loader.js");
check("nav.js est charge avant data-loader.js", iNav !== -1 && iLoader !== -1 && iNav < iLoader,
  `nav.js a l'index ${iNav}, data-loader.js a l'index ${iLoader}`);

// Le boot doit venir apres le panel, sinon il attend une globale jamais posee.
const iPanel = scripts.indexOf("cockpit/panel-mediatheque.jsx");
const iBoot = scripts.indexOf("cockpit/lib/boot-mediatheque.js");
check("boot-mediatheque.js est charge apres panel-mediatheque.jsx",
  iPanel !== -1 && iBoot !== -1 && iPanel < iBoot,
  `panel a l'index ${iPanel}, boot a l'index ${iBoot}`);

// L'argument economique de toute la page : peu de scripts Babel. On isole
// chaque balise <script ...> entiere puis on cherche l'attribut dedans,
// plutot qu'une regex ancree sur "type AVANT src" : un troisieme script
// Babel ecrit src=... puis type="text/babel" doit etre vu, pas echapper au
// comptage qui protege la seule justification economique de cette page.
const babelTags = [...HTML.matchAll(/<script\b[^>]*>/g)]
  .map((m) => m[0])
  .filter((tag) => /type="text\/babel"/.test(tag));
const babelSrcs = babelTags.map((tag) => (tag.match(/src="([^"]+)"/) || [, "?"])[1]);
check("mediatheque.html ne transpile que 2 scripts Babel", babelTags.length === 2,
  `${babelTags.length} script(s) : ${babelSrcs.join(", ")}`);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
