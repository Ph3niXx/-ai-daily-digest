# Anomalie miroir — 2026-08-20

Détectée par le Miroir du Soir en construisant `daily_mirror` du 2026-08-20.

## Le fait

Le pipeline de veille quotidien (`.github/workflows/daily_digest.yml`, « AI Cockpit
Pipeline ») échoue trois matins d'affilée :

| Date | Run | Conclusion |
|---|---|---|
| 2026-08-17 06:55 | [32003565230](https://github.com/Ph3niXx/jarvis-cockpit/actions/runs/32003565230) | success |
| 2026-08-18 06:42 | [32108051592](https://github.com/Ph3niXx/jarvis-cockpit/actions/runs/32108051592) | **failure** |
| 2026-08-19 06:42 | [32224550862](https://github.com/Ph3niXx/jarvis-cockpit/actions/runs/32224550862) | **failure** |
| 2026-08-20 06:45 | [32340902421](https://github.com/Ph3niXx/jarvis-cockpit/actions/runs/32340902421) | **failure** |

Conséquence en base : dernier `daily_briefs` au **2026-08-17**, dernier `articles.fetch_date`
au **2026-08-17**. Trois jours sans brief du matin, sans nouveaux articles, donc sans
concepts ni signaux faibles.

## La cause

Le run meurt au step 2/9, avant la sauvegarde :

```
   → 56 articles RSS récupérés
   → 17/43 flux muets : claude/Anthropic News, updates/Mistral AI Blog, llm/Meta AI Blog,
     llm/Import AI, llm/The Batch, agents/LangChain Blog, agents/LlamaIndex Blog,
     tools/Langfuse Blog, tools/Qdrant Blog, tools/Weaviate Blog, tools/MLflow Blog,
     tools/Weights & Biases, energy/IEEE Smart Grid, energy/Energy Central AI,
     energy/GreenTech Media, energy/RTE France Actu, energy/ENTSO-E News
##[error]Process completed with exit code 1.
```

`main.py:118` fixe `MAX_DEAD_FEEDS = 16`, cliquet posé le 2026-08-17 par le commit
`7febadd` (« un run qui ne produit rien echoue, et l'alerte sort du cockpit »). Le
commentaire `main.py:111-117` énumère les 16 morts connus : les 5 `energy`, 5 `tools`,
plus Anthropic News, Mistral, Meta AI, The Batch, LlamaIndex et LangChain.

Le 17ᵉ de la liste du run — **`llm/Import AI`, HTTP 403** — ne figure pas dans cette
énumération. C'est donc bien une mort **nouvelle**, survenue entre le run du 17/08
(06:55, vert) et celui du 18/08.

Le garde-fou a fonctionné comme prévu : il a détecté la mort nouvelle et arrêté le run.
Ce qui a manqué, c'est que personne ne l'a vu pendant trois jours — l'échec n'est visible
que dans l'onglet Actions.

## Le geste

Trois options, à arbitrer :

1. **Réparer** `Import AI` — trouver l'URL de flux qui ne renvoie plus 403 (User-Agent ?
   changement d'hébergeur ?) et la corriger dans `RSS_FEEDS`. `MAX_DEAD_FEEDS` reste à 16.
2. **Retirer** `Import AI` de `RSS_FEEDS`. `MAX_DEAD_FEEDS` reste à 16, le cliquet ne
   remonte pas.
3. **Monter le cliquet à 17** si le flux est conservé en espérant qu'il revienne — c'est
   l'option que le commentaire `main.py:116-117` déconseille explicitement (« c'est un
   cliquet, il ne doit jamais remonter »).

## Le signal réflexif

Le 2026-08-20, Jean a ouvert l'onglet **Brief** trois fois (11h04, 12h41, 18h16) — vide
les trois fois — et a poussé 22 commits, tous sur le nouvel onglet **Santé des
pipelines**. L'outil qui doit rendre ce genre de panne visible a été construit le jour
même où la panne courait, sans la voir.

Piste : brancher `pipeline_health` sur la conclusion des derniers runs GitHub Actions,
pas seulement sur la fraîcheur des données en base — ici les deux convergent, mais un
run vert qui n'écrit rien et un run rouge ne se distinguent pas encore.
