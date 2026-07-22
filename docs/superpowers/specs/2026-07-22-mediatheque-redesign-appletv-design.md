# Médiathèque — redesign « Apple TV+ » (spec de design)

> Refonte visuelle de l'onglet Médiathèque. La grille filtrée à plat actuelle
> devient une expérience cinématique inspirée d'Apple TV+ : **hero billboard +
> grille de posters généreuse + actions rapides au survol**. Aucun changement de
> modèle de données, aucune migration SQL.

**Date** : 2026-07-22
**Fichiers principaux** : `cockpit/panel-mediatheque.jsx`, `cockpit/styles-mediatheque.css`
**Statut** : validé (brainstorming), prêt pour plan d'implémentation.

---

## 1. Contexte & intention

Le panel actuel (`PanelMediatheque`) est une grille de cartes filtrée par chips
de statut + tri. Fonctionnel mais plat, sans hiérarchie ni relief. L'utilisateur
veut « un meilleur design, inspiré Apple TV / Netflix, en reprenant le meilleur ».

**Réalité de la donnée** (relevé en base le 2026-07-22) : bibliothèque **petite et
personnelle** — 5 franchises, 27 entrées (21 canon), 17 entamées, 3 en diffusion,
0 mise de côté. **Toutes** ont `banner_url` (16:9) ET `cover_url` (2:3).

