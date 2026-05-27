# Jobs Radar — Refonte carte (fiche éditoriale + skills) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la carte d'offre du Jobs Radar vers la fiche éditoriale (Proposition C) — ajouter un bloc skills « tu as / à acquérir » alimenté par `intel.skills_required[]`, retirer l'intel warm et la reco CV.

**Architecture:** Front React 18 + `@babel/standalone` via CDN, no build step. Les composants sont exposés sur `window.X`. La donnée arrive via `cockpit/lib/data-loader.js` qui mappe une ligne `jobs` Supabase → un view-model d'offre, consommé par `cockpit/panel-jobs-radar.jsx`. On ne change que le mapping `intel` + le rendu de la carte ; les tables et le reste du pipeline ne bougent pas (la production de `skills_required[]` est l'objet du **plan 2 — routine**).

**Tech Stack:** JSX (Babel standalone), CSS variables theme-driven (`--tx`, `--brand`, `--positive`, `--bd`…), `Icon` global, Supabase REST.

**Contrat de données partagé avec le plan 2 :** `jobs.intel` (jsonb) contient désormais `salary_estimate` (inchangé) **+ `skills_required`** = `[{ "name": string, "on_cv": boolean }, …]`. `on_cv` est calculé côté routine (match `skill_radar`/`user_profile`). Les 554 lignes historiques n'ont pas `skills_required` → le bloc skills se masque proprement (guard).

**Pas de tests unitaires front dans ce repo** (React via CDN, no build). Vérification de chaque tâche = (a) `node scripts/sync-sw.mjs` ne casse pas, (b) ouverture du cockpit sur l'onglet Jobs Radar sans erreur console, (c) commit. Tâche specs vérifiée par `python scripts/validate_spec.py`.

---

## ⚠️ Point à confirmer avant exécution

**Suppression du bloc « Signal CV » du scan banner.** Retirer la reco CV par offre (demande utilisateur) rend orphelin le bloc agrégé « Signal CV · tendance PDF/DOCX » du `ScanBanner` (plus de donnée source). Les Tasks 5–7 le retirent. Si l'utilisateur veut conserver une autre forme de signal, ne pas exécuter 5–7 et adapter.

---

## File Structure

| Fichier | Responsabilité | Changement |
|---|---|---|
| `cockpit/lib/data-loader.js` | Mapping ligne `jobs` → view-model | `transformJobIntel` : +`skills_required`, −warm ; `transformJobRow` : −`cv_*` ; `transformJobScan` : −`signal_cv` |
| `cockpit/panel-jobs-radar.jsx` | Composants UI du panel | +`JrSkills` ; refonte `HotLeadCard` ; nettoyage `JrActionsMenu`, `OfferRow`, `ScanBanner` |
| `cockpit/styles-jobs-radar.css` | Styles | +`.jr-skills*` ; −`.jr-intel*`/`.jr-warm*`/`.jr-safe*`/`.jr-angle*`/`.jr-cv-*`/`.jr-cv-split*` ; grille scan 4→3 col |
| `docs/specs/tab-jobs.md` | Spec onglet (règle cardinale) | MAJ Fonctionnalités/Parcours ; `index.json` déjà à `2026-05-27` |

---

## Task 1: Couche data — `transformJobIntel` (+skills, −warm) et `transformJobRow` (−cv)

**Files:**
- Modify: `cockpit/lib/data-loader.js:1578-1625` (`transformJobIntel`)
- Modify: `cockpit/lib/data-loader.js:1644-1645` (`transformJobRow`, champs `cv_*`)

- [ ] **Step 1: Remplacer `transformJobIntel` en entier**

Remplacer la fonction actuelle (lignes 1578-1625) par :

