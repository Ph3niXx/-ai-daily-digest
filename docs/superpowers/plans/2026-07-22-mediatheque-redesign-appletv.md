# Médiathèque redesign « Apple TV+ » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer l'onglet Médiathèque (grille filtrée à plat) en une expérience cinématique Apple TV+ : hero billboard + grille de posters généreuse + actions rapides au survol (cocher un épisode sans ouvrir la modale).

**Architecture:** Refonte purement front d'un panel React (Babel standalone, no build step). On restructure le `return` de `PanelMediatheque`, on extrait `<MdtCard>`, on ajoute `<MdtHero>` + 2 helpers purs (`currentEntryOf`, `pickHero`), on ré-habille la fiche modale, et on réécrit `styles-mediatheque.css`. Zéro migration SQL (`banner_url` déjà en base), zéro changement de pipeline. On réutilise au maximum l'existant (`mdtReleased`, `mdtStatus`, `MdtStepper`, `writeProgress`, `writeRating`).

**Tech Stack:** React 18 + `@babel/standalone` via CDN, composants exposés sur `window.*`, CSS piloté par tokens de thème (`--bg`, `--tx`, `--brand`…). Données via `window.MEDIATHEQUE_DATA` (T2). Spec : `docs/superpowers/specs/2026-07-22-mediatheque-redesign-appletv-design.md`.

## Global Constraints

- **Pas de test-runner front** : React est compilé dans le navigateur (Babel standalone). Vérification = ouverture du cockpit (en prod après push, ou `file://` pour itérer) + contrôle visuel dans les 3 thèmes. Il n'existe aucun test unitaire JSX à écrire — ne pas en inventer.
- **3 thèmes** (Dawn clair, Obsidian sombre, Atlas clair) : n'utiliser QUE des tokens (`--bg`, `--bg2`, `--tx`, `--tx2`, `--tx3`, `--brand`, `--font-*`…). Seule exception autorisée : les voiles dégradés `rgba(0,0,0,α)` **posés sur les images** (hero, en-tête modale).
- **Pas de `max-width`** sur le contenu (le cockpit utilise toute la largeur — CLAUDE.md).
- **Composants sur `window.*`**, pas d'imports ES modules (incompatibles Babel standalone).
- **Règles cardinales** (même commit que le code) : nouvel event télémétrie → `docs/telemetry.md` ; modif fonctionnelle d'onglet → `docs/specs/tab-mediatheque.md` + bump `last_updated` dans `docs/specs/index.json` ; modif `cockpit/**` → `node scripts/sync-sw.mjs`.
- **Préfixe CSS** `mdt-` conservé.
- **Convention git** : commits directs sur `main` (cible de déploiement GitHub Pages), comme le reste du projet. Push groupé en fin de plan.

---

## Task 1 : Helper `currentEntryOf` + extraction `<MdtCard>` (poster + badge + barre)

Extraire la carte inline actuelle en composant `<MdtCard>`, agrandir la grille, poser le badge de statut sur l'affiche et une barre de progression permanente. Pas encore de survol (Task 2).

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (ajout de 2 fonctions + composant, remplacement du `.map` de la grille dans le `return`)
- Modify: `cockpit/styles-mediatheque.css` (grille + carte)

**Interfaces:**
- Consumes: `mdtReleased(entry)`, `mdtStatus(chain, progressById)` (existants).
- Produces :
  - `currentEntryOf(entries, progressById) → entry | null` : première entrée `in_main_chain` (triée `sort_order`) telle que `episodes_watched < mdtReleased(entry)`, sinon `null` (franchise rattrapée).
  - `<MdtCard f entries st cur progressById onOpen onProgress />` où `cur = currentEntryOf(entries, progressById)`, `onOpen(f)` ouvre la fiche, `onProgress(entry, value)` = `writeProgress` (branché en Task 2).

- [ ] **Step 1 : Ajouter `currentEntryOf` près de `mdtStatus`** (après la ligne 35 de `panel-mediatheque.jsx`)

```jsx
function currentEntryOf(entries, progressById) {
  const chain = entries
    .filter((e) => e.in_main_chain)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  for (const e of chain) {
    if ((progressById.get(e.id) || 0) < mdtReleased(e)) return e;
  }
  return null; // tout rattrapé (à jour ou vu)
}

// Libellé court de la saison courante pour hero/carte : « S2 · 12/28 ».
function mdtCurLabel(cur, progressById) {
  if (!cur) return null;
  const w = progressById.get(cur.id) || 0;
  const rel = mdtReleased(cur);
  const tag = cur.kind === "season" ? `S${cur.season_number}` : (cur.kind === "movie" ? "Film" : cur.kind.toUpperCase());
  return `${tag} · ${w}/${rel || "?"}`;
}
```

