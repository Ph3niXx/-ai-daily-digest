# Jobs Radar — Redesign UI de vote — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'UI de vote du Jobs Radar par un contrôle lisible (tokens de thème corrects) et aligné sur le site : pouces 👍/👎 + popover de raisons **multi-sélection** + champ libre, raisons sérialisées dans la colonne `user_verdict_reason` existante.

**Architecture:** Réécriture du composant `JrVote` (popover style `.jr-menu-pop`, cases multi-select, parse/compose de la colonne texte) + remplacement du bloc CSS `.jr-vote*` et correction de `.jr-calib*` (faux tokens → vrais tokens du thème). Pas de migration, pas de changement de la persistance (`voteJob`/whitelist/`jobs_feedback` inchangés). Spec : [docs/superpowers/specs/2026-05-21-jobs-radar-vote-ui-redesign-design.md](../specs/2026-05-21-jobs-radar-vote-ui-redesign-design.md).

**Tech Stack:** React 18 + Babel standalone (no build, hooks aliasés `useStateJr`/`useEffectJr`/`useRefJr`, composants `window.*`), CSS tokens de thème (`--surface`, `--tx`/`--tx2`/`--tx3`, `--bd`/`--bd2`, `--brand`/`--brand-tint`/`--brand-ink`, `--positive`/`--negative`, `--radius`, `--shadow-md`, `--font-sans`/`--font-mono`).

**Note tests :** aucun runner JS, pas de navigateur côté implémenteur. Vérification = lecture statique (JSX/CSS équilibrés, classes utilisées ↔ définies) + smoke-test navigateur en fin (par le contrôleur/humain). Le SQL n'est pas touché.

---

## Structure des fichiers

| Fichier | Modif | Responsabilité |
|---|---|---|
| `cockpit/styles-jobs-radar.css` | Modify 1336-1393 | Remplace le bloc `.jr-vote*` (tokens corrects + popover/checkbox/tags) ; corrige `.jr-calib*` (mêmes faux tokens). |
| `cockpit/panel-jobs-radar.jsx` | Modify 168-255 | Réécrit `VERDICT_REASONS` + helpers `jrParseReason`/`jrComposeReason` + composant `JrVote` (popover multi-select). Le reste (`voteJob`, whitelist, branchement `onVote`) est inchangé. |
| `docs/specs/tab-jobs.md` + `docs/specs/index.json` | Modify | Spec : vote = popover multi-raison ; bump `last_updated`. |
| `sw.js` | Modify (généré) | `node scripts/sync-sw.mjs`. |

---

## Task 1 : CSS — bloc vote (tokens + popover) + fix calibrage

**Files:**
- Modify: `cockpit/styles-jobs-radar.css:1336-1393`

- [ ] **Step 1 : Remplacer le bloc `.jr-vote*` et `.jr-calib*`**

Sélectionne **tout** depuis la ligne `/* ─── Vote / calibrage ─── */` (1336) jusqu'à la fin de `.jr-calib-actions { ... }` (1393, fin de fichier) et remplace par :

