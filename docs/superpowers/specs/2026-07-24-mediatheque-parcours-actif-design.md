# Médiathèque — parcours de la bibliothèque qui a grossi (spec de design)

> La grille unique de 44 affiches mélange deux usages sans rapport : **piloter 8 séries
> actives** et **retrouver quelque chose dans 36 séries finies**. On la remplace par une
> pile de rayons : rail « Continuer à regarder », semainier des diffusions, et collection
> repliée. Aucun changement de modèle de données, aucune migration SQL.

**Date** : 2026-07-24
**Fichiers principaux** : `cockpit/panel-mediatheque.jsx`, `cockpit/styles-mediatheque.css`
**Statut** : validé (brainstorming), prêt pour plan d'implémentation.

---

## 1. Contexte & intention

Demande : *« trouve un moyen visuel de rendre plus pratique le parcours des anime
vu / en cours / suivis, parce qu'il commence à y en avoir beaucoup »*.

**Réalité de la donnée** (relevée en base le 2026-07-24) :

| Mesure | Valeur |
|---|---|
| Franchises | **44** (210 entrées, 161 lignes de progression) |
| « Vu » | **36** |
| « En cours » (épisodes sortis non vus) | **4** |
| « En cours · à jour » (rattrapé, en attente) | **4** |
| « À voir » / « Mis de côté » | **0** / **0** |
| Entrées `RELEASING` | 6 (dont 1 sans date de prochain épisode) |
| Notes saisies | 2 / 161 |

Deux conclusions structurent tout le reste :

1. **La bibliothèque est une archive avec une petite tête active.** 36/44 sont des
   séries finies ; 8 seulement demandent une action. Dans une grille à plat triée par
   activité, ces 8 sont noyées.
2. **Le tri « dernière activité » ne discrimine rien aujourd'hui** : les 161 lignes de
   progression ont toutes un `updated_at` de la même semaine (remplissage initial). Ce
   n'est pas un bug d'interface et on ne le contourne pas — l'ordre redeviendra
   significatif au fil des visionnages réels.

Arbitrage utilisateur retenu : **on ouvre l'onglet pour piloter l'actif**, pas pour
contempler la collection. L'actif prend le haut de l'écran, l'archive se range derrière.

## 2. Ce que cette spec révise

La spec du 2026-07-22 (redesign « Apple TV+ ») posait en non-goal : *« pas d'étagères
horizontales par statut — bibliothèque trop petite »*. Elle avait raison **avec
5 franchises**. Il y en a 44 deux jours plus tard : la prémisse a sauté, le non-goal
tombe. Tout le reste de cette spec (hero, scrims adaptatifs aux 3 thèmes, cartes
affiche, fiche modale, statuts dérivés) est **conservé tel quel**.

## 3. Structure de l'écran

```
Kicker + titre « Médiathèque »
<MdtReleasesStrip>            événements non acquittés — le calendrier texte en sort
<MdtHero>                     inchangé (§4.D)
Toolbar                       recherche unique (le tri descend dans la collection, §4.C)
<MdtRail>    « Continuer à regarder · N »     ← nouveau
<MdtWeek>    « Cette semaine »                ← nouveau, remplace .mdt-calendar
<MdtCollection> « Ma collection · 44 »        ← nouveau, replié par défaut
```

Principe : **le haut est un jeu de raccourcis, le bas est la bibliothèque complète.**
La collection contient les 44 franchises (actives incluses) avec ses chips et son tri —
aucune franchise n'est joignable uniquement par un rayon. « À voir » et « Mis de côté »,
vides aujourd'hui, gardent ainsi leur place sans section fantôme en haut d'écran.

## 4. Le design, bloc par bloc

### A · Rail « Continuer à regarder »

**Contenu** : les franchises non `shelved` de statut `watching` (il reste des épisodes
**sortis** non vus), **moins celle mise en avant par le hero**. Triées par `lastTouch`
décroissant, comme le hero.

