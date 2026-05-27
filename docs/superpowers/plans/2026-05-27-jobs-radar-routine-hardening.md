# Plan — Fiabilisation routine Jobs Radar (Tier 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fiabiliser la routine Cowork Jobs Radar — schéma `rubric_justif` figé (A), passe de clôture re-priorisée + bouton manuel cockpit (B), fenêtre de scan dynamique anti-perte (C).

**Architecture:** Lot 1 = repo (cockpit React-via-CDN sans build + docs), livrable seul et testable sans Cowork. Lot 2 = prompt Cowork versionné (`docs/cowork-routines/jobs-radar.md`), à recoller manuellement dans Cowork. **Pas de migration SQL** : `closed_at` existe déjà (migration 015). **Pas de test runner front** (React via Babel standalone, ouvrable en `file://`) → vérification par : (1) `node -c` impossible sur JSX, donc preview pour détecter une erreur de parse en console ; (2) test manuel dans le cockpit authentifié ; (3) requêtes MCP Supabase `execute_sql` pour l'état DB. Le preview sandbox **ne passe pas l'auth Google** donc ne monte pas le panel — il sert uniquement à attraper une erreur de syntaxe.

**Tech Stack:** React 18 + `@babel/standalone` (CDN, `window.X` globals), Supabase REST/Realtime, MCP Supabase (`execute_sql`), `scripts/sync-sw.mjs` (régénère `sw.js`).

**Spec :** [docs/superpowers/specs/2026-05-27-jobs-radar-routine-hardening-design.md](../specs/2026-05-27-jobs-radar-routine-hardening-design.md)

---

## Stratégie de commit (contrainte CLAUDE.md)

CLAUDE.md impose : MAJ spec/archi **dans le même commit que le code**. Donc Lot 1 = **un seul commit** groupant code cockpit + docs + `sw.js` régénéré (Tasks 1→3). Lot 2 = un commit séparé (doc routine, Task 4). Les Tasks 1 et 2 **n'émettent pas de commit** ; le commit Lot 1 est fait en Task 3.

## File Structure

| Fichier | Responsabilité | Task |
|---|---|---|
| `cockpit/lib/data-loader.js` | `transformJobRubric` : extraire l'axe `calibrage` (A) | 1 |
| `cockpit/panel-jobs-radar.jsx` | whitelist `closed_at` + handlers `closeJob`/`reopenJob` + items kebab (B2) | 2 |
| `docs/architecture/dependencies.yaml` | whitelist front + writer `closed_at` | 3 |
| `docs/architecture/decisions.md` | ADR-18 (renversement « front écrit `closed_at` ») | 3 |
| `docs/telemetry.md` | `jobs_action` actions `close`/`reopen` | 3 |
| `docs/specs/tab-jobs.md` + `docs/specs/index.json` | bouton clôture + axe calibrage + bump `last_updated` | 3 |
| `sw.js` | régénéré par `node scripts/sync-sw.mjs` | 3 |
| `docs/cowork-routines/jobs-radar.md` | routine v3.2 : Étape 2 (C), Étape 3 (A), Étape 8 (B1) | 4 |

---

## Task 1 : A-front — axe `calibrage` dans `transformJobRubric`

**Files:**
- Modify: `cockpit/lib/data-loader.js` (~1538-1551)

> `RubricBlock` et `OfferRow` mappent déjà tout le tableau `offer.rubric_justif` → **aucun changement JSX nécessaire**. Il suffit que `transformJobRubric` émette un item `{axis:"Calibrage", text}` quand la clé existe.

- [ ] **Step 1 : Ajouter l'extraction `calibrage`**

Dans `cockpit/lib/data-loader.js`, remplacer ce bloc :

```js
    const seniority = rubric.seniority ?? rubric.seniorite ?? rubric.sen;
    const sector    = rubric.sector    ?? rubric.secteur   ?? rubric.sec;
    const impact    = rubric.impact    ?? rubric.imp;
    const bonus     = rubric.bonus;

    const senText = pickAxisText(seniority);
    const secText = pickAxisText(sector);
    const impText = pickAxisText(impact);
    const bonText = pickAxisText(bonus);

    if (senText) out.push({ axis: "Séniorité", text: senText });
    if (secText) out.push({ axis: "Secteur",   text: secText });
    if (impText) out.push({ axis: "Impact",    text: impText });
    if (bonText) out.push({ axis: "Bonus",     text: bonText });
```

