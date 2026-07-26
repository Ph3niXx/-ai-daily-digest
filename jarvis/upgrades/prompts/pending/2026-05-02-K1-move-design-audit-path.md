# K1 — Déplacer `design-audit-2026-05-01.md` (root) → `audits/2026-05-01-design-audit.md`

> Audit source : [2026-05-02-audit.md](../../2026-05-02-audit.md)
> Effort estimé : XS (~5 min)
> North Star : convertir 1 quick win du design audit du 1/05 — convention path.

---

```
Phase 0 (3 commandes lit-only) :

1. Confirmer le fichier à déplacer existe et est tracké :
   `git ls-files design-audit-2026-05-01.md` → 1 ligne attendue.
   `wc -l design-audit-2026-05-01.md` → ~1700-1800 lignes attendues
   (fichier de 83 KB).

2. Confirmer la convention des 3 audits précédents :
   `ls audits/2026-04-2[89]-design-audit.md audits/2026-04-30-design-audit.md`
   → 3 lignes attendues, format `audits/YYYY-MM-DD-design-audit.md`.

3. Vérifier qu'aucun fichier ou outil ne référence le path racine :
   `grep -rn "design-audit-2026-05-01" --include="*.md" --include="*.yaml" --include="*.json" --include="*.py" --include="*.js" --include="*.jsx" --include="*.html" .`
   (exclure `.claude/worktrees/`, `.git/`)
   → 0 résultat attendu hors le fichier lui-même et hors `jarvis/upgrades/2026-05-02-audit.md` (cet audit, qui le référence intentionnellement). Si une référence externe existe (autre que cet audit), STOP et rapporter — le mv casserait un lien.

Si tout est OK :

4. `git mv design-audit-2026-05-01.md audits/2026-05-01-design-audit.md`

5. `git commit -m "chore(audits): move design-audit-2026-05-01.md → audits/ (convention path)"`

Validation :
- `ls audits/2026-05-01-design-audit.md` → fichier présent.
- `ls design-audit-2026-05-01.md 2>&1` → "No such file" attendu.
- `git log -1 --stat` → 1 fichier renommé (R100), 0 modification de contenu.
- `git status --porcelain` → vide.

Ne fais PAS :
- Ne supprime pas le fichier (utilise git mv, pas rm + git add).
- Ne modifie pas le contenu (R100 = 100 % similaire = rename pur).
- Ne touche pas aux autres audits (28/04, 29/04, 30/04 déjà bien placés).
- Ne push pas.

Affiche le résultat de `git status` AVANT le commit pour valider que
seul le rename apparaît (pas de modifications de contenu non voulues).
```