`pickHero()` privilégie déjà `watching` en règle 1 : dès qu'une franchise est en cours,
le hero en prend une, et le rail affiche les autres. Une seule franchise en cours →
rail vide → **section masquée**. Aucune franchise en cours → hero en mode « prochain
épisode », rail masqué également.

**Carte** (format bannière, ~168 px de large) :
- image `banner_url`, repli `cover_url` ;
- titre `title_english || title_romaji` sur une ligne (ellipse) ;
- ligne méta **portée par la saison courante** (`currentEntryOf`) :
  `S2 · ép. 16 sur 24`. Le numéro affiché est **le prochain à voir** (`watched + 1`),
  le dénominateur est `episodes_total` s'il est connu, sinon les épisodes sortis.
  Cas film : `Film · non vu`.
- barre de progression **de la saison courante** (pas de la franchise) ;
- bouton **`+1 épisode`** toujours visible (pas de survol requis) →
  `writeProgress(cur, min(mdtReleased(cur), watched + 1))`, optimiste, comme ailleurs ;
- clic sur le corps de la carte → ouvre la fiche modale.

**Débordement** : `overflow-x: auto` + `scroll-snap-type: x proximity`, barre de défilement
discrète, pas de flèches. Les cartes restent des éléments focusables ; le défilement au
clavier est celui du navigateur (focus visible obligatoire).

### B · Semainier « Cette semaine »

Remplace le calendrier texte de `MdtReleasesStrip` (`.mdt-calendar`), qui était une liste
plate de 8 lignes sans notion de « quand ».

**Grille de 7 colonnes glissantes** : aujourd'hui → J+6 (pas lundi→dimanche), colonne du
jour surlignée (bordure `--brand`, fond teinté).

**Remplissage** : entrées `airing_status === "RELEASING"` avec `next_episode_airing_at`
dans la fenêtre, franchises `shelved` exclues, réparties par **date locale**. Une pastille
par diffusion : titre court (ellipse), `ép. N`, heure locale `HH:MM`. Plusieurs pastilles
par jour possibles, ordonnées par heure. Clic → ouvre la fiche de la franchise.

**Ligne « plus tard »**, sous la grille, une seule ligne à défilement horizontal :
- diffusions `RELEASING` datées au-delà de J+6 ;
- premières annoncées (`NOT_YET_RELEASED` avec `start_date` future) **plafonnées à J+90** —
  au-delà c'est de l'annonce, pas du calendrier. Cas réel : *Frieren* S3 est annoncée pour
  le 2027-10-01 ; elle reste dans la fiche franchise, pas dans le semainier. Le code
  actuel n'a pas de plafond et ferait remonter cette date à 3 ans ;
- **entrées `in_main_chain` en diffusion sans date connue** → mention « date inconnue »,
  sinon une saison qui diffuse disparaîtrait de l'écran. Restreint à la chaîne principale
  volontairement : le bonus `kind: "other"` sans titre ni date de *Frieren*, lui aussi
  `RELEASING`, resterait du bruit permanent.

Tri par date croissante, les sans-date en dernier ; plafond de 6 items puis « … ».

