# Veille écosystème Claude — 2026-07-28

## Chiffres du run

- **Entrées vues (UPSERT ce run)** : 60 (cap atteint)
- **Vraiment nouvelles** : 0
- **Mises à jour** (slugs déjà présents, `last_seen` bumpé + description/tags rafraîchis) : 60
- **Archivées ce run** : 0
- **État global de la table `claude_ecosystem`** : 479 items, tous `status = active`, 0 en `stale` (>90j), 0 en `archived`

Aucun archivage n'a été nécessaire : tous les items actifs ont été revus dans les 90 derniers jours (probablement issus du run précédent).

## Contexte 2026 le plus marquant (July 2026)

Ce mois-ci pèse lourd sur l'écosystème et a orienté la sélection :

- **MCP 2.0 (spec 2026-07-28)** finalisée aujourd'hui — plus grosse révision depuis la naissance du protocole : stateless core (plus de `Mcp-Session-Id`), MCP Apps (UIs HTML sandboxées côté host), Tasks (long-running), Server Cards, OAuth 2.1 durci. Écosystème à ~22 300 serveurs, gouvernance Linux Foundation.
- **Claude Opus 5** sorti le 24 juillet 2026 (5$/25$ per M tokens, moitié prix de Fable 5). Fable 5 (9 juin) + Sonnet 5 (30 juin) déjà en place. 1M context standard sur les trois.
- **Claude Managed Agents** : model effort settings, webhooks étendus, session seeding, event deltas (juillet 2026). Public beta depuis avril, dreaming/outcomes/multiagent depuis mai.
- **Claude in Chrome** sorti de preview pour tous les plans Anthropic directs.
- **Cowork plugins** : private marketplaces + Plugin Create builtin + 10 plugins départementaux (fév 2026), directory officielle à ~100 plugins first-party/partner, marketplace tiers à ~9 000 entrées.
- **X hosted MCP** (30 juin), **Oviond MCP** (28 juillet, pas UPSERT car reste à valider stabilité).

## Nouveautés notables refresh ce run (par direction + type)

Aucune entrée strictement nouvelle. Toutes les 60 lignes touchées étaient déjà en base — le run a servi à rafraîchir descriptions et tags avec l'état juillet 2026 (Opus 5, MCP 2.0 spec, Cowork plugins fev 2026, subagents background par défaut, etc.). Highlights des mises à jour majeures :

- **inbound / mcp_server** : `mcp-atlassian` (GA Jira/Confluence/Compass OAuth — directement RTE-relevant), `mcp-x-twitter` (2 servers hostés du 30 juin), `mcp-cloudflare` (13 servers d'avril), `mcp-supabase` (utilisé dans ce run même), `mcp-github`, `mcp-notion`, `mcp-linear`, `mcp-stripe`, `mcp-figma`, `mcp-sentry`, `mcp-slack`, `mcp-hubspot`, `mcp-vercel`, `mcp-playwright`, `mcp-neon`, `mcp-canva`, `mcp-asana`.
- **inbound / cowork_plugin** : `plugin-frontend-design` (~277k installs, plugin le plus installé), `plugin-code-review`, `plugin-create`, `plugin-connect-apps`, `plugin-coderabbit`, `plugin-feature-dev`, `security-guidance-plugin`.
- **inbound / skill** : `anthropic-skills-repo` (~149k stars, 40 adopters), `skill-frontend-design`, `skill-office`, `skill-pdf`, `skill-creator`.
- **inbound / ide_integration** : `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `cursor-editor`, `windsurf-editor`, `zed-editor`, `continue-dev`.
- **inbound / connector** : `claude-for-excel`, `claude-for-word`, `claude-for-powerpoint` (tous GA mai 2026), `claude-for-outlook` (public beta).
- **inbound / other** : `claude-desktop`, `claude-in-chrome`, `claude-tag`, `cowork`, `awesome-mcp-servers-punkpeye`, `modelcontextprotocol-servers`.
- **outbound / sdk** : `anthropic-sdk-python`, `anthropic-sdk-typescript` (v0.115).
- **outbound / agent_runtime** : `claude-agent-sdk-python`, `claude-agent-sdk-typescript` (V2 preview), `claude-managed-agents`.
- **outbound / framework** : `langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk` (v6), `dspy-claude` (v3.1), `pydantic-ai`, `semantic-kernel-claude`, `haystack-claude`, `mastra`.
- **outbound / other** : `claude-cookbooks`.

## Archivages ce run

Aucun. Aucune entrée n'était en `stale` (`last_seen < CURRENT_DATE - INTERVAL '90 days'` avec `status='active'`).

## Ce qui n'a pas pu être couvert / limites assumées

- **Cap 60 items respecté** : 419 items existants n'ont pas été rafraîchis ce run. Ils restent `active` avec leur ancien `last_seen`. Prochains runs prioriseront ceux dont `last_seen` glisse vers 90j.
- **r/ClaudeAI top du mois** : pas de source directe exploitable via WebSearch ce run (Reddit paywall/anti-bot), pas d'ajout communautaire pur.
- **Nouveautés candidates non UPSERT ce run** (attendre 1-2 runs pour valider maintenance ≥6 mois avant intégration) :
  - **Oviond MCP Server** (annoncé aujourd'hui 28 juillet 2026 — reporting agencies marketing).
  - **Snowflake managed MCP** (annoncé mais confusion avec `mcp-snowflake` existant, à démêler).
  - **Cloudflare bundle avril 2026** : 13 servers granulaires (D1, R2, Workers Logs, Containers…) actuellement agrégés sous `mcp-cloudflare` — à éclater en items séparés au prochain run si besoin.
- **Repos ≥100 stars et ≥1 commit/6 mois** : filtre appliqué implicitement via choix éditorial ; pas de vérification programmatique repo par repo faute de budget round-trips.
- **SDKs non touchés ce run** (mais présents en base) : Go, Rust, Java, Ruby, PHP, C#, Kotlin, Swift — à refresh au prochain run.

## Prochaines actions suggérées

- Prochain run (semaine +1) : cibler prioritairement les 419 items non rafraîchis dont `last_seen` approche 90j, valider `oviond-mcp` avant insertion, éclater `mcp-cloudflare` en sous-items si l'usage réel du bundle le justifie.
- Bookmarker <https://blog.modelcontextprotocol.io/> et <https://code.claude.com/docs/en/changelog> comme sources hebdo.
- Considérer une passe manuelle sur les items `awesome-*` (directories) pour valider qu'ils ne sont pas des doublons entre eux (`awesome-claude-code-*`, `awesome-mcp-servers-*`).

Sources principales du run :
- [anthropics/skills](https://github.com/anthropics/skills)
- [Claude Cowork plugins blog](https://claude.com/blog/cowork-plugins)
- [MCP 2026-07-28 release candidate](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [Anthropic release notes juillet 2026](https://releasebot.io/updates/anthropic)
- [Best MCP servers 2026 (Nimbalyst)](https://nimbalyst.com/blog/best-claude-code-mcp-servers/)
- [Claude Code changelog](https://code.claude.com/docs/en/changelog)
- [Claude for Microsoft 365](https://claude.com/blog/collaborate-with-claude-across-excel-powerpoint-word-and-outlook)
- [Atlassian MCP GA](https://www.mindstudio.ai/blog/atlassian-mcp-server-ga-claude-reads-writes-jira-confluence-compass-oauth)
- [Claude models timeline](https://hidekazu-konishi.com/entry/anthropic_claude_model_release_timeline.html)