```js
  function transformJobIntel(intel){
    if (!intel || typeof intel !== "object") return null;

    // Salaire estimé (conservé) — accepte clés FR + EN.
    const salarySrc = intel.salary_estimate || intel.estimation_salaire || null;
    let salary_estimate = null;
    if (salarySrc && typeof salarySrc === "object") {
      const min = Number(salarySrc.min);
      const max = Number(salarySrc.max);
      const target = Number(salarySrc.target);
      salary_estimate = {
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) ? max : null,
        target: Number.isFinite(target) ? target : null,
        currency: salarySrc.currency || "EUR",
        basis: salarySrc.basis === "published" ? "published" : "inferred",
        rationale: salarySrc.rationale || "",
      };
      if (salary_estimate.min == null && salary_estimate.max == null && salary_estimate.target == null) {
        salary_estimate = null;
      }
    }

    // Skills attendus (nouveau) — [{ name, on_cv }]. Accepte skills_required / skills,
    // et tolère des strings nues (on_cv=false par défaut).
    const skillsSrc = Array.isArray(intel.skills_required) ? intel.skills_required
                    : Array.isArray(intel.skills) ? intel.skills : [];
    const skills_required = skillsSrc
      .map(s => {
        if (typeof s === "string") return s.trim() ? { name: s.trim(), on_cv: false } : null;
        if (s && typeof s === "object") {
          const name = typeof s.name === "string" ? s.name : (typeof s.label === "string" ? s.label : "");
          return name.trim() ? { name: name.trim(), on_cv: s.on_cv === true } : null;
        }
        return null;
      })
      .filter(Boolean);

    // Rien d'exploitable → null (le guard `intel && (...)` masque la carte enrichie).
    if (!salary_estimate && !skills_required.length) return null;
    return { salary_estimate, skills_required };
  }
```

- [ ] **Step 2: Retirer `cv_recommended`/`cv_reason` de `transformJobRow`**

Supprimer ces deux lignes (1644-1645) :

```js
      cv_recommended: row.cv_recommended || "pdf",
      cv_reason: row.cv_reason || "",
```

- [ ] **Step 3: Vérifier (sync SW + ouverture cockpit)**

Run: `node scripts/sync-sw.mjs`
Expected: se termine sans erreur (régénère `STATIC[]`/`CACHE`).
Puis ouvrir `index.html` dans le navigateur, onglet Jobs Radar : aucune erreur console ; les cartes hot s'affichent encore (le salaire reste, l'intel warm n'est plus alimentée mais le rendu warm existe encore → corrigé Task 3).

- [ ] **Step 4: Commit**

```bash
git add cockpit/lib/data-loader.js
git commit -m "feat(jobs): couche data — intel.skills_required + retrait cv_recommended/cv_reason"
```

---

## Task 2: Nouveau composant `JrSkills` (split tu as / à acquérir)

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (ajout après `RubricBlock`, ~ligne 420)

- [ ] **Step 1: Ajouter le composant `JrSkills`**

Insérer juste après la fin de `RubricBlock` (après la ligne `}` de fermeture, ~420), avant `// ─── Hot lead card` :

```jsx
// ─── Skills attendus (split : présent sur le CV / à acquérir) ───
function JrSkills({ skills }) {
  if (!Array.isArray(skills) || !skills.length) return null;
  const have = skills.filter(s => s && s.on_cv);
  const gap  = skills.filter(s => s && !s.on_cv);
  return (
    <div className="jr-skills">
      <div className="jr-section-kicker">Skills attendus dans l'offre</div>
      <div className="jr-skills-split">
        <div className="jr-skills-col jr-skills-col--have">
          <div className="jr-skills-head">Tu as déjà <span className="jr-skills-count">{have.length}</span></div>
          <ul className="jr-skills-chips">
            {have.map((s, i) => <li key={i} className="jr-skill jr-skill--have">{s.name}</li>)}
            {!have.length && <li className="jr-skills-empty">—</li>}
          </ul>
        </div>
        <div className="jr-skills-col jr-skills-col--gap">
          <div className="jr-skills-head">À acquérir <span className="jr-skills-count">{gap.length}</span></div>
          <ul className="jr-skills-chips">
            {gap.map((s, i) => <li key={i} className="jr-skill jr-skill--gap">{s.name}</li>)}
            {!gap.length && <li className="jr-skills-empty">—</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit** (le composant n'est pas encore monté — sans effet visible, mais isolable)

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "feat(jobs): composant JrSkills (skills attendus have/gap)"
```

