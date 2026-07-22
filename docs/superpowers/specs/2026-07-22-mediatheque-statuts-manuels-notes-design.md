# Médiathèque — statut « mis de côté » + note par saison

> Design doc — 2026-07-22. Étend le tracker anime (`docs/superpowers/specs/2026-07-14-mediatheque-anime-tracker-design.md`) avec un statut manuel « mis de côté » au niveau franchise et une note /100 par saison.

## Problème

La médiathèque dérive déjà un statut par franchise (À voir / En cours / En cours · à jour / Vu) à partir de la progression épisode par épisode. Deux manques, listés en TODO dans `docs/specs/tab-mediatheque.md` :

1. **Aucun statut manuel** : impossible de ranger un anime qu'on ne veut plus suivre. Il reste dans les buckets actifs et pollue la bibliothèque.
2. **Aucune note** : impossible de garder une trace de ce qu'on a pensé de chaque saison.

## Objectif

- **Mis de côté** (niveau franchise) : un anime qu'on ne suit plus sort des buckets actifs mais conserve progression + notes, réactivable à tout moment.
- **Note /100 par saison** (niveau entrée) : noter chaque saison/film/bonus sur l'échelle AniList (0–100), directement dans la fiche.

Non couvert (YAGNI) : note au niveau franchise (agrégée), statuts manuels autres que « mis de côté » (pas de « en pause » manuel), import de notes externes.

## Modèle de données

Migration `sql/021_media_shelved_rating.sql` — deux colonnes, aucune table nouvelle :

```sql
ALTER TABLE media_franchises ADD COLUMN shelved boolean NOT NULL DEFAULT false;
ALTER TABLE media_progress   ADD COLUMN rating  int CHECK (rating >= 0 AND rating <= 100);
```

- `media_franchises.shelved` — mis de côté = toute la franchise. **Sûr vis-à-vis du pipeline** : `anime_tracker_sync` ne PATCH que `updated_at` sur `media_franchises` (`pipelines/anime_tracker_sync.py:354`), il n'écrit jamais `shelved`.
- `media_progress.rating` — note par entrée (saison/film/bonus), nullable, `null` = pas noté. `media_progress` est user-owned, **jamais** écrit par le pipeline. Une ligne `media_progress` peut désormais exister pour `episodes_watched = 0` (entrée notée mais non commencée) : sans impact sur les statuts dérivés (somme des `episodes_watched` inchangée).

RLS : les policies `authenticated` (SELECT/INSERT/UPDATE/DELETE) existent déjà sur les 4 tables ; les nouvelles colonnes en héritent, rien à ajouter.

Application : via MCP Supabase (`apply_migration`) — workflow prod-only, pas de stack locale.

## Logique de statut (front)

`mdtStatus(chainEntries, progressById)` reste inchangé. Le statut « mis de côté » est un **override au niveau carte**, pas un 5ᵉ cas de dérivation :

```js
const st = f.shelved ? { id: "shelved", label: "Mis de côté" } : mdtStatus(chain, progressById);
```

**Filtres** — les chips passent de 4 à 5 : `Tous · À voir · En cours · Vu · Mis de côté`.
- `Tous` et les trois buckets actifs (`to_watch` / `watching` incl. `up_to_date` / `seen`) **excluent** les franchises `shelved`.
- Le chip `Mis de côté` ne montre **que** les `shelved`.

Résultat : une franchise mise de côté disparaît de la vue active et n'est visible que sous son chip. Progression et notes intactes → réactivation sans perte.

## UI

### Note par saison — dans la fiche (`FicheFranchise`)

Chaque ligne d'entrée qui affiche déjà un `MdtStepper` (chaîne canon **et** bonus) reçoit à côté un contrôle note `<MdtRating>` :
- **Non notée** → pastille discrète `Noter`.
- **Notée** → pastille `82` (mise en avant).
- Clic → input inline `type=number min=0 max=100` (même pattern d'édition que le compteur d'épisodes : `autoFocus`, validation sur `blur`/`Enter`, annulation sur `Escape`).
- Champ vidé → retire la note (`rating = null`).

