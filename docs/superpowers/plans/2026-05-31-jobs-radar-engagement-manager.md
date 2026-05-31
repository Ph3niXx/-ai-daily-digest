# Jobs Radar — Engagement Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Note** : ce plan est surtout des éditions de doc/config + opérations DB (MCP Supabase) + push routine live (RemoteTrigger) + vérif en prod. Il n'y a **pas de tests unitaires** sur ce module ; la « vérification » de chaque tâche = lints CI locaux + requêtes MCP + contrôle visuel en prod.

**Goal:** Faire de l'« engagement / delivery / transformation manager en boîte tech/produit/IA crédible » un rôle cible à part entière du Jobs Radar — trouvé (2 requêtes JSearch), scoré équitablement (plus pénalisé comme du RUN), isolable (catégorie `em` dédiée) — sans toucher à l'exclusion `conseil/ESN`.

**Architecture:** Le radar = une routine Claude Code distante (miroir versionné `docs/cowork-routines/jobs-radar.md` ↔ trigger live) qui écrit `jobs`/`job_scans` via MCP Supabase, + un front no-build (React via Babel CDN) qui lit `jobs`. La feature touche : 1 valeur d'enum SQL, le prompt de la routine (+ push live), 3 points du front, et les docs cardinales (spec, index, pipelines.yaml, ADR-22). Un backfill MCP curé rattrape le stock existant.

**Tech Stack:** Postgres (Supabase, projet `mrmgptqpflzyavdfqwwv`) · React 18 + @babel/standalone (no build) · MCP Supabase `execute_sql`/`apply_migration` · `RemoteTrigger` (routine claude.ai) · scripts Python de lint (`scripts/`) · `node scripts/sync-sw.mjs`.

**Branche :** `feat/jobs-radar-engagement-manager` (déjà créée, design doc committé dessus).

**Découpage des commits (règle cardinale : code + sa doc dans le MÊME commit) :**
- **Commit A** (Tâche 1) — schéma : `sql/017_jobs_em_category.sql` + `jarvis/migrations/008_jobs_radar.sql`.
- **Commit B** (Tâches 2+3) — back/pipeline + arch : `docs/cowork-routines/jobs-radar.md` + `docs/architecture/pipelines.yaml` + `docs/architecture/decisions.md` (ADR-22). Puis push live (hors commit).
- **Commit C** (Tâches 4+5) — panel/onglet + spec : `cockpit/panel-jobs-radar.jsx` + `cockpit/lib/data-loader.js` + sortie `scripts/sync-sw.mjs` (`index.html`/`sw.js`) + `docs/specs/tab-jobs.md` + `docs/specs/index.json`.
- **Tâche 6** — backfill MCP (opération DB, pas de commit).
- **Tâche 7** — vérification finale (prod + MCP).

---

## Task 1 : Migration — ajouter la valeur `em` à l'enum `role_category`

**Files:**
- Create: `sql/017_jobs_em_category.sql`
- Modify: `jarvis/migrations/008_jobs_radar.sql:16`
- DB: appliquer via MCP `apply_migration` sur `mrmgptqpflzyavdfqwwv`

Contrainte live actuelle (vérifiée 2026-05-31) : `jobs_role_category_check = CHECK (role_category = ANY (ARRAY['produit','rte','pgm','pjm','cos']))`. C'est une simple liste blanche → drop + recreate.

- [ ] **Step 1 : Créer le fichier de migration**

`sql/017_jobs_em_category.sql` :
```sql
-- 017_jobs_em_category.sql — ajoute la valeur 'em' (Engagement/Delivery Manager) à l'enum role_category.
-- Voir ADR-22 (2026-05-31). Idempotent : DROP IF EXISTS puis recreate.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_role_category_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_role_category_check
  CHECK (role_category IN ('produit','rte','pgm','pjm','cos','em'));
```

- [ ] **Step 2 : Mettre à jour le fichier source du schéma (cohérence doc)**

Dans `jarvis/migrations/008_jobs_radar.sql`, ligne 16 :
- Remplacer `  role_category     text check (role_category in ('produit','rte','pgm','pjm','cos')),`
- Par `  role_category     text check (role_category in ('produit','rte','pgm','pjm','cos','em')),`

