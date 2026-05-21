# Jobs Radar — Offres clôturées — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masquer du feed Jobs Radar les offres clôturées, détectées par la routine Cowork (qui pose `jobs.closed_at`), avec un filtre « Clôturées » pour les auditer.

**Architecture:** Une colonne `closed_at` (timestamptz) sur `jobs`, écrite uniquement par Cowork (lecture du marqueur « ne sont plus acceptées »). Le cockpit expose `closed_at`, masque les offres « mortes » (`closed_at` set & pas `applied`) de toutes les vues sauf un filtre « Clôturées », et affiche un compteur. Spec : [docs/superpowers/specs/2026-05-21-jobs-radar-closed-offers-design.md](../specs/2026-05-21-jobs-radar-closed-offers-design.md).

**Tech Stack:** React 18 + Babel standalone (hooks `useStateJr`/`useMemoJr`), Supabase Postgres (colonne additive), routine Cowork (prompt versionné). Connecteur MCP Supabase pour appliquer/tester le SQL.

**Note tests :** pas de runner JS, pas de navigateur côté implémenteur. SQL = colonne additive (le contrôleur applique + vérifie via MCP). Front = lecture statique + smoke-test navigateur en fin (avec un `UPDATE` de test). Cowork = doc, run à blanc manuel.

---

## Structure des fichiers

| Fichier | Modif | Responsabilité |
|---|---|---|
| `sql/015_jobs_closed_at.sql` | **Create** | `ADD COLUMN closed_at timestamptz` (additif, idempotent). |
| `cockpit/lib/data-loader.js` | Modify ~1651 | `transformJobRow` expose `closed_at`. |
| `cockpit/panel-jobs-radar.jsx` | Modify | Helper `jrIsDead` ; exclusion des mortes (hotLeads + listOffers) ; filtre « Clôturées » ; compteur header. |
| `docs/specs/tab-jobs.md` + `index.json` | Modify | Spec + bump. |
| `docs/architecture/dependencies.yaml` + `decisions.md` | Modify | Colonne `closed_at` + ADR. |
| `sw.js` | Modify (généré) | `node scripts/sync-sw.mjs`. |
| `docs/cowork-routines/jobs-radar.md` | Modify (Lot 2) | Détection clôture + passe de fraîcheur. |

---

# LOT 1 — repo (livrable seul ; inerte tant que Cowork n'a pas posé de `closed_at`)

## Task 1 : Migration 015

**Files:** Create `sql/015_jobs_closed_at.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Migration 015 — Offres clôturées (masquage du feed Jobs Radar)
--
-- Cowork pose closed_at = now() quand LinkedIn marque une offre
-- « Les candidatures ne sont plus acceptées ». Le cockpit masque les
-- offres closed_at non-null (sauf celles déjà 'applied'). Colonne
-- orthogonale au status. Additif + idempotent.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;
```

- [ ] **Step 2 : Appliquer + vérifier (contrôleur, MCP Supabase)**

Apply : `apply_migration(name="015_jobs_closed_at", query=<contenu>)` (project `mrmgptqpflzyavdfqwwv`).
Verify : `execute_sql("SELECT closed_at FROM public.jobs LIMIT 1;")` → succès (colonne existe, valeurs `null`).

- [ ] **Step 3 : Commit**
```bash
git add sql/015_jobs_closed_at.sql
git commit -m "feat(jobs): migration 015 — colonne closed_at (offres cloturees)"
```

## Task 2 : `transformJobRow` expose `closed_at`

**Files:** Modify `cockpit/lib/data-loader.js:1651`

- [ ] **Step 1 : Ajouter le champ**

Trouve la fin de `transformJobRow` :
```js
      user_verdict_at: row.user_verdict_at || null,
    };
  }
```
Remplace par :
```js
      user_verdict_at: row.user_verdict_at || null,
      closed_at: row.closed_at || null,
    };
  }
```

- [ ] **Step 2 : Vérifier** — console : `window.JOBS_DATA.offers[0]` expose `closed_at` (null). Pas d'erreur de chargement.

- [ ] **Step 3 : Commit**
```bash
git add cockpit/lib/data-loader.js
git commit -m "feat(jobs): expose closed_at dans transformJobRow"
```

## Task 3 : Masquage + filtre « Clôturées » + compteur (`panel-jobs-radar.jsx`)

**Files:** Modify `cockpit/panel-jobs-radar.jsx` (helper + lignes ~915-956 + ~1047-1053 + bloc `.jr-header-stats`)

- [ ] **Step 1 : Helper `jrIsDead`**

