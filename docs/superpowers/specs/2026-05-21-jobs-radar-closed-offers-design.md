# Jobs Radar — Offres clôturées (détection + masquage)

> **Statut** : design validé (2026-05-21, approche A), à implémenter. Validé en autonomie (utilisateur hors-ligne, « je veux A »).
> **Portée** : chantier B. Suite des chantiers vote/calibrage (mêmes table `jobs` + routine Cowork). Onglet : [docs/specs/tab-jobs.md](../../specs/tab-jobs.md).

## 1. Problème

Des offres du feed sont **clôturées** : en cliquant « Postuler », on tombe sur LinkedIn « Les candidatures ne sont plus acceptées ». Clic gâché + bruit dans le radar.

Contrainte dure : **le cockpit ne peut pas vérifier l'état d'une offre en direct** (CORS + session LinkedIn authentifiée hors de portée du navigateur). Seule la **routine Cowork** — qui fetch déjà les pages d'offres pour le scoring — peut lire le marqueur de clôture.

## 2. Objectif & non-objectifs

**Objectif** — détecter les offres clôturées (côté Cowork) et les **masquer** du feed actif, avec un moyen d'auditer (rattraper un faux positif).

**Non-objectifs** :
- Pas de détection live côté cockpit (impossible).
- **Pas de masquage sur la seule ancienneté** (`last_seen_date`) : faux positifs destructeurs (offre encore ouverte hors filtres de recherche). L'ancienneté ne sert qu'à **prioriser** la re-vérification.
- Pas de second score, pas de nouveau feed. Pas de suppression de lignes (les clôturées restent en base, juste filtrées).

## 3. Approche retenue — A (confirmé-clos + passe de fraîcheur)

Nouvelle colonne `jobs.closed_at` (timestamptz, nullable). Posée **uniquement** sur confirmation Cowork (marqueur lu sur la page) → masquage précis, zéro faux positif destructeur. Async : effet au scan suivant.

## 4. Composants

### 4.1 Données — migration `sql/015_jobs_closed_at.sql`
- `ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;` (additif, idempotent).
- Pas de changement de l'enum `status` (colonne **orthogonale** : une offre peut être `applied` ET `closed_at`).
- Trigger d'héritage `jobs_inherit_user_status` **non modifié** : une republication (nouveau `linkedin_job_id`) est potentiellement ré-ouverte → repart sans `closed_at`, ré-évaluée à neuf.
- RLS : `jobs` déjà permissif ; la colonne est écrite par Cowork (service_role). Le front ne l'écrit jamais (lecture seule) — **pas** ajoutée à la whitelist `patchJobSupabase`.

### 4.2 Cockpit — masquage + audit (`panel-jobs-radar.jsx`, `data-loader.js`)
- `transformJobRow` expose `closed_at` (`row.closed_at || null`).
- Helper `isDead(o) = !!o.closed_at && o.status !== "applied"` — une offre clôturée est « morte » sauf si déjà postulée (elle reste dans le pipeline `applied`).
- **Masquage** : les offres « mortes » sont exclues des **hot leads** et de **toutes les vues** sauf le filtre « Clôturées ».
  - `hotLeads` : ajouter `&& !isDead(o)`.
  - `listOffers` : pour tout `statusFilter` ≠ `"closed"`, exclure `isDead(o)`.
- **Audit** : nouvelle option de filtre statut **« Clôturées »** (`statusFilter === "closed"`) → n'affiche que les offres `closed_at` non-null. Ajoutée au `FilterGroup` statut existant (`active`/`new`/`to_apply`/`applied`/`closed`/`all`).
- **Compteur** : stat header « N clôturées » = `offers.filter(isDead).length` (affiché seulement si > 0).

