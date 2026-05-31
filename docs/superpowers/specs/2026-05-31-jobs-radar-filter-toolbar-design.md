# Jobs Radar — barre de filtres collante + fraîcheur + persistance

> Design validé le 2026-05-31. Les filtres vivent aujourd'hui dans l'en-tête de la liste dense (`.jr-section-head--list`, sous le hero) sans `position: sticky` : ils défilent et deviennent inatteignables dès qu'on descend. On les remonte dans un **toolbar collant** (modèle `.panel-toolbar` existant) placé **au-dessus du hero**, replié par défaut (puces des filtres actifs + compteurs + bouton « Filtres »). On ajoute un filtre **Fraîcheur** (`Tout · <24h · <7j`) branché sur le prédicat partagé `passesFilters` (donc hero + liste), et la **persistance** des filtres en `localStorage`. S'appuie sur le design précédent [2026-05-31-jobs-radar-hero-filters-design.md](2026-05-31-jobs-radar-hero-filters-design.md) (prédicat `passesFilters` déjà partagé).

## Problème

Dans `cockpit/panel-jobs-radar.jsx`, le bloc `.jr-filters` (lignes ~1014-1071) est rendu dans `.jr-section-head--list` (lignes ~1006-1013), c.-à-d. **sous le hero**, sans positionnement collant (`styles-jobs-radar.css`, `.jr-section-head--list` et `.jr-filters` n'ont ni `sticky` ni `overflow`). Conséquences :

1. Dès qu'on scrolle dans la liste, la barre de filtres disparaît en haut → pour changer un filtre il faut remonter toute la page.
2. Aucun filtre par **date de publication** : on ne peut pas isoler « les offres de moins de 24h / moins d'une semaine » alors que `posted_days_ago` est déjà calculé (`data-loader.js`, `transformJobRow`, depuis `posted_date || first_seen_date`).
3. Les filtres (`useStateJr`, alias de `React.useState`, ligne 12) se **réinitialisent à chaque ré-ouverture** de l'onglet (Tier 2 remonté → état React neuf).

## Décision

### 1. Toolbar collant `<JrFilterBar>`
Extraire `.jr-filters` dans un nouveau composant présentation **`JrFilterBar`** (même fichier, exposé localement), rendu **avant** le hero (entre `<JrCalibrage />` ligne ~983 et le hero ligne ~986). CSS sur le modèle `.panel-toolbar` (`styles.css:2069`) : `position: sticky; top: 0; z-index: 30; backdrop-filter: blur(12px)`. Comme c'est la **fenêtre** qui scrolle (`.app` grid `min-height:100vh`, `.main { overflow:hidden }`, sidebar `sticky` à part), `top:0` colle le toolbar en haut du viewport partout dans la page.

Deux états :
- **Replié (défaut)** : `🔥 {hotLeadsCount} hot` (compteur global) · puces des filtres actifs · `{filteredCount} offres` · bouton « Filtres ⌄ ».
- **Déplié** (clic « Filtres ») : panneau qui descend (transition `max-height`) avec les contrôles complets — recherche, `FilterGroup` score / rôle / lieu / **fraîcheur** / statut, tri, et un lien « Tout réinitialiser ». L'état déplié/replié **n'est pas persisté** (repart replié à chaque ouverture).

Les `FilterGroup` et l'input de recherche existants sont réutilisés tels quels dans le panneau déplié.

### 2. Filtre Fraîcheur (nouveau)
Nouvel état `const [freshFilter, setFreshFilter] = useStateJr("all"); // all | 24h | 7j`. Nouveau `FilterGroup` : `{ all: "Tout" } · { "24h": "< 24h" } · { "7j": "< 7j" }`. Clause ajoutée **dans `passesFilters(o)`** (lignes ~898-918) :
```js
if (freshFilter === "24h" && !(o.posted_days_ago === 0)) return false;
if (freshFilter === "7j"  && !(o.posted_days_ago != null && o.posted_days_ago < 7)) return false;
```
Comme `passesFilters` est partagé, le filtre s'applique **automatiquement au hero ET à la liste**. Ajouter `freshFilter` aux tableaux de dépendances de `heroLeads` (ligne ~931) et `listOffers` (ligne ~946).

*Caveat assumé (documenté) :* la routine ne scanne que 4×/semaine (lun/mer/ven/dim) et les dates sont au jour près ; `posted_days_ago = daysSinceDate(posted_date || first_seen_date)`. Donc `< 24h` = « daté/repéré aujourd'hui » (`=== 0`), pas une fenêtre glissante de 24h.

### 3. Puces de filtres actifs
Dériver `activeChips` = la liste des facettes **≠ défaut** (défauts : score=`all`, rôle=`all`, lieu=`all`, statut=`active`, fraîcheur=`all`, recherche=`""`). Chaque puce affiche un libellé court (ex. `🕒 <7j`, `Rôle : EM`, `🔍 « mistral »`) + un `✕` qui **remet cette facette au défaut** via son setter. Le **tri** n'est pas une puce (il change l'ordre, pas l'appartenance) — il reste dans le panneau déplié uniquement. Aucune facette active → puce-message « Aucun filtre actif ».

### 4. Compteurs
- `🔥 {hotLeadsCount} hot` : compteur **global** existant (lignes ~921-923), inchangé par les filtres — désormais **toujours visible** dans le toolbar collant (amélioration : aujourd'hui il défile et disparaît avec le header).
- `{filteredCount} offres` : nouveau, `heroLeads.length + listOffers.length` (résultat filtré en direct, bande de score comprise).
- Le récap global du header (`{newCount} nouvelles · {hotLeadsCount} hot leads · {totalCount} au total`, lignes ~959-969) **reste** dans le `<header>` (défile, c'est un coup d'œil du matin) — non déplacé.

### 5. Persistance (localStorage)
Hydrater les états de filtres au montage depuis `localStorage["jr.filters.v1"]` (initialiseur paresseux de `useStateJr`), et les re-sérialiser via un `useEffectJr` à chaque changement. **Persisté** : `scoreFilter, catFilter, remoteFilter, statusFilter, freshFilter, sort`. **Non persisté** : `query` (recherche) — repart vide à chaque ouverture (un terme oublié qui masque silencieusement des offres est un piège). Clé versionnée (`v1`) pour migration future. `try/catch` autour de l'accès localStorage (mode privé / quota).

## Comportement attendu (exemples)

| Action | Toolbar (replié) | Hero | Liste |
|---|---|---|---|
| défaut (statut=active) | puces : aucune · `🔥 5 hot` · `N offres` | ≥ 7 actifs | < 7 actifs |
| fraîcheur = `<7j` | puce `🕒 <7j` | ≥ 7 actifs **postés < 7j** | < 7 actifs postés < 7j |
| fraîcheur = `<24h` | puce `🕒 <24h` | ≥ 7 actifs **datés du jour** | < 7 datés du jour |
| rôle = EM + fraîcheur `<7j` | 2 puces | EM ≥ 7 < 7j | EM < 7 < 7j |
| clic `✕` sur puce `🕒 <7j` | puce retirée | refiltre sans fraîcheur | idem |
| recherche « mistral » | puce `🔍 « mistral »` | match ≥ 7 | match < 7 |
| (rechargement onglet) | filtres restaurés (sauf recherche) | suit | suit |
| aucun match | `0 offres` | masqué | bloc vide existant `.jr-empty` |

## Fichiers

- `cockpit/panel-jobs-radar.jsx` : état `freshFilter` (~894), clause fraîcheur dans `passesFilters` (~898-918) + deps `heroLeads`/`listOffers` (~931/946), nouveau composant `JrFilterBar` (toolbar collant : puces + compteurs + panneau déplié), rendu avant le hero (~985), retrait de `.jr-filters` de `.jr-section-head--list`, dérivation `activeChips` + `filteredCount`, hydratation/persistance localStorage (initialiseur + `useEffectJr`).
- `cockpit/styles-jobs-radar.css` : styles `.jr-filterbar` (sticky/blur), `.jr-chip`/`.jr-chip-x`, `.jr-filterbar-panel` (transition `max-height`), bouton « Filtres », compteurs. La liste `.jr-section-head--list` perd son bloc filtres (garde titre/compteur de section).
- `docs/specs/tab-jobs.md` + `docs/specs/index.json` : changement fonctionnel (barre collante, filtre fraîcheur, persistance) + bump `last_updated` (règle cardinale specs).
- Service worker : `node scripts/sync-sw.mjs` après modif `cockpit/**` (règle cardinale SW).
- **Pas d'ADR / pas de modif `docs/architecture/`** : iso-architecture, aucune nouvelle dépendance de données (`posted_days_ago`/`posted_date`/`first_seen_date` déjà chargés), aucun pipeline/table/migration/cron touché.

## Hors périmètre

- Pas de télémétrie sur les filtres (aucun `track()` filtre aujourd'hui ; un `jobs_filter` event serait une extension séparée → entrée `docs/telemetry.md` requise le jour venu).
- Pas de changement du scoring, des cards, du scan banner, du calibrage, ni du récap header global.
- Pas de filtre multi-valeurs (rôle reste mono-sélection), pas de curseur d'âge continu (paliers fixes décidés), pas d'état partageable par URL.
- Pas de persistance de la recherche texte (décision §5).

## Vérification

Front vérifié **en prod** (push `main` → hard-refresh Pages, pas de chromium local sur Windows) :
1. Scroller au bas de la liste → le toolbar (chips + `🔥 hot`) reste collé en haut.
2. `Fraîcheur <24h` → hero + liste ne gardent que `posted_days_ago === 0` ; `<7j` → `< 7`.
3. Combiner rôle + fraîcheur → hero ET liste suivent les deux.
4. Cliquer le `✕` d'une puce → la facette revient au défaut, résultats recomptés.
5. Recharger l'onglet → filtres restaurés (recherche vide).
6. Mobile (<760px) : toolbar wrappe, déplie/replie OK, hamburger fixe ne masque pas les contrôles.
Pas de test auto sur ce module.
