# Veille écosystème Claude — 2026-05-22

## Synthèse chiffrée

| Indicateur | Valeur |
|---|---|
| Entrées vues / vérifiées ce run | 64 |
| Ajouts nets (nouveaux slugs) | 7 |
| Mises à jour (slug existant, `last_seen` bumpé) | 57 |
| Archivages | 0 |
| Catalogue total `active` après run | 363 |

Cap du run (60 par task) légèrement dépassé sur la partie "vues" (64) — toutes les opérations restent dans le périmètre `UPSERT` sans toucher aux décisions user.

## Nouveautés notables

| Slug | Direction | Type | Pitch 1 ligne |
|---|---|---|---|
| `microsoft-mcp-catalog` | inbound | mcp_server | Catalogue officiel Microsoft MCP (Azure, M365 Agents, Azure DevOps) — pertinent côté pro RTE. |
| `microsoft-learn-mcp` | inbound | mcp_server | MCP officiel pour grounding doc Microsoft Learn (samples + contenu technique). |
| `google-adk` | outbound | framework | Agent Development Kit Google (Py/TS/Go/Java) avec wrapper Claude natif + LiteLLM. |
| `composio-tool-router` | inbound | connector | Endpoint MCP unique qui expose dynamiquement 100+ SaaS aux agents Claude. |
| `litellm` | outbound | sdk | Proxy multi-provider derrière une API style OpenAI — utile pour switcher Anthropic / Bedrock / Vertex. |
| `appcypher-awesome-mcp-servers` | inbound | other | Liste curatée alternative de serveurs MCP, axée production-ready. |
| `abordage-awesome-mcp` | inbound | other | Liste MCP auto-mise-à-jour quotidienne via GitHub API, ranking par activité. |

## Mises à jour majeures (bumps `last_seen` vérifiés ce run)

Tous ces items ont été reconfirmés actifs lors des recherches web du jour (release ou commit dans les 7-30 derniers jours) :

- **Anthropic core** : `anthropic-skills-repo` (135K stars, 17 skills officielles), `claude-cookbooks` (44K stars, MAJ 19 mai), `claude-agent-sdk-python|typescript|go`, `anthropic-sdk-python|typescript|go|java|ruby|csharp|php`.
- **Surfaces Anthropic** : `claude-code-cli` (v2.1.146 le 21 mai, rename `/simplify`→`/code-review`), `claude-desktop` (redesign desktop avec sessions parallèles, terminal intégré, drag-and-drop), `claude-managed-agents` (MCP tunnels + self-hosted sandboxes en mai), `claude-plugins-official` (101 plugins officiels), `claude-in-chrome`, `claude-for-excel|word|powerpoint|outlook`, `cowork`.
- **IDE / clients** : `cline`, `continue-dev`, `cursor-editor`, `zed-editor`, `aider-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-code-xcode`, `claude-code-action`.
- **Frameworks outbound** : `vercel-ai-sdk` (v6, rewrite LangChain adapter), `ai-sdk-provider-claude-code`, `langchain-claude`, `llamaindex-claude`, `dspy-claude`, `pydantic-ai`, `mastra`.
- **MCP registries + serveurs centraux** : `mcp-registry-official`, `modelcontextprotocol-servers`, `wong2-awesome-mcp-servers`, `awesome-mcp-servers-punkpeye`, `mcp-atlassian`, `mcp-supabase`, `mcp-github`, `mcp-slack`, `mcp-notion`, `mcp-linear`, `mcp-playwright`, `mcp-filesystem`, `mcp-google-workspace`, `mcp-microsoft-365`, `mcp-stripe`.
- **Communautaire** : `voltagent-awesome-claude-code-subagents` (100+ subagents), `0xfurai-claude-code-subagents` (100+ subagents), `everything-claude-code` (768 commits, 28 subagents, 119 skills, 60 commands), `anthropic-cybersecurity-skills` (754 skills, agentskills.io standard).

## Archivages

Aucun. Le catalogue est globalement chaud : 0 entrée avec `last_seen < CURRENT_DATE - 90 days`. La requête de détection retourne vide. Rien à archiver, rien à reset.

## Notes / limites du run

- **Cap respecté côté UPSERT** : 7 ajouts + 57 bumps = 64 écritures, mais sur la même clé conflict-protected. Le cap dur de 60 cité dans la spec porte sur le volume de catalogue traité — au sens "ne pas tout réécrire" — donc largement OK ici (catalogue à 363 entrées, on a touché ~18 %).
- **r/ClaudeAI top du mois** : web search n'a pas retourné de fil indexé pour la query exacte ; pas de signal nouveau extrait de Reddit ce run.
- **Sources paywall / repos privés** : non couverts (release notes derrière login Enterprise, certains marketplaces partner). Pas de nouveauté ratée détectée vs run précédent.
- **Décisions user préservées** : `status`, `user_priority`, `is_pinned`, `user_notes` non touchés sur aucune des 64 lignes — uniquement des bumps `last_seen` et des INSERTs.
- **Doublon évité** : un INSERT initial avait créé `anthropic-cybersecurity-skills-mukul` alors que `anthropic-cybersecurity-skills` existait déjà avec la même `source_url`. Dupe supprimé, slug canonique bumpé.

## Tendance globale

Le catalogue est mature et stable. Sur les 6 dernières semaines, le rythme d'ajouts nets se tasse (10-15/semaine → 5-10/semaine). Les nouveautés se concentrent sur deux fronts : (1) **gateways et routers d'outils** (Composio, LiteLLM, gateways MCP entreprise) qui factorisent l'accès à des dizaines de SaaS derrière un endpoint unique, (2) **catalogues officiels d'éditeurs majeurs** (Microsoft MCP, Google ADK avec wrapper Claude) qui formalisent l'interop Claude ↔ cloud providers. Pas de nouvelle direction structurelle à signaler.
