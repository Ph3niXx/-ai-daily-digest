# Médiathèque — application iOS (PWA dédiée)

Spec de conception. Porter la médiathèque sur iPhone sous forme d'application installée
sur l'écran d'accueil, sans réécrire l'interface et sans toucher au cockpit.

## Problème

La médiathèque est le seul onglet du cockpit dont l'usage repose sur un couple
« décision + écriture » : elle tranche quoi regarder et elle enregistre le `+1 épisode`.
Son moment de vérité est la bande « Ce soir », active de 18 h à 2 h — c'est-à-dire
exactement quand le PC est éteint. L'outil qui répond à « qu'est-ce que je regarde ce
soir » ne tourne aujourd'hui que sur la machine où la question ne se pose jamais.

Trois obstacles séparent l'état actuel d'un usage réel depuis le canapé.

1. **Le démarrage à froid.** `index.html` charge 30 scripts `type="text/babel"`, soit
   **859 ko de JSX que Babel standalone transpile dans le navigateur**, plus 589 ko de
   CSS et 11 requêtes Tier 1 (dont `articles` sur 30 jours, `limit=400`). Sur le CPU
   d'un iPhone c'est plusieurs secondes à chaque ouverture. Une application qu'on tape à
   21 h et qui met quatre secondes à apparaître est une application qu'on cesse de taper.
2. **Le panel n'a pas été dessiné pour le pouce.** `styles-mediatheque.css` ne contient
   que trois blocs `@media` minuscules (agenda, padding de page, retour à la ligne du
   vocabulaire japonais). Les boutons du stepper font 26 × 26 px, les champs numériques
   sont en 12 px — sous le seuil de 16 px à partir duquel Safari iOS zoome
   automatiquement à la mise au point — et la fiche franchise est une modale centrée
   dont le défilement est porté par le backdrop.
3. **Le service worker ne précache rien.** Constat vérifié, détaillé plus bas : les 88
   entrées de `STATIC[]` sont des 404 et l'échec est silencieux.

Le shell mobile, lui, **existe déjà** et fonctionne : `cockpit/styles-mobile.css`
(sidebar en drawer à ≤ 760 px, hamburger, backdrop, cibles 44 px) est câblé dans
`app.jsx:593`, `sidebar.jsx:109` et `index.html:37`. Le cockpit est navigable au pouce.
Ce n'est donc pas le problème à résoudre.

## Objectif

Une icône « Médiathèque » sur l'écran d'accueil iOS qui ouvre directement sur la
médiathèque, démarre vite, et se manipule au pouce — recherche et ajout de titres
compris. Le cockpit desktop reste strictement inchangé.

**Hors périmètre, tranché avec l'utilisateur :** application native (Swift ou React
Native), notifications push, fonctionnement hors ligne, portage des 29 autres onglets.

## Principe directeur

**Une seconde page d'entrée, pas une seconde application.** `mediatheque.html` charge
exactement les mêmes fichiers que le cockpit — même `panel-mediatheque.jsx`, même
`mediatheque-view.js`, mêmes clients AniList et TMDB — et ne diffère que par ce qu'elle
*ne* charge pas : les 28 autres panels, la sidebar, les 11 requêtes Tier 1.

Le critère de réussite de ce principe : **aucune logique métier n'est dupliquée**. Si le
portage mobile finit par exiger une variante d'une fonction de `mediatheque-view.js`,
c'est que le principe a été violé.

## Ce qui a été mesuré

Le choix d'une page dédiée plutôt que d'une simple passe responsive sur le cockpit
repose sur ces chiffres, relevés le 2026-07-27.

| | `index.html` | `mediatheque.html` |
|---|---|---|
| Scripts Babel transpilés dans le navigateur | 30 fichiers, **859 ko** | 2 fichiers, **71 ko** |
| CSS | 589 ko | 176 ko |
| Requêtes au boot | 11 | 8 |
| Charge utile Supabase | `articles` 30 j (400 lignes) + `signal_tracking` (436 lignes / 150 ko) + 9 autres | **148 ko** |

Le coût dominant n'est pas le réseau — l'usage visé est le canapé, donc le wifi — mais
la transpilation. Le rapport est de **12 pour 1**. C'est la seule justification de cette
spec ; si elle tombe, l'option « rendre le cockpit responsive et s'en servir » est
strictement moins chère.

