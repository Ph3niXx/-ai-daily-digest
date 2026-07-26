# Veille écosystème Claude — 2026-05-15

## Stats du run

- **Total catalogue après run** : 330 entrées actives
- **Vues / rafraîchies** : 58 (last_seen bumpé à 2026-05-15)
- **Ajoutées** : 8 (nouveaux slugs)
- **Mises à jour** : 50 (slugs déjà connus, bump last_seen)
- **Archivées** : 0 (aucune entrée n'a dépassé les 90 jours sans revue — la plus vieille `last_seen` était au 2026-05-01)

## Nouveautés ajoutées (8)

| Slug | Direction | Type | 1-liner |
|---|---|---|---|
| `claude-marketplace` | outbound | other | Marketplace Anthropic lancé mars 2026 pour acheter du software built-on-Claude via spend Enterprise (GitLab, Harvey, Lovable, Replit, Rogo, Snowflake au lancement). |
| `mcp-skyvern` | inbound | mcp_server | Serveur MCP qui expose Skyvern (agent navigateur vision-language) à Claude — formulaires, 2FA, scraping. |
| `mcp-airtable` | inbound | mcp_server | Plugin officiel Airtable pour Claude avec sync Jira / Salesforce / Zendesk / Google Drive / Databricks. |
| `claudecode-warp` | outbound | ide_integration | Intégration native Claude Code dans le terminal Warp (auto-détection, vertical IDE, code review, streaming logs). |
| `fastmcp` | inbound | framework | Framework Python pour bâtir des serveurs MCP — version 2.14.0 (mai 2026) supporte SEP-1686 background tasks via `task=True`. |
| `awesome-remote-mcp-servers-jaw9c` | inbound | other | Liste curated des serveurs MCP remote-only (HTTP/SSE/Streamable HTTP) avec leur support auth. |
| `github-mcp-registry` | inbound | other | Hub GitHub officiel pour découvrir des MCP curated, en partenariat avec Anthropic et le MCP Steering Committee. |
| `mcp-bedrock-agentcore` | inbound | mcp_server | Gateway AWS Bedrock AgentCore qui expose les services Bedrock à Claude via MCP, auto-registration depuis avril 2026. |

## Rafraîchissements notables (50)

Tous les majeurs confirmés actifs lors de la veille du jour — SDKs Anthropic (Python, TypeScript, Go + Agent SDK), Claude Code (CLI / VS Code / JetBrains / Xcode), Cowork + plugins officiels Anthropic (`claude-plugins-official`, `knowledge-work-plugins`), Claude Managed Agents (Dreaming, Outcomes, Multi-agent, Add-ins), Claude Finance, Claude for Excel / PowerPoint / Word / Outlook, Claude Platform sur AWS, Claude for Legal, plus l'essentiel des MCPs entreprise (Sentry, Neon, Atlassian, Vercel, Linear, Slack, HubSpot, GitHub, Supabase, Google Workspace, DocuSign, WordPress, LegalZoom) et les registres / awesome-lists (`mcp-registry-official`, `modelcontextprotocol-servers`, `awesome-mcp-servers-punkpeye`, `pulsemcp-directory`, `claudemarketplaces-directory`).

## Tendances observées

- **Migration massive STDIO → remote** : Sentry, Neon, Atlassian, HubSpot, Linear, Slack, Vercel ont basculé vers du Streamable HTTP avec OAuth 2.1 entre janvier et avril 2026. Neon a même déprécié son `npm @neondatabase/mcp-server-neon` local. C'est ce qui justifie l'ajout de `awesome-remote-mcp-servers-jaw9c` comme référence dédiée.
- **Spec MCP 2026** : Tasks (SEP-1686) shipped en expérimental, Triggers et Events sous chartering, MCP Apps (SEP-1865) pour les UI interactives. `fastmcp` est la première implémentation pratique de SEP-1686.
- **Claude Marketplace** (mars 2026) — Anthropic se positionne comme distributeur enterprise, pas seulement fournisseur de modèle. Concurrence indirecte avec les marketplaces tierces (`claudemarketplaces-directory`, `pulsemcp-directory`, `smithery-registry`).
- **Add-ins Microsoft 365** : Claude bouge de "connecteur externe" à "intégré dans l'app" (Excel, PowerPoint, Word, Outlook qui arrive). Direction outbound qui complète les MCPs vendor-side.
- **Saturation des awesome-lists** : 12+ slugs `awesome-*` déjà dans le catalogue. À surveiller pour ne pas multiplier les doublons de directory.

## Archivages

Aucun. La plus vieille entrée avait un `last_seen` au 2026-05-01 (14 jours).

## Non couvert / limites du run

- **Reddit r/ClaudeAI top du mois** : pas exploré ce run (préférence pour les sources canoniques GitHub + blogs officiels). À reprendre quand les sources éditoriales s'essoufflent.
- **Bots Claude-powered tiers** (Slack/Discord communautaires) : peu visibles via search ce mois-ci. Le panel `mcp-slack` couvre déjà l'intégration officielle.
- **Forks <100 stars** : volontairement skippés (filtre dur du brief).
- **`anthropic-cybersecurity-skills`** : déjà présent dans le catalogue mais il existe désormais une version tierce maintenue par mukul975 (754 skills cybersécurité mappés MITRE ATT&CK/NIST/ATLAS). Pas dédupliqué ce run car le vendor diffère — à reconsidérer si on veut une politique stricte un-skill-une-entrée.

## Dernière MAJ

- **2026-05-15** : 8 nouveaux outils (claude-marketplace, mcp-skyvern, mcp-airtable, claudecode-warp, fastmcp, awesome-remote-mcp-servers-jaw9c, github-mcp-registry, mcp-bedrock-agentcore), 50 rafraîchissements, 0 archivage. Catalogue à 330 entrées actives.
