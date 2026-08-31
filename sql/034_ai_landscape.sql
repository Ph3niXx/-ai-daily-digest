-- Migration 034 — Panorama IA (table `ai_landscape`)
--
-- Troisième sous-onglet de "Veille outils". Distinct des deux tables voisines :
--   - `claude_veille`     : flux hebdo éphémère, classé en 4 buckets, périmé
--                           d'une semaine sur l'autre.
--   - `claude_ecosystem`  : catalogue pérenne *Claude-centré*, rangé par
--                           direction (inbound/outbound) et type technique
--                           (mcp_server, sdk, framework…). Aucune notion de prix.
--   - `ai_landscape` (ici): panorama du marché IA au sens large, rangé par
--                           **cas d'usage** et **modèle économique**, avec un
--                           axe de pertinence perso (core / context).
--
-- Pourquoi une table séparée plutôt qu'élargir `claude_ecosystem` — ADR-51 :
-- `direction: inbound/outbound` n'a aucun sens pour Midjourney, Veo ou Granola,
-- et les ~535 lignes existantes n'ont pas de prix (backfill manuel impossible à
-- tenir). Deux taxonomies incompatibles dans une même table = filtres qui
-- mentent. Cf. docs/architecture/decisions.md.
--
-- Sécurité :
--   - SELECT / INSERT / UPDATE pour authenticated (le user épingle, priorise,
--     écarte, annote, et peut ajouter une entrée à la main plus tard)
--   - La routine Cowork (passe 2 de "Catalogue écosystème Claude") écrit via
--     service_role en UPSERT massif ON CONFLICT (slug) DO UPDATE.
--
-- Le slug est l'identifiant stable de dédup (kebab-case). Le UNIQUE INDEX
-- garantit l'idempotence du run mensuel.
--
-- CONTRAT ROUTINE : `pricing_tier` et `pricing_note` sont les seuls champs
-- que la routine DOIT rafraîchir à chaque passage — c'est la donnée
-- périssable. Les champs `status`, `user_priority`, `is_pinned`, `user_notes`
-- ne sont JAMAIS touchés par la routine.