- [ ] **Step 2 : Ajouter le composant `<MdtCard>`** (avant `function PanelMediatheque`)

```jsx
function MdtCard({ f, entries, st, cur, progressById, onOpen, onProgress }) {
  const chainLen = entries.filter((e) => e.in_main_chain).length;
  const pct = st.released ? Math.min(100, Math.round((100 * st.watched) / st.released)) : 0;
  const showBar = st.watched > 0 && st.id !== "to_watch";
  const curLabel = mdtCurLabel(cur, progressById);
  return (
    <div className="mdt-card">
      <button className="mdt-card-poster" onClick={() => onOpen(f)}
        aria-label={`Ouvrir ${f.title_english || f.title_romaji}`}>
        {f.cover_url
          ? <img className="mdt-card-cover" src={f.cover_url} alt="" loading="lazy" />
          : <div className="mdt-card-cover" />}
        <span className={`mdt-card-badge mdt-badge--${st.id}`}>{st.label}</span>
        {showBar && (
          <div className="mdt-card-bar" aria-hidden="true"><div style={{ width: pct + "%" }} /></div>
        )}
      </button>
      <div className="mdt-card-meta">
        <p className="mdt-card-title">{f.title_english || f.title_romaji}</p>
        <p className="mdt-card-sub">{curLabel || st.label} · {chainLen} entrée{chainLen > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Remplacer le `.map` de la grille** dans le `return` de `PanelMediatheque` (bloc `<div className="mdt-grid">` actuel, ~lignes 561-579)

```jsx
        <div className="mdt-grid">
          {visible.map(({ f, entries, st }) => (
            <MdtCard key={f.id} f={f} entries={entries} st={st}
              cur={currentEntryOf(entries, progressById)}
              progressById={progressById}
              onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
              onProgress={writeProgress} />
          ))}
        </div>
```

- [ ] **Step 4 : Remplacer les styles carte/grille** dans `styles-mediatheque.css` (bloc « Grille bibliothèque », lignes 45-63)

```css
/* Grille bibliothèque — posters généreux, style Apple TV+ */
.mdt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px 20px; }
.mdt-card { position: relative; }
.mdt-card-poster { display: block; width: 100%; padding: 0; border: none; background: none;
  cursor: pointer; position: relative; border-radius: var(--radius-lg, 12px); overflow: hidden;
  box-shadow: var(--shadow-sm); transition: transform .18s ease, box-shadow .18s ease; }
.mdt-card-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block;
  background: color-mix(in srgb, var(--tx) 8%, transparent); }
.mdt-card-badge { position: absolute; top: 8px; left: 8px; font-family: var(--font-mono);
  font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; padding: 3px 7px;
  border-radius: 999px; background: rgba(0,0,0,.55); color: #fff; border: none; backdrop-filter: blur(6px); }
.mdt-badge--watching, .mdt-badge--up_to_date { background: color-mix(in srgb, var(--brand) 85%, black); color: #fff; }
.mdt-card-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(0,0,0,.4); }
.mdt-card-bar > div { height: 100%; background: var(--brand); }
.mdt-card-meta { padding: 8px 2px 0; }
.mdt-card-title { font-size: 13.5px; font-weight: 600; line-height: 1.25; margin: 0 0 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mdt-card-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--tx3); margin: 0; }
```

Note : les anciennes règles `.mdt-badge` génériques (statuts) sont réutilisées par la fiche modale — ne supprimer que celles listées ci-dessus (`.mdt-card`, `.mdt-card-cover`, `.mdt-card-body`, `.mdt-card-title`, `.mdt-card-sub`, `.mdt-progressbar*`, `.mdt-card-count`). Garder `.mdt-badge`, `.mdt-badge--to_watch/seen/shelved`.

- [ ] **Step 5 : Vérifier** — ouvrir le cockpit (`file://` sur `index.html` ou prod), onglet Médiathèque. Attendu : grille de posters plus grands, badge de statut en haut-gauche de chaque affiche, barre de progression fine en bas des affiches entamées, titre + « S2 · 12/28 · N entrées » sous l'affiche. Tester rapidement en thème Dawn et Obsidian (bouton thème) : badge lisible sur l'image dans les deux.

