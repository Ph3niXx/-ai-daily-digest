# Jobs Radar — migration vers une routine Claude Code sur API jobs structurée

> Design validé le 2026-05-27. Remplace la routine Cowork token-vore (Sonnet + navigateur + session LinkedIn) par une routine Claude Code planifiée qui lit une API jobs structurée (JSON) et abandonne l'intel réseau warm.

> **Réconciliation post-implémentation (2026-05-28, [ADR-19](../../architecture/decisions.md)).** Le moteur a shippé **tel que désigné ici** — une routine Claude Code distante (claude.ai, trigger `trig_01JtTsMm27eTAGxR5po5KmMQ`, Sonnet 4.6) qui fetch JSearch via `curl` et écrit `jobs`/`job_scans` via le connecteur MCP Supabase. Un plan intermédiaire (GitHub Actions + Gemini) a été écrit puis **abandonné** (voir son bandeau SUPERSEDED dans `docs/superpowers/plans/`). Corrections de détail vs ce design : la clé RapidAPI n'est **pas** un secret GitHub mais vit **inline dans le prompt** de la routine (un agent distant ne lit pas les secrets GitHub) ; `intel_depth` est toujours `'light'` ; `job_scans` n'écrit plus `signal_cv` (retiré côté front) ; la détection auto de clôture est abandonnée → `closed_at` front-only.

## Problème

La routine actuelle ([docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md)) tourne dans Cowork desktop avec **Sonnet + un navigateur sur une session LinkedIn authentifiée**. Elle est token-vore pour deux raisons cumulées :

1. **Lecture d'écrans LinkedIn rendus** — chaque page de recherche / fiche de poste est un DOM gigantesque plein de bruit, ingéré tel quel par le modèle.
2. **Navigation du graphe social** — pour produire l'intel warm (lead identifié, réseau 1er/2e degré, angle d'approche), l'agent visite des pages entreprise et des profils, multipliant les écrans lourds.

Coût observé : **0,20-0,40 €/run**, 8-15 min, dépendance à un Chrome authentifié + Cowork desktop allumé.

## Décisions de cadrage (issues du brainstorming)

| Question | Décision |
|---|---|
| Qu'est-ce qui a le plus de valeur ? | **La découverte + le scoring**. L'intel warm est un bonus non vital. |
| D'où viennent les offres ? | **API agrégateur structurée** (Google for Jobs) — plus de session LinkedIn ni de navigateur. |
| Quel moteur ? | **Routine Claude Code planifiée** (remote agent, cron), pas Cowork, pas un pipeline Python. |
| API primaire ? | **JSearch (RapidAPI)** — meilleure couverture des rôles produit/RTE scale-up Paris. |
| Intel warm ? | **Abandonnée franchement** — on nettoie aussi le code UI mort (lead/réseau/angle). |
| Combien de requêtes ? | **5 requêtes-rôles × 4 runs/semaine ≈ 87/mois** (sous le quota gratuit), `num_pages=1`. Rôles gardés : product manager, senior program manager, transformation PM, release train engineer, chief of staff. `head of product` + `senior PO fintech` retirés. |
| Carte front ? | **Refonte vers la fiche éditoriale (Proposition C)** : note CV inline, skills scindés « tu as / à acquérir », salaire en encart. Match CV par skill conservé (cœur de la carte). Maquette : [2026-05-27-jobs-radar-card-proposals.html](2026-05-27-jobs-radar-card-proposals.html). |

## Architecture cible

Le principe directeur : **on ne change que qui remplit les tables et comment.** Les tables `jobs` + `job_scans`, le front Jobs Radar et le realtime Supabase restent la cible et la source de vérité côté lecture.

```
┌─ Routine Claude Code (cron, 4×/sem. 8h Paris) ───────────────┐
│  Étape 0  Calibrage : lit job_pref_rules + job_pref_observed  │
│           + verdicts récents (inchangé vs v3.2)               │
│  Étape 1  Fetch JSearch (5 requêtes-rôles, country=fr) → JSON │
│  Étape 2  Dédup sur external id + trigger (title, company)    │
│  Étape 3  Scoring rubric /10 sur le TEXTE de la JD (calibré)  │
│  Étape 4  Estimation salaire (Top 3) + skills JD × match CV   │
│  Étape 5  UPSERT jobs + INSERT job_scans (Supabase MCP,       │
│           service_role)                                        │
└───────────────────────────────────────────────────────────────┘
        │ (texte compact, ~30 JD/run — plus aucun écran rendu)
        ▼
   Supabase  jobs / job_scans  ──realtime──▶  Front Jobs Radar (inchangé)
```