- [ ] **Step 3 : Appliquer en prod via MCP**

Outil `mcp__claude_ai_Supabase__apply_migration`, `project_id: mrmgptqpflzyavdfqwwv`, `name: "jobs_em_category"`, `query` = le contenu du `.sql` ci-dessus.

- [ ] **Step 4 : Vérifier la contrainte (= le test)**

`mcp__claude_ai_Supabase__execute_sql` :
```sql
select pg_get_constraintdef(con.oid)
from pg_constraint con join pg_class rel on rel.oid=con.conrelid
where rel.relname='jobs' and con.conname='jobs_role_category_check';
```
Attendu : la def contient `'em'`. Optionnel : `select 'em'::text in (select unnest(enum_range)) ;` non applicable (CHECK, pas type enum) → la vérif de la def suffit.

- [ ] **Step 5 : Commit A**

```bash
git add sql/017_jobs_em_category.sql jarvis/migrations/008_jobs_radar.sql
git commit -m "feat(jobs): migration 017 — valeur role_category 'em' (ADR-22)"
```

---

## Task 2 : Routine — prompt miroir `jobs-radar.md` + push live

**Files:**
- Modify: `docs/cowork-routines/jobs-radar.md` (lignes 12, 30, 60, 62, 73, 75, 85, 86, bloc « Dernière MAJ »)
- Live: `RemoteTrigger` `trig_01JtTsMm27eTAGxR5po5KmMQ`

