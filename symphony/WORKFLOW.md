---
tracker:
  kind: linear
  project_slug: jarvis
workspace:
  root: ./workspaces
  source_repo: https://github.com/Ph3niXx/jarvis-cockpit.git
hooks:
  after_create: |
    git clone {{ workspace.source_repo }} .
  before_run: |
    git checkout us-{{ issue.number }} 2>nul || git checkout -B us-{{ issue.number }}
  after_run: |
    git push -u origin us-{{ issue.number }}
agent:
  max_concurrent_agents: 2
  max_turns: 25
  model: claude-opus-4-7
  model_scoping: claude-sonnet-4-6
  model_sweep: claude-sonnet-4-6
states:
  todo: "Todo"
  scoping: "Scoping"
  scoped: "Scoped"
  backlog: "Backlog"
  running: "Running"
  review: "Human Review"
  rework: "Rework"
  merging: "Merging"
  done: "Done"
prompts:
  continuation_extra: |
    - Si tu modifies un panel (cockpit/panel-*.jsx ou cockpit/home.jsx) : mets à jour le `docs/specs/tab-<slug>.md` correspondant **dans le même commit** (cf. CLAUDE.md → règle cardinale specs)
    - Si tu touches `index.html` ou `cockpit/**` : lance `node scripts/sync-sw.mjs` pour régénérer le service worker (ou laisse la CI `sw-sync` le faire)
    - Si tu touches sql/, pipelines/, .github/workflows/*-sync.yml, ou cockpit/lib/{bootstrap,data-loader,supabase,auth}.js : mets à jour `docs/architecture/` (pipelines.yaml, dependencies.yaml, flows/) dans le même commit
    - Si tu ajoutes un nouveau secret GitHub Actions : mets à jour `docs/secrets.md` (section domaine + règle de maintenance)
    - Si tu instrumentes un nouvel event télémétrie (`track('xxx', payload)`) : ajoute l'entrée dans `docs/telemetry.md` AVANT le commit
    - Si tu ajoutes un nouveau fichier de doc longue, garde `CLAUDE.md` ≤ 200 lignes (règles + pointeurs uniquement, jamais d'inventaires) — CI `lint-claude-md`, **bloquante depuis le 2026-08-31**
    - CI bloquantes à respecter : `validate-spec`, `validate-arch`, `lint-specs`, `lint-known-sections`, `lint-claude-md`, `tests` (warning-only : `arch-drift-check`, `spec-drift-check`)
    - Commit clair (`feat(US-XXX): …` ou `fix(US-XXX): …`)
---

{{ rework }}{{ pr_feedback }}
# Mission

Tu travailles sur l'US Linear **{{ issue.identifier }}** — _{{ issue.title }}_.

## Description de l'US

{{ issue.description }}

## Contraintes du projet (jarvis-cockpit)

`CLAUDE.md` à la racine est la **source de vérité** des conventions. Lis-le (au moins les sections pertinentes) avant de commencer.

Stack :

- **Front** : React 18 + `@babel/standalone` via CDN unpkg (no build). Coquille `index.html` + dossier `cockpit/` (29 panels, 3 thèmes Dawn/Obsidian/Atlas)
- **Back** : Supabase PostgreSQL (projet `mrmgptqpflzyavdfqwwv`) + pipelines Python (GitHub Actions cron)
- **Jarvis** (assistant local) : FastAPI `jarvis/server.py` sur localhost:8765, LM Studio LLM local + RAG pgvector
- **Hosting** : GitHub Pages pour le front, GitHub Actions pour les crons backend

## Règles cardinales (à NE PAS oublier)

1. **Specs (docs/specs/tab-<slug>.md)** — toute modif fonctionnelle d'un onglet (`cockpit/panel-*.jsx`, `cockpit/home.jsx`, pipelines qui changent la source de données, migrations qui changent les colonnes) impose une mise à jour du spec correspondant **dans le même commit**. La CI `lint-specs` est **bloquante** sur le vocabulaire produit dans les sections `## Fonctionnalités` et `## Parcours utilisateur` (pas de noms de fichiers, props, colonnes DB, endpoints, jargon `Tier 1/2`, `bootTier`, etc.).
2. **Architecture (docs/architecture/)** — toute modif sur les chemins watchés (sql/, pipelines/, .github/workflows/*-sync.yml, cockpit/lib/bootstrap|data-loader|supabase|auth.js, cockpit/panel-*.jsx ajouté/supprimé, jarvis/server.py et observers) impose une mise à jour de `pipelines.yaml`, `dependencies.yaml`, `flows/<domaine>.yaml` (cf. `docs/architecture/README.md` → tableau « Checklist : modifier un type d'objet »).
3. **Service worker (sw.js)** — ne jamais éditer `STATIC[]` ni `CACHE` à la main. Après toute modif de `index.html` ou de `cockpit/**` : `node scripts/sync-sw.mjs` (ou laisse la GH Action `sw-sync` auto-commit sur la PR).
4. **Sécurité** : pas de clé Supabase service_role en dur dans `index.html` / `cockpit/`. Les pipelines backend utilisent toujours `SUPABASE_SERVICE_KEY` (jamais la publishable).
5. **CSP** : si tu ajoutes un nouveau domaine externe (script ou connect), update la balise `Content-Security-Policy` dans `index.html`.

## Lecture du code (discipline tokens)

CLAUDE.md fait **~100 lignes** depuis le slim down 2026-05-18 — tu peux le lire en entier sans souci, il pointe vers la doc longue dans `docs/`. **Pour les fichiers longs** (`docs/specs/MAINTENANCE.md`, `jarvis/README.md`, `docs/architecture/repo-structure.md`, `cockpit/app.jsx`, `cockpit/home.jsx`), utilise `Grep` ciblé.

- `Grep` d'abord (nom de panel, nom de table, nom de pipeline, nom de composant)
- `Read` ciblé ensuite avec `offset`/`limit` (max **300 lignes** par lecture)
- Pour comprendre quel panel touche quelle table : `docs/architecture/dependencies.yaml::panels[]` (source de vérité)
- Pour comprendre quel pipeline alimente quelle table : `docs/architecture/pipelines.yaml`
- Pour la matrice secrets / pipelines : `docs/secrets.md`
- Pour les events télémétrie déjà instrumentés : `docs/telemetry.md`
- Pour le module Jarvis (vision, stack, observers, tables, troubleshooting) : `jarvis/README.md`

## Tests et validation

- **CI bloquantes** (6) : `validate-spec`, `validate-arch`, `lint-specs`, `lint-known-sections`, `lint-claude-md`, `tests`. Si tu les casses, la PR sera rouge — fixe avant de finir.
  - `lint-known-sections` est celle qui casse le plus souvent et la moins connue : tout nouvel onglet doit voir son id ajouté à `KNOWN_SECTIONS` dans `scripts/extract_signals.py`, sinon la CI est rouge.
- **CI warning-only** : `spec-drift-check`, `arch-drift-check`.
- **`sw-sync`** n'est pas une CI de validation : c'est un job qui régénère `sw.js` et le committe. Il tourne sur push vers `main` et sur PR.
- **Pipelines Python** : pas de test unitaires obligatoires, mais si tu touches `main.py`, `weekly_analysis.py`, `tft_pipeline.py` ou un `pipelines/*.py`, fais tourner le script avec un `--dry-run` ou un mode test si dispo.
- **Tests** : `tests/` contient 29 fichiers (12 `test_*.mjs`, 17 `test_*.py`) et `tests.yml` est **bloquant**. Lance-les avant de finir.
- **Front** : en plus des tests, si tu peux ouvrir `index.html` localement et vérifier le panel concerné, fais-le. Sinon, dis-le explicitement dans la PR plutôt que de prétendre que ça marche.

## Workflow attendu

1. Lis la section pertinente de `CLAUDE.md` + `docs/specs/tab-<slug>.md` du panel concerné (si applicable) + `docs/architecture/dependencies.yaml` pour le mapping panel↔données.
2. Implémente l'US.
3. **Mets à jour spec + archi dans le même commit** (cf. règles cardinales).
4. Si front modifié : `node scripts/sync-sw.mjs`.
5. Commit avec un message clair (`feat(US-XXX): …` ou `fix(US-XXX): …`).
6. Le hook `after_run` se chargera de push + PR.

Reste concentré sur cette seule US. Si tu identifies du scope adjacent, mentionne-le en commentaire de PR mais ne l'implémente pas.

## Outils Linear MCP

Tu peux poster un commentaire sur l'issue {{ issue.identifier }} via les tools
`mcp__linear-server__*` **uniquement** dans 2 cas : (a) blocage technique réel,
(b) scope adjacent utile à signaler. Sinon, silence. Détails et exemples dans
`symphony/LINEAR_MCP_GUIDE.md` — à lire **seulement** si tu es dans un de ces 2 cas.
