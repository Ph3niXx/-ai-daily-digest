# Jobs Radar — filtres appliqués au hero « hot leads » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Pas de tests unitaires** sur ce composant (React via Babel standalone, pas de harness) — la vérification = `sync-sw` propre + grep de non-régression + lints specs + contrôle visuel en prod.

**Goal:** Le hero « hot leads » (cards score ≥ 7) suit désormais les mêmes filtres que la liste dense (catégorie, remote, statut, recherche, score) et se masque s'il ne reste aucun hot lead ; le compteur « hot leads » du header reste global.

**Architecture:** Extraire un prédicat `passesFilters(o)` partagé (catégorie + remote + statut/clôturé + recherche), l'appliquer au hero (`heroLeads`, tranche ≥ 7 du set filtré, gated par le filtre score) ET à la liste (`listOffers`). Garder un `hotLeadsCount` global pour le récap header. Tout est dans `cockpit/panel-jobs-radar.jsx`.

**Tech Stack:** React 18 + @babel/standalone (no build) · `node scripts/sync-sw.mjs` · lints Python specs.

**Branche :** `feat/jobs-radar-hero-filters` (déjà créée, design doc committé dessus).

**Commit (règle cardinale : changement fonctionnel d'onglet → code + spec dans le MÊME commit) :** un seul commit couvrant `cockpit/panel-jobs-radar.jsx` + `sw.js` + `docs/specs/tab-jobs.md` + `docs/specs/index.json`.

---

## Task 1 : Refactor de la logique de filtrage (hero + liste)

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx` (bloc filtres/memos ~896-943, header ~959, hero ~983-997)
- Run: `node scripts/sync-sw.mjs`

- [ ] **Step 1 : Remplacer le bloc `hotLeads` + `listOffers` (lignes 896-943)**

Remplacer **tout le bloc** depuis `// Split hot leads vs rest` jusqu'à la fin du `useMemoJr` de `listOffers` (ligne 943 incluse) par :

```js
  // ─── Prédicat de filtrage partagé (hero + liste) — ADR/hero-filters 2026-05-31 ───
  // Couvre catégorie + remote + statut/clôturé + recherche. La bande de score est gérée par section.
  const passesFilters = (o) => {
    if (catFilter !== "all" && o.role_category !== catFilter) return false;
    if (remoteFilter === "remote" && o.is_remote !== true) return false;
    if (statusFilter === "closed") {
      if (!o.closed_at) return false;
    } else {
      if (jrIsDead(o)) return false;  // masque les clôturées (sauf applied)
      if (statusFilter === "active") {
        if (!(o.status === "new" || o.status === "to_apply" || o.status === "applied")) return false;
      } else if (statusFilter !== "all") {
        if (o.status !== statusFilter) return false;
      }
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!(o.title.toLowerCase().includes(q) ||
            o.company.toLowerCase().includes(q) ||
            (o.pitch || "").toLowerCase().includes(q))) return false;
    }
    return true;
  };

  // Compteur header GLOBAL (cohérent avec « nouvelles » et « total ») — non filtré.
  const hotLeadsCount = useMemoJr(() =>
    offers.filter(o => o.score_total >= 7 && o.status !== "archived" && o.status !== "snoozed" && !jrIsDead(o)).length,
  [offers]);

  // Hero = tranche ≥ 7 du set FILTRÉ. Affiché seulement si le filtre score autorise « hot ».
  const showHero = scoreFilter === "all" || scoreFilter === "hot";
  const heroLeads = useMemoJr(() =>
    showHero
      ? offers.filter(o => passesFilters(o) && o.score_total >= 7).sort((a, b) => b.score_total - a.score_total)
      : [],
  [offers, scoreFilter, catFilter, remoteFilter, statusFilter, query]);

  // Liste dense = set filtré, moins les membres du hero, avec le filtre de bande score.
  const listOffers = useMemoJr(() => {
    const heroIds = new Set(heroLeads.map(h => h.id));
    let arr = offers.filter(o => passesFilters(o) && !heroIds.has(o.id));
    if (scoreFilter !== "all") {
      arr = arr.filter(o => scoreBand(o.score_total) === scoreFilter);
    }
    if (sort === "score") {
      arr.sort((a, b) => b.score_total - a.score_total);
    } else if (sort === "recent") {
      arr.sort((a, b) => a.posted_days_ago - b.posted_days_ago);
    }
    return arr;
  }, [offers, heroLeads, scoreFilter, catFilter, remoteFilter, statusFilter, query, sort]);
```

- [ ] **Step 2 : Header — utiliser `hotLeadsCount` (ligne ~959)**

Remplacer `<span><strong>{hotLeads.length}</strong> hot leads</span>`
par `<span><strong>{hotLeadsCount}</strong> hot leads</span>`.

- [ ] **Step 3 : Hero — utiliser `heroLeads` (lignes ~983-997)**

Dans la section `{/* ─── HOT LEADS HERO ─── */}` :
- `{hotLeads.length > 0 && (` → `{heroLeads.length > 0 && (`
- `{hotLeads.length === 1` → `{heroLeads.length === 1`
- `: \`${hotLeads.length} offres qui méritent ton matin\`}` → `: \`${heroLeads.length} offres qui méritent ton matin\`}`
- `{hotLeads.map((o, i) => <HotLeadCard …` → `{heroLeads.map((o, i) => <HotLeadCard …`

- [ ] **Step 4 : Non-régression — plus aucune référence à `hotLeads` (= le test)**

Run: `git --no-pager grep -n "hotLeads\b" -- cockpit/panel-jobs-radar.jsx`
Expected : **aucun hit** pour le mot exact `hotLeads` (seuls `hotLeadsCount` et `heroLeads` subsistent). Si un hit `hotLeads` nu reste → le corriger (oubli de remplacement).

- [ ] **Step 5 : Régénérer le service worker**

Run: `node scripts/sync-sw.mjs`
Expected : `[sync-sw] CACHE → cockpit-vNN, STATIC → NN entries` (exit 0). Ne pas éditer `sw.js` à la main.

- [ ] **Step 6** : (pas de commit ici — bundlé avec la spec au Task 2.)

---

## Task 2 : Spec onglet + commit

**Files:**
- Modify: `docs/specs/tab-jobs.md` (description filtres/hero + « Dernière MAJ »)
- Modify: `docs/specs/index.json` (bump `last_updated` de l'entrée `jobs`)

- [ ] **Step 1 : `tab-jobs.md` — préciser que le hero suit les filtres**

Dans la section **Fonctionnalités** (ou le bullet décrivant les filtres / la liste filtrable), ajouter une phrase user-facing (pas de noms de variables/colonnes — `lint-specs` bloquant) :
> Les filtres (catégorie de rôle, lieu, statut, score, recherche) pilotent **aussi** le bloc « hot leads » en haut de page : il n'affiche que les offres ≥ 7 correspondant au filtre courant, et se masque s'il n'en reste aucune. Le compteur « hot leads » du header, lui, reste un total global.

- [ ] **Step 2 : `tab-jobs.md` — entrée « Dernière MAJ » en tête (sous `## Dernière MAJ`)**

```
2026-05-31 — **Filtres appliqués au hero « hot leads »** : le bloc hot leads (offres ≥ 7) suit désormais les filtres catégorie/lieu/statut/score/recherche (avant : toujours toutes catégories) et se masque s'il ne reste aucune offre correspondante. Compteur « hot leads » du header gardé global. Fix UX iso-archi (pas d'ADR).
```

- [ ] **Step 3 : `index.json` — bump `last_updated` de l'entrée `jobs`**

Dans l'objet `{ "slug": "jobs", … }`, remplacer la valeur de `"last_updated"` par `"2026-05-31"` (déjà à 2026-05-31 si le lot EM a été mergé — dans ce cas, aucun changement à faire ; vérifier).

- [ ] **Step 4 : Lints specs (= le test)**

Run :
```
python scripts/validate_spec.py
python scripts/lint_specs_produit.py
python scripts/lint_known_sections.py
```
Expected : exit 0 pour chacun (sous Windows, préfixer `validate_spec.py` de `PYTHONUTF8=1` si l'emoji du résumé fait planter l'affichage — la validation, elle, passe).

- [ ] **Step 5 : Commit (front + spec ensemble)**

```bash
git add cockpit/panel-jobs-radar.jsx sw.js docs/specs/tab-jobs.md docs/specs/index.json
git commit -m "feat(jobs): le hero hot leads suit les filtres (compteur header gardé global)"
```

---

## Task 3 : Intégration + vérif prod

- [ ] **Step 1 : Merge + push** (le front se vérifie en prod, pas en local)

Suivre `superpowers:finishing-a-development-branch` : tests/lints verts → merge `feat/jobs-radar-hero-filters` sur `main` (FF) → `git push origin main` (Pages déploie).

- [ ] **Step 2 : Vérif en prod (hard-refresh Pages)**

- Filtre catégorie **EM** → le hero n'affiche que les EM ≥ 7 (AI6 9.5, Nanonets 8.5, Ledger 7.0, Pigment 7.0) ; la liste montre les EM < 7.
- Filtre **Produit** → ces EM disparaissent du hero.
- Filtre score **mid** → hero **masqué**, liste = offres 5–7.
- Recherche « decathlon » → hero = Decathlon si ≥ 7 sinon masqué.
- Le header « M hot leads » reste le **total global** (ne bouge pas quand on filtre).

- [ ] **Step 3 : Vérif déployé (sans navigateur)**

`WebFetch` `https://ph3nixx.github.io/jarvis-cockpit/cockpit/panel-jobs-radar.jsx` → confirmer la présence de `const passesFilters` et `const heroLeads`.

---

## Self-review (couverture spec → plan)

| Exigence du design | Tâche |
|---|---|
| Prédicat `passesFilters` partagé | T1 step 1 |
| Hero filtré `heroLeads` (gated score, masqué si vide) | T1 step 1 + 3 |
| Compteur header gardé global (`hotLeadsCount`) | T1 step 1 + 2 |
| `listOffers` rebranché sur le prédicat | T1 step 1 |
| Service worker resync | T1 step 5 |
| Spec `tab-jobs.md` + `index.json` | T2 |
| Pas d'ADR (iso-archi) | (aucune tâche arch — voulu) |
| Vérif prod (EM/Produit/mid/recherche) | T3 |
