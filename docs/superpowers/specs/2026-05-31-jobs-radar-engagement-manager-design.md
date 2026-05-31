# Jobs Radar — suivre les postes d'Engagement Manager

> Design validé le 2026-05-31. Ajoute « Engagement / Delivery / Transformation Manager en boîte tech/produit/IA crédible » comme **rôle cible à part entière** du Jobs Radar : trouvé activement (2 requêtes JSearch), scoré équitablement (plus pénalisé comme du RUN), et isolable d'un clic (catégorie `em` dédiée) — **sans toucher** à l'exclusion dure `conseil/ESN` ([ADR-21](../../architecture/decisions.md)).

## Problème

Jean (RTE, ex-manager PwC Digital) veut suivre les postes d'**engagement manager** car ils sont alignés avec son poste actuel et ce qui l'intéresse. Or aujourd'hui le radar :

1. **ne les cherche pas** — aucune des 9 requêtes JSearch ([docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md), ÉTAPE 1) ne contient « engagement » ni « delivery ». Ils n'apparaissent qu'**incidemment** au gré des requêtes larges (`product manager`, `senior program manager`).
2. **les sous-note** — le rubric ÉTAPE 3 favorise **BUILD / TRANSFO / STRATÉGIE, pas le RUN**. Un engagement/delivery manager en boîte tech crédible se lit comme de l'implémentation client (« RUN ») et tombe : ex. **Workday « Sr Engagement Manager – AI Practice EMEA » = 3.5 → archived** (vérifié en base, 2026-05-31). Le titre « engagement manager » est aussi le standard du conseil MBB, déjà (et toujours) **éliminatoire** via `job_pref_rules`.
3. **ne permet pas de les isoler** — `role_category` ∈ {produit, rte, pgm, pjm, cos} ; pas de catégorie ni de chip de filtre pour les voir séparément.

## Tension résolue au brainstorming : quel « engagement manager » ?

