# Veille catalogue écosystème Claude — 2026-05-18

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées vues (couvertes par la recherche) | ~70 |
| Entrées catalogue avant run | 340 |
| Entrées catalogue après run | **348** |
| Vraiment nouvelles (INSERT) | **8** |
| Mises à jour (slug existant — bump `last_seen`) | **48** |
| Archivées | 0 (aucune entrée n'a dépassé 90 jours sans visite — la plus ancienne `last_seen` était au 2026-05-01) |
| Items touchés aujourd'hui (INSERT + UPDATE) | **56** |
| Items toujours actifs et > 90 jours sans visite | 0 |

> Le catalogue est très frais : aucun item n'avait dépassé le seuil d'archivage soft (>90 jours), donc l'étape 3 du brief s'est résumée à bumper les entrées dont la vitalité a été reconfirmée pendant la recherche web.

## Nouveautés ajoutées (8)

| slug | direction | type | 1 ligne |
|---|---|---|---|
| `rube-mcp` | inbound | mcp_server | Serveur MCP Composio qui agrège 500+ apps SaaS (Gmail, Slack, Notion, Linear…) derrière une seule auth OAuth — pourrait remplacer plusieurs MCP individuels du cockpit. |
| `pensyve` | inbound | cowork_plugin | Runtime mémoire universelle offline (SQLite + ONNX, courbe d'oubli FSRS, pas de clé API), avec plugin Claude Code (7 commandes, 4 skills, 2 sous-agents). |
| `claude-mem` | inbound | cowork_plugin | Plugin de mémoire persistante très star (46K⭐) — capture chaque session, compresse et ré-injecte le contexte. Multi-agents (Claude Code, Codex, Gemini, Hermes, Copilot, OpenCode). |
| `supermemory-claude` | inbound | cowork_plugin | Intégration Supermemory (hébergée) pour Claude Code — mémoire long-terme partagée entre outils (Cursor, ChatGPT, Claude Code). |
| `base-mcp` | inbound | mcp_server | Serveur MCP officiel Coinbase pour interagir avec Base Network (L2 Ethereum) — onchain + Coinbase API. |
| `longport-mcp` | inbound | mcp_server | Serveur MCP LongPort pour données marchés actions temps réel + capacités de trading. Top trending MCP finance mai 2026. |
| `claudepluginhub-directory` | inbound | other | Annuaire tiers (claudepluginhub.com) qui agrège marketplaces, plugins, skills, MCP servers, sous-agents — complémentaire de buildwithclaude.com. |
| `claude-for-creative-work` | inbound | other | Umbrella Anthropic du 28 avril 2026 qui regroupe les 9 connecteurs créatifs (Adobe, Blender, Ableton, Autodesk Fusion, Splice, SketchUp, Affinity, Resolume) + partenariats curriculum RISD / Ringling / Goldsmiths. |

## Mises à jour notables (sélection — 48 au total)

Tous les éléments ci-dessous ont été reconfirmés vivants pendant la recherche et bumpés à `last_seen = 2026-05-18`. Liste non exhaustive — focus sur les plus visibles :

- **Repos officiels Anthropic** : `anthropic-skills-repo` (dernier update 2026-05-15, ~136K⭐), `claude-cookbooks`, `claude-agent-sdk-python` (v0.2.139+ avec hook event streaming), `claude-agent-sdk-typescript` (déprécation V2 session API, option `skills` dans `ClaudeAgentOptions`), `claude-agent-sdk-go`.
- **SDKs core** : `anthropic-sdk-python` (~0.40+), `anthropic-sdk-typescript` (~0.35+).
- **Connecteurs créatifs Anthropic (release du 28-04-2026)** : `mcp-adobe`, `mcp-blender`, `mcp-ableton`, `mcp-autodesk-fusion`, `mcp-splice`, `mcp-sketchup`, `mcp-resolume`, `mcp-affinity`.
- **Connecteurs entreprise** : `mcp-cloudflare` + `mcp-cloudflare-bindings` (13 nouveaux serveurs remote en avril 2026), `mcp-figma` (serveur officiel), `mcp-sentry`, `mcp-neon`, `mcp-asana`, `mcp-shortcut`, `mcp-plane`, `mcp-smartsheet`, `mcp-wrike` (tous officiels entre fév. et avr. 2026), `mcp-linear`, `mcp-slack`, `mcp-vercel`, `mcp-atlassian`, `mcp-hubspot`, `mcp-google-workspace`, `mcp-playwright` (~30K⭐, #2 du classement).
- **Claude Managed Agents (annonce 06-05-2026 à Code w/ Claude SF)** : `claude-managed-agents`, `claude-managed-agents-dreaming` (research preview), `claude-managed-agents-outcomes` (public beta), `claude-managed-agents-multiagent` (public beta), `claude-managed-agents-webhooks` (public beta).
- **Spécifications + registres** : `agent-client-protocol` (ACP de Zed, en pleine expansion via le registre live), `mcp-apps-spec` (interfaces UI MCP, partenaires Amplitude/Asana/Box/Canva/Clay/Figma/Hex/Monday/Slack/Salesforce), `mcp-registry-official`.
- **IDE / agent runtimes** : `claude-code-cli`, `zed-editor` (Zed 1.0 sorti 2026-04-29), `opencode`.
- **Frameworks SDK** : `vercel-ai-sdk` (v6 avec abstractions agent natives), `langchain-claude`, `llamaindex-claude`.
- **Marketplaces / directories** : `buildwithclaude-marketplace` (512+ extensions), `knowledge-work-plugins`.

## Archivages (0)

Aucun item à archiver. Le catalogue n'a aucune entrée dont `last_seen` dépasse 90 jours (plus ancienne : 2026-05-01, soit 17 jours).

## Couverture & limites du run

- **Sources explorées** :
  - Repos officiels : `github.com/anthropics/skills`, `anthropics/anthropic-cookbook`, `anthropics/claude-cookbooks`, `anthropics/knowledge-work-plugins`, SDKs Python / TypeScript / Go / Agent SDK Python+TS+Go (Releases pages).
  - Directories MCP : `punkpeye/awesome-mcp-servers`, `modelcontextprotocol/servers`, `wong2/awesome-mcp-servers`, `tolkonepiu/best-of-mcp-servers`, mcpmarket.com leaderboard.
  - Marketplaces plugins Cowork : buildwithclaude.com, claudemarketplaces.com, claudepluginhub.com (nouveau).
  - Annonces produit Anthropic : Claude Managed Agents (dreaming / outcomes / multiagent / webhooks), Claude for Creative Work, Code w/ Claude SF 2026.
  - Intégrations IDE : Zed (ACP), VS Code, JetBrains, Cursor, Continue, Aider, Neovim, Warp, Xcode, Emacs.
  - Frameworks tiers : LangChain, LlamaIndex, Vercel AI SDK, Haystack, DSPy, semantic-kernel, Mastra, CrewAI, LangGraph, Pydantic AI, agno.

- **Non couvert / à investiguer plus tard** :
  - **r/ClaudeAI top du mois** : pas accédé pendant ce run (Reddit hors WebSearch fiable). À reprendre en bash avec `praw` si la routine se réveille dessus.
  - **Forks marginaux** : volontairement écartés (< 100⭐ ou pas de commit depuis 6 mois).
  - **Bots Claude-powered tiers** (Slack/Discord/Linear/Notion) : pas de nouveauté notable détectée depuis le run précédent ; la dernière revue exhaustive remonte à fin avril.
  - **MCP servers de niche financière** : `massive-mcp`, `xpaysh/awesome-x402` repérés mais pas ajoutés (vendor encore peu lisible, à valider au prochain run).
  - **Bump de masse non effectué** : seuls les ~50 items dont la vitalité a été explicitement reconfirmée par la recherche ont vu leur `last_seen` bouger. Les ~290 autres restent sur leur `last_seen` antérieure — pas un problème tant qu'on est loin du seuil de 90 jours.

## Notes opérationnelles

- Le snapshot initial de `claude_ecosystem` (340 lignes) dépassait la limite de tokens du connecteur MCP Supabase, contourné en lisant le dump JSON via bash + Python pour ne garder que `(slug, last_seen)`.
- Cap haut du brief (60 outils/run) **respecté** : 56 items touchés (8 INSERT + 48 UPDATE).
- Aucune décision user (`status`, `user_priority`, `is_pinned`, `user_notes`) n'a été touchée — l'`ON CONFLICT DO UPDATE` ne référence pas ces colonnes.

---

*Run généré automatiquement par la routine Cowork mensuelle "catalogue ecosystem". Source du brief : `uploads/SKILL.md`. Pour modifier les sources ou la fréquence, voir `docs/cowork-routines/catalogue-ecosystem.md`.*