---

## Task 3: Refonte `HotLeadCard` — skills à la place de l'intel warm, retrait reco CV

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx:457-568` (corps + footer de `HotLeadCard`)

- [ ] **Step 1: Insérer `JrSkills` après le bloc rubric et retirer le bloc intel warm**

Le bloc rubric actuel (457-461) suivi du salaire (463-466) suivi de l'intel warm (468-524). Remplacer **de la ligne 457 à la ligne 524** par (rubric → skills → salaire ; plus aucun bloc warm) :

```jsx
      {/* Rubric */}
      <div className="jr-hot-rubric">
        <div className="jr-section-kicker">Pourquoi ce score</div>
        <RubricBlock offer={offer} />
      </div>

      {/* Skills attendus — tu as / à acquérir */}
      {intel && <JrSkills skills={intel.skills_required} />}

      {/* Salary estimate — calibrated for this profile */}
      {intel && intel.salary_estimate && (
        <SalaryEstimate estimate={intel.salary_estimate} targetRange={targetRange} />
      )}
```

- [ ] **Step 2: Retirer la reco CV et le bouton « Ouvrir le lead » du footer**

Dans le footer (`<footer className="jr-hot-foot">`), supprimer le bloc `jr-cv-reco` (540-545) et le lien `Ouvrir le lead` (557-562). Le footer devient exactement :

```jsx
      {/* Actions footer */}
      <footer className="jr-hot-foot">
        <JrVote offer={offer} onVote={onVote} />
        <div className="jr-hot-actions">
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
          <button className="jr-btn jr-btn--primary" onClick={() => onApply(offer)} disabled={!offer.url}>
            <span>{offer.status === "applied" ? "Rouvrir sur LinkedIn" : "Postuler sur LinkedIn"}</span>
            <Icon name="arrow_right" size={14} stroke={2} />
          </button>
        </div>
      </footer>
```

- [ ] **Step 3: Vérifier (ouverture cockpit)**

Ouvrir le cockpit, onglet Jobs Radar. Attendu sur une carte hot : titre + score + pitch + rubric + **bloc skills (2 colonnes)** + salaire + actions. Plus de signaux boîte / lead / réseau / angle / badge CV. Aucune erreur console. (Sur données historiques sans `skills_required`, le bloc skills est absent — normal.)

- [ ] **Step 4: Commit**

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "feat(jobs): HotLeadCard — bloc skills, retrait intel warm + reco CV"
```

---

## Task 4: `JrActionsMenu` — retirer l'item « Enrichir l'Intel »

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx:149-154`

- [ ] **Step 1: Supprimer l'item teaser d'enrichissement intel warm**

Supprimer ce bloc (149-154) — l'enrichissement warm est abandonné :

```jsx
          {offer.intel_depth === "light" && (
            <button className="jr-menu-item" role="menuitem" disabled title="Feature à venir — enrichira l'intel manquant via Jarvis">
              <Icon name="sparkles" size={13} stroke={2} />
              <span>Enrichir l'Intel →</span>
            </button>
          )}
```

- [ ] **Step 2: Commit**

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "chore(jobs): retire le teaser « Enrichir l'Intel » (warm abandonné)"
```

---

## Task 5: `OfferRow` — retirer la méta reco CV

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx:625-629`

- [ ] **Step 1: Supprimer le bloc `jr-row-meta-cv`**

Dans `OfferRow`, supprimer (625-629) :

```jsx
        <div className="jr-row-meta-cv">
          <span className={`jr-cv-badge jr-cv-badge--${offer.cv_recommended}`}>
            CV {offer.cv_recommended.toUpperCase()}
          </span>
        </div>
