# Veille écosystème Claude — 2026-06-15

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées existantes en base | 441 |
| Entrées vues / confirmées actives ce run | 60 |
| Entrées vraiment nouvelles (ajoutées) | 0 |
| Entrées mises à jour (slug existant) | 60 |
| Entrées archivées | 0 |
| Catalogue total après run | 441 (actif: 441, archivé: 0) |

Cap fixé à 60 outils par run respecté. Aucun item au-delà du seuil de 90 jours sans revoir — l'entrée la plus ancienne du catalogue date du 2026-05-01, soit ~45 jours, donc aucune archivage déclenché.

## Contexte du run

Run de catalogue, pas de veille brute. La base contient déjà 441 entrées issues des runs précédents (couverture déjà très large : SDKs officiels, IDEs, frameworks, ~250 MCP servers, ~80 awesome-lists et marketplaces, plugins Cowork, specs). Ce run se concentre sur :

1. Confirmation d'activité des **entrées canoniques** (Anthropic, MCP officiel, IDE flagship, frameworks majeurs) via web search.
2. Refresh `last_seen` sur les 60 entrées les plus structurantes, descriptions rafraîchies avec les annonces de mai/juin 2026 (Fable 5, Mythos 5, Dreaming/Outcomes, Cowork plugins finance, nested sub-agents).
3. Aucune entrée brand-new : la recherche n'a pas surfacé d'outils suffisamment notables et stables pour mériter une slot dans le cap de 60. Les annonces récentes (Fable 5, Mythos 5, Project Glasswing) sont des **modèles** ou **événements**, pas des outils qui se pluggent à Claude au sens du catalogue.

## Faits saillants juin 2026 (intégrés aux descriptions)

