// Verrouille les <script> externes des deux pages d'entree : SRI obligatoire,
// version epinglee, et pas de canal sortant mort dans la CSP.
//
// Contexte (audit du 2026-08-15, vague 0) : supabase-js, DOMPurify et marked etaient
// charges sans `integrity`, alors que react/babel/js-yaml en avaient un — trois oublis,
// pas une decision. Ce sont pourtant les trois pires a laisser libres : supabase-js
// detient le JWT et toutes les requetes REST, DOMPurify EST la parade XSS citee par
// CLAUDE.md, et marked transforme du markdown externe en HTML.
//
// Run: node tests/test_cdn_integrity.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY_PAGES = ["index.html", "mediatheque.html"];

let failures = 0;
function check(name, ok, detail) {
  if (ok) { console.log(`ok   ${name}`); return; }
  failures++;
  console.log(`FAIL ${name}${detail ? "\n  " + detail : ""}`);
}

for (const page of ENTRY_PAGES) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  const tags = [...html.matchAll(/<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/g)];

  check(`${page} : des scripts externes sont bien detectes`, tags.length > 0,
    `${tags.length} balise(s)`);

  // 1. Chaque script distant porte integrity + crossorigin.
  //    Sans crossorigin="anonymous", le navigateur ne peut PAS verifier l'integrity
  //    d'une ressource cross-origin : il la charge sans controle. Les deux vont ensemble.
  for (const [tag, url] of tags.map((m) => [m[0], m[1]])) {
    const short = url.replace(/^https?:\/\//, "").slice(0, 64);
    check(`${page} : integrity sur ${short}`, /\bintegrity=["']sha(256|384|512)-/.test(tag));
    check(`${page} : crossorigin sur ${short}`, /\bcrossorigin=/.test(tag));
  }

  // 2. Aucune version flottante : @2 ou @latest laissent le CDN changer le contenu
  //    sans le moindre commit chez nous, ce qui rend l'integrity impossible a tenir.
  const floating = tags
    .map((m) => m[1])
    .filter((u) => /@(latest|\d+)(\/|$)/.test(u.replace(/^https?:\/\/[^/]+\//, "")));
  check(`${page} : aucune dependance en version flottante`, floating.length === 0,
    floating.join("\n  "));

  // 3. La CSP ne doit plus autoriser le tunnel Jarvis mort ni le localhost du meme tunnel :
  //    un joker *.trycloudflare.com est un point de chute anonyme et jetable, cree
  //    gratuitement en une commande — donc un canal d'exfiltration ouvert a toute
  //    injection qui passerait la barriere XSS.
  const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/);
  check(`${page} : la CSP est presente`, !!csp);
  if (csp) {
    check(`${page} : pas de joker trycloudflare dans la CSP`,
      !csp[1].includes("trycloudflare.com"));
    check(`${page} : pas de localhost dans la CSP`,
      !csp[1].includes("localhost"));
  }
}

console.log();
if (failures) {
  console.log(`${failures} echec(s)`);
  process.exit(1);
}
console.log("Tous les checks passent.");