Détail de la charge Tier 2 : `media_entries` 218 lignes / 73 ko, `media_franchises` 47 /
48 ko, `media_progress` 170 / 12 ko, `jp_words` 83 / 9 ko, `user_profile` 17 / 6 ko,
`media_releases` 1, `jp_seen` 0, `activity_briefs` du jour 1.

## Prérequis — le préfixe de base

À faire **avant** tout le reste : c'est un bug existant, et le démarrage rapide en dépend.

Le site est un GitHub Pages **de projet**, servi sous `/jarvis-cockpit/`. Tout le PWA a
été écrit en supposant une racine de domaine. Trois choses en découlent, vérifiées par
requête HTTP le 2026-07-27 :

```
404  https://ph3nixx.github.io/sw.js                           ← ce que index.html:128 enregistre
200  https://ph3nixx.github.io/jarvis-cockpit/sw.js            ← ce qui existe

404  https://ph3nixx.github.io/cockpit/app.jsx                 ← ce que STATIC[] demande
200  https://ph3nixx.github.io/jarvis-cockpit/cockpit/app.jsx  ← ce qui existe
404  https://ph3nixx.github.io/                                ← sw.js:8
404  https://ph3nixx.github.io/index.html                      ← sw.js:94
```

1. **Le service worker ne s'enregistre pas.** `index.html:128` appelle
   `navigator.serviceWorker.register("/sw.js")`, qui est un 404 ; l'échec est avalé par
   son `.catch(() => {})`. Il n'y a donc aujourd'hui **aucun service worker actif** — ni
   précache, ni cache au fil de l'eau.
2. **Même s'il s'enregistrait, il ne précacherait rien.** Les 88 entrées de `STATIC[]`
   sont des 404 ; `caches.addAll()` rejette au premier échec et n'écrit rien, rejet
   avalé par le `.catch(() => {})` de `sw.js:100`.
3. **`manifest.json` a un `start_url: "/"` qui pointe sur un 404.** Cela ne se voit pas
   uniquement parce que la spec W3C fait retomber un `start_url` hors scope sur l'URL du
   document courant.

La promesse d'en-tête de `sw.js` — « installable et rapide hors ligne » — n'a donc jamais
été tenue, et la mesure de démarrage à froid ci-dessus est un plancher : le second
lancement coûte aujourd'hui autant que le premier.

Correctif : enregistrement en chemin relatif (`"./sw.js"`, qui donne aussi le bon scope
`/jarvis-cockpit/`, couvrant les deux pages), préfixe de base dans
`scripts/sync-sw.mjs`, et **assertion que chaque entrée de `STATIC[]` existe sur le
disque**. Sans cette assertion le bug revient à la première réorganisation.
`manifest.json` passe à `start_url: "./"`.

## Architecture

### `mediatheque.html`

À la racine, une soixantaine de lignes. Même CSP que `index.html` (`'unsafe-eval'` reste
requis par Babel standalone), mêmes CDN React / ReactDOM / Babel avec les mêmes SRI,
`<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`
pour que `env(safe-area-inset-*)` soit exploitable.

Elle charge, dans l'ordre :

- **CSS** — `styles.css` (les tokens de thème, dont dépendent toutes les variables
  `--tx` / `--bg` / `--brand`), `styles-mediatheque.css`, `styles-mobile.css`
- **libs classiques** (aucun coût Babel) — `supabase.js`, `auth.js`, `themes.js`,
  `dialog.js` (fournit `cockpitToast`), `telemetry.js` (fournit `track`), `anilist.js`,
  `tmdb.js`, `mediatheque-view.js`, `data-loader.js`
- **shapes** — `data-profile.js`, `data-mediatheque.js`
- **Babel** — `icons.jsx`, `panel-mediatheque.jsx`, et rien d'autre
- **`cockpit/lib/boot-mediatheque.js`** en dernier

La liste est dérivée des globales que le panel lit réellement : `MEDIATHEQUE_DATA`,
`PROFILE_DATA`, `SUPABASE_URL`, `anilist`, `tmdb`, `mdtView`, `sb`, `cockpitToast`,
`track`. Elle est verrouillée par un test (voir Vérification).

### `manifest-mediatheque.json`

`start_url: "./mediatheque.html"`, `display: "standalone"`, `name` et `short_name`
« Médiathèque », `theme_color` aligné sur le thème courant. Icône PNG dédiée.

**`apple-touch-icon` PNG 180 × 180, à ajouter sur les deux pages.** iOS ignore les icônes
SVG déclarées dans un manifest et met une capture d'écran de la page à la place — c'est
la cause de l'icône actuelle du cockpit.