```

- [ ] **Step 2: Vérifier** — les lignes du « reste du scan » s'affichent sans le badge CV, sans erreur console.

- [ ] **Step 3: Commit**

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "chore(jobs): OfferRow — retrait badge CV"
```

---

## Task 6: `ScanBanner` — retirer le bloc « Signal CV »

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx:772-786`

- [ ] **Step 1: Supprimer le bloc Signal CV**

Supprimer entièrement (772-786) :

```jsx
        {/* Signal CV */}
        <div className="jr-scan-block jr-scan-block--cv">
          <div className="jr-scan-kicker">Signal CV · {scan.signal_cv.window_days}j</div>
          <div className="jr-cv-split">
            <div className="jr-cv-split-bar">
              <div className="jr-cv-split-pdf"  style={{ width: `${scan.signal_cv.pdf_pct}%` }}>
                <span>PDF {scan.signal_cv.pdf_pct}%</span>
              </div>
              <div className="jr-cv-split-docx" style={{ width: `${scan.signal_cv.docx_pct}%` }}>
                <span>DOCX {scan.signal_cv.docx_pct}%</span>
              </div>
            </div>
          </div>
          <p className="jr-cv-insight">{scan.signal_cv.insight}</p>
        </div>
```

- [ ] **Step 2: Vérifier** — le scan banner affiche 3 blocs (Volume 7j, Répartition catégories, Actions du jour) sans erreur. (Largeur ajustée Task 8.)

- [ ] **Step 3: Commit**

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "chore(jobs): ScanBanner — retrait bloc Signal CV (reco CV abandonnée)"
```

---

## Task 7: `transformJobScan` — retirer le calcul `signal_cv`

**Files:**
- Modify: `cockpit/lib/data-loader.js:1691-1699` (calcul) et `:1725-1735` (champ retourné)

- [ ] **Step 1: Supprimer le calcul PDF/DOCX**

Supprimer (1691-1699) :

```js
    // CV signal — PDF/DOCX ratio on last 30 days of jobs
    const thirty = Date.now() - 30 * 86400000;
    const recent = (allJobs || []).filter(j => j.first_seen_date && new Date(j.first_seen_date + "T00:00:00").getTime() >= thirty);
    const pdfCount  = recent.filter(j => j.cv_recommended === "pdf").length;
    const docxCount = recent.filter(j => j.cv_recommended === "docx").length;
    const sumCv = pdfCount + docxCount || 1;
    const pdf_pct  = Math.round(pdfCount  / sumCv * 100);
    const docx_pct = 100 - pdf_pct;
    const signalCvFromScan = todayScan && todayScan.signal_cv && typeof todayScan.signal_cv === "object" ? todayScan.signal_cv : null;
```

- [ ] **Step 2: Supprimer le champ `signal_cv` du retour**

Dans l'objet retourné, supprimer tout le bloc `signal_cv: signalCvFromScan ? { … } : { … },` (1725-1735). L'objet retourné devient :

```js
    return {
      date_label: dLabel.charAt(0).toUpperCase() + dLabel.slice(1),
      raw_count: Number(todayScan?.raw_count || 0),
      processed_count: Number(todayScan?.processed_count || activeJobs.length),
      hot_leads_count: Number(todayScan?.hot_leads_count || activeJobs.filter(j => Number(j.score_total) >= 7).length),
      tendances: {
        volumes_7d,
        ratios_category,
      },
      actions,
    };
```

- [ ] **Step 3: Vérifier** — `node scripts/sync-sw.mjs` OK ; cockpit Jobs Radar sans erreur (le banner ne lit plus `scan.signal_cv`).

- [ ] **Step 4: Commit**

```bash
git add cockpit/lib/data-loader.js
git commit -m "chore(jobs): transformJobScan — retrait signal_cv"
```

---

## Task 8: CSS — styles skills + suppression des règles orphelines + grille scan

**Files:**
- Modify: `cockpit/styles-jobs-radar.css`

