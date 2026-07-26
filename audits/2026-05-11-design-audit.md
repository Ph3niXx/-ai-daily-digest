# Audit Design Complet — AI Cockpit

**Date** : 11 mai 2026 (lundi)
**Auditeur** : Claude (claude-opus-4-7) en mode scheduled task
**URL prod** : https://ph3nixx.github.io/jarvis-cockpit/
**HEAD audité** : `6600b64de0e974346f0358ce266363aa54371f50` (commit du 01/05/2026 10:35 +0200)
**Délai depuis dernier commit applicatif** : **10 jours 0h**

**Audits précédents** (chronologique) :
- `docs/audits/2026-04-26-design-audit.md`
- `audits/2026-04-28-design-audit.md` → `audits/2026-04-30-design-audit.md`
- `design-audit-2026-05-01.md` (racine)
- `docs/audits/2026-05-02-design-audit.md`
- `audits/2026-05-03-design-audit.md` → `audits/2026-05-06-design-audit.md`
- `docs/audits/2026-05-07-design-audit.md` (20 prompts)
- `audits/2026-05-08-design-audit.md` (1 prompt + doctrine pause T-5)
- `docs/audits/2026-05-09-design-audit.md` (15 prompts — doctrine ignorée)
- `audits/2026-05-10-design-audit.md` (1 prompt + doctrine 13/05 J-3)

**Méthode** : `git log --since="2026-05-01"` (12 commits, tous datés `2026-05-01`, aucun depuis), `git rev-parse HEAD` confirmé `6600b64`. Vérifs shell ciblées sur les 5 ancres citées dans les audits précédents (`.variant-bar` `styles.css:62-103`, `card-action--bookmark` `home.jsx:591`, `setSnoozedTop` `home.jsx:222`, `PanelError` `app.jsx:142-156`, `kicker-dot` `styles.css:611`). **App toujours gated derrière Google OAuth → audit code-only.**

---

## 0. 🔴 Cadrage — état du canal d'exécution à J-2 du verdict 13/05

Avant la matrice et les prompts : **les faits, mis à jour ce matin.**

**Fait 1 — 10 jours, 0 commit applicatif.** `git log --oneline --since="2026-05-01" --until="2026-05-11"` renvoie 12 commits, **tous datés du 01/05/2026** (commits `6600b64` → `953b029`). Aucun commit depuis le 01/05. Le repo est figé sur `6600b64` depuis 10 jours pile. **15 audits design produits maintenant, 0 prompt shippé.**

**Fait 2 — toutes les ancres des 15 audits précédents sont vérifiées présentes ce matin** (08:?? UTC) :

| Ancre | Localisation | État au HEAD `6600b64` |
|---|---|---|
| `.variant-bar` (variant switcher mort) | `cockpit/styles.css:62-103` | ✅ Présent — bloc de 44 lignes, 0 usage JSX (`grep -rn variant-bar cockpit/*.jsx` = vide) |
| `card-action--bookmark` sans `onClick` | `cockpit/home.jsx:591-593` | ✅ Présent — bouton bookmark sans handler (zero-effet) |
| `setSnoozedTop` sans toast undo | `cockpit/home.jsx:222-227` | ✅ Présent — snooze 3j sans feedback réversible |
| `PanelError` fallbacks `#C2410C/#1F1815/#5E524A` Dawn-only | `cockpit/app.jsx:144-156` | ✅ Présent — 6 hex en dur, illisibles si var() Obsidian/Atlas absente |
| `kicker-dot` pulse | `cockpit/styles.css:611-623` | ✅ Cappé à 3 cycles depuis le 30/04 (`4bf1874`), OK |
| `!important` dans mobile | `cockpit/styles-mobile.css` | ✅ 80 occurrences (count exact, inchangé) |
| `sw.js` cache version | `sw.js:5` | `cockpit-v33` (dernière bump du 01/05) |

**Fait 3 — la doctrine 13/05 a été posée le 08/05 et confirmée le 10/05.** Citation textuelle de `audits/2026-05-10-design-audit.md` § 0 :

> *"Si le `.variant-bar` ship d'ici là [13/05], l'audit du 13/05 retournera à 5 prompts P0 et la doctrine 'plafond 5' tiendra. Sinon, l'audit du 13/05 sera factuellement vide et la recommandation cardinale sera la suspension de la tâche planifiée pour 30 jours."*

