# Audit Design Complet â€” AI Cockpit

**Date** : 26 avril 2026
**Auditeur** : design senior (UX, UI, design system, accessibilitÃ©, rÃ©tention)
**Scope** : <https://ph3nixx.github.io/jarvis-cockpit/> + code source `cockpit/*` + `index.html`
**Objectif prioritaire** : rÃ©tention quotidienne sur 30 jours d'usage.

---

## Note de mÃ©thode (lis avant tout)

Le brief joint dÃ©crit une stack **vanilla single-file `index.html`**. La rÃ©alitÃ© du code est **React 18 + `@babel/standalone` via CDN, no build step**, avec une architecture modulaire dans `cockpit/` :

- `cockpit/app.jsx` (router + theme switcher + raccourcis globaux)
- `cockpit/sidebar.jsx`, `cockpit/home.jsx`, **23 `panel-*.jsx`**
- 1 stylesheet de base `cockpit/styles.css` (~3 500 lignes) + **19 stylesheets dÃ©diÃ©s** par panel + `styles-mobile.css`
- `cockpit/themes.js` : 3 systÃ¨mes complets (Dawn, Obsidian, Atlas) injectÃ©s via CSS Custom Properties sur `<html>` au mount
- 22 fichiers `data-*.js` qui exposent des `window.X_DATA` comme baselines (Tier 2 mute ces globals aprÃ¨s fetch)
- `cockpit/lib/` : `supabase.js`, `auth.js` (Google OAuth), `data-loader.js` (Tier 1/Tier 2), `bootstrap.js`, `telemetry.js`, `snooze.js`

**J'ai donc adaptÃ© tous les prompts Claude Code Ã  la stack rÃ©elle** â€” chemins `cockpit/panel-*.jsx`, conventions `window.*`, pas d'`import` ES modules (incompatible Babel standalone), tokens `var(--brand)` etc. Si je suivais le brief littÃ©ralement, les prompts seraient inexÃ©cutables.

