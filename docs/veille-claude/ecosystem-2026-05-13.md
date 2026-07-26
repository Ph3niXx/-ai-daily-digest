# Catalogue écosystème Claude — Run du 13 mai 2026

## Synthèse chiffrée

| Métrique | Valeur |
|---|---|
| Entrées totales dans `claude_ecosystem` | **302** |
| Entrées vues aujourd'hui (UPSERT) | **57** |
| Vraiment nouvelles (insertions) | **16** |
| Mises à jour (`last_seen` bumpé) | **41** |
| Archivées ce run | **0** |
| Entrées candidates à l'archivage (>90j) | **0** |

Le catalogue est dans un état de fraîcheur saine : aucune entrée n'a dépassé les 90 jours sans signe de vie. Le seed initial date du 1er mai 2026 et tout vit dans une fenêtre de 13 jours.

## Nouveautés notables (16 insertions)

### Marketing automation MCP — vague d'avril 2026

- **mcp-marketo-adobe** (inbound · mcp_server) — Adobe pousse son MCP natif pour Marketo Engage le 15 avril 2026, 100+ opérations sur forms/programs/campaigns/leads/emails. Multi-tenant, credentials per-request.
- **mcp-marketo-inflection** (inbound · mcp_server) — Concurrent natif-AI d'Adobe : journeys + audiences + emails depuis un seul prompt avec data Salesforce/produit/marketing/warehouse.
- **mcp-marketo-zapier** (inbound · mcp_server) — Branchement Marketo via le catalogue Zapier MCP, no-code.
- **mcp-knak** (inbound · mcp_server) — Lancé en alpha le 20 avril 2026, génération d'email assets dans le pipeline de rendu Knak (Outlook compat, dark mode, responsive).

### Gateways MCP enterprise

- **microsoft-mcp-gateway** (inbound · other) — Reverse proxy + lifecycle management MCP purpose-built Kubernetes, intégration Azure Entra ID.
- **mcp-gateway-registry-agentic-community** (inbound · other) — Gateway + registry OAuth/Keycloak/Entra, gouvernance et audit.
- **mintmcp-gateway** (inbound · other) — Gateway certifié SOC 2 Type II, audit logs pré-formatés.
- **kong-ai-gateway-mcp** (inbound · other) — Extension MCP payante sur Kong AI Gateway (self-hosted Enterprise + hybrid Konnect).

### Collections de subagents et registries

- **wshobson-claude-agents** (inbound · other) — Orchestration multi-agent pour Claude Code, focus coordination plutôt que volume brut. *Applicabilité Jarvis : pattern réutilisable quand Jarvis passera en mode multi-step agent.*
- **rshah515-claude-code-subagents** (inbound · other) — 165 subagents organisés en catégories SDLC.
- **lst97-claude-code-sub-agents** (inbound · other) — 33 subagents curés full-stack (frontend/backend/DevOps/design).
- **majiayu000-claude-skill-registry** (inbound · other) — Registry de skills mis à jour quotidiennement, dédupliqué, frontend web sur Vercel.

### Skills émergentes

- **signadot-validate-skill** (inbound · skill) — Skill `/signadot-validate` publié le 12 mai 2026 : Claude Code, Codex CLI et Cursor valident leurs changements contre un Kubernetes production-like avant de rendre la main.

### Specs et infrastructure officielle

- **mcp-registry-official** (inbound · other) — Registry MCP officiel gouverné par la Linux Foundation's Agentic AI Foundation. Backbone (vérification namespaces, root authority) plutôt que portail de discovery.
- **mcp-triggers-spec** (inbound · other) — Spec MCP Triggers (SEP-1686) dans la roadmap 2026. *Applicabilité Jarvis : permettrait de remplacer les observers asyncio par des events MCP poussés.*

### Add-ins productivité

- **claude-managed-agents-addins** (outbound · connector) — Le pilier "Add-ins" annoncé à Code with Claude 2026. Excel/Word/PowerPoint en GA, Outlook en beta publique depuis le 7 mai 2026. *Applicabilité RTE Malakoff : Excel + PowerPoint quotidiens, à tester pour briefer le train Vente.*

## Mises à jour notables (41 bumps)