Conséquence directe sur le parti-pris : **Apple TV+, pas Netflix**. Netflix
impressionne en empilant des dizaines d'étagères denses ; avec 5 titres ces
rangées seraient vides. Apple TV+ mise sur une **grande affiche hero + de l'air +
peu d'éléments soignés** — la bonne maille pour une bibliothèque perso. On garde
donc **une seule grille** (pas d'étagères horizontales) sous le hero.

## 2. Contrainte structurante : les 3 thèmes

Le cockpit est piloté par 3 thèmes via tokens CSS (`--bg`, `--tx`, `--brand`…) :
Dawn (clair éditorial), Obsidian (sombre), Atlas (clair swiss). Netflix/Apple TV
sont par nature **sombres** ; on ne peut pas hardcoder du noir.

**Parti-pris retenu : adaptatif.** Le chrome (fond page, textes, chips) suit le
thème actif. Le cinématique vient **des images** (bannières, affiches) et de
**voiles dégradés sombres posés SUR les images** — un scrim dark-over-image reste
lisible et cohérent quel que soit le thème du fond. Règles :
- Scrims (hero, en-tête modale) = dégradés sombres **sur l'image uniquement**,
  jamais sur le fond de page. Le bas du hero fond vers `var(--bg)` pour se
  raccorder à la grille.
- Glows / accents / barres de progression = `var(--brand)`.
- Aucune couleur en dur hors des scrims noirs translucides (`rgba(0,0,0,α)`).

## 3. Données disponibles (rappel, inchangées)

`window.MEDIATHEQUE_DATA` = `{ franchises, entries, progress, releases }` (T2).
- `franchises` : `cover_url`, `banner_url`, titres, `genres`, `synopsis`, `shelved`, `added_at`.
- `entries` : `in_main_chain`, `kind` (season/movie/ova), `season_number`, `sort_order`,
  `airing_status`, `episodes_total`, `next_episode_number`, `next_episode_airing_at`.
- `progress` : `entry_id`, `episodes_watched`, `rating`, `updated_at`.
- `releases` : événements non acquittés + calendrier.

Helpers existants **réutilisés tels quels** : `mdtReleased(e)`, `mdtStatus(chain, progressById)`,
`writeProgress`, `writeRating`, `toggleShelved`, `ackRelease`, `openPreview`, `addFranchise`.

## 4. Le design, bloc par bloc

### A · Hero cinématique (billboard)

Bandeau pleine largeur (pas de `max-width`, cf. CLAUDE.md), hauteur
`clamp(280px, 34vw, 440px)`. Fond = `banner_url` de la franchise mise en avant
(`background-size: cover; position: center`). Voile : dégradé sombre
bottom→top **+** left→right posé sur l'image, plus un fondu final vers `var(--bg)`
sur les ~15% du bas.

Contenu ancré en bas-gauche :
- **kicker** de statut (mono, uppercase) : `REPRENDRE` / `PROCHAIN ÉPISODE` /
  `À DÉCOUVRIR` / `DÉJÀ VU` selon le cas ;
- **titre** (police display, gros) = `title_english || title_romaji` ;
- **méta** une ligne : saison courante + progression + prochaine diffusion, ex.
  `S2 · ép. 12/28 · nouvel ép. jeu. 25 juil.` ;
- **barre de progression** fine (si en cours) ;
- **actions** : bouton primaire contextuel + `+1 épisode` inline quand pertinent.

**Sélection du titre mis en avant** (déterministe, première règle qui matche ;
franchises `shelved` exclues) :

| Priorité | Condition | Kicker | CTA primaire | `+1` ? |
|---|---|---|---|---|
| 1 | franchise « En cours » (watched < released), la plus récemment touchée | REPRENDRE | ▶ Reprendre | oui |
| 2 | « à jour » RELEASING avec prochain épisode daté, le plus proche | PROCHAIN ÉPISODE | Voir la fiche | non |
| 3 | « À voir » (rien entamé), la plus récemment ajoutée | À DÉCOUVRIR | ▶ Commencer | non |
| 4 | « Vu », la plus récemment touchée | DÉJÀ VU | Revoir la fiche | non |

- CTA primaire → ouvre la **fiche modale** de la franchise.
- `+1 épisode` → incrémente la **saison courante** inline (cf. §4C, `currentEntry`),
  sans ouvrir la modale.
- Bibliothèque **vide** → hero d'accueil : titre « Ta médiathèque » + sous-titre
  « Cherche un anime pour commencer », pas d'image, fond `var(--bg2)`, focus sur la recherche.

### B · Barre discrète (sous le hero)

Une seule ligne, volontairement sobre pour ne pas concurrencer le hero :
- **recherche** AniList (existante) restylée, alignée à droite, avec icône ;
- **chips de filtre** (Tous / À voir / En cours / Vu / Mis de côté) en style
  discret (contour léger, actif = pastille pleine `--tx`) ;
- **tri** (`select`) discret.

Comportement recherche/bascule vue **inchangé** : dès qu'une recherche est active,
hero + grille laissent place aux résultats, avec la bascule segmentée
« Ma bibliothèque | Résultats (N) » existante.

### C · Grille de posters (le cœur)

Grille généreuse : `repeat(auto-fill, minmax(200px, 1fr))`, gap ~24px (vs 170/18
aujourd'hui). Chaque carte = **affiche pure** (2:3, `cover_url`), coins arrondis :
- **badge de statut** en coin haut-gauche (pastille discrète sur l'affiche) ;
- **barre de progression permanente** collée au bas de l'affiche (signature
  « continue watching ») — visible seulement si la saison courante est entamée ;
- **titre + statut** minimal **sous** l'affiche (style Apple TV+).

**`currentEntry`** (saison courante d'une franchise) = première entrée `in_main_chain`
(triée par `sort_order`) telle que `episodes_watched < mdtReleased(entry)`. S'il n'y
en a pas : franchise rattrapée (« à jour » si une saison RELEASING, sinon « Vu »).
Le compteur, la barre et les actions rapides de la carte portent sur `currentEntry`.

**Au survol (interaction riche)** — gagne le clic-modale obligatoire actuel :
- l'affiche se soulève (`translateY(-6px) scale(1.03)`) avec ombre/glow `--brand` ;
- un **panneau d'actions** monte du bas de l'affiche : compteur `−  {watched}  +`
  (label court `S{n} 12/28`) et bouton `✓ vu` (marque la saison courante complète) ;
- ces contrôles appellent `writeProgress(currentEntry, …)` **sans ouvrir la modale**
  (optimiste, comme le stepper existant) ;
- **clic sur le corps de l'affiche** (hors contrôles) → ouvre la fiche modale.

Cas limites carte : franchise entièrement **Vue** → pas de `+/−`, panneau réduit à
« Revoir » (ouvre la fiche). Franchise **à jour** RELEASING (rattrapée, saison en
cours) → `+` désactivé jusqu'au prochain épisode. Franchise **À voir** → pas de barre
(rien d'entamé), `+` part de 0.

**Accessibilité / tactile** : le panneau d'actions se révèle au `:hover` **et** au
`:focus-within` (navigation clavier). Sur pointeur grossier (`@media (hover: none)`),
les contrôles sont **affichés en permanence** (pas de survol sur tactile). Les
boutons `+/−/✓` gardent leurs `aria-label`. Chaque carte reste un élément focusable.

### D · Fiche modale

Fonctionnellement **identique** (steppers, notes, saisons/bonus, ajout/retrait/
mise de côté conservés). Seule évolution visuelle : l'en-tête `.mdt-fiche-head`
(affiche-à-gauche plate) devient un **en-tête bannière** — `banner_url` en fond
avec voile sombre, titre + méta en surimpression — pour s'accorder au hero et aux
cartes. Fallback sur `cover_url` (flouté) si `banner_url` absent. Le corps
(saisons canon, bonus, actions) reste tel quel.

### E · Sorties / à l'antenne

Logique `MdtReleasesStrip` **conservée** (événements non acquittés + calendrier des
prochaines diffusions, ne s'affiche que s'il y a du contenu). Restyle léger en
bandeau slim pour s'accorder, placé sous la barre discrète (§B). Aujourd'hui vide
(0 non-acquitté) — ne s'affichera qu'à la prochaine détection.

## 5. État & re-render

Aucun nouvel état de données. Le modèle actuel est conservé : mutations optimistes
de `window.MEDIATHEQUE_DATA` + `setTick` pour forcer le recalcul des `useMemo`
(`cards`, `visible`, `progressById`, `ratingById`). Le hero est dérivé de `cards`
via une nouvelle fonction pure `pickHero(cards)` (mémoïsée, dépend de `cards`).

## 6. Télémétrie

- **Réutilisé** : `mediatheque_progress` (déjà émis par `writeProgress`) couvre les
  `+1/✓` du hero **et** des cartes — rien à ajouter côté progression.
- **Nouveau** : `mediatheque_hero_action` — émis au clic du **CTA primaire** du hero
  (ouverture de fiche), payload `{ action: "resume"|"start"|"open", status }`.
  Le `+1 épisode` du hero, lui, passe par `writeProgress` → `mediatheque_progress`.
  → l'event `mediatheque_hero_action` **doit** être ajouté à `docs/telemetry.md`
  **avant** le commit (règle cardinale).

## 7. Portée / fichiers touchés

- `cockpit/panel-mediatheque.jsx` — restructure du `return`, nouveau `<MdtHero>`,
  `pickHero()`, `currentEntryOf()`, actions rapides sur `<MdtCard>` (extrait de la
  grille inline actuelle), en-tête bannière dans `FicheFranchise`.
- `cockpit/styles-mediatheque.css` — hero, grille agrandie, cartes + panneau survol,
  en-tête bannière modale, restyle chips/recherche/bandeau sorties.
- `docs/telemetry.md` — event `mediatheque_hero_action` (règle cardinale).
- `docs/specs/tab-mediatheque.md` + bump `last_updated` dans `docs/specs/index.json`
  (règle cardinale : modif fonctionnelle d'un onglet).
- `node scripts/sync-sw.mjs` après modif `cockpit/**` (règle cardinale service worker).
- **Pas de migration SQL** (`banner_url` déjà en base et alimenté).
- Flux recherche/preview/ajout **intact** ; restyle léger optionnel des cartes résultats.

## 8. Non-goals (hors périmètre)

- Pas d'étagères horizontales par statut (bibliothèque trop petite — cf. §1).
- Pas de changement du modèle de statuts dérivés ni du pipeline `anime_tracker_sync`.
- Pas de lecture vidéo / bande-annonce (c'est un tracker, pas un lecteur).
- Pas de note/score au niveau franchise (reste par saison, inchangé).
- Pas de refonte du flux de recherche AniList (seul un restyle léger est permis).

## 9. Critères de réussite

- Rendu cohérent et lisible dans les **3 thèmes** (vérifié en prod avec vraies affiches).
- Cocher un épisode depuis la grille **sans ouvrir la modale** fonctionne (survol + clavier + tactile).
- Hero met en avant le bon titre selon la table de priorité §4A.
- Aucune régression : recherche, ajout, fiche, notes, mise de côté, sorties intacts.
- `lint-specs` et `validate-arch` verts ; service worker resynchronisé.
