# S1 — Transition CSS sur le switch de thème (Quick Win #4 du design audit 1/05)

> Audit source : [2026-05-02-audit.md](../../2026-05-02-audit.md)
> Effort estimé : XS (~30 min)
> North Star : convertir 1 quick win du design audit du 1/05 (transition CSS thème) — fenêtre UX ouverte par backlog drainé.

---

```
Contexte projet : le switch de thème (Dawn / Obsidian / Atlas) dans
`cockpit/app.jsx:221-238` mute des CSS Custom Properties sur `:root`
sans transition CSS. Résultat : flash visuel à chaque switch — manuel
ou auto (22:00 → Obsidian, 06:00 → Dawn). Le design audit du 1/05
(`design-audit-2026-05-01.md`, Prompt 4) a déjà rédigé le fix CSS
exact, ~30 lignes additives, zéro logique JS, copy-paste depuis l'audit.

Phase 0 — Reconnaissance (OBLIGATOIRE avant toute action)

Avant de modifier quoi que ce soit, écris un rapport ~20 lignes après
ces vérifications :

1. Confirme que `cockpit/styles.css` n'a AUCUNE transition globale sur
   `:root` ou `body` pour `background-color` / `color` :
     `grep -nE "^(:root|body)\s*\{" cockpit/styles.css`
   puis lit les 10 lignes suivantes de chaque match — vérifie qu'il
   n'y a pas déjà un `transition:` qui couvre `background-color` ou
   `color` au niveau global.

2. Confirme que les transitions existantes sont scopées (Top cards,
   sidebar, etc.) et n'incluent pas de cascade `*` qui ralentirait :
     `grep -nE "^\s*\*\s*\{" cockpit/styles.css`
   → 0 match attendu (sinon STOP, l'ajout d'une nouvelle transition
   pourrait conflit).

3. Vérifie que le bloc `@media (prefers-reduced-motion: reduce)` existe
   déjà dans `cockpit/styles.css` :
     `grep -n "prefers-reduced-motion" cockpit/styles.css`
   → ≥1 match attendu (le commit `2d61267` du 30/04 a posé le
   kill-switch global). Lit le bloc pour comprendre comment il
   désactive les anims existantes — il faut respecter le même pattern.

4. Confirme la liste des selectors à transitionner en cherchant les
   classes mentionnées dans le Prompt 4 du design audit. Pour chaque
   classe ci-dessous, vérifie qu'elle est bien utilisée dans le repo :
     - `.sb` (sidebar wrapper)
     - `.top-card`
     - `.sig-card`
     - `.opp-card`
     - `.idea-card`
     - `.vl-feed-item`
     - `.hero`
     - `.block`
     - `.btn`
     - `.card-action`
     - `.kbd-panel`
     - `.tk-panel`
     - `.ph` (probably placeholder)
     - `.hwk-wrap`
   Commande : `grep -lE "\.(sb|top-card|sig-card|opp-card|idea-card|vl-feed-item|hero|block|btn|card-action|kbd-panel|tk-panel|ph|hwk-wrap)\b" cockpit/styles*.css | sort -u`
   Si une classe est inconnue, la retirer de la règle (mieux vaut
   moins de selectors qu'une règle invalide).

5. Lis les lignes ~649-729 de `design-audit-2026-05-01.md` (Prompt 4)
   pour avoir le texte exact à coller.

Écris un rapport et ATTENDS ma validation explicite. Le rapport doit
confirmer 1 des 2 verdicts :
  (a) "Aucune transition globale conflictuelle, kill-switch reduced-motion
      en place, classes mentionnées toutes valides → fix go."
  (b) "Conflit identifié sur [liste] → adapter le scope avant d'appliquer."

Objectif : adoucir la transition de thème sans pénaliser les autres
animations.

Fichiers concernés :
- cockpit/styles.css (modification, ajout ~30 lignes en début de fichier)

Étapes (après validation Phase 0) :
1. Insérer en début de `cockpit/styles.css` (juste après le reset CSS,
   avant les blocs spécifiques — vers ligne 30-50, à un endroit cohérent
   avec les conventions du fichier) :

   /* Smooth theme transitions — adoucit le switch Dawn/Obsidian/Atlas
      (manuel ou auto 22h/06h). Respecte prefers-reduced-motion via le
      bloc dédié plus bas dans le fichier. */
   :root {
     transition:
       background-color 280ms ease,
       color 280ms ease;
   }
   body {
     transition:
       background-color 280ms ease,
       color 280ms ease;
   }
   .sb,
   .top-card,
   .sig-card,
   .opp-card,
   .idea-card,
   .vl-feed-item,
   .hero,
   .block,
   .btn,
   .card-action,
   .kbd-panel,
   .tk-panel,
   .ph,
   .hwk-wrap {
     transition:
       background-color 280ms ease,
       border-color 280ms ease,
       color 280ms ease;
   }

2. Étendre le bloc existant `@media (prefers-reduced-motion: reduce)` —
   trouver son emplacement (Phase 0 grep) et ajouter à l'intérieur :

   :root, body, .sb, .top-card, .sig-card, .opp-card, .idea-card,
   .vl-feed-item, .hero, .block, .btn, .card-action, .kbd-panel,
   .tk-panel, .ph, .hwk-wrap {
     transition: none;
   }

   Ne PAS écraser la règle existante (qui couvre kicker-dot, sb-group-hotdot,
   etc.). Ajouter une règle sœur dans le même @media.

3. Aucune autre modification.

Contraintes :
- 280ms = sweet spot perceptible/rapide. Ne pas dévier.
- Pas de `transition: all` (pénaliserait les hover transforms et anims
  scroll existants — les transitions ciblées par propriété sont la règle).
- Pas de cascade `*`.
- Le fichier `cockpit/styles.css` étant 4666 lignes, place les nouvelles
  règles dans une section logique avec un commentaire `/* === Theme
  transitions === */` en début, pour faciliter la relecture future.
- Pas de modification de `cockpit/app.jsx`, ni `themes.js`, ni autres
  CSS.

Validation (lance ces commandes après modification) :
- `grep -c "background-color 280ms" cockpit/styles.css` → ≥ 2 (root +
  body + selectors block).
- `grep -nB2 -A1 "transition: none;" cockpit/styles.css | head -20` →
  vérifier que la nouvelle règle reduced-motion ne casse pas l'existante.
- Demander à Jean : ouvrir le cockpit, cliquer Dawn → Obsidian → Atlas
  dans la sidebar — transition perceptible mais douce, pas de flash.
- Tester avec DevTools `Rendering > Emulate prefers-reduced-motion: reduce`
  → switch instantané, pas de transition.

Ne fais PAS :
- Ne touche pas à `cockpit/app.jsx` (la logique de switch reste identique,
  seul le CSS amortit le résultat).
- N'ajoute pas la rampe progressive 21h45 → 22h15 mentionnée en bonus
  dans le Prompt 4 du design audit — c'est explicitement hors scope ce
  SHIP, à PARK si Jean veut le pousser plus loin.
- Ne refacto pas les transitions existantes (lignes 45, 88, 112, 134,
  etc.) sous prétexte que tu y passes.
- Ne push pas après commit.

Quand c'est fait : montre le diff complet AVANT git add. git commit avec
message `feat(cockpit): transition CSS sur switch de thème (design-audit-2026-05-01 #4)`.
PAS de push.
```
