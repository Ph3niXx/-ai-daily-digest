> # ⚠️ SUPERSEDED (2026-05-28) — plan non implémenté
>
> Ce plan décrit un moteur **GitHub Actions + Gemini gratuit** qui **n'a jamais été construit** (aucun `pipelines/jobs_radar.py`, aucun workflow `jobs_radar.yml`, aucun appel Gemini). Le pivot reposait sur la crainte qu'un agent distant ne puisse pas s'authentifier — contournée autrement : la clé RapidAPI vit **inline dans le prompt** de la routine, Supabase est joint par **connecteur MCP**, et le **plan Max** couvre le coût (donc pas besoin de Gemini).
>
> **Ce qui a réellement shippé** = la **routine Claude Code distante** du design [2026-05-27](../specs/2026-05-27-jobs-radar-api-migration-design.md) (JSearch + Sonnet 4.6 + MCP Supabase), documentée dans [ADR-19](../../architecture/decisions.md) et [docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md). Conservé ci-dessous comme trace de la décision.

---

# Jobs Radar — Migration routine (GitHub Actions + Gemini gratuit) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`).

**Goal:** Remplacer la routine Cowork (Sonnet + navigateur + LinkedIn) par un pipeline GitHub Actions cron **0 €/run** qui lit l'API JSearch, score/extrait les skills via **Gemini Flash-Lite (tier gratuit)**, et écrit `jobs` + `job_scans`.

**Architecture :**
```
cron GitHub Actions  (0 6 * * 1,3,5,0  → lun/mer/ven/dim 08h Paris)
  └─ pipelines/jobs_radar.py
       1. fetch JSearch — 5 rôles × num_pages=1 (RAPIDAPI_KEY)
       2. dédup sur linkedin_job_id (= JSearch job_id) vs jobs récents
       3. NOUVELLES offres uniquement → Gemini Flash-Lite (batché) :
          score rubric /10 + rubric_justif (clés plates) + skills_required[{name,on_cv}]
          + salary_estimate ; calibré par job_pref_rules/observed + skill_radar/user_profile
       4. INSERT jobs (status new/archived) ; offres déjà connues → PATCH last_seen_date
       5. UPSERT job_scans (scan du jour)
```
**Coût : 0 €** (GH Actions gratuit + JSearch free tier + Gemini free tier + Supabase). Aucune clé payante.

**Tech Stack :** Python 3.11, `requests` (JSearch + Supabase REST), `google-genai` (Gemini), GitHub Actions. Réutilise les patterns de `main.py` (Gemini) et `weekly_analysis.py` (Supabase REST).

