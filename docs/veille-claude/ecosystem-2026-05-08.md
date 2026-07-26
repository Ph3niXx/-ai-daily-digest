# Catalogue écosystème Claude — Run du 2026-05-08

## Compteurs

| Métrique | Valeur |
|---|---|
| Catalogue total après run | **226** entrées (status `active`) |
| Entrées vues / vérifiées aujourd'hui | **41** |
| Entrées vraiment nouvelles (insert) | **6** |
| Entrées existantes mises à jour (last_seen bumpé) | **35** |
| Entrées archivées | **0** |
| Stale > 90 jours détectés | **0** |

Run sain : aucune entrée n'avait dépassé le seuil de 90 jours sans revue (toutes les `last_seen` étaient déjà sur la fenêtre 2026-05-01 → 2026-05-07 avant ce run), donc l'étape archivage est un no-op cette fois.

## Nouveautés notables (6 ajouts)

- **aws-agent-toolkit** — `inbound` / `cowork_plugin`. Bundle officiel AWS lancé le 6 mai 2026 (Code with Claude + AWS keynote) : MCP servers managés + 40 skills + 3 plugins (AWS Core, AWS Data Analytics, AWS Agents) avec guardrails IAM.
- **aws-mcp-server** — `inbound` / `mcp_server`. Serveur MCP managé AWS (GA mai 2026), expose toutes les APIs AWS comme outils MCP avec observabilité CloudWatch/CloudTrail. Pas d'auto-hébergement.
- **aws-agent-plugins-awslabs** — `inbound` / `cowork_plugin`. Repo `awslabs/agent-plugins`, complément du toolkit ci-dessus avec les 3 plugins agents officiels packagés pour Claude Code et Cowork.
- **openskills-cli** — `both` / `framework`. CLI npm `openskills` (numman-ali) qui rend le format SKILL.md d'Anthropic exécutable dans n'importe quel agent IA via `AGENTS.md` (Claude Code, Cursor, Windsurf, Aider, Codex). Levier de portabilité fort.
- **plugin-create** — `inbound` / `cowork_plugin`. Plugin officiel intégré dans Cowork qui guide la création no-CLI de plugins custom (skills + connectors + slash commands + sub-agents). Lancé avec la plateforme plugins Cowork (janvier 2026, cf. `claude.com/blog/cowork-plugins`).
- **cc-connect-bridge** — `outbound` / `connector`. Bridge open-source `chenhg5/cc-connect` qui relie agents IA locaux (Claude Code, Cursor, Gemini CLI, Codex) à Slack / Teams / Discord / Telegram / Lark / DingTalk / LINE / WeChat Work. Pas d'IP publique requise.

## Entrées existantes confirmées vivantes (35 bumps)

Tous ces slugs ont vu leur `last_seen` rebumpé à `CURRENT_DATE` après vérification directe via leur source canonique :

- **Skills & repos officiels** : `anthropic-skills-repo`, `claude-cookbooks`, `knowledge-work-plugins`, `claude-plugins-official`
- **Listings MCP** : `awesome-mcp-servers-punkpeye`, `awesome-mcp-clients-punkpeye`, `awesome-mcp-devtools-punkpeye`, `best-of-mcp-servers-tolkonepiu`, `ever-works-awesome-mcp-servers`, `mcpservers-org`, `modelcontextprotocol-servers`
- **SDK & Agent SDK** : `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`
- **Vercel** : `vercel-ai-sdk`, `vercel-ai-gateway`, `ai-sdk-provider-claude-code`
- **Frameworks Python** : `langchain-claude`, `llamaindex-claude`, `dspy-claude`, `haystack-claude`
- **IDE & runtimes** : `cursor-editor` (Cursor 3 sortie le 2 avril 2026), `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-code-web`, `claude-desktop`, `cowork`
- **Channels & comms** : `claude-code-channels` (Telegram + Discord + iMessage)
- **Atlassian** : `mcp-atlassian` (Atlassian Remote MCP Server, Cloudflare-hosted)
- **Managed Agents** : `claude-managed-agents` (dreaming en research preview, multiagent + outcomes en beta avril 2026)
- **Communauté skills/plugins** : `awesome-claude-skills-travisvn` (8.7k stars), `awesome-claude-plugins-quemsah` (15 134 plugins indexés au 1er mai 2026), `superpowers-skills` (94k stars, accepté dans le marketplace officiel)

## Archivages

Aucun cette fois. Toutes les entrées `active` ont une `last_seen` ≥ 2026-05-01.

## Sources principales du run

- [github.com/anthropics/skills](https://github.com/anthropics/skills) — repo officiel des Agent Skills
- [github.com/anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks) — désormais aussi exposé sur `platform.claude.com/cookbook` depuis le 7 janvier 2026
- [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) — directory plugins Anthropic-managed
- [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) — 15 plugins open-source, dernière vague de 12 le 24 février 2026
- [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — 400 MCP servers, 990k stars cumulées
- [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — monorepo de référence
- [github.com/aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws) — Agent Toolkit for AWS lancé le 6 mai 2026
- [github.com/awslabs/agent-plugins](https://github.com/awslabs/agent-plugins) — 3 plugins agents AWS
- [github.com/numman-ali/openskills](https://github.com/numman-ali/openskills) — universal skills loader
- [claude.com/blog/cowork-plugins](https://claude.com/blog/cowork-plugins) — annonce Plugin Create
- [claudemarketplaces.com](https://claudemarketplaces.com/) — directory agrégé (4 200+ skills, 770+ MCP servers, 2 500+ marketplaces au 7 mai 2026)
- [code.claude.com/docs/en/channels](https://code.claude.com/docs/en/channels) — Claude Code Channels (Telegram, Discord, iMessage)
- [github.com/chenhg5/cc-connect](https://github.com/chenhg5/cc-connect) — bridge multi-plateformes

## Notes & limites assumées

- **Pas de pause sur les marketplaces communautaires** : les listings (chat2anyllm, voltagent, mhattingpete, daymade, glebis, etc.) sont restés tels quels. Le run actuel n'a pas re-vérifié leur fraîcheur GitHub un par un — c'est volontaire pour rester sous le cap de 60 entrées touchées par run.
- **r/ClaudeAI** : pas exploité dans ce run (les pages Reddit sont peu fiables via WebSearch ; à recroiser via une session manuelle si on veut chasser les tools tiers émergents).
- **Repos < 100 stars** filtrés conformément à la règle qualité — aucun ajout opportuniste sur des skills isolées.
- **Pas de duplicat AWS forcé** : `aws-agent-toolkit` et `aws-mcp-server` sont gardés séparés (un est le bundle, l'autre le serveur lui-même) car ils ont des slugs canoniques différents côté docs AWS.
- **Pas d'écrasement des décisions user** : aucun `UPDATE` n'a touché `status`, `user_priority`, `is_pinned`, ni `user_notes`. Les bumps `last_seen` se font via un `UPDATE` ciblé qui ne modifie que cette colonne, et l'`UPSERT` des nouveautés ne peut pas écraser ces colonnes (elles sont absentes de la liste `DO UPDATE SET`).
- **Cap respecté** : 41 entrées touchées au total sur les 60 autorisés.

## Dernière MAJ

- **2026-05-08** : run hebdo n°N — 6 ajouts (Agent Toolkit AWS + AWS MCP Server + awslabs agent-plugins + OpenSkills CLI + Plugin Create + cc-connect), 35 bumps last_seen sur les piliers du catalogue (SDKs, Agent SDKs, IDE Claude Code, listings MCP, frameworks Python, communauté skills). Catalogue total : 226 entrées actives.
