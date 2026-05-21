# Jobs Radar — Calibrage par feedback — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'utilisateur de noter chaque offre (👍/👎 + raison) dans le cockpit, en tirer un profil de préférences lisible/éditable, et le réinjecter dans le scoring de la routine Cowork pour que le classement converge vers son ressenti.

**Architecture:** Le cockpit (lecteur) capte le vote → 3 colonnes sur `jobs`. Une synthèse (dans le run Cowork quotidien) lit les votes + signaux implicites et maintient un profil dans `user_profile` (2 clés : `job_pref_rules` écrite par l'utilisateur et verrouillée, `job_pref_observed` maintenue par Cowork). La routine injecte ce profil dans son scoring. Spec de référence : [docs/superpowers/specs/2026-05-21-jobs-radar-calibrage-feedback-design.md](../specs/2026-05-21-jobs-radar-calibrage-feedback-design.md).

**Tech Stack:** React 18 + Babel standalone (no build step, composants sur `window.*`, ouvrable en `file://`) ; Supabase Postgres REST + RLS ; trigger PL/pgSQL ; routine Cowork externe (prompt versionné). Connecteur MCP Supabase pour appliquer/tester le SQL.

**Note sur les tests (lis-la avant de commencer) :** ce repo n'a **aucun runner JS** (pas de jest/vitest/playwright — vérifié). La discipline test s'adapte au support :
- **SQL (migration/trigger)** → script d'assertion **transactionnel** (`BEGIN … ROLLBACK`) qui `RAISE EXCEPTION` si le comportement attendu manque. C'est le « test » exécutable, lancé via le MCP Supabase `execute_sql` (ou `psql -f`).
- **Front (JSX)** → **vérification manuelle navigateur** avec résultat observable précis + contrôle DB par `SELECT`. Pas de faux harnais inventé.
- **Routine Cowork** → run à blanc manuel décrit en fin de plan.

Ne revendique jamais une tâche « faite » sans avoir exécuté l'étape de vérification correspondante et constaté le résultat attendu.

---

## Structure des fichiers

| Fichier | Création/Modif | Responsabilité |
|---|---|---|
| `sql/014_jobs_feedback.sql` | **Create** | 3 colonnes `jobs` (`user_verdict`, `user_verdict_reason`, `user_verdict_at`) + extension du trigger `jobs_inherit_user_status` (héritage du verdict, 180j). |
| `cockpit/lib/data-loader.js` | Modify (~1648) | `transformJobRow` porte les 3 colonnes verdict dans la shape panel. |
| `cockpit/panel-jobs-radar.jsx` | Modify | whitelist PATCH élargie ; `persistJobPatch` extrait ; `voteJob` (+ télémétrie `jobs_feedback`) ; composant `JrVote` ; encart `JrCalibrage` (Lot 2) ; `upsertUserProfile`. |
| `cockpit/styles-jobs-radar.css` | Modify | styles `.jr-vote*` (Lot 1) et `.jr-calib*` (Lot 2). |
| `docs/telemetry.md` | Modify | event `jobs_feedback`. |
| `docs/specs/tab-jobs.md` + `docs/specs/index.json` | Modify | spec fonctionnelle + bump `last_updated`. |
| `docs/architecture/dependencies.yaml` + `docs/architecture/decisions.md` | Modify | colonnes + 2 clés `user_profile` ; ADR. |
| `sw.js` | Modify (généré) | via `node scripts/sync-sw.mjs`. |
| `docs/cowork-routines/jobs-radar.md` | Modify (Lot 3) | Étape 0 (synthèse), injection scoring, recalibrage hebdo. |

---

# LOT 1 — Capture du feedback (livrable seul)

À la fin de ce lot, les votes se persistent en base et survivent aux republications. Cowork ne les lit pas encore — c'est voulu : l'historique commence à s'accumuler avant le Lot 3.

## Task 1 : Migration SQL 014 (colonnes + héritage du verdict)

**Files:**
- Create: `sql/014_jobs_feedback.sql`
- Test: `sql/014_jobs_feedback.verify.sql`

- [ ] **Step 1 : Écrire la migration**

Create `sql/014_jobs_feedback.sql` :

```sql
-- Migration 014 — Feedback utilisateur sur les offres (calibrage du scoring)
--
-- Ajoute le signal de préférence par offre (👍/👎 + raison) que la routine
-- Cowork relit pour calibrer le scoring : 3 colonnes sur `jobs`.
-- Étend le trigger d'héritage (013) pour que le verdict survive aux
-- republications LinkedIn (nouveau linkedin_job_id, même titre+boîte), sur
-- une fenêtre glissante de 180 jours mesurée sur user_verdict_at.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS user_verdict        text,
  ADD COLUMN IF NOT EXISTS user_verdict_reason text,
  ADD COLUMN IF NOT EXISTS user_verdict_at     timestamptz;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_user_verdict_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_user_verdict_check
  CHECK (user_verdict IS NULL OR user_verdict IN ('up','down'));

-- On REMPLACE la fonction du trigger d'héritage (le trigger lui-même, créé
-- en 013, continue de pointer vers cette fonction — pas besoin de le recréer).
CREATE OR REPLACE FUNCTION public.jobs_inherit_user_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prior      RECORD;
  prior_vote RECORD;
BEGIN
  IF NEW.title IS NULL OR NEW.company IS NULL THEN
    RETURN NEW;
  END IF;

  -- (1) Héritage status/notes — comportement migration 013, inchangé.
  SELECT status, user_notes INTO prior
  FROM public.jobs
  WHERE lower(trim(title))   = lower(trim(NEW.title))
    AND lower(trim(company)) = lower(trim(NEW.company))
    AND status IN ('archived', 'snoozed')
    AND (
      (status = 'archived' AND updated_at >= now() - interval '30 days')
      OR (status = 'snoozed' AND updated_at >= now() - interval '7 days')
    )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    NEW.status := prior.status;
    IF (NEW.user_notes IS NULL OR NEW.user_notes = '') AND prior.user_notes IS NOT NULL THEN
      NEW.user_notes := prior.user_notes;
    END IF;
  END IF;

  -- (2) Héritage du verdict — NOUVEAU. Indépendant du status (un 👍/👎 reste
  -- valide même sans archivage). Fenêtre 180j sur user_verdict_at (l'âge du
  -- vote, pas updated_at qui bougerait à chaque édition de notes).
  IF NEW.user_verdict IS NULL THEN
    SELECT user_verdict, user_verdict_reason, user_verdict_at INTO prior_vote
    FROM public.jobs
    WHERE lower(trim(title))   = lower(trim(NEW.title))
      AND lower(trim(company)) = lower(trim(NEW.company))
      AND user_verdict IS NOT NULL
      AND user_verdict_at >= now() - interval '180 days'
    ORDER BY user_verdict_at DESC
    LIMIT 1;

    IF FOUND THEN
      NEW.user_verdict        := prior_vote.user_verdict;
      NEW.user_verdict_reason := prior_vote.user_verdict_reason;
      NEW.user_verdict_at     := prior_vote.user_verdict_at;
    END IF;
  END IF;

  RETURN NEW;
END $$;
```

- [ ] **Step 2 : Écrire le script d'assertion (le « test »)**

Create `sql/014_jobs_feedback.verify.sql`. Transactionnel : il insère des lignes de simulation et fait un `ROLLBACK` final, donc **aucune donnée de test ne persiste**. Couvre le cas positif (vote ≤180j hérité) ET négatif (vote >180j expiré).

```sql
BEGIN;

-- Cas 1 — vote 'down' il y a 10 jours, offre NON archivée (status reste 'new').
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status,
                         user_verdict, user_verdict_reason, user_verdict_at)
VALUES ('verif-old-1', 'Verif Role A', 'Verif Co A', 'https://x', 'new',
        'down', 'run/BAU', now() - interval '10 days');
-- Republication : nouvel id, même (titre, boîte), sans verdict.
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status)
VALUES ('verif-new-1', 'Verif Role A', 'Verif Co A', 'https://x', 'new');

-- Cas 2 — vote 'down' il y a 200 jours (hors fenêtre).
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status,
                         user_verdict, user_verdict_reason, user_verdict_at)
VALUES ('verif-old-2', 'Verif Role B', 'Verif Co B', 'https://x', 'new',
        'down', 'secteur', now() - interval '200 days');
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status)
VALUES ('verif-new-2', 'Verif Role B', 'Verif Co B', 'https://x', 'new');

DO $$
BEGIN
  IF (SELECT user_verdict FROM public.jobs WHERE linkedin_job_id = 'verif-new-1') IS DISTINCT FROM 'down' THEN
    RAISE EXCEPTION 'FAIL cas1 : verdict non hérité (attendu down)';
  END IF;
  IF (SELECT user_verdict_reason FROM public.jobs WHERE linkedin_job_id = 'verif-new-1') IS DISTINCT FROM 'run/BAU' THEN
    RAISE EXCEPTION 'FAIL cas1 : reason non héritée';
  END IF;
  IF (SELECT user_verdict FROM public.jobs WHERE linkedin_job_id = 'verif-new-2') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL cas2 : vote >180j ne doit PAS être hérité';
  END IF;
  RAISE NOTICE 'OK : cas1 hérité, cas2 expiré';
END $$;

ROLLBACK;
```

- [ ] **Step 3 : Appliquer la migration**

Via le MCP Supabase : `apply_migration(name="014_jobs_feedback", query=<contenu de sql/014_jobs_feedback.sql>)`.
(Alternative locale : `psql "$SUPABASE_DB_URL" -f sql/014_jobs_feedback.sql`.)
Attendu : succès, pas d'erreur.

- [ ] **Step 4 : Lancer le script d'assertion**

Via le MCP Supabase : `execute_sql(query=<contenu de sql/014_jobs_feedback.verify.sql>)`.
(Alternative : `psql "$SUPABASE_DB_URL" -f sql/014_jobs_feedback.verify.sql`.)
Attendu : `NOTICE: OK : cas1 hérité, cas2 expiré` et **aucune** `EXCEPTION`. Le `ROLLBACK` final garantit zéro résidu.

- [ ] **Step 5 : Commit**

```bash
git add sql/014_jobs_feedback.sql sql/014_jobs_feedback.verify.sql
git commit -m "feat(jobs): migration 014 — colonnes verdict + heritage 180j"
```

## Task 2 : `transformJobRow` porte les colonnes verdict

**Files:**
- Modify: `cockpit/lib/data-loader.js:1648`

- [ ] **Step 1 : Ajouter les 3 champs à la shape panel**

Dans `transformJobRow`, la dernière propriété avant la fermeture `};` est `user_notes`. Remplace :

```js
      user_notes: row.user_notes || "",
    };
  }
```

par :

```js
      user_notes: row.user_notes || "",
      user_verdict: row.user_verdict || null,
      user_verdict_reason: row.user_verdict_reason || "",
      user_verdict_at: row.user_verdict_at || null,
    };
  }
```

- [ ] **Step 2 : Vérifier (manuel, console navigateur)**

Ouvre le cockpit → Business → Jobs Radar. Dans la console :
`window.JOBS_DATA.offers[0]` doit maintenant exposer les clés `user_verdict` (null si jamais voté), `user_verdict_reason`, `user_verdict_at`.
Attendu : les 3 clés présentes, pas d'erreur de chargement du panel.

- [ ] **Step 3 : Commit**

```bash
git add cockpit/lib/data-loader.js
git commit -m "feat(jobs): expose les colonnes verdict dans transformJobRow"
```

## Task 3 : Persistance du vote (whitelist + voteJob + télémétrie)

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx:14-24` (whitelist)
- Modify: `cockpit/panel-jobs-radar.jsx:620-640` (`updateJob` → extraire `persistJobPatch`, ajouter `voteJob`)
- Modify: `docs/telemetry.md:24`

- [ ] **Step 1 : Élargir la whitelist PATCH**

Remplace le corps de `patchJobSupabase` (lignes 15-19) :

```js
async function patchJobSupabase(id, patch) {
  const safe = {};
  if ("status" in patch) safe.status = patch.status;
  if ("user_notes" in patch) safe.user_notes = patch.user_notes;
  if (!Object.keys(safe).length) return;
```

par :

```js
async function patchJobSupabase(id, patch) {
  const safe = {};
  if ("status" in patch) safe.status = patch.status;
  if ("user_notes" in patch) safe.user_notes = patch.user_notes;
  if ("user_verdict" in patch) safe.user_verdict = patch.user_verdict;
  if ("user_verdict_reason" in patch) safe.user_verdict_reason = patch.user_verdict_reason;
  if ("user_verdict_at" in patch) safe.user_verdict_at = patch.user_verdict_at;
  if (!Object.keys(safe).length) return;
```

- [ ] **Step 2 : Extraire `persistJobPatch` et ajouter `voteJob`**

Le `updateJob` actuel (≈ lignes 620-640) fait : optimistic `setOffers`, mirror `window.JOBS_DATA`, `track("jobs_action")`, `patchJobSupabase`, toast. On extrait la mécanique commune dans `persistJobPatch`, puis `updateJob` et le nouveau `voteJob` l'utilisent (DRY). Remplace toute la fonction `updateJob` par :

```js
  // Mécanique commune : optimistic state + mirror global + PATCH + toast.
  const persistJobPatch = (id, patch, toastMsg) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
    try {
      if (window.JOBS_DATA && Array.isArray(window.JOBS_DATA.offers)) {
        const idx = window.JOBS_DATA.offers.findIndex(o => o.id === id);
        if (idx >= 0) window.JOBS_DATA.offers[idx] = { ...window.JOBS_DATA.offers[idx], ...patch };
      }
    } catch {}
    patchJobSupabase(id, patch)
      .then(() => { if (toastMsg) showToast(toastMsg, "ok"); })
      .catch(() => showToast("Erreur de sync — changement local uniquement", "error"));
  };

  // status / notes — event jobs_action (inchangé).
  const updateJob = (id, patch, toastMsg) => {
    try {
      const key = Object.keys(patch)[0];
      window.track && window.track("jobs_action", {
        action: key,
        job_id: String(id).slice(0, 64),
        value: String(patch[key] ?? "").slice(0, 64),
      });
    } catch {}
    persistJobPatch(id, patch, toastMsg);
  };

  // vote 👍/👎 (+ raison) — event jobs_feedback, porte le score au moment du vote.
  const voteJob = (id, patch, toastMsg) => {
    const offer = offers.find(o => o.id === id);
    const verdict = ("user_verdict" in patch) ? patch.user_verdict : (offer && offer.user_verdict);
    const reason  = ("user_verdict_reason" in patch) ? patch.user_verdict_reason : (offer && offer.user_verdict_reason);
    try {
      window.track && window.track("jobs_feedback", {
        verdict: String(verdict ?? "").slice(0, 8),
        reason: String(reason ?? "").slice(0, 64),
        job_id: String(id).slice(0, 64),
        score_at_vote: offer ? offer.score_total : null,
      });
    } catch {}
    persistJobPatch(id, patch, toastMsg);
  };
```

- [ ] **Step 3 : Documenter l'event télémétrie (même commit que le code qui l'émet)**

Dans `docs/telemetry.md`, sous la ligne `jobs_action` (ligne 24), ajoute :

```
| `jobs_feedback` | `{verdict, reason, job_id, score_at_vote}` | `cockpit/panel-jobs-radar.jsx::voteJob()` — 👍/👎 + raison. `score_at_vote` mesure le désaccord avec le score (doit décroître). |
```

- [ ] **Step 4 : Vérifier (manuel)**

Ouvre le cockpit. Dans la console, exécute (sur un id réel pris dans `window.JOBS_DATA.offers[0].id`) — tu testeras le vrai geste UI à la Task 4 ; ici on valide juste la plomberie :
`window.JOBS_DATA` doit exister. Pas de vérif visuelle à cette étape (le composant arrive Task 4). Attendu : aucune erreur JS au reload du panel (les fonctions sont déclarées mais pas encore appelées).

- [ ] **Step 5 : Commit**

```bash
git add cockpit/panel-jobs-radar.jsx docs/telemetry.md
git commit -m "feat(jobs): persistance du vote (whitelist + voteJob + event jobs_feedback)"
```

## Task 4 : Composant `JrVote` + branchement dans les cartes

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (ajout du composant + constantes ; branchement dans `HotLeadCard`, `OfferRow`, `cardHandlers`)

- [ ] **Step 1 : Ajouter les constantes de raisons + le composant `JrVote`**

Juste avant `function ScoreChip(` (≈ ligne 151), insère :

```jsx
// ─── Vote 👍/👎 + raison (calibrage) ──────────────────────
const VERDICT_REASONS = {
  down: ["trop junior", "run/BAU", "secteur", "boîte", "lieu/remote", "bof"],
  up:   ["scope parfait", "secteur", "la boîte", "coup de cœur"],
};

function JrVote({ offer, onVote, compact = false }) {
  const verdict = offer.user_verdict || null;
  const [expanded, setExpanded] = useStateJr(false); // rangée de raisons après un vote
  const [precise, setPrecise]   = useStateJr(false); // input texte libre
  const [draft, setDraft]       = useStateJr("");

  const currentChip = (offer.user_verdict_reason || "").split(" — ")[0];

  const clickThumb = (v) => {
    if (verdict === v) {
      onVote(offer.id, { user_verdict: null, user_verdict_reason: null, user_verdict_at: null });
      setExpanded(false); setPrecise(false);
    } else {
      onVote(offer.id, { user_verdict: v, user_verdict_at: new Date().toISOString() }, v === "up" ? "Noté 👍" : "Noté 👎");
      setExpanded(true);
    }
  };
  const pickReason = (r) => {
    const next = (r === currentChip) ? null : r;
    onVote(offer.id, { user_verdict_reason: next });
  };
  const saveFree = () => {
    const t = draft.trim();
    const composed = currentChip ? (t ? `${currentChip} — ${t}` : currentChip) : t;
    onVote(offer.id, { user_verdict_reason: composed || null });
    setPrecise(false);
  };

  return (
    <div className={`jr-vote ${compact ? "jr-vote--compact" : ""}`}>
      <div className="jr-vote-thumbs">
        <button
          className={`jr-vote-btn ${verdict === "up" ? "is-up" : ""}`}
          onClick={(e) => { e.stopPropagation(); clickThumb("up"); }}
          aria-pressed={verdict === "up"} title="J'aime cette offre">
          <Icon name="thumbs_up" size={compact ? 13 : 15} stroke={2} />
        </button>
        <button
          className={`jr-vote-btn ${verdict === "down" ? "is-down" : ""}`}
          onClick={(e) => { e.stopPropagation(); clickThumb("down"); }}
          aria-pressed={verdict === "down"} title="Pas pour moi">
          <Icon name="thumbs_down" size={compact ? 13 : 15} stroke={2} />
        </button>
        {verdict && (
          <button className="jr-vote-why" onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}>
            {currentChip ? currentChip : "pourquoi ?"}
          </button>
        )}
      </div>

      {verdict && expanded && (
        <div className="jr-vote-reasons">
          {VERDICT_REASONS[verdict].map(r => (
            <button
              key={r}
              className={`jr-vote-chip ${currentChip === r ? "is-active" : ""}`}
              onClick={(e) => { e.stopPropagation(); pickReason(r); }}>
              {r}
            </button>
          ))}
          {!precise ? (
            <button className="jr-vote-chip jr-vote-chip--more" onClick={(e) => { e.stopPropagation(); setPrecise(true); setDraft(""); }}>
              préciser…
            </button>
          ) : (
            <span className="jr-vote-free">
              <input
                className="jr-vote-free-input" autoFocus value={draft}
                placeholder="en un mot ou deux"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveFree(); if (e.key === "Escape") setPrecise(false); }}
                onClick={(e) => e.stopPropagation()} />
              <button className="jr-vote-free-ok" onClick={(e) => { e.stopPropagation(); saveFree(); }}>OK</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

> Note : `Icon` doit connaître `thumbs_up` / `thumbs_down`. Voir Step 2.

- [ ] **Step 2 : Vérifier que les icônes existent (sinon fallback)**

Cherche les icônes dans le registre :
Run: `grep -n "thumbs_up\|thumbs_down\|thumb" cockpit/lib/icons.js cockpit/icons.js 2>/dev/null` (ajuste le chemin du registre `Icon`).
- Si `thumbs_up`/`thumbs_down` existent → rien à faire.
- Sinon, utilise des noms déjà présents : remplace `name="thumbs_up"` par `name="arrow_up"` et `name="thumbs_down"` par `name="arrow_down"` dans `JrVote` (ou ajoute les 2 paths SVG au registre en suivant le format des entrées voisines). Choisis l'option qui respecte le registre existant.

- [ ] **Step 3 : Brancher `onVote` dans `cardHandlers`**

Dans `PanelJobsRadar`, l'objet `cardHandlers` (≈ ligne 656) liste les handlers passés aux cartes. Ajoute `onVote: voteJob,` :

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

- [ ] **Step 4 : Afficher `JrVote` dans `HotLeadCard`**

`HotLeadCard` doit recevoir `onVote`. Modifie sa signature (≈ ligne 267) pour ajouter `onVote` à la déstructuration :

```jsx
function HotLeadCard({ offer, rank, onApply, onSnooze, onArchive, onEditNotes, onSaveNotes, onCancelNotes, onVote, openMenu, onMenuToggle, notesEditing }) {
```

Puis, dans le footer `.jr-hot-foot` (≈ ligne 382), ajoute `<JrVote>` à gauche du bloc `.jr-cv-reco`. Remplace :

```jsx
      <footer className="jr-hot-foot">
        <div className="jr-cv-reco">
```

par :

```jsx
      <footer className="jr-hot-foot">
        <JrVote offer={offer} onVote={onVote} />
        <div className="jr-cv-reco">
```

- [ ] **Step 5 : Afficher `JrVote` (compact) dans `OfferRow`**

Modifie la signature de `OfferRow` (≈ ligne 415) pour ajouter `onVote` :

```jsx
function OfferRow({ offer, onApply, onSnooze, onArchive, onEditNotes, onSaveNotes, onCancelNotes, onVote, openMenu, onMenuToggle, notesEditing }) {
```

Dans `.jr-row-actions` (≈ ligne 473), ajoute `<JrVote compact>` avant le `JrActionsMenu`. Remplace :

```jsx
      <div className="jr-row-actions">
        <JrActionsMenu
```

par :

```jsx
      <div className="jr-row-actions">
        <JrVote offer={offer} onVote={onVote} compact />
        <JrActionsMenu
```

- [ ] **Step 6 : Vérifier (manuel navigateur) — le cœur du lot**

Ouvre le cockpit → Jobs Radar. Sur une carte hot lead :
1. Clic 👍 → le pouce passe en actif (couleur), toast « Noté 👍 », une rangée de raisons apparaît. **Contrôle DB** : `SELECT user_verdict, user_verdict_at FROM jobs WHERE id = '<id>';` → `up` + timestamp récent.
2. Clic sur une puce (ex. `coup de cœur`) → puce active. DB : `user_verdict_reason = 'coup de cœur'`.
3. Clic `préciser…` → input ; tape « équipe data forte » + Enter. DB : `user_verdict_reason = 'coup de cœur — équipe data forte'`.
4. Re-clic 👍 (actif) → vote annulé. DB : `user_verdict` NULL, `user_verdict_reason` NULL, `user_verdict_at` NULL.
5. Sur une ligne dense (`OfferRow`) : version compacte, clic 👎 → puces 👎 (`trop junior`, `run/BAU`, …). DB cohérente.
6. Recharge la page (F5) → le vote/raison s'affichent toujours (persistance confirmée).
Attendu : tous les points OK, aucun event JS en erreur dans la console.

- [ ] **Step 7 : Commit**

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "feat(jobs): UI vote 👍/👎 + raisons (JrVote) sur cartes et lignes"
```

## Task 5 : Styles du vote

**Files:**
- Modify: `cockpit/styles-jobs-radar.css` (fin de fichier)

- [ ] **Step 1 : Ajouter les styles `.jr-vote*`**

Ajoute en fin de `cockpit/styles-jobs-radar.css` (les variables `--tx`, `--accent`, etc. sont déjà définies plus haut dans le fichier ; réutilise les tokens voisins si les noms diffèrent) :

```css
/* ─── Vote / calibrage ─────────────────────────────────── */
.jr-vote { display: flex; flex-direction: column; gap: 8px; }
.jr-vote-thumbs { display: flex; align-items: center; gap: 6px; }
.jr-vote-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid var(--border, #2a2a33); background: transparent;
  color: var(--tx-dim, #9aa); cursor: pointer; transition: all .12s ease;
}
.jr-vote-btn:hover { border-color: var(--tx, #ddd); color: var(--tx, #ddd); }
.jr-vote-btn.is-up   { background: rgba(60,180,110,.16); border-color: rgba(60,180,110,.5); color: #46c07a; }
.jr-vote-btn.is-down { background: rgba(210,90,90,.14); border-color: rgba(210,90,90,.5); color: #d56a6a; }
.jr-vote--compact .jr-vote-btn { width: 26px; height: 26px; border-radius: 7px; }
.jr-vote-why {
  background: none; border: none; cursor: pointer; padding: 2px 6px;
  font-size: 11px; color: var(--accent, #e0a05a); text-decoration: underline dotted;
}
.jr-vote-reasons { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.jr-vote-chip {
  font-size: 11px; padding: 4px 9px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--border, #2a2a33); background: transparent; color: var(--tx-dim, #9aa);
  transition: all .12s ease;
}
.jr-vote-chip:hover { color: var(--tx, #ddd); border-color: var(--tx, #ddd); }
.jr-vote-chip.is-active { background: var(--accent, #e0a05a); border-color: var(--accent, #e0a05a); color: #1a1a1f; }
.jr-vote-chip--more { font-style: italic; }
.jr-vote-free { display: inline-flex; gap: 4px; align-items: center; }
.jr-vote-free-input {
  font-size: 11px; padding: 4px 8px; border-radius: 6px; min-width: 140px;
  border: 1px solid var(--border, #2a2a33); background: var(--bg-elev, #1a1a22); color: var(--tx, #ddd);
}
.jr-vote-free-ok {
  font-size: 11px; padding: 4px 8px; border-radius: 6px; cursor: pointer;
  border: 1px solid var(--accent, #e0a05a); background: transparent; color: var(--accent, #e0a05a);
}
```

- [ ] **Step 2 : Vérifier (manuel)**

Recharge le cockpit. Les pouces sont lisibles, l'état actif vert/rouge ressort, les puces sont cliquables et l'état actif (fond accent) est visible. Cohérent visuellement avec le reste du panel (`jr-*`).

- [ ] **Step 3 : Commit**

```bash
git add cockpit/styles-jobs-radar.css
git commit -m "style(jobs): styles du vote 👍/👎 + puces de raison"
```

## Task 6 : Finalisation Lot 1 (spec, archi, service worker)

**Files:**
- Modify: `docs/specs/tab-jobs.md`, `docs/specs/index.json`
- Modify: `docs/architecture/dependencies.yaml`, `docs/architecture/decisions.md`
- Modify: `sw.js` (généré)

- [ ] **Step 1 : MAJ spec onglet**

Dans `docs/specs/tab-jobs.md` :
- Section **Fonctionnalités** : ajoute une puce « **Vote 👍/👎 + raison par offre** : sur chaque carte et chaque ligne, l'utilisateur note l'offre ; un 👎/👍 ouvre des puces-raison (un clic) avec un « préciser… » en texte libre. Signal persisté, hérité à la republication (180j), destiné à calibrer le scoring. »
- Section **Back — sources de données**, ligne `jobs` : ajoute aux colonnes Write whitelist `user_verdict`, `user_verdict_reason`, `user_verdict_at`.
- Section **Télémétrie** (Appels externes) : ajoute l'event `jobs_feedback`.
- Ajoute une entrée datée en tête de **Dernière MAJ** : `2026-05-21 — ajout du vote 👍/👎 + raison (calibrage par feedback, Lot 1). Colonnes user_verdict* + héritage 180j (migration 014). Voir plan docs/superpowers/plans/2026-05-21-jobs-radar-calibrage-feedback.md.`

- [ ] **Step 2 : Bump `last_updated` dans l'index des specs**

Dans `docs/specs/index.json`, trouve l'entrée de la spec `tab-jobs` et mets `last_updated` à `2026-05-21`.
Run (vérif format): `node -e "JSON.parse(require('fs').readFileSync('docs/specs/index.json'))" && echo OK`
Attendu : `OK` (JSON valide).

- [ ] **Step 3 : MAJ architecture**

- `docs/architecture/dependencies.yaml` : sur la table `jobs`, ajoute les 3 colonnes `user_verdict*` (écrites par le front) ; déclare les 2 clés `user_profile` à venir (`job_pref_rules`, `job_pref_observed`) si le fichier liste les clés `user_profile`.
- `docs/architecture/decisions.md` : ajoute un ADR daté `2026-05-21 — Calibrage Jobs Radar par feedback` résumant : signal 👍/👎 + raison, profil 2 clés (rules verrouillé / observed Cowork), synthèse dans le run Cowork (pas de nouvelle pipeline), pas de second score, async (lendemain), héritage verdict 180j.

- [ ] **Step 4 : Régénérer le service worker**

Run: `node scripts/sync-sw.mjs`
Attendu : sortie indiquant `sw.js` synchronisé (le panel et le CSS ont changé). Ne PAS éditer `STATIC[]`/`CACHE` à la main.

- [ ] **Step 5 : Vérifier l'arbo CI specs (lint bloquant)**

Run: `python scripts/lint_specs.py` si présent (sinon ignore — la CI `lint-specs` le fera).
Attendu : pas d'erreur sur `tab-jobs.md`.

- [ ] **Step 6 : Commit**

```bash
git add docs/specs/tab-jobs.md docs/specs/index.json docs/architecture/dependencies.yaml docs/architecture/decisions.md sw.js
git commit -m "docs(jobs): spec + archi + sw pour le vote (Lot 1)"
```

---

# LOT 2 — Encart calibrage (profil éditable)

Affiche `job_pref_rules` (éditable) + `job_pref_observed` (lecture seule) en haut du Jobs Radar. Les deux sont déjà chargées en Tier 1 dans `window.PROFILE_DATA._values`.

## Task 7 : `upsertUserProfile` + composant `JrCalibrage`

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (helper d'upsert + composant + montage)

- [ ] **Step 1 : Ajouter le helper d'upsert `user_profile`**

Juste après `patchJobSupabase` (≈ ligne 24), ajoute (même pattern que `panel-profile.jsx::pfUpsertField`) :

```js
// ─── Upsert d'une clé user_profile (réutilise le pattern du panel Profil) ───
async function upsertUserProfile(key, value) {
  if (!window.sb || !window.SUPABASE_URL) throw new Error("supabase indisponible");
  const url = window.SUPABASE_URL + "/rest/v1/user_profile?on_conflict=key";
  const body = [{ key, value, updated_at: new Date().toISOString() }];
  const res = await fetch(url, {
    method: "POST",
    headers: { ...window.sb.headers, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("upsert " + res.status);
  return res.json();
}
```

- [ ] **Step 2 : Ajouter le composant `JrCalibrage`**

Juste avant `function ScanBanner(` (≈ ligne 491), insère :

```jsx
// ─── Encart calibrage — profil de préférences (rules éditable / observed RO) ───
function JrCalibrage() {
  const PF = (window.PROFILE_DATA && window.PROFILE_DATA._values) || {};
  const [open, setOpen]       = useStateJr(false);
  const [editing, setEditing] = useStateJr(false);
  const [draft, setDraft]     = useStateJr(PF.job_pref_rules || "");
  const [saving, setSaving]   = useStateJr(false);
  const [savedAt, setSavedAt] = useStateJr(null);
  const observed = PF.job_pref_observed || "";
  const rules = PF.job_pref_rules || "";

  const save = async () => {
    setSaving(true);
    try {
      await upsertUserProfile("job_pref_rules", draft);
      if (window.PROFILE_DATA) {
        window.PROFILE_DATA._values = { ...window.PROFILE_DATA._values, job_pref_rules: draft };
      }
      if (window.track) window.track("profile_field_saved", { key: "job_pref_rules" });
      setEditing(false);
      setSavedAt(Date.now());
    } catch (e) {
      alert("Échec de la sauvegarde : " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="jr-calib">
      <button className="jr-calib-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="jr-calib-kicker">
          <Icon name="sliders" size={13} stroke={2} />
          Calibrage · ce que le radar a compris de tes goûts
        </span>
        <Icon name={open ? "chevron_up" : "chevron_down"} size={16} stroke={2} />
      </button>

      {open && (
        <div className="jr-calib-body">
          {/* Tes règles — éditable, verrouillé côté Cowork */}
          <div className="jr-calib-block">
            <div className="jr-section-kicker">Tes règles <span className="jr-calib-lock">verrouillé</span></div>
            {!editing ? (
              <div className="jr-calib-rules">
                <p className="jr-calib-text">{rules || "Aucune règle. Écris ici ce que tu cherches (ou évites) — le scan en tiendra compte dès demain."}</p>
                <button className="jr-btn jr-btn--ghost jr-btn--sm" onClick={() => { setDraft(rules); setEditing(true); }}>
                  {rules ? "Modifier" : "Écrire mes règles"}
                </button>
              </div>
            ) : (
              <div className="jr-calib-editor">
                <textarea className="jr-calib-input" rows={4} autoFocus value={draft}
                  placeholder="Ex : je ne veux pas de RTE en grand groupe. Je priorise l'AI tooling early-stage. J'ignore < 95k."
                  onChange={(e) => setDraft(e.target.value)} />
                <div className="jr-calib-actions">
                  <button className="jr-btn jr-btn--ghost jr-btn--sm" onClick={() => setEditing(false)} disabled={saving}>Annuler</button>
                  <button className="jr-btn jr-btn--primary jr-btn--sm" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</button>
                </div>
              </div>
            )}
          </div>

          {/* Observé — lecture seule, maintenu par Cowork */}
          <div className="jr-calib-block">
            <div className="jr-section-kicker">Observé par le radar <span className="jr-calib-auto">auto</span></div>
            <p className="jr-calib-text jr-calib-text--observed">
              {observed || "Pas encore assez de votes pour inférer un profil. Note quelques offres 👍/👎 — le radar synthétise après quelques retours."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
```

> Note icônes : `sliders`, `chevron_up`, `chevron_down` doivent exister dans le registre `Icon`. Vérifie comme en Task 4 Step 2 ; sinon substitue par des noms présents (ex. `settings`, `arrow_up`, `arrow_down`).

- [ ] **Step 3 : Monter `JrCalibrage` en haut du panel**

Dans `PanelJobsRadar`, juste après `<ScanBanner scan={scan} />` (≈ ligne 742), ajoute :

```jsx
      {/* ─── SCAN BANNER ─── */}
      <ScanBanner scan={scan} />

      {/* ─── CALIBRAGE ─── */}
      <JrCalibrage />
```

- [ ] **Step 4 : Vérifier (manuel)**

Recharge le cockpit → Jobs Radar.
1. Un encart « Calibrage · ce que le radar a compris de tes goûts » apparaît sous le scan banner, replié. Clic → il s'ouvre.
2. Section « Tes règles » : clic « Écrire mes règles » → textarea. Tape un texte, Enregistrer. **Contrôle DB** : `SELECT value FROM user_profile WHERE key = 'job_pref_rules';` → ton texte. Recharge la page → le texte est toujours là (vient de `PROFILE_DATA._values`).
3. Section « Observé par le radar » : lecture seule (pas de bouton d'édition), affiche le message vide tant que `job_pref_observed` n'existe pas.
4. (Optionnel) insère manuellement `INSERT INTO user_profile (key, value) VALUES ('job_pref_observed', 'Test observé') ON CONFLICT (key) DO UPDATE SET value = excluded.value;`, recharge → le texte « Test observé » s'affiche en lecture seule. Nettoie ensuite (`DELETE ... WHERE key='job_pref_observed';`) si tu veux.
Attendu : tous OK, pas d'erreur console.

- [ ] **Step 5 : Commit**

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "feat(jobs): encart calibrage (job_pref_rules éditable / observed RO)"
```

## Task 8 : Styles de l'encart calibrage

**Files:**
- Modify: `cockpit/styles-jobs-radar.css`

- [ ] **Step 1 : Ajouter les styles `.jr-calib*`**

Ajoute en fin de `cockpit/styles-jobs-radar.css` :

```css
/* ─── Encart calibrage ─────────────────────────────────── */
.jr-calib { margin: 16px 0; border: 1px solid var(--border, #2a2a33); border-radius: 12px; overflow: hidden; }
.jr-calib-head {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: var(--bg-elev, #1a1a22); border: none; cursor: pointer; color: var(--tx, #ddd);
}
.jr-calib-kicker { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: .02em; }
.jr-calib-body { padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 760px) { .jr-calib-body { grid-template-columns: 1fr; } }
.jr-calib-block { display: flex; flex-direction: column; gap: 8px; }
.jr-calib-lock, .jr-calib-auto {
  font-size: 10px; padding: 1px 6px; border-radius: 999px; margin-left: 6px; vertical-align: middle;
}
.jr-calib-lock { background: rgba(224,160,90,.16); color: var(--accent, #e0a05a); }
.jr-calib-auto { background: rgba(120,120,140,.18); color: var(--tx-dim, #9aa); }
.jr-calib-text { font-size: 13px; line-height: 1.5; color: var(--tx, #ddd); white-space: pre-wrap; }
.jr-calib-text--observed { color: var(--tx-dim, #9aa); }
.jr-calib-input {
  width: 100%; font-size: 13px; line-height: 1.5; padding: 10px; border-radius: 8px;
  border: 1px solid var(--border, #2a2a33); background: var(--bg, #14141a); color: var(--tx, #ddd); resize: vertical;
}
.jr-calib-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
```

- [ ] **Step 2 : Vérifier (manuel)**

Recharge. L'encart est lisible, deux colonnes (rules / observed) qui passent en une colonne sous 760px. Badges « verrouillé » (accent) et « auto » (gris) visibles. Cohérent avec le panel.

- [ ] **Step 3 : Finaliser docs + sw + commit**

- MAJ `docs/specs/tab-jobs.md` : Fonctionnalités → puce « **Encart calibrage** : profil de préférences en haut du panel, "Tes règles" (éditable, stocké `user_profile.job_pref_rules`) + "Observé par le radar" (lecture seule, `job_pref_observed` maintenu par Cowork) ». Ajoute une ligne datée en **Dernière MAJ**.
- `docs/specs/index.json` : `last_updated` de `tab-jobs` → garde `2026-05-21`.
- Run: `node scripts/sync-sw.mjs`

```bash
git add cockpit/styles-jobs-radar.css docs/specs/tab-jobs.md docs/specs/index.json sw.js
git commit -m "style(jobs): encart calibrage + MAJ spec/sw (Lot 2)"
```

---

# LOT 3 — Boucle Cowork (doc, hors repo)

Pas de code repo : on met à jour le **prompt versionné** que l'utilisateur copie-colle dans Cowork. Vérification = run à blanc manuel.

## Task 9 : MAJ de la routine Cowork

**Files:**
- Modify: `docs/cowork-routines/jobs-radar.md`

- [ ] **Step 1 : Insérer l'Étape 0 (synthèse du profil)**

Dans le bloc de prompt (entre `GUARD : …` et `ÉTAPE 1 — Dédup …`), insère :

```
ÉTAPE 0 — Synthèse du profil de préférences (calibrage)

Avant toute chose, construis/rafraîchis le profil de préférences
de Jean à partir de ses retours dans le cockpit.

1. Lis les deux clés de préférence :
   SELECT key, value FROM user_profile
   WHERE key IN ('job_pref_rules', 'job_pref_observed');
   - job_pref_rules = règles écrites par Jean. AUTORITÉ ABSOLUE.
     Tu ne les modifies JAMAIS et tu ne les contredis jamais.
   - job_pref_observed = ta synthèse précédente (peut être vide).

2. Lis les retours explicites (90 derniers jours) :
   SELECT title, company, role_category, company_stage,
          score_total, user_verdict, user_verdict_reason
   FROM jobs
   WHERE user_verdict IS NOT NULL
     AND user_verdict_at >= now() - interval '90 days'
   ORDER BY user_verdict_at DESC;

3. Lis les signaux IMPLICITES (secondaires, poids faible) :
   - status='archived' jamais passé par 'applied' → négatif faible
   - status='applied' → positif faible
   - user_notes non vides → contexte qualitatif

4. Produis un job_pref_observed mis à jour : prose courte
   (≤ 1500 caractères), factuelle, qui dégage les MOTIFS :
   - motifs de rejet récurrents et leur fréquence
     (ex : "run déguisé = 6/11 rejets")
   - ce qui fait remonter une offre (secteurs, scope, stade)
   - tout désaccord systématique avec le score
     (ex : "downvote les RTE grand groupe même notés ≥7")
   Merge conservateur avec l'ancien observed ; ne contredis
   jamais job_pref_rules. Si < 5 votes au total : laisse
   job_pref_observed vide (ou inchangé).

5. Écris la synthèse (service_role) :
   INSERT INTO user_profile (key, value, updated_at)
   VALUES ('job_pref_observed', '<synthèse>', now())
   ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = now();
   N'écris JAMAIS job_pref_rules.
```

- [ ] **Step 2 : Injecter le profil dans le scoring (Étape 3)**

Dans le prompt, au début de `ÉTAPE 3 — Scoring`, ajoute :

```
CALIBRAGE (à appliquer à CHAQUE offre, par-dessus la rubric) :
Tiens compte de job_pref_rules (autorité) ET de job_pref_observed
(tendances inférées) lus à l'Étape 0. Concrètement :
- si une offre coche un motif de rejet récurrent de Jean, baisse
  score_sector/score_impact en conséquence et explique-le dans
  rubric_justif (axe "Calibrage").
- si elle correspond à un motif qu'il valorise (et que la rubric
  brute sous-évalue), remonte-la et justifie.
- une règle explicite de job_pref_rules PRIME sur la rubric.
Le score reste sur 10 (pas de second score) ; tu ajustes les axes
existants, tu n'ajoutes pas de colonne.
```

- [ ] **Step 3 : Ajouter le recalibrage hebdo**

Dans le prompt, après `ÉTAPE 6 — INSERT dans job_scans`, ajoute :

```
ÉTAPE 7 — Recalibrage hebdo du stock actif (le dimanche uniquement)

Si on est dimanche : re-score le stock ACTIF avec le profil courant.
   SELECT id, title, company, role_category, company_stage, pitch,
          score_seniority, score_sector, score_impact, score_bonus
   FROM jobs WHERE status IN ('new','to_apply');
Pour chaque ligne, recalcule le score à la lumière de
job_pref_rules + job_pref_observed (même logique de calibrage que
l'Étape 3) et UPDATE score_seniority/sector/impact/bonus/total +
rubric_justif. Ne touche PAS status, user_notes, user_verdict*,
intel. Borne-toi au stock actif (jamais archived/snoozed/applied)
pour rester dans le budget temps (15 min).
```

- [ ] **Step 4 : MAJ « Dernière MAJ » de la routine**

En tête de la section `## Dernière MAJ` de `docs/cowork-routines/jobs-radar.md`, ajoute :

```
2026-05-21 — calibrage par feedback : Étape 0 (synthèse job_pref_observed depuis les votes user_verdict + signaux implicites, sans jamais toucher job_pref_rules), injection du profil dans le scoring (Étape 3), recalibrage hebdo du stock actif (Étape 7, dimanche). Voir docs/superpowers/plans/2026-05-21-jobs-radar-calibrage-feedback.md.
```

- [ ] **Step 5 : Vérifier (run à blanc manuel — fait par Jean dans Cowork)**

Procédure de validation à exécuter dans Cowork après copier-coller du prompt mis à jour :
1. Voter quelques offres dans le cockpit (au moins 5, avec raisons variées).
2. Lancer la routine Cowork manuellement.
3. Contrôler en DB : `SELECT value FROM user_profile WHERE key='job_pref_observed';` → une synthèse non vide, cohérente avec les votes, qui ne contredit pas `job_pref_rules`.
4. Contrôler que `job_pref_rules` est **inchangée**.
5. Sur les nouvelles offres du scan : vérifier qu'une offre matchant un motif de rejet voté est bien redescendue, avec une justification « Calibrage » dans `rubric_justif`.
Attendu : profil plausible, règles préservées, scores déplacés dans le bon sens.

- [ ] **Step 6 : Commit**

```bash
git add docs/cowork-routines/jobs-radar.md
git commit -m "docs(cowork): boucle calibrage Jobs Radar (synthèse + scoring + recalibrage hebdo)"
```

---

## Intégration finale

- [ ] **Push de la branche + PR**

```bash
git push -u origin feat/jobs-radar-calibrage-feedback
gh pr create --fill --base main
```

- [ ] **Vérifier la CI** : `validate-spec`, `lint-specs`, `validate-arch`, `sw-sync` doivent passer. Corriger tout échec avant merge.
- [ ] **Rappel à Jean** : après merge, copier-coller le prompt mis à jour de `docs/cowork-routines/jobs-radar.md` dans la routine Cowork (le code repo seul ne suffit pas — Cowork est externe).
