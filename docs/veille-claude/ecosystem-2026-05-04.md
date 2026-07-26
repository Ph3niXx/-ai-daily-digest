# Catalogue écosystème Claude — 2026-05-04

Run automatisé du `claude-synergies` (Cowork scheduled task).
Cible : Supabase `claude_ecosystem`.

## Bilan chiffré

- **Entrées vues / catalogue total** : 177
- **Vraiment nouvelles (insertions)** : 8
- **Mises à jour (slug existant, last_seen bumpé)** : 41
- **Archivées dans ce run** : 0 (catalogue récent, aucune entrée > 90 jours)
- **Total touché aujourd'hui** : 49

Le catalogue est dans un état très frais — toutes les entrées étaient déjà à `last_seen` entre 2026-05-01 et 2026-05-03, donc aucune condition d'archivage doux ne s'est déclenchée. La logique de vérification "repo mort" n'a eu rien à examiner.

## Nouveautés notables

| slug | direction | type | en 1 ligne |
|---|---|---|---|
| `anthropic-sdk-go` | outbound | sdk | SDK Go officiel Anthropic — manquait au catalogue malgré v1.38.0 (avril 2026). Complète la famille Python/TS/Java/Ruby/C#. |
| `claude-code-xcode` | outbound | ide_integration | Xcode 26.3 d'Apple intègre nativement le Claude Agent SDK (subagents, plugins, capture Previews iOS, MCP). |
| `superclaude-framework` | outbound | framework | Framework communautaire 22k+ stars : 30 commands, 16 agents, 7 modes comportementaux, 8 MCP intégrés. |
| `claude-forge` | outbound | cowork_plugin | Plugin Claude Code v3.0.1 (avril 2026), inspiré oh-my-zsh : 11 agents, 33 commands, 24 skills, 15 hooks, sécurité 6 couches. |
| `openrouter-claude-provider` | outbound | connector | Gateway "Anthropic Skin" : Claude Code/Desktop parlent natif Anthropic à OpenRouter qui route vers 500+ modèles. |
| `claude-telemetry-otel` | outbound | framework | Wrapper `claudia` qui logge tool calls, tokens, coûts et traces vers Logfire/Sentry/Honeycomb/Datadog via OTEL. |
| `grafana-claudestats` | outbound | connector | App Grafana officielle pour visualiser spend, tokens, latence Claude Code à partir des métriques OTEL natives. |
| `mcp-datadog-pup` | inbound | cowork_plugin | Successeur du datadog-api-claude-plugin (archivé) : `pup` de datadog-labs intègre nativement les commandes skills, 46 agents Datadog. |

Toutes ces entrées ont passé le filtre qualité (≥1 release/commit dans les 6 derniers mois, vendor identifiable, source URL canonique).

## Mises à jour (last_seen bumpées)

41 slugs ont été refreshed après vérification de leur activité récente sur le web :

- **Officiel Anthropic** : `anthropic-skills-repo`, `claude-plugins-official`, `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-managed-agents`, `claude-code-routines`, `claude-design`, `modelcontextprotocol-servers`, `mcp-apps-spec`, `agentskills-spec`
- **MCP servers récemment passés en remote (fév-avr 2026)** : `mcp-asana`, `mcp-shortcut`, `mcp-plane`, `mcp-smartsheet`, `mcp-wrike`, `mcp-linear`, `mcp-atlassian`, `mcp-hubspot`, `mcp-vercel`, `mcp-sentry`, `mcp-neon`, `mcp-clickup`, `mcp-salesforce-hosted`
- **Connectors créatifs (annonce mai 2026)** : `mcp-blender`, `mcp-ableton`, `mcp-adobe`, `mcp-autodesk-fusion`, `mcp-affinity`, `mcp-splice`
- **Directories MCP / Awesome listings** : `awesome-mcp-servers-punkpeye`, `awesome-claude-plugins-quemsah`, `awesome-claude-plugins-composio`, `claudemarketplaces-directory`, `mcpmarket-directory`, `mcp-so-directory`, `pulsemcp-directory`, `smithery-registry`, `glama-mcp-registry`
- **Skills** : `skillsmp`, `anthropic-cybersecurity-skills`

Les autres entrées du catalogue (≈128) n'ont pas été retouchées dans ce run mais leur `last_seen` reste ≤ 3 jours, donc bien en deçà du seuil 90j d'archivage.

## Archivages

Aucun archivage exécuté. Aucune entrée du catalogue n'avait `last_seen < CURRENT_DATE - 90 days`. Le compteur recommencera à mordre sur les slugs qui ne seront pas re-vus avant fin juillet 2026.

## Limites assumées / non couvertes

- **Cap appliqué** : 8 insertions + 41 updates = 49 opérations, bien sous le plafond 60/run.
- **Reddit r/ClaudeAI top du mois** : la recherche a renvoyé surtout du contenu éditorial (listicles top 10) plutôt que des posts Reddit bruts ; pas de nouvel outil capturé spécifiquement par cette source qui ne soit pas déjà en base.
- **DataDog/datadog-api-claude-plugin** : repo en cours d'archivage côté Datadog (migration vers `datadog-labs/pup`). Le slug `mcp-datadog-pup` capture le successeur — l'ancien plugin n'a pas été ajouté pour ne pas polluer le catalogue avec un repo qui va mourir.
- **Anthropic Cookbook** : déjà capturé via `claude-cookbooks`, pas de nouveau recipe notable détecté nécessitant un slug séparé.
- **Bots Claude-powered (Slack/Discord/Linear/Notion)** : tous les officiels sont déjà en base via leurs MCP servers (`mcp-slack`, `mcp-linear`, `mcp-notion`). Aucun bot tiers stable et maintenu (>100 stars + commit récent) n'a émergé qui ne soit déjà couvert.
- **Pas d'accès aux pages paywall** ou aux repos privés Atlassian (déjà standard).

## Prochaine action attendue

Catalogue stable. Prochain run : reproduire la routine d'ici 7-14 jours. Surveiller particulièrement :

1. La sortie publique de **Claude Mythos** (encore en preview chez Anthropic Red) — pourrait introduire un nouvel agent_runtime à cataloguer.
2. L'évolution du **MCP Apps** spec (SEP-1865) et l'adoption par les MCP servers existants — pourrait nécessiter un tag `mcp-apps-compatible` sur les entrées concernées.
3. Le statut **Pentagon vs Anthropic** (impact réputationnel sur les déploiements enterprise) — politique, pas catalogue, mais à surveiller pour la veille business.
4. Premier archivage attendu fin juillet 2026 (90 jours après `last_seen` 2026-05-01 sur certains slugs non revus dans ce run).
