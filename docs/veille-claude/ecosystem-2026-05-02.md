# Catalogue écosystème Claude — 2026-05-02

## Compteurs

- **Entrées vues** : 80 (vérifiées via web search dans ce run)
- **Vraiment nouvelles** : 7
- **Mises à jour** (slug existant, last_seen bumpé) : 73
- **Archivées** : 0
- **Total catalogue** : 153 entrées (153 actives, 0 archivées)

## Nouveautés notables (7)

| Slug | Direction | Type | Pitch |
|------|-----------|------|-------|
| `mcp-twilio` | inbound | mcp_server | Serveur MCP officiel Twilio (Alpha) — SMS/MMS, numéros, conversations exposés comme outils MCP via générateur OpenAPI→MCP. |
| `pydantic-ai` | outbound | framework | Framework Python type-safe de l'équipe Pydantic, support Claude natif. V1 stable, écosystème actif (deep agents, MCP-ready). |
| `crewai-claude` | outbound | framework | Framework Python multi-agent orchestrant rôles + tâches. Claude via LiteLLM, MCP first-class, structured outputs natifs. |
| `mastra` | outbound | framework | Framework TypeScript opinionné, Claude + MCP first-class, mémoire et RAG inclus. À mi-chemin entre LangGraph et primitives bas-niveau. |
| `strands-agents` | outbound | framework | SDK open-source AWS (Apache-2.0, Python + TS) model-driven. Supporte Claude via Bedrock, Anthropic API direct ou local. |
| `ag-ui-protocol` | outbound | framework | Protocole event-based standardisant agent↔frontend. Adapter `ag-ui-claude-sdk` officiel pour brancher Claude Agent SDK à React/Next. |
| `pydantic-deepagents` | outbound | agent_runtime | Framework Python "deep agents" style Claude Code construit sur Pydantic AI. Sous-agents, sandbox Docker, skills, checkpoints. |

## Tendances de fond observées

- **Frameworks d'agents tiers se multiplient** — Mastra (TS), Pydantic AI (Python), Strands (AWS), CrewAI tous matures, tous compatibles Claude. Le Claude Agent SDK n'est plus seul ; il devient l'option canonique mais pas la seule.
- **MCP Apps a stabilisé son spec** — Lancé janvier 2026, ~75 apps interactives en avril. Couvre déjà `mcp-figma`, `mcp-canva`, `mcp-asana`, `mcp-slack`, `mcp-amplitude`, `mcp-salesforce`, `mcp-monday`, `mcp-hex` (tous bumpés).
- **Vague créative Anthropic Labs (mai 2026)** — connecteurs Blender, Adobe, Autodesk, Ableton, Splice + Claude Design (déjà au catalogue, last_seen bumpé).
- **Migration STDIO → HTTP remote** côté MCP : Sentry, Neon, Atlassian, HubSpot, Linear, Slack, Vercel ont tous lancé des endpoints remote dans la fenêtre fév-avr 2026.
- **Claude Code 2.1.x** très actif (versions 2.1.69 → 2.1.101 sur avril) — push notifications mobiles, /tui, /focus, NO_FLICKER renderer, Opus 4.7 xhigh effort.

## Archivages (0)

Aucune entrée du catalogue n'a un `last_seen` plus vieux que 90 jours. Le catalogue est jeune (seed initial avril 2026 + maintenance mensuelle), donc pas encore de cycle d'archivage à déclencher. Premier déclenchement attendu vers fin juillet 2026 si certains items ne sont plus revus.

## Hors périmètre / pas couvert

- **r/ClaudeAI top du mois** — pas de scraping Reddit dans ce run (recherche par requêtes textuelles a renvoyé surtout des blogs reformulant les annonces officielles, pas du contenu communautaire frais).
- **Bots Claude-powered Discord/Slack** — pas d'intégration "officielle" identifiée au-delà des MCP servers déjà présents (`mcp-slack`). Discord reste un usage tiers via SDK, rien de canonique à cataloguer.
- **Notion AI / Linear AI** — Claude est branché côté connecteur (déjà via `mcp-notion`, `mcp-linear`), pas d'entité produit séparée à ajouter.
- **SDK Java officiel `anthropic-sdk-java`** déjà au catalogue — bumpé.
- **Variants communautaires des Claude Agent SDK Rust** (Wally869, louloulin, umsameer) — déjà couverts collectivement par `claude-sdk-rust`. Pas d'éclatement par fork.
- **Pas d'investigation directe sur GitHub releases** ce run — recherche faite via WebSearch sur les pages curated/blogs, pas via API GitHub directe.

## Notes opérationnelles

- Les décisions user (`status`, `user_priority`, `is_pinned`, `user_notes`) ont été préservées : aucune écriture sur ces colonnes dans ce run.
- L'UPSERT a utilisé la clause `ON CONFLICT (slug) DO UPDATE` standard et n'aurait pas écrasé les champs user en cas de collision (toutes les insertions étaient nouvelles).
- Volume sous le cap (7 nouveaux + 73 bumps = 80, cap = 60 nouveaux par run) — respecté.