- [ ] **Step 1: Ajouter les styles skills** (après le bloc `Salary estimate`, avant `/* Intel */`, ~ligne 695)

```css
/* Skills attendus (split tu as / à acquérir) */
.jr-skills { margin-bottom: 20px; }
.jr-skills .jr-section-kicker { margin-bottom: 10px; }
.jr-skills-split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 820px) { .jr-skills-split { grid-template-columns: 1fr; } }
.jr-skills-col { border-radius: var(--radius); padding: 12px 14px; }
.jr-skills-col--have { background: var(--positive-tint); border: 1px solid var(--positive); }
.jr-skills-col--gap  { background: var(--bg3); border: 1px dashed var(--bd2); }
.jr-skills-head {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  display: flex; align-items: center; gap: 7px; margin-bottom: 10px;
}
.jr-skills-col--have .jr-skills-head { color: var(--positive); }
.jr-skills-col--gap  .jr-skills-head { color: var(--tx3); }
.jr-skills-count {
  margin-left: auto; font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: var(--bg); color: var(--tx2);
}
.jr-skills-chips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.jr-skill {
  font-family: var(--font-mono); font-size: 11.5px; line-height: 1.3;
  padding: 4px 9px; border-radius: 6px; white-space: nowrap; background: var(--bg);
}
.jr-skill--have { color: var(--positive); border: 1px solid var(--positive); }
.jr-skill--have::before { content: "✓ "; }
.jr-skill--gap { color: var(--tx2); border: 1px dashed var(--bd2); }
.jr-skill--gap::before { content: "↗ "; color: var(--brand-ink, var(--brand)); }
.jr-skills-empty { font-family: var(--font-mono); font-size: 11.5px; color: var(--tx3); list-style: none; }
```

- [ ] **Step 2: Ajuster la grille du scan banner (4 → 3 colonnes)**

Remplacer (lignes 125-129) :

```css
.jr-scan-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.3fr 1.1fr 1.5fr;
  gap: 32px;
}
```

par :

```css
.jr-scan-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.3fr 1.5fr;
  gap: 32px;
}
```

- [ ] **Step 3: Supprimer les règles devenues orphelines**

Supprimer ces blocs CSS (devenus morts) :
- `/* CV split */` : `.jr-cv-split`, `.jr-cv-split-bar`, `.jr-cv-split-pdf, .jr-cv-split-docx`, `.jr-cv-split-pdf`, `.jr-cv-split-docx`, `.jr-cv-insight` (223-254).
- `/* Intel */` : `.jr-hot-intel`, `[data-theme="obsidian"] .jr-hot-intel`, `.jr-intel-grid`, le `@media` `.jr-intel-grid`, `.jr-intel-block`, `.jr-intel-list`, `.jr-intel-list li`, `.jr-intel-list li::before` (696-736).
- `.jr-intel-lead*` (738-758).
- `.jr-warm*` (760-800).
- `.jr-safe-line`, `.jr-safe-label`, `.jr-safe-val` (802-821).
- `/* Angle */` : `.jr-angle`, `.jr-angle-label`, `.jr-angle-text`, `[data-theme="dawn"] .jr-angle-text` (823-848).
- `.jr-cv-reco`, `.jr-cv-reason` (860-872) — garder `.jr-hot-foot` et `.jr-hot-actions`.
- `/* CV badge */` : `.jr-cv-badge`, `.jr-cv-badge--pdf`, `.jr-cv-badge--docx` (879-892).

- [ ] **Step 4: Vérifier** — cockpit Jobs Radar : bloc skills stylé (colonne verte « tu as » / colonne pointillée « à acquérir »), scan banner sur 3 colonnes équilibrées, aucun résidu visuel. Tester en thèmes clair + obsidian.

- [ ] **Step 5: Commit**

```bash
git add cockpit/styles-jobs-radar.css
git commit -m "feat(jobs): styles skills have/gap + nettoyage CSS intel/warm/cv + grille scan 3 col"
```

