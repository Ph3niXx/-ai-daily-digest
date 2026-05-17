# symphony-jarvis

Configuration **Symphony** pour le projet `jarvis-cockpit`. Le moteur d'orchestration vit dans le package séparé [`symphony-core`](file:///C:/Users/johnb/projects/symphony-core) (réutilisable par d'autres projets). Ce dossier ne contient que la **config** et les **prompts** spécifiques à jarvis-cockpit.

## Layout

```
symphony/
├── package.json          # dépend de symphony-core#v1.0.0
├── .env                  # secrets + LINEAR_PROJECT_SLUG=jarvis (à créer depuis .env.example)
├── .env.example          # template, commité
├── mcp.json              # MCP servers exposés à l'agent (linear-server)
├── WORKFLOW.md           # prompt template + states Linear pour jarvis-cockpit
├── SCOPING.md            # prompt PO-agent (Scoping)
└── LINEAR_MCP_GUIDE.md   # guide MCP Linear lu par l'agent au besoin
```

## Premier lancement

```powershell
cd C:\Users\johnb\projects\jarvis-cockpit\symphony
copy .env.example .env
# édite .env pour renseigner LINEAR_API_KEY
npm install                # clone symphony-core + build dist/ via le prepare script
npm start                  # = "symphony"
```

Dashboard : http://localhost:3002 (port distinct de program-board et atlas).

## Prérequis Linear

Le projet Linear doit avoir le slug `jarvis` et exposer ces states (cf. `WORKFLOW.md::states`) :

`Todo` · `Scoping` · `Scoped` · `Backlog` · `Running` · `Human Review` · `Rework` · `Merging` · `Done`

Crée-les dans Linear si certains manquent — Symphony ne les crée pas pour toi.

## Ajouter le MCP Supabase à l'agent (optionnel)

Si tu veux que l'agent dev ait un accès direct à Supabase (lire schéma, appliquer migration, exécuter SQL) plutôt que de tout faire via `psql`/`supabase-cli`, ajoute dans `mcp.json` :

```jsonc
{
  "mcpServers": {
    "linear-server": { "type": "http", "url": "https://mcp.linear.app/mcp" },
    "supabase": { "type": "http", "url": "<URL du MCP Supabase officiel>" }
  }
}
```

URL et auth à vérifier sur la doc Supabase MCP côté Claude (cf. `claude.ai → Connectors → Supabase`). Par défaut on ne l'ajoute pas — Symphony reste minimaliste.

## Mettre à jour le moteur (symphony-core)

```powershell
# Dans ce dossier, change le tag dans package.json :
#   "symphony-core": "git+file://C:/Users/johnb/projects/symphony-core#v1.1.0"
npm install
```

Cf. `C:/Users/johnb/projects/symphony-core/CHANGELOG.md` pour les changements entre versions.

## Faire évoluer le comportement

| Tu veux changer… | Tu édites… |
|---|---|
| Un prompt (dev ou PO) | `WORKFLOW.md` / `SCOPING.md` |
| Les rappels de fin de continuation (specs, archi, sw.js, CI) | `WORKFLOW.md` frontmatter → `prompts.continuation_extra` |
| Un seuil (parallèle, max_turns) | `.env` ou frontmatter de `WORKFLOW.md` |
| Le moteur lui-même | Tu vas dans `C:/Users/johnb/projects/symphony-core` |
