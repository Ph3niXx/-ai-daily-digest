# Veille écosystème Claude — 2026-06-30

## Résumé chiffré

- **Entrées vues / revérifiées ce run** : 57
- **Nouvelles entrées ajoutées** : 0
- **Entrées mises à jour (slug existant)** : 57 (bump `last_seen` + refresh description/tags)
- **Entrées archivées** : 0
- **État global du catalogue** : 456 actives, 0 archivées, 0 stale (>90j), oldest `last_seen` = 2026-05-01

## Lecture du run

Le catalogue `claude_ecosystem` était déjà à 456 entrées avant ce run, et tous les outils que la recherche web a fait remonter (skills officiels, SDKs Anthropic, Managed Agents memory/outcomes/dreaming/multiagent/sandboxes, MCP tunnels, Claude Design, marketplace Cowork, awesome-mcp-servers, registre MCP officiel, IDE integrations, frameworks) étaient déjà présents. Le run a donc agi en **mode rafraîchissement** : bump du `last_seen` pour 57 outils confirmés vivants et maintenus, et refresh de leurs descriptions pour intégrer les évolutions de mai/juin 2026 (Code with Claude London, sandboxes self-hosted, multiagent en public beta, SDK Python v0.113.0 / TS v0.107.0, plugin marketplace Claude Code à 214 plugins, etc.).

Aucune entrée < 90j donc rien à archiver. La fenêtre d'archivage continuera d'être vide tant que les runs hebdo passent.

## Mises à jour notables (refresh `last_seen` + description)

Côté Anthropic core et Managed Agents :

- `claude-managed-agents-sandboxes` (outbound / other) — public beta confirmée, providers Cloudflare/Daytona/Modal/Vercel.
- `claude-managed-agents-multiagent` (outbound / other) — passage en public beta via header `managed-agents-2026-04-01`.
- `claude-managed-agents-dreaming` (outbound / other) — toujours en research preview, extension de Memory.
- `mcp-tunnels` (both / other) — research preview du 19 mai 2026 confirmée.
- `anthropic-sdk-python` / `anthropic-sdk-typescript` — v0.113.0 / v0.107.0 (29 juin 2026), streaming system messages, web fetch, code_execution_20260120.
- `claude-agent-sdk-python` / `claude-agent-sdk-typescript` — structured outputs + SessionStore parité, MCP servers connect en background.
- `claude-plugins-official` — 214 plugins / 395k stars au 29 juin 2026.
- `knowledge-work-plugins` — extension legal de mai 2026 confirmée (20+ connecteurs, 12 plugins practice-area).

Côté MCP servers et infra :

- `mcp-cloudflare` — couverture étendue à 2500 endpoints en ~1K tokens.
- `context7-mcp` — top du registre FastMCP (11k vues / 690 installs).
- `mcp-supabase`, `mcp-postgres`, `mcp-filesystem`, `mcp-playwright`, `mcp-github`, `mcp-google-calendar`, `mcp-google-drive`, `mcp-notion`, `mcp-linear`, `mcp-slack`, `firecrawl-mcp`, `exa-mcp`, `perplexity-mcp` — toujours actifs et maintenus.
- `mcp-registry-official` — registre canonique modelcontextprotocol.io confirmé, 19k+ servers indexés (via Glama).

Côté frameworks et IDE :

- `langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk`, `ai-sdk-provider-claude-code`, `mastra`, `agno-framework`, `langgraph`, `dspy-claude` (3.3.0b1 en prerelease mai 2026), `haystack-claude`, `semantic-kernel-claude` (fusion Microsoft Agent Framework).
- `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains` (preview "Claude as agent provider" annoncée GitHub Changelog 22 juin 2026), `cursor-editor`, `windsurf-editor`, `zed-editor`, `cline`, `aider-cli`, `continue-dev`.

Côté skills et awesome lists :

- `anthropic-skills-repo` — 17 skills top-level (skill-creator, brand-guidelines, theme-factory, mcp-builder, webapp-testing, slack-gif-creator, doc-coauthoring, frontend-design, internal-comms, claude-api, canvas-design, algorithmic-art, docx, pdf, pptx, xlsx, web-artifacts-builder).
- `anthropic-cybersecurity-skills` (community) — 817 skills mappés MITRE/NIST/D3FEND, Apache 2.0.
- `awesome-mcp-servers-punkpeye` — nouveautés notables May-Jun : AI Video Generation MCP (30 avr), Agent Commerce MCP (11 mai), Roots by Benda regulatory intel (16 mai) — déjà tous en base.
- `claude-cookbooks` — 41k+ stars, dix templates agents finance ajoutés.
- `claude-design` — Anthropic Labs, prompt → prototype/design system/slides, lancé 17 avril 2026.
- `superclaude-framework` — toujours en haut des frameworks community claude-code.

## Archivages

Aucun. `last_seen` minimum dans le catalogue = 2026-05-01, soit 60 jours, en dessous du seuil de 90.

## Ce qui n'a pas pu être couvert

- **r/ClaudeAI top mois** : la requête `site:reddit.com r/ClaudeAI top tools June 2026` n'a renvoyé aucun lien exploitable (search non Reddit-friendly via le moteur courant). Pas de nouveautés tirées de Reddit ce run — à refaire avec une autre source communautaire (HN, Lobsters, Discord Anthropic) si possible.
- **Slackbot MCP Client** (annoncé Slack juin 2026) : non ajouté car le rôle d'inbound/outbound est ambigu — Slackbot devient lui-même *client* MCP pour consommer des servers tiers (Amplitude, Atlassian, Box, Canva, Docusign, Gamma, Linear, Miro, Notion, Replit, Webflow, Zoom). Ce n'est ni un MCP server à brancher dans Claude, ni un SDK Claude. À discuter : ajouter comme `type: connector` direction `both` ? Garde pour le prochain run.
- **Notion Workers** (hosted runtime annoncé juin 2026) : pas Claude-spécifique, plus une primitive Notion. Skip volontaire.
- **OpenAI Codex plugins** (2 juin 2026) : hors périmètre Claude (catalogue OpenAI).
- **Pas de fetch direct des README GitHub** : la recherche web a suffi pour valider la maintenance récente de chaque outil retenu, mais aucun `git log` ou commit hash n'a été lu — la vérification "≥ 1 commit/release dans les 6 derniers mois" est basée sur les annonces et release notes croisées dans les search results, pas sur une inspection directe du repo.

## Suggestions pour les prochains runs

1. Décider du traitement de **Slackbot MCP Client** (entrée à part type `connector`, ou simple mention dans la description de `mcp-slack` ?).
2. Étendre la veille aux **Discord/forum Anthropic** pour rattraper les outils tiers émergents que Reddit ne couvre pas.
3. Le seuil 90j d'archivage ne mordra pas avant fin juillet 2026 sur le catalogue actuel — penser à un audit manuel intermédiaire (échantillon d'outils `mcp_server` de petit acteur) pour valider qu'ils sont bien encore maintenus avant d'attendre le verdict automatique.