---

## Task 9: Spec onglet + sync service worker

**Files:**
- Modify: `docs/specs/tab-jobs.md`
- Verify: `docs/specs/index.json` (entrée `jobs.last_updated` déjà à `2026-05-27` — OK, pas de bump)
- Run: `node scripts/sync-sw.mjs`

- [ ] **Step 1: Lire `docs/specs/tab-jobs.md`** pour repérer les sections Fonctionnalités / Parcours / Données.

- [ ] **Step 2: Mettre à jour la spec** (règle cardinale CLAUDE.md) :
  - **Fonctionnalités** : ajouter « Skills attendus par offre, scindés *présent sur le CV* / *à acquérir* (`intel.skills_required[]`) ». Retirer toute mention d'intel warm (signaux boîte, lead, réseau warm, angle d'approche) et de reco CV / Signal CV.
  - **Parcours** : la carte hot montre désormais score + rubric + skills have/gap + salaire ; plus de lead/réseau ni de badge CV.
  - **Données** : `intel` = `salary_estimate` + `skills_required[{name,on_cv}]` ; champs `cv_recommended`/`cv_reason` et `job_scans.signal_cv` non consommés par le front.
  - Respecter les règles éditoriales (vocabulaire produit, pas de noms de composants) — cf. `docs/specs/MAINTENANCE.md`.

- [ ] **Step 3: Valider la spec**

Run: `python scripts/validate_spec.py`
Expected: PASS (lint-specs vert). Corriger sinon.

- [ ] **Step 4: Sync service worker** (après modifs `cockpit/**`)

Run: `node scripts/sync-sw.mjs`
Expected: `STATIC[]`/`CACHE` régénérés ; `git status` ne montre que `index.html`/`sw.js` attendus si bump de version.

- [ ] **Step 5: Commit**

```bash
git add docs/specs/tab-jobs.md index.html sw.js
git commit -m "docs(jobs): spec onglet — skills attendus, retrait intel warm + reco CV"
```

---

## Self-Review

**Spec coverage (design `2026-05-27-jobs-radar-api-migration-design.md` → Impact front) :**
- « bloc skills scindé tu as / à acquérir, alimenté par `intel.skills_required[]` » → Tasks 1, 2, 3, 8. ✓
- « normalisation dans `transformJobIntel` » → Task 1. ✓
- « retiré : rendu blocs `signaux_boite`/`lead_identifie`/`reseau_warm`/`angle_approche` + bouton Ouvrir le lead ; CSS `jr-lead-*`/`jr-warm-*` » → Tasks 3, 8. ✓
- « conservé : `ScoreChip`, `RubricBlock`, `SalaryEstimate`, `JrVote`, scan banner, filtres, bouton clôturée » → préservés (Task 3 ne touche ni vote ni menu clôture). ✓
- « guard `intel && (…)` fait dégrader les 554 lignes historiques » → `transformJobIntel` renvoie `null` si ni salaire ni skills ; sinon `skills_required: []` → `JrSkills` renvoie `null`. ✓
- Demande utilisateur « retirer la reco CV » → Tasks 1 (data), 3 (footer), 5 (row), 6+7 (Signal CV agrégé), 8 (CSS). ✓

**Placeholder scan :** chaque step de code montre le code complet (avant/après). Aucun TODO. ✓

**Type consistency :** `intel.skills_required` = `[{name:string, on_cv:boolean}]` défini en Task 1, consommé tel quel en Task 2 (`s.on_cv`, `s.name`) et Task 3 (`intel.skills_required`). `salary_estimate` inchangé. ✓

**Hors périmètre (plan 2 — routine) :** production de `skills_required[]` + `on_cv` (match `skill_radar`), retrait de la génération `cv_recommended`/`signal_cv` côté routine, MAJ archi (`pipelines.yaml`, `dependencies.yaml`, ADR-19), secret `RAPIDAPI_KEY`.
