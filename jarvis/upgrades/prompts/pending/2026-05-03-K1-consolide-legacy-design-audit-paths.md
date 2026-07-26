# K1 — Consolider 2 paths legacy `docs/design-audit-2026-04-{26,27}.md`

> Audit source : [2026-05-03-audit.md](../../2026-05-03-audit.md)
> Effort estimé : XS (~15 min)
> North Star : respect du débit drainable — v25 émet 0 SHIP, 1 KILL housekeeping discret.

---

```
Contexte projet : 9 fichiers design-audit-*.md dispersés sur 5 paths
distincts dans le repo. K1-v24 (encore non exécuté en pending/) cible
le cas du root. K1-v25 cible 2 paths legacy historiques dans docs/ :
- docs/design-audit-2026-04-26.md (tracké, 1986 lignes, md5 1b84cc1d)
- docs/design-audit-2026-04-27.md (tracké, 1350 lignes, md5 a vérifier)

Le 26/04 a un cousin docs/audits/2026-04-26-design-audit.md (1406 lignes,
md5 fbbe0d96) — 2 routines différentes, mêmes date, contenus distincts.
Le 27/04 n'a aucun cousin nulle part — c'est un MOVE simple.

Phase 0 — Reconnaissance (OBLIGATOIRE avant toute action)

1. Confirmer que les 2 fichiers existent et sont trackés :
   `git ls-files docs/design-audit-2026-04-26.md docs/design-audit-2026-04-27.md`
   → 2 lignes attendues. Si une seule, STOP et rapporter.

2. Confirmer que `docs/audits/2026-04-26-design-audit.md` existe :
   `ls docs/audits/2026-04-26-design-audit.md`
   → 1 ligne attendue.

3. Comparer les 2 audits du 26/04 pour décider :
   `wc -l docs/design-audit-2026-04-26.md docs/audits/2026-04-26-design-audit.md`
   `head -20 docs/design-audit-2026-04-26.md`
   `head -20 docs/audits/2026-04-26-design-audit.md`
   Lis les 2 préambules — celui qui mentionne "tâche planifiée" ou
   "Cowork" est l'artefact de la routine canonique récente. L'autre
   est un essai manuel ou ancien.

4. Vérifier qu'aucun outil ne référence les 2 paths legacy :
   `grep -rn "docs/design-audit-2026-04-26\|docs/design-audit-2026-04-27" \
     --include="*.md" --include="*.json" --include="*.yaml" \
     --include="*.py" --include="*.js" --include="*.jsx" \
     --include="*.html" .`
   (exclure `.git/`, `.claude/worktrees/`, `.claude/skills/`)
   Si une référence externe existe (autre que les fichiers eux-mêmes
   et l'audit v25 qui les mentionne), STOP et rapporter.

5. Ne PAS toucher à K1-v24 (root design-audit-2026-05-01.md) — c'est
   son propre prompt, encore en pending/. K1-v25 est strictement
   complémentaire.

Écris un rapport ~15 lignes et ATTENDS ma validation explicite. Le
rapport doit conclure :
  (a) Pour le 26/04 : "GARDER docs/audits/ + KILL docs/design-audit-*"
      (si Phase 0.3 montre que docs/audits/ est l'artefact routine plus
      récent / plus structuré), OU "GARDER docs/design-audit-* + KILL
      docs/audits/" (si le legacy est plus complet — peu probable mais
      possible). Le verdict doit être étayé par diff de longueur, date
      git, et structure du préambule.
  (b) Pour le 27/04 : MOVE → audits/2026-04-27-design-audit.md (pas
      d'équivalent ailleurs).

Objectif : éliminer 2 paths legacy en `docs/`, consolider l'audit du
27/04 dans la convention `audits/`, conserver l'audit du 26/04 le plus
canonique.

Fichiers concernés :
- docs/design-audit-2026-04-26.md (kill ou move selon Phase 0)
- docs/design-audit-2026-04-27.md (move)
- audits/2026-04-27-design-audit.md (création par mv)

Étapes (après validation Phase 0) :

Cas (a) — docs/audits/ canonique pour 26/04 (cas attendu) :
1. `git rm docs/design-audit-2026-04-26.md`
2. `git mv docs/design-audit-2026-04-27.md audits/2026-04-27-design-audit.md`
3. `git commit -m "chore(audits): consolide paths legacy docs/ → audits/ (26/04 dédupliqué, 27/04 moved)"`

Cas (b) — docs/design-audit canonique pour 26/04 (peu probable) :
1. `git mv docs/design-audit-2026-04-26.md audits/2026-04-26-design-audit.md`
2. `git rm docs/audits/2026-04-26-design-audit.md`
3. `git mv docs/design-audit-2026-04-27.md audits/2026-04-27-design-audit.md`
4. `git commit -m "chore(audits): consolide paths legacy → audits/ (26/04 + 27/04)"`

Validation :
- `ls docs/design-audit-*.md 2>&1` → "No such file" attendu.
- `ls audits/2026-04-2[67]-design-audit.md` → 2 lignes attendues
  (28-30 déjà présents, 27 nouveau, 26 selon cas).
- `git status --porcelain` → vide après commit.
- `git log -1 --stat` → R100 sur le mv + suppression sur le rm
  (cas a), OU 2 R100 + 1 D (cas b).

Ne fais PAS :
- Ne touche pas à `design-audit-2026-05-01.md` racine (cible de K1-v24,
  toujours en pending/, non concerné par K1-v25).
- Ne touche pas à `docs/audits/2026-05-02-design-audit.md` (artefact
  d'aujourd'hui, untracked, sera commité par routine d'archivage).
- Ne touche pas à `jarvis_data/design-audits/2026-04-25-design-audit.md`
  (path historique encore plus ancien, hors scope ce KILL — sera
  traité par v26 si K1-v24 + K1-v25 prouvent le pattern global).
- Ne renomme PAS d'autres fichiers sous prétexte que tu y passes.
- Ne push pas après commit.

Affiche le résultat de `git status` AVANT le commit pour valider que
seuls le rename + suppression apparaissent.
```