par :

```js
    const seniority = rubric.seniority ?? rubric.seniorite ?? rubric.sen;
    const sector    = rubric.sector    ?? rubric.secteur   ?? rubric.sec;
    const impact    = rubric.impact    ?? rubric.imp;
    const bonus     = rubric.bonus;
    const calibrage = rubric.calibrage ?? rubric.calibration;

    const senText = pickAxisText(seniority);
    const secText = pickAxisText(sector);
    const impText = pickAxisText(impact);
    const bonText = pickAxisText(bonus);
    const calText = pickAxisText(calibrage);

    if (senText) out.push({ axis: "Séniorité", text: senText });
    if (secText) out.push({ axis: "Secteur",   text: secText });
    if (impText) out.push({ axis: "Impact",    text: impText });
    if (bonText) out.push({ axis: "Bonus",     text: bonText });
    if (calText) out.push({ axis: "Calibrage", text: calText });
```

- [ ] **Step 2 : Vérifier le rendu (test DB temporaire, MCP Supabase)**

Le `calibrage` n'existe pas encore en base (émis par Cowork au Lot 2). Test end-to-end sur une ligne, puis restauration.

1. `execute_sql` : `SELECT id, title, rubric_justif FROM jobs WHERE score_total >= 7 AND status NOT IN ('archived','snoozed') AND closed_at IS NULL ORDER BY score_total DESC LIMIT 1;` → **noter `id` et l'ancien `rubric_justif`** (le copier intégralement).
2. `execute_sql` : `UPDATE jobs SET rubric_justif = '{"seniority":"socle RTE/SAFe complet","sector":"insurtech chaud","impact":"scope Head + C-suite","calibrage":"remonté : motif valorisé (transfo produit)"}'::jsonb WHERE id = '<id>';`
3. Cockpit authentifié : recharger le Jobs Radar → la hot lead card de cette offre affiche **4 lignes** de rubric, dont `Calibrage · remonté : motif valorisé…`.
4. Restaurer : `execute_sql` : `UPDATE jobs SET rubric_justif = '<ancien json copié à l'étape 1>'::jsonb WHERE id = '<id>';`

Expected : la 4ᵉ ligne « Calibrage » apparaît à l'étape 3, et l'offre retrouve son rubric d'origine à l'étape 4. Une ligne legacy (sans `calibrage`) continue d'afficher 3 lignes (non-régression).

- [ ] **Step 3 : Pas de commit** (groupé dans le commit Lot 1, Task 3).

---

## Task 2 : B2 — bouton « Marquer clôturée » / « Rouvrir »

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (lignes 15-27, 101, 132-141, 410, 534-541, 559, 619-626, 894-907)

- [ ] **Step 1 : Ajouter `closed_at` à la whitelist `patchJobSupabase`**

Remplacer (vers la ligne 21) :

```js
  if ("user_verdict_at" in patch) safe.user_verdict_at = patch.user_verdict_at;
  if (!Object.keys(safe).length) return;
```

par :

```js
  if ("user_verdict_at" in patch) safe.user_verdict_at = patch.user_verdict_at;
  if ("closed_at" in patch) safe.closed_at = patch.closed_at;
  if (!Object.keys(safe).length) return;
```

(Mettre aussi à jour le commentaire ligne 14 : `// ─── Supabase write (user-editable fields: status, user_notes, user_verdict*, closed_at) ───`.)

- [ ] **Step 2 : Ajouter les handlers `closeJob` / `reopenJob`**

Dans `PanelJobsRadar`, remplacer :

```js
  const saveNotes = (id, notes) => { updateJob(id, { user_notes: notes }, "Notes enregistrées"); setNotesEditing(null); };

  const cardHandlers = {
```

par :