Réservé au mode `library` de la fiche (une préversion non ajoutée n'a pas de `media_progress`).

### Bascule « mis de côté » — pied de fiche

Le pied de la fiche bibliothèque (`.mdt-fiche-actions`) gagne un bouton toggle :
- Franchise active → **« Mettre de côté »**.
- Franchise `shelved` → **« Réactiver »**.

L'en-tête de la fiche affiche le badge `Mis de côté` quand `shelved`. La carte de la grille affiche le même badge via `.mdt-badge--shelved` (gris atténué, distinct des couleurs de statut actives).

## Écritures (optimistes, pattern existant)

- `writeRating(entry, value)` — upsert `POST media_progress?on_conflict=entry_id` avec `Prefer: resolution=merge-duplicates`, corps `[{ entry_id, rating, updated_at }]` (n'envoie **pas** `episodes_watched` → la valeur existante est préservée ; sur insertion, `episodes_watched` prend son `DEFAULT 0`). `value = null` pour retirer. Mutation locale de `window.MEDIATHEQUE_DATA.progress` immédiate, `setTick`, rollback + toast si l'écriture échoue. Calque `writeProgress`.
- `toggleShelved(franchiseId)` — PATCH `media_franchises?id=eq.<id>` `{ shelved }`. Mutation locale immédiate, rollback + toast si échec. Calque `ackRelease`.

## Télémétrie (`docs/telemetry.md` avant commit)

- `mediatheque_shelve` — `{ shelved: bool, franchise_root_id }` — après PATCH réussi dans `toggleShelved`.
- `mediatheque_rate` — `{ entry_kind, rating, cleared: bool }` — après upsert réussi dans `writeRating`.

## Impacts documentaires (mêmes commits, règles cardinales)

- **Spec onglet** : `docs/specs/tab-mediatheque.md` — section Fonctionnalités (statut manuel + note), États & edge cases, retirer les deux lignes TODO couvertes, bump `last_updated` dans `docs/specs/index.json`.
- **Archi** : `docs/architecture/dependencies.yaml` — ajouter les colonnes `shelved` / `rating` aux tables `media_franchises` / `media_progress`. `flows/perso-mediatheque.yaml` si le flux mentionne les statuts. Pas d'ADR (extension non structurante, aucun secret, aucun nouveau pipeline).
- **Service worker** : `node scripts/sync-sw.mjs` après édition de `cockpit/**`.

## Fichiers touchés

| Fichier | Changement |
|---|---|
| `sql/021_media_shelved_rating.sql` | **nouveau** — 2 colonnes |
| `cockpit/panel-mediatheque.jsx` | override statut shelved, chip filtre, `<MdtRating>`, `writeRating`, `toggleShelved`, bouton pied de fiche, badge en-tête |
| `cockpit/styles-mediatheque.css` | `.mdt-badge--shelved`, `.mdt-rating` (+ état actif/vide) |
| `cockpit/data-mediatheque.js` | commentaire (colonnes brutes inchangées côté loader) |
| `docs/specs/tab-mediatheque.md` + `docs/specs/index.json` | spec + last_updated |
| `docs/architecture/dependencies.yaml` | colonnes |
| `docs/telemetry.md` | 2 events |
| Service worker (auto) | `sync-sw.mjs` |

## États & edge cases

- **Mettre de côté depuis un bucket actif** → la carte disparaît de la vue courante (sauf si le filtre actif est `Mis de côté`), reste sous son chip. Réactiver → réapparaît dans le bucket dérivé de sa progression.
- **Noter une entrée non commencée** → crée une ligne `media_progress` avec `episodes_watched = 0` ; le statut reste `À voir` tant qu'aucun épisode n'est vu.
- **Retrait de franchise** → `ON DELETE CASCADE` supprime déjà `media_progress` (donc notes) ; rien à changer.
- **Échec réseau** (rating ou shelve) → rollback optimiste + toast « réessaie », comme la progression.
- **Note hors bornes** → l'input est `min=0 max=100` ; on clampe côté JS avant l'upsert par sécurité.
