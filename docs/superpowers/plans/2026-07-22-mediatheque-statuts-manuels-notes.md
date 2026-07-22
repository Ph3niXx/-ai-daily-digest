# Médiathèque — statut « mis de côté » + note par saison — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un statut manuel « mis de côté » (niveau franchise) et une note /100 par saison au tracker anime de la Médiathèque.

**Architecture:** Deux colonnes sur des tables existantes (`media_franchises.shelved`, `media_progress.rating`), aucune table nouvelle. Le statut « mis de côté » est un override d'affichage au niveau carte (pas un cas de dérivation) qui exclut la franchise des buckets actifs. La note est un contrôle inline dans la fiche, écrit en upsert optimiste sur `media_progress` (pattern `writeProgress` existant). Le pipeline `anime_tracker_sync` ne touche ni `shelved` ni `media_progress`, donc aucune interférence.

**Tech Stack:** React 18 + Babel standalone (no build step, composants sur `window.X`), Supabase Postgres (PostgREST REST, RLS authenticated), migration SQL appliquée via MCP Supabase.

## Global Constraints

- **Pas de build / pas de runner de test JS.** Vérification = scripts lint/validate Python (`validate_spec.py` + `validate_architecture.py` sont bloquants en CI), requêtes MCP Supabase, hard-refresh prod. Ne pas introduire de framework de test front.
- **Composants exposés sur `window`** (pas d'imports ES modules — incompatible Babel standalone). Réutiliser les hooks aliasés `useMdtState`/`useMdtMemo`/`useMdtEffect`.
- **Écritures optimistes obligatoires** : muter `window.MEDIATHEQUE_DATA` immédiatement + `setTick`, rollback + `cockpitToast` si échec réseau. Calquer `writeProgress` / `ackRelease`.
- **Règles cardinales, même commit que le code** : tout nouvel `event_type` → `docs/telemetry.md` avant le commit ; toute modif fonctionnelle d'onglet → `docs/specs/tab-mediatheque.md` + bump `last_updated` dans `docs/specs/index.json` ; après modif `cockpit/**` → `node scripts/sync-sw.mjs` (ne jamais éditer `STATIC[]`/`CACHE` à la main).
- **Migration prod-only** : appliquée via MCP Supabase (`apply_migration`), pas de stack locale.
- **Échelle de note** : entier 0–100 (comme AniList), clampé côté JS avant l'upsert.
- **Rating vit sur `media_progress`** (user-owned) ; `shelved` vit sur `media_franchises`. Le pipeline ne PATCH que `media_franchises.updated_at` (`pipelines/anime_tracker_sync.py:354`) → colonnes sûres.

---

## File Structure

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `sql/021_media_shelved_rating.sql` | **Créer** — 2 colonnes (`shelved`, `rating`) | 1 |
| `cockpit/panel-mediatheque.jsx` | **Modifier** — override statut shelved, chip filtre, `toggleShelved`, bouton/badge fiche (T2) ; `MdtRating`, `ratingById`, `writeRating`, câblage fiche (T3) | 2, 3 |
| `cockpit/styles-mediatheque.css` | **Modifier** — `.mdt-badge--shelved` (T2) ; `.mdt-rating*` (T3) | 2, 3 |
| `docs/telemetry.md` | **Modifier** — `mediatheque_shelve` (T2), `mediatheque_rate` (T3) | 2, 3 |
| `docs/specs/tab-mediatheque.md` | **Modifier** — Fonctionnalités / États / retrait TODO | 2, 3 |
| `docs/specs/index.json` | **Modifier** — bump `last_updated` médiathèque | 3 |
| `cockpit/sw.js` (auto) | Régénéré par `sync-sw.mjs` | 2, 3 |

---

## Task 1 : Migration — colonnes `shelved` + `rating`

**Files:**
- Create: `sql/021_media_shelved_rating.sql`

**Interfaces:**
- Produces: colonne `media_franchises.shelved boolean NOT NULL DEFAULT false` ; colonne `media_progress.rating int` (nullable, `CHECK 0..100`). Consommées par toutes les tâches suivantes via `select=*` du loader.

- [ ] **Step 1 : Écrire la migration**

Create `sql/021_media_shelved_rating.sql` :

```sql
-- ============================================================
-- Migration 021: Médiathèque — statut manuel « mis de côté » + note par saison
-- shelved : niveau franchise. Sûr : le pipeline anime_tracker_sync ne PATCH que
--   media_franchises.updated_at (pipelines/anime_tracker_sync.py:354).
-- rating  : niveau entrée, sur media_progress (user-owned, JAMAIS écrit par le pipeline).
-- RLS : policies authenticated déjà en place (sql/020) — les colonnes en héritent.
-- Spec : docs/superpowers/specs/2026-07-22-mediatheque-statuts-manuels-notes-design.md
-- ============================================================

ALTER TABLE media_franchises ADD COLUMN IF NOT EXISTS shelved boolean NOT NULL DEFAULT false;
ALTER TABLE media_progress   ADD COLUMN IF NOT EXISTS rating  int CHECK (rating >= 0 AND rating <= 100);
```

- [ ] **Step 2 : Appliquer via MCP Supabase**

Outil `mcp__claude_ai_Supabase__apply_migration`, name `021_media_shelved_rating`, query = contenu du fichier ci-dessus.

- [ ] **Step 3 : Vérifier que les colonnes existent**

Outil `mcp__claude_ai_Supabase__execute_sql` :

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where (table_name = 'media_franchises' and column_name = 'shelved')
   or (table_name = 'media_progress'   and column_name = 'rating')
order by table_name;
```

Expected : 2 lignes — `media_franchises.shelved` (boolean, NO) et `media_progress.rating` (integer, YES).

- [ ] **Step 4 : Commit**

```bash
git add sql/021_media_shelved_rating.sql
git commit -m "feat(mediatheque): migration shelved + rating (021)"
```

---

## Task 2 : Statut « mis de côté » (bout en bout)

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx`
- Modify: `cockpit/styles-mediatheque.css`
- Modify: `docs/telemetry.md`
- Modify: `docs/specs/tab-mediatheque.md`

**Interfaces:**
- Consumes: `media_franchises.shelved` (Task 1) ; helpers existants `mdtStatus()`, `window.sb.patchJSON`, `cockpitToast`, `window.track`.
- Produces: `toggleShelved(franchiseId)` ; prop `onShelve` sur `<FicheFranchise>` ; statut carte `{ id:"shelved", label:"Mis de côté" }` ; chip filtre `shelved` ; classe CSS `.mdt-badge--shelved`.

- [ ] **Step 1 : Override du statut au niveau carte**

Dans `cockpit/panel-mediatheque.jsx`, `cards` useMemo (~ligne 261-272), remplacer le calcul de `st` pour préserver `watched`/`released` (utilisés par la barre de progression) tout en affichant l'override :

```js
  const cards = useMdtMemo(() => {
    return D.franchises.map((f) => {
      const entries = entriesByFranchise.get(f.id) || [];
      const chain = entries.filter((e) => e.in_main_chain);
      const derived = mdtStatus(chain, progressById);
      const st = f.shelved ? { ...derived, id: "shelved", label: "Mis de côté" } : derived;
      const lastTouch = Math.max(
        new Date(f.added_at || 0).getTime(),
        ...entries.map((e) => progressById.has(e.id) ? new Date(D.progress.find((p) => p.entry_id === e.id)?.updated_at || 0).getTime() : 0)
      );
      return { f, entries, st, lastTouch };
    });
  }, [D.franchises, entriesByFranchise, progressById, tick]);
```

- [ ] **Step 2 : Filtre — exclure les shelved des buckets actifs, chip dédié**

Dans le `visible` useMemo (~ligne 274-285), remplacer le bloc de filtrage :

```js
  const visible = useMdtMemo(() => {
    let list = cards;
    if (statusFilter === "shelved") {
      list = list.filter((c) => c.f.shelved);
    } else {
      list = list.filter((c) => !c.f.shelved);   // "Tous" + buckets actifs excluent les mis de côté
      if (statusFilter === "to_watch") list = list.filter((c) => c.st.id === "to_watch");
      else if (statusFilter === "watching") list = list.filter((c) => c.st.id === "watching" || c.st.id === "up_to_date");
      else if (statusFilter === "seen") list = list.filter((c) => c.st.id === "seen");
    }
    const bySort = {
      activity: (a, b) => b.lastTouch - a.lastTouch,
      added: (a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0),
      alpha: (a, b) => (a.f.title_english || a.f.title_romaji || "").localeCompare(b.f.title_english || b.f.title_romaji || ""),
    };
    return [...list].sort(bySort[sort] || bySort.activity);
  }, [cards, statusFilter, sort]);
```

- [ ] **Step 3 : Ajouter le chip « Mis de côté »**

Dans la toolbar (~ligne 405), ajouter l'entrée au tableau des chips :

```js
            {[["all", "Tous"], ["to_watch", "À voir"], ["watching", "En cours"], ["seen", "Vu"], ["shelved", "Mis de côté"]].map(([id, label]) => (
```

- [ ] **Step 4 : Écrire `toggleShelved`**

Ajouter la fonction dans `PanelMediatheque` (à côté de `ackRelease`, ~ligne 371) :

```js
  async function toggleShelved(franchiseId) {
    const f = window.MEDIATHEQUE_DATA.franchises.find((x) => x.id === franchiseId);
    if (!f) return;
    const next = !f.shelved;
    f.shelved = next;                         // optimiste
    setTick((t) => t + 1);
    try {
      const res = await window.sb.patchJSON(
        window.SUPABASE_URL + "/rest/v1/media_franchises?id=eq." + franchiseId,
        { shelved: next });
      if (!res.ok) throw new Error("shelve " + res.status);
      window.track && window.track("mediatheque_shelve", { shelved: next, franchise_root_id: f.source_root_id });
    } catch (e) {
      f.shelved = !next;                      // rollback
      setTick((t) => t + 1);
      cockpitToast("Statut non enregistré — réessaie.", { kind: "error" });
    }
  }
```

- [ ] **Step 5 : Bouton toggle + badge en-tête dans `FicheFranchise`**

5a. Ajouter `onShelve` à la signature de `FicheFranchise` (~ligne 74) :

```js
function FicheFranchise({ fiche, D, progressById, onClose, onAdd, onProgress, onRemove, onShelve }) {
```

5b. Dans le bloc titres de l'en-tête (~ligne 125-130), sous `.mdt-fiche-meta`, ajouter le badge :

```js
          <div className="mdt-fiche-titles">
            <h2>{head.title}</h2>
            <p className="mdt-fiche-native">{head.romaji}{head.native ? ` · ${head.native}` : ""}</p>
            <p className="mdt-fiche-meta">{head.genres}</p>
            {head.franchise && head.franchise.shelved &&
              <span className="mdt-badge mdt-badge--shelved" style={{ marginTop: 6, display: "inline-block" }}>Mis de côté</span>}
            {head.synopsis && <p className="mdt-fiche-synopsis">{head.synopsis}</p>}
          </div>
```

5c. Remplacer le pied de fiche `.mdt-fiche-actions` (~ligne 161-166) pour insérer le toggle en mode bibliothèque :

```js
        <div className="mdt-fiche-actions">
          {fiche.mode === "preview"
            ? <button className="mdt-btn" onClick={onAdd}>+ Ajouter à ma bibliothèque</button>
            : <>
                {onShelve && <button className="mdt-btn mdt-btn--ghost" onClick={onShelve}>
                  {head.franchise && head.franchise.shelved ? "Réactiver" : "Mettre de côté"}</button>}
                <button className="mdt-btn mdt-btn--ghost" onClick={onRemove}>Retirer de ma bibliothèque</button>
              </>}
          <button className="mdt-btn mdt-btn--ghost" onClick={onClose}>Fermer</button>
        </div>
```

5d. Câbler `onShelve` dans le rendu de `<FicheFranchise>` (~ligne 481-489) :

```js
        <FicheFranchise
          fiche={fiche} D={D} progressById={progressById}
          onClose={() => setFiche(null)}
          onAdd={fiche.mode === "preview" && fiche.built ? () => addFranchise(fiche.built, fiche.mediaById) : null}
          onProgress={fiche.mode === "library" ? writeProgress : null}
          onRemove={fiche.mode === "library" ? () => removeFranchise(fiche.franchiseId) : null}
          onShelve={fiche.mode === "library" ? () => toggleShelved(fiche.franchiseId) : null}
        />
```

- [ ] **Step 6 : CSS badge shelved**

Dans `cockpit/styles-mediatheque.css`, après `.mdt-badge--seen` (~ligne 59) :

```css
.mdt-badge--shelved { color: var(--tx3); border-color: color-mix(in srgb, var(--tx) 15%, transparent); opacity: .75; }
```

- [ ] **Step 7 : Télémétrie (avant le commit)**

Dans `docs/telemetry.md`, après la ligne `mediatheque_release_ack` (~ligne 37) :

```markdown
| `mediatheque_shelve` | `{shelved, franchise_root_id}` | `cockpit/panel-mediatheque.jsx::toggleShelved()` après PATCH réussi |
```

- [ ] **Step 8 : Spec onglet**

Dans `docs/specs/tab-mediatheque.md` :
- Section **Fonctionnalités**, ajouter une puce :
  `- **Statut manuel « mis de côté »** : ranger une franchise qu'on ne suit plus (bouton dans la fiche). Elle sort des buckets actifs (À voir / En cours / Vu / « Tous ») et n'apparaît que sous son chip dédié « Mis de côté » ; progression et notes conservées, réactivable à tout moment.`
- Section **États & edge cases**, ajouter :
  `- Mettre de côté depuis un bucket actif → la carte disparaît de la vue courante (sauf filtre « Mis de côté »). Réactiver → retour dans le bucket dérivé de la progression.`
- Section **Limitations connues / TODO**, éditer la ligne `- [ ] pas de note/score ni statut manuel « Abandonné »` → `- [ ] pas de note/score au niveau franchise (agrégée)` (le statut manuel est désormais couvert ; la note est traitée en Task 3).

- [ ] **Step 9 : Régénérer le service worker**

```bash
node scripts/sync-sw.mjs
```

Expected : « sync-sw » met à jour `cockpit/sw.js` (hash/manifest) sans erreur.

- [ ] **Step 10 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css docs/telemetry.md docs/specs/tab-mediatheque.md cockpit/sw.js
git commit -m "feat(mediatheque): statut manuel « mis de côté » (franchise)"
```

---

## Task 3 : Note /100 par saison (bout en bout)

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx`
- Modify: `cockpit/styles-mediatheque.css`
- Modify: `docs/telemetry.md`
- Modify: `docs/specs/tab-mediatheque.md`
- Modify: `docs/specs/index.json`

**Interfaces:**
- Consumes: `media_progress.rating` (Task 1) ; upsert PostgREST `media_progress?on_conflict=entry_id` + `Prefer: resolution=merge-duplicates` (pattern `writeProgress`) ; `useMdtState`.
- Produces: composant `window`-local `MdtRating({ entry, ratingById, onRating })` ; map `ratingById` ; `writeRating(entry, value|null)` ; props `ratingById`/`onRating` sur `<FicheFranchise>`.

- [ ] **Step 1 : Composant `MdtRating`**

Dans `cockpit/panel-mediatheque.jsx`, après `MdtStepper` (~ligne 72) :

```js
function MdtRating({ entry, ratingById, onRating }) {
  const [editing, setEditing] = useMdtState(false);
  const rating = ratingById.get(entry.id);
  const clamp = (v) => Math.max(0, Math.min(100, v));
  if (editing) {
    return (
      <span className="mdt-rating">
        <input
          autoFocus type="number" min="0" max="100"
          defaultValue={rating != null ? rating : ""}
          onBlur={(e) => {
            setEditing(false);
            const raw = e.target.value.trim();
            onRating(entry, raw === "" ? null : clamp(Number(raw) || 0));
          }}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditing(false); }}
        />
      </span>
    );
  }
  return (
    <span className="mdt-rating">
      <button className={`mdt-rating-pill ${rating != null ? "is-rated" : ""}`}
        onClick={() => setEditing(true)} title="Noter (0–100)">
        {rating != null ? rating : "Noter"}
      </button>
    </span>
  );
}
```

- [ ] **Step 2 : Map `ratingById`**

Dans `PanelMediatheque`, après `progressById` (~ligne 253-257) :

```js
  const ratingById = useMdtMemo(() => {
    const map = new Map();
    for (const p of D.progress) if (p.rating != null) map.set(p.entry_id, p.rating);
    return map;
  }, [D.progress, tick]);
```

- [ ] **Step 3 : `writeRating` (upsert optimiste, préserve `episodes_watched`)**

Ajouter après `writeProgress` (~ligne 346) :

```js
  async function writeRating(entry, value) {
    const D2 = window.MEDIATHEQUE_DATA;
    const prev = D2.progress.find((p) => p.entry_id === entry.id);
    const prevRating = prev ? (prev.rating != null ? prev.rating : null) : undefined; // undefined = aucune ligne
    // Optimiste. On n'envoie PAS episodes_watched → merge-duplicates préserve la valeur existante.
    if (prev) prev.rating = value;
    else D2.progress.push({ entry_id: entry.id, episodes_watched: 0, rating: value, updated_at: new Date().toISOString() });
    setTick((t) => t + 1);
    try {
      const url = window.SUPABASE_URL + "/rest/v1/media_progress?on_conflict=entry_id";
      const res = await fetch(url, {
        method: "POST",
        headers: { ...window.sb.headers, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{ entry_id: entry.id, rating: value, updated_at: new Date().toISOString() }]),
      });
      if (!res.ok) throw new Error("rating " + res.status);
      window.track && window.track("mediatheque_rate", { entry_kind: entry.kind, rating: value, cleared: value === null });
    } catch (e) {
      if (prevRating === undefined) { const i = D2.progress.findIndex((p) => p.entry_id === entry.id); if (i >= 0) D2.progress.splice(i, 1); }
      else { const p = D2.progress.find((x) => x.entry_id === entry.id); if (p) p.rating = prevRating; }
      setTick((t) => t + 1);
      cockpitToast("Note non enregistrée — réessaie.", { kind: "error" });
    }
  }
```

- [ ] **Step 4 : Props `ratingById` / `onRating` sur `FicheFranchise` + rendu dans les lignes**

4a. Signature (~ligne 74, déjà modifiée en T2 pour `onShelve`) — ajouter les deux props :

```js
function FicheFranchise({ fiche, D, progressById, ratingById, onClose, onAdd, onProgress, onRemove, onShelve, onRating }) {
```

4b. Ligne chaîne canon (~ligne 144), après le `<MdtStepper>` :

```js
            {r.entry && onProgress && <MdtStepper entry={r.entry} progressById={progressById} onProgress={onProgress} />}
            {r.entry && onRating && <MdtRating entry={r.entry} ratingById={ratingById} onRating={onRating} />}
```

4c. Ligne bonus (~ligne 156), idem après le `<MdtStepper>` :

```js
              {r.entry && onProgress && <MdtStepper entry={r.entry} progressById={progressById} onProgress={onProgress} />}
              {r.entry && onRating && <MdtRating entry={r.entry} ratingById={ratingById} onRating={onRating} />}
```

4d. Câbler dans le rendu de `<FicheFranchise>` (bloc ~ligne 481, déjà édité en T2) :

```js
        <FicheFranchise
          fiche={fiche} D={D} progressById={progressById} ratingById={ratingById}
          onClose={() => setFiche(null)}
          onAdd={fiche.mode === "preview" && fiche.built ? () => addFranchise(fiche.built, fiche.mediaById) : null}
          onProgress={fiche.mode === "library" ? writeProgress : null}
          onRemove={fiche.mode === "library" ? () => removeFranchise(fiche.franchiseId) : null}
          onShelve={fiche.mode === "library" ? () => toggleShelved(fiche.franchiseId) : null}
          onRating={fiche.mode === "library" ? writeRating : null}
        />
```

- [ ] **Step 5 : CSS pastille note**

Dans `cockpit/styles-mediatheque.css`, après le bloc `.mdt-stepper*` (~ligne 95) :

```css
.mdt-rating { display: inline-flex; align-items: center; margin-left: 4px; }
.mdt-rating-pill { font-family: var(--font-mono); font-size: 11px; padding: 4px 9px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tx) 18%, transparent); background: transparent; color: var(--tx3); cursor: pointer; }
.mdt-rating-pill.is-rated { color: var(--brand); border-color: var(--brand); }
.mdt-rating input { width: 46px; font: inherit; font-family: var(--font-mono); font-size: 12px; text-align: center;
  color: var(--tx); background: transparent; border: 1px solid var(--brand); border-radius: 6px; }
```

- [ ] **Step 6 : Télémétrie (avant le commit)**

Dans `docs/telemetry.md`, après la ligne `mediatheque_shelve` (ajoutée en T2) :

```markdown
| `mediatheque_rate` | `{entry_kind, rating, cleared}` | `cockpit/panel-mediatheque.jsx::writeRating()` après upsert réussi |
```

- [ ] **Step 7 : Spec onglet + fonctions JS + bump index**

Dans `docs/specs/tab-mediatheque.md` :
- Section **Fonctionnalités**, ajouter une puce :
  `- **Note par saison** : chaque saison/film/bonus est notable sur 0–100 (échelle AniList) via une pastille inline dans la fiche ; champ vidé = note retirée. Stockée sur media_progress (user-owned).`
- Section **Front — fonctions JS**, ajouter une ligne au tableau :
  `| \`writeRating()\` / \`toggleShelved()\` | upsert note optimiste / bascule mis de côté | \`cockpit/panel-mediatheque.jsx\` |`
- Section **Limitations connues / TODO** : la ligne éditée en T2 (`pas de note/score au niveau franchise (agrégée)`) reste — c'est le vrai reliquat.
- Section **Dernière MAJ** : remplacer par
  `2026-07-22 — statut manuel « mis de côté » (franchise, exclu des buckets actifs) + note /100 par saison (media_progress.rating).`

Dans `docs/specs/index.json`, entrée `mediatheque` (~ligne 282) : `"last_updated": "2026-07-21"` → `"last_updated": "2026-07-22"`.

- [ ] **Step 8 : Régénérer le service worker**

```bash
node scripts/sync-sw.mjs
```

- [ ] **Step 9 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css docs/telemetry.md docs/specs/tab-mediatheque.md docs/specs/index.json cockpit/sw.js
git commit -m "feat(mediatheque): note /100 par saison (media_progress.rating)"
```

---

## Task 4 : Vérification bloquante + round-trip data + smoke prod

**Files:** aucun (sauf correctif éventuel). Tâche de validation.

**Interfaces:**
- Consumes: tout ce qui précède.

- [ ] **Step 1 : Lints/validators bloquants (exit 0)**

```bash
python scripts/validate_spec.py
python scripts/validate_architecture.py
python scripts/lint_specs_produit.py
python scripts/lint_known_sections.py
```

Expected : chacun sort en code 0 (aucune erreur). `validate_architecture.py` doit rester vert **sans** modifier `dependencies.yaml` : les nouvelles colonnes ne changent ni owner (`front`) ni RLS (`authenticated`) ni domaine (`perso`) des tables `media_franchises`/`media_progress`, et `dependencies.yaml` ne suit pas les colonnes. Si un validator échoue, corriger le fichier de doc concerné puis recommit dans la tâche d'origine.

- [ ] **Step 2 : Round-trip data via MCP Supabase**

Choisir une franchise et une entrée réelles :

```sql
select id, source_root_id, title_english, shelved from media_franchises order by added_at desc limit 3;
select e.id, e.title_english from media_entries e
  join media_franchises f on f.id = e.franchise_id order by f.added_at desc limit 3;
```

Vérifier qu'une écriture front récente (après smoke Step 3) est bien persistée :

```sql
select entry_id, episodes_watched, rating, updated_at from media_progress where rating is not null order by updated_at desc limit 5;
select id, title_english, shelved from media_franchises where shelved = true;
```

Expected : les valeurs `rating` / `shelved` posées en prod apparaissent ; `episodes_watched` inchangé sur les entrées déjà commencées puis notées (preuve que l'upsert note ne l'écrase pas).

- [ ] **Step 3 : Smoke prod (après push + hard-refresh Pages)**

1. Ouvrir la Médiathèque, ouvrir une fiche bibliothèque.
2. Cliquer **« Mettre de côté »** → la fiche affiche le badge « Mis de côté » ; fermer → la carte a disparu de « Tous » ; chip **« Mis de côté »** → elle y est ; **« Réactiver »** → retour dans son bucket.
3. Dans une fiche, cliquer une pastille **Noter** d'une saison, saisir `82`, valider → pastille `82` en surbrillance ; vider le champ → retour à « Noter ».
4. Hard-refresh → note et statut persistent (lecture Tier 2).
5. Vérifier l'absence d'erreur console (`read_console_messages` filtre `mediatheque` si dispo, ou console navigateur).

- [ ] **Step 4 : (si reliquat doc uniquement) commit final**

```bash
git add -A && git commit -m "docs(mediatheque): finalisation specs/archi statuts + notes"
```

Sinon, ne rien committer.

---

## Self-Review

**Spec coverage :**
- Statut manuel « mis de côté » niveau franchise → Task 2 (override statut, chip, toggle, filtre exclusion). ✅
- Exclusion des buckets actifs + « Tous » → Task 2 Step 2. ✅
- Note /100 par saison → Task 3 (MdtRating, writeRating, ratingById). ✅
- Migration 2 colonnes, colonnes sûres vs pipeline → Task 1 + Global Constraints. ✅
- Télémétrie 2 events → Task 2 Step 7, Task 3 Step 6. ✅
- Spec onglet + index bump → Task 2 Step 8, Task 3 Step 7. ✅
- Service worker → Task 2 Step 9, Task 3 Step 8. ✅
- Archi (dependencies.yaml) → Task 4 Step 1 (vérifié vert sans changement, justifié). ✅
- Edge : noter une entrée non commencée (crée ligne episodes_watched=0) → géré dans `writeRating` (push avec `episodes_watched: 0`), sans impact statut (somme inchangée). ✅
- Edge : rollback réseau → Task 2 Step 4 + Task 3 Step 3. ✅

**Placeholder scan :** aucun TBD/TODO applicatif ; chaque step porte le code complet. ✅

**Type consistency :** `toggleShelved(franchiseId)`, `writeRating(entry, value)`, `MdtRating({entry, ratingById, onRating})`, props `onShelve`/`onRating`/`ratingById` — noms identiques entre définition (T2/T3) et câblage (T2 Step 5d, T3 Step 4d). `st.id` override `"shelved"` cohérent avec chip `["shelved", ...]` et classe `.mdt-badge--shelved`. ✅