**Décision de moteur (≠ design initial) :** le design disait « routine Claude Code distante ». En vérifiant le mécanisme, un agent distant **ne peut pas lire les secrets GitHub** → on bascule sur un **cron GitHub Actions** (comme `main.py`/`weekly`), qui réutilise `RAPIDAPI_KEY` (ajouté par l'user) + secrets existants. Et **Gemini gratuit** au lieu de Claude (contrainte « pas de coût »). Documenté en **ADR-19** (T8) + design doc mis à jour (T9).

---

## Contrat de données (partagé avec le front, déjà livré au plan 1)

Le pipeline écrit dans `jobs` (REST, `on_conflict=linkedin_job_id`) :
- Colonnes scoring : `score_seniority` (/3), `score_sector` (/3), `score_impact` (/4), `score_bonus`, `score_total` (/10).
- `rubric_justif` jsonb — **clés plates figées** : `{ "seniority": str, "sector": str, "impact": str, "bonus"?: str, "calibrage"?: str }` (transformJobRubric attend ça — toute autre forme a déjà crashé le front le 12/05).
- `intel` jsonb : `{ "salary_estimate": {min,max,target,currency,basis,rationale} | null, "skills_required": [{ "name": str, "on_cv": bool }] }`.
- `intel_depth` : `'light'` (plus jamais `'deep'`, plus de warm intel).
- `role_category` ∈ {produit,rte,pgm,pjm,cos} ; `company_stage` ∈ {seed,A,B,C,scale,grand_groupe}.
- `linkedin_job_id` (UNIQUE) = `job_id` JSearch ; `url` = `job_apply_link`.
- **Jamais écrit/écrasé** : `status`*, `user_notes`, `user_verdict*`, `closed_at` (\*sauf `status` à la création). `cv_recommended`/`cv_reason` **non écrits** (reco CV abandonnée).

`job_scans` (upsert sur `scan_date`) : `raw_count`, `dedup_strict_count`, `processed_count`, `hot_leads_count`, `tendances` (jsonb minimal — le front recalcule volumes/ratios), `actions` (jsonb, `[]` par défaut). **Pas de `signal_cv`** (front l'a retiré au plan 1).

**Profil pour le match `on_cv`** : pas de fichier CV dans le cloud → le matching skills se fait contre `skill_radar` (axes + forces/lacunes) + toutes les clés `user_profile`. Limitation assumée (v1) : moins riche que les CV ; améliorable en ajoutant une clé `user_profile.cv_summary`.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `pipelines/jobs_radar.py` | Create | Le pipeline (fetch → score → write) |
| `pipelines/requirements-jobs.txt` | Create | `requests` + `google-genai` |
| `.github/workflows/jobs_radar.yml` | Create | Cron 4×/sem + secrets env |
| `docs/secrets.md` | Modify | Entrée `RAPIDAPI_KEY` |
| `docs/cowork-routines/jobs-radar.md` | Modify | Réécriture : décrit le pipeline GH Actions (plus Cowork) |
| `docs/architecture/pipelines.yaml` | Modify | Entrée `jobs_radar` ; `cowork_external` → archivé |
| `docs/architecture/dependencies.yaml` | Modify | `jobs`/`job_scans` owner → `jobs_radar` ; note `skills_required` |
| `docs/architecture/decisions.md` | Modify | ADR-19 |
| `docs/superpowers/specs/2026-05-27-jobs-radar-api-migration-design.{md,html}` | Modify | Moteur : routine distante → GH Actions + Gemini |

---

## Task 1: Secret `RAPIDAPI_KEY` dans la doc

**Files:** Modify `docs/secrets.md`

- [ ] **Step 1** : sous la section « Cockpit core », ajouter la ligne :

```markdown
| `RAPIDAPI_KEY` | RapidAPI (JSearch Jobs API, tier gratuit) — `pipelines/jobs_radar.py` (Jobs Radar) |
```

- [ ] **Step 2 — Commit** : `git add docs/secrets.md && git commit -m "docs(secrets): RAPIDAPI_KEY (JSearch, Jobs Radar)"`

---

## Task 2: Dépendances du pipeline

**Files:** Create `pipelines/requirements-jobs.txt`

- [ ] **Step 1** : créer le fichier :

```
requests==2.32.3
google-genai>=1.0.0
```

- [ ] **Step 2 — Commit** : `git add pipelines/requirements-jobs.txt && git commit -m "build(jobs): requirements pipeline jobs_radar"`

---

## Task 3: Le pipeline `pipelines/jobs_radar.py`

**Files:** Create `pipelines/jobs_radar.py`

**Helpers réutilisés tels quels** (recopier depuis les sources, vérifiés au build) :
- `sb_get(table, params)`, `sb_post(table, data, upsert)`, `sb_patch(table, filters, data)` — pattern REST de `weekly_analysis.py` (headers `apikey`+`Bearer SUPABASE_SERVICE_KEY`).
- Client Gemini + `safe_json_parse(text)` — pattern de `main.py` (`genai.Client(api_key=GEMINI_API_KEY)`, `client.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)`, `response.text`, strip ```` ``` ````).
- Log optionnel dans `gemini_api_calls` (cohérence avec main.py — peut être omis en v1).

- [ ] **Step 1 : Config + constantes**

```python
RAPIDAPI_KEY   = os.environ["RAPIDAPI_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ["SUPABASE_KEY"]

GEMINI_MODEL    = "gemini-2.5-flash-lite"
JSEARCH_HOST    = "jsearch.p.rapidapi.com"
JSEARCH_COUNTRY = "fr"
ROLE_QUERIES = [
    "product manager", "senior program manager", "transformation program manager",
    "release train engineer", "chief of staff",
]
BATCH_SIZE = 8           # offres par appel Gemini (limite le nb d'appels)
DEDUP_WINDOW_DAYS = 30   # fenêtre de dédup sur linkedin_job_id
```

- [ ] **Step 2 : `fetch_jsearch(query)`**

```python
def fetch_jsearch(query):
    """Une requête JSearch (num_pages=1, ~10 offres). Retourne [] en cas d'échec (pas de raise)."""
    try:
        r = requests.get(
            f"https://{JSEARCH_HOST}/search",
            headers={"X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": JSEARCH_HOST},
            params={"query": f"{query} in {JSEARCH_COUNTRY}", "page": "1", "num_pages": "1", "country": JSEARCH_COUNTRY},
            timeout=30,
        )
        if r.status_code != 200:
            print(f"   [WARN] JSearch '{query}' → {r.status_code}")
            return []
        return r.json().get("data", []) or []
    except Exception as e:
        print(f"   [WARN] JSearch '{query}' exception: {e}")
        return []
```

- [ ] **Step 3 : Contexte de calibrage** — `load_context()` lit `user_profile` (toutes clés, surtout `job_pref_rules`/`job_pref_observed`), `skill_radar`, et les verdicts récents (`jobs` où `user_verdict` non null, 90j). Construit un bloc texte « PROFIL + PRÉFÉRENCES » injecté dans le prompt. (Reprend l'Étape 0 de la routine v3.2.)

- [ ] **Step 4 : `score_batch(offers, context)` — le cœur**

Construit le prompt système (rubric + calibrage + contrat JSON) et envoie un batch d'offres à Gemini. Le **prompt système** (porté des Étapes 0/3/4.5 + skills) :

```
Tu es l'analyste du radar de jobs de Jean (Release Train Engineer, ex-manager PwC Digital,
SAFe, vise des rôles produit/programme/transfo à Paris). Score chaque offre selon la rubric
STRICTE ci-dessous, en tenant compte du PROFIL et des PRÉFÉRENCES fournis.

RÔLES CIBLES : Senior/Lead/Head Product Manager, Chief of Staff (C-suite), Release Train
Engineer (si train mature/à structurer), (Senior) Program Manager (transfo/scale-up), Project
Manager senior (transfo majeure). Critère transverse : BUILD/TRANSFO/STRATÉGIE, pas du RUN.
SECTEURS chauds : fintech, insurtech, SaaS B2B, payment, crypto sérieux, AI tooling. Froids :
conseil pur, ESN, defense. RED FLAGS (score bas, status archived) : run/BAU sans build, PMO
suivi sans ownership, scrum master junior isolé, coordination sans objectifs métier.

RUBRIC (décimales autorisées) :
- score_seniority /3 : fit séniorité (profil vs must-have de la JD).
- score_sector /3 : alignement rôle cible + secteur chaud + mission build/transfo.
- score_impact /4 : trajectoire (scope, exposition C-suite, levier carrière).
- score_bonus : 0 (pas de réseau warm disponible dans ce pipeline).
- score_total = somme, arrondi 1 décimale, borné [0,10].

CALIBRAGE : job_pref_rules = AUTORITÉ ABSOLUE (prime sur la rubric). job_pref_observed =
tendances inférées. Si une offre coche un motif de rejet récurrent, baisse sector/impact et
explique dans rubric_justif.calibrage. Ne contredis jamais job_pref_rules.

SKILLS : extrais 5-9 compétences/exigences clés mentionnées DANS la description. Pour chacune,
on_cv=true si le PROFIL (skill_radar + user_profile) la couvre clairement, sinon false.

SALAIRE : si la JD affiche une fourchette → basis "published", bornes de la JD. Sinon basis
"inferred" depuis le rôle/stade/localisation (Head of Product 110-150 / Senior PM 80-115 /
RTE 85-120 / Sr PgM 90-125 / CoS 90-140 k€). target ∈ [min,max] selon le fit. k€ entiers.
Si indéterminable → salary_estimate: null.

Réponds UNIQUEMENT par un tableau JSON, un objet par offre, dans l'ordre reçu :
[{
  "job_id": "<repris tel quel>",
  "role_category": "produit|rte|pgm|pjm|cos",
  "company_stage": "seed|A|B|C|scale|grand_groupe",
  "pitch": "1-2 phrases, ce que l'offre propose",
  "score_seniority": 0-3, "score_sector": 0-3, "score_impact": 0-4,
  "score_bonus": 0, "score_total": 0-10,
  "rubric_justif": {"seniority":"…","sector":"…","impact":"…","calibrage":"… (option)"},
  "skills_required": [{"name":"SAFe","on_cv":true}, …],
  "salary_estimate": {"min":90,"max":120,"target":105,"currency":"EUR","basis":"inferred","rationale":"…"}
}]
```

Le user-content = le bloc PROFIL/PRÉFÉRENCES + le JSON des offres du batch (champs : `job_id`, `job_title`, `employer_name`, `job_city`, `job_description` tronquée ~3000 car., `job_min_salary`/`job_max_salary` si présents). Parser via `safe_json_parse` ; sur échec, logguer et skip le batch (pas de crash).

- [ ] **Step 5 : `to_job_row(offer, scored)`** — mappe vers la ligne `jobs` :
  - `linkedin_job_id` = `offer["job_id"]`, `url` = `offer.get("job_apply_link")`, `title`, `company` = `employer_name`, `posted_date` = `job_posted_at_datetime_utc` (→ date), `first_seen_date`/`last_seen_date` = today.
  - `score_*`, `rubric_justif`, `role_category`, `company_stage`, `pitch`, `compensation` (depuis salary JD si présent).
  - `intel` = `{"salary_estimate": …, "skills_required": …}` ; `intel_depth` = `"light"`.
  - `status` = `"new"` si `score_total >= 5` sinon `"archived"`.
  - **N'inclut PAS** `user_notes`/`user_verdict*`/`closed_at` (préservés par non-inclusion à l'UPSERT).

- [ ] **Step 6 : `main()` — orchestration**
  1. `load_context()`.
  2. Pour chaque rôle : `fetch_jsearch` → agrège, dédoublonne par `job_id` intra-run.
  3. `existing = sb_get("jobs", "select=linkedin_job_id&last_seen_date=gte.<today-30>")` → set d'ids.
  4. Split : `known` (id ∈ existing) → `sb_patch("jobs", f"linkedin_job_id=eq.{id}", {"last_seen_date": today})` ; `new` → à scorer.
  5. `new` par batches de `BATCH_SIZE` → `score_batch` → `to_job_row` → `sb_post("jobs", rows, upsert=True)` (le trigger `jobs_inherit_user_status` gère les republications (titre,boîte)).
  6. `sb_post("job_scans", [{scan_date: today, raw_count, dedup_strict_count: len(known), processed_count: len(new), hot_leads_count: sum(score>=7), tendances: {}, actions: []}], upsert=True)` (conflit sur `scan_date`).
  7. Console : compteurs + Top 3 (titre · score · ~target k€).

- [ ] **Step 7 : Vérif syntaxe** — `python -m py_compile pipelines/jobs_radar.py` → exit 0.

- [ ] **Step 8 — Commit** : `git add pipelines/jobs_radar.py && git commit -m "feat(jobs): pipeline jobs_radar (JSearch + Gemini gratuit → Supabase)"`

---

## Task 4: Workflow GitHub Actions

**Files:** Create `.github/workflows/jobs_radar.yml`

- [ ] **Step 1** : créer (cron `0 6 * * 1,3,5,0` = lun/mer/ven/dim 06:00 UTC = 08:00 Paris) :

```yaml
name: Jobs Radar — Scan & Score

on:
  schedule:
    - cron: '0 6 * * 1,3,5,0'   # lun/mer/ven/dim 06:00 UTC (08:00 Paris)
  workflow_dispatch:            # déclenchement manuel (test)

jobs:
  jobs-radar:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r pipelines/requirements-jobs.txt
      - name: Run Jobs Radar pipeline
        env:
          RAPIDAPI_KEY: ${{ secrets.RAPIDAPI_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: python pipelines/jobs_radar.py
```

- [ ] **Step 2 — Commit** : `git add .github/workflows/jobs_radar.yml && git commit -m "ci(jobs): workflow cron Jobs Radar (4×/sem)"`

---

## Task 5: Réécrire la routine versionnée

**Files:** Modify `docs/cowork-routines/jobs-radar.md`

- [ ] **Step 1** : réécrire le doc — il ne décrit plus une routine Cowork mais le **pipeline `pipelines/jobs_radar.py` + workflow cron**. Conserver : la rubric (Étapes 0/3/4.5 portées dans le prompt système du script), les garde-fous (préservation user fields, trigger DB). Retirer : URLs LinkedIn, intel warm, passe de fraîcheur, reco CV. Ajouter : section skills. Mettre à jour « Dernière MAJ » (2026-05-28, ADR-19). Le dossier reste `cowork-routines/` (renommage → `agent-routines/` non fait, trop de refs ; noté comme TODO).

- [ ] **Step 2 — Commit** : `git add docs/cowork-routines/jobs-radar.md && git commit -m "docs(jobs): routine versionnée — pipeline GH Actions + Gemini (plus Cowork)"`

---

## Task 6: `pipelines.yaml`

**Files:** Modify `docs/architecture/pipelines.yaml`

- [ ] **Step 1** : ajouter l'entrée (même shape que `weekly_analysis`) :

```yaml
  - id: jobs_radar
    name: "Jobs Radar (JSearch + Gemini)"
    cron: "0 6 * * 1,3,5,0"
    human_time: "Lun/Mer/Ven/Dim 06:00 UTC"
    workflow_file: ".github/workflows/jobs_radar.yml"
    script: "pipelines/jobs_radar.py"
    input_api: "JSearch (RapidAPI, tier gratuit) + Gemini 2.5 Flash-Lite (gratuit)"
    output_tables:
      - jobs
      - job_scans
    read_tables:
      - jobs
      - user_profile
      - skill_radar
    avg_duration_s: 90
    budget_usd: 0
    status: active
    notes: "Remplace la routine Cowork externe (ADR-19). 5 rôles × num_pages=1, dédup linkedin_job_id, scoring Gemini gratuit. Reco CV + intel warm abandonnés."
```

- [ ] **Step 2** : si une entrée `cowork_external` / Jobs Radar Cowork existe, passer son `status` à `archived` avec note « remplacé par jobs_radar (ADR-19) ».

- [ ] **Step 3 — Commit** : `git add docs/architecture/pipelines.yaml && git commit -m "docs(arch): pipeline jobs_radar dans pipelines.yaml"`

---

## Task 7: `dependencies.yaml`

**Files:** Modify `docs/architecture/dependencies.yaml`

- [ ] **Step 1** : sur les tables `jobs` et `job_scans`, changer `owner_pipeline: cowork_external` → `owner_pipeline: jobs_radar`. Sur `jobs`, ajouter une note `columns_notable` pour `intel` : `skills_required [{name,on_cv}] + salary_estimate ; intel warm + cv_recommended/cv_reason abandonnés (ADR-19)`.

- [ ] **Step 2 — Commit** : `git add docs/architecture/dependencies.yaml && git commit -m "docs(arch): jobs/job_scans owner → jobs_radar"`

---

## Task 8: ADR-19

**Files:** Modify `docs/architecture/decisions.md`

- [ ] **Step 1** : ajouter après ADR-18 (même format) :

```markdown
## ADR-19 · 2026-05-28 · Jobs Radar — pipeline GitHub Actions (JSearch + Gemini gratuit) remplace la routine Cowork

- **Contexte** : la routine Cowork (Sonnet + navigateur sur session LinkedIn) était token-vore (~0,20-0,40 €/run) à cause de l'ingestion d'écrans rendus + navigation du graphe social pour l'intel warm. Le design (2026-05-27) prévoyait une « routine Claude Code distante », mais un agent distant planifié **ne peut pas lire les secrets GitHub** (sandbox cloud, pas d'env injecté). L'utilisateur a aussi posé une contrainte : **aucun coût LLM récurrent**.
- **Décision** : pipeline **GitHub Actions cron** (`pipelines/jobs_radar.py`, lun/mer/ven/dim) qui lit **JSearch** (API agrégateur structurée, tier gratuit), score + extrait les skills via **Gemini 2.5 Flash-Lite (tier gratuit)**, écrit `jobs`/`job_scans` en service_role. Réutilise l'infra cron + secrets existants (`RAPIDAPI_KEY` ajouté, `GEMINI_API_KEY`/`SUPABASE_SERVICE_KEY` en place). **Renverse** la décision de design « routine distante » (contrainte secret) et « Claude = intelligence » (contrainte coût → Gemini gratuit, doctrine « volume gratuit »).
- **Conséquences** : 0 €/run. Abandon de l'intel warm (signaux/lead/réseau/angle/SAFe) et de la reco CV (cf. plan 1 front). `intel` = `salary_estimate` + `skills_required[{name,on_cv}]`. Couverture élargie (≠ 100 % LinkedIn). Perte de la détection auto de clôture (compensée par le bouton manuel, ADR-18). Match `on_cv` basé sur `skill_radar`/`user_profile` (pas de CV dans le cloud). `linkedin_job_id` stocke l'id JSearch. Secret `RAPIDAPI_KEY` documenté.
```

- [ ] **Step 2 — Commit** : `git add docs/architecture/decisions.md && git commit -m "docs(arch): ADR-19 — Jobs Radar pipeline GH Actions + Gemini"`

---

## Task 9: Réconcilier le design doc

**Files:** Modify `docs/superpowers/specs/2026-05-27-jobs-radar-api-migration-design.md` (+ `.html`)

- [ ] **Step 1** : dans la table « Décisions de cadrage », mettre à jour la ligne « Quel moteur ? » → **Pipeline GitHub Actions cron (JSearch + Gemini gratuit)** au lieu de « routine Claude Code distante », avec note « contrainte secret + coût, ADR-19 ». Ajuster le diagramme d'archi (cron GH Actions, Gemini gratuit). Idem dans le `.html` (bloc routine + tableau).

- [ ] **Step 2 — Commit** : `git add docs/superpowers/specs/2026-05-27-jobs-radar-api-migration-design.md docs/superpowers/specs/2026-05-27-jobs-radar-api-migration-design.html && git commit -m "docs(jobs): design — moteur GH Actions + Gemini (réconcilie ADR-19)"`

---

## Task 10: Vérification & déploiement

- [ ] **Step 1** : `PYTHONIOENCODING=utf-8 python scripts/validate_architecture.py` → `ok` (pipelines.yaml/dependencies.yaml cohérents, workflow_file existe). Corriger sinon.
- [ ] **Step 2** : `python -m py_compile pipelines/jobs_radar.py` → exit 0.
- [ ] **Step 3 — Test réel (manuel, par l'utilisateur)** : pousser la branche/`main`, puis **Actions → Jobs Radar → Run workflow** (`workflow_dispatch`) une fois. Vérifier les logs (offres fetchées/scorées) + l'apparition de nouvelles lignes dans `jobs` (avec `intel.skills_required`) et une ligne `job_scans` du jour. Ouvrir le cockpit → Jobs Radar → le bloc skills « tu as / à acquérir » s'affiche enfin sur les nouvelles offres.
- [ ] **Step 4** : si le run manuel est bon, le cron prend le relais automatiquement.

---

## Self-Review

- **Spec coverage (design) :** source JSearch 5 rôles ✓ (T3) ; cadence 4×/sem ✓ (T4) ; scoring rubric clés plates ✓ (T3) ; skills + match CV ✓ (T3, contrat) ; salaire ✓ (T3) ; abandon intel warm + reco CV ✓ (contrat, T5) ; secret RAPIDAPI_KEY ✓ (T1) ; ADR ✓ (T8) ; pipelines/dependencies ✓ (T6/T7).
- **Écart assumé vs design :** moteur (GH Actions au lieu de routine distante) + modèle (Gemini gratuit au lieu de Claude) — justifiés ADR-19 (contraintes secret + coût), design doc réconcilié (T9).
- **Contrat front↔pipeline :** `rubric_justif` clés plates + `intel.skills_required[{name,on_cv}]` + `salary_estimate` — identiques à ce que `transformJobIntel`/`transformJobRubric` attendent (plan 1).
- **Sécurité user fields :** INSERT n'inclut pas `status` post-création/`user_notes`/`user_verdict*`/`closed_at` ; connues → PATCH `last_seen_date` seul ; trigger DB inchangé.
- **Coût :** 0 € (toutes API en tier gratuit). Garde-fou volume : dédup → seules les nouvelles offres passent par Gemini, batché.
- **Limitation :** match `on_cv` sans CV (skill_radar/user_profile) ; re-scoring du stock (ex-Étape 7 dominicale) non porté en v1 (amélioration future).
