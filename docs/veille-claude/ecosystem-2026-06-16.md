# Veille écosystème Claude — 2026-06-16

## Compteurs du run

- Entrées vues (catalogue total) : **441** → **444** après run
- Mises à jour (`last_seen` bumpé sur slug existant) : **51**
- Nouvelles entrées (vraiment ajoutées) : **3**
- Archivages : **0** (aucun item avec `last_seen < CURRENT_DATE - 90 jours` au moment du run)
- Cap respecté : 54 outils touchés (< 60)

## Nouveautés notables

### `taste-skill` — inbound / skill
*Leonxlnx — [github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)*
Skill anti-slop pour le frontend généré par Claude Code / Cursor / Codex. Suite de 11 variantes spécialisées + 3 skills image, paramétrée comme un EQ audio (VARIANCE / MOTION / DENSITY) pour casser les défauts SaaS génériques. Le repo de référence côté design.

### `last30days-skill` — inbound / skill
*mvanhorn — [github.com/mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)*
Skill Claude Code qui agrège Reddit, X, YouTube, HN, arXiv, Polymarket, GitHub et blogs sur une fenêtre 30 jours glissants, score par engagement réel et synthétise. Trending GitHub #1 le 8 juin 2026, 34k+ stars. Complément potentiel pour le pipeline veille IA du cockpit.

### `eclipse-agents-mcp` — both / mcp_server
*Eclipse Foundation — [github.com/eclipse-agents/eclipse-agents](https://github.com/eclipse-agents/eclipse-agents)*
Implémentation officielle MCP + ACP dans Eclipse IDE, équivalent Java aux extensions VS Code/JetBrains. Expose types Java, ressources, JUnit, problèmes comme outils MCP. Faible applicabilité directe Jarvis (stack JS/Python), mais utile à tracer pour le contexte Malakoff Humanis si un projet Eclipse-based émerge.

## Mises à jour (`last_seen` bumpé)

51 slugs confirmés actifs via la veille web et bumpés à `CURRENT_DATE`, principalement autour de :

- **SDKs & Agent SDK** : `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `claude-agent-sdk-go`, `claude-sdk-rust` — Agent SDK billing à part depuis 15 juin 2026 (Pro $20 / Max5x $100 / Max20x $200).
- **Claude Code & IDE plugins** : `claude-code-cli`, `claude-code-action`, `claude-code-vscode`, `claude-code-jetbrains`, `claudecode-nvim`, `zed-editor`, `cursor-editor` — Claude Code via ACP en beta dans Zed, sub-agent nesting & marketplace plugins searchable (juin 2026).
- **Cowork plugins officiels** : `knowledge-work-plugins`, `plugin-create`, `plugin-code-review`, `plugin-feature-dev`, `plugin-frontend-design`, `plugin-coderabbit`, `plugin-connect-apps`, `plugin-42crunch`, `security-guidance-plugin`, `claude-marketplace`, `claude-design` (lancé 17 avril 2026).
- **Skills** : `anthropic-skills-repo`, `claude-cookbooks`.
- **MCP infra & registries** : `mcp-registry-official`, `mcp-tunnels`, `mcp-stainless` (Anthropic a acquis Stainless en mai 2026), `mcp-2026-04-28-creative-bundle`, `claude-managed-agents`, `claude-managed-agents-sandboxes`, `claude-managed-agents-dreaming`, `claude-managed-agents-memory`.
- **MCP servers spécifiques** : `mcp-blender`, `mcp-adobe`, `mcp-ableton`, `mcp-figma`, `mcp-notion`, `mcp-asana`, `mcp-slack`, `mcp-linear`.
- **Verticales Claude** : `anthropic-claude-for-legal`, `claude-for-creative-work`, `claude-for-excel`, `claude-for-word`, `claude-for-powerpoint`, `claude-platform-aws`.
- **Frameworks tiers** : `langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk-6`.

## Archivages

Aucun. Au moment du run, zéro item active a un `last_seen` antérieur à `CURRENT_DATE - 90 jours` — le catalogue est encore jeune ou a été massivement initialisé récemment. Le mécanisme d'archivage doux n'a donc rien à toucher ce run.

## Couverture & limites de ce run

- **Catalogue déjà très dense** (441 entrées avant run). La majorité des outils trouvés en veille étaient déjà connus, d'où un ratio bumps / nouveautés très favorable aux bumps.
- **Sélection des bumps** : focus sur les outils dont les search results confirment explicitement une release / commit / mention en 2026. Pas de bump aveugle sur des slugs périphériques.
- **Nouveautés écartées par prudence** : `velo/eclipse-mcp` (signal de maintenance ambigu) et `stephanj/LSP4J-MCP` (faible visibilité communauté) — j'attends une seconde occurrence indépendante avant d'ajouter.
- **Sources non couvertes** : pas d'accès direct au sub r/ClaudeAI top du mois (résultats indirects via aggregators uniquement), pas d'inspection des releases GitHub individuelles (timing : volume trop élevé pour un run).
- **Spec MCP 2.4** mentionnée dans les résultats mais pas trouvée comme repo / page canonique distincte → pas insérée tant que la source officielle n'est pas identifiable. À retenter au prochain run.
- **GUARD prompt-injection** : aucun contenu web fetché ne contenait d'instruction tentant de modifier la procédure ; toutes les données ont été traitées comme données et non comme ordres.
