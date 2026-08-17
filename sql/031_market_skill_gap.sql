-- 031 — Vue `market_skill_gap` : ce que le marché reproche au CV
-- Vague 2 de l'audit du 2026-08-15. Voir ADR-39.
--
-- La routine Jobs Radar extrait déjà, offre par offre, les compétences exigées
-- avec un drapeau `on_cv` (ADR-19/20). C'est présent sur 551 offres et 2 156
-- paires — et personne ne l'a jamais agrégé : le front l'affiche carte par
-- carte (panel-jobs-radar.jsx::JrSkills) et jamais en cumul.
--
-- POURQUOI CETTE VUE PLUTÔT QU'UN NOUVEL ONGLET APPRENTISSAGE : le pilier
-- « montée en compétence » est mort parce qu'il reposait sur un auto-diagnostic
-- déclaratif (skill_radar figé au 2026-04-04, strengths/gaps NULL) et sur du
-- contenu poussé que personne n'ouvrait. Ici la source est inversée : c'est le
-- marché qui parle, le pipeline le calcule déjà à chaque scan, et ça s'affiche
-- dans l'onglet que l'utilisateur ouvre vraiment.
--
-- POURQUOI DES RÈGLES ET PAS UNE TABLE D'ALIAS : mesuré le 2026-08-17, il y a
-- 1 282 libellés distincts pour 849 manques, et 627 de ces libellés
-- n'apparaissent QU'UNE FOIS (73 %). Une table d'alias ligne à ligne ne serait
-- jamais tenue à jour. Les règles ci-dessous regroupent les axes qui portent le
-- signal et laissent le reste tel quel.

create or replace view public.market_skill_gap
with (security_invoker = true) as
with paires as (
  select
    j.id                                as job_id,
    j.score_total,
    j.first_seen_date,
    lower(trim(x->>'name'))             as brut,
    (x->>'on_cv')::boolean              as on_cv
  from public.jobs j,
       lateral jsonb_array_elements(j.intel->'skills_required') x
  where jsonb_typeof(j.intel->'skills_required') = 'array'
    and x ? 'on_cv'
),
propre as (
  select *
  from paires
  where brut <> ''
    and length(brut) between 3 and 60
    -- Liste noire des artefacts de parsing. Ce ne sont pas des compétences :
    -- ce sont des titres de section de l'annonce, et un identifiant de tracking
    -- de job board (`#j-18808-ljbffr`, 5 offres) que la routine a avalé.
    and brut !~ '^#j-'
    and brut !~ '^(key responsibilities|responsibilities|qualifications|about the role|about us|what you.ll do|description du poste|les missions du poste|le poste|votre mission|profil recherch|missions principales|ce que nous offrons)'
),
canon as (
  select
    job_id, score_total, first_seen_date, brut, on_cv,
    case
      -- L'axe qui porte tout le signal, éclaté en sept libellés dans les données
      -- brutes : « developpement ml / data science » (25), « mlops / data
      -- engineering » (25), « profondeur technique ml / mlops » (9),
      -- « architecture technique / mlops » (4), « data science / ml » (4),
      -- « ml engineering » (3), « ai/ml product » (3).
      when brut ~ '(mlops|machine learning|data science|data engineering|ml engineering|(^|[^a-z])ml([^a-z]|$))'
        then 'Profondeur technique ML / MLOps'
      when brut ~ '(genai|gen ai|llm|ia g[ée]n[ée]rative|ai product|product.{0,12}(ia|ai))'
        then 'Product management IA / GenAI'
      when brut ~ '(data governance|data quality|gouvernance)'
        then 'Gouvernance de la donnée'
      when brut ~ '(anglais|english)'
        then 'Anglais courant'
      when brut ~ 'discovery'
        then 'Discovery produit'
      when brut ~ '(p&l|business development|revenue)'
        then 'P&L / développement commercial'
      else initcap(brut)
    end as axe
  from propre
)
select
  axe,
  count(*)                                              as offres,
  count(*) filter (where not on_cv)                     as manquant,
  round(100.0 * count(*) filter (where not on_cv) / count(*))::int as pct_manquant,
  round(avg(score_total) filter (where not on_cv), 1)   as score_moyen_offres_manquantes,
  max(first_seen_date)                                  as derniere_offre,
  -- Permet au front de brancher chaque ligne sur un filtre de la liste déjà
  -- présente : « montrer les N offres qui exigent cet axe et ne l'ont pas ».
  array_agg(distinct job_id) filter (where not on_cv)   as job_ids_manquants,
  -- Trace de la normalisation : sans ça, impossible de vérifier qu'une règle
  -- ne regroupe pas deux choses différentes.
  array_agg(distinct brut) filter (where not on_cv)     as libelles_bruts
from canon
group by axe
having count(*) filter (where not on_cv) >= 3
order by manquant desc, offres desc;

comment on view public.market_skill_gap is
  'Écart entre les compétences exigées par le marché (jobs.intel->skills_required) '
  'et celles présentes sur le CV (drapeau on_cv posé par la routine Jobs Radar). '
  'Seuil à 3 manques : en dessous, le bruit des libellés singletons domine '
  '(627 des 1282 libellés n''apparaissent qu''une fois). ADR-39.';

grant select on public.market_skill_gap to authenticated, service_role;