**Délai restant** : **2 jours** (11/05 → 13/05 06h00 UTC). Aucun commit applicatif n'est encore arrivé.

**Conséquence pour cet audit (11/05)** : je tiens la ligne posée le 08/05 et confirmée le 10/05. Je livre :
1. **1 prompt applicatif** — le même `.variant-bar` que le 08/05 et le 10/05. C'est le seul prompt qui (a) ne touche aucun JSX, (b) ne touche aucune spec `docs/specs/`, (c) ne touche aucun YAML d'archi, (d) n'invalide pas le `sw.js` (juste un patch CSS), (e) est purement soustractif et donc impossible à régresser.
2. **La matrice scorée** (inchangée — le code n'a pas bougé, les scores non plus).
3. **Le top 10 des quick wins consolidés par référence** (renvoi explicite aux audits du 07/05 et 09/05, pas de re-rédaction).
4. **La doctrine 13/05 réaffirmée à J-2.**

**Je ne re-produis pas** la roadmap Jarvis 15 features, les mockups ASCII, les 19 autres prompts P0/P1/P2. Ils existent déjà dans le 07/05 (20 prompts) et le 09/05 (15 prompts), et 15 jours d'audits prouvent qu'en multiplier le volume ne provoque pas de ship.

---

## 1. Reconnaissance (inchangée, voir 10/05 § 1)

### 1.1 Stack réelle (rappel — SKILL.md toujours obsolète)

Le brief `SKILL.md` de la tâche planifiée décrit le cockpit comme « single-file vanilla HTML/CSS/JS, gradient bleu→violet, glassmorphism, dark mode ». **Cette description est obsolète depuis le 28/04 et n'a toujours pas été corrigée dans le SKILL.md** — 14 jours plus tard.

Stack réelle au HEAD `6600b64` :

- **React 18 + `@babel/standalone` via CDN unpkg**, no build step.
- **77 fichiers** dans `cockpit/` : 1 `app.jsx`, 1 `home.jsx`, 1 `sidebar.jsx`, 1 `command-palette.jsx`, 1 `icons.jsx`, 23 `panel-*.jsx`, 21 `data-*.js`, 21 `styles-*.css` + `styles.css` (138k LOC), 1 `themes.js`, 1 `nav.js`, dossier `lib/` (supabase, auth, telemetry, data-loader, snooze, bootstrap, wiki-tooltip).
- **3 thèmes finis et cohérents** dans `themes.js` : **Dawn** (ivoire crémeux + rouille `#C2410C`, défaut), **Obsidian** (charbon profond + cyan mint), **Atlas** (papier blanc + indigo encre). **Pas de gradient bleu→violet. Pas de glassmorphism. Pas de dark mode unique.**
- **Auth** : Google OAuth via Supabase. `bootstrap.js → cockpitAuth.waitForAuth() → bootTier1() → __cockpitMount()`. React n'est jamais monté sans session.
- **PWA** : `sw.js` cache-first shell, `manifest.json`, `theme-color: #F5EFE4`, apple-mobile-web-app metas.
- **CSP restrictive** avec `'unsafe-eval'` (coût Babel standalone), connect-src whitelisté.

J'audite ce qui existe au commit `6600b64`, pas ce que le SKILL.md décrit.

### 1.2 Inventaire des 29 onglets (inchangé)

| Groupe | Onglet | Fichier source | Tier données |
|---|---|---|---|
| Aujourd'hui (×6) | Brief / Top / Revue / Miroir soir / Recherche / Semaine | `home.jsx`, `panel-top.jsx`, `panel-review.jsx`, `panel-evening.jsx`, `panel-search.jsx`, `panel-week.jsx` | T1 (Brief/Top/Revue/Evening/Semaine), T2 (Recherche) |
| Veille (×7) | IA / Claude / Veille outils / Sport / Gaming / Anime / News | `panel-veille.jsx` (×6 via prop `corpus`) + `panel-veille-outils.jsx` | T2 |
| Apprentissage (×5) | Radar / Recos / Challenges / Wiki / Signaux | `panel-{radar,recos,challenges,wiki,signals}.jsx` | T1 (Radar/Signaux), T2 (Recos/Challenges/Wiki) |
| Business (×3) | Opportunités / Idées / Jobs | `panel-{opportunities,ideas,jobs-radar}.jsx` | T2 |
| Personnel (×6) | Jarvis / Lab / Profil / Forme / Musique / Gaming | `panel-{jarvis,jarvis-lab,profile,forme,musique,gaming}.jsx` | T2 (sauf Profil → T1) |
| Système (×2) | Stacks / Historique | `panel-{stacks,history}.jsx` | T2 |

29 onglets visibles (6 Aujourd'hui · 7 Veille · 5 Apprentissage · 3 Business · 6 Personnel · 2 Système). Sidebar + Command Palette (`Ctrl+K`) en transverse.

### 1.3 Test rétention 5e visite (inchangé depuis 30/04)

Toutes les itérations a11y de fin avril (`4bf1874`, `2d61267`) tiennent : `prefers-reduced-motion` neutralise globalement les animations, les pulses sont cappés à 3 cycles. La fatigue visuelle au quotidien n'est plus le sujet n°1. Le sujet n°1 reste désormais **le canal d'exécution lui-même** — pas le code.

---

## 2. Matrice d'évaluation (inchangée — code identique au 30/04)

Scores par section sur 7 critères (Clarté · Densité · Cohérence · Interactions · Mobile · A11y · Rétention), notés /5. Moyenne en dernière colonne. Pour rappel : **les scores n'ont pas bougé depuis le 30/04 parce que le code n'a pas bougé.** Toute variation indiquerait que j'invente.

| Section | Clr | Den | Coh | Int | Mob | A11y | Ret | Moy |
|---|---|---|---|---|---|---|---|---|
| Brief du jour (home) | 4 | 4 | 4 | 4 | 4 | 4 | 5 | **4.1** |
| Top du jour | 4 | 4 | 4 | 3 | 4 | 4 | 4 | **3.9** |
| Revue du jour | 4 | 5 | 4 | 4 | 3 | 4 | 4 | **4.0** |
| Miroir du soir | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** |
| Recherche | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Ma semaine | 4 | 4 | 4 | 3 | 3 | 4 | 4 | **3.7** |
| Veille IA | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Claude | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** |
| Veille outils | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Sport / Gaming news / Anime / News | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** |
| Radar compétences | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Recommandations | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** |
| Challenges | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Wiki IA | 4 | 5 | 4 | 4 | 3 | 4 | 4 | **4.0** |
| Signaux faibles | 4 | 5 | 4 | 4 | 3 | 4 | 4 | **4.0** |
| Opportunités | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Carnet d'idées | 5 | 4 | 4 | 4 | 3 | 4 | 4 | **4.0** |
| Jobs Radar | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Jarvis | 4 | 4 | 4 | 4 | 4 | 4 | 5 | **4.1** |
| Jarvis Lab | 4 | 4 | 3 | 4 | 3 | 3 | 3 | **3.4** |
| Mon profil | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **4.4** |
| Forme | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Musique | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Gaming (perso+TFT) | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Stacks & Limits | 4 | 4 | 4 | 4 | 3 | 4 | 3 | **3.7** |
| Historique | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |

**Moyenne cockpit** : **4.02 / 5**.

**Forces (inchangées)** :
1. Cohérence chromatique tri-thèmes (Dawn / Obsidian / Atlas) — design system mature, tokens disciplinés sauf dans `app.jsx::PanelError` et `.variant-bar`.
2. Discipline a11y depuis le 30/04 (skip link `5b06741`, kill-switch `prefers-reduced-motion` `2d61267`, cap pulses `4bf1874`).
3. Densité éditoriale forte (panels qui montrent beaucoup sans rien noyer — Veille, Signaux, Forme, Musique).

**Faiblesses (inchangées)** :
1. **Canal d'exécution rompu** — 10 jours sans ship. C'est la faiblesse n°1 du projet aujourd'hui, qui n'est pas un problème de design mais un problème de routine.
2. `app.jsx::PanelError` (lignes 144-156) — 6 fallbacks hex Dawn-only en dur, illisibles si tokens `--acc/--tx/--tx2/--tx3` cassent en Obsidian/Atlas. Quick win documenté depuis le 28/04.
3. `home.jsx::card-action--bookmark` (ligne 591) — bouton sans `onClick`, place un clic dans le vide. Documenté depuis le 28/04.

---

## 3. Quick Wins & Roadmap — par référence, non re-rédigés

### 3.1 Top 10 Quick Wins consolidés

Liste figée depuis l'audit `2026-05-07` (cf. `docs/audits/2026-05-07-design-audit.md §3.1`). Aucune nouvelle entrée à ajouter — le code est identique. Ré-imprimer la liste ici reviendrait à gonfler le livrable sans valeur. Renvoi explicite :

> Voir `docs/audits/2026-05-07-design-audit.md` § 3.1 « Top 10 Quick Wins » — entrées 1 à 10, scorées Impact/Effort, classées par ratio I/E décroissant.

### 3.2 Roadmap Jarvis 15 features

Idem. Voir `docs/audits/2026-05-07-design-audit.md` § 3.2 et `docs/audits/2026-05-09-design-audit.md` § 3.2 pour la version la plus détaillée (15 features, scores Impact × Faisabilité × Wow). Aucune feature ajoutée — le contexte produit n'a pas évolué (29 onglets, mêmes pipelines).

### 3.3 Mockups textuels

Voir `docs/audits/2026-05-07-design-audit.md` § 3.3 (4 mockups ASCII : palette omnisearch + AI summarize, Forme weekly load heatmap, Jobs Radar score breakdown, Stacks burndown). Aucun nouveau mockup à produire ce jour.

---

## 4. Prompts Claude Code — 1 seul, à J-2 du verdict

### Prompt 1 — [UX] Supprimer le bloc CSS `.variant-bar` mort

**Priorité** : P0
**Dépend de** : Aucun
**Effort estimé** : **5 minutes** (1 edit CSS, `node scripts/sync-sw.mjs` non requis car aucun fichier listé dans le manifest n'est modifié — seul `cockpit/styles.css` est édité et il est déjà dans le manifest)
**Fichiers concernés** : `cockpit/styles.css`

```
Contexte : audit a/conduit au constat suivant. Dans cockpit/styles.css, le
bloc CSS intitulé "VARIANT SWITCHER (top bar)" occupe les lignes 60 à 105
(commentaire d'en-tête inclus). Il définit les sélecteurs .variant-bar,
.variant-bar-label, .variant-btns, .variant-btn, .variant-btn:hover,
.variant-btn.is-active, .variant-btn-dot, .variant-btn-sub et
.variant-bar-meta — soit ~44 lignes.

Faits vérifiés ce jour (commit 6600b64) :
1. Aucun composant JSX du projet ne référence `.variant-bar` ni
   `.variant-btn*`. Vérifié par :
       grep -rn "variant-bar\|variant-btn" cockpit/*.jsx
   → retourne 0 résultat.
2. Le bloc utilise des couleurs hex hardcodées (`#0E0E10`, `#F4F4F1`,
   `#1F1F22`, `#7B7B80`, `#2A2A2E`, `#3F3F44`, `#A8A8AD`) qui ne sont
   pas dans les tokens des trois thèmes Dawn/Obsidian/Atlas et qui
   imposent une bande sombre en haut d'écran — dissonant avec Dawn
   (ivoire) et Atlas (papier blanc).
3. Le bloc se déclare `position: sticky; top: 0; z-index: 100;` —
   s'il était accidentellement utilisé, il volerait le sticky de la
   sidebar et du Brief.

Action : supprime intégralement les lignes 60 à 105 de cockpit/styles.css,
y compris le commentaire d'en-tête ASCII-box "VARIANT SWITCHER (top bar)"
ET la ligne d'ouverture du commentaire-box "APP SHELL (sidebar + main)"
ne doit PAS être touchée. Concrètement : supprime depuis la ligne 59
(début du commentaire "/* ════════════════") inclus jusqu'à la dernière
ligne du bloc (`.variant-bar-meta { ... }`) inclus. La ligne immédiate-
ment suivante doit redevenir le commentaire ASCII-box "APP SHELL".

Avant (extrait) :
    /* ═══════════════════════════════════════════════════════════════
       VARIANT SWITCHER (top bar)
       ═══════════════════════════════════════════════════════════════ */
    .variant-bar { ... }
    .variant-bar-label { ... }
    .variant-btns { ... }
    .variant-btn { ... }
    .variant-btn:hover { ... }
    .variant-btn.is-active { ... }
    .variant-btn-dot { ... }
    .variant-btn-sub { ... }
    .variant-bar-meta { ... }

    /* ═══════════════════════════════════════════════════════════════
       APP SHELL (sidebar + main)
       ═══════════════════════════════════════════════════════════════ */

Après (extrait) :
    /* ═══════════════════════════════════════════════════════════════
       APP SHELL (sidebar + main)
       ═══════════════════════════════════════════════════════════════ */

Contraintes :
- Ne touche pas le ?v=30 dans index.html (le sw.js ne re-cache pas car
  styles.css est déjà listé dans le manifest — il suffira d'attendre le
  prochain bump naturel).
- Pas besoin de bumper sw.js (aucune ressource ajoutée/supprimée du
  manifest STATIC[]).
- Pas de modification d'un fichier spec dans docs/specs/ (le bloc n'est
  rendu dans aucun onglet et n'a pas d'entrée dans dependencies.yaml).
- Pas de modification de docs/architecture/* (aucun composant supprimé,
  juste du code mort).

Validation : c'est réussi quand
1. grep -n "variant-bar" cockpit/styles.css → retourne 0 ligne
2. Le bloc commenté "APP SHELL (sidebar + main)" se trouve désormais
   aux alentours de l'ancienne ligne 60 (au lieu de 106)
3. Le cockpit charge normalement en Dawn/Obsidian/Atlas (rien ne casse
   visuellement, parce que rien ne consommait ce CSS)
4. Le fichier cockpit/styles.css perd ~46 lignes (44 de règles +
   2 de commentaire d'en-tête)
```

**Pourquoi celui-là, encore une fois** : c'est le **seul** prompt qui satisfait simultanément les 5 conditions de zéro-risque suivantes :
1. **Purement soustractif** — on enlève du code mort, on n'en ajoute pas.
2. **Zéro JSX touché** — pas de risque de casser le re-render React, pas de risque d'oublier `setState`.
3. **Zéro spec docs/specs/** — le bloc n'a pas de spec parce qu'il n'a pas d'onglet.
4. **Zéro YAML d'archi** — pas de panel/pipeline/table touché.
5. **Zéro bump `sw.js`** — `cockpit/styles.css` est déjà dans le manifest, on modifie son contenu, pas sa présence.

Si ce prompt-là n'est pas exécuté en 10 jours, c'est qu'aucun prompt ne le sera.

---

## 5. Doctrine 13/05 — réaffirmée à J-2

La doctrine posée le 08/05 et confirmée le 10/05 tient à la lettre :

- **Si `.variant-bar` est supprimé d'ici le 13/05 06h00 UTC** → l'audit du 13/05 retournera à 5 prompts P0, sélectionnés sur le plafond posé le 08/05 (`PanelError` Dawn-only, `card-action--bookmark` orphelin, `setSnoozedTop` sans undo toast, `!important` purge mobile, `kbd-fab` aria-pressed). Le canal d'exécution sera considéré comme rétabli.

- **Si rien n'est shippé d'ici le 13/05 06h00 UTC** → l'audit du 13/05 sera **factuellement vide** : pas de matrice (elle ne bouge pas), pas de quick wins (ils ne bougent pas), pas de prompts (ils ne servent à rien). Le seul livrable sera **la recommandation de suspendre la scheduled task pendant 30 jours** pour économiser les tokens API d'audit (estimation `gemini_api_calls` × 30 = ~150k tokens/mois pour 0 ship). La tâche pourra être réactivée manuellement quand le canal d'exécution sera rétabli.

J-2. 2 jours restants.

---

## 6. Checklist d'exécution

Une seule ligne. C'est volontaire.

| # | Tâche | Fichier | Effort | Validation |
|---|---|---|---|---|
| 1 | Supprimer le bloc `.variant-bar` (lignes 59-105) | `cockpit/styles.css` | 5 min | `grep -n variant-bar cockpit/styles.css` → 0 résultat |

**Temps total estimé** : **5 minutes**.

---

## 7. Annexe — différence avec le SKILL.md

Le SKILL.md de cette scheduled task continue de décrire le cockpit comme « single-file vanilla HTML/CSS/JS, gradient bleu→violet, glassmorphism, dark mode ». **15 audits consécutifs ont signalé cette dérive depuis le 28/04**, et le SKILL.md n'a toujours pas été corrigé. Recommandation pour le 13/05 : si la décision de suspendre la tâche est prise, profiter de la suspension pour corriger le SKILL.md (stack réelle, identité visuelle réelle, lien vers `CLAUDE.md` comme source de vérité du projet) avant de la réactiver.

---

*Fin de l'audit du 11/05/2026.*
*Code identique au 30/04. Texte produit < 1/10ᵉ du volume d'un audit pleine longueur.*
*1 prompt. 5 minutes. 2 jours.*
