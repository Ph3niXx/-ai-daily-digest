# Catalogue écosystème Claude — 2026-06-07

## Résumé

- **Vues** : 60 outils confirmés via web search
- **Ajoutées** (vraiment nouvelles) : 0
- **Mises à jour** (slug existant, last_seen bumpé) : 60
- **Archivées** : 0 (aucun item au-delà du seuil 90j)
- **Total catalogue actif** : 411

Le catalogue est arrivé à maturité ces dernières semaines (411 entrées actives, last_seen le plus ancien < 90 jours). Le run d'aujourd'hui n'a pas trouvé d'outils manquants : toutes les nouveautés identifiées par recherche (Datadog MCP, ServiceNow MCP, agents financiers Anthropic, Claude Managed Agents sandboxes, dynamic workflows, Superpowers, etc.) étaient déjà référencées. Le travail s'est donc concentré sur le bump `last_seen` des 60 outils les plus structurants pour confirmer leur vitalité.

## Items confirmés vivants (last_seen → 2026-06-07)

### Inbound — pluggés à Claude

**MCP servers officiels (vendor-operated, remote)**
- mcp-slack, mcp-linear, mcp-notion, mcp-stripe, mcp-sentry, mcp-cloudflare, mcp-github, mcp-atlassian, mcp-supabase, mcp-servicenow-official, mcp-datadog-pup, mcp-meta-ads, mcp-google-calendar, mcp-google-drive, mcp-docusign, mcp-apollo — confirmés via les écosystèmes Cloudflare Workers MCP et la vague Q1-Q2 2026 (GitHub, Linear, Notion, Slack, Stripe, Atlassian tous officialisés). Datadog MCP est passé GA en 2026, ServiceNow MCP est inclus dans Now Assist/AI Native SKUs.

**Skills officielles et tierces**
- anthropic-skills-repo (17 skills core Anthropic), skill-creator, superpowers-skills (obra, accepté au marketplace officiel le 15 janvier 2026, ~174k stars), claude-trading-skills-tradermonty, claude-scientific-skills-kdense (140 skills, 28 bases scientifiques).

**Plugins & marketplaces Claude Code / Cowork**
- claude-plugins-official (Anthropic-managed, ~101 plugins en mars 2026), claude-plugins-community, cowork (plateforme), claude-marketplace, claudemarketplaces-directory (référencé indirectement), claude-managed-agents (lancé en public beta avril 2026), claude-managed-agents-sandboxes (self-hosted en beta), claude-managed-agents-multiagent, claude-managed-agents-webhooks.

**Sub-agents & curated lists**
- wshobson-claude-agents (14.5k stars, 84 plugins/192 agents/156 skills/102 commands), awesome-claude-code-hesreallyhim (36.8k stars, canonical), awesome-claude-code-toolkit-rohitg00, awesome-claude-plugins-composio, awesome-claude-plugins-quemsah (>15k repos indexés mai 2026), awesome-mcp-servers-punkpeye.

**Specs & registres MCP**
- modelcontextprotocol-servers, mcp-registry-official (registry.modelcontextprotocol.io, ~2000 entrées), mcp-2026-roadmap, mcp-apps-spec, agent-skills-validator, agents-md-spec, agentic-ai-foundation (Linux Foundation, dec 2025).

### Outbound — Claude pluggé à

**SDKs officiels Anthropic**
- anthropic-sdk-python, anthropic-sdk-typescript, claude-agent-sdk-python (v0.1.50 en mars 2026), claude-agent-sdk-typescript (release cadence hebdo).

**IDE integrations**
- claude-code-vscode (extension la plus aboutie), claude-code-jetbrains (plugin marketplace), claude-code-cli, claude-desktop, claude-in-chrome.

**Frameworks & agents tiers**
- langchain-claude (via @ai-sdk/langchain), llamaindex-claude (via Vercel Gateway), vercel-ai-sdk, vercel-ai-sdk-6, ai-sdk-provider-claude-code, cline (62.6k stars), goose (46.2k stars, gouverné par AAIF), roo-code (archivé le 15 mai 2026, pivot vers Roomote cloud — leave status alone per règles user_*).

**Cookbooks & verticales métier**
- claude-cookbooks (44.1k stars), anthropic-financial-services (10 agents templates lancés 5 mai 2026 : pitchbook, KYC, month-end close).

## Nouveautés notables vues mais déjà cataloguées

- **Dynamic Workflows** (Claude Code, research preview, mai 2026) — orchestration 10s-100s sub-agents parallèles, livré avec Claude Opus 4.8 le 28 mai 2026. C'est une feature de claude-code-cli, pas un slug séparé.
- **Claude Managed Agents tunnels MCP** — research preview, déjà couvert par `claude-managed-agents-sandboxes`.
- **Superpowers v12 skills** (RED-GREEN-REFACTOR, sub-agent dev) — couvert par `superpowers-skills`.
- **Datadog MCP server** — GA en 2026, déjà dans le catalogue (`mcp-datadog-pup`).
- **ServiceNow MCP officiel** — GA, inclus Now Assist, déjà dans le catalogue.

## Archivages

Aucun. Le `last_seen` minimum sur les 411 actifs est < 90 jours (snapshot étape 0 : tout est récent, `most_recent_seen` = 2026-06-05). L'étape 3 a été un no-op.

## Notes / limites du run

- **Catalogue mature** : avec 411 entrées et zéro slug stale, le travail principal est désormais le maintien (bump `last_seen`) plutôt que l'expansion. Si l'objectif passe à "découverte de nouveautés vraiment fraîches", il faudra élargir vers les marketplaces tierces moins canoniques (claudeskills-info-marketplace, skillsmp, tonsofskills-marketplace déjà tracés) et les sub-agents <1k stars.
- **Status `roo-code`** : projet archivé le 15 mai 2026, pivot vers "Roomote" cloud. Décision laissée à l'utilisateur (status user-owned). À surveiller : si Roomote prend forme commerciale, créer un slug `roomote` au prochain run.
- **Sources paywall / repos privés** : pas de blocage rencontré ce run.
- **Pas de nouveaux outils ajoutés** : un cap dur a été respecté (60 ≤ 60). Aucun outil découvert ne manquait au catalogue.
- **Préservation user_*** : aucun champ `status`, `user_priority`, `is_pinned`, `user_notes` touché. UPDATE limité strictement à `last_seen = CURRENT_DATE` pour préserver les descriptions et métadonnées existantes.
