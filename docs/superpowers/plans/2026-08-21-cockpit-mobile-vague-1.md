# Cockpit mobile — socle technique et vague 1 · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le Brief du jour, le Miroir du soir et Jarvis utilisables sur un iPhone, en posant le socle réutilisable (composant de repli, observabilité du démarrage, mesure d'usage mobile) sur lequel les vagues suivantes s'appuieront.

**Architecture:** Un composant partagé `PanelSection` rend un fragment inchangé au-dessus de 760 px et un `<details>` natif en dessous ; les panels ne déclarent qu'une hiérarchie. La logique pure (palier, libellés) vit dans `cockpit/lib/mobile-view.js`, testable sous Node selon le patron `*-view.js` déjà en place. Aucun build step, aucun rendu dupliqué, aucune modification du DOM desktop.

**Tech Stack:** React 18 + `@babel/standalone` via CDN (aucune étape de build), scripts classiques exposant `window.X` (pas d'imports ES modules), Supabase REST, GitHub Pages de projet servi sous `/jarvis-cockpit/`. Tests : scripts Node autonomes (`tests/test_*.mjs`, ni `package.json` ni framework), découverts par glob dans `.github/workflows/tests.yml`.

**Spec:** `docs/superpowers/specs/2026-08-21-cockpit-mobile-design.md`

## Global Constraints

- **Zéro régression desktop.** Tout changement vit sous `@media (max-width: 760px)` ou derrière `useIsMobile()`. Au-dessus de 760 px, le DOM produit doit être identique à l'existant.
- **Palier unique : 760 px.** Défini une seule fois dans `mobile-view.js::MOBILE_MAX_WIDTH`. Le CSS et le JS doivent utiliser la même valeur — deux paliers divergents créent une bande de largeurs où le CSS replie et le JS non.
- **Pas d'imports ES modules dans `cockpit/`** — incompatible Babel standalone. Les composants s'exposent sur `window.X`.
- **`mediatheque.html` ne doit transpiler que 2 scripts Babel.** Invariant verrouillé par `tests/test_mediatheque_entry.mjs`. `components-mobile.jsx` (Babel) va donc dans `index.html` **seulement** ; `mobile-view.js` (script classique) va dans les deux — un script classique ne compte pas dans l'invariant.
- **Après toute modification de `index.html` ou `mediatheque.html`** : `node scripts/sync-sw.mjs`. Ne jamais éditer `STATIC[]` ou `CACHE` à la main.
- **Tout nouvel `event_type` ou champ de payload** → entrée dans `docs/telemetry.md` **avant** le commit.
- **Toute modification fonctionnelle d'un onglet** → MAJ `docs/specs/tab-<slug>.md` + bump `last_updated` dans `docs/specs/index.json`. CI `lint-specs` bloquant.
- **Le front se vérifie en production** (push sur `main` + hard-refresh Pages, ~3 min par itération). Aucun test de snapshot DOM n'est possible : pas de `package.json`, donc pas de React sous Node.
- **Encodage** : les scripts Python de ce repo plantent en `cp1252` sous Windows sur les emojis. Ne pas ajouter d'emoji aux sorties de scripts.

---

## File Structure

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `cockpit/lib/mobile-view.js` | **Créé.** Logique pure sans DOM : palier `MOBILE_MAX_WIDTH`, `viewportKind()`, libellés d'étapes de démarrage. Double export `window.mobileView` + `module.exports`. | 3 |
| `tests/test_mobile_view.mjs` | **Créé.** Tests de la logique pure. | 3 |
| `cockpit/lib/telemetry.js` | **Modifié.** Estampille `viewport` sur tout event, en un point unique. | 4 |
| `docs/telemetry.md` | **Modifié.** Documente `viewport`. | 4 |
| `cockpit/lib/bootstrap.js` | **Modifié.** Délai de garde 8 s : le loader affiche l'étape bloquée. | 5 |
| `cockpit/components-mobile.jsx` | **Créé.** `window.PanelSection`, `window.useIsMobile`. | 6 |
| `cockpit/styles-mobile.css` | **Modifié.** Bloc `.ps-*` (chrome du repli), puis blocs Miroir du soir et Jarvis. | 6, 8, 9 |
| `index.html` | **Modifié.** Charge `mobile-view.js` et `components-mobile.jsx`. | 6 |
| `mediatheque.html` | **Modifié.** Charge `mobile-view.js` seul (script classique). | 6 |
| `tests/test_mobile_entry.mjs` | **Créé.** Verrouille l'ordre de chargement et l'exclusion de `components-mobile.jsx` de la PWA. | 6 |
| `cockpit/home.jsx` | **Modifié.** Trois sections repliables, une tête épinglée. | 7 |
| `cockpit/panel-jarvis.jsx` | **Non touché.** Prévu conditionnellement (« uniquement si une classe manque pour cibler le composer ») ; la Task 9 s'est terminée CSS-only sur les classes existantes. | 9 |
| `docs/specs/tab-brief.md`, `tab-evening.md`, `tab-jarvis.md`, `docs/specs/index.json` | **Modifiés.** | 10 |
| `docs/architecture/decisions.md`, `repo-structure.md`, `CLAUDE.md` | **Modifiés.** Deux ADR, deux fichiers nouveaux, 30 → 31 onglets. | 10 |

---

### Task 1 : Consigner le résultat de la Task 0 d'ADR-30

Le plan `2026-07-27-mediatheque-pwa-ios.md` portait une Task 0 marquée **bloquante** : « l'OAuth Google survit-il au mode `standalone` sur iOS ? ». Elle a été jouée le 2026-08-21 et la réponse est oui, mais la spec correspondante porte toujours la mention « à tester en premier ». Une question tranchée qui reste écrite comme ouverte se re-teste.

**Files:**
- Modify: `docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md` (section « Risques et replis »)

**Interfaces:**
- Consumes: rien
- Produces: rien de consommé par du code — un constat daté qui ferme une question ouverte.

- [ ] **Step 1 : Localiser le paragraphe**

Run: `grep -n "à tester en premier" docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md`
Expected : une occurrence, dans la section « Risques et replis ».

- [ ] **Step 2 : Remplacer le paragraphe conditionnel par le constat**

Remplacer le paragraphe qui commence par `*À tester en premier*` par :

```markdown
**Résultat, 2026-08-21.** Testé sur l'appareil : `mediatheque.html` ouverte dans Safari sur
iPhone fonctionne ; installée sur l'écran d'accueil et lancée depuis son icône, Safari
fermé, elle démarre, s'authentifie et affiche son contenu. **L'OAuth Google survit au mode
`standalone` sur iOS** — aucun des deux replis prévus (`display: "minimal-ui"`, puis flow
PKCE) n'est nécessaire. Le cockpit complet a été vérifié dans la foulée : il s'ouvre et se
navigue sur le même appareil. Le seul défaut remonté est la mise en page, traité par
`docs/superpowers/specs/2026-08-21-cockpit-mobile-design.md`.
```

- [ ] **Step 3 : Vérifier qu'aucune autre mention ne reste ouverte**

Run: `grep -n "à tester en premier\|standalone" docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md`
Expected : plus aucune formulation au futur ou au conditionnel sur la survie de l'OAuth.

- [ ] **Step 4 : Commit**

```bash
git add docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md
git commit -m "docs(mediatheque): consigner le resultat de la sonde OAuth standalone"
```

---

### Task 2 : Vague 0 — réparer `daily_digest`

**Bloquant pour la vérification de la vague 1.** Le Brief est l'onglet le plus ouvert et l'écran d'atterrissage ; s'il est vide, on ne peut ni juger sa mise en page mobile ni mesurer son usage. `pipeline_health` le donne `failing` avec 4 échecs d'affilée et un dernier succès au 2026-08-17.

Cette tâche peut requérir une action hors du dépôt (console Gemini). Si c'est le cas, **s'arrêter et remonter au propriétaire du projet** plutôt que de contourner.

**Files:**
- Aucun fichier modifié si l'hypothèse du quota se confirme. Sinon, `main.py` selon le diagnostic.

**Interfaces:**
- Consumes: rien
- Produces: `articles` et `daily_briefs` frais du jour, condition de la Task 7 et de la mesure finale.

- [ ] **Step 1 : Lire la cause réelle dans les logs, pas dans les hypothèses**

```bash
gh run list --workflow=daily_digest.yml --limit 5
gh run view --log-failed $(gh run list --workflow=daily_digest.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected : un message d'erreur explicite. L'hypothèse enregistrée dans `pipeline_health.remediation` est un dépassement du quota Gemini (1000 req/jour, tier gratuit) — **la confirmer ou l'infirmer par le log avant d'agir.** Le précédent d'ADR-45 est net : quatre causes plausibles avaient été listées pour `weekly_analysis` et aucune n'était la bonne.

- [ ] **Step 2 : Vérifier l'état du quota**

Si le log pointe le quota : ouvrir `https://aistudio.google.com`, vérifier la consommation de la clé `GEMINI_API_KEY`.
**Cette étape est hors de portée d'un agent** — remonter au propriétaire du projet avec la ligne de log et attendre.

- [ ] **Step 3 : Relancer le pipeline**

```bash
gh workflow run daily_digest.yml
gh run watch $(gh run list --workflow=daily_digest.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected : conclusion `success`.

- [ ] **Step 4 : Vérifier que la donnée est bien arrivée**

Un run vert ne prouve rien — c'est exactement la panne qu'ADR-45 a mis cinq semaines à voir. Contrôler la table, pas le workflow :

```sql
select max(fetch_date) as dernier_jour, count(*) as articles_du_jour
from articles
where fetch_date = current_date;
```

Expected : `dernier_jour` = aujourd'hui, `articles_du_jour` > 0.

- [ ] **Step 5 : Relancer `veille_picks`, qui en dépend**

```bash
gh workflow run veille-picks.yml
```

Puis vérifier :

```sql
select max(created_at) from daily_picks;
```

Expected : horodatage du jour.

- [ ] **Step 6 : Pas de commit**

Aucun fichier modifié si le diagnostic était le quota. Si le log a révélé autre chose, **s'arrêter et re-planifier** : une correction de `main.py` n'est pas dans le périmètre de ce plan.

---

### Task 3 : `cockpit/lib/mobile-view.js` — la logique pure

Le repo teste sa logique de présentation en l'extrayant dans `cockpit/lib/*-view.js`, avec un double export (`window.X` pour le navigateur, `module.exports` pour Node), consommé par `createRequire` dans les tests. On suit ce patron : c'est le seul moyen d'avoir des tests automatisés sur ce lot, puisque React n'est pas disponible sous Node.

**Files:**
- Create: `cockpit/lib/mobile-view.js`
- Test: `tests/test_mobile_view.mjs`

**Interfaces:**
- Consumes: rien
- Produces: `window.mobileView` / `module.exports` exposant :
  - `MOBILE_MAX_WIDTH: number` (760)
  - `viewportKind(width: number): "mobile" | "desktop"`
  - `BOOT_STAGES: Record<string,string>`
  - `bootStageLabel(stage: string): string`

  Consommé par `telemetry.js` (Task 4), `bootstrap.js` (Task 5) et `components-mobile.jsx` (Task 6).

- [ ] **Step 1 : Écrire le test qui échoue**

Create `tests/test_mobile_view.mjs` :

```js
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
// Attention au piege : le repli generique fait lui aussi plus de 10
// caracteres. Un test qui ne verifierait que la longueur laisserait donc
// passer une cle disparue — l'appel tomberait sur le repli et le test dirait
// `ok`. Or c'est exactement la panne que ce test existe pour empecher :
// bootstrap.js (tache 5) pose ces cinq valeurs et rien d'autre.
const FALLBACK = V.bootStageLabel("cle-qui-n-existe-pas");
check("BOOT_STAGES porte exactement les 5 cles attendues",
  Object.keys(V.BOOT_STAGES).sort(),
  ["auth", "libs", "mount", "tier1", "tier2"]);

// Chaque cle rend SON libelle, distinct du repli. C'est ce check qui casse
// si une cle disparait.
for (const stage of ["libs", "auth", "tier1", "tier2", "mount"]) {
  check(`bootStageLabel(${stage}) rend le libelle de BOOT_STAGES, pas le repli`,
    V.bootStageLabel(stage) === V.BOOT_STAGES[stage] && V.bootStageLabel(stage) !== FALLBACK,
    true);
}

// Les cinq libelles sont distincts entre eux : deux etapes rendant le meme
// message ne diraient qu'a moitie ou ca bloque.
check("les 5 libelles sont tous distincts",
  new Set(Object.values(V.BOOT_STAGES)).size, 5);

check("etape inconnue => repli generique, jamais undefined",
  typeof FALLBACK === "string" && FALLBACK.length > 10, true);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `node tests/test_mobile_view.mjs`
Expected : FAIL — `Cannot find module .../cockpit/lib/mobile-view.js`

- [ ] **Step 3 : Écrire l'implémentation minimale**

Create `cockpit/lib/mobile-view.js` :

```js
// cockpit/lib/mobile-view.js
// Logique pure du portage mobile — aucun DOM, testable sous node.
// Double export : window.mobileView (navigateur) + module.exports (tests),
// meme patron que lib/sante-view.js et lib/games-view.js.
(function(){
  // Palier unique du portage. styles-mobile.css et useIsMobile() DOIVENT
  // utiliser cette valeur. Deux paliers qui divergent produisent une bande
  // de largeurs ou le CSS replie et le JS ne replie pas — le pire des deux
  // mondes, et invisible tant qu'on ne teste pas pile a cette largeur.
  const MOBILE_MAX_WIDTH = 760;

  // Repli volontaire sur "desktop" quand la largeur n'est pas mesurable.
  // Inventer du "mobile" sur une mesure absente gonflerait la sonde d'usage
  // qui decide de la suite du programme.
  function viewportKind(width){
    if (typeof width !== "number" || !isFinite(width)) return "desktop";
    return width <= MOBILE_MAX_WIDTH ? "mobile" : "desktop";
  }

  // Libelles du delai de garde du loader. Ils sont lus par l'utilisateur sur
  // son telephone, ou aucun Web Inspector n'est joignable depuis Windows :
  // ils doivent dire quoi faire, pas nommer une fonction.
  const BOOT_STAGES = {
    libs:  "Les scripts du cockpit ne se sont pas charges. Recharge la page.",
    auth:  "La connexion Google reste bloquee. Ferme l'application et rouvre-la depuis son icone.",
    tier1: "Les donnees du cockpit n'arrivent pas — Supabase ne repond pas.",
    tier2: "Le chargement de cet onglet est bloque. Reviens au Brief et reessaie.",
    mount: "L'interface n'a pas fini de se compiler. Recharge la page.",
  };

  function bootStageLabel(stage){
    return BOOT_STAGES[stage] || "Le demarrage est bloque a une etape inconnue. Recharge la page.";
  }

  const api = { MOBILE_MAX_WIDTH, viewportKind, BOOT_STAGES, bootStageLabel };
  if (typeof window !== "undefined") window.mobileView = Object.assign(window.mobileView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `node tests/test_mobile_view.mjs`
Expected : PASS — `Tous les tests passent`

- [ ] **Step 5 : Commit**

```bash
git add cockpit/lib/mobile-view.js tests/test_mobile_view.mjs
git commit -m "feat(mobile): logique pure du portage (palier 760, libelles de demarrage)"
```

---

### Task 4 : Le champ `viewport` sur la télémétrie

La spec prévoit `viewport` sur `section_opened`. **Ce plan l'estampille dans `track()` pour tous les events**, ce qui est un raffinement délibéré : un point d'instrumentation unique interdit qu'un event futur y échappe — exactement le raisonnement qui a justifié le wrapper `mdtTrack()` déjà documenté dans `docs/telemetry.md`. Le coût est d'un champ par ligne ; le bénéfice est de savoir, pour n'importe quel event, s'il vient du téléphone.

**Files:**
- Modify: `cockpit/lib/telemetry.js`
- Modify: `docs/telemetry.md`
- Modify: `docs/superpowers/specs/2026-08-21-cockpit-mobile-design.md` (aligner la spec sur ce raffinement)

**Interfaces:**
- Consumes: `window.mobileView.viewportKind` (Task 3)
- Produces: toute ligne de `usage_events` porte `payload.viewport ∈ {"mobile","desktop"}`, sauf si l'appelant en fournit un explicitement.

- [ ] **Step 1 : Modifier `track()`**

Dans `cockpit/lib/telemetry.js`, remplacer le corps de `track` par :

```js
  async function track(eventType, payload){
    try {
      if (!window.SUPABASE_URL || !window.sb) return;
      const base = payload || {};
      // `viewport` est estampille ICI et nulle part ailleurs : un point
      // d'instrumentation unique, donc aucun event ne peut y echapper. Meme
      // raison que le wrapper mdtTrack() de panel-mediatheque.jsx.
      //
      // L'etalement place `viewport` EN PREMIER : un appelant qui fournit
      // deja le champ garde sa valeur. On ne l'ecrase jamais.
      const vp = (window.mobileView && typeof window.innerWidth === "number")
        ? window.mobileView.viewportKind(window.innerWidth)
        : null;
      await window.sb.postJSON(window.SUPABASE_URL + "/rest/v1/usage_events", {
        event_type: eventType,
        payload: vp ? { viewport: vp, ...base } : base,
      });
    } catch (e) {
      console.warn("[track]", eventType, e.message);
    }
  }
```

Note : le garde `window.mobileView &&` n'est pas décoratif. `mediatheque.html` charge `telemetry.js`, et si `mobile-view.js` y manquait, l'absence de garde casserait toute la télémétrie de la PWA. La Task 6 ajoute bien le script aux deux pages ; le garde couvre l'ordre de chargement et les futures pages d'entrée.

- [ ] **Step 2 : Documenter le champ dans `docs/telemetry.md`**

Ajouter, juste après l'encart `> **surface**` existant :

```markdown
> **`viewport`** — depuis le 2026-08-21, **tous** les events portent un champ `viewport`
> valant `"mobile"` (largeur ≤ 760 px) ou `"desktop"`, estampillé dans `track()`
> (`cockpit/lib/telemetry.js`) et nulle part ailleurs : un point d'instrumentation unique
> interdit qu'un event futur y échappe. Un appelant qui fournit explicitement `viewport`
> garde sa valeur. C'est la mesure d'usage du portage iPhone — elle dit quels onglets sont
> ouverts depuis le téléphone, et le critère d'arrêt du programme s'y adosse (voir
> `docs/superpowers/specs/2026-08-21-cockpit-mobile-design.md`).
>
> **Limite connue, à ne pas oublier en la lisant :** `usage_events` n'accepte les `INSERT`
> que du rôle `authenticated`. Un démarrage qui meurt avant l'authentification n'écrit
> rien. `viewport` ne verra donc jamais une panne de démarrage — « pas utilisé » et
> « cassé » restent indiscernables dans cette table. C'est le délai de garde du loader
> (`cockpit/lib/bootstrap.js`) qui couvre cette classe de panne, pas la télémétrie.
```

Puis modifier la ligne `section_opened` du tableau :

```markdown
| `section_opened` | `{section, entry, viewport}` | Effet sur `[activePanel]` dans `cockpit/app.jsx` + `cockpit/lib/boot-mediatheque.js` |
```

- [ ] **Step 3 : Aligner la spec sur le raffinement**

Dans `docs/superpowers/specs/2026-08-21-cockpit-mobile-design.md`, section « Vérification », remplacer « Un champ `viewport` (`mobile` / `desktop`, dérivé de `matchMedia` au moment de l'émission) s'ajoute à `section_opened` » par « Un champ `viewport` (`mobile` / `desktop`, dérivé de `window.innerWidth`) est estampillé dans `track()` et porté par **tous** les events — un point d'instrumentation unique interdit qu'un event futur y échappe ».

- [ ] **Step 4 : Vérifier qu'aucun test existant ne casse**

Run: `for f in tests/test_*.mjs; do node "$f" || echo "ECHEC: $f"; done`
Expected : tous passent.

- [ ] **Step 5 : Commit**

```bash
git add cockpit/lib/telemetry.js docs/telemetry.md docs/superpowers/specs/2026-08-21-cockpit-mobile-design.md
git commit -m "feat(telemetrie): estampiller viewport sur tous les events"
```

---

### Task 5 : Le délai de garde du loader

Correctif réel de l'angle mort d'observabilité. Un démarrage avorté ne peut pas écrire en base — mais il peut s'afficher. Aujourd'hui, `bootstrap.js` laisse « Chargement du cockpit… » indéfiniment quelle que soit l'étape qui bloque, et aucun Web Inspector n'est joignable depuis Windows pour diagnostiquer un iPhone.

Seuil : **8 secondes**. Volontairement large — il doit distinguer une panne d'un démarrage lent en réseau mobile, pas alarmer au moindre délai.

**Files:**
- Modify: `cockpit/lib/bootstrap.js`

**Interfaces:**
- Consumes: `window.mobileView.bootStageLabel` (Task 3)
- Produces: rien de consommé par du code.

- [ ] **Step 1 : Déclarer l'étape courante et armer le garde**

Dans `cockpit/lib/bootstrap.js`, juste après `document.body.appendChild(loader);`, insérer :

```js
  // Delai de garde. Sans lui, une panne d'authentification ou de reseau laisse
  // « Chargement du cockpit… » a l'ecran indefiniment : c'est exactement le
  // silence qui a rendu indiscernables « PWA non utilisee » et « PWA cassee »
  // pendant trois semaines (cf. spec 2026-08-21). La telemetrie ne peut pas
  // couvrir ce cas — usage_events exige une session — donc le diagnostic doit
  // s'afficher sur l'appareil.
  //
  // 8 s : assez large pour ne pas alarmer sur un demarrage lent en 4G, assez
  // court pour qu'on ne referme pas l'app avant de voir le message.
  let bootStage = "libs";
  const bootGuard = setTimeout(() => {
    const l = document.getElementById("cockpit-loader");
    if (!l) return;
    const label = (window.mobileView && window.mobileView.bootStageLabel(bootStage))
      || "Le demarrage est bloque. Recharge la page.";
    l.innerHTML =
      '<div style="max-width:320px;padding:0 24px;text-align:center;line-height:1.6;'
      + 'text-transform:none;letter-spacing:0;font-size:14px">'
      + '<div style="font-weight:600;margin-bottom:10px">Le cockpit ne demarre pas</div>'
      + '<div style="color:#8A7B6E">' + label + '</div></div>';
  }, 8000);
```

- [ ] **Step 2 : Désarmer le garde dans `removeLoader`**

Remplacer la fonction `removeLoader` existante par :

```js
  function removeLoader(){
    clearTimeout(bootGuard);
    const l = document.getElementById("cockpit-loader");
    if (l) l.remove();
  }
```

- [ ] **Step 3 : Marquer chaque étape**

Poser `bootStage` avant chaque phase, aux quatre emplacements suivants de `bootstrap.js` :

```js
    // avant `await window.cockpitAuth.waitForAuth();`
    bootStage = "auth";

    // avant `await window.cockpitDataLoader.bootTier1();`
    bootStage = "tier1";

    // avant `await dl.loadPanel(initialPanel);`
    bootStage = "tier2";

    // avant la boucle `while (!window.__cockpitMount && waited < 15000)`
    bootStage = "mount";
```

- [ ] **Step 4 : Vérifier le comportement nominal en local**

Run: ouvrir `index.html` en `file://` dans un navigateur de bureau.
Expected : le loader disparaît normalement, **aucun** message de panne (le garde est désarmé par `removeLoader`). Si le message apparaît alors que le cockpit s'affiche, `clearTimeout` n'est pas appelé sur tous les chemins de sortie.

- [ ] **Step 5 : Vérifier le comportement dégradé**

Passer temporairement le délai de `8000` à `300`, recharger, constater que le message s'affiche avec le libellé de l'étape atteinte, puis **remettre `8000`**.
Expected : un message lisible, pas `undefined`.

- [ ] **Step 6 : Commit**

```bash
git add cockpit/lib/bootstrap.js
git commit -m "feat(mobile): delai de garde du loader, l'etape bloquee s'affiche sur l'appareil"
```

---

### Task 6 : `PanelSection` et son intégration

Le composant partagé et son câblage dans les deux pages d'entrée. C'est la tâche qui porte l'invariant le plus fragile du lot : `components-mobile.jsx` est un script Babel, et `mediatheque.html` en tolère exactement deux.

**Files:**
- Create: `cockpit/components-mobile.jsx`
- Modify: `cockpit/styles-mobile.css` (bloc `.ps-*`)
- Modify: `index.html` (deux `<script>`)
- Modify: `mediatheque.html` (un `<script>` classique)
- Test: `tests/test_mobile_entry.mjs`

**Interfaces:**
- Consumes: `window.mobileView.MOBILE_MAX_WIDTH` (Task 3)
- Produces:
  - `window.useIsMobile(): boolean` — réactif au redimensionnement
  - `window.PanelSection(props)` avec :
    - `head?: ReactNode` — l'en-tête desktop existant, repris **verbatim** du panel
    - `summary: string` — le libellé de la barre repliée
    - `hint?: string` — ce que la section contient, sans l'ouvrir
    - `pinned?: boolean` (défaut `false`) — si vrai, rendu identique au desktop même sur mobile
    - `sectionClass?: string` — si fourni, enveloppe dans `<section className={...}>`. **Branche desktop uniquement** : ces classes décrivent une mise en page multi-colonnes qui n'a pas de sens dans un `<details>` replié, et qui viserait le chrome au lieu du contenu.
    - `children: ReactNode`

  Consommé par `cockpit/home.jsx` (Task 7).

- [ ] **Step 1 : Écrire le test d'invariant qui échoue**

Create `tests/test_mobile_entry.mjs` :

```js
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
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `node tests/test_mobile_entry.mjs`
Expected : FAIL sur `index.html charge mobile-view.js` et `index.html charge components-mobile.jsx`.

- [ ] **Step 3 : Écrire le composant**

Create `cockpit/components-mobile.jsx` :

```jsx
// cockpit/components-mobile.jsx
// Socle du portage mobile. Expose window.useIsMobile et window.PanelSection.
//
// Regle cardinale : AU-DESSUS DE 760 px, CE COMPOSANT NE DOIT RIEN CHANGER AU
// DOM. Il rend `head` puis `children`, dans un fragment ou dans la <section>
// que le panel lui indique — c'est-a-dire exactement ce que le panel rendait
// avant. C'est ce qui rend la contrainte « zero regression desktop »
// verifiable par lecture plutot qu'esperee : si vous devez ajouter une
// balise, une classe ou un wrapper dans la branche desktop, la contrainte est
// rompue et le probleme est ailleurs.

function useIsMobile(){
  const query = "(max-width: " + window.mobileView.MOBILE_MAX_WIDTH + "px)";
  const [matches, setMatches] = React.useState(
    () => window.matchMedia && window.matchMedia(query).matches
  );
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    // Resynchronisation au montage : la largeur a pu changer entre le
    // useState initial et l'effet (rotation de l'appareil pendant le boot).
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function PanelSection({ head, summary, hint, pinned = false, sectionClass = "", children }) {
  const isMobile = useIsMobile();

  // Desktop, ou section epinglee sur mobile : rendu d'origine, intact.
  if (!isMobile || pinned) {
    const body = <>{head}{children}</>;
    return sectionClass ? <section className={sectionClass}>{body}</section> : body;
  }

  // Mobile : <details> natif. Pas de useState, pas de persistance —
  // l'element HTML porte son propre etat, l'accessibilite et le clavier
  // viennent avec, et iOS Safari le gere nativement.
  //
  // `head` n'est PAS rendu ici : le <summary> le remplace. Le rendre en plus
  // afficherait deux fois le titre une fois la section depliee.
  //
  // `sectionClass` n'est PAS reporte ici non plus, et c'est deliberé. Ces
  // classes decrivent une mise en page desktop : `block--two` est une grille
  // a deux colonnes qui attend ses `.col` en enfants DIRECTS. Sur le <details>
  // les enfants directs sont <summary> et .ps-body — la grille viserait le
  // chrome du repli au lieu du contenu. Le repli mobile est une colonne
  // unique par construction : il n'a besoin d'aucune de ces classes.
  return (
    <details className="ps">
      <summary className="ps-sum">
        <span className="ps-sum-title">{summary}</span>
        {hint ? <span className="ps-sum-hint">{hint}</span> : null}
      </summary>
      <div className="ps-body">{children}</div>
    </details>
  );
}

window.useIsMobile = useIsMobile;
window.PanelSection = PanelSection;
```

- [ ] **Step 4 : Ajouter le chrome CSS**

Dans `cockpit/styles-mobile.css`, à l'intérieur du bloc `@media (max-width: 760px)` existant (ligne 59), ajouter :

```css
  /* ─── Repli progressif (PanelSection) ─────────────────────
     N'existe que sous 760 px : au-dessus, le composant rend un fragment et
     aucun de ces selecteurs n'a de cible. La hauteur mini de 44 px est la
     cible tactile minimale, pas une valeur esthetique. */
  /* Le composant ne reporte pas `sectionClass` sur mobile (cf. le commentaire
     dans components-mobile.jsx) : les marges verticales que `.block` donnait
     au bloc doivent donc etre portees ici, sinon les replis se collent. */
  .ps { border-top: 1px solid var(--bd); margin-top: 20px; }
  .ps-sum {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    padding: 12px 0;
    cursor: pointer;
    list-style: none;
  }
  /* Le chevron natif de Safari est remplace par le notre, aligne a droite. */
  .ps-sum::-webkit-details-marker { display: none; }
  .ps-sum::after {
    content: "";
    flex: none;
    width: 7px;
    height: 7px;
    margin-right: 4px;
    border-right: 1.5px solid var(--tx2);
    border-bottom: 1.5px solid var(--tx2);
    transform: rotate(45deg) translate(-2px, -2px);
    transition: transform .15s ease;
  }
  .ps[open] > .ps-sum::after { transform: rotate(-135deg); }
  .ps-sum-title {
    font-family: var(--font-display, serif);
    font-size: 16px;
    line-height: 1.3;
    color: var(--tx);
  }
  /* Le hint porte tout l'interet du repli : une section fermee doit dire ce
     qu'elle contient, sinon on ne l'ouvre jamais. */
  .ps-sum-hint {
    margin-left: auto;
    font-family: var(--font-body, Inter);
    font-size: 12px;
    color: var(--tx2);
    text-align: right;
    white-space: nowrap;
  }
  .ps-body { padding-bottom: 24px; }
```

- [ ] **Step 5 : Câbler `index.html`**

Insérer `mobile-view.js` **avant** `telemetry.js` (ligne 61), donc juste avant `cockpit/lib/supabase.js` (ligne 60) :

```html
<script src="cockpit/lib/mobile-view.js?v=1"></script>
```

Insérer `components-mobile.jsx` juste après `icons.jsx` (ligne 95) et **avant** `home.jsx` (ligne 97) :

```html
<script type="text/babel" src="cockpit/components-mobile.jsx?v=1"></script>
```

- [ ] **Step 6 : Câbler `mediatheque.html`**

Insérer, juste avant `cockpit/lib/telemetry.js` :

```html
<script src="cockpit/lib/mobile-view.js?v=1"></script>
```

**Ne pas** y ajouter `components-mobile.jsx` : ce serait un troisième script Babel, et la Médiathèque est déjà auditée mobile.

- [ ] **Step 7 : Resynchroniser le service worker**

Run: `node scripts/sync-sw.mjs`
Expected : `STATIC[]` contient désormais `cockpit/lib/mobile-view.js` et `cockpit/components-mobile.jsx`, préfixés `/jarvis-cockpit/`.

- [ ] **Step 8 : Lancer toute la suite Node**

Run: `for f in tests/test_*.mjs; do echo "── $f"; node "$f" || echo "ECHEC: $f"; done`
Expected : tous passent, y compris `test_mobile_entry.mjs`, `test_mediatheque_entry.mjs` et `test_sw_static.mjs`.

- [ ] **Step 9 : Commit**

```bash
git add cockpit/components-mobile.jsx cockpit/styles-mobile.css index.html mediatheque.html sw.js tests/test_mobile_entry.mjs
git commit -m "feat(mobile): composant PanelSection et cablage des deux entrees"
```

---

### Task 7 : Vague 1a — le Brief du jour

`cockpit/home.jsx` (1028 lignes) empile quatre blocs sous le hero : « Commence par ça » (les items du matin), « Top du jour », un bloc deux colonnes « Signaux faibles + Radar compétences », et « Ma semaine ». Chacun est un `<section className="block">` contenant un `<div className="block-head">`.

**Décision de hiérarchie** — c'est le contenu éditorial de la tâche :

| Bloc | Traitement mobile | Raison |
|---|---|---|
| Hero / zero-state | Inchangé | Il n'est pas dans une `<section className="block">`, il ouvre l'écran. |
| « Commence par ça » | **Épinglé** (`pinned`) | C'est ce qui justifie d'ouvrir le Brief. Le replier viderait le premier écran. |
| « Top du jour » | Replié | `hint` = nombre d'incontournables. |
| « Signaux + Radar » | Replié, **d'un seul bloc** | Les deux colonnes vivent dans une même `<section className="block block--two">`. Les replier séparément demanderait de casser cette section — donc un risque de régression desktop pour un gain non mesuré. À rouvrir si l'usage le réclame. |
| « Ma semaine » | Replié | `hint` = articles lus. |

**Files:**
- Modify: `cockpit/home.jsx` (blocs autour des lignes 762, 902, 954)

**Interfaces:**
- Consumes: `window.PanelSection` (Task 6)
- Produces: rien de consommé par du code.

- [ ] **Step 1 : Replier « Top du jour »**

Le bloc commence ligne ~762 par `<section className="block">`. Le transformer ainsi — l'en-tête existant part **verbatim** dans `head`, le contenu reste `children` :

```jsx
      <PanelSection
        sectionClass="block"
        summary="Top du jour"
        hint={`${top.length} incontournable${top.length > 1 ? "s" : ""}`}
        head={
          <div className="block-head">
            <div>
              <div className="section-kicker">Top du jour</div>
              <h2 className="section-title">3 incontournables, classés par l'agent</h2>
            </div>
            <button className="link-more" onClick={() => onNavigate("top")}>
              Tous les incontournables <Icon name="arrow_right" size={12} stroke={2} />
            </button>
          </div>
        }
      >
        <div className="top-grid">
          {/* ...contenu existant, inchange... */}
        </div>
      </PanelSection>
```

**Le `</section>` fermant du bloc devient `</PanelSection>`.** Ne rien changer d'autre à l'intérieur.

- [ ] **Step 2 : Replier « Signaux + Radar »**

Le bloc commence ligne ~902 par `<section className="block block--two">`. Il n'a pas de `block-head` propre : chaque colonne a le sien. `head` reste donc vide et le `<summary>` porte seul le titre sur mobile :

```jsx
      <PanelSection
        sectionClass="block block--two"
        summary="Signaux faibles · Radar"
        hint={`${signals.length} signaux`}
      >
        <div className="col col--signals">
          {/* ...contenu existant, inchange... */}
        </div>
        <div className="col col--radar">
          {/* ...contenu existant, inchange... */}
        </div>
      </PanelSection>
```

- [ ] **Step 3 : Replier « Ma semaine »**

Le bloc commence ligne ~954 :

```jsx
      <PanelSection
        sectionClass="block"
        summary="Ma semaine"
        hint={`${week.total_read} articles lus`}
        head={
          <div className="block-head">
            <div>
              <div className="section-kicker">Ma semaine</div>
              <h2 className="section-title">{week.total_read} articles lus, {week.streak} jours d'affilée</h2>
            </div>
            <button className="link-more" onClick={() => onNavigate("week")}>
              Ouvrir ma semaine <Icon name="arrow_right" size={12} stroke={2} />
            </button>
          </div>
        }
      >
        <div className="hwk-wrap">
          {/* ...contenu existant, inchange... */}
        </div>
      </PanelSection>
```

- [ ] **Step 4 : Ne pas toucher « Commence par ça »**

Le bloc du matin (autour de la ligne 208) reste tel quel. `pinned` n'a pas besoin d'être utilisé ici : ne pas envelopper du tout est plus simple et strictement équivalent. La prop `pinned` existe pour les panels des vagues suivantes où une section épinglée doit voisiner avec des sections repliées **dans une liste construite dynamiquement**.

- [ ] **Step 5 : Vérifier l'équilibre des balises**

Run: `node -e "const s=require('fs').readFileSync('cockpit/home.jsx','utf8'); console.log('PanelSection ouvrants:', (s.match(/<PanelSection/g)||[]).length, '| fermants:', (s.match(/<\/PanelSection>/g)||[]).length, '| section ouvrants:', (s.match(/<section /g)||[]).length, '| fermants:', (s.match(/<\/section>/g)||[]).length)"`
Expected : `PanelSection ouvrants: 3 | fermants: 3`, et les `<section>` restants équilibrés. Un déséquilibre ici est une page blanche en production.

- [ ] **Step 6 : Bumper le cache-buster**

Dans `index.html`, passer `cockpit/home.jsx?v=11` à `?v=12`, puis relancer `node scripts/sync-sw.mjs`.

- [ ] **Step 7 : Vérifier en production**

```bash
git add cockpit/home.jsx index.html sw.js
git commit -m "feat(brief): repli progressif des trois blocs secondaires sur mobile"
git push
```

Attendre ~2 min, puis **hard-refresh** de `https://ph3nixx.github.io/jarvis-cockpit/` :
- **Sur desktop** : les quatre blocs sont déroulés, dans le même ordre, avec les mêmes titres et les mêmes boutons qu'avant. Aucun chevron, aucune barre de repli.
- **Sur iPhone** : « Commence par ça » est visible d'emblée ; les trois autres sont trois barres repliées portant leur `hint` ; chacune s'ouvre au toucher.

Si un bloc apparaît replié sur desktop, `useIsMobile()` retourne `true` à tort — vérifier que `mobile-view.js` est bien chargé avant `components-mobile.jsx`.

---

### Task 8 : Vague 1b — le Miroir du soir

`cockpit/panel-evening.jsx` (122 lignes) rend **un bloc unique** — un `summary_html` encadré de quatre états (chargement, erreur, attente, contenu). Il n'a pas de sections empilées, donc **`PanelSection` ne s'y applique pas**. `cockpit/styles-evening.css` possède déjà un `@media (max-width: 720px)`.

Cette tâche est donc une **vérification d'abord, une correction ensuite** : ne pas réécrire ce qui fonctionne déjà.

**Files:**
- Modify: `cockpit/styles-mobile.css` (uniquement si l'audit révèle un trou)

**Interfaces:**
- Consumes: rien
- Produces: rien

- [ ] **Step 1 : Lire ce que le palier 720 px couvre déjà**

Run: `sed -n '94,140p' cockpit/styles-evening.css`
Expected : constater quelles propriétés sont déjà repliées. Noter ce qui manque.

- [ ] **Step 2 : Auditer l'onglet sur l'appareil**

Ouvrir `https://ph3nixx.github.io/jarvis-cockpit/#evening` sur l'iPhone. Contrôler, dans cet ordre :
1. la page ne défile pas horizontalement ;
2. le corps de texte est lisible sans zoomer (≥ 15 px) ;
3. le bouton « ← Brief » du pied fait au moins 44 px de haut ;
4. le `summary_html` injecté ne déborde pas (tableaux, `<pre>`, images).

- [ ] **Step 3 : Si et seulement si un défaut est constaté, ajouter un bloc ciblé**

Dans le `@media (max-width: 760px)` de `cockpit/styles-mobile.css`, ajouter un bloc commenté et **ciblé sur les vraies classes** (`.evening`, `.evening-title`, `.evening-body`, `.evening-foot` — relevées dans `styles-evening.css`). Ne pas deviner de sélecteurs : l'audit du 2026-05-22 avait produit ~38 sélecteurs morts de cette façon.

- [ ] **Step 4 : Mettre à jour le commentaire d'en-tête de `styles-mobile.css`**

L'en-tête liste les panels réellement audités pour le mobile. Ajouter le Miroir du soir à cette liste, avec la date — que le résultat ait été « rien à corriger » ou non. C'est ce silence qui avait rendu le trou de Jobs Radar invisible.

- [ ] **Step 5 : Commit**

```bash
git add cockpit/styles-mobile.css
git commit -m "fix(evening): audit mobile du miroir du soir"
```

Si l'audit n'a rien révélé, commiter tout de même la mise à jour de l'en-tête : l'information « audité, rien à corriger » a de la valeur.

---

### Task 9 : Vague 1c — Jarvis

`cockpit/styles-jarvis.css` n'a qu'un `@media (max-width: 880px)` — un palier de tablette. Or Jarvis est le seul onglet de la vague 1 à **recevoir de la saisie**, ce qui déclenche sur iOS trois comportements que le desktop ignore : le clavier qui recouvre la moitié de l'écran, le zoom automatique de Safari sur tout champ de moins de 16 px, et la barre d'accueil qui mange le bas de la zone sûre.

**Files:**
- Modify: `cockpit/styles-mobile.css` (bloc `.jv-*`)
- Modify: `cockpit/panel-jarvis.jsx` (uniquement si une classe manque pour cibler le composer)

**Interfaces:**
- Consumes: rien
- Produces: rien

- [ ] **Step 1 : Connaître la structure réelle (relevée le 2026-08-21, à ne pas re-dériver)**

L'imbrication effective, lue dans `cockpit/panel-jarvis.jsx:615-800` — elle **ne correspond pas** à ce qu'une lecture rapide suggère :

```
.jv-wrap                 grille 2 colonnes, height: calc(100vh - 41px), min-height: 720px
  .jv-chat               flex column, min-height: 0, border-right
    header.jv-header     flex-shrink: 0
    .jv-scroll           flex:1, min-height:0, overflow-y:auto  ← LE conteneur de defilement
      .jv-feed           max-width 720px, margin auto, padding 0 36px  (PAS un scroller)
    .jv-composer-wrap    flex-shrink:0, padding 10px 36px 16px
      .jv-composer-inner max-width 720px
        .jv-prompts
        .jv-composer     flex, align-items: flex-end
          textarea       font-size: 15px
          .jv-composer-actions
            .jv-iconbtn ×2   32×32
            .jv-send
  .jv-memory             masquee sous 880px par styles-jarvis.css:23-26
```

Deux conséquences qui gouvernent le Step 2 : **le défilement fonctionne déjà** (`.jv-scroll` porte tout ce qu'il faut, `styles-jarvis.css:268`) — ne pas y toucher, et surtout ne pas poser d'`overflow-y` sur `.jv-feed`, ce qui créerait un second scroller imbriqué. Et le palier 880 px existant ne fait qu'une chose : passer `.jv-wrap` en une colonne et masquer `.jv-memory`.

Vérifier que cette structure n'a pas bougé avant d'écrire le CSS :

Run: `grep -n "jv-wrap\|jv-chat\|jv-scroll\|jv-feed\|jv-composer-wrap\|jv-composer\"\|jv-send" cockpit/panel-jarvis.jsx | head -12`
Expected : `.jv-scroll` présent et englobant `.jv-feed`. Si ce n'est plus le cas, **s'arrêter et remonter** — le Step 2 repose dessus.

- [ ] **Step 2 : Ajouter le bloc mobile**

Dans le `@media (max-width: 760px)` de `cockpit/styles-mobile.css` :

```css
  /* ─── Jarvis — le seul onglet de la vague 1 qui recoit de la saisie ───
     styles-jarvis.css ne descend qu'a 880 px, et ce palier ne fait qu'une
     chose : passer .jv-wrap en une colonne et masquer .jv-memory. Le reste
     de la mise en page reste celle du bureau.

     Ne PAS toucher au defilement : .jv-scroll porte deja
     `flex:1; min-height:0; overflow-y:auto` (styles-jarvis.css:268) et
     .jv-chat est deja `flex column; min-height:0` (l.31). .jv-feed n'est
     PAS le conteneur de defilement — c'est une boite centree de 720 px a
     l'interieur de .jv-scroll. Y poser overflow-y creerait un second
     scroller imbrique.

     Les quatre regles ci-dessous traitent des defauts constates par lecture
     du CSS existant, pas des suppositions. */

  /* LE defaut de mise en page. .jv-wrap impose `height: calc(100vh - 41px)`
     ET `min-height: 720px` (l.16-17). Sur un iPhone, le min-height depasse
     la hauteur utile une fois la barre d'adresse et la barre d'accueil
     deduites : le composer passe sous la ligne de flottaison. Et 100vh
     ignore la barre d'adresse retractable de Safari, la ou 100dvh la suit. */
  .jv-wrap { height: 100dvh; min-height: 0; }

  /* En colonne unique, la bordure droite de la colonne chat devient un trait
     vertical orphelin colle au bord de l'ecran. */
  .jv-chat { border-right: none; }

  /* 36 px de padding de chaque cote (l.286 et l.505) ne laissent que 318 px
     de contenu sur un ecran de 390. L'inset bas est ce qui empeche le bouton
     d'envoi de passer sous la barre d'accueil en PWA plein ecran. */
  .jv-feed { padding: 0 16px; }
  .jv-composer-wrap { padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0px)); }

  /* Le textarea est a 15 px (l.568) — un pixel sous le seuil. Safari zoome
     sur tout champ de saisie sous 16 px et ne dezoome jamais ensuite. 16px
     n'est pas un choix esthetique, c'est le seuil exact. */
  .jv-composer textarea { font-size: 16px; }

  /* .jv-iconbtn fait 32x32 (l.111) : sous la cible tactile minimale. */
  .jv-iconbtn, .jv-send { min-width: 44px; min-height: 44px; }
```

- [ ] **Step 3 : Vérifier que les sélecteurs existent réellement**

Les six classes que le Step 2 cible sont `jv-wrap`, `jv-chat`, `jv-feed`, `jv-composer-wrap`, `jv-composer`, `jv-iconbtn`, `jv-send`. Chacune doit apparaître dans le JSX :

Run: `grep -c "jv-wrap" cockpit/panel-jarvis.jsx` (puis idem pour chaque classe, une commande par classe)
Expected : chaque compte ≥ 1. **Une classe à 0 est un sélecteur mort** — corriger le CSS pour cibler la vraie classe, jamais ajouter la classe au JSX pour faire coller le CSS. C'est ce réflexe inversé qui avait produit ~38 sélecteurs morts lors de l'audit du 2026-05-22.

Vérifier aussi qu'aucune règle du Step 2 ne duplique une règle déjà portée par `styles-jarvis.css` : `.jv-chat` y est déjà `flex column; min-height: 0` (l.31-36) et `.jv-scroll` déjà `flex:1; overflow-y:auto` (l.268-274). Le Step 2 ne doit rien réaffirmer de tout ça.

- [ ] **Step 4 : Mettre à jour l'en-tête de `styles-mobile.css`**

Ajouter Jarvis à la liste des panels réellement audités, avec la date.

- [ ] **Step 5 : Vérifier en production sur l'appareil**

```bash
git add cockpit/styles-mobile.css
git commit -m "fix(jarvis): passe mobile du chat (clavier iOS, safe-area, zoom Safari)"
git push
```

Sur l'iPhone, après hard-refresh, ouvrir `#jarvis` et contrôler :
1. le champ de saisie est visible **pendant** que le clavier est ouvert ;
2. toucher le champ ne déclenche **pas** de zoom ;
3. le bouton d'envoi n'est pas masqué par la barre d'accueil ;
4. le fil de conversation défile indépendamment du composer.

- [ ] **Step 6 : Vérifier la non-régression desktop**

Sur l'écran de travail, après hard-refresh : le chat occupe la même hauteur, le composer est sur une ligne, rien n'a bougé. Les règles étant sous `@media (max-width: 760px)`, aucune ne devrait s'appliquer — le vérifier plutôt que le supposer.

---

### Task 10 : Clôture documentaire

Les règles cardinales de `CLAUDE.md` exigent que la doc parte dans le même commit que le code. Cette tâche existe parce que le lot touche trois onglets, ajoute deux fichiers et prend deux décisions structurantes.

**Files:**
- Modify: `docs/specs/tab-brief.md`, `docs/specs/tab-evening.md`, `docs/specs/tab-jarvis.md`
- Modify: `docs/specs/index.json` (bump `last_updated` des trois)
- Modify: `docs/architecture/repo-structure.md` (deux fichiers nouveaux)
- Modify: `docs/architecture/decisions.md` (deux ADR)
- Modify: `CLAUDE.md` (30 → 31 onglets)

**Interfaces:**
- Consumes: rien
- Produces: rien

- [ ] **Step 1 : Mettre à jour les trois specs d'onglet**

Dans chacune, décrire le comportement mobile. Pour `tab-brief.md`, nommer explicitement quelles sections sont repliées et laquelle est épinglée — c'est une décision éditoriale, pas un détail d'implémentation, et c'est ce qu'on relira pour la remettre en cause.

- [ ] **Step 2 : Bumper `last_updated`**

Passer les trois entrées à `2026-08-21` dans `docs/specs/index.json`.

- [ ] **Step 3 : Déclarer les deux fichiers nouveaux**

Ajouter `cockpit/lib/mobile-view.js` et `cockpit/components-mobile.jsx` à `docs/architecture/repo-structure.md`, avec leur rôle en une ligne.

- [ ] **Step 4 : Écrire les deux ADR**

Dans `docs/architecture/decisions.md`, à la suite du dernier ADR :

1. **Le portage mobile du cockpit est une adaptation de `index.html`, pas une seconde entrée.** Contexte : ADR-30 avait tranché l'inverse pour la Médiathèque, sur un ratio mesuré de 12:1 sur la transpilation Babel. Décision et justification : ce ratio vient de l'exclusion des 29 autres panels, ce qu'un portage du cockpit *complet* ne peut par définition pas faire ; et le test sur appareil du 2026-08-21 n'a pas fait ressortir la lenteur. Conséquence : une seule entrée, pas de divergence nouvelle ; `mediatheque.html` est conservée par décision explicite.

2. **Une sonde incapable de distinguer « inutilisé » de « cassé » n'est pas une sonde.** Contexte : `usage_events` n'accepte les `INSERT` que du rôle `authenticated`, donc un démarrage qui meurt avant l'auth n'écrit rien ; la sonde `surface: "pwa"` d'ADR-30, à qui la décision de poursuivre avait été confiée, ne pouvait structurellement pas répondre. Trois semaines de mesure n'ont rien tranché. Décision : toute décision confiée à une mesure exige d'abord de vérifier que la mesure peut voir l'échec qu'elle est censée détecter ; quand elle ne le peut pas, le diagnostic doit s'afficher là où l'utilisateur est — d'où le délai de garde du loader. Conséquence : à rapprocher d'ADR-45, où l'alerte était enfermée dans les onglets que la panne avait fait déserter. Même famille de défaut, troisième occurrence.

- [ ] **Step 5 : Corriger le compte d'onglets dans `CLAUDE.md`**

`cockpit/nav.js` déclare 31 entrées ; `CLAUDE.md` en annonce 30 à deux endroits (section « Stack en une phrase » et le tableau des pointeurs). Corriger les deux.

Run: `grep -n "30 onglets" CLAUDE.md`
Expected après correction : aucune occurrence.

- [ ] **Step 6 : Balayage des cache-busters — le lot ne parvient pas à l'utilisateur sans lui**

`sw.js` sert en cache-first (`sw.js:121-144`) et son `STATIC[]` référence les fichiers **avec leur query `?v=N`**. Un fichier dont le contenu change mais dont la query ne bouge pas garde la même clé de cache : un client qui a déjà le service worker installé continue de recevoir l'ancienne version.

`node scripts/sync-sw.mjs` bump bien la constante `CACHE` tout seul (`scripts/sync-sw.mjs:52-58`), ce qui provoque la purge des anciens caches à l'`activate` — mais la query `?v=N`, elle, n'est bumpée par personne. Le cache HTTP du navigateur peut alors resservir l'ancien fichier au moment où le service worker re-remplit son cache. Le plan couvrait `home.jsx` (tâche 7) et oubliait les trois autres.

Bumper, dans **les deux pages d'entrée là où la ligne existe** :

| Fichier modifié par ce lot | `index.html` | `mediatheque.html` |
|---|---|---|
| `cockpit/lib/telemetry.js` (tâche 4) | `?v=1` → `?v=2` (l.61) | `?v=1` → `?v=2` (l.36) |
| `cockpit/lib/bootstrap.js` (tâche 5) | `?v=2` → `?v=3` (l.125) | *non chargé* |
| `cockpit/styles-mobile.css` (tâches 6, 8, 9) | `?v=3` → `?v=4` (l.39) | `?v=3` → `?v=4` (l.19) |
| `cockpit/home.jsx` (tâche 7) | déjà bumpé en tâche 7 | *non chargé* |

Puis relancer `node scripts/sync-sw.mjs` une dernière fois — il doit venir **après** tous les bumps, puisqu'il lit les deux HTML pour reconstruire `STATIC[]`.

Run: `grep -n "styles-mobile.css\|lib/bootstrap.js\|lib/telemetry.js\|home.jsx" index.html mediatheque.html`
Expected : plus aucune des versions d'origine (`telemetry.js?v=1`, `bootstrap.js?v=2`, `styles-mobile.css?v=3`, `home.jsx?v=11`).

Run: `node tests/test_sw_static.mjs`
Expected : PASS — `STATIC[]` cohérent avec les deux HTML.

- [ ] **Step 7 : Lancer les linters bloquants**

```bash
python scripts/validate_spec.py
python scripts/lint_specs_produit.py
python scripts/lint_claude_md.py
python scripts/validate_architecture.py
```

(Noms relevés dans les workflows `validate-spec.yml`, `lint-specs.yml`,
`lint-claude-md.yml` et `validate-arch.yml` — ce ne sont pas les noms qu'on
devine à partir des noms de workflows.)

Expected : tous en succès. **Attention** : sous Windows, ces scripts plantent en `UnicodeEncodeError` sur les caractères non-cp1252, y compris sur le symbole d'échec — un crash ne veut donc pas dire « ça passe ». Lancer avec `PYTHONIOENCODING=utf-8` pour lire le vrai verdict :

```bash
PYTHONIOENCODING=utf-8 python scripts/validate_spec.py
```

- [ ] **Step 8 : Commit**

Le balayage du Step 6 touche du code, pas seulement de la doc — d'où les deux entrées HTML et `sw.js` dans le commit :

```bash
git add docs/ CLAUDE.md index.html mediatheque.html sw.js
git commit -m "docs(mobile): specs des trois onglets, deux ADR, 31 onglets, cache-busters"
```

---

## Après ce plan

La spec fixe un critère d'arrêt qui n'est pas une formalité : **trois semaines après la livraison de cette vague, au moins 5 jours distincts avec une ouverture en `viewport: "mobile"`, faute de quoi la vague 3 ne démarre pas.** La requête de relevé :

```sql
select count(distinct ts::date) as jours_mobiles
from usage_events
where event_type = 'section_opened'
  and payload->>'viewport' = 'mobile'
  and ts >= '<date de livraison de la vague 1>';
```

La vague 2 (Gaming, Jarvis Lab, Stacks & Limits, Santé, Carnet d'idées) fera l'objet d'un plan distinct, écrit une fois cette vague livrée — et corrigé par ce que la vague 1 aura appris sur le choix des têtes de panel.