CREATE TABLE IF NOT EXISTS public.ai_landscape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,

  -- Rangement par cas d'usage (et non par nature technique)
  use_case TEXT NOT NULL
    CHECK (use_case IN (
      'code',           -- agents de code et CLI
      'claude_stack',   -- ce qui est déjà inclus dans l'abonnement Claude
      'mcp',            -- serveurs MCP
      'veille',         -- veille, lecture, recherche
      'llm_local',      -- modèles et runtimes locaux
      'orchestration',  -- automatisation, canevas visuels, frameworks d'agents
      'data',           -- bases, vectoriel, RAG
      'metier_rte',     -- cérémonies SAFe, réunions, Jira
      'carriere',       -- candidature, CV, suivi d'opportunités
      'image',
      'video',
      'voix',
      'bureautique',    -- slides, docs, tableur
      'navigateur',     -- agents navigateur et computer-use
      'observabilite',  -- traces et évaluation LLM
      'agent_perso',    -- agents personnels auto-hébergés
      'other'
    )),

  -- Pertinence perso : 'core' = terrain direct (cockpit, Jarvis, veille, RTE),
  -- 'context' = à savoir situer sans forcément l'utiliser.
  relevance TEXT NOT NULL DEFAULT 'context'
    CHECK (relevance IN ('core', 'context')),

  -- Modèle économique — l'axe absent de claude_ecosystem
  pricing_tier TEXT NOT NULL
    CHECK (pricing_tier IN ('free', 'freemium', 'paid')),
  pricing_note TEXT,

  vendor TEXT,
  source_url TEXT,
  description TEXT NOT NULL,
  applicability TEXT,   -- la ligne « chez toi »
  meta_note TEXT,       -- licence, étoiles, repère court
  tags TEXT[] NOT NULL DEFAULT '{}',

  added_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_seen DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dismissed', 'archived')),

  -- Décisions user — la routine n'y touche jamais
  user_priority TEXT
    CHECK (user_priority IN ('high', 'medium', 'low')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  user_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ail_use_case  ON public.ai_landscape(use_case);
CREATE INDEX IF NOT EXISTS idx_ail_pricing   ON public.ai_landscape(pricing_tier);
CREATE INDEX IF NOT EXISTS idx_ail_relevance ON public.ai_landscape(relevance);
CREATE INDEX IF NOT EXISTS idx_ail_status    ON public.ai_landscape(status);
CREATE INDEX IF NOT EXISTS idx_ail_pinned    ON public.ai_landscape(is_pinned) WHERE is_pinned = TRUE;

-- Trigger : updated_at auto-bump (même fonction que claude_ecosystem, dupliquée
-- pour que la migration reste auto-portante si 012 n'a pas encore tourné)
CREATE OR REPLACE FUNCTION public.ai_landscape_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_landscape_updated_at ON public.ai_landscape;
CREATE TRIGGER trg_ai_landscape_updated_at
  BEFORE UPDATE ON public.ai_landscape
  FOR EACH ROW EXECUTE FUNCTION public.ai_landscape_touch_updated_at();

-- RLS
ALTER TABLE public.ai_landscape ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.ai_landscape'::regclass AND polname = 'ail_select_authenticated'
  ) THEN
    CREATE POLICY ail_select_authenticated ON public.ai_landscape
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.ai_landscape'::regclass AND polname = 'ail_insert_authenticated'
  ) THEN
    CREATE POLICY ail_insert_authenticated ON public.ai_landscape
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.ai_landscape'::regclass AND polname = 'ail_update_authenticated'
  ) THEN
    CREATE POLICY ail_update_authenticated ON public.ai_landscape
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════
-- SEED — 99 entrées issues du panorama du 2026-08-31
--   83 outils (17 cas d'usage) + 8 serveurs MCP du kit recommandé
--   + 8 serveurs MCP de second cercle
-- Généré depuis les données du panorama, pas saisi à la main.
-- ON CONFLICT (slug) DO NOTHING : idempotent à la ré-exécution.
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO public.ai_landscape
  (slug, name, use_case, relevance, pricing_tier, pricing_note, description, applicability, meta_note, last_seen)
VALUES
  ('opencode', 'OpenCode', 'code', 'core', 'free', 'gratuit (BYOK) → 200 $', 'Agent CLI open source, agnostique du modèle. Premier du classement dev d’août 2026.', 'Un CLI agnostique te laisse basculer Gemini ↔ Claude selon le job sans réécrire ton workflow — exactement ta doctrine « Gemini = volume, Claude = intelligence ».', 'MIT · 75+ providers', CURRENT_DATE),
  ('claude-code', 'Claude Code', 'code', 'core', 'paid', '20 → 200 $/mois', 'Deuxième du classement, monté d’un rang. Tourne Opus 5, meilleur score WebDev Arena tous outils confondus.', 'Ce que tu utilises. Le point à ne pas rater cette année, ce sont les plugins et Skills posés par-dessus.', 'inclus Pro et Max', CURRENT_DATE),
  ('grok-cli', 'Grok CLI', 'code', 'core', 'free', 'gratuit (BYOK) ou SuperGrok', 'Agent CLI open source sur Grok 4.6. Subagents, plan mode, marketplace de plugins, support MCP.', NULL, 'open source · nouvelle entrée', CURRENT_DATE),
  ('cursor', 'Cursor', 'code', 'core', 'freemium', 'gratuit → 200 $', 'Recule au 3e rang malgré l’intégration de Grok 4.6 ; le classement cite l’incertitude liée à son actionnariat (SpaceX).', NULL, 'IDE complet', CURRENT_DATE),
  ('windsurf', 'Windsurf', 'code', 'core', 'freemium', 'gratuit → 60 $', 'Arena Mode et Plan Mode restent ses atouts. Tarification équilibrée, passée en modèle à quotas en mars 2026.', NULL, 'racheté par Cognition', CURRENT_DATE),
  ('gemini-code-assist', 'Gemini Code Assist', 'code', 'core', 'freemium', '180 000 complétions/mois offertes', 'De loin la couche gratuite la plus généreuse du marché sur la complétion.', 'Si tu veux de la complétion permanente sans toucher à ton budget API, c’est le choix par défaut.', 'le free tier le plus large', CURRENT_DATE),
  ('github-copilot', 'GitHub Copilot', 'code', 'core', 'freemium', 'gratuit · Pro 10 $/mois', 'Le free tier reste utile au quotidien ; Pro à 10 $ est le moins cher des plans complets.', NULL, '2 000 complétions + 50 chats', CURRENT_DATE),
  ('amazon-q-developer', 'Amazon Q Developer', 'code', 'core', 'freemium', 'gratuit · Pro 19 $', 'Sous-cote Copilot Business et Tabnine sur le plan pro.', NULL, '50 chats agentiques offerts', CURRENT_DATE),
  ('codex-cli', 'Codex CLI', 'code', 'core', 'freemium', 'Go 8 $ · Plus 20 $ · Pro 100 $', 'Le palier Go à 8 $, arrivé en juin 2026, ouvre l’entrée de gamme OpenAI.', NULL, 'CLI open source', CURRENT_DATE),
  ('aider-cline', 'Aider · Cline', 'code', 'core', 'free', 'gratuit (BYOK)', 'Techniquement gratuits, mais le coût est déplacé sur ta facture API.', NULL, 'open source', CURRENT_DATE),
  ('bolt-new', 'Bolt.new', 'code', 'core', 'freemium', '1 M tokens/mois offerts', 'Génération d’app web complète depuis le navigateur. Free tier réellement exploitable.', NULL, 'prototypage web', CURRENT_DATE),
  ('devin', 'Devin', 'code', 'core', 'paid', 'dès 20 $/mois', 'L’entrée de gamme est tombée à 20 $ avec Devin 2.0 ; le rachat de Windsurf lui a ajouté un IDE.', NULL, 'Devin Desktop', CURRENT_DATE),
  ('claude-cowork', 'Claude Cowork', 'claude_stack', 'core', 'paid', 'inclus dès Pro 20 $', 'Le troisième onglet du bureau Claude : il lit tes fichiers, exécute des tâches planifiées et te rend le travail fini. Absent du plan gratuit.', 'C’est l’endroit naturel pour tes routines récurrentes qui ne méritent pas un pipeline GitHub Actions.', 'research preview', CURRENT_DATE),
  ('agent-skills', 'Agent Skills', 'claude_stack', 'core', 'free', 'gratuit, tourne sur ton abo', 'Un dossier de Markdown et de scripts chargé à la demande. Fonctionne sur Claude.ai, Claude Code et l’API. Anthropic ne facture rien par skill.', 'Un Skill ne demande ni serveur ni credential. Pour beaucoup de tes automatisations, c’est le remplaçant d’un MCP à coût de contexte quasi nul.', '~600 skills en catalogue', CURRENT_DATE),
  ('plugins-claude-code', 'Plugins Claude Code', 'claude_stack', 'core', 'free', 'gratuit', 'Assemblage de skills, connecteurs, slash commands et sous-agents en un paquet installable.', 'Ton propre relevé du 31 août note le passage des 200 plugins — c’est le pan que ta veille n’a pas encore audité en détail.', '200+ au catalogue officiel', CURRENT_DATE),
  ('claude-in-chrome', 'Claude in Chrome', 'claude_stack', 'core', 'paid', 'inclus dans tout plan payant', 'Lit la page, clique, saisit, enchaîne sur plusieurs onglets. Enregistre des workflows répétitifs et les planifie.', NULL, 'Pro, Max, Team, Enterprise', CURRENT_DATE),
  ('claude-for-excel-word-powerpoint-outlook', 'Claude for Excel · Word · PowerPoint · Outlook', 'claude_stack', 'core', 'paid', 'inclus dans tout plan payant', 'Claude for Excel est cité comme le plus fiable du marché sur le raisonnement tableur et les formules longues.', 'Pour les extractions de capacité et de vélocité que tu manipules en tant que RTE, c’est déjà payé.', NULL, CURRENT_DATE),
  ('notebooklm', 'NotebookLM', 'veille', 'core', 'freemium', 'gratuit · Google AI Plus 4,99 $', 'Ne répond qu’à partir des fichiers déposés, donc invente très peu. Génère aussi des slides ancrées sur tes documents.', 'Le bon outil pour interroger ta doc d’archi et tes 30 specs d’onglets sans que le modèle brode.', '100 carnets · 50 sources · 50 chats/j', CURRENT_DATE),
  ('perplexity', 'Perplexity', 'veille', 'core', 'freemium', 'gratuit · Pro 20 $ · Max 200 $', 'Recherche web en temps réel avec citation des pages lues. À l’opposé de NotebookLM : source ouverte contre corpus fermé.', NULL, 'navigateur Comet inclus', CURRENT_DATE),
  ('firecrawl', 'Firecrawl', 'veille', 'core', 'freemium', 'freemium · OSS', 'URL → Markdown propre. Search, scrape, parse, crawl, map, interact — 26 outils, serveur MCP inclus.', 'Candidat direct au remplacement de ton parsing HTML côté Python, dont tu connais les ratés sur les summaries.', '85 000+ étoiles', CURRENT_DATE),
  ('inoreader', 'Inoreader', 'veille', 'core', 'freemium', 'gratuit généreux · Pro < Feedly', 'Meilleur remplaçant de Feedly en 2026 : 50 % de flux gratuits en plus et l’automatisation offerte là où Feedly la facture.', 'Utile comme filet : le 21 août, 17 de tes 43 flux étaient morts. Un lecteur tiers te donne un second signal sur la santé d’un flux.', NULL, CURRENT_DATE),
  ('feedly-leo', 'Feedly + Leo', 'veille', 'core', 'paid', '12,99 $/mois (8,25 $ en annuel)', 'L’assistant Leo filtre et priorise les flux. Le plus solide pour balayer 50+ sources vite.', NULL, NULL, CURRENT_DATE),
  ('readwise-reader', 'Readwise Reader', 'veille', 'core', 'paid', 'abonnement', 'RSS, newsletters, PDF, EPUB, transcripts YouTube et threads dans une même file. Orienté lecture profonde et surlignage.', NULL, 'export Obsidian · Notion', CURRENT_DATE),
  ('newsblur', 'NewsBlur', 'veille', 'core', 'paid', 'Premium Archive 99 $/an', 'A ajouté en 2026 un « Ask AI » par article (Claude, GPT, Gemini ou Grok) et un briefing quotidien personnalisé par thème.', NULL, NULL, CURRENT_DATE),
  ('qwen3-5-9b', 'Qwen3.5-9B', 'llm_local', 'core', 'free', 'gratuit · poids ouverts', 'Le seul modèle à tenir entièrement en VRAM sur 8 Go aux quatre tailles de contexte testées, 32K compris, et à monter à 200K+ sans effondrement.', 'Le meilleur candidat pour remplacer ton modèle Jarvis actuel sur la 5070.', 'Q4_K_M · 200K+ contexte', CURRENT_DATE),
  ('qwen2-5-coder-7b', 'Qwen2.5-Coder-7B', 'llm_local', 'core', 'free', 'gratuit · poids ouverts', 'La meilleure complétion de code de la classe 7B.', 'Le bon second modèle si tu veux que Jarvis touche au code sans appeler l’API.', '~5 Go en Q4 · ~50 tok/s', CURRENT_DATE),
  ('lfm2-5-8b-a1b', 'LFM2.5-8B-A1B', 'llm_local', 'core', 'free', 'gratuit · poids ouverts', 'MoE creux de Liquid AI, inhabituellement rapide sur petit matériel, raisonnement par étapes intégré, ~5 Go en Q4.', NULL, 'MoE 8,3B / 1,5B actifs · 128K', CURRENT_DATE),
  ('phi-4-14b', 'Phi-4 14B', 'llm_local', 'core', 'free', 'gratuit · poids ouverts', 'Cité comme le meilleur à 8 Go dans certains classements, mais la marge est mince — à vérifier sur ta machine avant d’y bâtir quelque chose.', NULL, 'serré sur 8 Go', CURRENT_DATE),
  ('lm-studio', 'LM Studio', 'llm_local', 'core', 'free', 'gratuit', 'Application de bureau : parcourir, télécharger, configurer, discuter. La meilleure UX pour tester des modèles.', 'Ce que tu utilises. Rien ne justifie d’en changer — en 2026 LM Studio et Ollama ont convergé, le choix relève du workflow, plus de la capacité.', 'catalogue Hugging Face', CURRENT_DATE),
  ('ollama', 'Ollama', 'llm_local', 'core', 'free', 'gratuit', 'Tourne comme un service exposant une API, pilotable depuis des scripts, des plugins IDE ou un front de chat.', NULL, 'service + API HTTP', CURRENT_DATE),
  ('llama-cpp', 'llama.cpp', 'llm_local', 'core', 'free', 'gratuit', 'Le contrôle bas niveau, quand la quantification et le placement des couches comptent plus que le confort.', NULL, 'le moteur sous les deux', CURRENT_DATE),
  ('jan-ai', 'Jan.ai', 'llm_local', 'core', 'free', 'gratuit', 'Alternative de bureau open source, proche de LM Studio dans l’esprit.', NULL, 'MIT', CURRENT_DATE),
  ('vllm', 'vLLM', 'llm_local', 'core', 'free', 'gratuit · OSS', 'Serveur d’inférence de production pour du multi-utilisateur à forte concurrence. Hors sujet sur une machine perso.', NULL, 'PagedAttention', CURRENT_DATE),
  ('n8n', 'n8n', 'orchestration', 'core', 'freemium', 'self-host gratuit · cloud payant', 'Le bon choix quand l’automatisation part d’un événement et que l’IA n’est qu’une étape. Nœuds code JavaScript et Python inclus.', 'Attention à la licence : l’auto-hébergement est libre pour un usage interne, mais revendre le service exige une licence.', '400+ intégrations', CURRENT_DATE),
  ('dify', 'Dify', 'orchestration', 'core', 'free', 'gratuit en self-host', 'Vraiment open source, sans restriction commerciale. Publie un chatbot en app web, en widget embarqué ou en API en un clic. RAG intégré.', 'Si un jour tu veux exposer un bout de Jarvis à quelqu’un d’autre, c’est le chemin le plus court — et la licence ne te bloquera pas.', 'Apache 2.0 · 136k étoiles', CURRENT_DATE),
  ('langflow', 'Langflow', 'orchestration', 'core', 'free', 'gratuit · OSS', 'Le canevas visuel le plus étoilé. Prototypage de chaînes, prompts, retrieval et outils sans écrire de framework.', NULL, '146k étoiles', CURRENT_DATE),
  ('flowise', 'Flowise', 'orchestration', 'core', 'free', 'gratuit · OSS', 'Atelier visuel façon LangChain. Fort sur le RAG, comme Dify.', NULL, '51k étoiles', CURRENT_DATE),
  ('langgraph', 'LangGraph', 'orchestration', 'core', 'free', 'gratuit · OSS', 'Orchestration par graphe : contrôle précis, points de reprise, pistes d’audit. Le choix des équipes en production.', NULL, 'a dépassé CrewAI début 2026', CURRENT_DATE),
  ('claude-agent-sdk', 'Claude Agent SDK', 'orchestration', 'core', 'free', 'gratuit · tokens à part', 'Anthropic uniquement, par choix de conception. Le plus direct si tu ne comptes pas changer de fournisseur.', NULL, 'Python · TypeScript · Go', CURRENT_DATE),
  ('pydantic-ai', 'Pydantic AI', 'orchestration', 'core', 'free', 'gratuit · OSS', 'Le meilleur choix Python pour du typage et de la validation sans orchestration lourde.', 'Tes pipelines sont en Python et tes sorties de modèle finissent en base — la validation de schéma est exactement ton point de friction.', 'Python typé', CURRENT_DATE),
  ('crewai', 'CrewAI', 'orchestration', 'core', 'free', 'gratuit · OSS', 'Orchestration multi-agents par rôles : chaque agent a une persona, des outils et une tâche. Mise en route très rapide.', NULL, 'rôles et équipes', CURRENT_DATE),
  ('mastra-vercel-ai-sdk', 'Mastra · Vercel AI SDK', 'orchestration', 'core', 'free', 'gratuit · OSS', 'Les deux références côté TypeScript.', NULL, 'TypeScript', CURRENT_DATE),
  ('pgvector', 'pgvector', 'data', 'core', 'free', 'gratuit · extension Postgres', 'Recherche vectorielle native dans Postgres. Pas de service supplémentaire, pas de synchronisation à maintenir.', 'Ton Supabase est déjà un Postgres avec RLS et sauvegardes. C’est le chemin le plus court vers le RAG Jarvis, et le moins coûteux en exploitation.', NULL, CURRENT_DATE),
  ('chroma', 'Chroma', 'data', 'core', 'free', 'gratuit · OSS', 'Base d’embeddings pensée pour le RAG local et les notebooks. Collections, métadonnées, test de retrieval en quelques lignes.', NULL, 'prototypes locaux', CURRENT_DATE),
  ('qdrant-weaviate', 'Qdrant · Weaviate', 'data', 'core', 'freemium', 'self-host gratuit · cloud payant', 'Auto-hébergeables, avec offre managée quand on ne veut plus opérer. Le palier au-dessus quand pgvector sature.', NULL, NULL, CURRENT_DATE),
  ('milvus', 'Milvus', 'data', 'core', 'free', 'gratuit · OSS', 'Pour l’échelle distribuée. Surdimensionné pour un cockpit personnel.', NULL, 'distribué', CURRENT_DATE),
  ('ragflow', 'RAGFlow', 'data', 'core', 'free', 'gratuit · OSS', 'Compréhension documentaire profonde : extraction de tableaux et de mise en page dans des PDF complexes, réponses sourcées.', NULL, 'GraphRAG · UI incluse', CURRENT_DATE),
  ('granola', 'Granola', 'metier_rte', 'core', 'freemium', 'gratuit limité · payant', 'Capture l’audio système en local. Aucun robot ne rejoint la visio, aucune invite d’enregistrement. Le gratuit verrouille les notes de plus de 30 jours.', 'Le seul modèle de capture qui passe généralement une revue interne en assurance, parce qu’aucun tiers n’entre dans la réunion.', 'Mac et Windows · sans bot', CURRENT_DATE),
  ('fathom', 'Fathom', 'metier_rte', 'core', 'freemium', 'gratuit illimité · payant', 'Le free tier le plus généreux de la catégorie : enregistrement, transcription et résumés illimités, sans limite de durée.', NULL, '5,0/5 sur 6 000+ avis G2', CURRENT_DATE),
  ('otter', 'Otter', 'metier_rte', 'core', 'freemium', 'Basic gratuit · payant', 'Meilleure précision brute de transcription et meilleure profondeur d’archive cherchable. En gratuit, les locuteurs restent anonymes.', NULL, '25 conversations en gratuit', CURRENT_DATE),
  ('atlassian-rovo', 'Atlassian Rovo', 'metier_rte', 'core', 'paid', 'inclus dans les plans Atlassian', 'Agents dans Jira pour la rédaction de tickets, les résumés et l’automatisation. Ils opèrent dans les mêmes permissions et la même piste d’audit qu’un assigné humain.', 'Le point qui compte pour un RTE : la piste d’audit. C’est ce qui rend l’agent défendable en comitologie SAFe.', 'beta ouverte le 25 février 2026', CURRENT_DATE),
  ('zoom-ai-companion', 'Zoom AI Companion', 'metier_rte', 'core', 'paid', 'inclus dans Zoom', 'Résumés, transcripts et enregistrements exposés à Claude depuis avril 2026.', 'Extraction d’actions de PI Planning sans réécouter trois heures d’enregistrement.', 'connecteur MCP officiel', CURRENT_DATE),
  ('jobscan', 'Jobscan', 'carriere', 'core', 'freemium', '5 scans/mois offerts · dès 49 $', 'La plateforme la plus complète : optimisation ATS, CV, lettres, suivi, profil LinkedIn, entraînement à l’entretien.', 'À réserver aux offres que ton Jobs Radar sort au-dessus de 7 — cinq scans par mois, c’est peu.', NULL, CURRENT_DATE),
  ('simplify-copilot', 'Simplify Copilot', 'carriere', 'core', 'free', 'gratuit', 'Remplit les formulaires de candidature automatiquement en te laissant la main.', NULL, 'extension navigateur', CURRENT_DATE),
  ('teal', 'Teal', 'carriere', 'core', 'freemium', 'gratuit', 'Suivi de pipeline illimité en gratuit. La brique de suivi la mieux notée.', NULL, NULL, CURRENT_DATE),
  ('huntr', 'Huntr', 'carriere', 'core', 'freemium', 'gratuit', 'CV de base illimités, deux CV ciblés par offre, export PDF inclus dans le gratuit.', NULL, NULL, CURRENT_DATE),
  ('nano-banana-pro', 'Nano Banana Pro', 'image', 'context', 'freemium', '3 images/jour offertes', 'Un modèle de frontière disponible gratuitement. Le meilleur rapport qualité / prix du marché aujourd’hui.', NULL, 'dans l’app Gemini', CURRENT_DATE),
  ('flux-2', 'FLUX.2', 'image', 'context', 'freemium', 'variante Dev open source', 'Remplace toutes les versions précédentes de FLUX. La variante Dev est auto-hébergeable.', NULL, 'sortie janvier 2026', CURRENT_DATE),
  ('midjourney', 'Midjourney', 'image', 'context', 'paid', '10 $ minimum, pas d’essai', 'Reste le choix des directeurs artistiques pour un rendu distinctif sans ingénierie de prompt.', NULL, 'V8.1 par défaut depuis le 10 juin 2026', CURRENT_DATE),
  ('leonardo', 'Leonardo', 'image', 'context', 'freemium', '150 crédits/jour offerts', 'Soit 30 à 50 images par jour gratuitement, sans filigrane.', NULL, 'sans watermark', CURRENT_DATE),
  ('stable-diffusion-local', 'Stable Diffusion local', 'image', 'context', 'free', 'gratuit', 'Aucun plafond de coût, mais ta 5070 devra choisir : soit l’image, soit Jarvis.', NULL, NULL, CURRENT_DATE),
  ('veo-3-1', 'Veo 3.1', 'video', 'context', 'paid', '0,75 $/s standard · 0,15 $/s Fast', 'Le seul à générer l’audio synchronisé nativement. Le palier Fast rend l’expérimentation abordable.', NULL, '4K · audio natif synchronisé', CURRENT_DATE),
  ('sora-2', 'Sora 2', 'video', 'context', 'paid', '0,10 $/s base · 0,30-0,50 $/s Pro', 'La meilleure simulation du monde physique. OpenAI a annoncé l’arrêt de l’API Sora 2 au 24 septembre 2026 — ne bâtis rien dessus.', NULL, 'API annoncée en fin de vie', CURRENT_DATE),
  ('kling-3-0', 'Kling 3.0', 'video', 'context', 'paid', '~3 $/vidéo', 'La meilleure économie d’accès pour de la production à l’unité.', NULL, NULL, CURRENT_DATE),
  ('runway-gen-4-5', 'Runway Gen-4.5', 'video', 'context', 'paid', 'Unlimited 76-95 $/mois', 'Coût prévisible pour un usage intensif. Imbattable en volume.', NULL, 'crédits, pas de facturation à la seconde', CURRENT_DATE),
  ('whisper-local', 'Whisper (local)', 'voix', 'context', 'free', 'gratuit', 'Le plancher gratuit de la transcription, exécutable sur ta machine sans rien envoyer nulle part.', NULL, NULL, CURRENT_DATE),
  ('wispr-flow', 'Wispr Flow', 'voix', 'context', 'freemium', '2 000 mots/semaine offerts · Pro 15 $', 'Dictée universelle dans toutes les applications, avec suppression des hésitations et mise en forme en temps réel.', NULL, '~94 % de précision · 100+ langues', CURRENT_DATE),
  ('superwhisper', 'Superwhisper', 'voix', 'context', 'paid', 'licence à vie 249,99 $', 'Pour les utilisateurs Mac qui veulent tous les modèles et refusent l’abonnement.', NULL, 'macOS', CURRENT_DATE),
  ('elevenlabs-scribe', 'ElevenLabs Scribe', 'voix', 'context', 'paid', 'à l’usage', 'Le meilleur sur fichier enregistré : séparation des locuteurs et étiquetage des événements sonores.', NULL, '99 langues · diarisation', CURRENT_DATE),
  ('deepgram', 'Deepgram', 'voix', 'context', 'paid', 'à l’usage', 'Transcription et pipelines voix de qualité industrielle, pensés pour être intégrés.', NULL, 'orienté développeur', CURRENT_DATE),
  ('gamma', 'Gamma', 'bureautique', 'context', 'freemium', 'crédits offerts en bloc unique · dès ~8 $/mois', 'Le plus rapide vers un deck web soigné. L’export .pptx demande une reprise de mise en page. Les crédits gratuits ne se rechargent pas.', NULL, 'watermark sur le gratuit', CURRENT_DATE),
  ('notebooklm-slides', 'NotebookLM (slides)', 'bureautique', 'context', 'free', 'gratuit', 'Génère des slides ancrées sur tes propres documents, donc factuellement tenues.', 'Pour un support de revue à partir de ta doc d’archi, c’est gratuit et ça n’invente pas.', NULL, CURRENT_DATE),
  ('julius-ai', 'Julius AI', 'bureautique', 'context', 'freemium', 'messages mensuels offerts', 'Transforme un Excel ou un CSV en analyses et graphiques. Le meilleur analyste no-code dédié.', NULL, NULL, CURRENT_DATE),
  ('claude-for-excel', 'Claude for Excel', 'bureautique', 'context', 'paid', 'inclus dans tout plan payant', 'Le plus fiable sur les feuilles longues et le raisonnement tableur, d’après les comparatifs 2026.', NULL, NULL, CURRENT_DATE),
  ('browser-use', 'Browser Use', 'navigateur', 'context', 'free', 'gratuit · MIT', 'La bibliothèque open source de référence pour l’automatisation navigateur pilotée par un modèle.', NULL, '95 000+ étoiles', CURRENT_DATE),
  ('kilo-code', 'Kilo Code', 'navigateur', 'context', 'free', 'gratuit · MIT', 'Panneau latéral IA agnostique du modèle. L’alternative open source à Claude in Chrome.', NULL, 'Chrome et Firefox', CURRENT_DATE),
  ('comet', 'Comet', 'navigateur', 'context', 'paid', 'inclus dans Perplexity', 'Navigateur agentique de Perplexity : recherche, résumés de page, recherche multi-onglets.', NULL, 'Opus 4.6 pour les abonnés Max', CURRENT_DATE),
  ('chatgpt-atlas', 'ChatGPT Atlas', 'navigateur', 'context', 'paid', 'arrêté', 'Le navigateur d’OpenAI a cessé de fonctionner. Mentionné pour éviter de le recommander par inertie.', NULL, 'hors service depuis le 9 août 2026', CURRENT_DATE),
  ('langfuse', 'Langfuse', 'observabilite', 'context', 'freemium', 'self-host gratuit · cloud payant', 'L’outil d’observabilité LLM open source le plus utilisé : traces, évaluations, gestion de prompts, métriques.', 'Tes pipelines tournent en cron sans personne devant. Sans traces, une panne se découvre des semaines plus tard — c’est exactement ce qui est arrivé au weekly.', 'Apache 2.0', CURRENT_DATE),
  ('mlflow', 'MLflow', 'observabilite', 'context', 'free', 'gratuit · OSS', 'Le seul à combiner licence ouverte, tracing d’agent avec rejeu, versioning de prompts et évaluation automatisée.', NULL, NULL, CURRENT_DATE),
  ('openobserve', 'OpenObserve', 'observabilite', 'context', 'freemium', 'self-host gratuit', 'Pour qui veut aussi surveiller son infrastructure : LLM-as-judge, détection d’hallucination, suivi des coûts.', NULL, NULL, CURRENT_DATE),
  ('langsmith-braintrust-arize', 'LangSmith · Braintrust · Arize', 'observabilite', 'context', 'paid', 'commercial', 'Plateformes propriétaires qui traitent la trace comme objet de premier ordre et attachent les scores d’évaluation au trafic de production.', NULL, NULL, CURRENT_DATE),
  ('openclaw', 'OpenClaw', 'agent_perso', 'context', 'free', 'gratuit · MIT · BYOK', 'Agent personnel auto-hébergé, projet à la croissance la plus rapide de l’histoire de GitHub. Connecte un modèle à tes fichiers locaux et à WhatsApp ou Discord, 100+ AgentSkills, 50+ intégrations. Son créateur a été recruté par OpenAI début 2026 ; le projet reste MIT sous gouvernance de fondation, financé par OpenAI.', 'Regarde-le pour comprendre où va le marché, pas pour l’installer vite. Il exécute des commandes shell avec accès à tes messageries, et les évaluations communautaires de sa résistance aux injections de prompt sont mauvaises.', '~388 000 étoiles au 26 août 2026', CURRENT_DATE),
  ('mcp-context7', 'Context7', 'mcp', 'core', 'freemium', 'freemium', 'Injecte la doc versionnée de 50+ frameworks dans le contexte, au lieu de la version mémorisée à l''entraînement. Serveur le plus installé sur FastMCP.', 'Ton front est en React 18 + Babel standalone sans build — un modèle qui te répond du React 19 ou du JSX moderne te coûte un aller-retour à chaque fois.', 'kit · priorité 1', CURRENT_DATE),
  ('mcp-chrome-devtools', 'Chrome DevTools MCP', 'mcp', 'core', 'free', 'gratuit', 'Visibilité live sur le navigateur : DOM, console, réseau, performance.', 'Ta règle est « front vérifié en prod, pas en local » parce que vérifier coûte cher. Ce serveur fait baisser ce coût, y compris sur le piège du chemin de base /jarvis-cockpit/.', 'kit · priorité 2', CURRENT_DATE),
  ('mcp-firecrawl', 'Firecrawl MCP', 'mcp', 'core', 'freemium', 'freemium · OSS', '26 outils : search, scrape, parse, crawl, map, interact. Transforme n''importe quelle URL en Markdown propre, pubs et bandeaux cookies retirés. 85 000+ étoiles.', 'Le HTML brut mal strippé côté Python dans les summaries est un bug que tu traînes — c''est exactement le problème que cet outil résout.', 'kit · priorité 3', CURRENT_DATE),
  ('mcp-github', 'GitHub MCP', 'mcp', 'core', 'free', 'gratuit · officiel', 'Issues, PR, Actions, en OAuth hébergé.', 'Tout diagnostic de panne commence par l''issue #9. Un accès natif évite de passer par le CLI à chaque coup de sonde.', 'kit · priorité 4', CURRENT_DATE),
  ('mcp-supabase', 'Supabase MCP', 'mcp', 'core', 'free', 'gratuit · officiel', 'Introspection de schéma, SQL, migrations, advisors, logs.', 'Tu l''as déjà branché — le point à surveiller est que c''est aussi le chemin par lequel la routine Jobs Radar écrit en contournant la RLS.', 'kit · priorité 5', CURRENT_DATE),
  ('mcp-playwright', 'Playwright MCP', 'mcp', 'core', 'free', 'gratuit · OSS', 'Le serveur d''automatisation navigateur le plus utilisé, tous clients confondus. Complémentaire de Chrome DevTools : l''un pilote, l''autre observe.', 'Utile pour un smoke test des 30 onglets après déploiement.', 'kit · priorité 6', CURRENT_DATE),
  ('mcp-zoom', 'Zoom MCP', 'mcp', 'core', 'paid', 'compris dans Zoom', 'Connecteur officiel lancé en avril 2026 : résumés, transcripts, enregistrements, planification exposés à Claude.', 'Extraction d''actions post-PI Planning et de rétro sans repasser sur l''enregistrement. Sous réserve de la politique outils de Malakoff Humanis.', 'kit · priorité 7', CURRENT_DATE),
  ('mcp-obsidian', 'Obsidian MCP', 'mcp', 'core', 'free', 'gratuit · communautaire', 'Deux écoles : mcp-obsidian (3 000 étoiles, exige le plugin Local REST API et Obsidian ouvert) ou obsidian-mcp-plugin, qui traite le vault comme un graphe — traversée multi-sauts, analyse de backlinks, chemins entre concepts.', 'Le second est la piste sérieuse pour ta carte des concepts wiki, encore non implémentée.', 'kit · priorité 8', CURRENT_DATE),
  ('mcp-filesystem', 'Filesystem', 'mcp', 'core', 'free', 'gratuit · officiel', 'Accès local aux fichiers. Avec Git, la base historique de tout setup.', NULL, 'second cercle', CURRENT_DATE),
  ('mcp-sequential-thinking', 'Sequential Thinking', 'mcp', 'core', 'free', 'gratuit · officiel', 'Structure le raisonnement multi-étapes. Cité dans tous les kits de démarrage.', NULL, 'second cercle', CURRENT_DATE),
  ('mcp-notion-linear-slack', 'Notion · Linear · Slack', 'mcp', 'core', 'freemium', 'endpoints OAuth hébergés', 'Coordination d’équipe. Distants par défaut depuis 2026, plus d’installation locale.', NULL, 'second cercle', CURRENT_DATE),
  ('mcp-postgres', 'Postgres', 'mcp', 'core', 'free', 'gratuit · officiel', 'Introspection de base en direct, si tu veux un accès hors Supabase.', NULL, 'second cercle', CURRENT_DATE),
  ('mcp-stripe-vercel-cloudflare-figma-canva', 'Stripe · Vercel · Cloudflare · Figma · Canva', 'mcp', 'core', 'freemium', 'OAuth hébergé', 'Connecteurs officiels majeurs, tous passés au distant sécurisé.', NULL, 'second cercle', CURRENT_DATE),
  ('mcp-atlassian', 'Atlassian', 'mcp', 'core', 'paid', 'selon plan Atlassian', 'Jira et Confluence exposés à l’agent. Pertinent en contexte SAFe, sous réserve de la politique interne.', NULL, 'second cercle', CURRENT_DATE),
  ('mcp-home-assistant', 'Home Assistant', 'mcp', 'core', 'free', 'gratuit · communautaire', 'Domotique. Hors sujet professionnel, dans l’esprit des agents personnels.', NULL, 'second cercle', CURRENT_DATE),
  ('mcp-reddit-apify', 'Reddit (Apify)', 'mcp', 'core', 'freemium', 'à l’usage', 'Ta veille du 31 août note que les threads Reddit natifs restent inaccessibles au web-fetch. C’est le contournement identifié.', NULL, 'second cercle', CURRENT_DATE)
ON CONFLICT (slug) DO NOTHING;
