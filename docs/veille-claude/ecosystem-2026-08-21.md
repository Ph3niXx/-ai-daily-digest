# Veille écosystème Claude — 2026-08-21

## Chiffres

- **Catalogue total** : 516 entrées (513 avant run + 3 ajouts)
- **Vues / rafraîchies aujourd'hui** : 74 slugs (last_seen = 2026-08-21)
- **Ajoutées ce run** : 3 (`claude-sonnet-5`, `claude-academy`, `anthropic-files-api`)
- **Mises à jour** (bump last_seen sur slug existant) : 71
- **Archivées** : 0
- **Dormants revérifiés vivants** : 2 (`abordage-awesome-mcp`, `microsoft-learn-mcp`) → last_seen reset

Le catalogue est déjà très dense (513 items pré-run), le cap 60 par run et la garde-fous « ne pas ré-insérer les slugs connus » font que ce cycle est surtout un rafraîchissement ciblé sur les items les plus visibles dans la veille d'août 2026.

## Nouveautés notables (net-new)

- **`claude-sonnet-5`** (outbound / model, Anthropic) — sorti le 30 juin 2026. Positionné comme le Sonnet le plus agentique à date (planification multi-étapes, browser/terminal, self-verification, meilleure recherche agentique sur gros codebases). Tarif $2/$10 par million de tokens rendu permanent le 10 août 2026. Impact projet : à envisager en remplacement de Haiku 4.5 sur `weekly_analysis.py` quand le budget le permet.
- **`claude-academy`** (outbound / other, Anthropic) — hub d'apprentissage lancé en août 2026 : cours, tutoriels, badges, recos personnalisées. Peut alimenter l'axe « montée en compétences IA » du cockpit (radar).
- **`anthropic-files-api`** (outbound / other, Anthropic) — Files API généralement disponible sur le Claude API en août 2026, plus besoin du beta header. Compatible Fable 5 / Mythos 5 / Opus 5 / Sonnet 5 / Opus 4.8. Utile pour envoyer les PDF Train Vente ou dashboards Jarvis directement à Claude.

## Signaux de fond captés (déjà en base, seulement last_seen bumpé)

- **MCP 2026-07-28 spec** est bien la release majeure de l'été : passage à un protocole request/response stateless (deploy serverless/edge possible), OAuth 2.0 / OIDC natif, MCP Apps et Tasks passés en extensions versionnées. Le compteur Anthropic annonce 950+ MCP servers dans le connectors directory et 400M downloads SDK/mois (×4 sur l'année).
- **Agent Skills GA** (Skills API sans beta header), portable sur ~40 produits (Codex, Copilot, Cursor, Gemini CLI, VS Code…) depuis juin 2026.
- **Managed Agents** enrichis : contrôle allowed_domains/blocked_domains pour web_search/web_fetch, skill/plugin security scanning pour Enterprise, self-hosted environments en public beta.
- **Marketplace plugins Claude Code** : 101 plugins en mars 2026 (33 Anthropic + 68 partenaires : GitHub, Playwright, Supabase, Figma, Vercel, Linear, Sentry, Stripe, Firebase), continue à s'étoffer.
- **IDE** : Cursor a ajouté un plugin JetBrains en mars 2026 + Composer 2 pour tâches multi-fichiers. Zed a une PR native pour Claude Code sur le même protocole IDE (WebSocket MCP) que VS Code/JetBrains.

## Archivages

Aucun ce cycle. Les deux items en état dormant (>90j) — `abordage-awesome-mcp` et `microsoft-learn-mcp` — ont été revérifiés côté web : tous deux actifs (repo `abordage/awesome-mcp` auto-updated quotidiennement, `microsoftdocs/mcp` GA depuis nov 2025, spec 2026-07-28 supportée). Leur `last_seen` a été bumpé à aujourd'hui.

## Limites / ce qui n'a pas été couvert

- Le catalogue est à 516 items. Le cap 60/run et la règle « bumper, pas ré-insérer » impliquent que la couverture par run est nécessairement partielle. Les 442 slugs non-touchés aujourd'hui ne sont pas suspects pour autant : ils repasseront quand la veille les recroise.
- Reddit r/ClaudeAI : la recherche n'a pas remonté de tool tiers vraiment nouveau et > 100 stars pour août 2026 — surtout des comparatifs Cursor/Claude Code/Copilot déjà catalogués.
- Betterworks MCP v0.74.0 (11 août 2026) et Impala MCP philanthropique (19 août 2026) volontairement écartés : niche, hors périmètre RTE/Jarvis.
- Aucune vérification programmatique fine-grain repo-par-repo (activité < 6 mois) faite sur les 442 slugs non-touchés : le filtre qualité s'applique surtout aux net-new, la présence d'un slug déjà en base atteste qu'il a passé le filtre au moment de son insertion.
- Sources paywall (rapports analyst tiers) non lues.