```js
  const saveNotes = (id, notes) => { updateJob(id, { user_notes: notes }, "Notes enregistrées"); setNotesEditing(null); };

  // Clôture manuelle — le front écrit closed_at (réversible via reopenJob). On
  // track explicitement action:"close"/"reopen" (updateJob dériverait "closed_at").
  const closeJob = (id) => {
    try { window.track && window.track("jobs_action", { action: "close", job_id: String(id).slice(0, 64), value: "" }); } catch {}
    persistJobPatch(id, { closed_at: new Date().toISOString() }, "Offre clôturée");
    setOpenMenu(null);
  };
  const reopenJob = (id) => {
    try { window.track && window.track("jobs_action", { action: "reopen", job_id: String(id).slice(0, 64), value: "" }); } catch {}
    persistJobPatch(id, { closed_at: null }, "Offre rouverte");
    setOpenMenu(null);
  };

  const cardHandlers = {
```

- [ ] **Step 3 : Exposer les handlers dans `cardHandlers`**

Remplacer :

```js
  const cardHandlers = {
    onApply: applyToJob,
    onSnooze: snoozeJob,
    onArchive: archiveJob,
    onEditNotes: startEditNotes,
    onSaveNotes: saveNotes,
    onCancelNotes: cancelEditNotes,
    onVote: voteJob,
    openMenu,
    onMenuToggle: setOpenMenu,
    notesEditing,
  };
```

par :

```js
  const cardHandlers = {
    onApply: applyToJob,
    onSnooze: snoozeJob,
    onArchive: archiveJob,
    onEditNotes: startEditNotes,
    onSaveNotes: saveNotes,
    onCancelNotes: cancelEditNotes,
    onVote: voteJob,
    onClose: closeJob,
    onReopen: reopenJob,
    openMenu,
    onMenuToggle: setOpenMenu,
    notesEditing,
  };
```

- [ ] **Step 4 : Ajouter les items au kebab `JrActionsMenu`**

Signature — remplacer :

```js
function JrActionsMenu({ offer, open, onToggle, onSnooze, onArchive, onEditNotes }) {
```

par :

```js
function JrActionsMenu({ offer, open, onToggle, onSnooze, onArchive, onEditNotes, onClose, onReopen }) {
```

Items — remplacer :

```jsx
          <button className="jr-menu-item" role="menuitem" onClick={() => onEditNotes(offer.id)}>
            <Icon name="file_text" size={13} stroke={2} />
            <span>Éditer les notes</span>
          </button>
          {offer.intel_depth === "light" && (
```

par :

```jsx
          <button className="jr-menu-item" role="menuitem" onClick={() => onEditNotes(offer.id)}>
            <Icon name="file_text" size={13} stroke={2} />
            <span>Éditer les notes</span>
          </button>
          {!offer.closed_at && offer.status !== "applied" && (
            <button className="jr-menu-item" role="menuitem" onClick={() => onClose(offer.id)}>
              <Icon name="x" size={13} stroke={2} />
              <span>Marquer clôturée</span>
            </button>
          )}
          {offer.closed_at && (
            <button className="jr-menu-item" role="menuitem" onClick={() => onReopen(offer.id)}>
              <Icon name="refresh" size={13} stroke={2} />
              <span>Rouvrir</span>
            </button>
          )}
          {offer.intel_depth === "light" && (
```

