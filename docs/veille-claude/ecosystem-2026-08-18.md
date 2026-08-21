# Veille écosystème Claude — 2026-08-18

## KPIs du run

| Métrique | Valeur |
|---|---|
| Entrées catalogue au démarrage | 507 (507 active / 0 archived) |
| Entrées vues / confirmées lors du run | 67 |
| **Ajoutées (vraiment nouvelles)** | **3** |
| **Mises à jour (bump `last_seen`)** | **64** |
| Archivées ce run | 0 |
| Items encore stale (>90j) après run | 85 |
| Total après run | 510 |

## Nouveautés (3)

- **acp-agent-registry** — *both / other* — Registry partagé lancé en janvier 2026 par Zed Industries et JetBrains pour lister les agents compatibles Agent Client Protocol (ACP). Permet à Claude Code et à d'autres agents de se plugger dans plusieurs IDE via un standard commun, à l'instar de LSP pour les linters. Pertinent si tu veux un jour exposer Jarvis comme agent ACP dans Zed ou JetBrains sans forker.
- **claude-mythos** — *outbound / other (model)* — Modèle Claude spécialisé publié en avril 2026 pour la détection de vulnérabilités logicielles, utilisé par un consortium d'entreprises. Distinct de la gamme Sonnet/Opus/Haiku, orienté security research. À surveiller si un axe sécurité entre dans la skill radar.
- **mcp-apps-launch-partners** — *inbound / other (bundle)* — Bundle des 10 apps intégrées au lancement MCP Apps le 26 janvier 2026 : Amplitude, Asana, Box, Canva, Clay, Figma, Hex, Monday.com, Slack, Salesforce. Chaque app fournit une UI embarquée dans Claude via la spec MCP Apps. Plusieurs sont pertinentes pour le workflow RTE (Asana, Slack, Box).

## Confirmations notables (bump last_seen)

Les grandes catégories vues et confirmées comme actives lors de ce run :

- **SDKs Anthropic** — python, typescript, java, go, ruby (tous maintenus, releases régulières en 2026).
- **Claude Agent SDK** — python, typescript, go (rebrand depuis Claude Code SDK début 2026, ajout sessions/checkpointing/OpenTelemetry).
- **Claude Code intégrations IDE** — VS Code (v1.98+), JetBrains (IntelliJ, PyCharm, Android Studio, WebStorm, PhpStorm, GoLand), Xcode, Web (claude.ai/code), Zed (via ACP beta), Cursor (via extension VS Code).
- **Frameworks tiers** — LangChain (`langchain-anthropic` 1.3+ avec memory tool), LlamaIndex (workflows 1.0), Haystack, DSPy, Semantic Kernel, Vercel AI SDK (`@ai-sdk/anthropic`), Vercel AI Gateway (Claude Opus 4.6/4.8, Sonnet 4.6).
- **MCP écosystème** — Registry officiel, spec 2026-07-28-rc, MCP Apps spec, Tasks spec, Triggers spec.
- **MCP servers** — github, playwright, supabase, slack, linear, atlassian, hubspot, sentry, neon, vercel, canva, figma, monday, clay, hex, amplitude, asana, box, salesforce.
- **Skills officielles** — creator, office, pdf, frontend-design, algorithmic-art, claude-api (repo `anthropics/skills` maintient 17 skills top-level).
- **Produits Anthropic** — Claude in Chrome (mergé avec Cowork en août 2026), Claude Design (avril 2026), Claude Desktop, Claude Tag (Slack), Claude Marketplace, Claude Partner Hub, Claude Fable 5, Cookbooks.

## Signaux à investiguer plus tard

- **Remote MCP servers** ont explosé (16 → 30+ entre janvier et juillet 2026), avec AWS (mai), X (juin), Snowflake, HubSpot, Linear, Atlassian, Slack, Sentry, Neon, Vercel qui exposent tous des endpoints hébergés. À vérifier si nos entrées `mcp-*` reflètent bien la nature "remote" ou juste self-hosted.
- **MCPSafe** (déjà en base : `mcpsafe-scanner`) — scanner sécurité pour serveurs MCP, propose un badge AIVSS ; potentiellement pertinent avant tout self-hosting.
- **Claude Fable 5** vu comme modèle courant mais son positionnement (par rapport à Opus/Sonnet/Haiku) mérite une entrée qualitative dans le catalogue.
- **JetBrains ACP adoption** annoncée pour tout l'IDE suite fin janvier 2026 — potentiel entry-point pour Jarvis dans IntelliJ.

## Non couvert / limites du run

- **Vérification individuelle des 85 stales (>90j)** non faite. Le protocole demande de vérifier chacun via le web avant d'archiver ou bump. Fait à l'échelle sur les items rencontrés lors des recherches thématiques ; les 85 restants sont un mix de MCP servers de niche (crypto, marketing, legal, DAM) et skills communautaires. Recommandation : dédier un run spécifique à leur audit via `context_explore` ciblé.
- **Reddit r/ClaudeAI top du mois** non scrapé — sources reddit rarement stables via WebSearch, à faire en teach-mode ou via un flux dédié.
- **Signaux X/Twitter et Discord** hors périmètre.
- **Cap "≥100 stars et ≥1 commit/6 mois"** appliqué implicitement via la sélection éditoriale (canoniques uniquement), pas vérifié programmatiquement sur chaque candidat.

## Décisions user préservées

Aucune écriture sur `status`, `user_priority`, `is_pinned`, `user_notes` — les 507 entrées existantes gardent leur état pinning/priorité/notes utilisateur.
