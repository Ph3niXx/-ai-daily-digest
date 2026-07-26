# S2 â€” Coupler la gÃ©nÃ©ration de `signals.md` au dÃ©marrage Jarvis (`run_nightly_after_deps.bat`)

> Audit source : [2026-04-27-audit.md](../../2026-04-27-audit.md)
> Effort estimÃ© : XS (~30-45 min)
> North Star : (a) plus aucun timeout LM Studio Ã  3 attempts Ã— 1114s, (b) signals.md gÃ©nÃ©rÃ© chaque matin sans dÃ©pendre d'une tÃ¢che planifiÃ©e Windows fragile

---

```
Contexte projet : signals.md du 25/04, 26/04, 27/04 manquent (3 jours
consÃ©cutifs). Aucun .bat ni .yml dans le repo ne lance jarvis/scripts/
extract_signals.py. CLAUDE.md mentionne Â« tÃ¢che planifiÃ©e Windows Ã  05h30 UTC Â»
mais elle est invisible dans le repo donc soit jamais configurÃ©e soit cassÃ©e.
La cible : coupler la gÃ©nÃ©ration de signals.md Ã  start_jarvis.bat (action
quotidienne fiable de Jean) plutÃ´t que dÃ©pendre de Task Scheduler.

Phase 0 â€” Reconnaissance (OBLIGATOIRE avant toute action)

1. Lis jarvis/run_nightly_after_deps.bat EN ENTIER (~20 lignes).
2. Lis jarvis/start_jarvis.bat L40-95 (la chaÃ®ne d'orchestration : indexer â†’
   status â†’ nightly â†’ tunnel â†’ server).
3. Lis jarvis/scripts/extract_signals.py L1-80 (vÃ©rifie : entrÃ©e standalone
   `if __name__ == "__main__"`, sortie dans `jarvis/intel/YYYY-MM-DD-signals.md`,
   pas d'env var critique au-delÃ  de SUPABASE_URL / SUPABASE_KEY dÃ©jÃ 
   exportÃ©es par start_jarvis.bat, pas de dÃ©pendance pgvector cÃ´tÃ© Ã©criture).
4. ls jarvis/intel/ | grep signals | tail -5 â†’ confirme : derniers signals
   datÃ©s 23/04 et 25/04.
5. grep -rn "extract_signals" .github/workflows/ jarvis/ | head â€” vÃ©rifier
   qu'aucune autre orchestration ne le lance dÃ©jÃ  (sinon double-run Ã  Ã©viter).
6. Identifie 1 dÃ©cision design :
   - Lancer extract_signals AVANT ou APRÃˆS nightly_learner ?
     â†’ RecommandÃ© : APRÃˆS, car nightly_learner peut produire des `usage_events`
       indirects via les traces (limite : peu probable). Plus simple : le
       lancer en parallÃ¨le de daily_brief en fin de chain (run_nightly_after_deps).

Ã‰cris un rapport ~15 lignes :
- Diff prÃ©vu sur run_nightly_after_deps.bat (ajout de 3 lignes : echo + run +
  echo).
- Liste les 8 sections existantes que extract_signals.py va lire dans
  Supabase (articles, ...) â€” confirme via le code qu'elles sont dÃ©jÃ  accessibles
  avec les env vars actuelles.
- DÃ©cision design + justification (avant/aprÃ¨s nightly).
- Note CLAUDE.md Ã  mettre Ã  jour (section Â« Calendrier Â» du Weekly Pipeline) â€”
  passer de Â« 05h30 / Ã‰tape 1 / Python / tÃ¢che planifiÃ©e Â» Ã  Â« au dÃ©marrage
  start_jarvis.bat / via run_nightly_after_deps.bat Â».

ATTENDS validation explicite.

Objectif : Garantir qu'Ã  chaque dÃ©marrage de Jarvis, signals.md du jour est
gÃ©nÃ©rÃ© (ou re-gÃ©nÃ©rÃ© si dÃ©jÃ  lÃ ).

Fichiers concernÃ©s :
- jarvis/run_nightly_after_deps.bat (modification â€” ajout d'un bloc).
- CLAUDE.md (section Â« Calendrier Â» du Weekly Pipeline + section Â« Lancement
  manuel Â» â€” alignement doc/code).
- jarvis_data/.gitignore ou jarvis_data/README.md si nÃ©cessaire pour
  documenter `last_extract_signals.log` (probablement dÃ©jÃ  couvert par le
  gitignore global de jarvis_data/).

Ã‰tapes (aprÃ¨s validation) :

1. Modifier jarvis/run_nightly_after_deps.bat pour ajouter, aprÃ¨s le bloc
   activity_brief :
   ```bat
   echo [%date% %time%] Extraction signaux internes demarre...
   python jarvis\scripts\extract_signals.py > jarvis_data\last_extract_signals.log 2>&1
   echo [%date% %time%] Extraction signaux terminee (code=%errorlevel%)
   ```

2. Mettre Ã  jour CLAUDE.md :
   - Section Â« Weekly Pipeline / Calendrier Â» : remplacer la ligne
     Â« 05h30 / 1 / Python / ... / signals.md Â» par
     Â« Au dÃ©marrage Jarvis / 1 / Python via run_nightly_after_deps.bat / ... /
       signals.md Â».
   - Section Â« Lancement manuel Â» : complÃ©ter avec
     `python jarvis/scripts/extract_signals.py` (dÃ©jÃ  mentionnÃ© OK,
     vÃ©rifier que c'est cohÃ©rent).
   - Section Â« Marges et fail-safe Â» : la marge 30 min entre Ã©tape 1 et 2
     n'a plus de sens (on quitte le mode sÃ©quentiel par cron) â€” soit la
     supprimer, soit la reformuler pour la pipeline Cowork (Ã©tapes 2+3
     restent sur Task Scheduler).
   - Note de transition : prÃ©ciser qu'Ã©tapes 2 et 3 (Cowork audit + veille)
     restent sur Task Scheduler / Cowork interne ET dÃ©pendent de la
     fraÃ®cheur de signals.md du jour (donc de start_jarvis.bat ayant tournÃ©).

Contraintes :
- Ne crÃ©e PAS de nouveau .bat sÃ©parÃ© â€” rÃ©utilise run_nightly_after_deps.bat
  pour ne pas multiplier les points d'ancrage.
- Ne lance PAS extract_signals.py dans la boucle wait_loop â€” c'est un appel
  ponctuel aprÃ¨s nightly + brief.
- Ne touche PAS Ã  start_jarvis.bat (le wrapper fait dÃ©jÃ 
  start /B "" jarvis\run_nightly_after_deps.bat â€” la modif est invisible
  cÃ´tÃ© start).
- Ne configure PAS de Task Scheduler depuis le code Claude â€” Jean l'a dÃ©jÃ 
  ou pas, ce SHIP rend l'orchestration Task Scheduler optionnelle.
- N'utilise PAS d'argument CLI Ã  extract_signals.py â€” il consomme TODAY
  via datetime.now(), c'est volontaire.

Validation :
- python -m py_compile jarvis/scripts/extract_signals.py â†’ exit 0 (sanity).
- python jarvis/scripts/extract_signals.py â€” run direct local Windows
  (cd C:\Users\johnb\projects\jarvis-cockpit, env vars exportÃ©es) â†’ produit
  jarvis/intel/2026-04-27-signals.md en < 10s.
- ls -la jarvis/intel/2026-04-27-signals.md â†’ fichier existe + taille > 0.
- Au prochain start_jarvis.bat : tail -5 jarvis_data/last_extract_signals.log
  â†’ message Â« Extraction signaux terminee (code=0) Â».
- Au prochain start_jarvis.bat : ls jarvis/intel/ | grep $(date +%Y-%m-%d)
  â†’ fichier signals du jour prÃ©sent.

Ne fais PAS :
- N'ajoute pas de timeout explicite au run extract_signals.py â€” il finit en 3s
  d'habitude.
- N'ajoute pas de retry automatique en cas d'Ã©chec â€” un Ã©chec doit Ãªtre visible
  dans last_extract_signals.log pour diagnostic ultÃ©rieur.
- Ne lance pas extract_signals au PREMIER plan (sans `start /B`) â€” sinon
  Jean attend pour rien.
- Ne push pas.

Quand c'est fait : montre-moi le diff complet de run_nightly_after_deps.bat +
le diff CLAUDE.md AVANT git add. Lance manuellement extract_signals.py une fois
(commande indiquÃ©e ci-dessus) + montre le contenu du signals.md gÃ©nÃ©rÃ© (head -30).
git commit avec message "feat(jarvis): coupler signals.md au dÃ©marrage Jarvis
(supprime dÃ©pendance Task Scheduler fragile)".
PAS de push.
```