(Icônes `x` et `refresh` confirmées présentes dans le registre d'icônes.)

- [ ] **Step 5 : Passer les props depuis `HotLeadCard` et `OfferRow`**

`HotLeadCard` signature (ligne ~410) — remplacer :

```js
function HotLeadCard({ offer, rank, onApply, onSnooze, onArchive, onEditNotes, onSaveNotes, onCancelNotes, onVote, openMenu, onMenuToggle, notesEditing }) {
```

par :

```js
function HotLeadCard({ offer, rank, onApply, onSnooze, onArchive, onEditNotes, onSaveNotes, onCancelNotes, onVote, onClose, onReopen, openMenu, onMenuToggle, notesEditing }) {
```

`OfferRow` signature (ligne ~559) — remplacer :

```js
function OfferRow({ offer, onApply, onSnooze, onArchive, onEditNotes, onSaveNotes, onCancelNotes, onVote, openMenu, onMenuToggle, notesEditing }) {
```

par :

```js
function OfferRow({ offer, onApply, onSnooze, onArchive, onEditNotes, onSaveNotes, onCancelNotes, onVote, onClose, onReopen, openMenu, onMenuToggle, notesEditing }) {
```

Les deux usages de `<JrActionsMenu>` ont une **indentation différente** (`HotLeadCard` l.~534 = 10 espaces ; `OfferRow` l.~619 = 8 espaces) → **deux Edit distincts**, PAS de `replace_all`.

**Edit 5a — dans `HotLeadCard`** (indentation 10/12 espaces). Remplacer :

```jsx
          <JrActionsMenu
            offer={offer}
            open={openMenu === offer.id}
            onToggle={onMenuToggle}
            onSnooze={onSnooze}
            onArchive={onArchive}
            onEditNotes={onEditNotes}
          />
```

par :

```jsx
          <JrActionsMenu
            offer={offer}
            open={openMenu === offer.id}
            onToggle={onMenuToggle}
            onSnooze={onSnooze}
            onArchive={onArchive}
            onEditNotes={onEditNotes}
            onClose={onClose}
            onReopen={onReopen}
          />
```

**Edit 5b — dans `OfferRow`** (indentation 8/10 espaces). Remplacer :

```jsx
        <JrActionsMenu
          offer={offer}
          open={openMenu === offer.id}
          onToggle={onMenuToggle}
          onSnooze={onSnooze}
          onArchive={onArchive}
          onEditNotes={onEditNotes}
        />
```

par :

```jsx
        <JrActionsMenu
          offer={offer}
          open={openMenu === offer.id}
          onToggle={onMenuToggle}
          onSnooze={onSnooze}
          onArchive={onArchive}
          onEditNotes={onEditNotes}
          onClose={onClose}
          onReopen={onReopen}
        />
```

- [ ] **Step 6 : Vérifier (preview parse + test manuel + DB)**

1. `preview_start` puis charger `index.html` ; `preview_console_logs` → **aucune erreur de parse/Babel** sur `panel-jobs-radar.jsx`.
2. Cockpit authentifié, Jobs Radar :
   - Sur une hot lead active : kebab ⋯ → **« Marquer clôturée »** → toast « Offre clôturée », l'offre disparaît du hero **et** de la liste, le compteur header affiche « 1 clôturée masquée ».
   - Filtre statut **« Clôturées »** → l'offre réapparaît → kebab → **« Rouvrir »** → toast « Offre rouverte », elle revient en « Actives ».
   - Sur une offre `applied` : le kebab **ne propose pas** « Marquer clôturée ».
3. `execute_sql` après close : `SELECT closed_at FROM jobs WHERE id='<id>';` → non-null. Après reopen → null. (Nettoyer tout test sur une vraie offre via « Rouvrir ».)

- [ ] **Step 7 : Pas de commit** (groupé Task 3).

---

## Task 3 : Docs + service worker + commit Lot 1

**Files:**
- Modify: `docs/architecture/dependencies.yaml`, `docs/architecture/decisions.md`, `docs/telemetry.md`, `docs/specs/tab-jobs.md`, `docs/specs/index.json`
- Regenerate: `sw.js`

- [ ] **Step 1 : `dependencies.yaml` — whitelist + writer**

Remplacer (ligne ~135) :

```
    writes: [jobs]  # status + user_notes + user_verdict + user_verdict_reason + user_verdict_at (whitelist)
```

par :

```
    writes: [jobs]  # status + user_notes + user_verdict + user_verdict_reason + user_verdict_at + closed_at (whitelist)
```

Remplacer (ligne ~309) :

```
    rls: public  # using(true), update whitelist status + user_notes + user_verdict*
```

par :

```
    rls: public  # using(true), update whitelist status + user_notes + user_verdict* + closed_at
```

Remplacer (ligne ~314) :

```
        writer: cowork_external  # posé quand LinkedIn marque "ne recrute plus"
```

par :

```
        writer: cowork_external + front  # Cowork (auto, "ne recrute plus") OU bouton cockpit "Marquer clôturée" (réversible) — ADR-18
```

- [ ] **Step 2 : `decisions.md` — ADR-18**

Insérer juste **avant** la ligne `## ADR-17 · 2026-05-21 · Offres clôturées — détection Cowork + masquage front` :

```markdown
## ADR-18 · 2026-05-27 · Clôture manuelle — le front écrit `closed_at`

- **Contexte** : ADR-17 a posé `closed_at` en écriture Cowork seule (lecture seule côté front). La détection reste asynchrone — une offre clôturée peut traîner dans le feed plusieurs jours avant la passe de fraîcheur, et l'utilisateur n'a aucun moyen de la masquer immédiatement quand il tombe sur le mur LinkedIn.
- **Décision** : le cockpit peut désormais écrire `closed_at` via un bouton « Marquer clôturée » (et « Rouvrir » qui le remet à NULL). `closed_at` rejoint la whitelist `patchJobSupabase` (comme `user_verdict*` avant lui). **Renverse** la conséquence d'ADR-17 « jamais écrit par le cockpit ». La détection Cowork (opportuniste + passe de fraîcheur re-priorisée, cf. routine v3.2) reste en place — les deux chemins coexistent, `isDead(o)` les unifie.
- **Conséquences** : `closed_at` écrit par deux sources (Cowork auto + front manuel) ; réversibilité front (Rouvrir) ; télémétrie `jobs_action {action:"close"|"reopen"}` ; RLS `jobs` déjà permissive (`using(true)`) → pas de changement de policy ; `dependencies.yaml` whitelist à jour.

```

- [ ] **Step 3 : `telemetry.md` — actions `close`/`reopen`**

Remplacer la ligne :

```
| `jobs_action` | `{action, job_id}` | `cockpit/panel-jobs-radar.jsx` toggle |
```

par :

```
| `jobs_action` | `{action, job_id, value}` | `cockpit/panel-jobs-radar.jsx` — statut (snooze/archive/apply) + notes + clôture manuelle (`action:"close"`/`"reopen"`, écrit `closed_at`) |
```

- [ ] **Step 4 : `tab-jobs.md` — fonctionnalités + whitelist + MAJ**

(a) Dans la section **Fonctionnalités**, remplacer la puce « Masquage des offres clôturées » par :

```
- **Masquage des offres clôturées** : quand une offre LinkedIn passe en "ne recrute plus" (détecté par le scan Cowork quotidien, **ou marqué à la main** via le kebab « Marquer clôturée »), elle est retirée du feed actif et des hot leads. Un filtre « Clôturées » permet de les revoir et de **« Rouvrir »** un faux positif (le front écrit `closed_at`, réversible). Un compteur dans l'en-tête indique combien sont masquées. Une offre déjà postulée reste visible dans le pipeline.
```

(b) Dans la table **Back — sources de données**, ligne `jobs`, remplacer la liste **Write (front PATCH whitelist)** pour y ajouter `closed_at` :

```
**Write (front PATCH whitelist)** : `status`, `user_notes`, `user_verdict`, `user_verdict_reason`, `user_verdict_at`, `closed_at`.
```

(c) Mentionner l'axe `calibrage` : dans la description de `RubricBlock` (section Front — fonctions JS), remplacer « Liste de 3 lignes axis/text » par « Liste de lignes axis/text (Séniorité/Secteur/Impact + Bonus/Calibrage si présents) ».

(d) Ajouter en tête de **Dernière MAJ** :

```
2026-05-27 — fiabilisation Tier 1 : bouton « Marquer clôturée »/« Rouvrir » (le front écrit `closed_at`, ADR-18) ; affichage de l'axe `calibrage` dans la rubric. Côté routine (v3.2, hors repo) : schéma `rubric_justif` figé, passe de clôture re-priorisée, fenêtre de scan dynamique. Voir docs/superpowers/plans/2026-05-27-jobs-radar-routine-hardening.md.
```

- [ ] **Step 5 : `index.json` — bump `last_updated`**

Dans `docs/specs/index.json`, passer le `last_updated` de l'entrée `tab-jobs` (slug `jobs`) à `"2026-05-27"`. Vérifier que le fichier reste un JSON valide (`node -e "JSON.parse(require('fs').readFileSync('docs/specs/index.json','utf8'))"` → pas d'erreur).