### `cockpit/lib/boot-mediatheque.js`

Calqué sur `bootstrap.js`, amputé de Tier 1 :

1. overlay de chargement (même markup que `bootstrap.js:18-22`)
2. `await window.cockpitAuth.waitForAuth()` — **inchangé**. `auth.js:58` utilise
   `redirectTo: window.location.origin + window.location.pathname`, donc la redirection
   Google revient d'elle-même sur `/jarvis-cockpit/mediatheque.html`. Aucune
   modification de l'auth n'est nécessaire.
3. `await Promise.all([ dataLoader.loadPanel("mediatheque"), dataLoader.loadUserProfile() ])`,
   puis hydratation de `PROFILE_DATA._values` — le panel y lit `tmdb_api_key`
   (`panel-mediatheque.jsx:776`), seule donnée Tier 1 dont il dépende.
4. attente de la compilation Babel, puis `createRoot(#root).render(<PanelMediatheque/>)`
5. écouteur `visibilitychange` (voir Risques)

**Décision : `boot-mediatheque.js` réutilise `data-loader.js` plutôt que de recopier les
sept requêtes.** Le fichier est volumineux mais c'est du JS classique, sans coût Babel, et
le service worker le cache. Surtout, `loadPanel("mediatheque")` est la source de vérité
unique de « ce dont la médiathèque a besoin » : la dupliquer garantirait une dérive au
prochain ajout de table — ce qui vient précisément d'arriver avec `jp_words`.

### Ce qui n'est pas touché

`app.jsx`, `sidebar.jsx`, `styles.css`, `bootstrap.js`, `nav.js`. Le risque de régression
sur le cockpit est nul par construction.

Deux exceptions, minimes et sans changement de comportement :

- **`data-loader.js`** — `loadUserProfile` est aujourd'hui une fonction privée du module,
  absente de l'objet exporté (`data-loader.js:4871-4885`), et `T2` n'offre pas
  d'équivalent. On l'ajoute à la liste d'export : une ligne, aucun effet sur le cockpit.
  L'alternative — refetch `user_profile` à la main dans `boot-mediatheque.js` —
  dupliquerait une requête pour économiser une ligne.
- **`index.html`** — l'enregistrement du service worker passe en chemin relatif (voir
  Prérequis), et la page reçoit son `apple-touch-icon`.

`mediatheque.html` charge par ailleurs `nav.js` avant `data-loader.js` : ce dernier lit
`window.COCKPIT_NAV` (`data-loader.js:1167-1169`), certes de façon paresseuse et avec un
repli sur `[]`, mais l'ordre de `index.html:51-52` est documenté comme obligatoire et il
ne coûte rien de le respecter.

## La passe mobile

Tout ce qui suit vit dans **`styles-mediatheque.css`**, pas dans `styles-mobile.css` :
l'en-tête de ce dernier (lignes 3-7) pose la convention selon laquelle il ne traite que
le shell, les motifs partagés et les trous, « la plupart des panels gèrent déjà leur
propre repli via des `@media` dans leur `.css` dédié ». On étend donc les blocs 720 px
existants et on ajoute un palier ≤ 480 px.

### Cibles tactiles

Le projet s'est déjà fixé 44 px (`styles-mobile.css:233`, WCAG 2.1 AAA). État actuel :

| Contrôle | Aujourd'hui | Rôle |
|---|---|---|
| `.mdt-stepper button` (− / +) | **26 × 26 px** | le geste principal de l'application |
| `.mdt-budget` (30 min / 1 h / 2 h+) | ~26 px | le tap du soir |
| `.mdt-chip`, `.mdt-viewtoggle-btn` | ~26 px | filtres de type, bascule de recherche |
| `.mdt-rating-pill` | ~24 px | noter une saison |
| `.mdt-jp-btn` (« je connais ») | ~22 px | vocabulaire japonais |
| `.mdt-release-ack` (✓) | ~20 px | acquitter une sortie |
| `.mdt-btn` | ~36 px | actions de fiche |

### Zoom automatique de Safari

`.mdt-search` est en 13.5 px, `.mdt-stepper-count input` et `.mdt-rating input` en 12 px.
**Safari iOS zoome la page dès qu'un champ sous 16 px reçoit le focus** — et les deux
champs numériques portant `autoFocus` (`panel-mediatheque.jsx:106` et `:127`), le zoom
part tout seul dès qu'on tape le compteur. Passage à 16 px pour tout champ focusable en
dessous de 760 px, plus `inputMode="numeric"` sur les deux `type="number"`.

