# Jobs Radar — Redesign de l'UI de vote (contraste + popover multi-sélection)

> **Statut** : design validé (2026-05-21), à implémenter.
> **Portée** : **chantier A** (UI de vote). Le **chantier B** (offres obsolètes / « ne recrute plus ») est un sujet distinct, brainstormé séparément ensuite.
> **Onglet** : Jobs Radar. Spec fonctionnelle : [docs/specs/tab-jobs.md](../../specs/tab-jobs.md). Feature initiale : [2026-05-21-jobs-radar-calibrage-feedback-design.md](2026-05-21-jobs-radar-calibrage-feedback-design.md).

## 1. Problème

Le composant de vote `JrVote` (livré dans la feature calibrage) a trois défauts relevés à l'usage :

1. **Champ « préciser » illisible** — texte foncé sur fond foncé quand on tape une raison custom.
2. **« Moche » / mal aligné** — couleurs et formes ne suivent pas le langage visuel du site.
3. **Mono-raison** — on ne peut sélectionner qu'une seule raison ; l'utilisateur en veut plusieurs.

**Cause racine de (1) et (2)** : les styles `.jr-vote*` utilisent des noms de tokens CSS **inexistants** dans le thème (`--bg-elev`, `--tx-dim`, `--accent`, `--border`) → ils tombent sur des couleurs codées en dur. Le champ a `background: var(--bg-elev, #1a1a22)` (fond noir forcé) + `color: var(--tx)` (texte foncé en thème clair) = **foncé sur foncé**. Les vrais tokens du thème sont `--bg/--bg2/--bg3`, `--surface`, `--tx/--tx2/--tx3`, `--bd/--bd2`, `--brand/--brand-tint/--brand-ink`, `--positive/--positive-tint`, `--radius`, `--font-sans/--font-mono` (+ thèmes multiples via `[data-theme]`, dont un clair). L'éditeur de notes `.jr-notes-input` (qui marche) fait `background: var(--surface); color: var(--tx); border: 1px solid var(--bd2)`.

## 2. Objectif & non-objectifs

**Objectif** — un contrôle de vote lisible dans tous les thèmes et aligné sur les idiomes du site, avec sélection **multiple** de raisons.

**Non-objectifs** :
- Pas de changement du signal de fond (toujours `user_verdict` `up`/`down` + raisons + `score_at_vote`) ni de la boucle Cowork.
- **Pas de migration DB** — les raisons multiples tiennent dans la colonne `user_verdict_reason` existante (chaîne jointe).
- Pas de second score, pas de changement de télémétrie (`jobs_feedback` inchangé), pas de changement d'archi (aucune nouvelle colonne/pipeline).
- Hors scope : offres obsolètes (chantier B).

## 3. Design retenu — Option B (popover, multi-sélection)

Validé en maquette (visual companion). Deux briques :

### 3.1 Correctif tokens / contraste (cause racine)
Tout le bloc `.jr-vote*` (et au passage `.jr-calib*`, qui a le même défaut) passe des faux tokens aux **vrais tokens du thème** :

| Faux token utilisé | Vrai token cible |
|---|---|
| `--border` | `--bd` (groupes) / `--bd2` (champs, puces) |
| `--tx-dim` | `--tx2` (texte secondaire) / `--tx3` (labels, dimmest) |
| `--accent` | `--brand` (+ `--brand-tint` fond, `--brand-ink` texte sur tint) |
| `--bg-elev` | `--surface` (surfaces élevées : popover, champ) |

Le champ « préciser » est calqué sur `.jr-notes-input` : `background: var(--surface); color: var(--tx); border: 1px solid var(--bd2); border-radius: var(--radius)`. Plus aucune couleur codée en dur (sauf les tints `--positive`/`--negative` si absents du thème — voir §3.2).

### 3.2 Forme : pouces + popover de raisons multi-sélection
- **Pouces** 👍/👎 : deux boutons icône (≈34px ; ≈29px en `compact` pour les lignes denses), style `.jr-btn--icon`. Actif : 👍 = `--positive-tint`/`--positive`, 👎 = `--negative-tint`/`--negative`. *(Vérifier que `--negative`/`--negative-tint` existent dans le thème ; sinon les déclarer dans `:root` à côté de `--positive`, ou réutiliser un token rouge existant.)*
- **Popover** (style `.jr-menu-pop` : `--surface`, `--bd2`, `--shadow-md`, `--radius`) ouvert au vote (ou via un petit déclencheur après vote). Contient :
  - un en-tête mono « POURQUOI ? (plusieurs possibles) » ;
  - des **lignes à cocher multi-sélection** (case `--brand` quand cochée, icône `check`) — plusieurs raisons activables ;
  - un séparateur puis le **champ libre** « préciser (optionnel) ».
- **Affichage replié** : les raisons retenues s'affichent en **tags mono majuscule** (`--brand-tint` fond, `--brand-ink` texte, radius 3px — idiome `.jr-tag`) à côté des pouces.
- **Pas de descriptif** sous le contrôle.

**Taxonomie des raisons** :
- 👎 : `trop junior` · `run/BAU` · `secteur` · `boîte` · `lieu/remote`
- 👍 : `scope parfait` · `secteur` · `la boîte` · `coup de cœur`