Le site live est gatÃ© par Google OAuth (le `<div id="root">` reste vide tant que `cockpitAuth.waitForAuth()` n'a pas rÃ©solu) â€” l'audit visuel est donc fait depuis le code, qui est de toute faÃ§on la source de vÃ©ritÃ©. Ce qui est en prod = ce qui est dans `main`.

---

## 1. Reconnaissance

### 1.1 Inventaire features (baseline)

| Section | Panel (fichier) | Stylesheet | Tier data | Statut |
|---|---|---|---|---|
| Brief du jour | `home.jsx` | `styles.css` | Tier 1 (sync) | Stable |
| Top du jour | `panel-top.jsx` | `styles.css` | Tier 1 | Stable |
| Ma semaine | `panel-week.jsx` | `styles.css` | Tier 1 | Stable |
| Recherche | `panel-search.jsx` | `styles.css` | Tier 1 | Stable |
| Revue (read & advance) | `panel-review.jsx` | `styles.css` | Tier 1 | Stable |
| SoirÃ©e (debrief) | `panel-evening.jsx` | `styles-evening.css` | Tier 1 | RÃ©cent |
| Veille IA / Claude / Sport / Gaming news / Anime / News | `panel-veille.jsx` (mutualisÃ©) | `styles.css` | Tier 1 | Stable, complexe |
| Veille outils | `panel-veille-outils.jsx` | `styles-veille-outils.css` | Tier 2 | Stable |
| Wiki IA | `panel-wiki.jsx` | `styles-wiki.css` | Tier 2 | Stable |
| Signaux faibles | `panel-signals.jsx` | `styles-signals.css` | Tier 1 | Stable, dense |
| OpportunitÃ©s | `panel-opportunities.jsx` | `styles-opportunities.css` | Tier 2 | Stable |
| Carnet d'idÃ©es | `panel-ideas.jsx` | `styles-ideas.css` | Tier 2 | Stable, drag&drop |
| Radar compÃ©tences | `panel-radar.jsx` | `styles-radar.css` | Tier 1 | Stable |
| Recommandations | `panel-recos.jsx` | `styles-recos.css` | Tier 2 | Stable |
| Challenges | `panel-challenges.jsx` | `styles-challenges.css` | Tier 2 | Stable |
| Jarvis (chat) | `panel-jarvis.jsx` | `styles-jarvis.css` | Tier 1 | Stable |
| Jarvis Lab | `panel-jarvis-lab.jsx` | `styles-jarvis-lab.css` | Tier 2 | RÃ©cent |
| Profil | `panel-profile.jsx` | `styles-profile.css` | Tier 2 | Stable, dense |
| Forme (Strava + Withings) | `panel-forme.jsx` | `styles-forme.css` | Tier 2 | Stable |
| Musique (Last.fm) | `panel-musique.jsx` | `styles-musique.css` | Tier 2 | Stable |
| Gaming perso (Steam) | `panel-gaming.jsx` | `styles-gaming.css` | Tier 2 | Stable |
| Stacks | `panel-stacks.jsx` | `styles-stacks.css` | Tier 2 | RÃ©cent |
| Historique | `panel-history.jsx` | `styles-history.css` | Tier 2 | Stable |
| Jobs Radar | `panel-jobs-radar.jsx` | `styles-jobs-radar.css` | Tier 2 | Stable |

**Volume** : 23 panels â€” c'est beaucoup. Le risque rÃ©tention nÂ°1 est l'**Ã©rosion de la home** au profit de panels exploratoires que l'utilisateur ne visite jamais. Cf. rÃ¨gle de prioritÃ© ci-dessous.

### 1.2 Design system implicite

#### CohÃ©rent (tokens respectÃ©s)

- **Espacements** : Ã©chelle 4px stricte (`--space-1` Ã  `--space-8`). Bien.
- **Type scale** : 9 paliers (`--text-2xs` 10px â†’ `--text-display` 54px). Bien dimensionnÃ©.
- **3 thÃ¨mes complets** avec mÃªmes clÃ©s : `--bg`, `--bg2`, `--bg3`, `--surface`, `--tx`, `--tx2`, `--tx3`, `--bd`, `--bd2`, `--brand`, `--brand-ink`, `--brand-tint`, `--positive`, `--positive-tint`, `--alert`, `--alert-tint`. Bonne discipline.
- **Auto theme** : Obsidian 22h-6h, Dawn ensuite, sauf override explicite (`cockpit-theme-explicit` localStorage). Subtil et bien fait.
- **Focus visible** : rÃ¨gle globale `:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }`. Solide pour la navigation clavier.

#### DÃ©rives (valeurs hardcodÃ©es ou variantes one-off)

- **Couleur dÃ©rivÃ©e codÃ©e en dur** : `#b8956a` (brun "declining" pour signaux) rÃ©pÃ©tÃ©e dans `styles-signals.css` au lieu d'un token (`--declining` ou `--neutral`). PrÃ©sent dans 12+ rÃ¨gles. Casse les 3 thÃ¨mes de maniÃ¨re subtile.
- **Couleurs `rgba(0,0,0,0.02)` Ã  `rgba(0,0,0,0.04)`** : utilisÃ©es comme hover pour les rangÃ©es de signaux et idÃ©es. En thÃ¨me Obsidian (fond noir), ce noir-sur-noir devient invisible â€” il aurait fallu `color-mix(in srgb, var(--tx) 4%, transparent)`.
- **Avatar Jarvis** : `JvIcon` rÃ©implÃ©mente toutes les icÃ´nes au lieu de rÃ©utiliser `<Icon>` de `cockpit/icons.jsx`. Duplication, dÃ©rive future garantie.
- **Tailles de bouton** : `.btn` (10px 16px), `.btn--sm` (7px 12px), `.ph-chip` (`--space-2` `--space-3`), `.card-action` (6px 10px), `.sb-link` (7px), `.btn-jarvis` (cf. `styles-jarvis.css`). 5+ tailles de bouton qui se croisent â€” pas de systÃ¨me d'Ã©chelle clair.
- **Card radius** : `var(--radius)` = 6/4/2 selon thÃ¨me, mais Atlas radius 2px crÃ©e des coins quasi vifs sur cards photographiques (Steam game cards) qui auraient mÃ©ritÃ© `--radius-lg`.
- **Boutons "ask Jarvis"** : `.card-action--ask` redÃ©clarÃ© 3 fois (top-card, sig-card, dans les feeds). Style lÃ©gÃ¨rement diffÃ©rent Ã  chaque fois.

#### DensitÃ© visuelle observÃ©e

- Sur Home en thÃ¨me Dawn : Hero 340px de haut, Top 3 en cards 280px, Signaux + Radar 380px, Semaine 280px, footer 50px. **~1700 px vertical** pour la home. Au-dessus du fold sur 13" : Hero seul. Sur 27" : Hero + Top 3.
- 28 paliers d'opacitÃ© diffÃ©rents dans le CSS (de 0.04 Ã  1). Trop. 4 paliers (`--text-1` 100%, `--text-2` 70%, `--text-3` 45%, `--text-disabled` 25%) suffiraient.

### 1.3 Test rÃ©tention â€” visite #5 de la semaine

Simulation d'un Jean qui revient mardi matin pour la 5e fois cette semaine, cafÃ© Ã  la main, 90s pour se mettre au courant.

**Friction observÃ©e :**

1. **Le Hero est statique** : "La bataille des agents passe en phase industrielle" est un titre Ã©ditorial parfait au jour 1, mais au jour 5 l'utilisateur a dÃ©jÃ  lu cette synthÃ¨se hier. Il faut un **mode "delta depuis ta derniÃ¨re visite"**. La logique existe (`visitDelta`, `newSinceVisit` dans `home.jsx:258-274`) mais elle est noyÃ©e dans le kicker â€” pas mise en hero.
2. **Animations Ã  la rÃ©pÃ©tition** :
   - `.kicker-dot` pulse infiniment (2s loop) â€” fatigant aprÃ¨s la 3e visite
   - `.sb-group-hotdot` pulse infiniment (2s loop) dans la sidebar
   - `.hero-todo-num` est en `var(--text-display)` 64px orange brÃ»lÃ© â€” au jour 5, ce gros chiffre crie "ALARME" mÃªme quand c'est juste 8 articles routine
3. **Le Top 3 ne sait pas que tu as dÃ©jÃ  lu** : `localStorage.read-articles` track les lus (`home.jsx:222`), mais la card lue passe Ã  `opacity: 0.5` â€” ce qui veut dire qu'**elle reste visible et prend la place d'une card non-lue**. Alors que la prioritÃ© quotidienne est : voir uniquement ce qui est nouveau depuis hier.
4. **Sidebar trop dense** : 6 groupes Ã— 3-5 items = 25 entrÃ©es de nav. La discipline open/closed par groupe (`openGroups` localStorage) attÃ©nue, mais au dÃ©marrage on retombe sur l'Ã©tat stockÃ©. Pas de "vue smart" qui montre les sections oÃ¹ il y a rÃ©ellement du nouveau.
5. **Le bouton "Tout marquÃ© lu"** est gÃ©nial (`home.jsx:220`) avec son toast undo 6s â€” c'est exactement ce qu'il faut. Mais il efface le top du jour ; Ã  la prochaine visite, qu'est-ce qui apparaÃ®t Ã  la place ? La logique de "next 3" n'est pas Ã©vidente.
6. **Pas d'Ã©cran "rien Ã  voir aujourd'hui"** : si l'utilisateur a tout lu et tout snoozÃ©, le cockpit affiche probablement les mÃªmes cards en `is-read` â€” c'est dÃ©motivant. Il faut un **Ã©tat zÃ©ro positif** ("Bravo, tu es Ã  jour. VoilÃ  3 idÃ©es Ã  creuser au lieu.")
7. **Audio brief existe** (`AudioBriefChip` via `speechSynthesis`) â€” bonne idÃ©e, sous-exploitÃ©e. Pas de chip persistante "12 min restantes" si on l'a dÃ©marrÃ©e puis quittÃ©e.
8. **Filtre "RÃ©cent Â· 24h"** (FAB en haut Ã  droite, `app.jsx:496`) â€” superbe idÃ©e mais peu visible. Il devrait Ãªtre l'**Ã©tat par dÃ©faut** au-delÃ  de la 3e visite quotidienne (heuristique : si `Date.now() - cockpit-last-visit-ts < 18h`, activer recent par dÃ©faut).

**Forces rÃ©tention dÃ©jÃ  en place (Ã  prÃ©server) :**

- Streak veille en sidebar (icÃ´ne flame, animation discrÃ¨te)
- Compteur d'articles non-lus par groupe (`sb-unread`)
- CoÃ»t API live en sidebar (sentinel)
- Theme auto (sombre la nuit)
- Raccourcis clavier (Ctrl+K, Ctrl+1-8) et FAB d'aide
- Command palette (Ctrl+K) â€” le bon rÃ©flexe power user
- Snooze 3j sur cards (`home.jsx:210`)

---

## 2. Matrice d'Ã©valuation

Ã‰chelle 1-5 (5 = excellent, 1 = Ã  corriger urgent).

### 2.1 Sections principales

| Section | ClartÃ© | DensitÃ© | CohÃ©rence | Interactions | Mobile | A11y | RÃ©tention | **Moy.** |
|---|---|---|---|---|---|---|---|---|
| Brief du jour | 4 | 4 | 4 | 4 | 4 | 4 | **3** | 3.86 |
| Top du jour | 5 | 4 | 4 | 4 | 4 | 4 | 3 | 4.00 |
| Ma semaine | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3.71 |
| Sidebar | 4 | 3 | 4 | 4 | 4 | 4 | **3** | 3.71 |
| Veille IA (mutualisÃ©e 6 onglets) | 3 | **2** | 4 | 4 | 3 | 3 | 3 | 3.14 |
| Signaux faibles | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3.57 |
| OpportunitÃ©s | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 3.14 |
| Carnet d'idÃ©es | 4 | 4 | 4 | **5** | 3 | 3 | 4 | 3.86 |
| Radar compÃ©tences | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 3.71 |
| Recos / Challenges | 3 | 3 | 4 | 3 | 4 | 4 | 3 | 3.43 |
| Wiki IA | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3.57 |
| Jarvis (chat) | 4 | 4 | 3 | 4 | **2** | 3 | 4 | 3.43 |
| Jarvis Lab | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3.00 |
| Profil | 3 | **2** | 3 | 4 | 4 | 4 | 4 | 3.43 |
| Forme | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 3.71 |
| Musique | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 3.71 |
| Gaming | 4 | 4 | 4 | 3 | 4 | 3 | 3 | 3.57 |
| Stacks | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 3.14 |
| Historique | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3.86 |
| Recherche | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4.00 |
| Jobs Radar | 4 | 3 | 3 | 4 | 3 | 3 | 4 | 3.43 |
| Ã‰vening (debrief) | 3 | 4 | 3 | 3 | 4 | 3 | **5** | 3.57 |
| Revue (read & advance) | 5 | 5 | 4 | 4 | 4 | 4 | 5 | 4.43 |

**Moyenne globale : 3.61 / 5** â€” produit professionnellement abouti avec quelques zones critiques (densitÃ© Veille, mobile Jarvis, rÃ©tention Brief).

### 2.2 Tableau d'Ã©volution

Pas d'audit antÃ©rieur fourni. Pour la prochaine itÃ©ration, je recommande de comparer ce score moyen aux mÃªmes sections Ã  3 mois.

### 2.3 Top 3 forces

1. **SystÃ¨me de thÃ¨mes triple** â€” Dawn, Obsidian, Atlas sont 3 *vraies* directions cohÃ©rentes (pas 3 versions du mÃªme), et le switch automatique nuit/jour est subtil. TrÃ¨s peu de produits perso vont aussi loin. PrÃ©serve Ã§a.
2. **Architecture data Tier 1 / Tier 2** â€” la home se rend en synchrone avant React mount, les autres panels lazy-load avec loader puis remount via `dataVersion`. C'est exactement la bonne logique pour un cockpit qui doit ouvrir vite. Le `PanelErrorBoundary` finit le travail.
3. **Telemetry append-only + RLS authenticated** â€” on a un produit perso qui se mesure, et qui n'expose rien. Beaucoup de cockpits "perso" finissent en YOLO sÃ©curitÃ©.

### 2.4 Top 3 faiblesses

1. **Brief du jour n'a pas de mode "delta"** â€” au jour 5, l'utilisateur revoit le mÃªme hero. La logique `visitDelta` existe mais ne pilote pas la mise en page. C'est *le* point #1 de rÃ©tention 30j.
2. **DensitÃ© Veille IA** â€” `panel-veille.jsx` mutualise 6 onglets diffÃ©rents (Updates, Claude, Sport, Gaming, Anime, News) avec des filtres complexes (annÃ©e, mois, type). Au quotidien, on cherche "qu'est-ce qui est nouveau dans Claude ?" et on doit configurer 3 filtres pour le savoir. Cf. QW#3 et QW#5.
3. **Mobile Jarvis cassÃ©** â€” `styles-mobile.css:222` masque la colonne mÃ©moire (`.jrv-panel-left { display: none !important }`) sur mobile. Du coup sur tÃ©lÃ©phone Jarvis perd son contexte visible et ne sait plus citer. C'est le canal le plus utilisÃ© en mobilitÃ© â€” Ã§a doit Ãªtre traitÃ©.

---

## 3. Quick Wins & Roadmap Jarvis

### 3.1 Top 10 Quick Wins

TriÃ© par ratio impact/effort dÃ©croissant (impact Ã· effort).

| # | Titre | Impact (1-5) | Effort (1-5) | Ratio | Sections | Description courte |
|---|---|---|---|---|---|---|
| 1 | **Hero "delta" en mode visite rÃ©currente** | 5 | 2 | 2.50 | Home | Quand `visitDelta < 18h` ET `newSinceVisit > 0`, remplace le titre macro statique par "X nouveautÃ©s depuis hier" + 3 mini-cards des nouveaux. Le brief macro Gemini reste accessible mais en collapse. |
| 2 | **Filtre "RÃ©cent Â· 24h" auto-on en visite rÃ©currente** | 4 | 1 | 4.00 | Global | Si `visitDelta < 18h`, mettre `recentOnly = true` par dÃ©faut au mount. Ajouter un microcopy `"Mode rÃ©cent â€” voir tout"` plus visible que la pill actuelle. |
| 3 | **Animations infinies â†’ en pulse de 1er rendu uniquement** | 4 | 1 | 4.00 | Sidebar, Home | `kicker-dot` et `sb-group-hotdot` pulse 3 fois max puis arrÃªt (`animation-iteration-count: 3`). RÃ©duit la fatigue visuelle au jour 5. |
| 4 | **Cards lues "out of the way"** | 4 | 2 | 2.00 | Top, Veille | Cards lues collapsent automatiquement Ã  hauteur 56px (titre seul) au lieu de rester opacity 0.5 et prendre 220px. Bouton "rouvrir" au clic. |
| 5 | **Ã‰tat zÃ©ro positif "Bravo, tu es Ã  jour"** | 4 | 2 | 2.00 | Home | Quand 0 article non-lu ET 0 signal hot, afficher une mini-celebration + 2 idÃ©es Ã  creuser depuis le carnet. |
| 6 | **Token `--neutral` pour remplacer `#b8956a`** | 3 | 1 | 3.00 | Signaux | Ajouter `--neutral`, `--neutral-tint` aux 3 thÃ¨mes. Replace-all dans `styles-signals.css`. |
| 7 | **Hover des rangÃ©es en `color-mix` au lieu de `rgba(0,0,0,...)`** | 3 | 1 | 3.00 | Signaux, IdÃ©es | Replace `rgba(0,0,0,0.02)` â†’ `color-mix(in srgb, var(--tx) 3%, transparent)`. Devient invisible-on-dark au lieu de noir-sur-noir. |
| 8 | **Audio brief â€” chip persistante avec progression** | 3 | 2 | 1.50 | Home | Quand on quitte la home en lecture, garder une mini-chip floating avec waveform + reprendre + skip. |
| 9 | **Mobile Jarvis â€” drawer mÃ©moire au lieu de masquage** | 4 | 3 | 1.33 | Jarvis | Sur mobile, transformer `.jrv-panel-left` en drawer accessible via un bouton "?" en haut, au lieu de `display: none`. |
| 10 | **Brief du jour â€” Reading time tag par card** | 3 | 2 | 1.50 | Top, Veille | Afficher `2 min Â· garde 14 mots-clÃ©s` sur chaque card pour aider Ã  doser la session. |

### 3.2 Roadmap Jarvis â€” 15 features

Score composite = Impact Ã— FaisabilitÃ© (Wow donnÃ© en bonus). TriÃ© par composite dÃ©croissant.

| # | Titre | Impact | FaisabilitÃ© | Wow | **Composite** | Description |
|---|---|---|---|---|---|---|
| J1 | **Brief en 90 secondes "Spotify Wrapped" quotidien** | 5 | 4 | 5 | **20** | Animation de 8 cards qui dÃ©filent en 90s avec audio TTS : "Tu as lu 12 articles cette semaine Â· top thÃ¨me = agents Â· ton signal Ã  surveiller = AI Act phase 3 Â· ton challenge expire dans 2 jours". Pause possible. Mode preferÃ© sur mobile. |
| J2 | **Daily replay â€” "qu'est-ce qui a bougÃ© hier soir"** | 5 | 4 | 4 | **20** | Au mount le matin, 5s d'animation showing les nouveaux articles glissant dans le top, les anciens basculant en archives, le streak qui s'incrÃ©mente. Une seule fois par session. |
| J3 | **Smart sidebar â€” items qui ont du nouveau remontent** | 4 | 5 | 3 | **20** | RÃ©ordonne dynamiquement les items dans chaque groupe : ceux avec `unread > 0` en haut. Les groupes vides collapsent. Persiste l'ordre user si modif manuelle. |
| J4 | **Inbox Zero pour Veille â€” "marquer comme triÃ©s"** | 5 | 4 | 3 | **20** | Mode batch : montre articles 1 par 1 plein Ã©cran, 4 actions (lire / garder / parquer / oublier) au clavier (j/k/g/h). Sortie auto quand 0 restant. |
| J5 | **Jarvis Daily Action â€” 1 micro-tÃ¢che IA poussÃ©e chaque matin** | 5 | 3 | 5 | **15** | Jarvis propose **une** action de 5 min : "Ã‰tends ton skill Fine-tuning de +2 â€” fais ce mini-quiz", "Promeus l'idÃ©e X qui dort depuis 14j", "RÃ©ponds Ã  cette uncomfortable question". Skip = 24h, Done = streak +1. |
| J6 | **Carnet d'idÃ©es â€” auto-tag par signal proche** | 4 | 4 | 3 | **16** | Quand on capture une idÃ©e, calcule similaritÃ© texte avec les `signals` actifs et propose 1 chip "liÃ© Ã  #agent-memory" par dÃ©faut. Accepter en Tab. |
| J7 | **Brief audio mode "voiture" â€” sortie en MP3** | 4 | 4 | 4 | **16** | Bouton "exporter le brief audio" qui gÃ©nÃ¨re un MP3 via Web Audio API recording de `speechSynthesis`. TÃ©lÃ©chargeable, pour Ã©coute en voiture. |
| J8 | **Radar â€” projection 12 mois "oÃ¹ tu seras si tu fais le challenge X"** | 4 | 3 | 4 | **12** | Au survol d'un challenge, afficher en transparence sur le radar la nouvelle silhouette estimÃ©e si on le complÃ¨te. Slider "rÃ©alisme : aggressif/rÃ©aliste/conservateur". |
| J9 | **Wiki IA â€” graphe de relations cliquable** | 4 | 3 | 4 | **12** | Force-directed graph (D3) entre concepts wiki avec edges = co-occurrences dans articles. Click = ouvrir la fiche. Filtre par catÃ©gorie. |
| J10 | **Jobs Radar â€” score "fit Jean" expliquÃ©** | 4 | 3 | 3 | **12** | Sur chaque offre hot, expansion qui montre le breakdown : "+2 RTE +1 SAFe +1 IA -1 stage SÃ©rie A vs ta prÃ©f scaleup = 7/10". Click sur chaque ligne = pourquoi. |
| J11 | **Cockpit "weekend mode"** | 3 | 4 | 4 | **12** | Sam-Dim, masque par dÃ©faut Veille IA + RTE, met en avant Forme/Musique/Gaming/IdÃ©es. Toggle pour repasser. |
| J12 | **Mode "prÃ©sentation" pour Jarvis** | 3 | 4 | 5 | **12** | Layout 3 colonnes plein Ã©cran : Ã  gauche le contexte (mÃ©moire), au centre la conversation, Ã  droite les sources. Mode kiosque pour dÃ©mos / partage Ã©cran. |
| J13 | **IdÃ©e â†’ opportunitÃ© â†’ projet, vue chronologique** | 4 | 3 | 3 | **12** | Une seule timeline horizontale qui montre les idÃ©es de leur capture Ã  leur promotion, avec les jalons (`touched_count`, status changes). Aide Ã  voir lesquelles stagnent. |
| J14 | **"Ask Jarvis" inline avec suggestion de 3 questions** | 4 | 3 | 3 | **12** | Sur chaque card (article, signal, opp), au survol affiche 3 questions prÃ©-rÃ©digÃ©es que Jarvis sait rÃ©pondre depuis le RAG. Click = ouvre Jarvis avec la question prefill. |
| J15 | **Cockpit "morning briefing video" gÃ©nÃ©rÃ©** | 4 | 2 | 5 | **8** | GÃ©nÃ©ration hebdo d'une vidÃ©o MP4 de 30s avec voiceover, animations CSS captÃ©es via headless Chrome, Ã  partager en story Slack/Teams. |

### 3.3 Mockups textuels (Top 3 features)

#### Mockup 1 â€” Hero delta (QW#1)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ S17 Â· J+111  /  BRIEF DU JOUR  Â·  Mardi 21 avril 2026                    â”‚
â”‚                                          [â–¶ Audio Â· 4 min]  [âœ“ Tout lu] â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                          â”‚
â”‚ â±  DEPUIS HIER 19H â€” 4 NOUVEAUX                                          â”‚
â”‚                                                                          â”‚
â”‚ 4 nouveautÃ©s.                                                            â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€                                                            â”‚
â”‚                                                                          â”‚
â”‚ Anthropic ouvre Claude Sonnet 4.7. La rÃ©gulation accÃ©lÃ¨re.               â”‚
â”‚ Vincent BollorÃ© annonce un partenariat IA. Mistral pivote sur l'edge.    â”‚
â”‚                                                                          â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚ â”‚ Anthropic   2h â”‚ â”‚ Les Ã‰chos   3h â”‚ â”‚ HuggingFace 6h â”‚ â”‚ +1 plus â”‚    â”‚
â”‚ â”‚ Claude 4.7 GA  â”‚ â”‚ BollorÃ© IA     â”‚ â”‚ Mistral edge   â”‚ â”‚         â”‚    â”‚
â”‚ â”‚ score 92       â”‚ â”‚ score 88       â”‚ â”‚ score 81       â”‚ â”‚         â”‚    â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚                                                                          â”‚
â”‚ [ Lire les 4 nouveautÃ©s â†’ ]    [ Voir le brief macro complet â–¾ ]        â”‚
â”‚                                                                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Au lieu d'imposer le titre Ã©ditorial du matin (parfait au jour 1, redondant au jour 5), on parle directement Ã  l'utilisateur : "voilÃ  ce qui a bougÃ© pendant que tu n'Ã©tais pas lÃ ". Le brief macro reste accessible, en collapse â€” pour la premiÃ¨re visite de la journÃ©e OU si l'utilisateur veut un rÃ©cap large.

#### Mockup 2 â€” Inbox Zero Veille (J4)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  TRI EN LOT Â· 12 articles non lus dans Veille IA                         â”‚
â”‚                                                       [Ã‰chap pour quitter]â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                          â”‚
â”‚  3 / 12                                                                  â”‚
â”‚                                                                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ ANTHROPIC Â· AGENTS Â· il y a 4h                                     â”‚  â”‚
â”‚  â”‚                                                                    â”‚  â”‚
â”‚  â”‚ Claude Agents GA â€” mÃ©moire persistante et orchestration            â”‚  â”‚
â”‚  â”‚ multi-outils en natif                                              â”‚  â”‚
â”‚  â”‚                                                                    â”‚  â”‚
â”‚  â”‚ DisponibilitÃ© gÃ©nÃ©rale de l'API agents avec une mÃ©moire de         â”‚  â”‚
â”‚  â”‚ contexte de 1M tokens, un routage automatique entre outils et un  â”‚  â”‚
â”‚  â”‚ SDK Python/TypeScript.                                             â”‚  â”‚
â”‚  â”‚                                                                    â”‚  â”‚
â”‚  â”‚ #agents  #anthropic  #enterprise                                   â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                                          â”‚
â”‚   [ J ] LIRE                  [ G ] GARDER                               â”‚
â”‚   [ K ] PARQUER (3j)          [ H ] OUBLIER                              â”‚
â”‚                                                                          â”‚
â”‚   â”€â”€â”€â”€â”€ Progression : â–“â–“â–“â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘ 3/12 â”€â”€â”€â”€â”€                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Mode plein Ã©cran, navigation 100% clavier. Ã€ la sortie, une mini-stat : "Tu as triÃ©s 12 articles en 2 min 43 â€” soir 13 sec/article". Dopamine de productivitÃ©.

#### Mockup 3 â€” Jarvis Daily Action (J5)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ MARDI 21 AVRIL Â· 09:14                                                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                          â”‚
â”‚   âœ¨ TON ACTION DU JOUR                            â± ~5 min               â”‚
â”‚                                                                          â”‚
â”‚   Â« Tu as une idÃ©e parquÃ©e depuis 14 jours :                             â”‚
â”‚     "Coach IA pour les rÃ©tros SAFe".                                     â”‚
â”‚     Soit tu la promeus en opportunitÃ© (j'ai 3 angles),                   â”‚
â”‚     soit tu l'archives. Ã€ toi.Â»                                          â”‚
â”‚                                                                          â”‚
â”‚                                                                          â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚   â”‚  Coach IA pour les rÃ©tros SAFe                               â”‚       â”‚
â”‚   â”‚  CapturÃ©e le 7 avril Â· touchÃ©e 2 fois Â· stage: incubating    â”‚       â”‚
â”‚   â”‚  Impact 4 Â· Effort 3 Â· Alignement 5                          â”‚       â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
â”‚                                                                          â”‚
â”‚   [ Promouvoir â†’ ]   [ Archiver ]   [ Plus tard (24h) ]                  â”‚
â”‚                                                                          â”‚
â”‚   â”€â”€â”€â”€â”€                                                                  â”‚
â”‚   Streak action :  ðŸ”¥ 8 jours    Â·    record : 14                        â”‚
â”‚                                                                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Une seule action par jour, prÃ©-mÃ¢chÃ©e par Jarvis depuis l'Ã©tat du cockpit (idÃ©es qui dorment, gaps radar, signaux pas adressÃ©s, uncomfortable questions). Skip = report 24h. ComplÃ©ter = streak +1. C'est la pÃ©dagogie des apps de mÃ©ditation appliquÃ©e Ã  un cockpit pro.

---

## 4. Prompts Claude Code

**Ces prompts sont prÃªts Ã  copier-coller dans Claude Code (le terminal CLI)** depuis `C:\Users\johnb\projects\jarvis-cockpit`. Chaque prompt est auto-suffisant : il dit oÃ¹ chercher, ce qui existe, et ce qu'il faut produire.

**Conventions communes Ã  tous les prompts** (Ã  savoir une fois) :

- Stack : React 18 + `@babel/standalone` (no build step). Pas d'`import`/`export` ES modules â€” tous les composants s'exposent via `window.X = X`.
- Tokens CSS Custom Properties uniquement (`var(--brand)`, `var(--tx)`, `var(--space-3)`). Ne jamais hardcoder de couleur.
- Persistance state utilisateur : `localStorage` avec un prefixe lisible (`cockpit-...`).
- Persistance state serveur : Supabase via les helpers `window.sb.fetchJSON / postJSON / patchJSON`.
- Telemetry : `window.track && window.track("event_name", { ...payload })` Ã  chaque action utilisateur notable. Mettre Ã  jour la table d'events dans `CLAUDE.md` (section *TÃ©lÃ©mÃ©trie*) si nouveau type.
- Ne jamais retirer les `try {} catch {}` autour des accÃ¨s `localStorage` (Safari ITP).
- `cockpit/styles*.css` est le seul endroit oÃ¹ vivent les styles ; les `style={{...}}` inline sont tolÃ©rÃ©s pour les radar/SVG dynamiques.
- **Toute modif fonctionnelle d'un onglet** â†’ mise Ã  jour du `docs/specs/tab-<slug>.md` correspondant + bump `last_updated` dans `docs/specs/index.json`. La CI lint-specs bloque sinon.

---

### P0 â€” Quick Wins (impact Ã©levÃ©, < 30 min)

#### Prompt 1 â€” [UX] Hero "delta" mode visite rÃ©currente

**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/styles.css`, `docs/specs/tab-brief.md`

```
Contexte : sur la home (cockpit/home.jsx), le Hero affiche actuellement un
titre macro statique gÃ©nÃ©rÃ© par Gemini ("La bataille des agents passe en
phase industrielle"). Au jour 1 de la semaine c'est parfait, mais Ã  la
visite #5 l'utilisateur a dÃ©jÃ  lu la mÃªme synthÃ¨se hier soir. Il faut un
mode "delta" qui prend le dessus quand l'utilisateur revient < 18h aprÃ¨s.

La logique est dÃ©jÃ  calculÃ©e dans home.jsx (variables `visitDelta` et
`newSinceVisit`, lignes ~249-274) mais elle est juste affichÃ©e dans le
kicker, pas dans le titre.

TÃ¢che :
1. Dans cockpit/home.jsx, juste avant le `return`, calcule un boolean
   `useDeltaHero = visitDelta && visitDelta.h < 18 && newSinceVisit > 0`.
2. Si `useDeltaHero === true` :
   - Le `<h1 className="hero-title">` affiche `${newSinceVisit} nouveautÃ©s
     depuis ${visitDelta.h}h.` (pluriel/singulier selon `newSinceVisit`).
   - Le `<p className="hero-body">` reste, mais prÃ©fixÃ© d'un nouvel Ã©lÃ©ment
     <ul className="hero-delta-list"> qui liste les `newSinceVisit` premiers
     `top` items (titre tronquÃ© 60 chars + source + score). Max 4 items + un
     "+ X plus" si dÃ©bordement.
   - Le bouton "Lire les 3 incontournables" devient "Lire les
     ${Math.min(newSinceVisit, 4)} nouveautÃ©s" et navigue vers `top`.
   - Sous les actions, ajouter un disclosure `<details className="hero-macro-collapse">`
     avec `<summary>Voir le brief macro complet</summary>` qui contient
     l'ancien `<h1>` + `<p>` macro standard.
3. Si `useDeltaHero === false` : comportement actuel inchangÃ©.

Styles Ã  ajouter dans cockpit/styles.css (juste aprÃ¨s .hero-body, ~ligne 610) :
   .hero-delta-list { list-style: none; padding: 0; margin: 16px 0 24px;
     display: flex; flex-direction: column; gap: 8px; }
   .hero-delta-list li { padding: 10px 14px; background: var(--surface);
     border: 1px solid var(--bd); border-radius: var(--radius);
     display: flex; gap: 12px; align-items: baseline;
     font-size: var(--text-md); }
   .hero-delta-list li .src { font-family: var(--font-mono);
     font-size: var(--text-2xs); letter-spacing: 0.08em;
     text-transform: uppercase; color: var(--tx3); flex-shrink: 0; }
   .hero-delta-list li .score { margin-left: auto; font-family: var(--font-mono);
     font-size: var(--text-xs); color: var(--brand); }
   .hero-macro-collapse { margin-top: 20px; }
   .hero-macro-collapse summary { font-family: var(--font-mono);
     font-size: var(--text-xs); letter-spacing: 0.08em; text-transform: uppercase;
     color: var(--tx3); cursor: pointer; padding: 8px 0; }
   .hero-macro-collapse[open] summary { color: var(--tx2); }
   .hero-macro-collapse .hero-title { font-size: clamp(24px, 3vw, 36px); }

Telemetry : ajouter `track("hero_delta_shown", { newSinceVisit, hours: visitDelta.h })`
dans un useEffect qui se dÃ©clenche quand `useDeltaHero` devient true.

Specs : mettre Ã  jour docs/specs/tab-brief.md section "FonctionnalitÃ©s" et
"Parcours utilisateur" (rappel : vocabulaire produit, pas de jargon technique
â€” interdit par la CI lint-specs). Bumper docs/specs/index.json::last_updated.
```

**Validation** :
- Vide localStorage `cockpit-last-visit-ts`, recharge â†’ mode macro classique (visite #1).
- Recharge dans la mÃªme heure â†’ `useDeltaHero` doit basculer Ã  true et le titre devient "X nouveautÃ©s depuis Yh".
- Le `<details>` se dÃ©plie sur clic et rÃ©vÃ¨le le titre macro Gemini.
- En thÃ¨me Obsidian + Atlas, les bordures `--bd` restent lisibles.

---

#### Prompt 2 â€” [UX] Filtre "RÃ©cent Â· 24h" auto-on en visite rÃ©currente

**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/app.jsx`

```
Contexte : `cockpit/app.jsx` (ligne ~195) initialise `recentOnly` depuis
localStorage uniquement. Mais en visite rÃ©currente (< 18h aprÃ¨s la derniÃ¨re),
l'utilisateur veut par dÃ©faut voir uniquement ce qui a changÃ©.

TÃ¢che : modifier l'initialisation de `recentOnly` pour appliquer la rÃ¨gle :

1. Si l'utilisateur a explicitement cliquÃ© sur le toggle dans la derniÃ¨re
   heure (`localStorage.cockpit-recent-explicit` < 1h), respecter sa prÃ©fÃ©rence
   stockÃ©e.
2. Sinon, calcule `lastVisit = Number(localStorage.cockpit-last-visit-ts)` :
   - Si `Date.now() - lastVisit < 18 * 3600 * 1000` ET `> 30 * 60 * 1000`
     (entre 30 min et 18h), default = `true`.
   - Sinon default = `false`.
3. Quand l'utilisateur clique le toggle (ligne ~498), set
   `localStorage.cockpit-recent-explicit = String(Date.now())` en plus de la
   pref existante.

Visuellement, quand `recentOnly === true` ET `useDeltaHero === false`
(cÃ d visite rÃ©currente sans nouveautÃ©s), afficher un microcopy juste sous
le hero :
  "Mode rÃ©cent Â· seuls les articles < 24h sont visibles. [Voir tout]"

Le bouton "Voir tout" appelle `setRecentOnly(false)`.

Telemetry : `track("recent_filter_auto_on", { reason: "recent_visit" })`
quand le default kick in (uniquement la premiÃ¨re fois par session).
```

**Validation** :
- PremiÃ¨re visite du jour : `recentOnly = false`, comportement actuel.
- Recharge 1h aprÃ¨s : `recentOnly = true` automatiquement.
- Click manuel sur le toggle : la prochaine visite respecte le choix pendant 1h.

---

#### Prompt 3 â€” [UX] Animations infinies â†’ 3 boucles puis stop

**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles.css`

```
Contexte : trois animations CSS tournent Ã  l'infini et fatiguent Ã  la
3e visite quotidienne :
- `.kicker-dot` (cockpit/styles.css ~ligne 581) : pulse 2s infinite
- `.sb-group-hotdot` (~ligne 215) : sbHotPulse 2s infinite
- (Ã  vÃ©rifier) `.kbd-fab` n'a pas d'animation infinie â€” OK.

TÃ¢che : pour chaque animation infinie, remplacer
   `animation: pulse 2s ease infinite;`
par
   `animation: pulse 2s ease 3;`

Et ajouter une rÃ¨gle CSS qui maintient le state final (le dot reste visible
mais sans pulse) :
   .kicker-dot { animation-fill-mode: forwards; }
   .sb-group-hotdot { animation-fill-mode: forwards; }

Honour `prefers-reduced-motion` :
   @media (prefers-reduced-motion: reduce) {
     .kicker-dot, .sb-group-hotdot { animation: none; }
   }
```

**Validation** :
- Chargement de la page â†’ dot pulse 3 fois (~6s) puis reste statique (couleur visible mais sans halo animÃ©).
- Navigation vers un autre panel et retour â†’ l'animation se rejoue 3 fois.
- Avec `prefers-reduced-motion: reduce` (DevTools > Rendering > Emulate CSS media), aucune animation.

---

#### Prompt 4 â€” [UX] Token `--neutral` pour remplacer `#b8956a`

**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/themes.js`, `cockpit/styles-signals.css`

```
Contexte : la couleur "declining" `#b8956a` (brun moutarde) est hardcodÃ©e
dans 12+ rÃ¨gles de cockpit/styles-signals.css. Elle n'est pas dans les 3
thÃ¨mes â€” donc le visuel d'un signal "en baisse" est identique en Dawn,
Obsidian et Atlas, ce qui casse la cohÃ©rence du design system.

TÃ¢che en 2 temps :

1. Dans cockpit/themes.js, ajouter Ã  chaque thÃ¨me (dawn, obsidian, atlas)
   les variables suivantes (placÃ©es juste aprÃ¨s --alert / --alert-tint) :
   - dawn :
       "--neutral": "#b8956a",
       "--neutral-tint": "#F5EBDF",
   - obsidian :
       "--neutral": "#D4A572",
       "--neutral-tint": "rgba(212, 165, 114, 0.12)",
   - atlas :
       "--neutral": "#9C7B45",
       "--neutral-tint": "#F0E8D4",

2. Dans cockpit/styles-signals.css, replace-all `#b8956a` par `var(--neutral)`.
   VÃ©rifier qu'il n'y a pas d'autres fichiers concernÃ©s :
   `grep -rn "#b8956a" cockpit/` â†’ ne devrait rien retourner aprÃ¨s modif.

Aucune modif fonctionnelle, c'est de la cohÃ©rence pure.
```

**Validation** :
- En thÃ¨me Dawn, l'apparence d'un signal "declining" est inchangÃ©e.
- En thÃ¨me Obsidian, le brun devient un beige plus chaud (lisible sur fond noir).
- `grep -rn "#b8956a" cockpit/` ne retourne plus rien.

---

#### Prompt 5 â€” [UX] Hover des rangÃ©es en `color-mix`

**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles-signals.css`, `cockpit/styles-ideas.css`, autres fichiers oÃ¹ `rgba(0,0,0,...)` est utilisÃ© pour un hover.

```
Contexte : plusieurs hovers utilisent `rgba(0,0,0,0.02)` ou `rgba(0,0,0,0.04)`
ce qui devient invisible en thÃ¨me Obsidian (fond noir â†’ noir-sur-noir).

TÃ¢che : remplacer toutes les occurrences de la forme
   background: rgba(0,0,0, X)
ou
   background: rgba(0, 0, 0, X)
par
   background: color-mix(in srgb, var(--tx) Y%, transparent)
oÃ¹ Y = X * 100 (ex: 0.02 â†’ 2%).

VÃ©rifier qu'on ne touche QUE les hovers/focus/states, pas les overlays
modales (qui doivent rester du noir rÃ©el pour un dim sombre cohÃ©rent
sur tous thÃ¨mes â€” ex: .tk-overlay, .kbd-overlay).

Lister les fichiers concernÃ©s :
  grep -rn "rgba(0,0,0," cockpit/ | grep -v overlay | grep -v shadow

ProcÃ©der fichier par fichier en confirmant qu'on ne touche pas Ã  un shadow
ou un overlay.
```

**Validation** :
- En thÃ¨me Dawn, les hovers ont la mÃªme teinte qu'avant (Ã  1px prÃ¨s).
- En thÃ¨me Obsidian, les hovers deviennent visibles (subtle teinte plus claire).
- En thÃ¨me Atlas, idem.

---

#### Prompt 6 â€” [UX] Ã‰tat zÃ©ro positif "Bravo, tu es Ã  jour"

**PrioritÃ©** : P0
**DÃ©pend de** : Prompt 1 (recommandÃ©)
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/styles.css`, `docs/specs/tab-brief.md`

```
Contexte : quand l'utilisateur a tout lu et tout snoozÃ©, la home affiche
les mÃªmes cards en grisÃ©. DÃ©motivant. Il faut un Ã©tat zÃ©ro positif.

TÃ¢che : dans cockpit/home.jsx, juste aprÃ¨s le calcul de `useDeltaHero`,
calculer :
  const allRead = (data.top || []).every(t => readTop[t.rank] || snoozedTop[t.rank]);
  const noUnreadGlobal = (data.stats.unread_total ?? data.stats.articles_today) === 0;
  const isZeroState = allRead && noUnreadGlobal;

Si `isZeroState === true`, remplacer la section TOP 3 (juste la `<section className="block">` qui contient `top-grid`) par :

<section className="block block--zero">
  <div className="zero-state">
    <div className="zero-state-eyebrow">Ã€ jour</div>
    <h2 className="zero-state-title">Tu as fait le tour. Bravo.</h2>
    <p className="zero-state-body">
      Pendant que tu attends le brief de demain matin, voilÃ  2 idÃ©es qui
      dorment dans ton carnet â€” peut-Ãªtre le bon moment pour les creuser.
    </p>
    <div className="zero-state-ideas">
      {(window.IDEAS_DATA?.ideas || [])
        .filter(i => i.status === "incubating" || i.status === "maturing")
        .sort((a, b) => new Date(a.last_touched) - new Date(b.last_touched))
        .slice(0, 2)
        .map(i => (
          <button key={i.id} className="zero-idea" onClick={() => onNavigate("ideas")}>
            <span className="zero-idea-kicker">{i.kicker || "IdÃ©e"}</span>
            <span className="zero-idea-title">{i.title}</span>
            <span className="zero-idea-age">en incubation depuis {ageOf(i.captured_at)}</span>
          </button>
        ))}
    </div>
    <div className="zero-state-actions">
      <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("ideas")}>
        Ouvrir le carnet â†’ 
      </button>
    </div>
  </div>
</section>

Helper `ageOf(iso)` : reproduire la logique `ageLabel` de panel-ideas.jsx,
ou import via window.__ideasAgeLabel si on l'expose.

Styles dans cockpit/styles.css :
   .block--zero { padding: 60px 32px; text-align: center; }
   .zero-state { max-width: 560px; margin: 0 auto; }
   .zero-state-eyebrow { font-family: var(--font-mono);
     font-size: var(--text-2xs); letter-spacing: 0.14em;
     text-transform: uppercase; color: var(--positive);
     margin-bottom: var(--space-2); }
   .zero-state-title { font-family: var(--font-display);
     font-size: var(--text-3xl); margin-bottom: var(--space-3); }
   .zero-state-body { font-size: var(--text-md); color: var(--tx2);
     line-height: 1.6; margin-bottom: var(--space-5); }
   .zero-state-ideas { display: grid; grid-template-columns: 1fr 1fr;
     gap: var(--space-3); margin-bottom: var(--space-4); }
   @media (max-width: 760px) { .zero-state-ideas { grid-template-columns: 1fr; } }
   .zero-idea { display: flex; flex-direction: column;
     align-items: flex-start; gap: 4px; padding: var(--space-3) var(--space-4);
     background: var(--surface); border: 1px solid var(--bd);
     border-radius: var(--radius); transition: all 120ms; cursor: pointer;
     text-align: left; }
   .zero-idea:hover { border-color: var(--brand); }
   .zero-idea-kicker { font-family: var(--font-mono); font-size: var(--text-2xs);
     letter-spacing: 0.1em; text-transform: uppercase; color: var(--tx3); }
   .zero-idea-title { font-size: var(--text-md); color: var(--tx); font-weight: 500; }
   .zero-idea-age { font-size: var(--text-xs); color: var(--tx3); margin-top: 2px; }

Telemetry : `track("zero_state_shown", { ideas_count: shownIdeas.length })`.

Specs : mettre Ã  jour docs/specs/tab-brief.md.
```

**Validation** :
- Quand on coche "Tout marquÃ© lu" et qu'`unread_total = 0`, l'Ã©tat zÃ©ro apparaÃ®t Ã  la place du Top 3.
- Le clic sur une "zero-idea" navigue vers le carnet d'idÃ©es.
- Pas plus de 2 idÃ©es affichÃ©es mÃªme si plus de 5 sont incubating.

---

#### Prompt 7 â€” [UX] Cards lues collapsent au lieu d'opacity 0.5

**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles.css`, `cockpit/home.jsx`

```
Contexte : `.top-card.is-read { opacity: 0.5 }` (cockpit/styles.css ~ligne 1145)
laisse les cards lues Ã  pleine taille. Sur la home, Ã§a gaspille de l'espace
au-dessus du fold.

TÃ¢che : transformer le state `is-read` en collapse animÃ©.

1. Dans cockpit/styles.css, remplacer la rÃ¨gle existante :
       .top-card.is-read { opacity: 0.5; }
   par :
       .top-card.is-read {
         opacity: 0.55;
         max-height: 56px;
         overflow: hidden;
         padding: 12px 22px;
         transition: max-height 220ms ease, padding 220ms ease, opacity 220ms ease;
       }
       .top-card.is-read .top-card-rail { display: none; }
       .top-card.is-read .top-summary,
       .top-card.is-read .top-meta,
       .top-card.is-read .top-card-foot { display: none; }
       .top-card.is-read .top-title {
         font-size: var(--text-md);
         margin: 0;
         white-space: nowrap;
         overflow: hidden;
         text-overflow: ellipsis;
       }
       .top-card.is-read::after {
         content: "âœ“ Lu";
         font-family: var(--font-mono);
         font-size: var(--text-2xs);
         letter-spacing: 0.08em;
         text-transform: uppercase;
         color: var(--positive);
         margin-left: auto;
         flex-shrink: 0;
       }
       .top-card.is-read:hover { opacity: 0.85; }

2. Garder le `cursor: pointer` et le `onClick={openArticle}` existants â€”
   relire ouvre l'article dans un nouvel onglet (pas un toggle).

3. Pour permettre la "remise en non-lu", ajouter un long-press / right-click :
   dans home.jsx, sur l'`<article className="top-card">`, ajouter
   `onContextMenu={(e) => { e.preventDefault(); toggleRead(t.rank); }}`
   et un `title="clic-droit pour marquer comme non-lu"` quand `is-read`.

Telemetry : `track("top_card_collapsed", { rank })` quand une card passe en is-read.
```

**Validation** :
- Marquer un Top 1 comme lu â†’ la card collapse Ã  ~56px en 220ms.
- 3 cards lues prennent 168px au lieu de ~660px.
- Clic-droit sur une card lue â†’ repasse non-lue (+ animation inverse).
- Sur mobile, le contexte menu fait un appui long natif.

---

#### Prompt 8 â€” [UX] Reading time tag par card

**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/panel-top.jsx`, `cockpit/styles.css`

```
Contexte : aucune card n'indique un temps de lecture estimÃ©. C'est un
signal majeur pour doser une session matinale courte.

TÃ¢che : ajouter une fonction `estimateReadingTime(text)` dans
cockpit/home.jsx (en haut, juste aprÃ¨s la dÃ©claration de `AudioBriefChip`) :

   function estimateReadingTime(text) {
     const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
     const minutes = Math.max(1, Math.round(words / 230));
     return `${minutes} min`;
   }
   window.estimateReadingTime = estimateReadingTime; // panel-top.jsx s'en sert

Dans `home.jsx` Ã  l'intÃ©rieur de `<div className="top-meta">` (~ligne 421),
juste avant `<span className="top-source">`, ajouter :

   <span className="top-reading">
     {estimateReadingTime((t.summary || "") + " " + (t.title || ""))}
   </span>

Idem dans cockpit/panel-top.jsx pour le rendu plein Ã©cran (chercher la
struct `top-meta` Ã©quivalente).

Styles dans cockpit/styles.css (juste aprÃ¨s `.top-section`, ~ligne 1198) :
   .top-reading {
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.06em;
     color: var(--tx2);
     padding: 1px 6px;
     background: var(--bg2);
     border-radius: 3px;
   }
```

**Validation** :
- Chaque top-card affiche "2 min" ou "3 min" en font-mono dans le header.
- Le calcul est ~230 mots/minute (lecture pro).
- Les cards lues (collapsed) cachent le tag (cohÃ©rent avec le prompt 7).

---

### P1 â€” AmÃ©liorations significatives (30 min - 2h)

#### Prompt 9 â€” [UX] Audio brief â€” chip persistante avec progression

**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/app.jsx`, `cockpit/styles.css`

```
Contexte : `AudioBriefChip` (cockpit/home.jsx ~ligne 7) joue le brief via
SpeechSynthesis quand on est sur la home. Mais si l'utilisateur navigue
vers un autre panel, l'audio s'arrÃªte (cleanup useEffect ~ligne 35).
On veut au contraire :
- L'audio continue
- Une mini-chip floating persistante apparaÃ®t en bas-droit avec
  progression + reprendre/pause + fermer

TÃ¢che en 3 Ã©tapes :

1. Promouvoir la state audio en singleton global dans cockpit/lib/.
   CrÃ©e un nouveau fichier cockpit/lib/audio-brief.js (chargÃ© aprÃ¨s
   bootstrap.js dans index.html) :

   (function(){
     const state = { speaking: false, text: "", title: "", progress: 0,
                     listeners: new Set() };
     function notify() { state.listeners.forEach(l => l(state)); }
     function subscribe(fn) { state.listeners.add(fn); fn(state); return () => state.listeners.delete(fn); }
     function play(title, body) {
       if (!("speechSynthesis" in window)) return;
       const synth = window.speechSynthesis;
       synth.cancel();
       state.text = body || ""; state.title = title || ""; state.progress = 0;
       const u = new SpeechSynthesisUtterance(((title?title+". ":"") + body));
       u.lang = "fr-FR"; u.rate = 1.02;
       const fr = synth.getVoices().find(v => /^fr/i.test(v.lang));
       if (fr) u.voice = fr;
       u.onboundary = (e) => {
         state.progress = Math.min(1, e.charIndex / Math.max(1, u.text.length));
         notify();
       };
       u.onend = () => { state.speaking = false; state.progress = 1; notify(); };
       u.onerror = () => { state.speaking = false; notify(); };
       synth.speak(u);
       state.speaking = true; notify();
     }
     function stop() { window.speechSynthesis?.cancel(); state.speaking = false; notify(); }
     window.audioBrief = { state, subscribe, play, stop };
   })();

2. Dans cockpit/home.jsx, remplacer la logique interne de `AudioBriefChip`
   pour utiliser `window.audioBrief.play(macro.title, macro.body)` /
   `window.audioBrief.stop()`. Le state local devient un useState alimentÃ©
   par `useEffect` qui s'abonne via `audioBrief.subscribe(setState)`.

3. Dans cockpit/app.jsx, Ã  l'intÃ©rieur du composant App, ajouter (juste
   avant le return) :

   const [audioState, setAudioState] = useState(null);
   useEffect(() => {
     if (!window.audioBrief) return;
     return window.audioBrief.subscribe(setAudioState);
   }, []);

   Et dans le JSX, ajouter (Ã  la fin, juste avant le </div> de .app) :

   {audioState && audioState.speaking && (
     <div className="audio-floating-chip" role="status">
       <button className="afc-btn" onClick={() => window.audioBrief.stop()}
               aria-label="ArrÃªter">
         <Icon name="check" size={12} />
       </button>
       <div className="afc-meta">
         <div className="afc-title">{audioState.title.slice(0, 40)}â€¦</div>
         <div className="afc-progress">
           <div className="afc-progress-fill"
                style={{ width: `${(audioState.progress*100).toFixed(0)}%` }} />
         </div>
       </div>
     </div>
   )}

Styles dans cockpit/styles.css :
   .audio-floating-chip {
     position: fixed; bottom: 60px; right: 16px;
     display: flex; align-items: center; gap: var(--space-3);
     padding: var(--space-2) var(--space-3); padding-right: var(--space-4);
     background: var(--surface); border: 1px solid var(--bd);
     border-radius: 999px; box-shadow: var(--shadow-md);
     z-index: 95; min-width: 240px; max-width: 320px;
     animation: afcSlide 200ms ease;
   }
   @keyframes afcSlide { from { transform: translateY(20px); opacity: 0; }
                         to { transform: translateY(0); opacity: 1; } }
   .afc-btn { display: inline-flex; align-items: center; justify-content: center;
     width: 28px; height: 28px; border-radius: 50%;
     background: var(--brand); color: var(--bg2); border: none;
     cursor: pointer; flex-shrink: 0; }
   .afc-meta { flex: 1; min-width: 0; }
   .afc-title { font-size: var(--text-sm); color: var(--tx);
     overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
   .afc-progress { height: 3px; background: var(--bd); border-radius: 2px;
     margin-top: 4px; overflow: hidden; }
   .afc-progress-fill { height: 100%; background: var(--brand);
     transition: width 200ms; border-radius: 2px; }

Specs : ajouter une mention dans docs/specs/tab-brief.md "Le brief audio
continue Ã  jouer si tu changes de panel â€” une chip de progression
apparaÃ®t en bas Ã  droite avec un bouton stop."

Telemetry : `track("audio_brief_persisted", { from: activePanel })` quand
la chip apparaÃ®t parce qu'on a quittÃ© la home en lecture.
```

**Validation** :
- Lance le brief audio sur la home â†’ navigue vers Signaux â†’ la chip apparaÃ®t en bas-droit, le son continue.
- Le bouton check dans la chip arrÃªte l'audio et fait disparaÃ®tre la chip.
- La barre de progression avance en sync avec la lecture (test Ã  50% : `audioBrief.state.progress > 0.4 && < 0.6`).

---

#### Prompt 10 â€” [UX] Mobile Jarvis â€” drawer mÃ©moire

**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles-jarvis.css`, `cockpit/styles-mobile.css`, `cockpit/panel-jarvis.jsx`

```
Contexte : sur mobile, la colonne mÃ©moire de Jarvis est masquÃ©e
(cockpit/styles-mobile.css:222 â€” `.jrv-panel-left { display: none !important }`).
Mais Jarvis cite ces faits dans ses rÃ©ponses, donc l'utilisateur perd le
contexte visible. Il faut une drawer accessible.

TÃ¢che en 4 Ã©tapes :

1. Dans cockpit/panel-jarvis.jsx, ajouter un state `memDrawerOpen` (false par dÃ©faut).
   Et un bouton trigger qui n'apparaÃ®t qu'au format mobile via classname dÃ©diÃ©e :

   <button
     className="jrv-mem-trigger"
     onClick={() => setMemDrawerOpen(true)}
     aria-label="Voir la mÃ©moire de Jarvis"
   >
     <Icon name="brain" size={14} stroke={1.75} />
     <span>MÃ©moire</span>
   </button>

   Ã€ placer dans le header du chat (Ã  cÃ´tÃ© du titre "Jarvis"), juste Ã 
   gauche du composer si plus simple.

2. Wrapper la `<aside className="jrv-panel-left">` dans une logique
   conditionnelle :

   <aside className={`jrv-panel-left ${memDrawerOpen ? "is-mobile-open" : ""}`}>

3. Ajouter un backdrop juste avant qui ferme la drawer :

   {memDrawerOpen && (
     <div className="jrv-mem-backdrop" onClick={() => setMemDrawerOpen(false)} />
   )}

4. Dans cockpit/styles-mobile.css, REMPLACER la rÃ¨gle ligne 222 :
       .jrv-panel-left { display: none !important; }
   par :
       /* Mobile: mÃ©moire devient drawer right-slide */
       .jrv-panel-left {
         position: fixed !important;
         top: 0; right: 0; bottom: 0;
         width: min(85vw, 360px) !important;
         z-index: 96;
         transform: translateX(105%);
         transition: transform 220ms ease;
         box-shadow: -2px 0 16px rgba(0, 0, 0, 0.18);
         overflow-y: auto;
       }
       .jrv-panel-left.is-mobile-open {
         transform: translateX(0);
       }
       .jrv-mem-backdrop {
         position: fixed; inset: 0;
         background: rgba(0, 0, 0, 0.4);
         z-index: 95;
       }
       .jrv-mem-trigger {
         display: inline-flex; align-items: center; gap: 6px;
         padding: 6px 10px; border: 1px solid var(--bd);
         border-radius: 999px; background: var(--surface);
         color: var(--tx2); font-size: var(--text-xs);
       }

   Et hors @media : cacher `.jrv-mem-trigger` et `.jrv-mem-backdrop`.

Telemetry : `track("jarvis_memory_drawer_opened", {})`.
```

**Validation** :
- Sur viewport â‰¤ 760px, le bouton "MÃ©moire" apparaÃ®t dans le header.
- Click sur le bouton â†’ drawer slide depuis la droite, backdrop assombri.
- Click backdrop ou Ã‰chap â†’ ferme.
- Sur desktop â‰¥ 760px, comportement inchangÃ© (colonne fixe Ã  gauche).

---

#### Prompt 11 â€” [JARVIS] Smart sidebar â€” items qui ont du nouveau remontent (J3)

**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/sidebar.jsx`, `cockpit/nav.js`

```
Contexte : la sidebar a 6 groupes Ã— 25 items, ordonnÃ©s par groupe statique.
Quand un item a `unread > 0`, il est Ã©gal Ã  ses voisins. On veut le
remonter en tÃªte de groupe pour faciliter le scan.

TÃ¢che : dans cockpit/sidebar.jsx, Ã  l'intÃ©rieur de `Sidebar()`, ajouter
juste avant le `return` :

   const sortedNav = React.useMemo(() => {
     return data.nav.map(group => ({
       ...group,
       items: [...group.items].sort((a, b) => {
         const ua = a.unread || 0, ub = b.unread || 0;
         if (ua !== ub) return ub - ua; // unread first
         return 0; // stable sinon
       }),
     }));
   }, [data.nav]);

Puis remplacer `data.nav.map((group) => ...` par `sortedNav.map((group) => ...`.

Ajouter un toggle utilisateur en sidebar footer (juste sous .sb-foot-bottom)
avec un bouton "Tri auto / manuel" qui stocke `cockpit-sb-smart-sort` en
localStorage. Si dÃ©sactivÃ©, retomber sur l'ordre `data.nav` original.

Visuellement, les items sortÃ©s "remontÃ©s" gagnent un mini indicateur :
ajouter dans renderLink (juste aprÃ¨s la conditionnelle item.unread):

   {item.unread > 0 && (
     <span
       className="sb-link-fresh-dot"
       title="Mis Ã  jour rÃ©cemment"
     />
   )}

Styles dans cockpit/styles.css (aprÃ¨s .sb-link.is-active, ~ligne 240) :
   .sb-link-fresh-dot {
     position: absolute; left: 6px; top: 50%;
     transform: translateY(-50%);
     width: 4px; height: 4px;
     border-radius: 50%;
     background: var(--brand);
   }

Telemetry : `track("sidebar_smart_sort_toggle", { enabled: boolean })`.
```

**Validation** :
- Au chargement avec smart sort activÃ©, les groupes "Veille" et "Apprentissage" voient leurs items unread monter en tÃªte.
- L'ordre stable est prÃ©servÃ© pour ceux Ã  0 unread (pas de rÃ©ordonnancement alÃ©atoire).
- Toggle off â†’ ordre original rÃ©cupÃ©rÃ©.

---

#### Prompt 12 â€” [UX] "Ask Jarvis" inline avec 3 questions suggÃ©rÃ©es

**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/styles.css`

```
Contexte : sur chaque card (top-card, sig-card), il y a dÃ©jÃ  un bouton
"Ask Jarvis" (`.card-action--ask`). Mais l'utilisateur doit formuler la
question lui-mÃªme. On veut, au survol, suggÃ©rer 3 questions prÃ©-rÃ©digÃ©es
basÃ©es sur le contenu.

TÃ¢che : crÃ©er un sub-composant `AskJarvisDropdown` dans cockpit/home.jsx
juste avant la dÃ©finition de `SignalCard` :

   function AskJarvisDropdown({ context, onNavigate, onClose }) {
     const questions = useMemoJv(() => {
       const base = String(context).slice(0, 200);
       return [
         `Pourquoi c'est important pour moi ? (en 1 paragraphe)`,
         `Quelles sont les 3 questions Ã  poser Ã  mon Ã©quipe sur ce sujet ?`,
         `Donne-moi un angle business pour le secteur assurance.`,
       ];
     }, [context]);
     return (
       <div className="ask-pop" role="menu" onClick={(e) => e.stopPropagation()}>
         <div className="ask-pop-head">Demande Ã  Jarvis</div>
         {questions.map((q, i) => (
           <button key={i} className="ask-pop-item"
             onClick={() => {
               try { localStorage.setItem("jarvis-prefill",
                 `${context}\nQuestion : ${q}`); } catch {}
               onNavigate("jarvis");
               onClose();
             }}>
             {q}
           </button>
         ))}
       </div>
     );
   }

Modifier le bouton existant (.card-action--ask sur top-card et sig-card)
pour ouvrir ce popover Ã  la place du jump direct :

   const [askOpen, setAskOpen] = React.useState(null); // rank ou signal.name
   ...
   onClick={(e) => {
     e.stopPropagation();
     setAskOpen(t.rank); // ou signal.name pour SignalCard
   }}

Et conditionner :
   {askOpen === t.rank && (
     <AskJarvisDropdown
       context={`Article : ${t.title} (${t.source}). ${t.summary}`}
       onNavigate={onNavigate}
       onClose={() => setAskOpen(null)}
     />
   )}

Click outside : ajouter un useEffect dans Home qui Ã©coute `mousedown` et
ferme askOpen si target n'est pas .ask-pop ni .card-action--ask.

Styles dans cockpit/styles.css :
   .ask-pop {
     position: absolute; right: 0; top: calc(100% + 4px);
     width: 280px;
     background: var(--surface); border: 1px solid var(--bd);
     border-radius: var(--radius); box-shadow: var(--shadow-md);
     padding: var(--space-2);
     z-index: 50;
     animation: askPopIn 140ms;
   }
   @keyframes askPopIn { from { opacity: 0; transform: translateY(-4px); }
                         to { opacity: 1; transform: translateY(0); } }
   .ask-pop-head { font-family: var(--font-mono); font-size: var(--text-2xs);
     letter-spacing: 0.1em; text-transform: uppercase; color: var(--tx3);
     padding: 6px 8px 4px; }
   .ask-pop-item { display: block; width: 100%; text-align: left;
     padding: 8px 10px; font-size: var(--text-sm); color: var(--tx2);
     background: transparent; border: none; border-radius: 4px;
     cursor: pointer; transition: background 100ms; }
   .ask-pop-item:hover { background: var(--bg2); color: var(--tx); }

Faire en sorte que `.top-actions` ait `position: relative` pour que le
popover se positionne correctement.

Telemetry : `track("ask_jarvis_pop_question_picked", { question_idx })`.
```

**Validation** :
- Click sur le bouton "Ask Jarvis" d'une top-card â†’ popover apparaÃ®t Ã  droite avec 3 questions.
- Click sur une question â†’ navigation vers Jarvis avec le prefill rempli.
- Click ailleurs â†’ ferme.

---

#### Prompt 13 â€” [JARVIS] Inbox Zero pour Veille (J4) â€” Partie 1 : structure

**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/panel-veille.jsx`, `cockpit/styles.css`

```
Contexte : panel-veille.jsx affiche un feed scrollable. On veut un mode
"tri en lot" plein Ã©cran : un article Ã  la fois, 4 actions clavier.

TÃ¢che partie 1 (structure HTML + state) :

Dans cockpit/panel-veille.jsx, dans le composant principal, ajouter au
dÃ©but :

   const [batchMode, setBatchMode] = React.useState(false);
   const [batchIdx, setBatchIdx] = React.useState(0);

Le bouton qui active le mode batch va dans le header du panel (Ã  cÃ´tÃ©
des autres boutons d'action) :

   <button className="vl-batch-trigger" onClick={() => { setBatchMode(true);
     setBatchIdx(0); }}>
     <Icon name="layers" size={13} /> Tri en lot
   </button>

CrÃ©ation du composant `VeilleBatch` (juste avant le return) :

   function VeilleBatch({ items, idx, total, onAction, onClose }) {
     const item = items[idx];
     if (!item) return null;
     return (
       <div className="vb-overlay" role="dialog" aria-label="Tri en lot">
         <div className="vb-progress">
           <span>{idx + 1} / {total}</span>
           <button className="vb-close" onClick={onClose}
             aria-label="Quitter">Ã—</button>
         </div>
         <div className="vb-card">
           <div className="vb-meta">
             <span>{item.source}</span>
             <span>Â·</span>
             <span>{item.section}</span>
             <span>Â·</span>
             <span>{item.date}</span>
           </div>
           <h2 className="vb-title">{item.title}</h2>
           <p className="vb-body">{item.summary}</p>
           {item.tags && (
             <div className="vb-tags">
               {item.tags.map(t => <span key={t} className="vb-tag">{t}</span>)}
             </div>
           )}
         </div>
         <div className="vb-actions">
           <button className="vb-btn vb-btn--read" onClick={() => onAction("read")}>
             <kbd>J</kbd> LIRE
           </button>
           <button className="vb-btn vb-btn--keep" onClick={() => onAction("keep")}>
             <kbd>G</kbd> GARDER
           </button>
           <button className="vb-btn vb-btn--snooze" onClick={() => onAction("snooze")}>
             <kbd>K</kbd> PARQUER
           </button>
           <button className="vb-btn vb-btn--forget" onClick={() => onAction("forget")}>
             <kbd>H</kbd> OUBLIER
           </button>
         </div>
       </div>
     );
   }

Rendre le composant si batchMode :

   {batchMode && (
     <VeilleBatch
       items={feedItems}  // dÃ©pend de la variable du composant
       idx={batchIdx}
       total={feedItems.length}
       onAction={handleBatchAction}
       onClose={() => setBatchMode(false)}
     />
   )}

`feedItems` = la liste actuelle filtrÃ©e du panel (Ã  identifier dans
panel-veille.jsx ; passer la mÃªme que celle utilisÃ©e par le feed).

handleBatchAction(action) sera implÃ©mentÃ© en partie 2.
```

**Validation** :
- Click sur "Tri en lot" â†’ overlay plein Ã©cran avec article 1/N.
- Les 4 boutons sont visibles, clavier J/G/K/H pas encore actif (partie 2).
- Click sur Ã— â†’ quitte.

---

#### Prompt 14 â€” [JARVIS] Inbox Zero pour Veille (J4) â€” Partie 2 : raccourcis clavier + actions

**PrioritÃ©** : P1
**DÃ©pend de** : Prompt 13
**Fichiers concernÃ©s** : `cockpit/panel-veille.jsx`

```
Contexte : suite du prompt 13.

TÃ¢che : implÃ©menter handleBatchAction et les raccourcis clavier.

1. handleBatchAction (dans le composant principal panel-veille.jsx) :

   const handleBatchAction = React.useCallback((action) => {
     const item = feedItems[batchIdx];
     if (!item) return;
     try { window.track && window.track("veille_batch_action",
       { action, idx: batchIdx, total: feedItems.length }); } catch {}

     if (action === "read") {
       // Marquer comme lu (rÃ©utilise loadVeilleReadState/saveVeilleReadState)
       const state = loadVeilleReadState();
       state[item.id] = { read: true, ts: Date.now() };
       saveVeilleReadState(state);
       if (item.url) window.open(item.url, "_blank", "noopener");
     } else if (action === "keep") {
       const state = loadVeilleReadState();
       state[item.id] = { kept: true, ts: Date.now() };
       saveVeilleReadState(state);
     } else if (action === "snooze") {
       window.snooze && window.snooze.add(item.id, 3);
     } else if (action === "forget") {
       const state = loadVeilleReadState();
       state[item.id] = { forgotten: true, ts: Date.now() };
       saveVeilleReadState(state);
     }
     // Avancer
     if (batchIdx + 1 >= feedItems.length) {
       setBatchMode(false);
       try { window.track && window.track("veille_batch_complete",
         { processed: feedItems.length }); } catch {}
     } else {
       setBatchIdx(i => i + 1);
     }
   }, [batchIdx, feedItems]);

2. Raccourcis clavier (uniquement quand batchMode) :

   useEffect(() => {
     if (!batchMode) return;
     const onKey = (e) => {
       if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
       if (e.key === "j" || e.key === "J") { e.preventDefault(); handleBatchAction("read"); }
       else if (e.key === "g" || e.key === "G") { e.preventDefault(); handleBatchAction("keep"); }
       else if (e.key === "k" || e.key === "K") { e.preventDefault(); handleBatchAction("snooze"); }
       else if (e.key === "h" || e.key === "H") { e.preventDefault(); handleBatchAction("forget"); }
       else if (e.key === "Escape") setBatchMode(false);
     };
     window.addEventListener("keydown", onKey);
     return () => window.removeEventListener("keydown", onKey);
   }, [batchMode, handleBatchAction]);

3. Styles dans cockpit/styles.css (juste aprÃ¨s .recent-toggle, ~ligne 870) :
   .vb-overlay {
     position: fixed; inset: 0;
     background: var(--bg);
     z-index: 200;
     display: flex; flex-direction: column;
     align-items: center; justify-content: center;
     padding: var(--space-5) var(--space-6);
     animation: vbFadeIn 200ms;
   }
   @keyframes vbFadeIn { from { opacity: 0; } to { opacity: 1; } }
   .vb-progress { position: absolute; top: var(--space-4); left: var(--space-5);
     right: var(--space-5); display: flex; justify-content: space-between;
     align-items: center; font-family: var(--font-mono);
     font-size: var(--text-sm); color: var(--tx2); }
   .vb-close { width: 32px; height: 32px; border-radius: 50%;
     border: 1px solid var(--bd); background: var(--surface);
     color: var(--tx2); font-size: 18px; cursor: pointer; }
   .vb-close:hover { color: var(--tx); border-color: var(--tx2); }
   .vb-card { max-width: 720px; width: 100%; padding: var(--space-6);
     background: var(--surface); border: 1px solid var(--bd);
     border-radius: var(--radius-lg); }
   .vb-meta { font-family: var(--font-mono); font-size: var(--text-2xs);
     letter-spacing: 0.1em; text-transform: uppercase; color: var(--tx3);
     margin-bottom: var(--space-3); display: flex; gap: var(--space-2); }
   .vb-title { font-family: var(--font-display); font-size: var(--text-2xl);
     margin-bottom: var(--space-3); line-height: 1.2; }
   .vb-body { font-size: var(--text-md); line-height: 1.6; color: var(--tx2);
     margin-bottom: var(--space-4); }
   .vb-tags { display: flex; gap: 4px; flex-wrap: wrap; }
   .vb-tag { font-family: var(--font-mono); font-size: var(--text-2xs);
     color: var(--tx3); }
   .vb-actions { display: grid; grid-template-columns: repeat(4, 1fr);
     gap: var(--space-3); margin-top: var(--space-5);
     max-width: 720px; width: 100%; }
   .vb-btn { padding: var(--space-3) var(--space-4);
     background: var(--surface); border: 1px solid var(--bd);
     border-radius: var(--radius); cursor: pointer;
     font-family: var(--font-mono); font-size: var(--text-sm);
     letter-spacing: 0.08em; color: var(--tx); transition: all 120ms;
     display: flex; align-items: center; justify-content: center; gap: 8px; }
   .vb-btn kbd { background: var(--bg); border: 1px solid var(--bd);
     padding: 2px 6px; border-radius: 3px; font-size: 11px; }
   .vb-btn--read:hover { border-color: var(--brand); color: var(--brand); }
   .vb-btn--keep:hover { border-color: var(--positive); color: var(--positive); }
   .vb-btn--snooze:hover { border-color: var(--tx2); }
   .vb-btn--forget:hover { border-color: var(--alert); color: var(--alert); }
   @media (max-width: 760px) {
     .vb-actions { grid-template-columns: repeat(2, 1fr); }
   }

4. Specs : mettre Ã  jour docs/specs/tab-updates.md (et tab-claude.md, tab-news.mdâ€¦
   suivant lesquels onglets utilisent panel-veille.jsx).
```

**Validation** :
- Lance le mode batch sur Veille â†’ la 1Ã¨re card apparaÃ®t plein Ã©cran.
- Touche J â†’ ouvre l'article + avance Ã  la 2e card.
- Touche K â†’ snooze + avance.
- Toutes les cards triÃ©es â†’ modal se ferme automatiquement, message console.
- Touche Ã‰chap â†’ quitte sans rien marquer.

---

#### Prompt 15 â€” [JARVIS] Jarvis Daily Action â€” Partie 1 : table Supabase + gÃ©nÃ©ration

**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `sql/013_daily_actions.sql` (nouveau), `weekly_analysis.py`, `docs/architecture/dependencies.yaml`

```
Contexte : on veut qu'au mount de la home le matin, Jarvis pousse UNE
micro-action de 5 min basÃ©e sur l'Ã©tat du cockpit (idÃ©e qui dort, gap
radar, signal pas adressÃ©, uncomfortable_question). Skip = report 24h,
done = streak +1.

TÃ¢che partie 1 (DB + gÃ©nÃ©ration nocturne) :

1. CrÃ©er sql/013_daily_actions.sql :

   create table if not exists daily_actions (
     id uuid primary key default gen_random_uuid(),
     date date not null,
     kind text not null check (kind in ('idea_promote', 'gap_close',
       'signal_address', 'uncomfortable_question', 'fact_validate')),
     title text not null,
     body text not null,
     prompt text,
     ref_table text,        -- 'business_ideas', 'skill_radar', etc.
     ref_id text,
     created_at timestamptz default now(),
     skipped_at timestamptz,
     completed_at timestamptz,
     skipped_until date,    -- pour les skip 24h
     unique(date, kind)
   );

   alter table daily_actions enable row level security;
   create policy "auth read" on daily_actions for select to authenticated using (true);
   create policy "auth update" on daily_actions for update to authenticated using (true);
   create policy "service role insert" on daily_actions for insert to service_role with check (true);

2. Dans weekly_analysis.py, ajouter une Ã©tape aprÃ¨s la gÃ©nÃ©ration
   d'opportunitÃ©s :

   def generate_daily_action(claude_client, profile, radar, ideas, signals, uncomfortables):
       """Picks ONE actionable nudge for tomorrow morning."""
       prompt = build_daily_action_prompt(profile, radar, ideas, signals, uncomfortables)
       resp = claude_client.messages.create(
           model="claude-haiku-4-5", max_tokens=400,
           messages=[{"role": "user", "content": prompt}],
       )
       return parse_daily_action(resp.content[0].text)
       # â†’ {"kind": "...", "title": "...", "body": "...",
       #    "ref_table": "business_ideas", "ref_id": "..."}

   Le prompt systÃ¨me doit demander Ã  Claude de choisir parmi :
   - La plus vieille idÃ©e en stage incubating ou maturing (>14j)
   - L'axe radar avec score < 50 ET non touchÃ© ces 30j
   - Le signal "rising" ou "new" pas encore consultÃ© (pas dans signal_tracking_views)
   - Une uncomfortable_question pas encore rÃ©pondue
   - Un fact "ancien" (>180j) qui mÃ©rite re-validation

   Sortie JSON strict avec un schÃ©ma validÃ© Python.

3. Insertion dans Supabase :

   sb_post("daily_actions", {
       "date": tomorrow.isoformat(),
       "kind": action["kind"],
       "title": action["title"],
       "body": action["body"],
       "prompt": action.get("prompt"),
       "ref_table": action.get("ref_table"),
       "ref_id": action.get("ref_id"),
   })

   Idempotent grÃ¢ce Ã  `unique(date, kind)` â€” si on relance, le pipeline
   doit catch l'erreur unique et passer au kind suivant.

4. docs/architecture/dependencies.yaml : ajouter la table dans tables[]
   avec owner_pipeline = weekly_analysis. La CI validate-arch va vÃ©rifier.

5. CLAUDE.md : ajouter une mention de la table dans la section
   "Base de donnÃ©es Supabase".
```

**Validation** :
- Migration appliquÃ©e : `\d daily_actions` retourne le schÃ©ma attendu.
- Run weekly_analysis.py en local â†’ 1 ligne insÃ©rÃ©e pour `tomorrow`.
- Re-run mÃªme jour â†’ exception unique, gÃ©rÃ©e gracefully.

---

#### Prompt 16 â€” [JARVIS] Jarvis Daily Action â€” Partie 2 : surface front home

**PrioritÃ©** : P2
**DÃ©pend de** : Prompt 15
**Fichiers concernÃ©s** : `cockpit/lib/data-loader.js`, `cockpit/home.jsx`, `cockpit/styles.css`, `docs/specs/tab-brief.md`

```
Contexte : table daily_actions remplie. Maintenant on l'affiche en tÃªte
de home, juste sous le PageHeader, avant le hero.

TÃ¢che :

1. Dans cockpit/lib/data-loader.js, dans bootTier1, ajouter un fetch
   parallÃ¨le :
       sb.fetchJSON(SUPABASE_URL + "/rest/v1/daily_actions?date=eq."
         + todayISO + "&order=created_at.desc&limit=1")
   et attacher le rÃ©sultat sur `COCKPIT_DATA.daily_action = result[0] || null`.

2. Dans cockpit/home.jsx, dans Home(), juste aprÃ¨s les dÃ©clarations
   des states existants, ajouter :

   const [dailyAction, setDailyAction] = React.useState(data.daily_action);
   const [actionPending, setActionPending] = React.useState(false);

   const completeAction = async () => {
     if (!dailyAction) return;
     setActionPending(true);
     try {
       await window.sb.patchJSON(
         window.SUPABASE_URL + "/rest/v1/daily_actions?id=eq." + dailyAction.id,
         { completed_at: new Date().toISOString() }
       );
       try { window.track && window.track("daily_action_completed",
         { kind: dailyAction.kind }); } catch {}
       // Increment streak in localStorage
       const cur = Number(localStorage.getItem("cockpit-action-streak") || "0");
       localStorage.setItem("cockpit-action-streak", String(cur + 1));
       localStorage.setItem("cockpit-action-streak-last",
         new Date().toISOString().slice(0, 10));
       setDailyAction(null);
     } catch (e) { console.error(e); }
     setActionPending(false);
   };

   const skipAction = async () => {
     if (!dailyAction) return;
     setActionPending(true);
     try {
       const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
       await window.sb.patchJSON(
         window.SUPABASE_URL + "/rest/v1/daily_actions?id=eq." + dailyAction.id,
         { skipped_at: new Date().toISOString(), skipped_until: tomorrow }
       );
       try { window.track && window.track("daily_action_skipped",
         { kind: dailyAction.kind }); } catch {}
       setDailyAction(null);
     } catch (e) { console.error(e); }
     setActionPending(false);
   };

3. Rendu : juste aprÃ¨s `<header className="ph">â€¦</header>` et avant
   le toggle morning/full, ajouter :

   {dailyAction && (
     <section className="daily-action" role="region" aria-label="Action du jour">
       <div className="da-eyebrow">
         <Icon name="sparkle" size={12} stroke={1.75} />
         Ton action du jour Â· ~5 min
       </div>
       <h2 className="da-title">{dailyAction.title}</h2>
       <p className="da-body">{dailyAction.body}</p>
       <div className="da-actions">
         {dailyAction.ref_table && dailyAction.ref_id && (
           <button className="btn btn--primary" disabled={actionPending}
             onClick={() => {
               // Navigate to the relevant panel
               const map = { business_ideas: "ideas", skill_radar: "radar",
                             signal_tracking: "signals", uncomfortable_questions: "profile",
                             profile_facts: "profile" };
               onNavigate(map[dailyAction.ref_table] || "brief");
             }}>
             Y aller â†’
           </button>
         )}
         <button className="btn btn--ghost btn--sm" disabled={actionPending}
           onClick={completeAction}>Fait</button>
         <button className="btn btn--ghost btn--sm" disabled={actionPending}
           onClick={skipAction}>Plus tard (24h)</button>
       </div>
       <div className="da-streak">
         ðŸ”¥ {Number(localStorage.getItem("cockpit-action-streak") || "0")} jours d'affilÃ©e
       </div>
     </section>
   )}

4. Styles dans cockpit/styles.css :

   .daily-action {
     padding: var(--space-5) var(--space-6);
     background: linear-gradient(135deg,
       color-mix(in srgb, var(--brand) 8%, var(--surface)),
       var(--surface));
     border-bottom: 1px solid var(--bd);
     position: relative;
   }
   .da-eyebrow {
     display: inline-flex; align-items: center; gap: 6px;
     font-family: var(--font-mono); font-size: var(--text-xs);
     letter-spacing: 0.12em; text-transform: uppercase;
     color: var(--brand); margin-bottom: var(--space-2);
   }
   .da-title {
     font-family: var(--font-display); font-size: var(--text-2xl);
     line-height: 1.2; margin-bottom: var(--space-3);
   }
   .da-body { font-size: var(--text-md); color: var(--tx2);
     line-height: 1.6; max-width: 64ch; margin-bottom: var(--space-4); }
   .da-actions { display: flex; gap: var(--space-2); flex-wrap: wrap;
     margin-bottom: var(--space-3); }
   .da-streak { font-family: var(--font-mono); font-size: var(--text-xs);
     color: var(--tx3); }

5. Specs : crÃ©er ou mettre Ã  jour docs/specs/tab-brief.md section
   "FonctionnalitÃ©s" : "Action du jour â€” Jarvis te pousse une seule
   micro-action chaque matin (idÃ©e qui dort, gap radar Ã  combler,
   signal Ã  creuser). Trois choix : faire, reporter Ã  demain, y aller
   directement. Ton streak se cumule chaque jour."
```

**Validation** :
- Avec une ligne dans daily_actions pour aujourd'hui, la section apparaÃ®t en haut de home.
- Click "Fait" â†’ la section disparaÃ®t, streak +1 visible.
- Click "Plus tard 24h" â†’ la section disparaÃ®t, daily_actions row updated.
- Sans daily_actions row â†’ la section ne rend rien.

---

### P2 â€” Polish et features Jarvis avancÃ©es

#### Prompt 17 â€” [JARVIS] Brief en 90 secondes (J1) â€” Partie 1 : structure

**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/components-replay.jsx` (nouveau), `index.html`, `cockpit/styles-replay.css` (nouveau)

```
Contexte : on veut un mode "Spotify Wrapped quotidien" â€” animation de
8 cards qui dÃ©filent en 90s, audio TTS narratif, partageable.

TÃ¢che partie 1 (squelette + cards) :

1. CrÃ©er cockpit/components-replay.jsx :

   // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   // REPLAY DAILY â€” Animation 90s plein Ã©cran
   // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   // 8 cards sÃ©quentielles, chaque card 11-12s, transition 500ms.
   // Audio TTS narre chaque card en parallÃ¨le.
   // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   const { useState: useStateRp, useEffect: useEffectRp, useRef: useRefRp } = React;

   const REPLAY_CARD_DURATION_MS = 11000;
   const REPLAY_TRANSITION_MS = 500;

   function ReplayDaily({ data, onClose }) {
     const [idx, setIdx] = useStateRp(0);
     const [paused, setPaused] = useStateRp(false);
     const cards = useMemoRp(() => buildCards(data), [data]);
     const total = cards.length;

     useEffectRp(() => {
       if (paused) return;
       const t = setTimeout(() => {
         if (idx + 1 >= total) {
           // End: navigate back home
           onClose();
         } else {
           setIdx(i => i + 1);
         }
       }, REPLAY_CARD_DURATION_MS);
       return () => clearTimeout(t);
     }, [idx, paused, total, onClose]);

     useEffectRp(() => {
       const card = cards[idx];
       if (!card || paused) return;
       const u = new SpeechSynthesisUtterance(card.narration);
       u.lang = "fr-FR"; u.rate = 1.05;
       const fr = window.speechSynthesis.getVoices().find(v => /^fr/i.test(v.lang));
       if (fr) u.voice = fr;
       window.speechSynthesis.cancel();
       window.speechSynthesis.speak(u);
       return () => window.speechSynthesis.cancel();
     }, [idx, paused]);

     useEffectRp(() => {
       const onKey = (e) => {
         if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
         else if (e.key === "Escape") onClose();
         else if (e.key === "ArrowRight") setIdx(i => Math.min(i+1, total-1));
         else if (e.key === "ArrowLeft") setIdx(i => Math.max(i-1, 0));
       };
       window.addEventListener("keydown", onKey);
       return () => window.removeEventListener("keydown", onKey);
     }, [total, onClose]);

     const card = cards[idx];

     return (
       <div className="rp-overlay">
         <div className="rp-progress">
           {cards.map((_, i) => (
             <div key={i} className={`rp-bar ${i < idx ? "is-done" :
                                              i === idx ? "is-active" : ""}`}>
               <div className="rp-bar-fill" />
             </div>
           ))}
         </div>
         <button className="rp-close" onClick={onClose}>Ã—</button>
         <div className={`rp-card rp-card--${card.kind}`} key={idx}>
           <div className="rp-eyebrow">{card.eyebrow}</div>
           <div className="rp-headline">{card.headline}</div>
           {card.body && <div className="rp-body">{card.body}</div>}
           {card.stat && <div className="rp-stat">{card.stat}</div>}
         </div>
         <div className="rp-foot">
           <span>{idx + 1} / {total}</span>
           <button onClick={() => setPaused(p => !p)}>
             {paused ? "â–¶ Reprendre" : "â¸ Pause"}
           </button>
         </div>
       </div>
     );
   }

   function buildCards(data) {
     const week = data.week || {};
     const macro = data.macro || {};
     const top = (data.top || [])[0] || {};
     const radar = data.radar || {};
     return [
       { kind: "intro", eyebrow: "Mardi 21 avril", headline: "VoilÃ  ta semaine.",
         body: "En 90 secondes.",
         narration: "Bonjour. VoilÃ  ta semaine, en 90 secondes." },
       { kind: "stat", eyebrow: "Articles lus", stat: week.total_read || 0,
         body: `streak veille : ${week.streak} jours`,
         narration: `Tu as lu ${week.total_read} articles cette semaine, ton streak veille atteint ${week.streak} jours.` },
       { kind: "theme", eyebrow: "Top thÃ¨me", headline: macro.title,
         narration: macro.title },
       { kind: "top", eyebrow: "Article le plus marquant",
         headline: top.title || "â€”", body: top.source,
         narration: `Article qui t'a marquÃ© : ${top.title}, sur ${top.source}.` },
       { kind: "radar", eyebrow: "Ton gap prioritaire",
         headline: radar.next_gap?.axis || "â€”",
         body: radar.next_gap?.reason,
         narration: `Ton gap prioritaire reste ${radar.next_gap?.axis}.` },
       { kind: "signal", eyebrow: "Signal Ã  surveiller",
         headline: (data.signals || [])[0]?.name || "â€”",
         narration: `Le signal Ã  surveiller : ${(data.signals || [])[0]?.name}.` },
       { kind: "perso", eyebrow: "Hors veille",
         headline: `${week.personal?.workouts?.done || 0} sÃ©ances sport, ${Math.round((week.personal?.music?.total_min || 0) / 60)}h de musique`,
         narration: `CÃ´tÃ© perso : ${week.personal?.workouts?.done} sÃ©ances sport, ${Math.round((week.personal?.music?.total_min || 0) / 60)} heures de musique.` },
       { kind: "outro", eyebrow: "Ã€ demain", headline: "Bonne journÃ©e, Jean.",
         narration: "Ã€ demain. Bonne journÃ©e." },
     ];
   }

   window.ReplayDaily = ReplayDaily;

2. Dans index.html, ajouter le script Replay juste avant app.jsx :
       <script type="text/babel" src="cockpit/components-replay.jsx?v=1"></script>
       <link rel="stylesheet" href="cockpit/styles-replay.css?v=1">

3. Dans cockpit/styles-replay.css (nouveau fichier) :

   .rp-overlay { position: fixed; inset: 0; z-index: 250;
     background: var(--bg); display: flex; flex-direction: column;
     align-items: center; justify-content: center;
     animation: rpFade 200ms; }
   @keyframes rpFade { from { opacity: 0; } to { opacity: 1; } }
   .rp-progress { position: absolute; top: 0; left: 0; right: 0;
     display: flex; gap: 4px; padding: 12px 16px; }
   .rp-bar { flex: 1; height: 3px; background: var(--bd);
     border-radius: 2px; overflow: hidden; }
   .rp-bar-fill { height: 100%; background: var(--brand);
     transform-origin: left; transform: scaleX(0); }
   .rp-bar.is-active .rp-bar-fill {
     animation: rpBar 11s linear forwards; }
   .rp-bar.is-done .rp-bar-fill { transform: scaleX(1); }
   @keyframes rpBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
   .rp-close { position: absolute; top: 24px; right: 24px;
     width: 36px; height: 36px; border-radius: 50%;
     background: var(--surface); border: 1px solid var(--bd);
     color: var(--tx); font-size: 22px; cursor: pointer;
     z-index: 1; }
   .rp-card { max-width: 720px; padding: var(--space-7); text-align: center;
     animation: rpCardIn 600ms cubic-bezier(.2,.8,.2,1); }
   @keyframes rpCardIn { from { opacity: 0; transform: translateY(40px); }
                          to { opacity: 1; transform: translateY(0); } }
   .rp-eyebrow { font-family: var(--font-mono); font-size: var(--text-xs);
     letter-spacing: 0.16em; text-transform: uppercase;
     color: var(--brand); margin-bottom: var(--space-4); }
   .rp-headline { font-family: var(--font-display); font-size: clamp(40px, 6vw, 80px);
     line-height: 1.05; letter-spacing: -0.03em; color: var(--tx);
     margin-bottom: var(--space-4); text-wrap: balance; }
   .rp-body { font-size: var(--text-xl); color: var(--tx2);
     line-height: 1.5; max-width: 64ch; margin: 0 auto; }
   .rp-stat { font-family: var(--font-display); font-size: clamp(80px, 12vw, 180px);
     line-height: 1; color: var(--brand); font-variant-numeric: tabular-nums; }
   .rp-foot { position: absolute; bottom: 32px; display: flex;
     gap: var(--space-3); align-items: center; font-family: var(--font-mono);
     font-size: var(--text-sm); color: var(--tx2); }
   .rp-foot button { padding: 6px 14px; border: 1px solid var(--bd);
     border-radius: 999px; background: var(--surface); color: var(--tx);
     cursor: pointer; }
```

**Validation** :
- ImplÃ©menter le bouton trigger sera dans le prompt 18.
- Pour test isolÃ© : dans la console, `ReactDOM.createRoot(document.body.appendChild(document.createElement('div'))).render(React.createElement(ReplayDaily, {data: COCKPIT_DATA, onClose: () => {}}))`. Doit jouer les 8 cards en 88s avec narration audio.

---

#### Prompt 18 â€” [JARVIS] Brief en 90 secondes (J1) â€” Partie 2 : trigger

**PrioritÃ©** : P2
**DÃ©pend de** : Prompt 17
**Fichiers concernÃ©s** : `cockpit/home.jsx`

```
Contexte : suite du prompt 17. Le composant ReplayDaily existe. Il faut
maintenant un trigger.

TÃ¢che : dans cockpit/home.jsx, dans Home() :

1. Ajouter le state :
   const [replayOpen, setReplayOpen] = React.useState(false);

2. Dans le ph-right (header), ajouter un bouton :
   <button className="ph-chip" onClick={() => setReplayOpen(true)}>
     <Icon name="play_circle" size={13} stroke={2} /> Replay 90s
   </button>

3. Au-dessus du return final, conditionner :
   {replayOpen && (
     <ReplayDaily data={data} onClose={() => {
       setReplayOpen(false);
       try { window.track && window.track("replay_completed", {}); } catch {}
     }} />
   )}

4. Auto-trigger lundi matin si jamais lancÃ© pour cette semaine :

   React.useEffect(() => {
     try {
       const dow = new Date().getDay(); // 1 = lundi
       const hour = new Date().getHours();
       const week = data.date?.week || "";
       const lastReplay = localStorage.getItem("cockpit-replay-last-week");
       if (dow === 1 && hour < 11 && lastReplay !== week) {
         localStorage.setItem("cockpit-replay-last-week", week);
         setReplayOpen(true);
       }
     } catch {}
   }, [data.date?.week]);

Telemetry : `track("replay_started", { trigger: "auto"|"manual" })`.
```

**Validation** :
- Lundi matin, ouverture de la home â†’ replay se dÃ©clenche auto une fois.
- Bouton "Replay 90s" dans le header, click â†’ relance.
- Ã‰chap pendant la lecture â†’ ferme proprement.

---

#### Prompt 19 â€” [JARVIS] Cockpit "weekend mode" (J11)

**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/sidebar.jsx`, `cockpit/app.jsx`

```
Contexte : le samedi-dimanche, l'utilisateur veut moins de Veille IA et
plus de Forme/Musique/Gaming/IdÃ©es. On veut un mode automatique avec
override.

TÃ¢che :

1. Dans cockpit/app.jsx, ajouter un state weekendMode :

   const [weekendMode, setWeekendMode] = React.useState(() => {
     try {
       const explicit = localStorage.getItem("cockpit-weekend-explicit");
       if (explicit) return explicit === "1";
       const dow = new Date().getDay();
       return dow === 0 || dow === 6;
     } catch { return false; }
   });

2. Passer la prop `weekendMode` au Sidebar :
   <Sidebar â€¦ weekendMode={weekendMode} onWeekendToggle={(v) => {
     localStorage.setItem("cockpit-weekend-explicit", v ? "1" : "0");
     setWeekendMode(v);
   }} />

3. Dans cockpit/sidebar.jsx, dans Sidebar(), ajouter logique de filtrage
   conditionnel :

   const visibleNav = React.useMemo(() => {
     if (!weekendMode) return data.nav;
     // En mode weekend, demote 'Veille' et 'RTE Toolbox', promote 'Vie perso'
     // et 'Carnet'.
     const WEEKEND_DEMOTE = new Set(["updates", "claude", "signals",
       "wiki", "veille-outils"]);
     return data.nav
       .map(group => ({
         ...group,
         items: group.items.filter(it => !WEEKEND_DEMOTE.has(it.id)),
       }))
       .filter(g => g.items.length > 0);
   }, [data.nav, weekendMode]);

   Et utiliser `visibleNav` Ã  la place de `sortedNav` (ou combiner les deux
   si Prompt 11 est dÃ©jÃ  appliquÃ©).

4. Ajouter un toggle dans le footer sidebar (juste sous .sb-foot-bottom) :

   <div className="sb-foot-weekend">
     <label>
       <input type="checkbox" checked={weekendMode}
              onChange={(e) => onWeekendToggle(e.target.checked)} />
       <span>Mode weekend</span>
     </label>
   </div>

5. Styles dans cockpit/styles.css :
   .sb-foot-weekend { padding: 6px var(--space-3);
     font-family: var(--font-mono); font-size: var(--text-2xs);
     color: var(--tx2); }
   .sb-foot-weekend label { display: flex; gap: 6px; align-items: center;
     cursor: pointer; }
```

**Validation** :
- Samedi : sidebar n'affiche plus updates/claude/signals/wiki par dÃ©faut.
- Toggle off : retombe sur l'ordre normal.
- Lundi : bascule auto en mode normal sauf si l'utilisateur a forcÃ©.

---

#### Prompt 20 â€” [UX] Hover sur cards lues 0.85 transition (cleanup)

**PrioritÃ©** : P2
**DÃ©pend de** : Prompt 7
**Fichiers concernÃ©s** : `cockpit/styles.css`

```
Contexte : suite du prompt 7. Les cards lues collapse Ã  56px mais le
hover Ã  0.85 opacity peut surprendre. Ajout d'une bordure d'accent
au hover pour signaler l'interaction "rÃ©ouvrir".

TÃ¢che : dans cockpit/styles.css, ajouter Ã  la suite des rÃ¨gles de prompt 7 :

   .top-card.is-read:hover {
     opacity: 0.85;
     border-color: var(--bd2);
     padding-left: 26px;
   }
   .top-card.is-read:hover::before {
     content: "â†º rouvrir";
     position: absolute;
     left: 8px; top: 50%;
     transform: translateY(-50%);
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.08em;
     color: var(--tx3);
   }
   .top-card.is-read { padding-left: 22px; transition-property:
     max-height, padding, opacity, padding-left; }
```

**Validation** : hover sur une card lue â†’ la card rÃ©vÃ¨le "â†º rouvrir" et l'opacity remonte Ã  0.85.

---

## 5. Checklist d'exÃ©cution

Ordre recommandÃ©. Chaque prompt s'exÃ©cute indÃ©pendamment sauf mention explicite.

### Sprint 1 â€” P0 (â‰¤ 2h cumul)

| # | Prompt | Effort | Cumul | DÃ©pend de |
|---|---|---|---|---|
| 1 | P3. Animations infinies â†’ 3 boucles | 5 min | 5 min | â€” |
| 2 | P4. Token `--neutral` | 10 min | 15 min | â€” |
| 3 | P5. Hover en `color-mix` | 10 min | 25 min | â€” |
| 4 | P2. Filtre `RÃ©cent Â· 24h` auto-on | 10 min | 35 min | â€” |
| 5 | P1. Hero "delta" mode visite rÃ©currente | 25 min | 1h | â€” |
| 6 | P7. Cards lues collapse | 15 min | 1h15 | â€” |
| 7 | P6. Ã‰tat zÃ©ro positif | 20 min | 1h35 | P1 |
| 8 | P8. Reading time tag | 10 min | 1h45 | â€” |

**CritÃ¨re sprint 1** : retour quotidien fluide, animations apaisÃ©es, Ã©tat zÃ©ro qui motive. Mesurable via `usage_events` : `daily_active_minutes` doit augmenter ou rester stable, `bounce_rate` (visite < 30s) doit chuter.

### Sprint 2 â€” P1 (effort 30 min - 2h)

| # | Prompt | Effort | DÃ©pend de |
|---|---|---|---|
| 9 | P9. Audio brief chip persistante | 1h | â€” |
| 10 | P10. Mobile Jarvis drawer | 45 min | â€” |
| 11 | P11. Smart sidebar reorder | 30 min | â€” |
| 12 | P12. Ask Jarvis dropdown 3 questions | 1h | â€” |
| 13 | P13. Inbox Zero â€” partie 1 | 45 min | â€” |
| 14 | P14. Inbox Zero â€” partie 2 | 45 min | P13 |

**CritÃ¨re sprint 2** : amÃ©liorations mobiles + power user. Mesurable : `veille_batch_complete` events > 0, `jarvis_memory_drawer_opened` events sur mobile, taux d'usage Ask-Jarvis Ã— 2.

### Sprint 3 â€” P2 (features Jarvis avancÃ©es)

| # | Prompt | Effort | DÃ©pend de |
|---|---|---|---|
| 15 | P15. Daily Action â€” DB + gÃ©nÃ©ration | 1h | â€” |
| 16 | P16. Daily Action â€” surface front | 45 min | P15 |
| 17 | P17. Replay 90s â€” structure | 1h30 | â€” |
| 18 | P18. Replay 90s â€” trigger | 15 min | P17 |
| 19 | P19. Weekend mode | 30 min | P11 (recommandÃ©) |
| 20 | P20. Hover cards lues cleanup | 5 min | P7 |

**CritÃ¨re sprint 3** : l'app devient "vivante" â€” Jarvis pousse, le replay rend le rituel hebdomadaire mÃ©morable. Mesurable : `daily_action_completed` events, `replay_completed` events â‰¥ 1Ã—/semaine, NPS auto-dÃ©claratif si on ajoute un widget.

---

## 6. DÃ©pendances et invariants Ã  prÃ©server

Tous les prompts respectent les invariants suivants â€” Ã  ne pas casser :

- **CSP** : pas d'`<iframe>`, pas d'`object`, pas de chargement de domaine non whitelist (cf. `index.html:6`).
- **No build step** : pas de `import`/`export` ES modules, exposition via `window.X = X`.
- **DOMPurify obligatoire** sur tout `dangerouslySetInnerHTML` venant de la base.
- **localStorage en `try {} catch {}`** (Safari ITP).
- **Telemetry table** : ajouter le nouvel `event_type` dans le tableau de la section *TÃ©lÃ©mÃ©trie* du `CLAUDE.md` AVANT le commit.
- **Specs panels** : toute modif fonctionnelle d'un onglet â†’ update `docs/specs/tab-<slug>.md` + bump `last_updated` dans `docs/specs/index.json`. La CI `lint-specs` bloque le merge sinon.
- **Architecture** : nouveau pipeline / nouvelle table / nouveau panel â†’ update `docs/architecture/` correspondant. La CI `validate-arch` bloque sinon.
- **3 thÃ¨mes** : tester chaque modif visuelle dans Dawn, Obsidian et Atlas. Le bouton Ctrl+B (sidebar collapse) + le toggle thÃ¨me sont les 2 raccourcis les plus frÃ©quents â€” surveiller leur intÃ©gritÃ©.

---

## 7. Points hors scope (Ã  creuser plus tard)

Ces sujets mÃ©ritent un audit dÃ©diÃ©, pas couverts ici :

- **Performance perÃ§ue** : audit Lighthouse + Web Vitals + impact du `@babel/standalone` (parser un JSX au load coÃ»te 200-400ms sur mobile bas-de-gamme). Migration graduelle vers ESM build pourrait diviser le first paint par 2.
- **SÃ©curitÃ© Supabase** : revue approfondie des RLS row-level â€” sont-elles vraiment iso entre `authenticated` et `service_role` ? Aucune escalade possible ?
- **CoÃ»t Claude Haiku** : le `weekly_analysis.py` est budgÃ©tÃ© 1$/run, mais avec 23 panels qui pourraient tous gÃ©nÃ©rer des recos hebdo, Ã§a peut grimper. ModÃ¨le de coÃ»t Ã  formaliser.
- **Audit a11y rigoureux** : passer un Axe DevTools sur chaque panel aprÃ¨s auth, mesurer contraste WCAG AA sur les 3 thÃ¨mes, navigation clavier exhaustive, lecteurs d'Ã©cran.

---

## Conclusion

Le cockpit est **un produit personnel d'une qualitÃ© rare** â€” design system tri-thÃ¨me abouti, archi data Tier 1/Tier 2 bien pensÃ©e, tÃ©lÃ©mÃ©trie en place, sÃ©curitÃ© sÃ©rieuse. Le score global de 3.61/5 reflÃ¨te un projet Ã  un palier de maturitÃ© avancÃ©.

**Le levier de rÃ©tention 30 jours #1 reste le mode "delta" sur la home** (Prompt 1) : tant que le hero reste statique, l'utilisateur va s'Ã©puiser Ã  chercher ce qui a changÃ©. Une fois cette douleur rÃ©solue, les Sprint 2/3 ouvrent la voie Ã  un **cockpit qui pousse** au lieu d'attendre â€” c'est ce qui transforme un outil personnel en une habitude quotidienne.

L'Ã©cart entre "cockpit qui informe" et "cockpit qui guide" se gagne en 3 sprints de 2-4h chacun. Bonne route.
