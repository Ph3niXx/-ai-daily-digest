# Jobs Radar — filtres appliqués au hero « hot leads »

> Design validé le 2026-05-31. Aujourd'hui le hero (cards score ≥ 7) **ignore tous les filtres** ; on le branche sur les mêmes filtres que la liste dense (catégorie, remote, statut, recherche, score), avec masquage automatique quand il ne reste aucun hot lead. Le compteur « hot leads » du header reste **global**.

## Problème

Dans `cockpit/panel-jobs-radar.jsx`, `hotLeads` (le hero) ne dépend que de `[offers]` (lignes ~897-900) : il n'applique aucun filtre. Seule la liste dense (`listOffers`) filtre. Conséquence : filtrer sur « EM » filtre la liste mais **pas** le hero — incohérent (ex. Ledger EM 7.0 est un hot lead et resterait affiché même en filtrant « Produit »).

## Décision (option « tous les filtres s'appliquent »)

1. **Prédicat partagé `passesFilters(o)`** — extraire la logique **catégorie + remote + statut + recherche** (aujourd'hui inline dans `listOffers`, lignes ~911-935) en un helper, appliqué aux **deux** sections. Garantit un seul comportement de filtrage.
2. **Hero filtré** : `heroLeads` = `offers.filter(passesFilters)` ∩ `score_total ≥ 7`, trié par score décroissant. Affiché seulement si `scoreFilter ∈ {all, hot}` ; sur `mid`/`low` le hero se masque (le rendu conditionnel `{heroLeads.length > 0 && …}` ligne ~983 le fait déjà). Le filtrage statut/dead vient désormais de `passesFilters` (et non plus d'une exclusion codée en dur dans le hero) → par défaut `statut=active`, le hero affiche les ≥ 7 actifs comme aujourd'hui ; si Jean sélectionne « Clôturées » ou « Tout », le hero suit.
3. **Compteur header gardé global** : la ligne récap « N nouvelles · M hot leads · T au total » reste un résumé **global**. On introduit un `hotLeadsCount` (sur `[offers]`, définition active ≥ 7 actuelle) juste pour le « M » ; seul le **hero** réagit aux filtres. Cohérent avec « nouvelles » et « total » qui restent globaux.
4. **Liste** : `listOffers` = `offers.filter(passesFilters)` → exclut les membres de `heroLeads` → applique le filtre de bande score (`mid`/`low`) → tri. Iso-fonctionnel, juste rebranché sur le prédicat partagé.

## Comportement attendu (exemples)

| Filtre | Hero | Liste |
|---|---|---|
| (défaut, statut=active) | ≥ 7 actifs (inchangé) | < 7 actifs |
| catégorie = EM | Ledger (7.0) seul | Workday/Worldline (< 7… selon scores), etc. |
| catégorie = Produit | sans les EM | offres produit < 7 |
| score = mid | **masqué** | offres 5–7 filtrées |
| recherche « decathlon » | Decathlon si ≥ 7, sinon masqué | autres matchs < 7 |

## Fichiers

- `cockpit/panel-jobs-radar.jsx` : helper `passesFilters`, `hotLeadsCount` (header), `heroLeads` (hero), `listOffers` rebranché. Header ligne ~959, hero ~983-997.
- `docs/specs/tab-jobs.md` + `docs/specs/index.json` : changement fonctionnel de l'onglet (le hero suit les filtres) + bump `last_updated`.
- **Pas d'ADR** : fix UX iso-architecture (aucun pipeline/table/migration/cron touché).
- Service worker : `node scripts/sync-sw.mjs` après modif `cockpit/**`.

## Hors périmètre

- Aucun nouveau filtre, aucune refonte visuelle du hero.
- Pas de changement du compteur header (reste global — décision actée).

## Vérification

Front vérifié **en prod** (push `main` → hard-refresh Pages) : filtrer « EM » → hero = Ledger seul ; « Produit » → Ledger sort du hero ; « mid » → hero masqué + liste 5–7 ; recherche → hero suit. Pas de test auto sur ce module.