Pas de navigateur, pas de session LinkedIn, pas de graphe social. Coût attendu : **cents/run** (scoring de ~30 fiches en texte compact).

### Couche source — JSearch (RapidAPI)

- Endpoint `search` de JSearch, `country=fr`, `num_pages=1` (≈10 offres/requête). Une requête par rôle cible — **5 rôles** (réduits depuis les 7 d'origine : `head of product` et `senior product owner fintech` retirés, couverts/redondants avec `product manager`) : product manager, senior program manager, transformation program manager, release train engineer, chief of staff.
- Retour JSON structuré par offre : `job_id`, `employer_name`, `job_title`, `job_description`, `job_city`, `job_posted_at`, `job_apply_link`, et parfois `job_min_salary`/`job_max_salary`.
- Secret nouveau : `RAPIDAPI_KEY` (à documenter dans [docs/secrets.md](../../secrets.md)).
- **Quota** : free tier JSearch ≈ **100 req/mois** (à confirmer à l'implémentation — les sources oscillent entre 100 et 200). Cadence retenue : **4 runs/semaine** × 5 requêtes = **~87 req/mois**, sous le cap même pessimiste (~13 de marge). `num_pages=1` ⇒ 1 requête = 1 appel (on évite la multiplication du quota par page, piège connu de JSearch). **Plan B** si le quota se révèle être 100 pile ou si le besoin de quotidien revient : Adzuna (quota gratuit bien plus large, couverture produit/RTE Paris moindre) — code de fetch quasi identique.

### Couche scoring — quasi inchangée (+ extraction skills)

Les Étapes 0, 3, 4.5 du prompt v3.2 sont **reprises telles quelles** : calibrage `job_pref_rules` (autorité absolue) + `job_pref_observed`, rubric 3 axes (Séniorité /3, Secteur /3, Impact /4) + bonus, format `rubric_justif` à clés plates figées (`seniority`/`sector`/`impact`/`bonus`/`calibrage`), estimation salaire calibrée sur le Top 3. La seule différence sur le scoring : le modèle score sur **le texte de la JD renvoyé par l'API**, plus sur une page rendue.

**Ajout (carte Proposition C)** : au même passage, l'agent **extrait les skills/compétences mentionnés dans la JD** et les confronte à `skill_radar` + `user_profile` pour marquer chacun *présent sur le CV* ou *à acquérir*. Coût marginal quasi nul (le texte est déjà en contexte). Stocké dans `intel.skills_required[]` (cf. Impact données).

### Couche écriture — inchangée

UPSERT sur `jobs` (clé `linkedin_job_id`, qui stocke désormais l'ID externe de l'agrégateur), INSERT `job_scans` (1 ligne/jour avec `tendances`, `signal_cv`, `actions`). Mêmes garde-fous user-modifiables (`status`, `user_notes`, `user_verdict*` jamais écrasés). Le trigger `jobs_inherit_user_status` (dédup `(title, company)`) continue de fonctionner indépendamment de la source.

## Ce qui disparaît du prompt

- **Étape 4 — Intel light + deep** (signaux boîte, lead identifié, réseau warm, angle d'approche, maturité SAFe). Supprimée.
- **Fenêtre LinkedIn `f_TPR`** (Étape 2 v3.2). Remplacée par la fraîcheur native de l'API + `last_seen_date`.
- **Passe de fraîcheur par re-fetch de pages** (Étape 8 v3.2). Supprimée : la détection de clôture par lecture de « ne sont plus acceptées » exigeait le navigateur. La clôture reste possible **manuellement** via le bouton « Marquer clôturée » du cockpit (ADR-18), conservé.
- **GUARD anti-injection LinkedIn** : conservé par prudence (le texte des JD reste une donnée non fiable), mais le risque baisse (plus de pages tierces naviguées).

## Impact données

- `intel` jsonb contient `salary_estimate` (Top 3) **+ `skills_required[]`** — les skills extraits de la JD, chacun avec un flag `on_cv` (présent/absent du CV, calculé côté routine via `skill_radar` + `user_profile`). Les clés warm `signaux_boite` / `lead_identifie` / `reseau_warm` / `angle_approche` ne sont plus produites.
- `intel_depth` : devient `none` ou `light` (plus jamais `deep`).
- `linkedin_job_id` (UNIQUE) stocke l'ID JSearch ; `url` = `job_apply_link`.
- **Migration optionnelle** : ajouter une colonne `source text default 'jsearch'` sur `jobs` pour tracer la provenance (les 554 lignes historiques restent, provenance LinkedIn implicite). À trancher dans le plan — non bloquant, le front ne la lit pas.

## Impact front — refonte de la carte (Proposition C)

`HotLeadCard` est **refondue vers la fiche éditoriale** (maquette validée : [2026-05-27-jobs-radar-card-proposals.html](2026-05-27-jobs-radar-card-proposals.html), Proposition C) : titre + **note CV inline**, bloc **skills scindé « tu as / à acquérir »**, salaire en encart, rubric en bande compacte, actions (vote / clôturée / lien). Le guard `intel && (...)` reste utile pour les 554 lignes historiques (sans `skills_required`) : la carte y dégrade sans le bloc skills.

Travail dans [cockpit/panel-jobs-radar.jsx](../../../cockpit/panel-jobs-radar.jsx) + [cockpit/styles-jobs-radar.css](../../../cockpit/styles-jobs-radar.css) :

- **Nouveau** : bloc skills have/gap alimenté par `intel.skills_required[]` (flag `on_cv` par skill) ; normalisation dans `transformJobIntel` ([data-loader.js](../../../cockpit/lib/data-loader.js)).
- **Retiré** (abandon intel warm) : rendu des blocs `signaux_boite`, `lead_identifie`, `reseau_warm`, `angle_approche` + bouton « Ouvrir le lead » ; règles CSS `jr-lead-*` / `jr-warm-*` orphelines.
- **Conservé** : `ScoreChip`, `RubricBlock`, `SalaryEstimate`, `JrVote`, le scan banner, les filtres, le bouton « Marquer clôturée ».

## Impact doc / archi (règles cardinales)

- **Spec** : MAJ [docs/specs/tab-jobs.md](../../specs/tab-jobs.md) (source des données, intel dégradée, suppression intel warm) + bump `last_updated` dans `docs/specs/index.json`.
- **Routine** : réécrire [docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md) en prompt Claude Code (envisager de renommer le dossier `cowork-routines/` → `agent-routines/`, à trancher dans le plan).
- **Archi** : MAJ `docs/architecture/pipelines.yaml` (le pipeline Cowork externe devient une routine Claude Code cron) + `dependencies.yaml` (note RLS inchangée) + **ADR-19** dans `docs/architecture/decisions.md` (remplacement Cowork → routine Claude Code sur API structurée, abandon intel warm, justification token-vore).
- **Secrets** : entrée `RAPIDAPI_KEY` dans [docs/secrets.md](../../secrets.md).

## Hors scope (volontairement)

- **Enrichissement à la demande via Jarvis** (signaux boîte + angle, local/gratuit) : abandonné pour l'instant, pas remis dans un TODO (décision « abandon franc »). Pourra ressortir si le besoin réapparaît.
- **Refonte du scan banner / des filtres / du vote** : aucun changement.
- **Migration des 554 lignes historiques** : aucune. La nouvelle routine appendera ; l'historique intel deep reste lisible.

## Risques & garde-fous

- **Couverture JSearch ≠ LinkedIn** : les offres ne sont plus 100 % LinkedIn ; les liens « Postuler » peuvent pointer ailleurs (Indeed, WTTJ…). Acceptable (l'utilisateur a choisi la couverture élargie). À vérifier sur les 7 requêtes réelles à l'implémentation.
- **Quota free tier** : voir couche source — fallback Adzuna documenté.
- **Perte de la détection auto de clôture** : compensée par le bouton manuel (ADR-18) ; les offres clôturées ne seront plus masquées automatiquement. Tradeoff assumé.
- **Qualité de scoring sur JD tronquées** : certaines API renvoient une description partielle. Si le fit en pâtit, l'agent pourra fetcher l'URL de l'offre (1 page, pas un parcours) en dernier recours — à arbitrer dans le plan.
