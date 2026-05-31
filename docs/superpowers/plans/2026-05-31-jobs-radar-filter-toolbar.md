# Jobs Radar — barre de filtres collante + fraîcheur + persistance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Pas de tests unitaires** sur ce composant (React via Babel standalone, pas de harness) — la vérification = `sync-sw` propre + greps de non-régression + lints specs + contrôle visuel en prod.

**Goal:** Remonter les filtres du Jobs Radar dans un *toolbar collant* atteignable partout sur la page, ajouter un filtre de **fraîcheur** (`Tout · <24h · <7j`) appliqué au hero ET à la liste, et **mémoriser** les filtres entre visites (localStorage, hors recherche texte).

**Architecture:** Tout est dans `cockpit/panel-jobs-radar.jsx` + `cockpit/styles-jobs-radar.css`. Un nouvel état `freshFilter` rejoint le prédicat partagé `passesFilters(o)` (déjà appliqué hero + liste). Un nouveau composant présentation `JrFilterBar` (sticky, replié par défaut : puces des filtres actifs + compteurs + bouton « Filtres » qui déplie les `FilterGroup`) est rendu **au-dessus du hero**, et les anciens `.jr-filters` de l'en-tête de liste sont retirés. La persistance se fait via un initialiseur paresseux (`loadJrFilters`) + un `useEffect` de sérialisation.

**Tech Stack:** React 18 + @babel/standalone (no build, composants `function` hoistés dans le même fichier) · CSS theme-driven (`--bg2`, `--brand`, `--brand-tint`, `--bd`, `--surface`, `--tx/tx2/tx3`, `--radius`, `--font-mono`) · `node scripts/sync-sw.mjs` · lints Python specs.

**Branche :** `feat/jobs-radar-filter-toolbar` (à créer — Task 1 step 1). Le design doc est déjà committé sur `main` (`1a06f3c`), donc présent dans l'ascendance de la branche.