- [ ] **Step 6 : Régénérer le service worker**

Run : `node scripts/sync-sw.mjs`
Expected : `[sync-sw] CACHE → cockpit-vNN, STATIC → … entries` ; `git status --short -- sw.js` montre `sw.js` modifié (bump `CACHE` v48→v49, STATIC inchangé car aucun nouveau `<script>` dans `index.html`).

- [ ] **Step 7 : Commit Lot 1 (code + docs + sw, même commit)**

```bash
git add cockpit/lib/data-loader.js cockpit/panel-jobs-radar.jsx \
        docs/architecture/dependencies.yaml docs/architecture/decisions.md \
        docs/telemetry.md docs/specs/tab-jobs.md docs/specs/index.json sw.js
git commit -m "feat(jobs): bouton « Marquer clôturée » + axe calibrage rubric (Lot 1)" \
  -m "B2 : closed_at dans la whitelist front + handlers closeJob/reopenJob + items kebab (Marquer cloturee / Rouvrir), reversible. A-front : transformJobRubric expose l'axe calibrage. Docs : ADR-18 (front ecrit closed_at, renverse ADR-17), dependencies.yaml whitelist, telemetry jobs_action close/reopen, tab-jobs + index.json, sw.js resync." \
  -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Expected : 1 commit, 8 fichiers. `git status --short` ne montre plus aucun des fichiers Lot 1 (l'arbre de travail pré-existant de l'utilisateur reste, lui, intact).

---

## Task 4 : Lot 2 — routine `jobs-radar.md` (v3.2)

**Files:**
- Modify: `docs/cowork-routines/jobs-radar.md`

> Doc/prompt. Vérification = **dry-run dans Cowork** (hors repo), pas testable en CI. Bien rester **dans le bloc ```code``` du prompt** pour les Étapes 2/3/8.

- [ ] **Step 1 : Bump version**

Remplacer `## Prompt v3.1` par `## Prompt v3.2`.

