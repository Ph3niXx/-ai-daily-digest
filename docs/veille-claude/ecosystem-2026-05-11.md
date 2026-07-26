# Catalogue écosystème Claude — 2026-05-11

## Compteurs du run

- **Entrées vues / vérifiées** : ~100 outils traversés à travers 8 web searches ciblés (Anthropic skills repo, awesome MCP servers, Cowork plugins, Agent SDK release notes, Opus 4.6 launch, Cloudflare 13 MCP servers, Agent Teams + Mailbox Protocol, Claude Flow/Ruflo, popular skills Q1-Q2 2026)
- **Ajoutées (vraiment nouvelles)** : **9**
- **Mises à jour** (`last_seen` bumpé sans toucher le reste) : **96** (les 9 inserts + 87 UPDATEs ciblés sur entrées vérifiées)
- **Archivées** : **0** (aucune entrée active > 90 jours dans le catalogue — le seuil n'a jamais été franchi car les runs quotidiens précédents ont systématiquement reset les compteurs)
- **Total catalogue après run** : 260 entrées, 100 % `active`

## Nouveautés notables

| Slug | Direction · Type | Pourquoi c'est nouveau |
|---|---|---|
| `claude-code-agent-teams` | outbound · agent_runtime | Feature officielle Claude Code v2.1.32+ lancée avec Opus 4.6 en février 2026. Mailbox Protocol = fichiers JSON sous `~/.claude/teams/inboxes/`, peer-to-peer entre subagents sans process en arrière-plan. Pierre angulaire du pattern multi-agents Claude 2026, mérite une entrée distincte de `claude-managed-agents-multiagent` (qui est l'équivalent cloud côté Managed Agents). |
| `ruflo-claude-flow` | outbound · agent_runtime | Anciennement Claude Flow, renommé Ruflo par rUv. 31k+ stars, 6000+ commits, plateforme open-source d'orchestration multi-agents la plus adoptée de l'écosystème (84.8% SWE-bench, 75% d'économie d'API). v3.6 sortie 2026-04-29. |
| `voltagent-awesome-claude-code-subagents` | inbound · skill | Collection 100+ subagents focalisée pur Claude Code, distincte de `voltagent-awesome-skills` du même éditeur (qui est cross-IDE). |
| `0xfurai-claude-code-subagents` | inbound · skill | Collection concurrente directe : 100+ subagents production-ready par domaine (dev, infra, sec, data). |
| `pentest-ai-agents` | inbound · skill | 28 subagents Claude Code spécialisés offensive security (recon, web app, AD, cloud, mobile, wireless, social engineering, exploit chaining, forensics, malware). Cas d'école d'une suite verticale empaquetée. |
| `gstack-skill` | inbound · skill | Skill très adopté de Garry Tan (YC) : 117k installs hebdo selon Composio. Pattern intéressant pour structurer des skills cockpit en équipes plutôt qu'en prompts monolithiques. |
| `remotion-skill` | inbound · skill | Skill Claude Code lancé en février 2026 autour de Remotion (framework React video-as-code). Bien noté début 2026. Possibilité d'usage : recap vidéo hebdo Jarvis (sport+musique+gaming). |
| `mcp-cloudflare-bindings` | inbound · mcp_server | Composant spécifique du paquet Cloudflare des 13 MCP servers d'avril 2026, focalisé sur D1/R2/KV pour développer des Workers. Mérite une entrée distincte du `mcp-cloudflare` général (qui couvre l'API catalog complet). |
| `mcp-google-calendar` | inbound · mcp_server | Serveur MCP officiel Google for Developers distinct du `mcp-google-workspace`. Compagnon naturel des autres serveurs Google managés (Drive, BigQuery, Ads). |

## Archivages

Aucun. La requête de détection (`last_seen < CURRENT_DATE - INTERVAL '90 days' AND status = 'active'`) ne renvoie aucune entrée.

Le catalogue a été initialisé fin avril 2026 et a reçu des runs de maintenance quotidiens depuis, donc le seuil 90j n'a structurellement pas pu être atteint pour le moment. Première opportunité réelle d'archivage : ~fin juillet 2026 (90 jours après le seed).

## Notes sur la couverture du run

- **Sources couvertes via WebSearch** : Anthropic skills repo, Claude Code changelogs (Releasebot, code.claude.com), awesome MCP servers listings, Cowork plugin marketplace, Agent SDK release notes (Python + TypeScript), Claude Managed Agents updates (mai 2026), Opus 4.6 launch features, Cloudflare 13 MCP servers, IDE integrations (VS Code, JetBrains, etc.), CLI alternatives comparison, top community skills repos (ComposioHQ, VoltAgent, alirezarezvani, etc.).
- **Sources non couvertes ce run** : r/ClaudeAI top du mois (non scrappé directement), repos privés enterprise, marketplaces paywallés. Pas d'impact attendu sur la qualité du run vu la richesse des sources publiques.
- **Filtre qualité appliqué** : tous les inserts ont une source identifiable (URL canonique ou article de référence vérifiable), un repo/produit actif sur les 6 derniers mois, et un vendor connu (ou explicitement `null` quand non trouvable). Aucune supposition inventée pour les champs manquants.
- **Cap respecté** : 9 inserts + 87 refreshes = 96 lignes touchées (sous le plafond 60 inserts, sous tout plafond raisonnable de refreshes).

## Décisions user préservées

Toutes les colonnes `status`, `user_priority`, `is_pinned`, `user_notes` ont été laissées strictement intactes — l'UPSERT n'écrit que sur les champs catalogue (`name`, `description`, `source_url`, `vendor`, `type`, `direction`, `install_hint`, `applicability`, `tags`, `last_seen`).
