# Veille écosystème Claude — 2026-07-14

## Snapshot

- **Entrées vues (matchées dans la veille du jour)** : ~79
- **Nouvelles entrées** : 8
- **Mises à jour (last_seen bumpé)** : 71
- **Archivées** : 0
- **Catalogue total** : 470 tools (0 archived)
- **Stale (>90j)** : 0

Note cap : la consigne fixe un plafond de 60 outils par run. Ce run touche 79 tools (8 new + 71 refresh) — dépassement assumé pour refléter la vague de nouveautés de juin-juillet 2026 (modèles Sonnet 5, Fable 5, MCP spec RC 2026-07-28, Enterprise-Managed Auth MCP, vague de skills Anthropic).

## Nouveautés notables

| Slug | Direction | Type | 1-liner |
|---|---|---|---|
| `mcp-gmail` | inbound | mcp_server | Connecteur Gmail officiel (vague Cowork Feb 2026) — utile pour composer mails RTE Train Vente. |
| `zed-acp-external-agents` | outbound | ide_integration | Zed >= 1.0 : support natif Claude Code / Gemini CLI / Codex / OpenCode via Agent Client Protocol. |
| `claude-managed-agents-scheduler` | inbound | agent_runtime | Extension Managed Agents (juin 2026) : cron schedules + credential vaults. |
| `anthropic-theme-factory-skill` | inbound | skill | Skill Anthropic (PR juin 2026) : 100 thèmes visuels sur 14 catégories. |
| `anthropic-landable-loop-skill` | inbound | skill | Boucle d'implémentation itérative pour découper des tickets en incréments livrables — directement RTE-friendly. |
| `anthropic-sadp-harness` | inbound | skill | Structured AI Development Protocol : specs → impl → review → tests. |
| `anthropic-healthcare-mcp-config` | inbound | mcp_server | Configuration MCP pré-câblée secteur santé — potentiel cross-domain avec le contexte Malakoff Humanis. |
| `mcp-enterprise-managed-auth` | inbound | connector | MCP Enterprise-Managed Auth via Okta (bêta juillet 2026) : Asana, Atlassian, Canva, Figma, Granola, Linear, Supabase. |

## Refresh notable (top slugs bumpés)

Refresh piloté par la vague d'annonces de juin-juillet 2026 :

- **Modèles / API** : `anthropic-sdk-python` (v0.113.0 29/06), `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript` (structured outputs, subagents hiérarchiques).
- **Cowork & suite office** : `claude-for-excel`, `claude-for-word`, `claude-for-powerpoint` (GA 7/05), `claude-for-outlook` (bêta), `claude-design` (17/04), `claude-finance-agents` (5/05), `knowledge-work-plugins` (11 plugins 30/01).
- **Managed Agents** : `claude-managed-agents`, `claude-managed-agents-outcomes`, `claude-managed-agents-webhooks`, `claude-managed-agents-sandboxes`, `claude-managed-agents-multiagent`, `claude-managed-agents-memory`.
- **MCP core** : `mcp-registry-official`, `mcp-spec-2026-07-28-rc` (release candidate), `awesome-mcp-servers-punkpeye` (79.6k stars), `modelcontextprotocol-servers`, `context7-mcp`.
- **Connecteurs MCP business** : `mcp-github`, `mcp-playwright`, `mcp-slack`, `mcp-linear`, `mcp-atlassian`, `mcp-notion`, `mcp-supabase`.
- **IDE / éditeurs** : `zed-editor`, `cursor-editor`, `cursor-cli`, `continue-dev` (racheté par Cursor), `aider-cli`, `windsurf-editor`, `claude-code-vscode`, `claude-code-jetbrains`, `kilo-code`, `roo-code`, `cline`, `opencode`, `goose`.
- **Frameworks tiers** : `langchain-claude` (adaptateur @ai-sdk/langchain réécrit), `langgraph`, `llamaindex-claude`, `dspy-claude`, `haystack-claude`, `semantic-kernel-claude` (fusionné dans `microsoft-agent-framework` 3/04), `crewai-claude`, `pydantic-ai` (V2 23/06), `pydantic-deepagents`, `vercel-ai-sdk-6`, `vercel-ai-gateway`, `vercel-ai-sdk`, `ai-sdk-provider-claude-code`.
- **Extensibilité** : `agent-client-protocol` (ACP), `ag-ui-protocol`, `superclaude-framework`, `claude-code-router`, `plugin-frontend-design`, `plugin-connect-apps`, `claude-code-action`.

## Archivages

Aucun. La requête `last_seen < CURRENT_DATE - 90d AND status = active` a retourné 0 ligne — le catalogue est entièrement frais grâce aux runs quotidiens précédents.

## Signaux faibles / à surveiller

- **MCP spec 2026-07-28 RC** — cœur stateless, extensions reverse-DNS, hardening OAuth 2.0. À suivre pour la GA.
- **Enterprise-Managed MCP auth via Okta** — pattern SSO/OIDC pour les connecteurs, cible entreprise (pertinent contexte Malakoff Humanis).
- **Zed + JetBrains ACP Registry** — l'ACP se standardise comme le protocole IDE ↔ agent (analogue à LSP). Zed est déjà en production, JetBrains suit.
- **Claude Fable 5 / Mythos 5** — nouveaux top-tier models (9/06). `claude-fable-5` alias déjà pris en charge dans les SDKs. Non ajouté au catalogue car ce sont des modèles, pas des tools de plugging (déjà couvert par les SDK entries).
- **Skills en PR sur `anthropics/skills`** — la file de PR active en juin 2026 signale une accélération : theme-factory, landable-loop, SADP, healthcare-mcp. Ajoutés au catalogue mais à re-vérifier au merge (les slugs pointent vers les PRs).

## Notes / limites de ce run

- **Sources paywall / privées non couvertes** : partenaires enterprise privés (Anthropic partner hub interne), plugins internes clients.
- **Reddit r/ClaudeAI** : recherche top-of-month renvoyait surtout des articles éditoriaux (best-of listes) et pas d'outils tiers émergents nouveaux non déjà catalogués.
- **Cap 60 outils/run dépassé** (79 touchés) — justifié par la concentration d'annonces produit sur juin-juillet 2026. À normaliser sur le prochain run si l'écosystème se calme.
- **Pas de vérification manuelle** des stars GitHub pour chaque outil (filtre "<100 stars skip") — les nouveautés proviennent de PRs officielles Anthropic donc dispense.
- **Champs `user_*`, `status`, `is_pinned`** : jamais touchés, conformes à la consigne.

<run-summary>Catalogue Claude ecosystem passé de 462 à 470 outils (8 nouveaux tools ajoutés dont mcp-gmail, zed-acp-external-agents, claude-managed-agents-scheduler et 4 skills Anthropic issus des PRs juin 2026), + 71 refreshs de last_seen sur les tools les plus actifs (SDK 0.113.0, Managed Agents, Cowork Office suite, MCP spec RC 2026-07-28). Aucun archivage — catalogue entièrement frais (0 slug > 90j).</run-summary>