### `:hover` collant

`.mdt-card` est correctement isolé dans `@media (hover: hover)` (`styles-mediatheque.css:202`).
Dix autres règles ne le sont pas : `.mdt-rail-card`, `.mdt-tonight-card`, `.mdt-result`,
`.mdt-agenda-item`, `.mdt-later-pill`, `.mdt-chip`, `.mdt-budget`, `.mdt-viewtoggle-btn`,
`.mdt-release-ack`, `.mdt-jp-btn`. Sur iOS le `:hover` reste appliqué après un tap jusqu'au
tap suivant : la carte paraît sélectionnée alors qu'elle ne l'est pas. On généralise le
motif déjà en place ligne 202.

### Fiche franchise → feuille plein écran

Aujourd'hui : backdrop en `padding: 6vh 16px` portant lui-même l'`overflow-y`, modale en
`min(760px, 100%)`. Sur iPhone cela produit le double défilement classique, avec le corps
de page qui bouge derrière la feuille.

En dessous de 760 px : `inset: 0`, pleine hauteur, sans arrondi, **`overflow-y` déplacé
du backdrop vers la modale** avec `overscroll-behavior: contain`, et
`padding-bottom: env(safe-area-inset-bottom)` pour que les actions passent au-dessus de la
barre d'accueil. Le `margin: -24px -26px` de `.mdt-fiche-head` — qui fait déborder la
bannière jusqu'aux bords — passe par une variable CSS afin de suivre le padding mobile au
lieu de le décaler.

La fiche ne se ferme aujourd'hui que par le backdrop ou par un bouton « Fermer » situé
tout en bas (`panel-mediatheque.jsx:268`). En plein écran il n'y a plus de backdrop, et
sur une franchise à douze saisons ce bouton est hors d'atteinte : **ajout d'un bouton `✕`
collant dans l'en-tête de la feuille**.

### Mise en page

Calculs faits sur 390 px de large, soit 358 px utiles après padding.

Passent sans modification : **« Ce soir »** (`auto-fit` / `minmax(270px, 1fr)` → une
colonne), le **rail** (cartes fixes à 240 px, défilement horizontal avec accroche), les
**résultats de recherche** (`minmax(300px, 1fr)` → une colonne) et l'**agenda** (déjà
traité par son bloc 720 px).

À ajuster : hero de 280 → ~200 px de haut ; `.mdt-search` en pleine largeur
(`flex: 1 1 100%`) ; `.mdt-entry` replié en deux lignes une fois le stepper à 44 px
(`flex-wrap: wrap`, `.mdt-entry-info { flex: 1 1 100% }`) ; `.mdt-fiche-actions` en
boutons pleine largeur empilés.

**Arbitrage à valider sur l'appareil** : `.mdt-grid` est en `minmax(140px, 1fr)`, soit
**deux colonnes** sur iPhone — 24 lignes de défilement pour 47 franchises. En
`minmax(104px, 1fr)` on obtient trois colonnes de 108 px, mais des titres plus serrés. La
spec part sur trois ; c'est le seul point où l'écran réel doit trancher.

### Portée des modifications JSX

Deux, et deux seulement : le bouton `✕` de la feuille, et `inputMode="numeric"` sur les
deux champs numériques. Tout le reste est du CSS.

## Risques et replis

**OAuth Google en `standalone` — le seul risque bloquant.** Une PWA installée qui navigue
vers `accounts.google.com` peut sortir vers Safari et perdre son contexte au retour. Le
comportement s'est amélioré depuis iOS 16.4 mais reste le point de rupture possible de
toute la spec.

