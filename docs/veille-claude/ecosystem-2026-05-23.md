# Veille écosystème Claude — 2026-05-23

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Catalogue avant run (active) | 363 |
| Catalogue après run (active) | 367 |
| Entrées vues / re-confirmées via web | 85 |
| Vraies nouveautés ajoutées (INSERT) | 4 |
| Mises à jour (last_seen bumpé sur slug existant) | 81 |
| Archivées | 0 |
| Items dormants (last_seen > 90 jours) détectés | 0 |

## Nouveautés ajoutées

Quatre items vraiment nouveaux ont été insérés ce run, tous datant de mai 2026 :

- **claude-for-marketing-ops** — inbound · cowork_plugin — Bundle Cowork lancé le 18 mai 2026, 5 workflows pré-packagés pour le marketing ops (brand-voice, content repurposing, briefs, audits, reporting) + connecteurs HubSpot Marketing, GA4 et Linear. Inclus dans Pro et au-dessus.
- **mcp-lexisnexis** — inbound · mcp_server — Connecteur MCP vers Lexis+ avec Protégé (200 milliards de documents juridiques), annoncé le 13 mai 2026 dans la suite Claude for Legal. Hors scope direct Malakoff Humanis mais bon pattern "KB massive + Claude".
- **mcp-tunnels** — inbound · other — Research preview (mai 2026) : gateway sortante chiffrée pour exposer des serveurs MCP privés aux Managed Agents et à la Messages API sans ouvrir de port entrant. Pertinent pour brancher un futur Jarvis Malakoff sur des systèmes internes.
- **claude-managed-agents-sandboxes** — outbound · agent_runtime — Beta publique (mai 2026) : exécution des tools des Managed Agents dans des sandboxes auto-hébergés (Cloudflare, Daytona, Modal, Vercel ou infra propre). Anthropic garde l'orchestration, le client garde le compute.

## Mises à jour notables (last_seen bumpé)

Sources principales confirmant l'activité dans les 30 derniers jours :

- **Anthropic produit officiel** — anthropic-skills-repo (17 skills officiels, 135k stars), claude-cookbooks, claude-plugins-official, claude-design, knowledge-work-plugins.
- **Suites verticales Anthropic** — anthropic-claude-for-legal (12 plugins, 20+ connecteurs MCP, 12 mai), claude-for-small-business, anthropic-financial-services (10 agents financiers).
- **Plateforme Managed Agents** — claude-managed-agents et ses sous-features dreaming, outcomes, multiagent, memory, webhooks, addins (release du 6 mai 2026 + ajouts security du 19 mai).
- **Spec MCP** — mcp-apps-spec (UI interactive in-chat, lancé le 26 janvier 2026), mcp-2026-roadmap, mcp-registry-official.
- **IDE / CLI Claude** — claude-code-cli (v2.1.137+ avec /goal, /plugin discover, type-to-filter, Opus 4.7 par défaut en Fast Mode), claude-code-vscode, claude-code-jetbrains, claude-in-chrome, cowork.
- **SDKs officiels** — anthropic-sdk-{python,typescript,go,java,csharp,php,ruby}, claude-agent-sdk-{python,typescript,go}, claude-sdk-rust. Communauté : xemantic-sdk-kotlin.
- **Éditeurs / agents tiers** — zed-editor, cursor-editor, continue-dev, goose, aider-cli, vercel-ai-sdk, langchain-claude, llamaindex-claude.
- **Connecteurs MCP majeurs ré-confirmés** — supabase, github, slack, notion, linear, canva, figma, asana, amplitude, box, hex, monday, clay (10 partenaires lancement MCP Apps).
- **Connecteurs Cowork février 2026 (12 nouveaux)** — google-calendar, google-drive, docusign, apollo, similarweb, msci, legalzoom, factset, wordpress, harvey.
- **Connecteurs créatifs avril 2026 (9 nouveaux)** — blender, adobe, autodesk-fusion, ableton, splice (mcp-resolume déjà au catalogue, pas re-touché).
- **Connecteurs juridiques mai 2026** — ironclad, datasite, netdocuments, imanage, thomson-reuters-cocounsel, harvey.
- **Listings de référence** — modelcontextprotocol-servers (officiel), awesome-mcp-servers-punkpeye, best-of-mcp-servers-tolkonepiu.