**Section entièrement masquée** si la semaine ET la ligne « plus tard » sont vides
(même contrat que `MdtReleasesStrip` aujourd'hui).

Le bandeau `MdtReleasesStrip` conserve sa moitié « événements non acquittés » (🆕 + ✓) et
perd sa moitié calendrier.

### C · Collection repliée & recherche unique

**Repli.** En-tête `Ma collection · N` + chevron, où **N est le nombre de cartes
effectivement affichées** compte tenu du chip actif (44 sur « Tous », 36 sur « Vu »…).
Fermée au premier passage, état mémorisé dans `localStorage` sous `mdt-collection-open`
(`"1"`/`"0"`, lecture et écriture en `try/catch`, comme `cockpit-theme` dans `app.jsx`).

**Densité.** Grille `repeat(auto-fill, minmax(140px, 1fr))` au lieu de 200 px : 36 affiches
tiennent en ~3 rangées au lieu de 6. Les chips de statut (Tous / À voir / En cours / Vu /
Mis de côté) et le `select` de tri **descendent dans l'en-tête de section** — ils ne
concernent qu'elle.

**Cartes compactes.** Dans la collection, `<MdtCard>` perd son panneau d'actions au survol
(nouvelle prop `compact`) : affiche + badge de statut + barre + titre, et le survol garde
uniquement le soulèvement. Justification : 36/44 sont « Vu », le stepper y est mort-né, et
c'est lui qui imposait le minimum de 200 px. Les actions rapides vivent désormais dans le
rail §4.A, où elles sont utiles.

**Une seule recherche, pas deux.** Ajouter un champ « filtrer ma bibliothèque » à côté du
champ AniList existant créerait deux loupes sur le même écran. À la place, le champ actuel
devient **bibliothèque d'abord** :

- dès **1 caractère**, filtrage local instantané sur `title_english`, `title_romaji`,
  `title_native`, insensible à la casse et aux accents — normalisation
  `s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()` (plage des
  diacritiques combinants, échappée : Babel standalone n'a pas de garantie sur les
  classes Unicode `\p{…}`) ;
- la recherche locale porte sur **les 44 franchises, `shelved` comprises** — chercher doit
  retrouver ce qu'on a rangé ;
- la bascule segmentée existante (`.mdt-viewtoggle`) devient
  **`Ma bibliothèque · N` | `AniList · M`** ;
- **vue par défaut à chaque changement de requête** : `Ma bibliothèque` s'il y a au moins
  une correspondance locale, `AniList` sinon (aujourd'hui : toujours AniList). Un clic sur
  la bascule fixe le choix jusqu'au prochain changement de requête ;
- l'appel AniList reste inchangé : ≥ 3 caractères, debounce 400 ms ;
- en vue `Ma bibliothèque` avec une requête active : hero, rail et semainier sont masqués,
  la collection est **dépliée d'office** et n'affiche que les correspondances ; les chips
  de statut sont **masquées** (la recherche prime, et les faire cohabiter donnerait des
  résultats vides incompréhensibles). Le tri, lui, reste disponible.

### D · Hero — une seule ligne de changement

Le hero reste **strictement inchangé** (image, scrims, table de priorité `pickHero`, CTA,
`+1`). Seule évolution : la franchise qu'il met en avant est **exclue du rail** §4.A, pour
qu'un même titre n'apparaisse pas deux fois à 200 px d'écart.

Options écartées et pourquoi : réduire le hero en bandeau (~150 px gagnés, mais on perd
l'affiche de cinéma qui fait l'identité de l'onglet) ; le supprimer au profit d'une carte
vedette dans le rail (le plus compact, mais jette un travail de trois commits fait la
semaine précédente). La collection démarre juste sous la ligne de flottaison en 1080p —
acceptable puisque l'onglet s'ouvre pour l'actif.

## 5. État & re-render

Aucun nouvel état de données, aucun nouveau fetch. Le modèle actuel tient : mutations
optimistes de `window.MEDIATHEQUE_DATA` + `setTick` pour recalculer les `useMemo`.

Nouveaux dérivés, tous purs et mémoïsés :

| Dérivé | Entrée | Sortie |
|---|---|---|
| `railCards` | `cards`, `hero` | franchises `watching` hors hero, triées par `lastTouch` |
| `weekBuckets` | `D.entries`, `franchiseById`, `tick` | 7 seaux datés + liste « plus tard » |
| `localMatches` | `cards`, `query` | franchises dont un titre normalisé contient la requête |

Nouveaux états d'interface : `collectionOpen` (bool, persisté), et le `view` existant dont
seule la valeur par défaut change.

## 6. Télémétrie

Trois nouveaux `event_type`, à inscrire dans `docs/telemetry.md` **avant** le commit
(règle cardinale) :

| Event | Déclencheur | Payload |
|---|---|---|
| `mediatheque_week_click` | clic sur une pastille du semainier | `{ days_ahead, entry_kind }` |
| `mediatheque_collection_toggle` | pli/dépli manuel de la collection | `{ open, count }` |
| `mediatheque_filter_local` | requête locale stabilisée (debounce 400 ms) | `{ q_len, matches }` |

Réutilisés sans changement : `mediatheque_progress` (le `+1` du rail y passe),
`mediatheque_hero_action`, `mediatheque_search` (AniList), `mediatheque_release_ack`.
L'ouverture d'une fiche depuis le rail n'est pas instrumentée, cohérent avec l'ouverture
depuis la grille aujourd'hui.

## 7. Portée / fichiers touchés

- `cockpit/panel-mediatheque.jsx` — `<MdtRail>`, `<MdtWeek>`, `<MdtCollection>` ;
  `<MdtCard compact>` ; `mdtNextEpLabel()` ; filtrage local + nouvelle règle de vue par
  défaut ; retrait du calendrier de `MdtReleasesStrip`.
- `cockpit/styles-mediatheque.css` — rail + cartes bannière, grille semainier, en-tête de
  section repliable, grille collection dense. Tokens `--bg`/`--tx`/`--brand` uniquement,
  aucune couleur en dur hors scrims `rgba(0,0,0,α)` (contrainte 3 thèmes, spec 2026-07-22 §2).
- `docs/telemetry.md` — 3 events (§6).
- `docs/specs/tab-mediatheque.md` + bump `last_updated` dans `docs/specs/index.json`.
- `docs/architecture/flows/perso-mediatheque.yaml` — `panels[].detail` du panel
  `mediatheque` mentionne encore « bandeau Sorties + calendrier, grille bibliothèque ».
- `node scripts/sync-sw.mjs` après modif `cockpit/**`.
- **Pas de migration SQL, pas de changement de pipeline** — tout est dérivé de
  `media_entries` / `media_progress` déjà en base.

## 8. Non-goals

- Pas de modification des statuts dérivés (`mdtStatus`, `mdtReleased`) ni de
  `anime_tracker_sync`.
- Pas de tri de substitution pour compenser les `updated_at` identiques (§1.2).
- Pas de rayons supplémentaires (« par genre », « les mieux notés ») : 2 notes sur 161,
  la donnée n'existe pas encore.
- Pas de vue liste/tableau alternative à la grille.
- Pas de refonte de la fiche modale ni du flux de recherche/ajout AniList.
- Pas de bascule de densité manuelle : une seule densité, choisie.

## 9. Critères de réussite

- À l'ouverture de l'onglet, **les 8 séries actives sont toutes citées sans filtrer ni
  déplier** : 1 dans le hero, 3 dans le rail, 3 dans le semainier (Slime aujourd'hui,
  Mushoku et Grand Blue ce week-end) et Re:ZERO en « plus tard » (12/08). Les 36 vues
  n'occupent aucun pixel tant qu'on ne déplie pas la collection.
- Le semainier montre les 4 diffusions de la semaine à la bonne date (Slime ven. 16h,
  100 Girlfriends et Mushoku dim., Grand Blue lun.), colonne du jour surlignée, et
  n'affiche **pas** la saison 3 de *Frieren* annoncée pour 2027.
- Taper le début d'un titre déjà possédé affiche **sa** carte, pas des résultats AniList.
- `+1` depuis le rail écrit la progression sans ouvrir la modale.
- Aucune régression : hero, fiche, notes, mise de côté, ajout, sorties, encart Brief.
- Rendu correct dans les **3 thèmes**, vérifié en prod (GitHub Pages, hard-refresh).
- `lint-specs` et `validate-arch` verts, service worker resynchronisé.

## 10. Limitations connues

- L'ordre du rail et le hero restent tributaires de `lastTouch`, aujourd'hui non
  discriminant (§1.2). À revoir si le problème persiste après quelques semaines d'usage réel.
- Le semainier dépend de `next_episode_airing_at` fourni par AniList : une série en
  diffusion sans date reste reléguée en « plus tard ».
- La collection reste une grille unique de 44 affiches une fois dépliée ; au-delà de
  ~100 titres il faudra une pagination ou un regroupement (hors périmètre).
