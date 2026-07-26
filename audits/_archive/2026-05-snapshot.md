# Snapshot mai 2026 — Matrice + Roadmap gelées

**Archivé le** : 2026-05-13 (verdict 13/05)
**HEAD figé depuis** : `6600b64de0e974346f0358ce266363aa54371f50` (2026-05-01 10:35 +0200)
**Durée du gel** : 12 jours au moment de l'archivage
**Contexte** : déclenchement de la doctrine 13/05 — suspension de la routine `design-audit--upgrade-prompt` pour 30 jours.

Ce fichier compile la matrice scorée, les Top 10 Quick Wins, la roadmap Jarvis 15 features et les 3 mockups textuels dans l'état où ils étaient au 12/05 (dernier audit avant verdict). Source primaire : `audits/2026-05-08-design-audit.md` (référence stable des 8 derniers audits), recoupée avec `audits/2026-05-12-design-audit.md` pour la matrice. Rien de neuf ici — c'est une photographie pour relecture éventuelle au moment de la réactivation.

---

## 1. Matrice scorée (gelée au 30/04)

Identique sur 11 audits consécutifs (30/04 → 12/05). Moyenne cockpit : **4.02 / 5**.

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
| Sport / Gaming-news / Anime / News | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** |
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
| Gaming (perso + TFT) | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |
| Stacks & Limits | 4 | 4 | 4 | 4 | 3 | 4 | 3 | **3.7** |
| Historique | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **4.1** |

**Top 3 forces** (inchangées sur 14 jours) :
1. Profil : densité maîtrisée, écriture éditoriale, taux d'usage le plus haut du cockpit.
2. Brief du jour : hierarchy claire, scan path < 3 sec, rétention quotidienne avérée.
3. Jarvis : la conversation est le bon canal pour l'usage personnel.

**Top 3 faiblesses** (inchangées sur 14 jours) :
1. Jarvis Lab : cohérence design fragile (palette `--jl-*` qui dérive ailleurs), Mobile et A11y en retrait.
2. Stacks & Limits : densité info élevée mais rétention faible (peu de raison de revenir).
3. Sport / Gaming-news / Anime / News : 4 onglets RSS quasi identiques, peu de différenciation visuelle, rétention 3/5.

**Top finding système** (inchangé depuis 03/05) :
La moyenne 4.02/5 est artificiellement stable parce que le code l'est. Les scores réels devraient être lus comme « état au 30/04 ». La routine d'audit n'a pas la capacité de pénaliser un cockpit qui ne bouge pas — c'est précisément ce que le verdict 13/05 résout structurellement.

---

## 2. Top 10 Quick Wins (gelés — non livrés)

Compilation depuis `audits/2026-05-08-design-audit.md` § 3.

| # | Titre | Impact | Effort | I/E | Statut au 13/05 |
|:-:|---|:-:|:-:|:-:|:-:|
| 1 | Persister le bookmark + état visuel actif | 4 | 1 | 4.0 | non livré (6e audit consécutif) |
| 2 | Toast undo sur snooze (Top + Veille) | 3 | 1 | 3.0 | non livré |
| 3 | Couper la pulse `.kicker-dot` après 7 j | 3 | 1 | 3.0 | non livré (cap 3 cycles ≠ retrait) |
| 4 | Skeletons spécifiques (Top + Signaux + Radar) | 4 | 2 | 2.0 | non livré |
| 5 | Étendre le mode delta hero à 7 j | 4 | 2 | 2.0 | non livré |
| 6 | Tokeniser `PanelError` (hex Dawn-only en dur) | 2 | 1 | 2.0 | non livré |
| 7 | Mémoire de scroll par panel | 4 | 2 | 2.0 | non livré |
| 8 | Touch targets 32 → 44 px desktop | 3 | 1 | 3.0 | non livré |
| 9 | Supprimer `.variant-bar` (dead code ~8 % styles.css) | 2 | 1 | 2.0 | **non livré après 4 itérations consécutives** — prompt micro-atomique de référence |
| 10 | Retirer `translateY(-2px)` du hover Top cards | 3 | 1 | 3.0 | non livré |

**Cumul effort estimé** : ~4 h 45 (chiffré dans le 05/07). **Cumul effort livré sur 13 jours** : 0 minute.

**Prompt complet `.variant-bar`** (reproductible tel quel, le plus petit de la liste) :

```
Ouvre cockpit/styles.css. Repère le bloc qui commence à la ligne 62
par ".variant-bar {" et qui se termine à la dernière règle CSS dont
le sélecteur commence par ".variant-bar" (vers la ligne 103, autour
de ".variant-bar-meta").

Vérifie d'abord que ce composant n'est monté nulle part :

  grep -rn "variant-bar" cockpit/ --include="*.jsx"
  # doit retourner 0 résultat

Si 0 résultat (attendu), supprime intégralement le bloc CSS du
sélecteur ".variant-bar" jusqu'à ".variant-bar-meta" inclus, ainsi
que toute règle CSS qui contient "variant-bar" (cherche aussi sous
des sélecteurs imbriqués @media). Compte les lignes supprimées.

Vérifications :
1. grep -n "variant-bar" cockpit/styles.css → 0 résultat
2. Ouvrir l'app dans le thème Dawn → identique
3. Switcher Obsidian → identique
4. Switcher Atlas → identique

Si tout est OK, commit avec :
  git add cockpit/styles.css
  git commit -m "chore(cockpit): supprime .variant-bar dead code (-X lignes)"
```