**Commit (règle cardinale : changement fonctionnel d'onglet → code + spec dans le MÊME commit) :** un seul commit fonctionnel couvrant `cockpit/panel-jobs-radar.jsx` + `cockpit/styles-jobs-radar.css` + `sw.js` + `docs/specs/tab-jobs.md` + `docs/specs/index.json` (Task 8). Les Tasks 1-7 ne committent pas.

---

## Task 1 : Branche + persistance localStorage + état `freshFilter`

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (helper top-level ~après ligne 84 ; bloc états filtres ~888-894)

- [ ] **Step 1 : Créer la branche de travail**

```bash
git switch -c feat/jobs-radar-filter-toolbar
```
Expected : `Switched to a new branch 'feat/jobs-radar-filter-toolbar'`.

- [ ] **Step 2 : Ajouter le helper de persistance (top-level, après le helper `dayLabel`, ~ligne 85)**

Insérer ce bloc juste après la fonction `dayLabel` (helpers top-level, avant les composants) :

```js
// ─── Persistance des filtres (localStorage) — toolbar 2026-05-31 ───
const JR_FILTERS_KEY = "jr.filters.v1";
function loadJrFilters() {
  try {
    const raw = localStorage.getItem(JR_FILTERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
```

- [ ] **Step 3 : Remplacer le bloc d'états des filtres (lignes 888-894)**

Remplacer **intégralement** :

```js
  // Filters
  const [scoreFilter, setScoreFilter]   = useStateJr("all");  // all | hot | mid | low
  const [catFilter,   setCatFilter]     = useStateJr("all");
  const [remoteFilter,setRemoteFilter]  = useStateJr("all");  // all | remote
  const [statusFilter,setStatusFilter]  = useStateJr("active"); // active = new+to_apply+applied (hide archived+snoozed)
  const [query,       setQuery]         = useStateJr("");
  const [sort,        setSort]          = useStateJr("score"); // score | recent
```

par :

```js
  // Filters — hydratés depuis localStorage (sauf la recherche), persistés via l'effet ci-dessous.
  const f0 = useMemoJr(() => loadJrFilters(), []);
  const [scoreFilter, setScoreFilter]   = useStateJr(f0.scoreFilter  ?? "all");   // all | hot | mid | low
  const [catFilter,   setCatFilter]     = useStateJr(f0.catFilter    ?? "all");
  const [remoteFilter,setRemoteFilter]  = useStateJr(f0.remoteFilter ?? "all");   // all | remote
  const [statusFilter,setStatusFilter]  = useStateJr(f0.statusFilter ?? "active");// active = new+to_apply+applied
  const [freshFilter, setFreshFilter]   = useStateJr(f0.freshFilter  ?? "all");   // all | 24h | 7j
  const [query,       setQuery]         = useStateJr("");                          // non persisté (design §5)
  const [sort,        setSort]          = useStateJr(f0.sort          ?? "score"); // score | recent

  // Persistance des facettes (pas la recherche) — design §5.
  useEffectJr(() => {
    try {
      localStorage.setItem(JR_FILTERS_KEY, JSON.stringify(
        { scoreFilter, catFilter, remoteFilter, statusFilter, freshFilter, sort }));
    } catch {}
  }, [scoreFilter, catFilter, remoteFilter, statusFilter, freshFilter, sort]);
```

- [ ] **Step 4 : Vérifier (grep) que `freshFilter` et le helper existent**

Run: `git --no-pager grep -n "freshFilter\|loadJrFilters\|JR_FILTERS_KEY" -- cockpit/panel-jobs-radar.jsx`
Expected : hits pour `loadJrFilters` (def + appel), `JR_FILTERS_KEY` (def + effet), `freshFilter` (état). Pas de commit.

---

## Task 2 : Filtre fraîcheur dans le prédicat partagé

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (`passesFilters` ~898-918 ; deps `heroLeads` ~931 ; deps `listOffers` ~946)

- [ ] **Step 1 : Ajouter la clause fraîcheur dans `passesFilters` (avant `return true;`, ligne ~917)**

Juste avant `    return true;` dans `passesFilters`, insérer :

```js
    if (freshFilter === "24h" && o.posted_days_ago !== 0) return false;
    if (freshFilter === "7j"  && !(o.posted_days_ago != null && o.posted_days_ago < 7)) return false;
```

(`posted_days_ago = daysSinceDate(posted_date || first_seen_date)`, déjà calculé dans `data-loader.js::transformJobRow`. `<24h` = daté/repéré aujourd'hui (`=== 0`) ; `<7j` = `< 7` ; valeur nulle → exclue quand un filtre fraîcheur est actif.)

- [ ] **Step 2 : Ajouter `freshFilter` aux deps de `heroLeads` (ligne ~931)**

Remplacer `[offers, scoreFilter, catFilter, remoteFilter, statusFilter, query]`
par `[offers, scoreFilter, catFilter, remoteFilter, statusFilter, freshFilter, query]`.

- [ ] **Step 3 : Ajouter `freshFilter` aux deps de `listOffers` (ligne ~946)**

Remplacer `[offers, heroLeads, scoreFilter, catFilter, remoteFilter, statusFilter, query, sort]`
par `[offers, heroLeads, scoreFilter, catFilter, remoteFilter, statusFilter, freshFilter, query, sort]`.

- [ ] **Step 4 : Vérifier (grep)**

Run: `git --no-pager grep -n "freshFilter" -- cockpit/panel-jobs-radar.jsx`
Expected : ≥ 5 hits (état + 2 clauses + 2 deps ; + à venir les usages JrFilterBar). Pas de commit.

---

## Task 3 : Dérivations `filteredCount`, `activeChips`, `resetAllFilters`

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (après les compteurs `totalCount/newCount/closedCount` ~951, avant `return (`)

- [ ] **Step 1 : Insérer le bloc de dérivations (juste après `const closedCount = …;` ligne ~951)**

```js
  // ─── Toolbar : compteur filtré + puces des filtres actifs (design §3-4) ───
  const filteredCount = heroLeads.length + listOffers.length;
  const JR_SCORE_LABEL  = { hot: "Hot ≥7", mid: "Mid 5-7", low: "Low <5" };
  const JR_ROLE_LABEL   = { produit: "Produit", rte: "RTE", pgm: "PgM", pjm: "PjM", cos: "CoS", em: "EM" };
  const JR_STATUS_LABEL = { new: "Nouvelles", to_apply: "À postuler", applied: "Candidaté", closed: "Clôturées", all: "Tout" };
  const JR_FRESH_LABEL  = { "24h": "< 24h", "7j": "< 7j" };
  const activeChips = [];
  if (scoreFilter !== "all")     activeChips.push({ key: "score",  label: `Score : ${JR_SCORE_LABEL[scoreFilter]}`,      clear: () => setScoreFilter("all") });
  if (catFilter !== "all")       activeChips.push({ key: "cat",    label: `Rôle : ${JR_ROLE_LABEL[catFilter]}`,          clear: () => setCatFilter("all") });
  if (remoteFilter === "remote") activeChips.push({ key: "remote", label: "Remote",                                     clear: () => setRemoteFilter("all") });
  if (statusFilter !== "active") activeChips.push({ key: "status", label: `Statut : ${JR_STATUS_LABEL[statusFilter]}`,   clear: () => setStatusFilter("active") });
  if (freshFilter !== "all")     activeChips.push({ key: "fresh",  label: `🕒 ${JR_FRESH_LABEL[freshFilter]}`, fresh: true, clear: () => setFreshFilter("all") });
  if (query.trim())              activeChips.push({ key: "q",      label: `🔍 « ${query.trim()} »`,                      clear: () => setQuery("") });
  const resetAllFilters = () => {
    setScoreFilter("all"); setCatFilter("all"); setRemoteFilter("all");
    setStatusFilter("active"); setFreshFilter("all"); setQuery("");
  };
```

- [ ] **Step 2 : Vérifier (grep)**

Run: `git --no-pager grep -n "activeChips\|filteredCount\|resetAllFilters" -- cockpit/panel-jobs-radar.jsx`
Expected : hits (déf ici ; usages à venir). Pas de commit.

---

## Task 4 : Composant `JrFilterBar`

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (nouveau composant top-level, juste après `FilterGroup` ~ligne 1105, avant `window.PanelJobsRadar`)

- [ ] **Step 1 : Ajouter le composant (après la fonction `FilterGroup`, avant `window.PanelJobsRadar = PanelJobsRadar;`)**

```jsx
function JrFilterBar({
  hotLeadsCount, filteredCount, activeChips, resetAllFilters,
  scoreFilter, setScoreFilter, catFilter, setCatFilter,
  remoteFilter, setRemoteFilter, statusFilter, setStatusFilter,
  freshFilter, setFreshFilter, query, setQuery, sort, setSort,
}) {
  const [expanded, setExpanded] = useStateJr(false);
  return (
    <div className="jr-filterbar">
      <div className="jr-filterbar-row">
        <span className="jr-fb-hot" title="Total hot leads (non filtré)">🔥 {hotLeadsCount} hot</span>
        <div className="jr-fb-chips">
          {activeChips.length === 0
            ? <span className="jr-fb-empty">Aucun filtre actif</span>
            : activeChips.map(c => (
                <span key={c.key} className={"jr-chip" + (c.fresh ? " jr-chip--fresh" : "")}>
                  {c.label}
                  <button className="jr-chip-x" onClick={c.clear} aria-label="Retirer ce filtre">×</button>
                </span>
              ))}
        </div>
        <span className="jr-fb-count">{filteredCount} offre{filteredCount > 1 ? "s" : ""}</span>
        <button
          className={"jr-fb-toggle" + (expanded ? " is-open" : "")}
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >Filtres {expanded ? "▴" : "▾"}</button>
      </div>
      <div className={"jr-filterbar-panel" + (expanded ? " is-open" : "")}>
        <div className="jr-filterbar-panel-inner">
          <div className="jr-fb-line">
            <div className="jr-search">
              <Icon name="search" size={14} stroke={2} />
              <input
                className="jr-search-input"
                placeholder="Titre, boîte, pitch…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {activeChips.length > 0 && (
              <button className="jr-fb-reset" onClick={resetAllFilters}>Tout réinitialiser</button>
            )}
          </div>
          <div className="jr-fb-line">
            <span className="jr-fb-label">Score</span>
            <FilterGroup value={scoreFilter} onChange={setScoreFilter} options={[
              { id: "all", label: "Tous scores" }, { id: "hot", label: "Hot (≥7)" },
              { id: "mid", label: "Mid (5-7)" }, { id: "low", label: "Low (<5)" },
            ]} />
          </div>
          <div className="jr-fb-line">
            <span className="jr-fb-label">Rôle</span>
            <FilterGroup value={catFilter} onChange={setCatFilter} options={[
              { id: "all", label: "Tous rôles" }, { id: "produit", label: "Produit" },
              { id: "rte", label: "RTE" }, { id: "pgm", label: "PgM" },
              { id: "pjm", label: "PjM" }, { id: "cos", label: "CoS" }, { id: "em", label: "EM" },
            ]} />
          </div>
          <div className="jr-fb-line">
            <span className="jr-fb-label">Lieu</span>
            <FilterGroup value={remoteFilter} onChange={setRemoteFilter} options={[
              { id: "all", label: "Tous lieux" }, { id: "remote", label: "Remote" },
            ]} />
            <span className="jr-fb-label jr-fb-label--gap">Fraîcheur</span>
            <FilterGroup value={freshFilter} onChange={setFreshFilter} options={[
              { id: "all", label: "Tout" }, { id: "24h", label: "< 24h" }, { id: "7j", label: "< 7j" },
            ]} />
          </div>
          <div className="jr-fb-line">
            <span className="jr-fb-label">Statut</span>
            <FilterGroup value={statusFilter} onChange={setStatusFilter} options={[
              { id: "active", label: "Actives" }, { id: "new", label: "Nouvelles" },
              { id: "to_apply", label: "À postuler" }, { id: "applied", label: "Candidaté" },
              { id: "closed", label: "Clôturées" }, { id: "all", label: "Tout" },
            ]} />
          </div>
          <div className="jr-fb-line">
            <span className="jr-fb-label">Tri</span>
            <FilterGroup value={sort} onChange={setSort} options={[
              { id: "score", label: "Score" }, { id: "recent", label: "Récence" },
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

(`FilterGroup` et `Icon` sont déjà dans le module — `FilterGroup` est une déclaration de fonction hoistée, donc OK même si `JrFilterBar` est placé avant elle.)

- [ ] **Step 2 : Vérifier (grep)**

Run: `git --no-pager grep -n "function JrFilterBar" -- cockpit/panel-jobs-radar.jsx`
Expected : 1 hit. Pas de commit.

---

## Task 5 : Câblage du rendu (insérer le toolbar, retirer les anciens filtres)

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (insertion ~après `<JrCalibrage />` ligne 983 ; en-tête liste + bloc `.jr-filters` lignes 1006-1072)

- [ ] **Step 1 : Insérer `<JrFilterBar>` juste après `<JrCalibrage />` (ligne ~983), avant le hero**

Après la ligne `      <JrCalibrage />` insérer :

```jsx

      {/* ─── FILTRES (toolbar collant) ─── */}
      <JrFilterBar
        hotLeadsCount={hotLeadsCount} filteredCount={filteredCount}
        activeChips={activeChips} resetAllFilters={resetAllFilters}
        scoreFilter={scoreFilter} setScoreFilter={setScoreFilter}
        catFilter={catFilter} setCatFilter={setCatFilter}
        remoteFilter={remoteFilter} setRemoteFilter={setRemoteFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        freshFilter={freshFilter} setFreshFilter={setFreshFilter}
        query={query} setQuery={setQuery}
        sort={sort} setSort={setSort}
      />
```

- [ ] **Step 2 : Remplacer l'en-tête de la liste + bloc filtres (lignes 1007-1072)**

Remplacer **intégralement** ce bloc :

```jsx
        <div className="jr-section-head jr-section-head--list">
          <div>
            <div className="jr-section-kicker">Le reste du scan</div>
            <h2 className="jr-section-title">
              {listOffers.length} offre{listOffers.length > 1 ? "s" : ""} à trier
            </h2>
          </div>
          <div className="jr-filters">
            <div className="jr-search">
              <Icon name="search" size={14} stroke={2} />
              <input
                className="jr-search-input"
                placeholder="Titre, boîte, pitch…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <FilterGroup
              value={scoreFilter} onChange={setScoreFilter}
              options={[
                { id: "all", label: "Tous scores" },
                { id: "hot", label: "Hot (≥7)" },
                { id: "mid", label: "Mid (5-7)" },
                { id: "low", label: "Low (<5)" },
              ]}
            />
            <FilterGroup
              value={catFilter} onChange={setCatFilter}
              options={[
                { id: "all",     label: "Tous rôles" },
                { id: "produit", label: "Produit" },
                { id: "rte",     label: "RTE" },
                { id: "pgm",     label: "PgM" },
                { id: "pjm",     label: "PjM" },
                { id: "cos",     label: "CoS" },
                { id: "em",      label: "EM" },
              ]}
            />
            <FilterGroup
              value={remoteFilter} onChange={setRemoteFilter}
              options={[
                { id: "all",    label: "Tous lieux" },
                { id: "remote", label: "Remote" },
              ]}
            />
            <FilterGroup
              value={statusFilter} onChange={setStatusFilter}
              options={[
                { id: "active",   label: "Actives" },
                { id: "new",      label: "Nouvelles" },
                { id: "to_apply", label: "À postuler" },
                { id: "applied",  label: "Candidaté" },
                { id: "closed",   label: "Clôturées" },
                { id: "all",      label: "Tout" },
              ]}
            />
            <div className="jr-sort">
              <button
                className={`jr-sort-btn ${sort === "score" ? "is-active" : ""}`}
                onClick={() => setSort("score")}>Score</button>
              <button
                className={`jr-sort-btn ${sort === "recent" ? "is-active" : ""}`}
                onClick={() => setSort("recent")}>Récence</button>
            </div>
          </div>
        </div>
```

par (en-tête de section seule, les filtres vivent désormais dans le toolbar) :

```jsx
        <div className="jr-section-head">
          <div className="jr-section-kicker">Le reste du scan</div>
          <h2 className="jr-section-title">
            {listOffers.length} offre{listOffers.length > 1 ? "s" : ""} à trier
          </h2>
        </div>
```

- [ ] **Step 3 : Vérifier (greps de non-régression)**

Run: `git --no-pager grep -n "className=\"jr-filters\"\|jr-sort-btn\|jr-section-head--list" -- cockpit/panel-jobs-radar.jsx`
Expected : **aucun hit** (l'ancien bloc filtres, le tri custom et le modificateur `--list` ont disparu du JSX).

Run: `git --no-pager grep -c "<JrFilterBar" -- cockpit/panel-jobs-radar.jsx`
Expected : `1` (le rendu). Pas de commit.

---

## Task 6 : Styles du toolbar collant

**Files:**
- Modify: `cockpit/styles-jobs-radar.css` (ajouter une section après le bloc `FILTERS`, ~ligne 850)

- [ ] **Step 1 : Ajouter la section CSS (après `[data-theme="obsidian"] .jr-sort-btn.is-active …` ~ligne 850)**

```css
/* ═══════════════════════════════════════════════════════════════
   FILTER TOOLBAR (sticky) — toolbar 2026-05-31
   ═══════════════════════════════════════════════════════════════ */
.jr-filterbar {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: 0 0 24px;
  background: var(--bg2);
  backdrop-filter: blur(12px);
  border: 1px solid var(--bd);
  border-radius: var(--radius);
}
.jr-filterbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.jr-fb-hot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--brand-ink, var(--brand));
  background: var(--brand-tint);
  border: 1px solid var(--brand);
  border-radius: 999px;
  padding: 3px 10px;
}
.jr-fb-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 120px;
}
.jr-fb-empty {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--tx3);
  font-style: italic;
}
.jr-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--tx2);
  background: var(--surface);
  border: 1px solid var(--bd);
  border-radius: var(--radius);
  padding: 3px 6px 3px 9px;
}
.jr-chip--fresh {
  color: var(--brand-ink, var(--brand));
  border-color: var(--brand);
}
.jr-chip-x {
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--tx3);
  font-size: 14px;
  line-height: 1;
  padding: 0;
}
.jr-chip-x:hover { color: var(--tx); }
.jr-fb-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
  white-space: nowrap;
}
.jr-fb-toggle {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  color: var(--brand-ink, var(--brand));
  background: var(--brand-tint);
  border: 1px solid var(--brand);
  border-radius: var(--radius);
  padding: 6px 12px;
  white-space: nowrap;
}
.jr-fb-toggle:hover { filter: brightness(1.05); }
.jr-filterbar-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.26s ease;
}
.jr-filterbar-panel.is-open {
  max-height: 360px;
  border-top: 1px solid var(--bd);
}
.jr-filterbar-panel-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}
.jr-fb-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.jr-fb-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--tx3);
  min-width: 58px;
}
.jr-fb-label--gap { min-width: 0; margin-left: 10px; }
.jr-fb-reset {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--tx3);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
}
.jr-fb-reset:hover { color: var(--tx); }

