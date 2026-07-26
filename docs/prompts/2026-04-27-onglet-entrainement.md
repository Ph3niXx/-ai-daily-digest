# Prompt Claude Code â€” Onglet "EntraÃ®nement" (plan course adaptatif + muscu)

> Prompt gÃ©nÃ©rÃ© le 2026-04-27. Ã€ coller dans une session Claude Code ouverte dans `C:\Users\johnb\projects\jarvis-cockpit`.

---

## Contexte

Tu travailles dans le repo **jarvis-cockpit** (CLAUDE.md Ã  la racine â€” lis-le d'abord). C'est un cockpit IA personnel React 18 + `@babel/standalone` (no build step) avec backend Supabase et plusieurs pipelines GitHub Actions (Strava, Withings, Last.fm, Steam, TFT, brief Gemini, weekly Claude). Auth Google OAuth + RLS `authenticated`. Conventions strictes : specs produit dans `docs/specs/` (CI bloquante `lint-specs`), architecture dans `docs/architecture/` (CI bloquante `validate-arch`), template de commit `.gitmessage`.

Ne suppose rien : lis CLAUDE.md, `cockpit/panel-forme.jsx`, `cockpit/lib/data-loader.js`, `cockpit/app.jsx`, `cockpit/nav.js`, `docs/specs/tab-perf.md`, `docs/architecture/dependencies.yaml`, et au moins une routine Cowork existante (`docs/cowork-routines/daily-mirror.md` ou `catalogue-ecosystem.md`) avant de toucher quoi que ce soit.

## Objectif

Ajouter un nouvel onglet **"EntraÃ®nement"** au cockpit. Cet onglet hÃ©berge le plan d'entraÃ®nement course (objectifs semi/marathon, sÃ©ances avec assignation chaussure), le renforcement spÃ©cifique course, et la muscu. Le plan course Ã©volue chaque semaine via une **routine Cowork scheduled** qui lit Strava et ajuste la programmation, plus un **bouton "RÃ©gÃ©nÃ¨re mon plan"** cÃ´tÃ© front pour les dÃ©clenchements Ã  la demande (test VMA, blessure, etc.).

Forme reste sur la donnÃ©e brute Strava + Withings, **inchangÃ©**. EntraÃ®nement est un onglet sÅ“ur dans le mÃªme groupe sidebar "Personnel".

## DÃ©coupage en 3 commits successifs

Tu livres en **3 commits sÃ©parÃ©s** sur la branche courante. Stop net entre chaque commit, attends la validation utilisateur avant d'enchaÃ®ner. Chaque commit doit passer la CI locale (`scripts/lint_specs_produit.py`, `scripts/validate_architecture.py` si prÃ©sents).

### Commit 1 â€” Fondations

1. **Migration SQL** `sql/0XX_training_tables.sql` (numÃ©ro = max(existant) + 1) avec les 5 tables ci-dessous, RLS `authenticated` (SELECT + INSERT + UPDATE, jamais DELETE cÃ´tÃ© front).
2. **EntrÃ©e nav** dans `cockpit/nav.js` : ajouter `{ id: "training", label: "EntraÃ®nement", icon: "dumbbell" /* ou Ã©quivalent */, group: "Personnel" }` Ã  cÃ´tÃ© de l'entrÃ©e Forme.
3. **Routing** dans `cockpit/app.jsx` : ajouter la branche `else if (activePanel === "training") content = <PanelTraining ... />`.
4. **Panel** `cockpit/panel-training.jsx` avec les 3 sections (Plan course / Renforcement course / Muscu). Utilise des donnÃ©es mockÃ©es dans `cockpit/data-training.js` Ã  ce stade (schÃ©ma de rÃ©fÃ©rence override Ã  runtime, comme les autres `data-*.js`).
5. **Stylesheet** `cockpit/styles-training.css` (prÃ©fixe `.trn-*`, rÃ©utilise les CSS variables `--brand`, `--tx`, `--bd`, `--surface`, `--bg2` etc. pour respecter les 3 thÃ¨mes Dawn / Obsidian / Atlas).
6. **Saisie objectifs** : formulaire dans la section Plan course pour saisir `race_type` (10k/semi/marathon), `target_time_seconds`, `race_date`. Persiste dans `training_goals` via Supabase REST (auth JWT comme les autres panels).
7. **Spec produit** `docs/specs/tab-training.md` (copie `_template.md`, remplis FonctionnalitÃ©s/Parcours utilisateur en respectant la **rÃ¨gle Ã©ditoriale produit** de CLAUDE.md â€” pas de chemins de fichier, composants JSX, props, colonnes DB, jargon infra). Mets `last_updated` Ã  la date du jour dans `docs/specs/index.json`.
8. **Architecture** `docs/architecture/dependencies.yaml` : ajouter une entrÃ©e `panels[]` pour `training` (file, reads = [training_goals, training_plans, training_sessions, strength_templates, strength_logs, strava_activities], writes = [training_goals, training_sessions, strength_templates, strength_logs]) et une entrÃ©e `tables[]` par nouvelle table avec `owner_pipeline` = `cowork_routine_plan_course` ou `manual` selon le cas, `rls = authenticated`.
9. **TÃ©lÃ©mÃ©trie** : pas d'instrumentation au commit 1, on ajoute au commit 2.

CritÃ¨re d'acceptation commit 1 : l'onglet est visible, navigable, on peut saisir un objectif semi+marathon qui persiste en base et reste aprÃ¨s refresh. Les sections renfo/muscu affichent les mocks. CI verte.

### Commit 2 â€” Saisie & suivi

1. **Saisie programme muscu** : interface dans la section Muscu pour CRUD sur `strength_templates` (ajout/Ã©dition/rÃ©ordonnancement d'exos par session_label). Pas de DELETE â€” toggle `active = false` Ã  la place.
2. **Mode sÃ©ance muscu** : bouton "DÃ©marrer la sÃ©ance" â†’ vue avec liste d'exos cochables, pour chaque set : `reps`, `weight_kg`, optionnellement `rpe`. Submit â†’ INSERT dans `strength_logs` avec `sets_completed` JSONB et `training_session_id` liÃ© si une sÃ©ance muscu est planifiÃ©e pour aujourd'hui.
3. **Saisie sÃ©ance renfo course** : formulaire simple par sÃ©ance type (gainage / PPG / mobilitÃ©) â€” checkbox "fait" qui POST une `training_sessions` row avec `session_type = 'renfo_course'` et `status = 'done'`.
4. **Branchement Tier 2** : dans `cockpit/lib/data-loader.js`, ajouter `case "training"` qui fetch en parallÃ¨le `training_goals` (active), `training_plans` (active), `training_sessions` 30j passÃ©s + 30j futurs, `strength_templates` (active), `strength_logs` 60j. Mute `window.TRAINING_DATA`. Wrap dans `once()` comme les autres loaders.
5. **Historique muscu** : 5 derniÃ¨res sÃ©ances + mini graph SVG progression sur les 3 exos avec le plus d'occurrences sur 90 jours.
6. **TÃ©lÃ©mÃ©trie** : ajouter les events `training_session_logged` (`{ session_type, status, duration_min }`), `strength_set_logged` (`{ exercise_name, sets_count }`), `goal_saved` (`{ race_type, target_time_seconds }`). Mets Ã  jour le tableau TÃ©lÃ©mÃ©trie de CLAUDE.md.

CritÃ¨re d'acceptation commit 2 : on peut saisir un programme muscu structurÃ©, dÃ©marrer une sÃ©ance, logger les sets, voir l'historique. Les renfo course se cochent et apparaissent dans la semaine. CI verte. Specs et `index.json` mis Ã  jour.

### Commit 3 â€” Routine Cowork + intÃ©gration Strava

1. **Document routine** `docs/cowork-routines/plan-course-hebdo.md` au format des routines existantes (cadence, durÃ©e, coÃ»t estimÃ©, enchaÃ®nement Ã©tapes en SQL/MCP, prompt de gÃ©nÃ©ration, contraintes de sortie, fail-safe). Cadence : hebdo dimanche 19h Europe/Paris. ModÃ¨le : Sonnet (analyse stratÃ©gique). CoÃ»t estimÃ© < 0,10 â‚¬/run.
2. **Logique de la routine** :
   - Lit `training_goals` actifs.
   - Lit `training_plans` actif (ou dÃ©cide d'en crÃ©er un si aucun).
   - Lit `training_sessions` 4 sem passÃ©es + 2 sem futures.
   - Lit `strava_activities` 30 jours (focus runs : `sport_type LIKE '%Run%'`).
   - Si pas de plan actif â†’ crÃ©e plan macro **12 semaines** avec phases (dÃ©veloppement / spÃ©cifique / affÃ»tage), insÃ¨re les `training_sessions` de toutes les semaines avec status=planned.
   - Sinon â†’ analyse Ã©cart plan vs rÃ©el, ajuste les `training_sessions` de S+1 (allures cibles, distance, jour de repos, choix chaussure), met Ã  jour `cowork_summary` + `cowork_recommendations` sur le plan courant.
   - **RÃ¨gles dures** dans le prompt : `shoe = 'nimbus'` pour endurance/longue/rÃ©cup, `shoe = 'megablast'` pour seuil/VMA. +10 % de volume max par semaine. Alternance dur/facile. 1 jour de repos minimum. Si charge rÃ©cente trop haute (suffer_score moyen 30j > seuil) â†’ semaine de dÃ©charge.
3. **Bouton "RÃ©gÃ©nÃ¨re mon plan"** dans la section Plan course du panel : POST vers une edge function Supabase OU dÃ©clenchement manuel documentÃ© ("ce bouton incrÃ©mente un flag, la prochaine routine Cowork lance immÃ©diatement"). Au minimum, le bouton crÃ©e une row `training_plans` avec `generated_by = 'manual'` et `status = 'pending'` que la routine Cowork pourra picker au prochain run, OU dÃ©clenche une edge function dÃ©diÃ©e si tu juges plus propre. Documente le choix dans la spec.
4. **Affichage Cowork** : dans la section Plan course, bloc "Analyse Cowork" qui rend `training_plans.cowork_summary` et `training_plans.cowork_recommendations` (champs `text` markdown-safe via DOMPurify si tu rends du HTML).
5. **Lien Strava â†’ sÃ©ance** : pour chaque `training_sessions` avec `status = 'planned'` et `scheduled_date <= today`, matche la `strava_activities` la plus proche en date+distance (heuristique simple : mÃªme jour, distance Â±20 %, sport_type Run). Si match â†’ renseigne `strava_activity_id` et passe `status = 'done'`. Cette logique peut tourner cÃ´tÃ© front au boot du panel OU dans la routine Cowork â€” choisis et documente.

CritÃ¨re d'acceptation commit 3 : la routine est exÃ©cutable manuellement (depuis Cowork desktop), produit un plan macro 12 semaines cohÃ©rent quand on part de zÃ©ro, ajuste S+1 quand on relance avec un historique. Le bouton manuel fonctionne. Les sÃ©ances faites sont liÃ©es Ã  Strava automatiquement. Specs et architecture mis Ã  jour. CI verte.

## SchÃ©ma DB complet (commit 1)

```sql
-- 0XX_training_tables.sql
-- Tables pour l'onglet EntraÃ®nement : objectifs course, plan macro, sÃ©ances, programme muscu, logs muscu

-- 1. Objectifs course
CREATE TABLE training_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  race_type TEXT NOT NULL CHECK (race_type IN ('10k','semi','marathon','autre')),
  target_time_seconds INTEGER,           -- ex: 5400 = 1h30
  race_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','achieved','abandoned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_training_goals_user_active ON training_goals(user_id, status);

-- 2. Plan macro (1 actif Ã  la fois, historique conservÃ© via status='archived')
CREATE TABLE training_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id BIGINT REFERENCES training_goals(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  phases JSONB,                          -- [{name, weeks, focus, target_volume_km}, ...]
  cowork_summary TEXT,                   -- texte de la derniÃ¨re analyse
  cowork_recommendations TEXT,           -- recommandations actionnables
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by TEXT NOT NULL DEFAULT 'manual'
    CHECK (generated_by IN ('manual','cowork')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_training_plans_user_active ON training_plans(user_id, status);

-- 3. SÃ©ances individuelles (course + renfo course + muscu unifiÃ©s)
CREATE TABLE training_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id BIGINT REFERENCES training_plans(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  session_type TEXT NOT NULL
    CHECK (session_type IN ('endurance','seuil','vma','longue','recup','renfo_course','muscu')),
  title TEXT,
  description TEXT,                      -- ex: "8x400m R200 / rÃ©cup 1'"
  duration_min INTEGER,
  distance_km REAL,
  target_pace_seconds INTEGER,           -- secondes / km cible (course uniquement)
  shoe TEXT CHECK (shoe IN ('nimbus','megablast','none')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','done','skipped','moved')),
  strava_activity_id BIGINT,             -- soft FK vers strava_activities
  perceived_effort INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
  completion_notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','cowork')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_training_sessions_user_date ON training_sessions(user_id, scheduled_date DESC);
CREATE INDEX idx_training_sessions_plan ON training_sessions(plan_id);
CREATE INDEX idx_training_sessions_status ON training_sessions(status);

-- 4. Templates muscu (programme actif)
CREATE TABLE strength_templates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  session_label TEXT NOT NULL,           -- "Push", "Pull", "Legs", "Full body A", ...
  exercise_name TEXT NOT NULL,
  sets_target INTEGER,
  reps_target TEXT,                      -- "8-10" ou "12" (texte pour gÃ©rer les fourchettes)
  weight_target_kg REAL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_strength_templates_user_active ON strength_templates(user_id, active);

-- 5. Logs muscu (historique d'exÃ©cution)
CREATE TABLE strength_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  performed_on DATE NOT NULL,
  session_label TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  sets_completed JSONB NOT NULL,         -- [{set: 1, reps: 10, weight_kg: 60, rpe: 7}, ...]
  notes TEXT,
  training_session_id BIGINT REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_strength_logs_user_date ON strength_logs(user_id, performed_on DESC);
CREATE INDEX idx_strength_logs_exercise ON strength_logs(user_id, exercise_name, performed_on DESC);

-- RLS authenticated
ALTER TABLE training_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_logs ENABLE ROW LEVEL SECURITY;

-- Policies : SELECT/INSERT/UPDATE pour authenticated. Pas de DELETE exposÃ©.
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['training_goals','training_plans','training_sessions','strength_templates','strength_logs']) LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', 'auth_select_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (true)', 'auth_insert_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', 'auth_update_'||t, t);
  END LOOP;
END$$;
```

> Si l'idiome du repo pour les policies diffÃ¨re (ex : policies Ã©crites une par une plutÃ´t qu'en boucle), aligne-toi sur le style des migrations 011/012 existantes. VÃ©rifie le pattern rÃ©el avant de coller.

## SpÃ©cifications front dÃ©taillÃ©es

### Section 1 â€” Plan course (prioritÃ© visuelle)

- **Bandeau objectifs** : 1 ou 2 cartes (semi, marathon) avec target time (formatÃ© `1h30`), date de course, semaines restantes, allure cible projetÃ©e (target_time / distance_race) en min/km, et Ã©cart vs allure d'endurance Strava rÃ©cente (dÃ©rivÃ©e de `strava_activities` sur 30j). Si pas d'objectif saisi â†’ bouton "DÃ©finir un objectif".
- **Phase courante** : nom de la phase (dÃ©veloppement / spÃ©cifique / affÃ»tage), barre de progression sur les 12 semaines.
- **Semaine en cours (lundi â†’ dimanche)** : grid 7 colonnes. Chaque jour montre la sÃ©ance s'il y en a une : icÃ´ne type, distance ou durÃ©e, allure cible, **chaussure assignÃ©e** (badge Nimbus orange / Megablast bleu, ou neutre pour muscu/renfo). Statut visuel : prÃ©vu (outline), fait (rempli + âœ“), skip (barrÃ©), dÃ©placÃ© (icÃ´ne flÃ¨che).
- **AperÃ§u 4 semaines suivantes** : compact, juste le total km/semaine + nom des grosses sÃ©ances.
- **Bloc Analyse Cowork** : si `training_plans.cowork_summary` non vide, affiche le texte (markdown-safe). Sinon "Pas encore d'analyse, lance la routine ou clique sur RÃ©gÃ©nÃ¨re".
- **Bouton "RÃ©gÃ©nÃ¨re mon plan"** (commit 3) avec confirmation modale.

### Section 2 â€” Renforcement course

- Liste des sÃ©ances types renfo (gainage, PPG, mobilitÃ©) saisies Ã  la main par l'utilisateur. Au commit 1 : seed minimal "Gainage 15min" + "PPG runner 20min". Ã‰dition libre.
- Pour chaque sÃ©ance : checkbox "fait aujourd'hui" â†’ INSERT `training_sessions` (`session_type='renfo_course'`, `status='done'`, `scheduled_date=today`).
- Compteur de la semaine "X / Y sÃ©ances faites".

### Section 3 â€” Muscu

- Onglets internes par `session_label` (Push / Pull / Legs ou ce que l'utilisateur dÃ©finit) gÃ©nÃ©rÃ©s depuis `strength_templates` distincts.
- Liste des exos par session avec setsÃ—repsÃ—charge cible. Ã‰dition inline (ajout, modif, rÃ©ordonnancement).
- Bouton "DÃ©marrer la sÃ©ance" â†’ vue sÃ©ance : pour chaque exo, 1 ligne par set avec champs `reps`, `weight_kg`, `rpe` (optionnel). Submit â†’ INSERT dans `strength_logs`.
- Historique : 5 derniÃ¨res sÃ©ances avec date + label + nombre d'exos faits.
- Mini graph progression : sur les 3 exos avec le plus d'occurrences sur 90j, courbe de la `weight_kg` mÃ©diane par sÃ©ance dans le temps.

## Routine Cowork â€” SpÃ©cification dÃ©taillÃ©e

Document Ã  crÃ©er : `docs/cowork-routines/plan-course-hebdo.md`. Format : suis exactement la structure des routines existantes (`daily-mirror.md`, `catalogue-ecosystem.md`). Sections :

- **Cadence** : hebdomadaire dimanche 19h Europe/Paris. PremiÃ¨re exÃ©cution : peut Ãªtre dÃ©clenchÃ©e Ã  la demande.
- **DurÃ©e estimÃ©e** : 5-8 minutes.
- **CoÃ»t** : ~0,05-0,10 â‚¬ (Sonnet, ~10-20k tokens out).
- **ModÃ¨le** : Claude Sonnet 4.6.
- **Ã‰tapes** :
  1. Lire `training_goals` `WHERE status='active' AND user_id=:uid`.
  2. Lire `training_plans` `WHERE status IN ('active','pending') AND user_id=:uid ORDER BY generated_at DESC LIMIT 1`.
  3. Lire `training_sessions` `WHERE user_id=:uid AND scheduled_date BETWEEN now()-28d AND now()+14d`.
  4. Lire `strava_activities` `WHERE start_date >= now()-30d AND sport_type ILIKE '%run%'`.
  5. Construire le contexte (volume hebdo, allures moyennes par type estimÃ©, suffer_score, Ã©cart plan vs rÃ©el).
  6. Prompt Sonnet avec contraintes dures (cf ci-dessous) â†’ JSON structurÃ© `{ phases, weekly_sessions: [...], summary, recommendations }`.
  7. Si pas de plan actif â†’ INSERT `training_plans` (status='active', generated_by='cowork'), INSERT toutes les `training_sessions` du plan macro (12 sem Ã— ~5 sÃ©ances).
  8. Sinon â†’ UPDATE `training_plans` (cowork_summary, cowork_recommendations, updated_at), UPDATE/INSERT les `training_sessions` de S+1 (UPSERT par `(user_id, scheduled_date, session_type)` pour Ã©viter les doublons).
  9. Si flag `training_plans.status='pending'` dÃ©tectÃ© (dÃ©clenchement manuel via bouton) â†’ traiter en prioritÃ©, passer status Ã  `active`.
- **Contraintes du prompt** :
  - Chaussure : Nimbus pour endurance/longue/rÃ©cup, Megablast pour seuil/VMA, `none` pour muscu/renfo.
  - Volume : +10 % max par semaine, sauf semaine de dÃ©charge (-30 %) toutes les 4 semaines.
  - RÃ©cup : minimum 1 jour off / semaine, ne pas enchaÃ®ner 2 sÃ©ances dures.
  - Si suffer_score moyen 7j > 80 ou ratio fait/prÃ©vu < 60 % â†’ semaine de dÃ©charge automatique.
  - Format de sortie strict (JSON schema documentÃ© dans le .md).
- **Fail-safe** : si la lecture d'une table Ã©choue, log et stop sans rien Ã©crire. Si le JSON Sonnet est invalide, retry 1 fois puis abandonne.
- **Validation post-run** : ne jamais Ã©craser une `training_sessions` avec `status IN ('done','skipped')` (l'utilisateur a dÃ©jÃ  tracÃ© l'historique).

## Conventions Ã  respecter (rappel CLAUDE.md)

- **RLS** : `authenticated` partout. Service role uniquement pour les pipelines backend (la routine Cowork passe par MCP Supabase qui peut utiliser service_role selon ta config).
- **Pas de DELETE cÃ´tÃ© front** : archive via `status` ou `active=false`.
- **Spec produit** (`docs/specs/tab-training.md`) â€” sections FonctionnalitÃ©s et Parcours utilisateur **strictement produit** : pas de chemins de fichier, pas de noms de composants JSX, pas de `window.X_DATA`, pas de colonnes DB, pas de jargon `Tier 1/2`. Les dÃ©tails techniques vont dans les sections Front et Back du mÃªme doc. La CI `lint-specs` est bloquante.
- **Architecture** (`docs/architecture/dependencies.yaml`) : ajouter le panel + les 5 tables. La CI `validate-arch` est bloquante.
- **`docs/specs/index.json`** : ajouter l'entrÃ©e `training` avec `last_updated` Ã  la date du jour.
- **TÃ©lÃ©mÃ©trie** (commit 2) : mettre Ã  jour le tableau dans CLAUDE.md avec les nouveaux event_type avant le commit (rÃ¨gle dure).
- **Commit message** : si tu utilises `.gitmessage`, renseigne la ligne `Specs mises Ã  jour: tab-training`.
- **SÃ©curitÃ© XSS** : tout HTML rendu dynamiquement (notamment `cowork_summary`) passe par DOMPurify via le helper `safe()` existant.
- **ThÃ¨mes** : tous les CSS variables (`--brand`, `--tx`, `--bd`, `--surface`, `--bg2`, `--bg3`, `--up`, `--down`) â€” pas de couleur en dur.
- **Babel standalone** : pas d'imports ES modules. Chaque composant s'expose sur `window.X` pour Ãªtre visible des autres scripts.

## Checklist finale (Ã  cocher avant de marquer chaque commit comme terminÃ©)

Commit 1 :
- [ ] Migration `sql/0XX_training_tables.sql` crÃ©Ã©e et appliquÃ©e (vÃ©rifier via MCP Supabase `list_tables`)
- [ ] `cockpit/nav.js` modifiÃ©, entrÃ©e EntraÃ®nement visible dans la sidebar
- [ ] `cockpit/app.jsx` route `training`
- [ ] `cockpit/panel-training.jsx` rend les 3 sections (mocks OK pour renfo/muscu)
- [ ] `cockpit/styles-training.css` crÃ©Ã©, respecte les 3 thÃ¨mes
- [ ] Saisie objectif fonctionne (POST + refetch)
- [ ] `docs/specs/tab-training.md` crÃ©Ã©, conforme aux rÃ¨gles Ã©ditoriales (lance `python scripts/lint_specs_produit.py` localement si possible)
- [ ] `docs/specs/index.json` mis Ã  jour
- [ ] `docs/architecture/dependencies.yaml` mis Ã  jour, `python scripts/validate_architecture.py` passe
- [ ] CLAUDE.md : pas besoin d'update au commit 1 (pas encore d'event tÃ©lÃ©mÃ©trie)

Commit 2 :
- [ ] CRUD `strength_templates` opÃ©rationnel
- [ ] Mode sÃ©ance muscu logge dans `strength_logs`
- [ ] Saisie renfo course â†’ `training_sessions` `status='done'`
- [ ] Tier 2 loader `training` dans `data-loader.js`
- [ ] Historique muscu + mini graph
- [ ] 3 nouveaux events tÃ©lÃ©mÃ©trie ajoutÃ©s au tableau de CLAUDE.md
- [ ] Spec mise Ã  jour, `last_updated` bumpÃ©

Commit 3 :
- [ ] `docs/cowork-routines/plan-course-hebdo.md` complet (cadence, prompt, contraintes, fail-safe)
- [ ] Bouton "RÃ©gÃ©nÃ¨re mon plan" fonctionnel (insÃ¨re row `pending` ou dÃ©clenche edge function â€” choix documentÃ©)
- [ ] Bloc "Analyse Cowork" affiche `cowork_summary` / `cowork_recommendations` (DOMPurify)
- [ ] Heuristique de matching Strava â†’ `training_sessions` documentÃ©e et implÃ©mentÃ©e
- [ ] Spec et architecture mis Ã  jour
- [ ] Test manuel : la routine tourne (depuis Cowork desktop), gÃ©nÃ¨re un plan macro cohÃ©rent, Ã©crit en base

## Si tu bloques

- Un dÃ©tail manque â†’ lis le code existant (panel-forme.jsx, panel-musique.jsx ou panel-gaming.jsx pour les patterns rÃ©cents).
- Doute sur une convention â†’ CLAUDE.md fait foi, la CI tranche.
- AmbiguÃ¯tÃ© produit â†’ demande Ã  l'utilisateur **avant** d'inventer (assignation d'une chaussure, format d'une donnÃ©e, etc.).
- Pour la routine Cowork au commit 3 : si tu n'as pas accÃ¨s au Cowork desktop pour tester, livre la routine en l'Ã©tat documentÃ©e â€” l'utilisateur la testera depuis son client lourd.