- **Claude Fable 5 et Mythos 5** (9 juin 2026) — nouveau tier Mythos-class au-dessus d'Opus. Fable 5 GA via API, Bedrock, Vertex AI, MS Foundry. Mythos 5 limité à Project Glasswing. Impacte `anthropic-sdk-*`, `claude-agent-sdk-*`, `claude-platform-aws`.
- **Code with Claude 2026** (mai 2026) — Anthropic ship Dreaming, Outcomes, Multi-agent orchestration, Claude Finance (10 agents), Add-ins MS 365. Reflété dans `claude-managed-agents*`, `claude-finance-agents`, `claude-for-{excel,word,powerpoint,outlook}`.
- **Nested sub-agents** (v2.1.172, 10 juin 2026) — Claude Code CLI supporte la nidification d'agents sur 5 niveaux. Reflété dans `claude-code-cli`.
- **Cowork plugins enterprise** (24 fév 2026) — 13 plugins/connecteurs (Google Workspace, DocuSign, Apollo, Clay, Outreach, SimilarWeb, MSCI, LegalZoom, FactSet, WordPress, Harvey). Toutes déjà en base, `last_seen` à jour.
- **MCP Apps spec** (26 jan 2026) — interactive UI inside chat. Partenaires de lancement : Amplitude, Asana, Box, Canva, Clay, Figma, Hex, Monday, Slack. Tous en base.
- **Agent SDK billing** (15 juin 2026, démarre aujourd'hui) — crédit mensuel séparé sur Pro/Max plans. Mentionné dans `claude-agent-sdk-python` et `claude-agent-sdk-typescript`.

## Catégorisation des 60 entrées rafraîchies

### Anthropic officiel (20)

`anthropic-skills-repo`, `claude-cookbooks`, `claude-code-cli`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `anthropic-sdk-python`, `anthropic-sdk-typescript`, `cowork`, `claude-marketplace`, `knowledge-work-plugins`, `claude-managed-agents`, `claude-managed-agents-dreaming`, `claude-managed-agents-outcomes`, `claude-finance-agents`, `claude-for-excel`, `claude-for-powerpoint`, `claude-for-word`, `claude-for-outlook`, `claude-in-chrome`, `claude-design`.

### MCP infrastructure et servers de référence (20)

Spec/registry : `mcp-apps-spec`, `mcp-registry-official`, `modelcontextprotocol-servers`, `awesome-mcp-servers-punkpeye`.

Servers MCP majeurs : `mcp-supabase`, `mcp-github`, `mcp-google-workspace`, `mcp-google-drive`, `mcp-google-calendar`, `mcp-slack`, `mcp-atlassian`, `mcp-notion`, `mcp-linear`, `mcp-figma`, `mcp-canva`, `mcp-asana`, `mcp-hex`, `mcp-amplitude`, `mcp-stripe`, `mcp-cloudflare`, `mcp-vercel`, `mcp-neon`, `mcp-postgres`, `mcp-filesystem`, `mcp-git`, `mcp-playwright`, `mcp-brave-search`, `mcp-sentry`, `mcp-hubspot`, `mcp-salesforce`.

### IDE/CLI integrations (10)

`claude-code-vscode`, `claude-code-jetbrains`, `cursor-editor`, `windsurf-editor`, `zed-editor`, `continue-dev`, `aider-cli`, `cline`, `goose`, `opencode`.

### Frameworks agentiques outbound (10)

`langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk`, `haystack-claude`, `dspy-claude`, `semantic-kernel-claude`, `crewai-claude`, `pydantic-ai`, `langgraph`, `agno-framework`.

## Archivage

Aucun item à archiver. La table est globalement jeune : le `last_seen` le plus ancien (2026-05-01) reste sous le seuil de 90 jours (cutoff 2026-03-17). Le prochain candidat à risque sera vers fin juillet 2026, sauf si les runs intermédiaires les refreshent d'ici là.

## Notes sur ce qui n'a pas pu être couvert

- **Sub-reddit r/ClaudeAI top du mois** : pas de fetch direct ce run (focus sur les sources officielles et awesome-lists déjà bien représentées dans le catalogue). À ré-explorer au prochain run avec un budget de slots réservé aux découvertes communautaires.
- **Nouveaux MCP servers** sortis depuis ~1 mois (entre les 300/mois nouveaux MCP). Le rythme actuel d'arrivée (~10/jour selon Glama) rend exhaustivité impossible dans le cap 60. Stratégie retenue : ne cataloguer que les MCPs avec adoption éditeur/partenaire visible ou cités dans les awesome-lists canoniques.
- **Project Glasswing** (Anthropic + bio partners pour Mythos 5) : pas un outil au sens catalogue, donc skip volontairement.
- **Add-ins Cowork récents non-Anthropic** : déjà couverts via les slugs `mcp-*` partenaires ; pas de duplicate slug ajouté.

## Décisions assumées

- **Pas d'ajout brand-new ce run** — décision prise après analyse de la couverture catalogue (441 entrées dont la plupart Cowork plugins, MCP servers et awesome-lists déjà bien indexés). Préférer rafraîchir l'existant plutôt que d'inflater avec des forks marginaux ou des outils <100 stars.
- **Descriptions enrichies en français** pour les 60 entrées rafraîchies, avec applicabilité explicite pour le contexte RTE Train Vente Malakoff (compliance, finance, MS 365, agile) quand c'est pertinent.
- **Préservation des champs user** (`status`, `user_priority`, `is_pinned`, `user_notes`) garantie par le `ON CONFLICT DO UPDATE` qui ne les liste pas dans `SET`.

## Sources web consultées (échantillon)

- [Anthropic skills repo](https://github.com/anthropics/skills) et [release notes juin 2026](https://releasebot.io/updates/anthropic)
- [Claude Fable 5 + Mythos 5 launch](https://www.anthropic.com/news/claude-fable-5-mythos-5)
- [Code with Claude 2026 — Dreaming/Outcomes/Multi-agent](https://thenewstack.io/anthropic-managed-agents-dreaming-outcomes/)
- [MCP Apps spec (jan 2026)](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [Cowork plugins enterprise (fév 2026)](https://www.constellationr.com/insights/news/anthropic-expands-cowork-plugins-across-enterprise-functions)
- [Claude Code IDE integrations 2026](https://code.claude.com/docs/en/changelog)
- [Best MCP servers 2026](https://github.com/tolkonepiu/best-of-mcp-servers)
- [Claude Agent SDK billing changes (15 juin 2026)](https://code.claude.com/docs/en/agent-sdk/overview)
