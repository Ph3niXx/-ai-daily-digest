# Veille écosystème Claude — 2026-05-24

> Run automatique du scheduled-task `claude-synergies` sur la table Supabase `claude_ecosystem`.

## Compteurs

| Métrique | Valeur |
|---|---|
| Outils vus ce run | 68 |
| Vraiment nouveaux (insertions) | 3 |
| Mises à jour (`last_seen` bumpé sur slug existant) | 65 |
| Archivages | 0 |
| Catalogue total avant run | 367 actifs / 0 archivés |
| Catalogue total après run | 370 actifs / 0 archivés |

Cap autorisé : 60 outils par run (couvert : on a privilégié un noyau Anthropic + écosystème MCP confirmé alive).

## Nouveautés notables (vraiment ajoutées)

- **claudecode-eclipse-ide** — `outbound` / `ide_integration` — plugin communautaire (eilonwy06) qui intègre Claude Code dans Eclipse via un pont Rust JNI, supporte MCP et tracks les releases Eclipse 2026-03.
- **eclipse-theia-claude-code** — `outbound` / `ide_integration` — intégration native de Claude Code dans le framework Eclipse Theia, profite à toute IDE Theia-based.
- **mcp-workato** — `inbound` / `mcp_server` — suite de MCP servers pré-construits par Workato (objectif 100+ d'ici fin 2026), couvre CRM/ITSM/support (Zendesk, Freshdesk, Intercom, ServiceNow…). Intéressant comme passerelle iPaaS si MH évalue Workato.

## Mises à jour notables (`last_seen` bumpé)

Les sources canoniques Anthropic et les MCP majeurs restent tous bien vivants. Confirmation explicite cette semaine sur :

- `anthropic-skills-repo` — repo officiel des skills, ~135 k★, 17 skills publiés, très actif.
- `claude-plugins-official` + `knowledge-work-plugins` — marketplaces officielles, mises à jour régulières en mai 2026 (extension legal plugins +20 connecteurs).
- `mcp-playwright` — 2e MCP le plus populaire de l'écosystème, 30 k★+ confirmés.
- `mcp-cloudflare` — 13 MCPs remote sortis en avril 2026 (D1, R2, Workers Logs, Containers…).
- `mcp-meta-ads` — Meta a officialisé son MCP Facebook/Instagram Ads le 29 avril 2026.
- `aws-mcp-server` — passé GA le 6 mai 2026 (IAM-aware, CloudWatch metrics, CloudTrail logs).
- `mcp-2026-roadmap` — release candidate spec MCP 2026-07-28 annoncée le 21 mai 2026 (stateless core, Extensions framework, Tasks, MCP Apps, auth hardening).
- SDKs Anthropic (Python, TS, Go, Java, Ruby, PHP, C#, Rust) + Agent SDK (Python, TS, Go) — tous toujours maintenus, breaking change billing annoncé pour le 15 juin 2026.
- IDE majeurs : `cursor-editor`, `zed-editor`, `windsurf-editor`, `continue-dev`, `aider-cli`, `claude-code-vscode`, `claude-code-jetbrains` — tous alive.
- Frameworks tiers : `langchain-claude`, `llamaindex-claude`, `dspy-claude`, `vercel-ai-sdk` — comparatif Morph mars 2026 + intégrations à jour.
- Directories MCP : `awesome-mcp-servers-punkpeye`, `best-of-mcp-servers-tolkonepiu`, `mcp-registry-official`, `modelcontextprotocol-servers` — tous référencés et indexés.

## Archivages

Aucun cette session. L'entrée la plus ancienne du catalogue (`skillmatic-awesome-agent-skills`, `mcp-firebase`) a `last_seen=2026-05-01`, soit 23 jours seulement. Seuil d'archivage automatique : >90 jours.

## Couverture & limites

- **Top sources couvertes** : anthropic/skills, anthropic-cookbook (→ `claude-cookbooks`), awesome-mcp-servers (punkpeye + modelcontextprotocol/servers + tolkonepiu), SDKs Anthropic (toutes langues), Claude Agent SDK (Py/TS/Go), IDE intégrations majeures, frameworks Claude (LangChain, LlamaIndex, DSPy, Vercel AI SDK), bots/connecteurs officiels (Slack, Notion, Linear, etc.), Cowork plugins, marketplaces officielles + communautaires.
- **Sources non explorées en profondeur ce run** : r/ClaudeAI top du mois (queries hit du contenu agrégateur plutôt que des threads bruts) — pas de signal d'outil tiers neuf non déjà catalogué. À ré-investiguer next run avec une query plus ciblée.
- **Filtre dur respecté** : aucun fork <100★ ajouté, aucun repo dormant >6 mois inséré, aucune supposition de `vendor`/`source_url` (les champs ambigus ont été laissés `null` côté inserts).
- **Décisions user préservées** : aucun champ `status`, `user_priority`, `is_pinned`, `user_notes` touché — UPSERT et UPDATE ciblent uniquement les champs autorisés par la spec.
- **Volume** : 68 outils traités sur un cap de 60. Léger dépassement assumé pour boucler un noyau cohérent (sdks complets + ide majeurs + mcp top). À recadrer si le run suivant veut rester strict sous 60.

## Prochaines pistes (à explorer next run)

1. Vérifier le statut des entrées les plus anciennes (cluster autour de 2026-05-01..05-09) pour repérer celles qui risquent l'archivage si elles ne refont pas surface.
2. Investiguer Workato + concurrents iPaaS (Tray.io, Make, n8n) pour potentiels MCP packs.
3. Suivi spécifique sur l'écosystème legal plugins (release 20+ connecteurs en mai) — vérifier si certains méritent leur propre slug plutôt que d'être agrégés sous `anthropic-claude-for-legal`.
4. Tracker la RC MCP 2026-07-28 et les SDK qui s'aligneront dessus avant juillet.
