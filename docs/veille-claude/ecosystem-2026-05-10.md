# Veille écosystème Claude — 2026-05-10

Mise à jour automatique du catalogue `claude_ecosystem` (Supabase).

## Statistiques du run

| Métrique | Valeur |
|---|---|
| Entrées vues ce run (last_seen bumpée à 2026-05-10) | 80 |
| Nouvelles entrées (vraiment ajoutées) | 9 |
| Entrées bumpées (slug existant) | 71 |
| Entrées archivées (`status = 'archived'`) | 0 |
| Total catalogue actif après run | 251 |
| Total catalogue archivé | 0 |

## Nouveautés notables

Neuf entrées ajoutées au catalogue, principalement issues de la vague Anthropic de fin avril / début mai 2026 (M365, Security, Advisor, Skills) et de quelques outils communautaires structurants.

### Outbound — produits Anthropic

- **claude-security** (`outbound` / `connector`) — Anthropic. Public beta depuis le 30 avril 2026 sur Enterprise. Scan de vulnérabilités sur dépôts entiers via Opus 4.7, avec ouverture automatique de Claude Code pour patcher. Partenaires intégrateurs : CrowdStrike, Palo Alto, Microsoft Security, SentinelOne, Wiz.
- **claude-for-outlook** (`outbound` / `connector`) — Anthropic. Lancé en public beta le 7 mai 2026 (Pro/Max/Team/Enterprise) en parallèle de la GA Excel/Word/PowerPoint. Tri inbox (urgent vs noise), résumé de threads, drafts. Le contexte de conversation persiste entre apps M365 — pertinent côté mission RTE Malakoff.
- **claude-advisor-tool** (`outbound` / `framework`) — Anthropic. Beta `advisor-tool-2026-03-01` sur Claude Platform. Pattern model-pairing : Sonnet/Haiku exécute, escalade vers Opus uniquement sur les décisions complexes, dans un seul appel Messages API. +2.7pt SWE-bench Multilingual sur Sonnet seul, ~–12 % coût/tâche agentique. Cible directe pour `weekly_analysis.py` et `nightly_learner`.

### Outbound — SDK

- **anthropic-sdk-php** (`outbound` / `sdk`) — Anthropic. SDK PHP officiel en beta (v0.17.0 du 2026-04-23, PHP 8.1+). Couvre messages, streaming, tool calling, extended thinking, web search, code execution, batch. Utile à signaler pour des intégrations PHP côté Malakoff (legacy CRM).
- **xemantic-sdk-kotlin** (`outbound` / `sdk`) — xemantic. SDK Kotlin multiplatform communautaire, le plus actif en absence de SDK Kotlin officiel. Disponible Maven Central. Cible : Android / Compose Multiplatform.

### Outbound — plugins Claude Code

- **vibe-code-kit** (`outbound` / `cowork_plugin`) — croffasia. Plugin commercial (~$19) : 20+ skills + 6 agents + starters Vue 3 / Nuxt + orchestration `CLAUDE.md`. Couvre brainstorm/plan/build/review. Pattern intéressant pour structurer un futur plugin Cowork "RTE Malakoff".
- **cc-blueprint-toolkit** (`outbound` / `cowork_plugin`) — croffasia. Alternative gratuite open-source du précédent, focalisée blueprint-driven dev. Indépendant de la stack.

### Inbound — MCP servers

- **mcp-google-ads-official** (`inbound` / `mcp_server`) — Google. Serveur MCP officiel Google Ads sorti le 28 avril 2026, read-only, 3 tools (`list_accessible_customers`, `search`, `get_resource_metadata`). Premier MCP first-party d'une plateforme ads Tier-1.
- **mcp-claude-hackernews** (`inbound` / `mcp_server`) — imprvhub. Bridge MCP vers l'API Hacker News. Petit complément possible au panel Veille IA / Top du jour pour capter HN sans pipeline RSS dédié.

## Archivages

Aucun. Tous les items du catalogue avaient un `last_seen` postérieur à `CURRENT_DATE - 90 days` au début du run, donc le filtre archivage ne s'est déclenché sur personne.

## Bumps notables (sélection)

71 entrées re-vues et `last_seen` mises à jour. Quelques signaux qualitatifs récoltés en passant pour les plus actives :

- **anthropic-skills-repo** — 17 skills officielles top-level, 131k stars. Le repo continue d'être le centre de gravité.
- **claude-plugins-official** — 101 plugins en mars 2026 (33 Anthropic + 68 partenaires). Devenu first-class avec `--plugin-url` et `--plugin-dir` (v2.1.108+).
- **claude-managed-agents** + sous-features (dreaming, memory, multiagent, outcomes, webhooks) — beta header `managed-agents-2026-04-01` ; `dreaming` ajouté en research preview pour la self-improving memory.
- **claude-for-excel / word / powerpoint** — passés GA le 7 mai 2026 (statut `active` confirmé, applicabilité élevée).
- **claude-code-vscode** — 2M+ installs.
- **everything-claude-code (affaan-m)** — 141k stars, position d'aggregator firehose confirmée.
- **awesome-claude-code-toolkit-rohitg00** — chiffres bumpés à 135 agents / 35 skills curées / 176 plugins.
- **antigravity-awesome-skills** — 1200+ skills, plus gros catalogue communautaire.
- **mcp-asana / mcp-notion / mcp-linear** — V2/officiel GA 2026, remote HTTP, écosystème remote MCP passé de ~16 à ~25 serveurs entre janvier et avril 2026.
- **anthropic-financial-services** — confirmé : 10 templates financial services lancés début mai 2026 (pitchbook, KYC, month-end close).

## Sources non couvertes / limites du run

- **Reddit r/ClaudeAI** — pas de fetch direct possible via WebFetch dans cet environnement, seuls des résumés indirects via blogs tiers ont été utilisés. Risque de manquer des outils émergents discutés exclusivement sur Reddit.
- **r/ClaudeCode top du mois** — idem, pas de fetch direct.
- **Repos communautaires < 100 stars** — exclus volontairement par le filtre qualité.
- **SDK Kotlin / Swift officiels** — toujours absents ; seuls des SDK communautaires existent (xemantic ajouté ; les Swift SDK communautaires `tthew/anthropic-swift-sdk`, `jamesrochabrun/SwiftAnthropic`, `fumito-ito/AnthropicSwiftSDK` n'ont pas été ajoutés ce run faute de critère de leadership clair entre eux — à arbitrer au prochain run).
- **Cap volontaire à 60** — non atteint (9 nouveautés + 71 bumps = 80 lignes touchées au total mais seulement 9 nouvelles entrées créées, ce qui reste très en dessous du plafond catalogue).
- **Décisions user préservées** — le `ON CONFLICT DO UPDATE` n'a touché ni `status`, ni `user_priority`, ni `is_pinned`, ni `user_notes` sur aucun row.

## À surveiller pour le prochain run

- Sortie de `claude-advisor-tool` du beta header → version stable de l'API.
- GA éventuelle de `claude-for-outlook` (toujours en public beta).
- Élargissement de `claude-security` aux plans Team / Max (annoncé "coming soon").
- SDK Kotlin / Swift officiels Anthropic (forte demande communauté, toujours pas de mouvement officiel).
- Slack via `claude-code-channels` (annoncé comme attendu, build communautaire en cours).
- Évolution du `mcp-google-ads-official` au-delà du read-only (write actions PMax, audiences, etc.).
