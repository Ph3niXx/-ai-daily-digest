-- 029 — Refermer les RPC SECURITY DEFINER exécutables par anon
-- Audit du 2026-08-15, vague 0. Voir ADR-37 dans docs/architecture/decisions.md.
--
-- Constat : cinq fonctions sont SECURITY DEFINER, donc elles s'exécutent avec les droits
-- de leur propriétaire et CONTOURNENT la RLS posée par sql/006_rls_authenticated.sql.
-- Les cinq étaient exécutables par `anon`. La plus grave est match_memories : sans borne
-- sur match_threshold ni match_count, un appel `threshold=-1, match_count=100000` rend
-- les 951 lignes de memories_vectors — dont profile_facts, user_profile et business_ideas
-- en texte clair dans chunk_text. Signalé par le linter Supabase
-- `anon_security_definer_function_executable`.
--
-- Piège à ne pas rater : Postgres accorde EXECUTE à PUBLIC par défaut à la création d'une
-- fonction. `revoke ... from anon` seul ne retire donc RIEN — il faut révoquer à PUBLIC
-- puis re-grant aux rôles légitimes. C'est ce que fait chaque bloc ci-dessous.

-- ── 1. match_memories — aucun appelant front ────────────────────────────────
-- docs/specs/tab-jarvis.md:95 : « Pas lu par le front ». Le seul appelant est
-- jarvis/retriever.py:44 via jarvis/supabase_client.py, qui s'authentifie en service_role.
revoke execute on function public.match_memories(vector, double precision, integer, text)
  from public, anon, authenticated;
grant execute on function public.match_memories(vector, double precision, integer, text)
  to service_role;
alter function public.match_memories(vector, double precision, integer, text)
  set search_path = public;

-- ── 2. RPC réellement lues par le front — anon n'en a pas besoin ────────────
-- music_discoveries  → cockpit/lib/data-loader.js:1301
revoke execute on function public.music_discoveries(integer, integer) from public, anon;
grant  execute on function public.music_discoveries(integer, integer) to authenticated, service_role;

-- get_stack_stats    → cockpit/lib/data-loader.js:4672
revoke execute on function public.get_stack_stats() from public, anon;
grant  execute on function public.get_stack_stats() to authenticated, service_role;

-- get_gemini_usage_stats → cockpit/lib/data-loader.js:4674
revoke execute on function public.get_gemini_usage_stats(integer) from public, anon;
grant  execute on function public.get_gemini_usage_stats(integer) to authenticated, service_role;

-- ── 3. log_user_profile_change — search_path uniquement ─────────────────────
-- C'est une fonction de trigger (retourne `trigger`) : PostgREST ne l'expose pas en RPC,
-- et Postgres ne vérifie pas le privilège EXECUTE au déclenchement d'un trigger, seulement
-- à la création de celui-ci. La révoquer n'apporterait donc aucune sécurité mais risquerait
-- de casser l'écriture de user_profile. On corrige seulement le search_path mutable,
-- qui est le vrai défaut signalé par le linter.
alter function public.log_user_profile_change() set search_path = public;