- [ ] **Step 6 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css
git commit -m "refactor(mediatheque): extract MdtCard, poster grid + status badge + progress bar"
```

---

## Task 2 : Actions rapides au survol des cartes (+1 / ✓ sans ouvrir la modale)

Ajouter le panneau d'actions révélé au survol/focus, qui réutilise `<MdtStepper>` sur la saison courante. Sur tactile, panneau toujours visible.

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (`<MdtCard>`)
- Modify: `cockpit/styles-mediatheque.css` (panneau d'actions)

**Interfaces:**
- Consumes: `<MdtStepper entry progressById onProgress />` (existant, rend `−  count  +  ✓ vue`), `currentEntryOf`, `writeProgress` (déjà passé via `onProgress`).
- Produces: `<MdtCard>` avec panneau `.mdt-card-actions` positionné sur l'affiche.

- [ ] **Step 1 : Ajouter le panneau d'actions dans `<MdtCard>`** — insérer entre le `</button>` du poster et `<div className="mdt-card-meta">`

```jsx
      <div className="mdt-card-actions" onClick={(e) => e.stopPropagation()}>
        {cur
          ? <MdtStepper entry={cur} progressById={progressById} onProgress={onProgress} />
          : st.id === "seen"
            ? <button className="mdt-chip" onClick={() => onOpen(f)}>Revoir</button>
            : <span className="mdt-card-actions-note">à jour</span>}
      </div>
```

- [ ] **Step 2 : Ajouter les styles du panneau + l'état survol du poster** dans `styles-mediatheque.css` (après le bloc carte de Task 1)

```css
/* Survol riche : le poster se soulève, le panneau d'actions monte */
@media (hover: hover) {
  .mdt-card:hover .mdt-card-poster { transform: translateY(-6px) scale(1.03);
    box-shadow: 0 18px 40px rgba(0,0,0,.28), 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent); }
  .mdt-card-actions { opacity: 0; transform: translateY(6px); pointer-events: none; }
  .mdt-card:hover .mdt-card-actions,
  .mdt-card:focus-within .mdt-card-actions { opacity: 1; transform: none; pointer-events: auto; }
}
.mdt-card-actions { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 2;
  display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px;
  border-radius: 10px; background: rgba(0,0,0,.62); backdrop-filter: blur(8px);
  transition: opacity .16s ease, transform .16s ease; }