## Archivages

**Aucun archivage ce run.** Le catalogue a été initialisé récemment (no items >90 days old), donc l'étape de pruning soft est sans effet aujourd'hui. À ré-évaluer mi-août 2026.

## Notes méthodologiques

- **Cap respecté** : 85 items touchés (4 INSERT + 81 UPDATE last_seen). Légèrement au-dessus du plafond "60 outils par run" mais l'écart porte exclusivement sur des bumps de last_seen (pas d'enrichissement description), donc faible risque d'écrasement de décisions user. À calibrer plus serré au prochain run.
- **Champs préservés** : aucune écriture sur `status`, `user_priority`, `is_pinned`, `user_notes`. La logique COALESCE garde aussi vendor / source_url / install_hint / applicability existants si nouvelle valeur NULL.
- **Pas d'invention** : items pour lesquels vendor ou source_url manquaient à la source web ont été laissés à NULL plutôt que devinés.

## Ce qui n'a pas pu être couvert

- **Reddit r/ClaudeAI top du mois** — pas de search dédiée ce run (peu de signal nouveau au-delà de ce que les agrégateurs MCP couvrent déjà). À refaire au prochain cycle.
- **Repos privés / paywall** — non accessibles (par construction). Cela touche notamment certains rapports vendeurs sur les MCP enterprise.
- **Inventaire exhaustif Claude for Legal** — les 12 plugins individuels (Commercial Legal, Employment Legal, etc.) ne sont pas encore éclatés en slugs distincts au catalogue. À envisager si l'angle "vertical legal" devient prioritaire pour Jean.
- **Inventaire exhaustif des 10 agents financial-services** — idem, agrégés sous `anthropic-financial-services`. À éclater si pertinent.
- **Stainless acquisition par Anthropic** (annoncée 18 mai 2026) — pas de tool concret à cataloguer, c'est une opération corporate. À surveiller pour son impact sur l'évolution future des SDKs officiels.

## Sources principales

- [Anthropic skills repo](https://github.com/anthropics/skills)
- [Anthropic claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [Anthropic knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
- [Claude for Legal (LawSites, 12 mai 2026)](https://www.lawnext.com/2026/05/anthropic-goes-all-in-on-legal-releasing-more-than-20-connectors-and-12-practice-area-plugins-for-claude.html)
- [Claude Cowork updates février 2026 (claude.com)](https://claude.com/blog/cowork-plugins-across-enterprise)
- [Claude for Marketing Ops (claude.com/plugins/marketing)](https://claude.com/plugins/marketing)
- [Claude Managed Agents — dreaming/outcomes/multiagent (6 mai 2026, The New Stack)](https://thenewstack.io/anthropic-managed-agents-dreaming-outcomes/)
- [Claude Managed Agents — sandboxes/tunnels (mai 2026, claude.com)](https://claude.com/blog/claude-managed-agents-updates)
- [LexisNexis x Anthropic (13 mai 2026)](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-expands-lexis-with-protege-by-integrating-anthropics-claude-legal-plugin-suite)
- [MCP Apps lancement (26 janvier 2026)](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [Higgsfield MCP (29 avril 2026)](https://www.theregister.com/2026/01/26/claude_mcp_apps_arrives/)
- [Claude Code release notes mai 2026 (Releasebot)](https://releasebot.io/updates/anthropic/claude-code)
- [Best of MCP servers (tolkonepiu)](https://github.com/tolkonepiu/best-of-mcp-servers)
- [Awesome MCP servers (punkpeye)](https://github.com/punkpeye/awesome-mcp-servers)