*À tester en premier, avant toute ligne de CSS* : une `mediatheque.html` réduite à
`waitForAuth()` suivi de l'affichage de « connecté », installée sur l'écran d'accueil.
Replis dans l'ordre si l'authentification échoue : `display: "minimal-ui"` (même stockage,
conserve une barre d'URL minimale) puis flow PKCE côté Supabase.

**Données figées à la reprise.** iOS suspend une PWA plutôt que de la fermer. Rouverte le
lendemain soir, elle reprend l'état de la veille, et `loadPanel` étant mémoïsé par
`once()`, rien ne se recharge. Le problème n'existe pas sur desktop parce que la page y est
rechargée. Correctif : écouteur `visibilitychange` qui invalide la mémoïsation et refetch
au-delà de quelques minutes d'absence. C'est spécifique au mobile — `bootstrap.js` n'en a
pas besoin.

**Stockage cloisonné.** La PWA installée dispose de son propre bac à sable, distinct de
Safari : la première ouverture impose un nouveau login Google. L'ITP de Safari peut par
ailleurs purger le stockage après une longue période d'inactivité. Pénible, non bloquant,
documenté ici pour ne pas être diagnostiqué comme un bug.

## Vérification

Le front se vérifie en production (push sur `main` → Pages → iPhone), soit 2 à 3 minutes
par itération. Deux garde-fous évitent d'en gaspiller sur des erreurs triviales.

**`tests/test_mediatheque_entry.mjs`** — extrait par analyse statique toutes les globales
`window.X` que lit `panel-mediatheque.jsx`, puis vérifie que `mediatheque.html` charge un
script qui fournit chacune. C'est exactement le test qui aurait attrapé la dépendance à
`PROFILE_DATA`, découverte tardivement pendant la conception.

**Assertion dans `scripts/sync-sw.mjs`** — chaque chemin de `STATIC[]` doit exister sur le
disque et porter le bon préfixe. Le bug documenté plus haut ne pourrait pas revenir.

**Ces deux garde-fous n'ont d'intérêt que s'ils tournent.** Aucun des 23 workflows actuels
ne lance de test : `tests/test_mediatheque_view.mjs` et `tests/test_jp_vocab.py` sont
manuels, et `sw-sync.yml` est le seul à exécuter node. On ajoute donc un workflow `tests`
qui lance les tests node du dépôt — sans quoi le test d'entrée ne protégera rien le jour
où il compte.

Garde-fous CI existants à respecter (règles cardinales du `CLAUDE.md`) : `lint-specs`
(bloquant — MAJ de `docs/specs/tab-mediatheque.md` et bump de `last_updated` dans
`docs/specs/index.json`), `validate-arch` (bloquant — nouvelle entrée dans
`docs/architecture/`, `flows/perso-mediatheque.yaml` et un ADR pour la seconde page
d'entrée), `sw-sync.yml`. Le linter qui bloque réellement sur `docs/specs/**` est
`scripts/lint_specs_produit.py` (exécuté par `.github/workflows/lint-specs.yml`) —
`scripts/validate_spec.py` valide `jarvis/spec.json` en dur et ne lit jamais
`sys.argv`, donc l'invoquer avec `docs/specs/tab-mediatheque.md` en argument
validerait silencieusement un autre fichier que celui visé.

## Télémétrie — la sonde de survie

`docs/telemetry.md` documente déjà dix events `mediatheque_*`, tous à payload JSONB ouvert.
Plutôt qu'un nouvel `event_type`, on ajoute un champ **`surface: "pwa" | "cockpit"`** au
payload des events existants (`mediatheque_progress`, `mediatheque_add`,
`mediatheque_hero_action`, `mediatheque_search`…). Aucune migration.

Au bout de trois semaines, le décompte des `mediatheque_progress` portant
`surface = "pwa"` répond à la seule question qui décide de la suite : **l'application
est-elle réellement ouverte depuis le canapé ?** Un volume nul est une réponse, pas un
retard à rattraper — c'est la leçon d'atlas, mort d'un arriéré plutôt que d'un manque de
fonctionnalités, et la même logique que la sonde `jp_word_marked` de la bande « Avant
l'épisode ».

Ce que la sonde autorise ensuite, dans l'ordre de préférence si le volume est là :
notifications Web Push (supportées par iOS 16.4+ pour les PWA installées, sans
application native), puis fonctionnement hors ligne.

## Ordre de travail

| | Étape | Pourquoi à cette place |
|---|---|---|
| 0 | Sonde OAuth en `standalone` | bloquant — tout le reste en dépend |
| 1 | Correctif de préfixe `sw.js` / `sync-sw.mjs` + assertion | bug existant, et prérequis du démarrage rapide |
| 2 | `mediatheque.html` + manifest + `boot-mediatheque.js` + test d'entrée | l'application existe, laide mais lançable |
| 3 | Passe mobile `styles-mediatheque.css` + les deux retouches JSX | le gros du travail |
| 4 | `surface` dans la télémétrie, specs, architecture, ADR | règles cardinales du `CLAUDE.md` |
