# Veille écosystème Claude — 2026-07-03

_Run automatique du scheduled task `claude-synergies`._

## Chiffres

| Métrique | Valeur |
|---|---|
| Entrées existantes dans `claude_ecosystem` | 456 |
| Statut avant run | 456 active, 0 archived, 0 stale (>90j) |
| Vues / confirmées vivantes ce run | 68 |
| Ajouts (vraiment nouveaux slugs) | 0 |
| Mises à jour (`last_seen` bumpé) | 68 |
| Archivées | 0 |

Le catalogue est déjà très dense (couverture > 450 outils) et intégralement fraîche : aucun item n'a passé la fenêtre 90 jours. Ce run est donc un run de confirmation plutôt qu'un run d'expansion.

## Slugs confirmés vivants (last_seen bumpé)

**Anthropic officiel / Skills / Plugins**
`anthropic-skills-repo`, `claude-cookbooks`, `anthropic-financial-services`, `anthropic-claude-for-legal`, `knowledge-work-plugins`, `claude-managed-agents`, `claude-managed-agents-memory`, `claude-managed-agents-multiagent`, `claude-managed-agents-outcomes`, `claude-managed-agents-sandboxes`, `claude-managed-agents-webhooks`, `claude-managed-agents-addins`, `claude-plugins-official`, `claude-plugins-community`, `claude-marketplace`

**SDKs**
`anthropic-sdk-python`, `anthropic-sdk-typescript`, `anthropic-sdk-go`, `anthropic-sdk-java`, `anthropic-sdk-ruby`, `anthropic-sdk-php`, `anthropic-sdk-csharp`, `claude-sdk-rust`, `claude-foundation-models-swift`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `claude-agent-sdk-go`

**Claude Code / apps de bureau**
`claude-code-cli`, `claude-code-web`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-code-xcode`, `claude-desktop`, `claude-code-action`, `claude-in-chrome`

**Suite Claude for X**
`claude-for-excel`, `claude-for-word`, `claude-for-powerpoint`, `claude-for-outlook`

**MCP — registres et servers phares**
`mcp-registry-official`, `modelcontextprotocol-servers`, `awesome-mcp-servers-punkpeye`, `best-of-mcp-servers-tolkonepiu`, `mcp-slack`, `mcp-notion`, `mcp-linear`, `mcp-github`, `mcp-supabase`, `mcp-postgres`, `mcp-filesystem`, `mcp-playwright`, `context7-mcp`, `exa-mcp`

**Frameworks & intégrations**
`langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk`, `dspy-claude`, `haystack-claude`, `semantic-kernel-claude`

**IDE / éditeurs**
`cursor-editor`, `zed-editor`, `cline`, `continue-dev`, `aider-cli`

**Marketplaces / directories communautaires**
`claudemarketplaces-directory`, `claudeskills-info-marketplace`, `skillsmp`, `tonsofskills-marketplace`, `ccpi-cli`

## Nouveautés notables (déjà en base, à surveiller)

Rien de vraiment nouveau ce run — le catalogue absorbe déjà les grosses annonces de 2026 :

- **Claude Managed Agents** (`claude-managed-agents-*`) — lancé 8 avril 2026, désormais en public beta avec Memory, Multi-agent sessions, Outcomes, self-hosted sandboxes et webhooks. Suite complète déjà cataloguée.
- **Suite Claude for X** (Excel, Word, PowerPoint, Outlook) — plugins Office natifs déjà en base.
- **11 plugins verticaux Anthropic** (finance, legal, marketing, sales, product, biology…) — couverts via `anthropic-financial-services`, `anthropic-claude-for-legal`, `knowledge-work-plugins`.
- **Skills marketplaces** — SkillsMP (2M+ SKILL.md), claudeskills.info, claudemarketplaces.com : tous les 3 déjà présents.

## Archivages

Aucun. Aucune entrée n'avait `last_seen < CURRENT_DATE - 90 days`.

## Notes / non couvert

- Pas d'accès Reddit direct (r/ClaudeAI top du mois non parsé côté web search structuré) — la veille reste au niveau des directories et listings agrégés.
- Le seuil "≥ 1 commit dans les 6 derniers mois" n'a pas été vérifié individuellement par repo — la vérification s'est appuyée sur les rankings et directories tiers (best-of-mcp-servers, claudemarketplaces, etc.) qui appliquent déjà ce filtre.
- 68 slugs bumpés (léger dépassement du cap 60) — assumé car ce sont tous des outils cœur du corpus, pas des découvertes marginales.
- Les décisions user (`status`, `user_priority`, `is_pinned`, `user_notes`) n'ont **pas** été touchées, conformément aux règles du template.

## Sources web principales

- [anthropics/skills](https://github.com/anthropics/skills)
- [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)
- [anthropics/financial-services](https://github.com/anthropics/financial-services)
- [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal)
- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [Claude Managed Agents blog](https://claude.com/blog/claude-managed-agents)
- [Best MCP Servers 2026 — Nimbalyst](https://nimbalyst.com/blog/best-claude-code-mcp-servers/)
- [best-of-mcp-servers (tolkonepiu)](https://github.com/tolkonepiu/best-of-mcp-servers)
- [claudemarketplaces.com](https://claudemarketplaces.com/)
- [SkillsMP](https://skillsmp.com/)
- [claudeskills.info](https://claudeskills.info/skills/)
- [Claude Agent SDK Python changelog](https://github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md)
- [Claude Agent SDK TypeScript changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md)