- [ ] **Step 2 : Étape 2 — fenêtre dynamique (C)**

Remplacer :

```
ÉTAPE 2 — Sources à scanner (24 dernières heures, f_TPR=r86400)

1. https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=Paris&f_TPR=r86400
```

par :

```
ÉTAPE 2 — Sources à scanner (fenêtre dynamique, anti-perte de runs manqués)

Avant de lancer les recherches, calcule la fenêtre pour ne rien perdre
si un run a sauté :
   gap          = CURRENT_DATE - (SELECT MAX(scan_date) FROM job_scans)  -- NULL si vide
   fenetre_jours = borne(gap + 1, min 2, max 7)                          -- défaut 2 (48h) si NULL
   f_TPR        = "r" + (fenetre_jours * 86400)                          -- ex. 2j → r172800
Remplace `r86400` par cette valeur dans les 7 URLs ci-dessous. La dédup
(Étape 1, linkedin_job_id UNIQUE) absorbe le recouvrement sans coût.

1. https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=Paris&f_TPR=r86400
```

- [ ] **Step 3 : Étape 3 — schéma `rubric_justif` figé (A)**

Remplacer :

```
Bonus +1 si connexion 1er degré dans la boîte.

ÉTAPE 4 — Niveaux d'Intel (2 paliers)
```

par :