« Engagement Manager » est ambigu : (a) chef de projet en conseil de management (McKinsey/BCG/Bain — **éliminatoire** chez Jean, sauf l'exception notée « Director Strategy & Transfo top-tier / Bain applied » dans `job_pref_observed`), ou (b) lead delivery / client-engagement / transformation chez un éditeur SaaS / une boîte produit/IA — **aligné** avec le profil RTE et les rôles cibles « AI delivery/transformation lead ».

**Décision : périmètre (b) uniquement.** L'exclusion `conseil/ESN` reste intacte ; on ne suit que la variante tech/produit/IA (et transfo interne, grand groupe non éliminatoire).

## Décisions de cadrage (issues du brainstorming, 2026-05-31)

| Question | Décision |
|---|---|
| Quel périmètre EM ? | **Tech / produit / IA uniquement.** L'exclusion `conseil/ESN` (`job_pref_rules`, autorité absolue) reste intacte. Pas d'assouplissement. |
| Comment les scorer ? | **Cible légitime si IA + boîte tech crédible.** On ajoute EM/delivery/transfo manager aux Rôles cibles d'ÉTAPE 3, en gardant l'exigence IA-au-cœur, l'exclusion `conseil/ESN`, et les red flags (PMO sans ownership, staffing/ESN, RUN client pur). |
| Catégorie dédiée ? | **Oui, `em`.** Nouvelle valeur `role_category` + chip de filtre + label front « EM ». |
| Quelles requêtes ? | **2 requêtes larges** : `engagement manager Paris` + `delivery manager Paris`. 11 requêtes × 4 runs ≈ **191/mois** (plafond gratuit 200, ADR-20). Le bruit conseil/ESN est archivé automatiquement par les règles. |
| Backfill du stock ? | **Re-tag + re-score curé** des seuls EM/delivery en boîte tech crédible (Workday…), one-shot MCP. Les conseil/ESN restent archivés et **non** re-taggés (catégorie `em` propre). |

## Changements détaillés

### 1. Routine — `docs/cowork-routines/jobs-radar.md` (+ push live `trig_01JtTsMm27eTAGxR5po5KmMQ`)
Le fichier est un **miroir** de la config live ; toute modif doit aussi être poussée sur le trigger via `RemoteTrigger` (`update` partiel du prompt). Sinon le fichier et l'exécution divergent.

- **ÉTAPE 1 (requêtes)** : ajouter `engagement manager Paris` et `delivery manager Paris` à la liste. Mettre à jour le compte « 9 requêtes » → **11** (texte de l'étape + ligne « Source d'offres » du préambule : `9 requêtes × 4 ≈ 156` → `11 × 4 ≈ 191`).
- **ÉTAPE 3 (Rôles cibles)** : ajouter une cible — *« Engagement / Delivery / Transformation Manager, UNIQUEMENT si la boîte est tech/IA crédible ET le rôle porte un angle produit/transfo/IA avec ownership (pas de l'implémentation client pure « RUN », pas d'ESN/staffing/body-shopping). »*
- **ÉTAPE 3 (Red flags)** : préciser qu'un EM/delivery **pur RUN client** ou **ESN/staffing** reste score bas → `archived`. Le discriminant BUILD-vs-RUN est conservé, juste rendu explicite pour ce titre.
- **ÉTAPE 3 (classification)** : `role_category` parmi `produit, rte, pgm, pjm, cos, em`. Ajouter une band salaire inférée : *Engagement/Delivery Mgr 85-120 k€*.
- **Contrat de données** (ligne ~30) : enum `role_category ∈ {produit,rte,pgm,pjm,cos,em}`.
- **Ligne « Dernière MAJ »** : ajouter une entrée 2026-05-31.

### 2. Schéma — nouvelle migration `sql/0xx_jobs_em_category.sql`
```sql
ALTER TABLE jobs DROP CONSTRAINT jobs_role_category_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_role_category_check
  CHECK (role_category IN ('produit','rte','pgm','pjm','cos','em'));
```
Contrainte live actuelle vérifiée : `jobs_role_category_check = CHECK (role_category = ANY (ARRAY['produit','rte','pgm','pjm','cos']))`. Appliquée en prod via MCP `apply_migration`. Mettre aussi à jour le fichier source `jarvis/migrations/008_jobs_radar.sql` (ligne 14) pour cohérence documentaire. Choisir le bon numéro de migration en lisant le dernier `sql/NNN_*.sql`.

### 3. Front — `cockpit/panel-jobs-radar.jsx` (2 éditions) + service worker
- `CAT_LABEL` (l.44) : ajouter `em: "EM"`.
- `FilterGroup` catFilter (l.~1031) : ajouter `{ id: "em", label: "EM" }`.
- Puis **`node scripts/sync-sw.mjs`** (règle cardinale SW — ne jamais éditer `STATIC[]`/`CACHE` à la main).

### 4. Backfill curé — one-shot MCP `execute_sql` (PAS la routine)
La routine ne re-score jamais une offre connue (dédup ÉTAPE 2) → tout rattrapage du stock est un geste manuel.

- **Cibles** : lignes dont le titre est un EM/delivery **ET** l'employeur est une boîte tech/produit/IA crédible (ex. Workday « Sr Engagement Manager – AI Practice », au cas par cas Ledger « Senior Delivery Manager »). Sélection **curée à la main**, pas un `LIKE` aveugle.
- **Exclus du backfill** : ESN/conseil (MIGSO-PCUBED, Onepoint, Adone Conseil, Theodo, EPAM, BayBridgeDigital, Oliver Wyman, Cabinet conseil…) → restent en l'état, **non** re-taggés `em`. Et les faux positifs sémantiques (Crypto.com « Product Director, **Banking Engagement** » = produit, pas EM) → intouchés.
- **Action** : `UPDATE jobs SET role_category='em', score_seniority=…, score_sector=…, score_impact=…, score_total=…, rubric_justif=… WHERE id IN (…)`.
- **Garde-fou statut** : ne flipper `archived → new` (recalcul `status = new` si `score_total ≥ 5`) **que** si `user_verdict IS NULL` — on ne réécrit jamais un `status` / verdict posé par Jean (règle cardinale : champs user-owned jamais écrasés).

### 5. Docs imposées par les règles cardinales (même commit)
- `docs/specs/tab-jobs.md` — liste des rôles suivis + ligne « Dernière MAJ ». Vocabulaire **user-facing** dans Fonctionnalités/Parcours (lint-specs bloquant : pas de chemins/colonnes).
- `docs/specs/index.json` — bump `jobs.last_updated = 2026-05-31`.
- `docs/architecture/pipelines.yaml` — entrée `jobs_radar_routine` : nb requêtes / role set.
- `docs/architecture/decisions.md` — **ADR-22** : EM = rôle cible, scope tech-only, exclusion conseil maintenue, catégorie `em`, backfill curé.
- `docs/architecture/dependencies.yaml` — seulement si `columns_notable` du `jobs` change (a priori non).

### 6. Validation
- CI bloquantes : **`lint-specs`** (docs/specs/**), **`validate-arch`** (docs/architecture/** : champs requis + fichiers référencés existent). `arch-drift-check` warning.
- Vérif fonctionnelle (le front se vérifie **en prod**, pas en local) : push `main` → hard-refresh Pages → contrôler le chip « EM » dans les filtres + `SELECT count(*) FROM jobs WHERE role_category='em'` via MCP.

## Hors périmètre

- **Blocage cloud JSearch `403 Host not in allowlist`** (ADR-21) : les runs cloud (cron) échouent déjà ; les nouvelles requêtes ne s'exécuteront qu'en local / sur une IP allowlistée tant que ce n'est pas réactivé. Cette feature **n'aggrave ni ne résout** ce problème.
- Assouplir l'exclusion conseil (périmètre (a)/MBB) — explicitement écarté.
- Recalibrage hebdo automatique du stock — reste un chantier futur (ADR-21).

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| `delivery manager` très ESN-heavy en France → bruit + quota. | Les ESN sont archivés par les règles (leads sûrs) ; quota 191/200 maîtrisé. Repli : retomber à 1 requête si le quota se tend. |
| EM tech = parfois RUN client → faux négatifs ou faux positifs au scoring. | Red flag explicite « RUN client pur / staffing » + exigence IA-au-cœur ; calibrage via `job_pref_observed` au fil des verdicts. |
| Catégorie `em` polluée par d'anciens ESN au backfill. | Backfill **curé** (liste blanche d'employeurs tech), pas de `LIKE` aveugle. |
| Divergence fichier-miroir vs trigger live. | Pousser le prompt via `RemoteTrigger` dans le même geste que l'édition du `.md`. |