Tous bumpés à `2026-05-13` après vérification croisée des sources :

- **Office add-ins en GA** : claude-for-excel, claude-for-word, claude-for-powerpoint (GA 7 mai), claude-for-outlook (beta publique 7 mai).
- **Code with Claude features** : claude-managed-agents, claude-managed-agents-dreaming, claude-managed-agents-outcomes, claude-managed-agents-multiagent — les 5 piliers annoncés en mai 2026.
- **AWS MCP en GA** : aws-mcp-server (GA 6 mai 2026).
- **SDKs vivants** : anthropic-sdk-python (xhigh effort, cache pricing), anthropic-sdk-typescript, claude-agent-sdk-python (deferred hook decisions, strict MCP config), claude-agent-sdk-typescript.
- **Claude Code core** : claude-code-cli (v2.1.129 skill budget, v2.1.139 /goal), claude-code-vscode, claude-code-jetbrains, claude-code-routines.
- **Skills / cookbook core** : anthropic-skills-repo (push 9 mai), claude-cookbooks (push 12 mai).
- **Subagents collections actives** : voltagent-awesome-claude-code-subagents, 0xfurai-claude-code-subagents, pentest-ai-agents.
- **Directories MCP vivants** : modelcontextprotocol-servers, awesome-mcp-servers-punkpeye, wong2-awesome-mcp-servers, pulsemcp-directory, mcp-so-directory, mcpmarket-directory, mcpservers-org.
- **Marketplaces plugins** : claude-plugins-official, claudemarketplaces-directory, buildwithclaude-marketplace, aitmpl-plugins-directory, chat2anyllm-awesome-claude-plugins, knowledge-work-plugins.
- **Specs MCP** : mcp-2026-roadmap (Streamable HTTP, Tasks SEP-1686, Triggers, OAuth 2.1), mcp-tasks-spec.
- **MCP servers vérifiés actifs** : mcp-thomson-reuters-cocounsel (expansion 2026), mcp-higgsfield (lancé 29 avril 2026), mcp-proxyman.
- **Cowork** : cowork (la plateforme elle-même, plugins ouverts en open source).

## Archivages

**Aucun archivage ce run.** Aucune entrée n'a dépassé les 90 jours d'inactivité — le seuil d'archivage doux. Le seed initial du catalogue date du 1er mai 2026, donc même les plus anciennes entrées (last_seen = 1er mai pour 4-5 items) restent largement dans la fenêtre fraîche.

## Ce qui n'a pas pu être couvert

- **Workato Marketo MCP** (avril 2026, lead/activity ops + program ops) — mentionné dans la presse marketing mais sans page produit officielle consultable, pas d'install_hint fiable → laissé pour un run ultérieur.
- **EPAM × Anthropic partnership** (mai 2026) — partenariat de services, pas un outil unitaire à cataloguer. Skip volontaire (filtre dur "outil maintenu", pas annonce business).
- **Blackstone/Hellman/Goldman Sachs Enterprise AI JV** — idem, joint-venture financière, pas un outil.
- **SpaceX Colossus 1 / Anthropic compute partnership** — partenariat compute, pas un outil à catalogue.
- **Discussions r/ClaudeAI top du mois** — bruit trop élevé, signal trop dispersé pour un run automatisé (à reprendre en mode manuel si une tendance forte émerge).
- **GitHub stars / commits récents** sur les forks subagent : pas de vérification individuelle des compteurs, sélection basée sur la visibilité presse + résultats de recherche. Filtre "≥ 100 stars + activité 6 mois" appliqué de manière qualitative, pas chiffrée.

## Notes pour le prochain run

- Surveiller la sortie d'**Claude for Outlook GA** (sortie de beta) et bumper en conséquence.
- Suivre l'évolution de **MCP Triggers** (SEP-1686) — si la spec se stabilise, ouvrir un thread sur la réécriture des observers Jarvis.
- Le **registry officiel MCP** est jeune (gouvernance Linux Foundation récente) — vérifier qu'il devient effectivement le backbone canonique vs les directories communautaires.
- Suspect : encore aucun connecteur **MCP CRM** dédié à Microsoft Dynamics dans le catalogue alors que Malakoff Humanis tourne dessus. Investiguer au prochain run.