Le champ libre couvre le reste (remplace l'ancien « bof »).

## 4. Données — format de la colonne `user_verdict_reason` (pas de migration)

Les raisons multiples + texte libre sont **sérialisés dans la colonne texte existante** :

```
<raison1> · <raison2> · … [ — <texte libre> ]
```

Exemple : `Run/BAU · Secteur — 90% reporting`.

- **Compose** (front) : `reasons.join(" · ") + (free ? " — " + free : "")`. Si aucune raison ni texte → `null`.
- **Parse** (front, à l'hydratation) : split sur le **premier** ` — ` → `[reasonsPart, freePart]` ; `reasons = reasonsPart ? reasonsPart.split(" · ") : []` ; `free = freePart || ""`.
- **Edge case assumé** : si le texte libre contient ` · ` c'est OK (il est après le ` — `) ; s'il contient ` — `, seul le premier sépare (le reste reste dans le texte libre). Acceptable pour un outil perso. Le séparateur ` · ` (point médian) et ` — ` (cadratin) sont peu probables dans une saisie courante.
- **Lecture par Cowork** : la synthèse (Étape 0) lit déjà `user_verdict_reason` comme texte — une chaîne jointe lui est plus naturelle que du JSON. Aucun changement de la routine requis.
- `user_verdict` (`up`/`down`) et `user_verdict_at` : inchangés. La règle « changer de pouce vide les raisons » (déjà en place) reste.

## 5. Composant — `JrVote` réécrit

État local : `selected` (Set de libellés), `free` (texte), `popoverOpen` (bool). `verdict` lu depuis `offer.user_verdict`.

- Au montage : parse `offer.user_verdict_reason` → initialise `selected` + `free`.
- Clic pouce : si déjà actif → annule (verdict/reason/at = null, vide `selected`/`free`/popover) ; sinon → `{user_verdict: v, user_verdict_reason: null, user_verdict_at: now}` (vide les raisons au switch), ouvre le popover.
- Toggle d'une case : ajoute/retire du Set `selected` → recompose → `onVote(id, {user_verdict_reason: composed})`.
- Champ libre (blur/Enter) → recompose → `onVote(...)`.
- `compact` : tailles réduites (lignes denses).
- Garde `e.stopPropagation()` sur tous les interactifs ; popover fermé au clic extérieur / Escape (pattern `JrActionsMenu`).
- a11y : `aria-pressed` sur les pouces, `aria-expanded`/`aria-controls` sur le déclencheur popover, `role="menu"`/cases focusables.

La persistance (`voteJob`/`persistJobPatch`, whitelist, télémétrie `jobs_feedback`) est **inchangée** — `JrVote` continue d'appeler `onVote(id, patch)`.

## 6. Fichiers touchés

- `cockpit/panel-jobs-radar.jsx` — réécriture de `JrVote` (popover multi-select + compose/parse). `VERDICT_REASONS` ajusté. `voteJob`/whitelist inchangés.
- `cockpit/styles-jobs-radar.css` — remplace le bloc `.jr-vote*` (tokens corrects + styles popover/checkbox/tags) ; corrige aussi `.jr-calib*` (mêmes faux tokens).
- `cockpit/icons.jsx` — vérifier `check` (utilisé par `JrToast`, existe) et `chevron_down` (existe). A priori aucun ajout.
- **Obligations CLAUDE.md** : MAJ `docs/specs/tab-jobs.md` (vote = popover multi-raison) + bump `last_updated` `docs/specs/index.json` ; `node scripts/sync-sw.mjs`. Pas de migration, pas de télémétrie, pas d'archi (réutilise colonne + event existants).

## 7. États & cas limites

- **Thème clair** : tout passe par les tokens → lisible (le bug d'origine). À vérifier en switchant de thème.
- **Aucune raison cochée, juste un pouce** : `user_verdict_reason = null`. Légitime.
- **Raisons + pas de texte / texte + pas de raison** : compose gère les deux (pas de ` — ` orphelin).
- **Reason legacy mono** (votes déjà en base au format `chip — texte`) : le parse (split premier ` — `, puis ` · `) lit l'ancien format comme une seule raison + texte — rétro-compatible.
- **Switch de pouce** : vide les raisons (déjà spécifié) → pas de raison 👍 collée à un 👎.
- **PATCH échoué** : comportement existant (toast erreur, optimistic local, pas de rollback) — non aggravé.
- **Popover ouvert + reload Realtime** : l'état local du popover peut se réinitialiser ; acceptable (le verdict/raisons persistés restent corrects).

## 8. Vérification (manuelle — pas de runner JS)

- **Contraste** : taper dans « préciser » → texte lisible ; tester en thème clair ET sombre (switcher sidebar).
- **Multi-select** : cocher 2+ raisons → 2+ tags affichés ; en base `SELECT user_verdict_reason` = `Run/BAU · Secteur` ; ajouter un texte → `… — mon texte`.
- **Décocher** → le tag disparaît, la colonne se recompose. Tout décocher + vider le texte → `null`.
- **Recharger** (F5) → tags + texte ré-hydratés correctement (parse).
- **Switch pouce** → raisons vidées.
- **Lignes denses** : version compacte lisible, popover s'ouvre correctement, tags pas trop larges.
- **Alignement visuel** : pouces/tags/popover cohérents avec `.jr-filter-btn` / `.jr-tag` / `.jr-menu-pop` du reste du panel.

## 9. Découpage (pour le plan)

Petit chantier, un seul lot :
- **Lot unique** : CSS (tokens corrigés `.jr-vote*` + `.jr-calib*` + styles popover) → réécriture `JrVote` (popover multi-select + compose/parse) → MAJ `tab-jobs.md` + `index.json` → `sync-sw`. Vérification manuelle navigateur en fin.

Le **chantier B (offres obsolètes)** fera l'objet d'un brainstorm + spec + plan séparés.