### 4.3 Routine Cowork (`docs/cowork-routines/jobs-radar.md`)
Nouvelle logique de détection, intégrée au prompt versionné :
- **Détection opportuniste** : lors du fetch d'une page d'offre (scoring des nouvelles, ou re-fetch d'une offre revue dont la JD a changé), si la page porte « ne sont plus acceptées » / « no longer accepting applications » → `UPDATE jobs SET closed_at = now() WHERE linkedin_job_id = X` (si `closed_at` est déjà non-null, ne pas réécrire).
- **Passe de fraîcheur** (nouvelle étape, chaque run, bornée) :
  - `SELECT id, url, linkedin_job_id FROM jobs WHERE closed_at IS NULL AND status IN ('new','to_apply') ORDER BY last_seen_date ASC LIMIT 25;`
  - Re-visiter chaque URL ; si clôturée → poser `closed_at = now()`. Borne ~25 offres/run pour tenir le budget 15 min ; couvre le stock actif en quelques jours en commençant par les plus anciennes (les plus susceptibles d'être mortes).
- Ne touche jamais `status`, `user_notes`, `user_verdict*`.

## 5. Flux de données

```
Cowork (run quotidien)                         Supabase                    Cockpit
──────────────────────                         ────────                    ───────
fetch JD (scoring) ─┐
passe fraîcheur ────┴─ lit « plus acceptées » → UPDATE jobs.closed_at = now()
                                                     │
                                                     ▼  (lendemain / Realtime)
                                          transformJobRow expose closed_at
                                          isDead(o) → exclu des vues (sauf « Clôturées »)
                                          + compteur « N clôturées »
```

## 6. États & cas limites
- **Offre postulée puis clôturée** : `status='applied'` → `isDead` false → reste visible dans le pipeline (la clôture n'a plus d'importance, tu as postulé).
- **Faux positif** (Cowork lit mal) : récupérable via le filtre « Clôturées ». (Pas de ré-ouverture auto ; rare.)
- **Offre ré-ouverte / republiée** : nouveau `linkedin_job_id`, `closed_at` non hérité → repart `new`, ré-évaluée.
- **Passe de fraîcheur dépasse le budget** : bornée à 25/run ; si run lent, Cowork peut réduire (priorité au scoring du jour).
- **Realtime** : `closed_at` posé pendant que le panel est ouvert → reload via le channel `jobs` existant → l'offre disparaît du feed.
- **`closed_at` jamais reset** : si une offre rouvre sans changer d'`id` (rare), elle reste masquée. Acceptable ; rattrapable via « Clôturées » + (futur) action de réouverture manuelle si besoin.

## 7. Obligations CLAUDE.md (même commit que le code)
- Spec : MAJ `docs/specs/tab-jobs.md` (masquage clôturées + filtre + compteur ; colonne `closed_at` lue) + bump `last_updated` `index.json`.
- Archi : `docs/architecture/dependencies.yaml` (colonne `closed_at` sur `jobs`, écrite par Cowork) + ADR dans `decisions.md` (détection clôture côté Cowork, masquage précis, async).
- Service worker : `node scripts/sync-sw.mjs` après modif `cockpit/**`.
- Routine versionnée : MAJ `docs/cowork-routines/jobs-radar.md`.
- Pas de nouvelle télémétrie (YAGNI).

## 8. Découpage (pour le plan)
- **Lot 1 — repo (livrable seul)** : migration 015 + `transformJobRow` + masquage/`isDead`/filtre « Clôturées »/compteur dans `panel-jobs-radar.jsx` + docs (tab-jobs, dependencies, ADR) + sync-sw. Sans Cowork, rien n'est encore masqué (aucun `closed_at` posé) — mais la plomberie est prête et sûre.
- **Lot 2 — hors repo (doc)** : MAJ du prompt Cowork (détection opportuniste + passe de fraîcheur), à copier-coller.

## 9. Vérification
- **Migration** : colonne `closed_at` présente (`\d jobs` / information_schema) ; idempotente.
- **Cockpit** (manuel + un `UPDATE jobs SET closed_at=now() WHERE id='…'` de test) : l'offre disparaît du feed actif et des hot leads ; le filtre « Clôturées » la montre ; le compteur header s'incrémente ; une offre `applied` avec `closed_at` reste visible en `applied`. Nettoyer le test ensuite (`UPDATE … SET closed_at=NULL`).
- **Cowork** (run à blanc) : sur une offre réellement close, `closed_at` se pose ; la passe de fraîcheur re-visite bien les plus anciennes actives et reste dans le budget ; `status`/`user_*` intacts.