Les 9 autres prompts détaillés sont dans `audits/2026-05-08-design-audit.md` (par référence à `audits/2026-05-07-design-audit.md` qui n'existe plus dans le dossier — le contenu vit néanmoins dans l'historique git).

---

## 3. Roadmap Jarvis — 15 features (gelée)

Référencée par les 6 derniers audits sans modification. Top 5 features par composite (Impact × Faisabilité) :

| Rang | Code | Titre | Impact | Faisa. | Wow | Composite |
|:-:|:-:|---|:-:|:-:|:-:|:-:|
| 1 | F1 | Briefing vocal matinal (TTS local sur le brief du jour) | 5 | 4 | 5 | 20 |
| 2 | F2 | Pipeline "Action requise" : extraction automatique des TODO de la veille → carnet d'idées | 5 | 4 | 4 | 20 |
| 3 | F5 | Navigation clavier `j`/`k` cross-panel + raccourci `?` pour cheatsheet | 4 | 5 | 4 | 20 |
| 4 | F11 | Mode "lecture longue" : panneau immersif plein écran pour la Revue | 4 | 5 | 4 | 20 |
| 5 | F12 | Bouton "transformer ce signal en idée" sur chaque signal faible | 5 | 4 | 5 | 20 |

Les 10 features restantes (F3, F4, F6–F10, F13–F15) sont dans `audits/2026-05-08-design-audit.md` § 3 par référence. Aucune n'a été touchée depuis le 07/05.

---

## 4. Mockups textuels (3, gelés)

Reproduction des 3 mockups de référence (compilés depuis le 05/07 cité par les audits 08/05 → 12/05). Format simplifié, contenu inchangé.

### Mockup A — F4 « Inline summary card » sur Veille

```
┌────────────────────────────────────────────────────────────┐
│ ▸ Anthropic publie Claude Opus 4.7                  [↗] [⌥] │
│   Anthropic · il y a 2 h · #updates · #claude               │
│                                                              │
│   ▾ Résumé (Gemini, 280 car.)                                │
│   Nouvelle version d'Opus avec amélioration de la fenêtre   │
│   de contexte (1 M tokens), prix divisé par 2, latence -30%.│
│   Cible : workflows agentic longs. Disponible Bedrock + API.│
│                                                              │
│   [→ Carnet d'idées]   [📌 Garder]   [⌐ Marquer lu]          │
└────────────────────────────────────────────────────────────┘
```

Bénéfice attendu : suppression du clic « ouvrir l'article » dans 60 % des cas, lecture plus rapide, scan path linéaire.

### Mockup B — F5 « Navigation clavier `j`/`k` + cheatsheet `?` »

```
┌─────────────────────────────────────────────────────┐
│ Raccourcis clavier                          [✕]      │
├─────────────────────────────────────────────────────┤
│ j / k     ↓ / ↑ entre articles                       │
│ o         Ouvrir l'article courant                   │
│ s         Snooze l'article courant                   │
│ i         Envoyer au carnet d'idées                  │
│ b         Garder (bookmark)                          │
│ /         Focus la barre de recherche                │
│ g h       Aller à Home                               │
│ g r       Aller à Revue                              │
│ g w       Aller à Wiki                               │
│ ?         Cette aide                                 │
│ ⌘ k       Command palette                            │
└─────────────────────────────────────────────────────┘
```

Bénéfice : transforme la Revue en outil de lecture power-user, suppression de la souris sur le scan quotidien.

### Mockup C — F12 « Signal → Idée »

```
┌──────────────────────────────────────────────────────┐
│ ▲ rising                                              │
│ MCP Servers (12 mentions cette semaine)               │
│ ────────────────────────────────────────────          │
│ Premier emerging concept détecté la sem. dernière,   │
│ aujourd'hui présent dans 12 articles dont 3 Claude.   │
│                                                        │
│ Sources récentes :                                    │
│ • Anthropic — MCP Server Spec v2                      │
│ • Cursor — MCP integration shipped                    │
│ • Block — Building MCP servers in Go                  │
│                                                        │
│ [📖 Voir Wiki]   [💡 Transformer en idée]              │
└──────────────────────────────────────────────────────┘
```

Bénéfice : ferme la boucle « j'apprends quelque chose en veille » → « j'en fais un usage perso/pro », alimente le carnet d'idées sans saisie manuelle.

---

## 5. Prochaine reprise — Critères suggérés

Quand Jean réactivera la routine, un audit de reprise devrait :

1. **Vérifier d'abord HEAD vs `6600b64`.** Si le repo est toujours figé : la suspension n'a pas servi de signal — repousser de 60 jours et l'auteur de la doctrine en tirera les conclusions.
2. **Recalibrer la matrice.** Les scores ci-dessus sont datés du 30/04. Tout audit de reprise doit re-scorer fraîchement, pas hériter de cette ligne de base.
3. **Mettre à jour le SKILL.md de la tâche planifiée.** La description « single-file vanilla HTML/CSS/JS, gradient bleu→violet, glassmorphism » est obsolète depuis le 28/04 et a été signalée 8 fois sans correction. La corriger avant tout nouvel audit évitera la 9e mention.
4. **Réduire le plafond initial à 1 prompt.** Re-établir le canal d'exécution avant de réinstaller un backlog de 10 prompts à instruction.

---

## Origine de l'archive

Créé par : `audits/2026-05-13-design-audit.md` § Recommandation cardinale § Snapshot archivé.
Méthode : compilation `audits/2026-05-08-design-audit.md` (Quick Wins + roadmap par référence) + `audits/2026-05-12-design-audit.md` (matrice § 2). Aucun re-scoring effectué — fidélité à l'état figé du 30/04.