@media (max-width: 760px) {
  .jr-filterbar-row { padding: 8px 10px; gap: 8px; }
  .jr-fb-label { min-width: 0; }
}
```

- [ ] **Step 2 : Vérifier (grep)**

Run: `git --no-pager grep -n "jr-filterbar\b" -- cockpit/styles-jobs-radar.css`
Expected : ≥ 3 hits (`.jr-filterbar`, `.jr-filterbar-row`, `.jr-filterbar-panel`…). Pas de commit.

---

## Task 7 : Service worker + non-régression

**Files:**
- Run: `node scripts/sync-sw.mjs` (régénère `sw.js`)

- [ ] **Step 1 : Régénérer le service worker**

Run: `node scripts/sync-sw.mjs`
Expected : `[sync-sw] CACHE → cockpit-vNN, STATIC → NN entries` (exit 0). Ne **jamais** éditer `sw.js` à la main.

- [ ] **Step 2 : Vérifier qu'aucune référence morte ne subsiste**

Run: `git --no-pager grep -n "jr-sort\b\|className=\"jr-filters\"" -- cockpit/panel-jobs-radar.jsx`
Expected : **aucun hit** dans le JSX (le tri et les filtres inline sont passés dans le toolbar). Pas de commit.

---

## Task 8 : Spec onglet + index + commit fonctionnel groupé

**Files:**
- Modify: `docs/specs/tab-jobs.md` (Fonctionnalités + Front structure UI + Front fonctions JS + « Dernière MAJ »)
- Modify: `docs/specs/index.json` (`last_updated` de l'entrée `jobs`)

- [ ] **Step 1 : `tab-jobs.md` § Fonctionnalités — décrire le comportement (langage user-facing, AUCUN nom de variable/colonne — `lint-specs` bloquant)**

Dans la section **Fonctionnalités** (vers le bullet « Liste dense filtrable »), ajouter :
> Une **barre de filtres collante** reste visible en haut de page quand on fait défiler : elle résume les filtres actifs sous forme d'étiquettes (retirables d'un clic) et se déplie pour tout régler. Un filtre de **fraîcheur** permet de n'afficher que les offres repérées il y a moins de 24 h ou moins d'une semaine. Tous les filtres pilotent à la fois le bloc « hot leads » et la liste, et sont **mémorisés** d'une visite à l'autre (sauf la recherche texte, qui repart vide).

- [ ] **Step 2 : `tab-jobs.md` § Front — structure UI — refléter la refonte DOM**

Dans l'arbre DOM, **insérer** un nœud avant `.jr-hot-section` et **simplifier** l'en-tête de liste :
```
  - `<JrFilterBar>` → `.jr-filterbar` (toolbar collant `position:sticky;top:0;z-index:30` au-dessus du hero) : ligne repliée (badge `🔥 hot` global + `.jr-fb-chips` puces des filtres actifs `.jr-chip` + compteur filtré + bouton « Filtres ») et panneau dépliable `.jr-filterbar-panel` (recherche + 6 `<FilterGroup>` score/rôle/lieu/fraîcheur/statut/tri + « Tout réinitialiser »)
  - `.jr-hot-section` (conditionnel si `heroLeads.length > 0`) → `.jr-hot-grid` avec `<HotLeadCard>` …
  - `.jr-list-section`
    - `.jr-section-head` → kicker + titre (les filtres ont migré dans `<JrFilterBar>`)
    - `.jr-list` OR `.jr-empty` avec liste de `<OfferRow>`