.mdt-card-actions .mdt-stepper button { border-color: rgba(255,255,255,.35); color: #fff; }
.mdt-card-actions .mdt-stepper-count { color: #fff; min-width: 72px; }
.mdt-card-actions .mdt-chip { color: #fff; border-color: rgba(255,255,255,.4); }
.mdt-card-actions-note { font-family: var(--font-mono); font-size: 10.5px; color: rgba(255,255,255,.8); }
```

Note : la barre de progression permanente (`.mdt-card-bar`, `bottom:0`) et le panneau (`bottom:8px`) coexistent — le panneau couvre le bas de l'affiche au survol, c'est voulu.

- [ ] **Step 3 : Vérifier** — au survol d'une carte entamée : l'affiche se soulève avec un halo `--brand`, un panneau sombre monte avec `−  S2 12/28  +  ✓ vue`. Cliquer `+` : le compteur ET la barre avancent, sans ouvrir la modale (toast d'erreur seulement si l'écriture échoue). Cliquer sur l'affiche (hors panneau) : la fiche s'ouvre. Naviguer au clavier (Tab) jusqu'à une carte : le panneau apparaît via `:focus-within`. Réduire la fenêtre / tester en responsive (émulation tactile) : le panneau reste visible en permanence.

- [ ] **Step 4 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css
git commit -m "feat(mediatheque): quick episode actions on card hover/focus (no modal)"
```

---

## Task 3 : Hero cinématique (`<MdtHero>` + `pickHero`)

Ajouter le billboard en haut de la bibliothèque : bannière + voile, titre mis en avant selon la table de priorité, CTA + `+1` inline. Émet `mediatheque_hero_action`.

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (helpers `pickHero`/`heroCopy`, composant `<MdtHero>`, insertion dans le `return`)
- Modify: `cockpit/styles-mediatheque.css` (hero)

**Interfaces:**
- Consumes: `cards` (déjà calculé dans `PanelMediatheque` : `[{ f, entries, st, lastTouch }]`), `currentEntryOf`, `mdtCurLabel`, `mdtFmtDate`, `writeProgress`, `window.track`.
- Produces:
  - `pickHero(cards) → { card, kind } | null` où `kind ∈ "resume" | "next_ep" | "discover" | "seen"`.
  - `<MdtHero hero progressById onOpen onProgress />`.

- [ ] **Step 1 : Ajouter `pickHero` + `heroCopy`** (après `currentEntryOf`)

```jsx
function nextAiringOf(card) {
  let min = null;
  for (const e of card.entries) {
    if (e.airing_status === "RELEASING" && e.next_episode_airing_at) {
      const t = new Date(e.next_episode_airing_at).getTime();
      if (min == null || t < min) min = t;
    }
  }
  return min;
}

function pickHero(cards) {
  const active = cards.filter((c) => !c.f.shelved);
  if (!active.length) return null;
  const byTouch = (a, b) => b.lastTouch - a.lastTouch;
  const watching = active.filter((c) => c.st.id === "watching").sort(byTouch);
  if (watching.length) return { card: watching[0], kind: "resume" };
  const upToDate = active.filter((c) => c.st.id === "up_to_date");
  const withNext = upToDate.map((c) => ({ c, when: nextAiringOf(c) }))
    .filter((x) => x.when != null).sort((a, b) => a.when - b.when);
  if (withNext.length) return { card: withNext[0].c, kind: "next_ep" };
  if (upToDate.length) return { card: upToDate.slice().sort(byTouch)[0], kind: "next_ep" };
  const toWatch = active.filter((c) => c.st.id === "to_watch")
    .sort((a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0));
  if (toWatch.length) return { card: toWatch[0], kind: "discover" };
  const seen = active.filter((c) => c.st.id === "seen").sort(byTouch);
  if (seen.length) return { card: seen[0], kind: "seen" };
  return { card: active.slice().sort(byTouch)[0], kind: "resume" };
}

// kicker + libellé du CTA primaire + affichage du bouton +1 selon le cas.
function heroCopy(kind) {
  switch (kind) {
    case "resume":   return { kicker: "Reprendre", cta: "▶ Reprendre", quick: true };
    case "next_ep":  return { kicker: "Prochain épisode", cta: "Voir la fiche", quick: false };
    case "discover": return { kicker: "À découvrir", cta: "▶ Commencer", quick: false };
    case "seen":     return { kicker: "Déjà vu", cta: "Revoir la fiche", quick: false };
    default:         return { kicker: "", cta: "Voir la fiche", quick: false };
  }
}
```

- [ ] **Step 2 : Ajouter le composant `<MdtHero>`** (avant `<MdtCard>`)

`hero` = `{ card, kind }` où `card` est un élément de `cards` (`{ f, entries, st, lastTouch }`), ou `null` (bibliothèque vide).

```jsx
function MdtHero({ hero, progressById, onOpen, onProgress }) {
  if (!hero) {
    return (
      <section className="mdt-hero mdt-hero--empty">
        <div className="mdt-hero-inner">
          <div className="mdt-hero-kicker">Ta médiathèque</div>
          <h2 className="mdt-hero-title">Commence ta collection</h2>
          <p className="mdt-hero-meta">Cherche un anime ci-dessous pour l'ajouter à ta bibliothèque.</p>
        </div>
      </section>
    );
  }
  const { card, kind } = hero;
  const fr = card.f;
  const cur = currentEntryOf(card.entries, progressById);
  const st = card.st;
  const copy = heroCopy(kind);
  const nextAt = nextAiringOf(card);
  const meta = [
    mdtCurLabel(cur, progressById),
    st.id === "seen" ? "Terminé" : null,
    kind === "next_ep" && nextAt ? `nouvel ép. ${mdtFmtDate(new Date(nextAt).toISOString())}` : null,
  ].filter(Boolean).join(" · ");
  const pct = st.released ? Math.min(100, Math.round((100 * st.watched) / st.released)) : 0;
  const bg = fr.banner_url || fr.cover_url;
  const openFiche = () => {
    onOpen(fr);
    window.track && window.track("mediatheque_hero_action", {
      action: kind === "resume" ? "resume" : kind === "discover" ? "start" : "open", status: st.id });
  };
  return (
    <section className="mdt-hero" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
      <div className="mdt-hero-scrim" />
      <div className="mdt-hero-inner">
        <div className="mdt-hero-kicker">{copy.kicker}</div>
        <h2 className="mdt-hero-title">{fr.title_english || fr.title_romaji}</h2>
        {meta && <p className="mdt-hero-meta">{meta}</p>}
        {st.watched > 0 && st.id !== "seen" && (
          <div className="mdt-hero-bar" aria-hidden="true"><div style={{ width: pct + "%" }} /></div>
        )}
        <div className="mdt-hero-actions">
          <button className="mdt-btn mdt-hero-cta" onClick={openFiche}>{copy.cta}</button>
          {copy.quick && cur && (
            <button className="mdt-btn mdt-btn--ghost mdt-hero-quick"
              onClick={() => onProgress(cur, Math.min(mdtReleased(cur), (progressById.get(cur.id) || 0) + 1))}>
              +1 épisode
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3 : Calculer le hero et l'insérer dans le `return`** — dans `PanelMediatheque`, ajouter un `useMemo` près des autres (après `visible`) :

```jsx
  const hero = useMdtMemo(() => (searching ? null : pickHero(cards)), [cards, searching]);
```

Puis, dans le `return`, insérer le hero juste après `<MdtReleasesStrip .../>` et **avant** `<div className="mdt-toolbar">`, mais seulement hors recherche :

```jsx
      {!inSearchView && (
        <MdtHero hero={hero} progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress} />
      )}
```

(Quand la bibliothèque est vide, `pickHero` renvoie `null` et `<MdtHero>` affiche l'état d'accueil.)

- [ ] **Step 4 : Ajouter les styles hero** dans `styles-mediatheque.css` (après le titre `.mdt-title`, avant la toolbar)

```css
/* Hero cinématique — bannière + voile dark-over-image, adaptatif aux 3 thèmes */
.mdt-hero { position: relative; margin: 0 0 28px; border-radius: var(--radius-lg, 12px);
  overflow: hidden; min-height: clamp(280px, 34vw, 440px); display: flex; align-items: flex-end;
  background-size: cover; background-position: center 30%; background-color: var(--bg2); }
.mdt-hero-scrim { position: absolute; inset: 0;
  background:
    linear-gradient(to top, var(--bg) 2%, rgba(0,0,0,.55) 34%, rgba(0,0,0,.05) 78%),
    linear-gradient(to right, rgba(0,0,0,.72) 0%, rgba(0,0,0,.28) 42%, rgba(0,0,0,0) 72%); }
.mdt-hero-inner { position: relative; z-index: 1; padding: 32px 36px; max-width: 720px; }
.mdt-hero-kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: .16em;
  text-transform: uppercase; color: #fff; opacity: .82; margin-bottom: 8px; }
.mdt-hero-title { font-family: var(--font-display); font-weight: 600; color: #fff;
  font-size: clamp(28px, 4vw, 46px); line-height: 1.05; margin: 0 0 8px;
  text-shadow: 0 2px 18px rgba(0,0,0,.4); }
.mdt-hero-meta { font-size: 14px; color: rgba(255,255,255,.9); margin: 0 0 12px; }
.mdt-hero-bar { height: 5px; width: min(320px, 60%); border-radius: 3px; background: rgba(255,255,255,.25);
  overflow: hidden; margin-bottom: 16px; }
.mdt-hero-bar > div { height: 100%; background: var(--brand); }
.mdt-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.mdt-hero-cta { background: #fff; color: #111; border-color: #fff; }
.mdt-hero-quick { color: #fff; border-color: rgba(255,255,255,.5); background: rgba(255,255,255,.08); }
.mdt-hero--empty { background: var(--bg2); }
.mdt-hero--empty .mdt-hero-kicker,
.mdt-hero--empty .mdt-hero-title,
.mdt-hero--empty .mdt-hero-meta { color: var(--tx); }
.mdt-hero--empty .mdt-hero-kicker { color: var(--tx3); }
.mdt-hero--empty .mdt-hero-meta { color: var(--tx2); }
```

- [ ] **Step 5 : Ajouter l'event à `docs/telemetry.md`** — insérer après la ligne `mediatheque_rate` (ligne 39) :

```markdown
| `mediatheque_hero_action` | `{action, status}` | `cockpit/panel-mediatheque.jsx::MdtHero` clic CTA primaire (`action:"resume"/"start"/"open"`) |
```

- [ ] **Step 6 : Vérifier** — en haut de la Médiathèque : un grand hero avec la bannière de Frieren (ou du titre « En cours » le plus récent), kicker « REPRENDRE », titre, méta « S2 · 12/28 », barre, boutons `▶ Reprendre` (ouvre la fiche) + `+1 épisode` (incrémente sans modale). Vérifier le voile lisible en Dawn ET Obsidian (le bas fond bien vers le fond de page). Vider le filtre de recherche → hero présent ; taper une recherche → hero masqué. Passer une franchise en « À voir » (ou observer l'état réel) : le kicker/CTA s'adaptent selon la table de priorité.

- [ ] **Step 7 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css docs/telemetry.md
git commit -m "feat(mediatheque): cinematic hero billboard (pickHero + MdtHero) + hero telemetry"
```

---

## Task 4 : Barre discrète (toolbar) + bandeau sorties restylés

Adoucir la toolbar (chips/recherche/tri) pour ne pas concurrencer le hero, et alléger le bandeau sorties. Purement CSS + petits ajustements de classe.

**Files:**
- Modify: `cockpit/styles-mediatheque.css` (toolbar, chips, bandeau sorties)

**Interfaces:** aucune nouvelle — restyle des classes existantes (`.mdt-toolbar`, `.mdt-search`, `.mdt-chip`, `.mdt-select`, `.mdt-releases*`).

- [ ] **Step 1 : Remplacer les styles toolbar** (lignes 12-23 de `styles-mediatheque.css`)

```css
/* Toolbar discrète : recherche + filtres + tri (sous le hero) */
.mdt-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 22px; }
.mdt-search { order: 3; margin-left: auto; flex: 0 1 300px; padding: 8px 14px 8px 34px; font: inherit; font-size: 13.5px;
  color: var(--tx); background: color-mix(in srgb, var(--tx) 4%, transparent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23888' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E") no-repeat 11px center;
  border: 1px solid color-mix(in srgb, var(--tx) 12%, transparent); border-radius: 999px; }
.mdt-search:focus { outline: 2px solid var(--brand); outline-offset: 1px; }
.mdt-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.mdt-chip { padding: 6px 13px; font-family: var(--font-mono); font-size: 11.5px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tx) 14%, transparent); background: transparent; color: var(--tx2); cursor: pointer;
  transition: border-color .15s ease, color .15s ease; }
.mdt-chip:hover { color: var(--tx); border-color: color-mix(in srgb, var(--tx) 30%, transparent); }
.mdt-chip.is-active { background: var(--tx); color: var(--bg); border-color: var(--tx); }
.mdt-select { padding: 6px 10px; font-family: var(--font-mono); font-size: 11.5px; color: var(--tx3);
  background: transparent; border: 1px solid color-mix(in srgb, var(--tx) 12%, transparent); border-radius: 999px; }
```

- [ ] **Step 2 : Alléger le bandeau sorties** (lignes 34-43)

```css
/* Bandeau Sorties — slim, discret */
.mdt-releases { margin-bottom: 22px; padding: 12px 16px; border: 1px solid color-mix(in srgb, var(--brand) 28%, transparent);
  border-radius: var(--radius-lg, 12px); background: color-mix(in srgb, var(--brand) 5%, transparent); }
.mdt-releases-head { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--tx2); margin-bottom: 8px; }
.mdt-release { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 13.5px; }
.mdt-release-date { font-family: var(--font-mono); font-size: 11px; color: var(--tx3); margin-left: auto; white-space: nowrap; }
.mdt-release-ack { border: none; background: transparent; color: var(--tx3); cursor: pointer; font-size: 14px; padding: 2px 6px; }
.mdt-release-ack:hover { color: var(--brand); }
.mdt-calendar { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 8px; font-size: 12.5px; color: var(--tx2); }
.mdt-calendar-item strong { color: var(--tx); font-weight: 600; }
```

- [ ] **Step 3 : Vérifier** — la recherche est repoussée à droite avec une loupe, les chips sont plus légers (contour fin, actif = pastille pleine), le tri est discret. Le bandeau sorties (s'il apparaît) est plus fin. Rien ne « crie » sous le hero. Tester les 3 thèmes.

- [ ] **Step 4 : Commit**

```bash
git add cockpit/styles-mediatheque.css
git commit -m "style(mediatheque): quieter toolbar (search/chips/sort) + slimmer releases strip"
```

---

## Task 5 : En-tête bannière de la fiche modale

Remplacer l'en-tête affiche-à-gauche plate de `FicheFranchise` par un en-tête bannière avec voile, cohérent avec le hero. Le corps de la modale reste inchangé.

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (`FicheFranchise`, bloc `.mdt-fiche-head`)
- Modify: `cockpit/styles-mediatheque.css` (`.mdt-fiche-head` et enfants)

**Interfaces:**
- `head` gagne un champ `banner` : en mode preview `root.bannerImage`, en mode library `f.banner_url`.

- [ ] **Step 1 : Exposer la bannière dans `head`** — dans `FicheFranchise`, ajouter `banner` aux deux constructions de `head`.

Mode preview (après `cover: root.coverImage && root.coverImage.large,`) :
```jsx
      banner: root.bannerImage || (root.coverImage && root.coverImage.large) || null,
```
Mode library (dans l'objet `head = { cover: f.cover_url, ... }`) :
```jsx
      banner: f.banner_url || f.cover_url || null,
```

- [ ] **Step 2 : Remplacer le JSX de `.mdt-fiche-head`** (lignes ~159-169)

```jsx
        <div className="mdt-fiche-head" style={head.banner ? { backgroundImage: `url(${head.banner})` } : undefined}>
          <div className="mdt-fiche-scrim" />
          <div className="mdt-fiche-head-inner">
            <h2>{head.title}</h2>
            <p className="mdt-fiche-native">{head.romaji}{head.native ? ` · ${head.native}` : ""}</p>
            <p className="mdt-fiche-meta">{head.genres}</p>
            {head.franchise && head.franchise.shelved &&
              <span className="mdt-badge mdt-badge--shelved" style={{ marginTop: 6, display: "inline-block" }}>Mis de côté</span>}
          </div>
        </div>
        {head.synopsis && <p className="mdt-fiche-synopsis">{head.synopsis}</p>}
```

(Le synopsis sort de l'en-tête pour rester lisible sous la bannière.)

- [ ] **Step 3 : Remplacer les styles d'en-tête** (lignes 80-85 de `styles-mediatheque.css`)

```css
.mdt-fiche-head { position: relative; margin: -24px -26px 4px; min-height: 200px; display: flex;
  align-items: flex-end; background-size: cover; background-position: center 28%; background-color: var(--bg2);
  border-radius: 14px 14px 0 0; overflow: hidden; }
.mdt-fiche-scrim { position: absolute; inset: 0;
  background: linear-gradient(to top, var(--bg) 3%, rgba(0,0,0,.6) 40%, rgba(0,0,0,.1) 85%); }
.mdt-fiche-head-inner { position: relative; z-index: 1; padding: 22px 24px; }
.mdt-fiche-head-inner h2 { font-family: var(--font-display); font-size: 28px; margin: 0 0 2px; color: #fff; text-shadow: 0 2px 14px rgba(0,0,0,.4); }
.mdt-fiche-native { font-size: 13px; color: rgba(255,255,255,.82); margin: 0 0 6px; }
.mdt-fiche-meta { font-family: var(--font-mono); font-size: 11px; color: rgba(255,255,255,.75); }
.mdt-fiche-synopsis { font-size: 13px; line-height: 1.55; color: var(--tx2); margin: 14px 0 0; }
```

Note : les règles `.mdt-fiche-cover` et `.mdt-fiche-titles*` deviennent inutiles — les supprimer.

- [ ] **Step 4 : Retirer la responsive obsolète** — dans le `@media (max-width: 720px)` final (lignes 120-123), supprimer `.mdt-fiche-head { flex-direction: column; }` (l'en-tête n'est plus une rangée cover+texte).

- [ ] **Step 5 : Vérifier** — ouvrir une fiche depuis la grille : l'en-tête est une bannière 16:9 avec voile, titre + méta en blanc dessus, synopsis lisible en dessous (couleur de thème). Ouvrir une fiche preview depuis la recherche : même en-tête (bannière AniList). Les steppers et notes du corps fonctionnent comme avant. Tester Dawn + Obsidian.

- [ ] **Step 6 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css
git commit -m "style(mediatheque): banner header in franchise modal (matches hero)"
```

---

## Task 6 : Docs (spec onglet) + resync service worker + vérif prod

Boucler les règles cardinales et vérifier l'ensemble en prod dans les 3 thèmes.

**Files:**
- Modify: `docs/specs/tab-mediatheque.md`, `docs/specs/index.json`
- Generated: service worker (via script)

- [ ] **Step 1 : Mettre à jour `docs/specs/tab-mediatheque.md`** — dans « Front — structure UI » (ligne 29), remplacer la description par une version qui mentionne le hero + les cartes à actions rapides :

Remplacer :
```
grille `.mdt-grid` de `.mdt-card`, modale `<FicheFranchise>`
```
par :
```
hero `<MdtHero>` (billboard bannière, titre mis en avant via `pickHero`, CTA + `+1` inline), grille `.mdt-grid` de `<MdtCard>` (poster, badge de statut, barre de progression, actions rapides +1/✓ au survol sur la saison courante sans ouvrir la modale), modale `<FicheFranchise>` (en-tête bannière)
```

Puis, dans « Fonctionnalités » → puce **Bibliothèque**, remplacer par :
```
- **Bibliothèque** : hero cinématique mettant en avant le titre le plus pertinent (à reprendre / prochain épisode / à découvrir / vu), puis grille de posters (jaquette, badge de statut, barre de progression) avec actions rapides au survol (cocher un épisode de la saison courante sans ouvrir la fiche), filtres par statut, tri par activité/ajout/alphabétique.
```

Ajouter une ligne dans « Front — fonctions JS » :
```
| `pickHero()` / `currentEntryOf()` | choix du titre hero (table de priorité) / saison courante d'une franchise | `cockpit/panel-mediatheque.jsx` |
```

Mettre à jour « Dernière MAJ » (ligne 70) :
```
2026-07-22 — redesign « Apple TV+ » : hero billboard + grille de posters + actions rapides au survol (cocher un épisode sans ouvrir la modale) + en-tête bannière de la fiche. Adaptatif aux 3 thèmes, aucune migration.
```

- [ ] **Step 2 : Bumper `docs/specs/index.json`** — l'entrée `mediatheque` a déjà `last_updated: "2026-07-22"`. Si la date du jour d'exécution diffère, la mettre à jour ; sinon laisser tel quel (déjà à jour).

- [ ] **Step 3 : Valider les specs**

Run (PowerShell) :
```
$env:PYTHONUTF8=1; python scripts/validate_spec.py; python scripts/lint_specs_produit.py
```
Attendu : validation OK. (Rappel mémoire : `validate_spec.py` peut renvoyer exit 1 sur un `UnicodeEncodeError` cp1252 au `print` final alors que la validation est bonne — d'où `PYTHONUTF8=1`.)

- [ ] **Step 4 : Valider l'architecture**

Run : `python scripts/validate_architecture.py`
Attendu : OK (aucun changement de dépendance panel↔table — refonte purement visuelle).

- [ ] **Step 5 : Resynchroniser le service worker**

Run : `node scripts/sync-sw.mjs`
Attendu : `STATIC[]`/`CACHE` régénérés (message de succès). Ne jamais éditer le SW à la main.

- [ ] **Step 6 : Commit docs + SW**

```bash
git add docs/specs/tab-mediatheque.md docs/specs/index.json index.html cockpit/
git commit -m "docs(mediatheque): spec onglet + service worker resync (redesign Apple TV+)"
```

(Le `git add` inclut le fichier SW régénéré par `sync-sw.mjs` — vérifier `git status` pour son chemin exact avant de committer.)

- [ ] **Step 7 : Push + vérification prod**

```bash
git push origin main
```
Puis, après déploiement Pages, hard-refresh de l'onglet Médiathèque et vérifier dans **les 3 thèmes** (Dawn, Obsidian, Atlas) :
- hero lisible, bon titre mis en avant, CTA ouvre la fiche, `+1` incrémente ;
- grille : badges + barres, survol soulève + révèle les actions, `+1/✓` écrivent sans modale, clic ouvre la fiche ;
- fiche : en-tête bannière, corps intact (steppers, notes, mise de côté, retrait) ;
- recherche AniList : hero masqué, résultats OK, ajout/preview intacts ;
- responsive/tactile : actions de carte visibles en permanence.

- [ ] **Step 8 : Nettoyage éventuel** — si un écart visuel apparaît en prod (voile trop fort/faible, halo, timings), ajuster les valeurs dans `styles-mediatheque.css` et re-commit/push. Ces valeurs sont des points de départ à affiner à l'œil (pas de test automatisé possible).

---

## Self-Review (rédaction)

- **Couverture spec** : §4A hero → Task 3 ; §4B toolbar → Task 4 ; §4C grille+survol → Tasks 1-2 ; §4D fiche bannière → Task 5 ; §4E sorties → Task 4 ; §2 thèmes → contraintes globales + vérifs par task ; §6 télémétrie → Task 3 Step 6 ; §7 docs/SW → Task 6. ✅ Tous les blocs couverts.
- **Placeholders** : aucun « TBD/TODO » ; code réel dans chaque step ; les valeurs CSS sont concrètes (affinables à l'œil, signalé Step 8 Task 6, cohérent avec l'absence de test front).
- **Cohérence des types** : `currentEntryOf`, `mdtCurLabel`, `pickHero`, `nextAiringOf`, `heroCopy`, `<MdtCard>`, `<MdtHero>` référencés de façon cohérente entre tasks ; `hero.card` = élément de `cards` (`{f, entries, st, lastTouch}`) partout ; `onProgress = writeProgress` partout.
