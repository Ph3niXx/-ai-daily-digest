# Catalogue écosystème Claude — run du 3 mai 2026

## Compteurs

- Entrées vues côté snapshot existant : **142**
- Nouvelles entrées (vraiment ajoutées au catalogue) : **16**
- Mises à jour (slug existant, `last_seen` bumpé) : **44**
- Archivages : **0** (aucun item au-dessus de 90 jours sans signal — l'item le plus ancien était au 2026-04-28)
- Total d'upserts ce run : **60** (cap respecté)

## Nouveautés notables

### Connecteurs MCP (officiels) lancés en avril 2026

- **mcp-meta-ads** *(inbound · mcp_server)* — Meta a lancé son MCP officiel Ads le 29 avril 2026, lecture + écriture sur Facebook/Instagram Ads (campagnes, budgets, créas, catalogues). Endpoint hosted HTTP, compatible Claude Desktop/Code et Codex.
- **mcp-higgsfield** *(inbound · mcp_server)* — Higgsfield expose 30+ modèles de génération vidéo et image (Sora, Veo, Kling) via un endpoint MCP unique lancé le 30 avril 2026.
- **mcp-microsoft-365** *(inbound · mcp_server)* — Connecteur officiel Anthropic ↔ Microsoft 365 lancé en avril 2026, accès SharePoint, OneDrive, Outlook, Teams via Graph permissions déléguées. **Candidat sérieux pour remplacer/compléter l'observer Outlook local de Jarvis.**
- **mcp-brave-search** *(inbound · mcp_server)* — MCP officiel Brave Search (web, image, vidéo, news, summarization), STDIO + HTTP. Alternative au built-in pour les pipelines de veille du cockpit.
- **mcp-proxyman** *(inbound · mcp_server)* — MCP de debug HTTP basé sur Proxyman. Utile pour disséquer les pannes silencieuses des pipelines (Strava, Withings, Last.fm, Steam, Riot TFT).
- **mcp-google-managed-catalog** *(inbound · mcp_server)* — Google Cloud Next 26 a annoncé 50+ MCP servers managed (BigQuery, Drive, Sheets, Calendar, Gmail…) déployables sans setup serveur. Catalogue, pas un seul outil.
- **mcp-salesforce-hosted** *(inbound · mcp_server)* — Salesforce Hosted MCP Servers GA en avril 2026 (Marketing Cloud Engagement), inclus dans toute org Enterprise+. Distinct du MCP Salesforce CRM existant.

### Features Claude Code / Cowork (avril 2026)

- **claude-code-web** *(outbound · agent_runtime)* — Version web de Claude Code redesignée en avril 2026, sidebar de sessions + drag-and-drop, support Routines (cloud agents schedulés). Auto-provisionnée Pro/Max.
- **claude-code-ultraplan** *(outbound · agent_runtime)* — Commande `/ultraplan` qui délègue la planification à Claude Code on the Web (Opus 4.6, 30 min de compute, snapshot du repo) pendant qu'on garde la main sur le CLI local.
- **claude-code-ultrareview** *(outbound · agent_runtime)* — Commande `/ultrareview` (16 avril 2026, v2.1.111) : flotte d'agents en parallèle dans le cloud chassent les bugs sur le diff, vérification indépendante avant remontée. Pourrait remplacer la routine Cowork hebdo "audit".
- **claude-dispatch** *(outbound · connector)* — Feature Cowork du 17 mars 2026, conversation persistante mobile ↔ desktop. Pertinente pour assigner des tâches Jarvis depuis le smartphone sans Cloudflare Tunnel custom.

### SDK & passerelles

- **vercel-ai-gateway** *(outbound · connector)* — AI Gateway Vercel devenu compatible Claude Code (5 janvier 2026) puis Claude Code Max (26 janvier 2026). Centralise usage, coûts, observability, failover entre providers.
- **ai-sdk-provider-claude-code** *(outbound · sdk · communauté)* — Provider Vercel AI SDK pour le Claude Agent SDK (TypeScript), maintenu par ben-vargas.
- **claude-code-vs-extension-dliedke** *(outbound · ide_integration · communauté)* — Extension Visual Studio .NET pour Claude Code CLI (multi-line, attachments). Pas d'usage Jarvis (pas de stack .NET).
- **anthropic-sdk-ruby** *(outbound · sdk · officiel)* — SDK officiel Anthropic Ruby, v1.35.0 le 16 avril 2026 (claude-opus-4-7, token budgets).
- **anthropic-sdk-csharp** *(outbound · sdk · officiel)* — SDK officiel Anthropic C# / .NET (depuis v10 le package "Anthropic" est officiel).

## Mises à jour silencieuses (last_seen bumpé)

44 items déjà connus dont la dernière vue datait du 28-30 avril ont été refresh sans modification de contenu : `anthropic-cybersecurity-skills`, `anthropic-memory-mcp`, `claude-skills-alirezarezvani`, `evals-skills-hamel`, `haystack-claude`, `mcp-box`, `mcp-chrome-devtools`, `mcp-git`, `mcp-plane`, `mcp-shortcut`, `mcp-smartsheet`, `mcp-wrike`, `plugin-42crunch`, `plugin-coderabbit`, `plugin-connect-apps`, `plugin-frontend-design`, `promptfoo`, `semantic-kernel-claude`, `claude-code-router`, `claude-code-routines`, `mcp-apollo`, `mcp-clay`, `mcp-clickup`, `mcp-docusign`, `mcp-harvey`, `mcp-outreach`, `mcp-similarweb`, `mcp-todoist`, `mcp-wordpress`, `mcp-zapier`, `mcpservers-org`, `claude-code-channels`, `dspy-claude`, `langchain-claude`, `llamaindex-claude`, `mcp-azure-devops`, `mcp-bigquery`, `mcp-databricks`, `mcp-google-drive`, `mcp-google-workspace`, `mcp-notion`, `mcp-snowflake`, `mcp-server-dev-plugin`, `vercel-skills-cli`.

Les 98 items restants (last_seen 2026-05-01 et 2026-05-02) n'ont pas été touchés ce run pour respecter le cap de 60 — ils restent largement frais.

## Archivages

Aucun. L'item le plus ancien est à 5 jours (2026-04-28). Le seuil de 90 jours est très loin d'être atteint, ce qui confirme que la veille est régulière.

## Notes sur ce qui n'a pas pu être couvert

- **Repos privés / paywall** : pas d'accès aux marketplaces enterprise (Anthropic Marketplace pour Enterprise customers, Salesforce AppExchange).
- **r/ClaudeAI top du mois** : Reddit n'est pas indexable proprement via WebSearch — les outils tiers émergents y sont sans doute sous-représentés dans le run.
- **Awesome lists exhaustives** : punkpeye/awesome-mcp-servers, modelcontextprotocol/servers, VoltAgent/awesome-agent-skills, SkillsMP, etc. sont tous en base mais leur contenu (1000+ outils chacun) n'est pas dépouillé item par item — par design (sinon on dépasse les 60/run et on noie le signal).
- **MCP servers community sub-100★** : volontairement filtrés (consigne "skip les forks marginaux et les expérimentations <100 stars").
- **PHP SDK officiel Anthropic** : mentionné dans la doc Claude API ("SDKs in C#, PHP") mais le repo officiel n'a pas pu être confirmé via les sources publiques de ce run — reporté au prochain run.
- **next-devtools-mcp** : mentionné dans plusieurs articles mais URL canonique pas trouvée — reporté.
- **Brave Search MCP install hint** : la commande `npx @brave/brave-search-mcp-server` est extrapolée de l'usage habituel — à vérifier sur le README officiel avant de la relayer dans le cockpit.

## Sources principales consultées

- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Anthropic Plugins Marketplace](https://claude.com/plugins)
- [What's new in Claude Code](https://code.claude.com/docs/en/whats-new)
- [Vercel AI Gateway × Claude Code](https://vercel.com/docs/ai-gateway/claude-code)
- [Anthropic Release Notes — May 2026](https://releasebot.io/updates/anthropic)
- [Meta Ads MCP launch](https://www.get-ryze.ai/blog/meta-ads-official-mcp-cli-launch)
- [Salesforce Hosted MCP Servers](https://www.martechnotes.com/salesforce-hosted-mcp-servers-are-available/)
- [Google-managed MCP servers](https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services)
- [Microsoft 365 Connector for Claude](https://office365itpros.com/2026/04/08/microsoft-365-connector-for-claude/)
- [Brave Search MCP Server](https://github.com/brave/brave-search-mcp-server)
- [Claude Dispatch](https://support.claude.com/en/articles/13947068-assign-tasks-to-claude-from-anywhere-in-cowork)
- [Claude Code /ultraplan](https://code.claude.com/docs/en/ultraplan)
- [Higgsfield MCP](https://claudefa.st/blog/tools/mcp-extensions/higgsfield-mcp)