```
(Remplace les anciennes lignes `.jr-hot-section (conditionnel si hotLeads.length > 0)` / `.jr-section-head--list … .jr-filters`.)

- [ ] **Step 3 : `tab-jobs.md` § Front — fonctions JS — table**

1. Mettre à jour la description de la ligne `PanelJobsRadar` : remplacer « split hot/rest, 4 filtres » par « prédicat partagé `passesFilters` (hero + liste), 5 facettes + recherche, persistées dans `localStorage["jr.filters.v1"]` (hors recherche) ».
2. Ajouter, juste après la ligne `FilterGroup`, une nouvelle ligne :
```
| `JrFilterBar({ hotLeadsCount, filteredCount, activeChips, ... })` | Toolbar collant : badge hot global + puces des filtres actifs (retirables) + compteur filtré + panneau dépliable des `<FilterGroup>` (score/rôle/lieu/fraîcheur/statut/tri) + reset | [cockpit/panel-jobs-radar.jsx](cockpit/panel-jobs-radar.jsx) |
```

- [ ] **Step 4 : `tab-jobs.md` — entrée en tête de `## Dernière MAJ`**

Ajouter en première ligne de la section `## Dernière MAJ` (s'aligner sur le format des entrées existantes) :
```
2026-05-31 — **Barre de filtres collante + filtre fraîcheur + persistance** : les filtres remontent dans un bandeau collant (étiquettes des filtres actifs + dépliage à la demande), un nouveau filtre « fraîcheur » isole les offres de moins de 24 h / moins d'une semaine, et les réglages sont mémorisés entre visites (hors recherche). Iso-archi (pas d'ADR).
```

- [ ] **Step 5 : `index.json` — `last_updated` de l'entrée `jobs`**

L'entrée `{ "slug": "jobs", … }` a déjà `"last_updated": "2026-05-31"` (lot EM/hero-filters du jour) → **aucun changement à faire**. Vérifier seulement qu'elle vaut bien `"2026-05-31"`.

- [ ] **Step 6 : Lints specs (= le test)**

Run :
```
python scripts/validate_spec.py
python scripts/lint_specs_produit.py
python scripts/lint_known_sections.py
```
Expected : exit 0 pour chacun (sous Windows, préfixer `validate_spec.py` de `PYTHONUTF8=1` si l'emoji du résumé casse l'affichage — la validation passe quand même).

- [ ] **Step 7 : Commit fonctionnel unique (code + css + sw + spec)**

```bash
git add cockpit/panel-jobs-radar.jsx cockpit/styles-jobs-radar.css sw.js docs/specs/tab-jobs.md docs/specs/index.json
git commit -m "feat(jobs): barre de filtres collante + filtre fraîcheur + persistance"
```

---

## Task 9 : Intégration + vérif prod

- [ ] **Step 1 : Merge + push** (le front se vérifie en prod, pas en local — pas de chromium sur Windows)

Suivre `superpowers:finishing-a-development-branch` : lints verts → merge `feat/jobs-radar-filter-toolbar` sur `main` (FF) → `git push origin main` (Pages déploie).

- [ ] **Step 2 : Vérif déployé (sans navigateur)**

`WebFetch` `https://ph3nixx.github.io/jarvis-cockpit/cockpit/panel-jobs-radar.jsx` → confirmer la présence de `function JrFilterBar` et `freshFilter`. `WebFetch` `https://ph3nixx.github.io/jarvis-cockpit/cockpit/styles-jobs-radar.css` → confirmer `.jr-filterbar`.

- [ ] **Step 3 : Vérif visuelle en prod (hard-refresh Pages)** — checklist du design §Vérification :
  1. Scroller au bas de la liste → le toolbar (puces + `🔥 N hot`) reste collé en haut.
  2. `Fraîcheur < 24h` → hero + liste ne gardent que les offres du jour ; `< 7j` → moins de 7 jours.
  3. Combiner rôle + fraîcheur → hero ET liste suivent les deux.
  4. Cliquer le `×` d'une puce → la facette revient au défaut, `N offres` recompté.
  5. Recharger l'onglet → filtres restaurés (recherche vide).
  6. Mobile (<760 px) : toolbar wrappe, déplie/replie OK, hamburger fixe ne masque pas les contrôles.

---

## Self-review (couverture spec → plan)

| Exigence du design | Tâche |
|---|---|
| Toolbar collant `<JrFilterBar>` (modèle `.panel-toolbar`) au-dessus du hero | T4 + T5 step 1 + T6 |
| Replié par défaut, dépliage à la demande (état non persisté) | T4 (`expanded` local) |
| Puces des filtres actifs (≠ défaut) retirables au `×` | T3 + T4 + T6 |
| Filtre fraîcheur `Tout · <24h · <7j` dans `passesFilters` → hero + liste | T2 + T4 |
| Compteur `🔥 hot` global visible dans le toolbar | T4 (prop `hotLeadsCount`) + T6 |
| Compteur filtré `N offres` | T3 (`filteredCount`) + T4 |
| Persistance localStorage (sauf recherche) | T1 step 2-3 |
| Retrait des `.jr-filters` de l'en-tête liste | T5 step 2 |
| Service worker resync | T7 step 1 |
| Spec `tab-jobs.md` + `index.json` (changement fonctionnel) | T8 |
| Pas d'ADR / pas de modif `docs/architecture/` (iso-archi) | (aucune tâche arch — voulu) |
| Vérif prod (sticky / fraîcheur / combinaison / reset / persistance / mobile) | T9 |