```
Bonus +1 si connexion 1er degré dans la boîte.

**Format `rubric_justif` (OBLIGATOIRE — forme unique).** Objet JSON à clés
plates, une string de justification par axe. JAMAIS d'objet imbriqué
({score, max, just}) : les scores vivent dans les colonnes score_*. Émets
EXACTEMENT ces clés (pas de variante FR/EN, pas de clé inventée) :
   {
     "seniority": "justif courte",
     "sector":    "justif courte",
     "impact":    "justif courte",
     "bonus":     "justif (optionnel — omettre si bonus = 0)",
     "calibrage": "justif de l'ajustement profil (optionnel — omettre si aucun)"
   }
Le cockpit attend ces clés (transformJobRubric). Toute autre forme oblige
le front à deviner et a déjà provoqué un crash (12/05).

ÉTAPE 4 — Niveaux d'Intel (2 paliers)
```

- [ ] **Step 4 : Étape 8 — passe de fraîcheur re-priorisée (B1)**

Remplacer le bloc Étape 8 entier :

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
d'abord = les plus susceptibles d'être mortes). Si le run est déjà
long, réduire ce lot.
```

par :

```
ÉTAPE 8 — Passe de fraîcheur (offres clôturées)

Re-vérifie un lot borné d'offres actives pour repérer les clôturées.
PRIORITÉ aux offres DISPARUES de la recherche du jour (après l'Étape 1,
elles ont last_seen_date < CURRENT_DATE) et à fort score (celles que
Jean va cliquer en premier) :
   SELECT id, url, linkedin_job_id FROM jobs
   WHERE closed_at IS NULL AND status IN ('new','to_apply')
     AND last_seen_date < CURRENT_DATE
   ORDER BY score_total DESC NULLS LAST, last_seen_date ASC
   LIMIT 25;
Si < 25 lignes, compléter avec les plus anciennes actives encore
ouvertes (closed_at IS NULL, status IN ('new','to_apply')) pour ne pas
gâcher le budget les jours calmes.
Pour chaque URL, visite la page ; si « ne sont plus acceptées » /
« no longer accepting » →
   UPDATE jobs SET closed_at = now() WHERE id = <id>;
« Non re-vue » ne pose JAMAIS closed_at seule — on confirme toujours en
lisant la page (zéro faux positif destructeur). Borne 25/run ; si le run
est déjà long, réduire ce lot.
```

- [ ] **Step 5 : « Dernière MAJ »**

Ajouter en tête de la section `## Dernière MAJ` :

```
2026-05-27 — fiabilisation (v3.2) : schéma `rubric_justif` figé (clés plates seniority/sector/impact/bonus/calibrage, anti-dérive des 17 formes — Étape 3) ; passe de fraîcheur re-priorisée sur les offres disparues × forts scores (Étape 8) ; fenêtre de scan dynamique anti-perte de runs manqués (Étape 2). Côté cockpit (Lot 1) : bouton « Marquer clôturée »/« Rouvrir ». Voir docs/superpowers/plans/2026-05-27-jobs-radar-routine-hardening.md.
```

- [ ] **Step 6 : Commit Lot 2**

```bash
git add docs/cowork-routines/jobs-radar.md
git commit -m "docs(cowork): routine v3.2 — rubric figé, passe clôture re-priorisée, fenêtre dynamique (Lot 2)" \
  -m "A : Etape 3 fige le schema rubric_justif (cles plates). B1 : Etape 8 re-priorisee sur les offres disparues de la recherche x forts scores. C : Etape 2 fenetre de scan dynamique (clamp gap+1, 2..7 jours)." \
  -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7 : Rappel utilisateur** — afficher : « Lot 2 commité. **À faire manuellement** : recoller le prompt v3.2 (`docs/cowork-routines/jobs-radar.md`) dans la routine Cowork — c'est une copie manuelle, le repo n'est que la source. »

---

## Vérification finale (après les 2 commits)

- [ ] `git log --oneline -3` → spec (Task 0) + Lot 1 + Lot 2, sur `feat/jobs-radar-routine-hardening`.
- [ ] `git status --short` → l'arbre de travail pré-existant de l'utilisateur est intact (aucun de ses fichiers touché par mes commits).
- [ ] Cockpit : clôture manuelle + Rouvrir OK ; axe Calibrage rendu (test DB Task 1) ; aucune erreur console.
- [ ] CI au push : `lint-specs` (tab-jobs/index.json), `validate-arch` (dependencies.yaml/decisions.md) passent.