⚠️ Le bloc « Prompt de la routine » (lignes 47-102) est en **ASCII non accentué** (c'est le prompt live). Toute insertion DANS ce bloc reste ASCII. Le préambule et « Dernière MAJ » (hors bloc) sont accentués.

- [ ] **Step 1 : Préambule — quota (ligne 12)**

Remplacer `9 requêtes × 4 runs ≈ **156 req/mois** (sous le quota).`
Par `11 requêtes × 4 runs ≈ **191 req/mois** (sous le quota 200, ADR-22).`

- [ ] **Step 2 : Contrat de données — enum (ligne 30)**

Remplacer `- `role_category` ∈ {produit,rte,pgm,pjm,cos} ; `company_stage` ∈ {seed,A,B,C,scale,grand_groupe}.`
Par `- `role_category` ∈ {produit,rte,pgm,pjm,cos,em} ; `company_stage` ∈ {seed,A,B,C,scale,grand_groupe}.`

- [ ] **Step 3 : ÉTAPE 1 — compte de requêtes (ligne 60)**

Remplacer `ETAPE 1 — Fetch JSearch (9 requetes, via Bash curl). Pour chaque requete, lance :`
Par `ETAPE 1 — Fetch JSearch (11 requetes, via Bash curl). Pour chaque requete, lance :`

- [ ] **Step 4 : ÉTAPE 1 — liste des requêtes (ligne 62)**

À la fin de la phrase « Requetes (...) : … ; product manager intelligence artificielle. », **avant le point final**, ajouter les deux requêtes. Résultat (fin de ligne) :
`… ; AI program manager in France ; product manager intelligence artificielle ; engagement manager Paris ; delivery manager Paris.`

- [ ] **Step 5 : ÉTAPE 3 — Rôles cibles (ligne 73)**

À la fin du paragraphe « Roles cibles … pas du RUN. », ajouter une phrase (ASCII) :
`Engagement / Delivery / Transformation Manager est aussi une cible UNIQUEMENT si la boite est tech/IA credible ET le role porte un angle produit/transfo/IA avec ownership (ni implementation client pure RUN, ni ESN/staffing/body-shopping).`

- [ ] **Step 6 : ÉTAPE 3 — Red flags (ligne 75)**

Remplacer la fin de la ligne `… ; coordination sans objectifs metier/produit.`
Par `… ; coordination sans objectifs metier/produit ; engagement/delivery manager en implementation client pure (RUN) ou body-shopping ESN.`

- [ ] **Step 7 : ÉTAPE 3 — Band salaire (ligne 85)**

Dans la parenthèse des bandes inférées `(Head of Product 110-150 ; Senior PM 80-115 ; RTE 85-120 ; Sr PgM 90-125 ; CoS 90-140 k€)`, insérer avant `CoS` :
`… ; Sr PgM 90-125 ; Engagement/Delivery Mgr 85-120 ; CoS 90-140 k€)`.

- [ ] **Step 8 : ÉTAPE 3 — classification role_category (ligne 86)**

Remplacer `Classe aussi role_category parmi produit, rte, pgm, pjm, cos ;`
Par `Classe aussi role_category parmi produit, rte, pgm, pjm, cos, em (em = engagement/delivery/transformation manager en boite tech/IA credible) ;`

- [ ] **Step 9 : Bloc « Dernière MAJ » — nouvelle entrée en tête**

Juste sous la ligne `## Dernière MAJ`, insérer :
```
2026-05-31 — **Engagement Manager comme rôle cible (ADR-22)** : ÉTAPE 1 passe à **11 requêtes** (+ `engagement manager Paris`, `delivery manager Paris`) ; ÉTAPE 3 ajoute EM/delivery/transfo manager aux « Roles cibles » (si boîte tech/IA crédible + angle produit/transfo/IA, pas de RUN client pur ni ESN) + red flag dédié + band salaire EM 85-120 k€ ; nouvelle valeur `role_category` **`em`** (migration `sql/017_jobs_em_category.sql`). Exclusion conseil/ESN **maintenue**. Quota ≈ 191/mois. Prompt live MAJ via `RemoteTrigger`. Backfill curé du stock (Workday…). Voir ADR-22.
```

- [ ] **Step 10 : Push live (get → edit → update, pour préserver la clé inline)**

⚠️ Le fichier caviarde la clé RapidAPI (`<CLE_RAPIDAPI>`, 2×). **Ne jamais** pousser le bloc du fichier tel quel (ça effacerait la clé). Procéder ainsi :
1. `RemoteTrigger get` `trigger_id: trig_01JtTsMm27eTAGxR5po5KmMQ` → récupérer le `prompt` live (avec la vraie clé).
2. Appliquer au texte live **exactement** les mêmes éditions qu'aux steps 3-8 (11 requetes, +2 requêtes, +rôle cible EM, +red flag, +band salaire, +`em` dans la classification). Ne toucher à rien d'autre.
3. `RemoteTrigger update` `trigger_id: …`, `prompt: <texte édité>`. **Ne pas** toucher `enabled`/`cron`.
4. Vérifier : `RemoteTrigger get` et confirmer que le prompt contient `engagement manager Paris` et `role_category parmi produit, rte, pgm, pjm, cos, em`.

- [ ] **Step 11** : (pas de commit ici — `jobs-radar.md` sera committé dans le Commit B avec l'arch, Tâche 3.)

---

## Task 3 : Arch docs — `pipelines.yaml` + ADR-22, puis Commit B

**Files:**
- Modify: `docs/architecture/pipelines.yaml:266,277`
- Modify: `docs/architecture/decisions.md` (insérer ADR-22 après ADR-21, ~ligne 132)

- [ ] **Step 1 : `pipelines.yaml` — input_api (ligne 266)**

Remplacer `~156 req/mois sous quota 200` par `~191 req/mois sous quota 200`.

- [ ] **Step 2 : `pipelines.yaml` — notes (ligne 277)**

Dans le champ `notes:`, remplacer `9 requêtes validées (5 IA, requête complète sans suffixe 'in France', ADR-21)`
Par `11 requêtes validées (5 IA + 2 EM/delivery, ADR-22 ; requête complète sans suffixe 'in France', ADR-21)`.
Puis, à la fin du `notes:` (avant le guillemet fermant), ajouter : ` v2.3 (ADR-22) : Engagement/Delivery Manager = rôle cible (scope tech/IA, exclusion conseil/ESN maintenue), valeur role_category 'em'.`

- [ ] **Step 3 : `decisions.md` — insérer ADR-22 après le dernier addendum d'ADR-21**

Insérer (heading niveau `##`, même format que ADR-21) :
```markdown
## ADR-22 · 2026-05-31 · Jobs Radar — Engagement Manager comme rôle cible (scope tech/IA)

- **Contexte** : Jean (RTE, ex-manager PwC Digital) veut suivre les postes d'« engagement manager », alignés avec son poste actuel. Le radar (1) ne les cherche pas (aucune requête `engagement`/`delivery`), (2) les sous-note (rubric favorise BUILD/TRANSFO, pénalise le RUN : Workday « Sr Engagement Manager – AI Practice EMEA » = 3.5 → archived, vérifié en base), (3) ne permet pas de les isoler (`role_category` sans valeur dédiée). Ambiguïté du titre : « Engagement Manager » = standard du conseil MBB (**éliminatoire** chez Jean, ADR-21) OU lead delivery/transfo chez un éditeur tech (aligné RTE).
- **Décision** : périmètre **tech/produit/IA uniquement** — exclusion `conseil/ESN` (`job_pref_rules`, autorité absolue) **maintenue**. (1) **ÉTAPE 1 : 9 → 11 requêtes** (+ `engagement manager Paris`, `delivery manager Paris`). (2) **ÉTAPE 3** : EM/delivery/transformation manager devient un **rôle cible** si boîte tech/IA crédible + angle produit/transfo/IA avec ownership ; red flag explicite « RUN client pur / ESN-staffing » ; band salaire EM 85-120 k€. (3) **Nouvelle valeur `role_category` `em`** (migration `sql/017_jobs_em_category.sql`) + chip de filtre + label « EM » côté front (`panel-jobs-radar.jsx` + `CAT_DEF` de `data-loader.js`). (4) **Backfill curé one-shot** (MCP) : re-tag + re-score les seuls EM/delivery en boîte tech crédible ; conseil/ESN restent archivés et non re-taggés. Appliqué au prompt **live** via `RemoteTrigger update` (miroir [docs/cowork-routines/jobs-radar.md](../cowork-routines/jobs-radar.md)).
- **Conséquences** : quota JSearch ≈ **191 req/mois** (sous 200, ADR-20). Comme ADR-21, le scoring ne re-score pas le stock automatiquement → backfill **manuel et curé** (pas de `LIKE` aveugle ; la catégorie `em` ne reçoit que des boîtes tech crédibles). Statut user-owned jamais écrasé au backfill : flip `archived → new` **seulement si `user_verdict IS NULL`**. Blocage cloud JSearch `403` (ADR-21) **inchangé** : les nouvelles requêtes ne s'exécutent qu'en local / IP allowlistée. `pipelines.yaml` + `tab-jobs.md` + `index.json` mis à jour. Hors périmètre : assouplir l'exclusion conseil (MBB) ; refonte rubric FIT ; re-scoring hebdo automatique.
```

- [ ] **Step 4 : Valider l'architecture (= le test)**

Run: `python scripts/validate_architecture.py`
Attendu : exit 0 (champs requis présents, fichiers référencés existent). Si KO, corriger l'indentation/les champs.

- [ ] **Step 5 : Commit B**

```bash
git add docs/cowork-routines/jobs-radar.md docs/architecture/pipelines.yaml docs/architecture/decisions.md
git commit -m "feat(jobs): EM = rôle cible — routine 11 requêtes + scoring + ADR-22"
```

---

## Task 4 : Front — catégorie `em` (3 éditions) + service worker

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx:44` (CAT_LABEL) et `:1031-1038` (FilterGroup catFilter)
- Modify: `cockpit/lib/data-loader.js:1677-1683` (CAT_DEF)
- Run: `node scripts/sync-sw.mjs`

- [ ] **Step 1 : `panel-jobs-radar.jsx` — CAT_LABEL (ligne 44-50)**

Ajouter la ligne `em` au dict :
```js
const CAT_LABEL = {
  produit: "Produit",
  rte:     "RTE",
  pgm:     "PgM",
  pjm:     "PjM",
  cos:     "CoS",
  em:      "EM",
};
```

- [ ] **Step 2 : `panel-jobs-radar.jsx` — chip de filtre (lignes 1031-1038)**

Ajouter l'option `em` au `FilterGroup` catFilter, après `cos` :
```js
              options={[
                { id: "all",     label: "Tous rôles" },
                { id: "produit", label: "Produit" },
                { id: "rte",     label: "RTE" },
                { id: "pgm",     label: "PgM" },
                { id: "pjm",     label: "PjM" },
                { id: "cos",     label: "CoS" },
                { id: "em",      label: "EM" },
              ]}
```

- [ ] **Step 3 : `data-loader.js` — CAT_DEF du scan banner (lignes 1677-1683)**

Ajouter `em` pour que la « Répartition catégories » l'affiche :
```js
    const CAT_DEF = [
      { id: "produit", label: "Produit" },
      { id: "rte",     label: "RTE" },
      { id: "pgm",     label: "PgM" },
      { id: "pjm",     label: "PjM" },
      { id: "cos",     label: "CoS" },
      { id: "em",      label: "EM" },
    ];
```

- [ ] **Step 4 : Régénérer le service worker (= le test front #1)**

Run: `node scripts/sync-sw.mjs`
Attendu : sortie indiquant `sw.js` régénéré (le hash/manifeste `STATIC[]`/`CACHE` est mis à jour automatiquement). Ne jamais éditer `sw.js` à la main.

- [ ] **Step 5 : Sanity grep (= test front #2)**

Run: `git grep -n "em:      \"EM\"" cockpit/panel-jobs-radar.jsx` et `git grep -n "id: \"em\"" cockpit/`
Attendu : 1 hit dans CAT_LABEL, 1 dans le FilterGroup, 1 dans CAT_DEF.

- [ ] **Step 6** : (pas de commit ici — front committé dans le Commit C avec la spec, Tâche 5.)

---

## Task 5 : Spec onglet — `tab-jobs.md` + `index.json`, puis Commit C

**Files:**
- Modify: `docs/specs/tab-jobs.md` (lignes 14, 48, 92, 100, bloc « Dernière MAJ »)
- Modify: `docs/specs/index.json` (entrée `jobs`, ligne ~213)

⚠️ `lint-specs` est **bloquant** : pas de chemins/colonnes techniques dans les sections « Fonctionnalités »/« Parcours ». Les lignes 14/48/92/100 sont dans Parcours/Back — garder le style existant (la ligne 92 est déjà technique, c'est la section Back).

- [ ] **Step 1 : Ligne 14 (Parcours — répartition par catégorie)**

Remplacer `… répartition par catégorie de rôle (Produit / RTE / PgM / PjM / CoS) …`
Par `… répartition par catégorie de rôle (Produit / RTE / PgM / PjM / CoS / EM) …`

- [ ] **Step 2 : Ligne 48 (Back — composition DOM)**

Remplacer `  - `.jr-scan-block` répartition catégories (5 `.jr-ratbar`)`
Par `  - `.jr-scan-block` répartition catégories (6 `.jr-ratbar`)`

- [ ] **Step 3 : Ligne 92 (Back — contrat table `jobs`)**

Remplacer `role_category (produit/rte/pgm/pjm/cos)` par `role_category (produit/rte/pgm/pjm/cos/em)`.

- [ ] **Step 4 : Ligne 100 (Back — pipeline / requêtes)**

Remplacer toute la parenthèse `8 requêtes-rôles (`product manager`, …, `generative AI product manager` — réorientation IA ADR-21)``
Par `11 requêtes-rôles (dont les nouvelles `engagement manager`, `delivery manager` pour la catégorie EM — ADR-22 ; liste complète : docs/cowork-routines/jobs-radar.md), `num_pages=1`, `country=fr``.
(Note : on ne ré-énumère pas les 8 anciennes — la routine est la source de vérité de la liste ; on corrige juste le compte et on signale les nouvelles.)

- [ ] **Step 5 : Bloc « Dernière MAJ » — nouvelle entrée en tête (sous `## Dernière MAJ`)**

```
2026-05-31 — **Engagement Manager = rôle cible (ADR-22)** : la routine suit désormais les postes d'engagement / delivery / transformation manager en boîte tech/produit/IA crédible — 2 requêtes ajoutées, scoring qui ne les pénalise plus comme du « RUN », nouvelle catégorie « EM » (filtre + répartition du scan banner). Exclusion conseil/ESN inchangée. Migration `sql/017_jobs_em_category.sql`. Voir ADR-22.
```

- [ ] **Step 6 : `index.json` — bump `last_updated` de l'entrée `jobs`**

Dans l'objet `{ "slug": "jobs", … }`, remplacer `"last_updated": "2026-05-29"` par `"last_updated": "2026-05-31"`.

- [ ] **Step 7 : Linter les specs (= le test)**

Run (dans cet ordre, corriger au premier échec) :
```
python scripts/validate_spec.py
python scripts/lint_specs_produit.py
python scripts/lint_known_sections.py
```
Attendu : exit 0 pour chacun. (Si un script prend un argument de chemin, le lancer sur `docs/specs/tab-jobs.md` / `docs/specs/index.json`.)

- [ ] **Step 8 : Commit C**

```bash
git add cockpit/panel-jobs-radar.jsx cockpit/lib/data-loader.js index.html sw.js docs/specs/tab-jobs.md docs/specs/index.json
git commit -m "feat(jobs): catégorie EM côté front (chip + scan banner) + spec"
```
(Ajuster les chemins du SW si `sync-sw.mjs` écrit ailleurs que `sw.js`/`index.html` — vérifier `git status` avant.)

---

## Task 6 : Backfill curé du stock (one-shot MCP — pas de commit)

**But :** re-tagger `em` + re-scorer **uniquement** les EM/delivery déjà en base qui sont en boîte tech/IA crédible. Les conseil/ESN restent intacts (archivés, non re-taggés). La routine ne re-score jamais une offre connue → c'est un geste manuel.

⚠️ Jugement requis : **curation à la main**, pas de `UPDATE … WHERE title LIKE` aveugle. On ne re-fetch pas la JD (non stockée) → re-score à partir des signaux stockés (`title`, `company`, `pitch`, `intel.skills_required`, `rubric_justif`) + `job_pref_rules`.

- [ ] **Step 1 : Lister les candidats**

`mcp__claude_ai_Supabase__execute_sql` :
```sql
select id, title, company, role_category, score_seniority, score_sector, score_impact,
       score_total, status, user_verdict, pitch
from jobs
where (title ilike '%engagement manager%' or title ilike '%delivery manager%'
       or title ilike '%delivery lead%' or title ilike '%transformation manager%')
order by score_total desc nulls last;
```

- [ ] **Step 2 : Curer (décider à la main)**

Garder pour re-tag/re-score **seulement** si l'employeur est une boîte tech/produit/IA crédible ET le rôle a un angle produit/transfo/IA (pas RUN client pur, pas ESN/staffing). Référence (vu le 2026-05-31) :
- **OUI** : Workday « Sr Engagement Manager – AI Practice EMEA » (SaaS RH/Finance + AI Practice) ; Ledger « Senior Delivery Manager » **si** le pitch confirme un scope produit/transfo (sinon laisser).
- **NON (laisser tels quels, archivés)** : Oliver Wyman, « Cabinet conseil », MIGSO-PCUBED, Onepoint, Adone Conseil, Theodo, EPAM, BayBridgeDigital (conseil/ESN) ; SimCorp/Thales/Chanel/HSBC/Stellantis/Klarna/Crédit Agricole (RUN/intégration/non-tech-core).
- **Faux positifs sémantiques (ne pas toucher)** : Crypto.com « Product Director, **Banking Engagement** » = produit, pas EM.

- [ ] **Step 3 : Re-tag + re-score chaque ligne curée**

Pour chaque `id` retenu, recalculer les axes selon la rubric + `job_pref_rules` (EM tech crédible = cible légitime), puis :
```sql
update jobs set
  role_category = 'em',
  score_seniority = <s>, score_sector = <se>, score_impact = <i>,
  score_total = round((<s> + <se> + <i>)::numeric, 1),
  rubric_justif = jsonb_build_object(
    'seniority', '<justif>', 'sector', '<justif>', 'impact', '<justif>',
    'calibrage', 'Re-scoré ADR-22 : EM/delivery en boîte tech crédible = cible légitime (plus pénalisé comme RUN).'),
  status = case when user_verdict is null and round((<s> + <se> + <i>)::numeric,1) >= 5
                then 'new' else status end,
  updated_at = now()
where id = '<uuid>';
```
**Garde-fou** : ne JAMAIS écraser `status` si `user_verdict IS NOT NULL` (la clause `case` ci-dessus s'en charge) ; ne pas toucher `user_notes`/`user_verdict*`/`closed_at`.

- [ ] **Step 4 : Vérifier le backfill**

```sql
select role_category, count(*), round(avg(score_total),1)
from jobs where role_category='em' group by role_category;
```
Attendu : `em` existe avec le nombre de lignes curées et un score moyen cohérent (les tech crédibles remontés ≥ 5).

---

## Task 7 : Vérification finale (prod + intégration)

- [ ] **Step 1 : Pousser la branche**

```bash
git push -u origin feat/jobs-radar-engagement-manager
```
(Le front se vérifie en **prod** sur GitHub Pages, pas en local — donc soit merger sur `main`, soit, si Pages sert `main` uniquement, ouvrir la PR puis merger après revue. Suivre la préférence de Jean à ce stade.)

- [ ] **Step 2 : Vérif front en prod (après déploiement Pages + hard-refresh)**

- Onglet Jobs Radar → filtres : le chip **« EM »** apparaît dans « Tous rôles ».
- Cliquer « EM » → la liste se filtre sur `role_category='em'` (montre les lignes backfillées).
- Scan banner → « Répartition catégories » affiche **6** barres (EM incluse, avec son %).
- Une carte EM (ex. Workday) affiche le tag « EM ».

- [ ] **Step 3 : Vérif données (MCP)**

```sql
select count(*) filter (where role_category='em') as em_rows,
       count(*) filter (where role_category='em' and status='new') as em_new
from jobs;
```
Attendu : `em_rows` = nb curé ; `em_new` ≥ ceux remontés à ≥ 5.

- [ ] **Step 4 : Vérif routine live**

`RemoteTrigger get` → confirmer que le prompt contient `engagement manager Paris`, `delivery manager Paris`, `11 requetes`, et `role_category parmi produit, rte, pgm, pjm, cos, em`. (Rappel : les runs cloud échouent en `403`, ADR-21 — les nouvelles requêtes ne s'exécuteront qu'au prochain scan local / IP allowlistée. C'est attendu, hors périmètre.)

- [ ] **Step 5 : Récap à Jean**

Résumer : ce qui a changé, le nb de lignes EM backfillées + leurs nouveaux scores, et le rappel que le radar ne ramènera de **nouvelles** offres EM qu'aux scans où le fetch JSearch passe (local/allowlist tant que le 403 cloud n'est pas levé).

---

## Self-review (couverture spec → plan)

| Exigence du design | Tâche |
|---|---|
| Périmètre tech/IA only, exclusion conseil/ESN intacte | T2 (ÉTAPE 3 rôle cible conditionnel + red flag), ADR-22 (T3) |
| Scoring : EM = cible légitime si tech/IA crédible | T2 steps 5-6, backfill T6 |
| 2 requêtes `engagement manager Paris` + `delivery manager Paris` | T2 steps 3-4, push live step 10 |
| Catégorie `em` (enum + chip + label) | T1 (enum), T4 (CAT_LABEL + filtre + CAT_DEF) |
| Band salaire EM | T2 step 7 |
| Backfill curé re-tag + re-score, statut user-owned préservé | T6 |
| Docs cardinales (spec, index, pipelines, ADR-22) | T3, T5 |
| Service worker resync | T4 step 4 |
| Quota 191/200 reflété | T2 step 1, T3 steps 1-2 |
| Vérif prod + MCP | T7 |
| Hors périmètre 403 cloud signalé | ADR-22, T7 step 4-5 |