Juste après la fonction `scoreBand` (helper module, vers le haut du fichier), ajoute :
```js
// Une offre clôturée est "morte" et masquée — sauf si déjà postulée (reste dans le pipeline applied).
function jrIsDead(o) { return !!o.closed_at && o.status !== "applied"; }
```

- [ ] **Step 2 : Exclure les mortes des hot leads**

Remplace (≈915-918) :
```js
  const hotLeads = useMemoJr(() =>
    offers.filter(o => o.score_total >= 7 && o.status !== "archived" && o.status !== "snoozed")
          .sort((a, b) => b.score_total - a.score_total),
  [offers]);
```
par :
```js
  const hotLeads = useMemoJr(() =>
    offers.filter(o => o.score_total >= 7 && o.status !== "archived" && o.status !== "snoozed" && !jrIsDead(o))
          .sort((a, b) => b.score_total - a.score_total),
  [offers]);
```

- [ ] **Step 3 : Filtre statut — masquer les mortes + vue « closed »**

Remplace le bloc statut dans `listOffers` (≈932-936) :
```js
    if (statusFilter === "active") {
      arr = arr.filter(o => o.status === "new" || o.status === "to_apply" || o.status === "applied");
    } else if (statusFilter !== "all") {
      arr = arr.filter(o => o.status === statusFilter);
    }
```
par :
```js
    if (statusFilter === "closed") {
      arr = arr.filter(o => !!o.closed_at);
    } else {
      // Masque les clôturées (sauf applied) de toutes les autres vues.
      arr = arr.filter(o => !jrIsDead(o));
      if (statusFilter === "active") {
        arr = arr.filter(o => o.status === "new" || o.status === "to_apply" || o.status === "applied");
      } else if (statusFilter !== "all") {
        arr = arr.filter(o => o.status === statusFilter);
      }
    }
```

- [ ] **Step 4 : Compteur**

Après (≈955-956) :
```js
  const totalCount = offers.length;
  const newCount = offers.filter(o => o.status === "new").length;
```
ajoute :
```js
  const closedCount = offers.filter(jrIsDead).length;
```

- [ ] **Step 5 : Option de filtre « Clôturées »**

Dans le `FilterGroup` statut (≈1047-1053), ajoute l'option `closed` avant `all` :
```jsx
              options={[
                { id: "active",   label: "Actives" },
                { id: "new",      label: "Nouvelles" },
                { id: "to_apply", label: "À postuler" },
                { id: "applied",  label: "Candidaté" },
                { id: "closed",   label: "Clôturées" },
                { id: "all",      label: "Tout" },
              ]}
```

- [ ] **Step 6 : Compteur dans le header**