```css
/* ─── Vote (popover multi-raison) ────────────────────────── */
.jr-vote { position: relative; display: inline-flex; flex-direction: column; gap: 8px; }
.jr-vote-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.jr-vote-thumbs { display: inline-flex; gap: 7px; }
.jr-vote-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 7px;
  border: 1px solid var(--bd2); background: transparent;
  color: var(--tx2); cursor: pointer; transition: all .12s ease;
}
.jr-vote-btn:hover { color: var(--tx); border-color: var(--tx2); }
.jr-vote-btn.is-up   { background: var(--positive-tint, rgba(84,201,138,.14)); border-color: var(--positive, #54c98a); color: var(--positive, #54c98a); }
.jr-vote-btn.is-down { background: var(--negative-tint, rgba(224,113,111,.13)); border-color: var(--negative, #e0716f); color: var(--negative, #e0716f); }
.jr-vote--compact .jr-vote-btn { width: 29px; height: 29px; }

.jr-vote-tags { display: inline-flex; flex-wrap: wrap; gap: 6px; }
.jr-vote-tag {
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--brand-ink, var(--brand)); background: var(--brand-tint);
  border-radius: 3px; padding: 3px 7px;
}
.jr-vote-why {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-sans); font-size: 11.5px; color: var(--tx2);
  background: transparent; border: 1px solid var(--bd2); border-radius: var(--radius);
  padding: 4px 9px; cursor: pointer; transition: all .12s ease;
}
.jr-vote-why:hover { color: var(--tx); border-color: var(--tx2); }

.jr-vote-pop {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
  width: 250px; background: var(--surface); border: 1px solid var(--bd2);
  border-radius: var(--radius); box-shadow: var(--shadow-md); padding: 6px;
}
.jr-vote--compact .jr-vote-pop { left: auto; right: 0; }
.jr-vote-pop-head {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: .13em; text-transform: uppercase;
  color: var(--tx3); padding: 6px 8px 4px;
}
.jr-vote-opt {
  width: 100%; display: flex; align-items: center; gap: 9px;
  padding: 7px 9px; border-radius: 4px; border: none; background: transparent;
  font-family: var(--font-sans); font-size: 12.5px; color: var(--tx); cursor: pointer; text-align: left;
}
.jr-vote-opt:hover { background: var(--bg3); }
.jr-vote-box {
  width: 15px; height: 15px; flex: 0 0 auto; border-radius: 3px;
  border: 1px solid var(--bd2); display: inline-flex; align-items: center; justify-content: center;
  color: var(--bg);
}
.jr-vote-box svg { opacity: 0; transition: opacity .1s ease; }
.jr-vote-opt.is-on .jr-vote-box { background: var(--brand); border-color: var(--brand); }
.jr-vote-opt.is-on .jr-vote-box svg { opacity: 1; }
.jr-vote-pop-sep { height: 1px; background: var(--bd); margin: 5px 2px; }
.jr-vote-free-input {
  width: 100%; font-family: var(--font-sans); font-size: 12px; line-height: 1.4;
  padding: 7px 9px; margin-top: 2px;
  background: var(--bg); color: var(--tx); border: 1px solid var(--bd2); border-radius: 5px;
}
.jr-vote-free-input::placeholder { color: var(--tx3); }

/* ─── Encart calibrage ─────────────────────────────────── */
.jr-calib { margin: 16px 0; border: 1px solid var(--bd); border-radius: 12px; overflow: hidden; }
.jr-calib-head {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: var(--surface); border: none; cursor: pointer; color: var(--tx);
}
.jr-calib-kicker { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: .02em; }
.jr-calib-body { padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 760px) { .jr-calib-body { grid-template-columns: 1fr; } }
.jr-calib-block { display: flex; flex-direction: column; gap: 8px; }
.jr-calib-lock, .jr-calib-auto {
  font-size: 10px; padding: 1px 6px; border-radius: 999px; margin-left: 6px; vertical-align: middle;
}
.jr-calib-lock { background: var(--brand-tint); color: var(--brand-ink, var(--brand)); }
.jr-calib-auto { background: var(--bg3); color: var(--tx3); }
.jr-calib-text { font-size: 13px; line-height: 1.5; color: var(--tx); white-space: pre-wrap; }
.jr-calib-text--observed { color: var(--tx2); }
.jr-calib-input {
  width: 100%; font-size: 13px; line-height: 1.5; padding: 10px; border-radius: var(--radius);
  border: 1px solid var(--bd2); background: var(--surface); color: var(--tx); resize: vertical;
}
.jr-calib-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
```

- [ ] **Step 2 : Vérifier que les tokens existent (sinon fallback)**

Run: `grep -nE "\-\-positive\b|\-\-negative\b|\-\-shadow-md\b|\-\-brand-ink\b" cockpit/styles.css index.html`
- `--positive` est utilisé ailleurs (`.jr-tag--status-applied`) → existe. `--shadow-md` est utilisé par `.jr-menu-pop` → existe.
- `--negative` / `--brand-ink` : s'ils n'apparaissent nulle part en **définition**, les `var(--negative, #e0716f)` / `var(--brand-ink, var(--brand))` ci-dessus assurent un repli correct (rouge lisible / brand). Rien d'autre à faire — ne PAS coder les couleurs en dur ailleurs.

- [ ] **Step 3 : Commit**

```bash
git add cockpit/styles-jobs-radar.css
git commit -m "style(jobs): vote sur tokens de theme + popover multi-raison; fix tokens calibrage"
```

---

## Task 2 : Réécriture du composant `JrVote`

**Files:**
- Modify: `cockpit/panel-jobs-radar.jsx:168-255` (le commentaire `// ─── Vote …`, `VERDICT_REASONS`, et toute la fonction `JrVote`)

- [ ] **Step 1 : Remplacer le bloc 168-255**

