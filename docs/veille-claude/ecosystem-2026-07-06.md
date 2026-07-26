# Veille écosystème Claude — 2026-07-06

## Chiffres

- Entrées vues (catalogue total en base avant run) : **456** actives, 0 archivées.
- Ajoutées (vraiment nouvelles) : **0** — pas de slug inédit détecté cette semaine.
- Mises à jour (slug existant, `last_seen = 2026-07-06`) : **60**.
- Archivées : **0** (aucune entrée > 90 jours sans revue, catalogue jeune).

## Contexte du run

Le catalogue `claude_ecosystem` compte déjà 456 outils actifs, et aucun n'a plus de 90 jours d'ancienneté depuis sa dernière revue. Cap du run = 60 outils/run (règle du skill). J'ai donc choisi de refresh en priorité **la couche cœur** (SDKs officiels, IDE, protocole, MCP servers piliers, plugins Anthropic à forte adoption) plutôt que de rejouer une inspection exhaustive redondante.

Sur les sources scannées cette semaine (repo `anthropics/skills`, marketplaces plugins, awesome-mcp-servers, releases SDKs, MCP spec 2026-07-28 RC, IDE benchmarks, r/ClaudeAI top mois), **aucun outil identifié n'était absent du catalogue** : la table est déjà très complète (plugins scientifiques, skills métier, marketplaces communautaires, gateways, MCP servers verticaux). Rien à ajouter côté INSERT ce run.

## Mises à jour notables (60 slugs bumpés)

Cœur Anthropic (`anthropic-skills-repo`, `claude-plugins-official`, `claude-cookbooks`, `claude-code-cli`, `claude-desktop`, `claude-in-chrome`, `cowork`, `claude-partner-hub`, `claude-for-excel`, `claude-for-powerpoint`) — toutes vérifiées actives en juillet 2026 (release Claude Code v2.1.199 le 2 juillet, Cowork plugins étendus en février 2026, Partner Hub officialisé le 3 juin 2026, add-ins Office en GA depuis mai 2026).

SDKs officiels — 8 langages maintenus : Python, TypeScript (v0.110.0), Java, Go, Ruby, C#, PHP + `ant-cli`. Agent SDK Python + TypeScript actifs (renommé depuis Claude Code SDK fin 2025, sessions/hooks/subagents à parité).

Protocole & spec — `mcp-registry-official`, `mcp-2026-roadmap`, `mcp-spec-2026-07-28-rc` (finalisation le 28 juillet 2026, stateless core, extensions framework), `mcp-apps-spec` (UIs iframe sandbox), `mcp-tasks-spec`, `agents-md-spec`, `agentskills-spec` (open standard depuis décembre 2025, ~40 adopteurs listés en juin 2026), `agent-client-protocol` (Zed's ACP).

IDE & CLI — `claude-code-vscode`, `claude-code-jetbrains`, `cursor-editor` (2.0 avec agents parallèles), `cursor-cli`, `windsurf-editor` **rebrandé Devin Desktop le 2 juin 2026** (les deux slugs coexistent en base, à consolider dans un futur run avec review manuelle), `devin-desktop`, `zed-editor` (1.0 stable le 29 avril 2026).

MCP servers piliers (17) — `mcp-linear`, `mcp-notion`, `mcp-slack`, `mcp-github`, `mcp-atlassian`, `mcp-supabase`, `mcp-postgres`, `mcp-figma`, `mcp-canva`, `mcp-hex`, `mcp-asana`, `mcp-monday`, `mcp-hubspot`, `mcp-salesforce`, `mcp-sentry`, `mcp-neon`, `mcp-vercel`. `modelcontextprotocol-servers` (repo canonique) + `context7-mcp` (le plus installé côté docs live).

Frameworks & providers outbound — `langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk`, `openrouter-claude-provider`, `litellm`.

Skills / plugins Anthropic à forte adoption — `skill-creator` (skill officiel), `plugin-frontend-design` (~829k installs en juin 2026, plus installé du directory).

## Archivage doux

**Aucune archivage** ce run : la requête `last_seen < CURRENT_DATE - INTERVAL '90 days' AND status='active'` renvoie **0 ligne**. Le catalogue est trop jeune pour avoir des entrées dormantes ; le check redeviendra pertinent quand des tools cesseront d'être touchés pendant > 90 jours.

## Ce qui n'a pas pu être couvert

- **r/ClaudeAI top du mois** : pas de scraping direct de Reddit possible (contenu communautaire, souvent lien-only sans fiche produit stable). Les tools émergents notables cités dans les threads sont déjà catalogués (SuperClaude, Claude Flow, MultiClaude, subagent collections). Rien de nouveau détecté.
- **Repos privés / paywall** : non couverts par principe (source_url doit rester canonique et vérifiable).
- **Consolidation `windsurf-editor` ↔ `devin-desktop`** : les deux slugs pointent maintenant sur le même produit (rebranding juin 2026). Décision utilisateur nécessaire pour merger (archiver `windsurf-editor` ou garder les deux pour historique). Non fait automatiquement pour préserver `user_priority`/`user_notes` éventuels.
- **Skills communautaires massifs** (`alirezarezvani/claude-skills` avec 337 skills, `mohitagw15856/pm-claude-skills` avec 400 skills, `AgentCoffee006/claude-skills-collection-2026`) : les *collections* sont déjà en base au niveau repo. Ne pas éclater slug par skill individuel (le catalogue perdrait sa granularité utile — un skill ≠ un outil).
- **Trends prix / capabilities** : hors scope de ce catalogue, à traquer via un autre pipeline (veille éditoriale, pas répertoire).

## Prochaines actions suggérées (manuel)

1. Choisir si `windsurf-editor` doit être archivé au profit de `devin-desktop` (rebranding officiel confirmé).
2. Prochain run : bumper une autre tranche de 60 slugs pour éviter la stagnation de `last_seen` sur les 396 items non touchés cette semaine (rotation naturelle sur 6-7 runs).
3. Envisager d'ajouter un champ `stars_at_last_seen` ou `commits_at_last_seen` pour tracer la santé quantifiée des repos (au-delà du binaire actif/archivé).