Dans le bloc `.jr-header-stats` (header, là où s'affichent « N nouvelles · M hot leads · T au total dans le radar »), ajoute APRÈS la dernière `<span>` (« au total dans le radar ») :
```jsx
            {closedCount > 0 && (<>
              <span className="jr-sep">·</span>
              <span><strong>{closedCount}</strong> clôturée{closedCount > 1 ? "s" : ""} masquée{closedCount > 1 ? "s" : ""}</span>
            </>)}
```
(Lis le bloc `.jr-header-stats` d'abord pour insérer au bon endroit, en suivant le style des `<span>` voisins.)

- [ ] **Step 7 : Vérifier (lecture statique)** — `jrIsDead` défini avant usage ; JSX/braces équilibrés ; `statusFilter==="closed"` géré dans `listOffers` ; `closedCount` n'utilise que `jrIsDead`. Aucun chemin n'écrit `closed_at` (pas dans la whitelist `patchJobSupabase`).

- [ ] **Step 8 : Commit**
```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "feat(jobs): masque les offres cloturees + filtre Cloturees + compteur"
```

## Task 4 : Docs + service worker

**Files:** `docs/specs/tab-jobs.md`, `docs/specs/index.json`, `docs/architecture/dependencies.yaml`, `docs/architecture/decisions.md`, `sw.js`

- [ ] **Step 1 : `tab-jobs.md`**
- **Fonctionnalités** : ajoute « **Masquage des offres clôturées** : quand une offre LinkedIn passe en "ne recrute plus" (détecté par le scan Cowork via `closed_at`), elle est retirée du feed actif et des hot leads. Un filtre « Clôturées » permet de les revoir ; un compteur header indique combien sont masquées. Une offre déjà postulée reste dans le pipeline. »
- **Back — sources de données**, ligne `jobs` : ajoute `closed_at` aux colonnes lues (écrite par Cowork, jamais par le front).
- **Dernière MAJ** (en tête) : « 2026-05-21 — masquage des offres clôturées : colonne `closed_at` (migration 015) posée par Cowork, masquage front + filtre « Clôturées » + compteur. Voir docs/superpowers/plans/2026-05-21-jobs-radar-closed-offers.md. »

- [ ] **Step 2 : `index.json`** — `last_updated` de `jobs` = `2026-05-21` (déjà à cette date ; laisser). Run: `node -e "JSON.parse(require('fs').readFileSync('docs/specs/index.json'))" && echo OK`.

- [ ] **Step 3 : Archi**
- `dependencies.yaml` : sur `jobs`, ajoute la colonne `closed_at` (écrite par Cowork, lue par le front), au format existant.
- `decisions.md` : ADR daté « 2026-05-21 — Offres clôturées : détection côté Cowork (le cockpit ne peut pas vérifier LinkedIn en direct), colonne `closed_at`, masquage précis (jamais sur la seule ancienneté), async ».

- [ ] **Step 4 : Linters** — `python scripts/lint_specs_produit.py` ; `python scripts/validate_architecture.py` → `ok … aucune violation.`

- [ ] **Step 5 : Service worker** — `node scripts/sync-sw.mjs`.

- [ ] **Step 6 : Commit**
```bash
git add docs/specs/tab-jobs.md docs/specs/index.json docs/architecture/dependencies.yaml docs/architecture/decisions.md sw.js
git commit -m "docs(jobs): spec + archi + sw pour offres cloturees (Lot 1)"
```

---

# LOT 2 — hors repo (doc Cowork)

## Task 5 : Routine Cowork — détection + passe de fraîcheur

**Files:** Modify `docs/cowork-routines/jobs-radar.md`

- [ ] **Step 1 : Détection opportuniste (dans l'UPSERT / Étape 5)**

Dans le prompt, à l'Étape 5 (UPSERT), ajoute une consigne (lis l'étape d'abord pour l'insérer proprement) :
```
DÉTECTION CLÔTURE : quand tu fetch la page d'une offre (scoring d'une
nouvelle, ou re-fetch d'une offre revue), si la page affiche « Les
candidatures ne sont plus acceptées » / « No longer accepting
applications », pose :
   UPDATE jobs SET closed_at = now()
   WHERE linkedin_job_id = X AND closed_at IS NULL;
Ne touche pas status / user_notes / user_verdict*.
```

- [ ] **Step 2 : Passe de fraîcheur (nouvelle étape, après l'Étape 7 recalibrage)**

Ajoute :
```
ÉTAPE 8 — Passe de fraîcheur (offres clôturées)

Re-vérifie un lot borné d'offres actives pour repérer les clôturées
qui ont disparu de la recherche :
   SELECT id, url, linkedin_job_id FROM jobs
   WHERE closed_at IS NULL AND status IN ('new','to_apply')
   ORDER BY last_seen_date ASC
   LIMIT 25;
Pour chaque URL, visite la page ; si « ne sont plus acceptées » →
   UPDATE jobs SET closed_at = now() WHERE id = <id>;
Borne à 25/run pour tenir le budget 15 min (les plus anciennes
d'abord = les plus susceptibles d'être mortes ; le stock est couvert
en quelques jours). Si le run est déjà long, réduire ce lot.
```

- [ ] **Step 3 : Dernière MAJ** (routine) — « 2026-05-21 — détection des offres clôturées : `closed_at` posée à la lecture de "ne sont plus acceptées" (opportuniste à l'Étape 5 + passe de fraîcheur Étape 8, 25 offres actives les plus anciennes/run). »

- [ ] **Step 4 : Commit**
```bash
git add docs/cowork-routines/jobs-radar.md
git commit -m "docs(cowork): detection offres cloturees (closed_at + passe de fraicheur)"
```

- [ ] **Step 5 : Vérif (run à blanc, par Jean dans Cowork)** — sur une offre réellement close, `closed_at` se pose ; la passe de fraîcheur re-visite les actives les plus anciennes et reste dans le budget ; `status`/`user_*` intacts ; dans le cockpit l'offre disparaît du feed et apparaît sous « Clôturées ».

---

## Vérification finale (navigateur — contrôleur/humain)

- [ ] `UPDATE jobs SET closed_at = now() WHERE id = '<une offre new visible>';` → elle disparaît du feed actif + des hot leads ; le compteur header « 1 clôturée masquée » apparaît ; le filtre « Clôturées » la montre.
- [ ] Sur une offre `applied`, poser `closed_at` → elle **reste** visible (pipeline). 
- [ ] Nettoyer : `UPDATE jobs SET closed_at = NULL WHERE id IN (…);`
- [ ] Realtime : poser `closed_at` pendant que le panel est ouvert → l'offre disparaît au reload du channel.