Remplace depuis la ligne `// ─── Vote 👍/👎 + raison (calibrage) ───…` (168) jusqu'à la `}` finale de `JrVote` (255, juste avant `// ─── Score chip …`) par :

```jsx
// ─── Vote 👍/👎 + raisons (popover multi-sélection) ───────
const VERDICT_REASONS = {
  down: ["trop junior", "run/BAU", "secteur", "boîte", "lieu/remote"],
  up:   ["scope parfait", "secteur", "la boîte", "coup de cœur"],
};

// Sérialisation dans la colonne texte unique user_verdict_reason :
//   "raison1 · raison2 [ — texte libre ]". Le ` — ` (présent ou non)
//   sépare les raisons du texte libre ; les raisons sont jointes par ` · `.
function jrParseReason(raw) {
  const s = raw || "";
  const i = s.indexOf(" — ");
  const reasonsPart = i >= 0 ? s.slice(0, i) : s;
  const free = i >= 0 ? s.slice(i + 3) : "";
  const reasons = reasonsPart.trim() ? reasonsPart.split(" · ").map(x => x.trim()).filter(Boolean) : [];
  return { reasons, free };
}
function jrComposeReason(reasons, free) {
  const f = (free || "").trim();
  if (!reasons.length && !f) return null;
  return reasons.join(" · ") + (f ? " — " + f : "");
}

function JrVote({ offer, onVote, compact = false }) {
  const verdict = offer.user_verdict || null;
  const parsed = jrParseReason(offer.user_verdict_reason);
  const selected = parsed.reasons;            // source de vérité = l'offre (optimistic)
  const [open, setOpen] = useStateJr(false);
  const [draft, setDraft] = useStateJr(parsed.free);
  const ref = useRefJr(null);

  // Ferme le popover au clic extérieur / Escape (même pattern que JrActionsMenu)
  useEffectJr(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const isOn = (r) => selected.includes(r);

  const clickThumb = (v) => {
    if (verdict === v) {
      onVote(offer.id, { user_verdict: null, user_verdict_reason: null, user_verdict_at: null });
      setOpen(false); setDraft("");
    } else {
      onVote(offer.id, { user_verdict: v, user_verdict_reason: null, user_verdict_at: new Date().toISOString() }, v === "up" ? "Noté 👍" : "Noté 👎");
      setDraft(""); setOpen(true);
    }
  };
  const toggleReason = (r) => {
    const next = isOn(r) ? selected.filter(x => x !== r) : [...selected, r];
    onVote(offer.id, { user_verdict_reason: jrComposeReason(next, draft) });
  };
  const commitFree = () => {
    onVote(offer.id, { user_verdict_reason: jrComposeReason(selected, draft) });
  };

  return (
    <div className={`jr-vote ${compact ? "jr-vote--compact" : ""}`} ref={ref}>
      <div className="jr-vote-row">
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
        </div>

        {verdict && selected.length > 0 && (
          <span className="jr-vote-tags">
            {selected.map(r => <span key={r} className="jr-vote-tag">{r}</span>)}
          </span>
        )}

        {verdict && (
          <button
            className="jr-vote-why"
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            aria-expanded={open} aria-controls={`jr-pop-${offer.id}`}
            aria-label={open ? "Fermer les raisons" : "Choisir une raison"}>
            <Icon name={open ? "chevron_up" : "chevron_down"} size={13} stroke={2} />
            <span>{selected.length ? "raison" : "pourquoi ?"}</span>
          </button>
        )}
      </div>

      {verdict && open && (
        <div className="jr-vote-pop" id={`jr-pop-${offer.id}`} role="group" aria-label="Raisons du vote">
          <div className="jr-vote-pop-head">Pourquoi ? (plusieurs possibles)</div>
          {VERDICT_REASONS[verdict].map(r => (
            <button
              key={r}
              className={`jr-vote-opt ${isOn(r) ? "is-on" : ""}`}
              role="checkbox" aria-checked={isOn(r)}
              onClick={(e) => { e.stopPropagation(); toggleReason(r); }}>
              <span className="jr-vote-box"><Icon name="check" size={11} stroke={3} /></span>
              <span>{r}</span>
            </button>
          ))}
          <div className="jr-vote-pop-sep" />
          <input
            className="jr-vote-free-input"
            value={draft}
            placeholder="préciser (optionnel)…"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitFree}
            onKeyDown={(e) => { if (e.key === "Enter") { commitFree(); setOpen(false); } if (e.key === "Escape") setOpen(false); }}
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier les dépendances inchangées**

- `cardHandlers.onVote = voteJob`, et `HotLeadCard`/`OfferRow` passent toujours `offer`/`onVote`/`compact` — ne PAS y toucher (le composant garde la même interface `{ offer, onVote, compact }`).
- Icônes utilisées : `thumbs_up`, `thumbs_down` (ajoutées précédemment), `chevron_up`/`chevron_down` (existent), `check` (utilisé par `JrToast`, existe). Confirme par lecture de `cockpit/icons.jsx` — aucun ajout attendu.
- `voteJob` lit `patch.user_verdict_reason` et l'envoie tel quel via la whitelist (déjà whitelistée) → la chaîne composée est persistée sans changement de plomberie.

- [ ] **Step 3 : Vérifier (lecture statique)**

- JSX équilibré, hooks aliasés (`useStateJr`/`useEffectJr`/`useRefJr`), pas de `useState` nu.
- `jrParseReason`/`jrComposeReason` round-trip : `compose(["a","b"],"x")="a · b — x"` ; `parse("a · b — x")={reasons:["a","b"],free:"x"}` ; `parse("run/BAU")={reasons:["run/BAU"],free:""}` (legacy mono) ; `compose([],"")` = `null`.

- [ ] **Step 4 : Commit**

```bash
git add cockpit/panel-jobs-radar.jsx
git commit -m "feat(jobs): JrVote en popover multi-selection (parse/compose colonne texte)"
```

---

## Task 3 : Finalisation (spec + sw)

**Files:**
- Modify: `docs/specs/tab-jobs.md`, `docs/specs/index.json`, `sw.js`

- [ ] **Step 1 : MAJ spec onglet**

Dans `docs/specs/tab-jobs.md` :
- **Fonctionnalités** : remplace/complète la puce du vote pour décrire le nouveau geste — « **Vote 👍/👎 + raisons** : pouces sur chaque carte et ligne ; un popover (style du menu ⋯) permet de cocher **plusieurs** raisons + un texte libre. Les raisons retenues s'affichent en tags. Re-cliquer le pouce actif annule le vote. Stocké dans `user_verdict_reason` (raisons jointes). »
- Ajoute une ligne datée en tête de **Dernière MAJ** : « 2026-05-21 — redesign UI de vote : popover multi-sélection des raisons + alignement sur les tokens du thème (fix contraste du champ custom). Voir docs/superpowers/plans/2026-05-21-jobs-radar-vote-ui-redesign.md. »

- [ ] **Step 2 : Bump index + lint specs**

- `docs/specs/index.json` : `last_updated` de `jobs` → `2026-05-21` (déjà à cette date ; laisser).
- Run: `python scripts/lint_specs_produit.py`
  Expected: `ok -- … aucune violation.`

- [ ] **Step 3 : Resync service worker**

Run: `node scripts/sync-sw.mjs`
Expected: `[sync-sw] CACHE → cockpit-vNN, STATIC → … entries` ; `sw.js` modifié.

- [ ] **Step 4 : Commit**

```bash
git add docs/specs/tab-jobs.md docs/specs/index.json sw.js
git commit -m "docs(jobs): MAJ spec vote multi-raison + resync sw"
```

---

## Vérification finale (navigateur — contrôleur/humain)

- [ ] **Contraste** : ouvrir Jobs Radar, voter, ouvrir le popover, taper dans « préciser » → texte lisible. Tester en thème **clair** ET **sombre** (switcher sidebar).
- [ ] **Multi-select** : cocher 2+ raisons → 2+ tags affichés ; `SELECT user_verdict_reason FROM jobs WHERE id='…'` = `Run/BAU · Secteur` ; ajouter un texte → `… — mon texte` ; décocher → recomposition ; tout retirer → `null`.
- [ ] **Persistance** : F5 → tags + texte ré-hydratés (parse). Switch de pouce → raisons vidées.
- [ ] **Lignes denses** : version compacte lisible ; popover ne déborde pas (ancre `right:0` en compact). Si débordement dans un contexte, ajuster l'ancre `left/right` de `.jr-vote-pop`.
- [ ] **Alignement** : pouces/tags/popover cohérents avec `.jr-filter-btn` / `.jr-tag` / `.jr-menu-pop`.
- [ ] **Encart calibrage** : vérifier que le fix tokens ne l'a pas cassé (couleurs OK en clair/sombre).
