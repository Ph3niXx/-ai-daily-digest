#!/usr/bin/env python3
"""
Sélection quotidienne de la veille + recalibration par le feedback.

Remplace le « Top du jour » par une vraie sélection. Avant : buildTop() prenait
`order=date_fetched.desc` puis `.slice(0, 3)` — les trois derniers articles
aspirés par le crawler — et affichait un score `94 - i * 6` calculé à partir
de rien. 40 000 articles ingérés, 24 clics au total.

Deux étapes, dans cet ordre :
  1. PICK        — choisir les 3 articles du jour et dire POURQUOI pour cet
                   utilisateur précis. Le « pourquoi » remplace le score : une
                   raison lisible vaut mieux qu'un nombre sans référent.
  2. RECALIBRAGE — quand assez de votes se sont accumulés, réécrire
                   user_profile.veille_pref_rules à partir d'eux.

C'est la boucle de Jobs Radar (jobs_feedback → job_pref_rules), reproduite :
c'est la seule du cockpit dont on ait la preuve qu'elle fonctionne.

DÉLIBÉRÉMENT UN PIPELINE À PART, pas une étape de main.py : le digest quotidien
n'a pas raté un jour en 114 jours et reste la seule chose du cockpit qui marche
sans faute. Si cette sélection casse, le brief doit continuer sans elle.

Usage:
    python pipelines/veille_picks.py
    python pipelines/veille_picks.py --dry-run
    python pipelines/veille_picks.py --date 2026-07-26
    python pipelines/veille_picks.py --recalibrate-only
"""

import json
import os
import re
import sys
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from media_tracker_common import sb_env, sb_get, sb_upsert  # noqa: E402

import requests  # noqa: E402
from google import genai  # noqa: E402

MODEL = "gemini-2.5-flash-lite"
N_PICKS = 3
MAX_ARTICLES_IN_PROMPT = 45

# En dessous, le signal est trop mince pour réécrire des règles : on écrirait
# surtout du bruit, et une règle fausse est plus coûteuse qu'une règle absente.
MIN_VOTES_TO_RECALIBRATE = 8

PROFILE_KEYS_FOR_PROMPT = [
    "identity", "ambitions", "interests", "what_excites_me",
    "what_frustrates_me", "sectors_of_interest", "current_projects",
]

DOWN_REASONS = {
    "seen": "déjà vu ailleurs",
    "off_topic": "pas mon sujet",
    "shallow": "trop superficiel",
    "not_actionable": "rien d'actionnable",
}


def safe_json_parse(text):
    if not text:
        return None
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


def upsert_profile(url, headers, key, value):
    h = {**headers, "Prefer": "resolution=merge-duplicates"}
    r = requests.post(
        f"{url}/rest/v1/user_profile?on_conflict=key", headers=h,
        json=[{"key": key, "value": value,
               "updated_at": datetime.now(timezone.utc).isoformat()}], timeout=30)
    r.raise_for_status()


# ── Étape 1 : la sélection ──────────────────────────────────────

PICK_PROMPT = """Tu sélectionnes la veille IA du jour pour UNE personne précise.

QUI C'EST :
{profile}

CE QU'IL A APPRIS DE SES PROPRES VOTES (autorité supérieure au reste) :
{rules}

SES DERNIERS VERDICTS :
{votes}

LES ARTICLES DU JOUR :
{articles}

Choisis les {n} articles qui comptent VRAIMENT pour lui aujourd'hui, et seulement ceux-là.

Règles :
- Tu choisis parmi les articles ci-dessus UNIQUEMENT, en reprenant leur `id` exact.
- Le `why` dit pourquoi CET article compte pour LUI — pas un résumé de l'article.
  Une phrase, concrète, à la deuxième personne. Interdit : « intéressant »,
  « pertinent », « à suivre », et toute formule qui marcherait pour n'importe qui.
- Si la journée est faible, n'en retiens que 2, ou 1. Ne complète jamais pour
  faire le compte : trois articles médiocres coûtent plus cher qu'un seul bon.
- `confidence` = high seulement si l'article recoupe explicitement ses règles.

Réponds UNIQUEMENT par un tableau JSON, sans texte autour, sans backticks :
[{{"id":"<id exact>","why":"…","confidence":"low|medium|high"}}]
"""


def build_pick_prompt(profile_rows, rules, votes, articles):
    kv = {r["key"]: r.get("value") or "" for r in profile_rows}
    profile = "\n".join(f"- {k} : {kv[k]}" for k in PROFILE_KEYS_FOR_PROMPT if kv.get(k)) or "—"

    if votes:
        votes_txt = "\n".join(
            f"- {'👍' if v['verdict'] == 'up' else '👎'} « {v.get('_title', '?')} »"
            + (f" — {DOWN_REASONS.get(v.get('reason'), v.get('reason'))}" if v.get("reason") else "")
            for v in votes[:25])
    else:
        votes_txt = "(aucun vote encore — première sélection)"

    arts = "\n".join(
        f"- id={a['id']}\n  [{a.get('source') or '?'} | {a.get('section') or '?'}] {a.get('title') or ''}"
        f"\n  {(a.get('summary') or '')[:220]}"
        for a in articles[:MAX_ARTICLES_IN_PROMPT])

    return PICK_PROMPT.format(profile=profile, rules=rules or "(pas encore de règles apprises)",
                              votes=votes_txt, articles=arts, n=N_PICKS)


def clean_picks(raw, articles):
    """Ne garde que des picks pointant sur un article RÉEL du jour.

    Même discipline que jp_vocab_sync : un id inventé est plausible à l'œil et
    produirait une ligne orpheline que la contrainte de clé étrangère
    rejetterait de toute façon — autant le dire ici, clairement.
    """
    if not isinstance(raw, list):
        return []
    by_id = {a["id"]: a for a in articles}
    out, seen = [], set()
    for item in raw[:N_PICKS]:
        if not isinstance(item, dict):
            continue
        aid = (item.get("id") or "").strip()
        why = (item.get("why") or "").strip()
        if aid not in by_id:
            print(f"      ✗ rejeté (id absent des articles du jour) : {aid[:40]}")
            continue
        if not why or aid in seen:
            continue
        seen.add(aid)
        conf = item.get("confidence")
        out.append({
            "article_id": aid,
            "rank": len(out) + 1,
            "why": why,
            "confidence": conf if conf in ("low", "medium", "high") else None,
        })
    return out


# ── Étape 2 : le recalibrage ────────────────────────────────────

RECAL_PROMPT = """Voici les verdicts d'un utilisateur sur sa veille IA quotidienne.

{votes}

Écris les RÈGLES DE SÉLECTION que ces verdicts révèlent, pour guider les
prochaines sélections. Écris à la deuxième personne, comme un mémo qu'il
relirait.

Règles de rédaction :
- Ne déduis que ce que les verdicts soutiennent réellement. Un seul 👎 sur un
  sujet n'est pas une règle, c'est un cas.
- Sépare clairement CE QU'IL VEUT de CE QU'IL REJETTE.
- Sois spécifique : « tu rejettes les annonces de levées de fonds sans produit
  derrière » est utile, « tu aimes le concret » ne l'est pas.
- Maximum 12 lignes. Si les verdicts ne soutiennent que 3 règles, n'en écris que 3.

Réponds en texte brut, sans titre ni préambule."""


def recalibrate(client, url, headers, votes, dry_run):
    if len(votes) < MIN_VOTES_TO_RECALIBRATE:
        print(f"   {len(votes)} vote(s) — seuil de recalibrage à {MIN_VOTES_TO_RECALIBRATE}, on attend.")
        return False

    votes_txt = "\n".join(
        f"- {'👍 gardé' if v['verdict'] == 'up' else '👎 rejeté'} : « {v.get('_title', '?')} »"
        + (f" ({DOWN_REASONS.get(v.get('reason'), v.get('reason'))})" if v.get("reason") else "")
        + (f" [{v.get('_section')}]" if v.get("_section") else "")
        for v in votes[:80])

    resp = client.models.generate_content(
        model=MODEL, contents=RECAL_PROMPT.format(votes=votes_txt))
    rules = (resp.text or "").strip()
    if not rules:
        print("   [ERREUR] Recalibrage : réponse vide, règles inchangées.")
        return False

    print("\n   ── Règles apprises ──")
    for line in rules.splitlines():
        print(f"   {line}")

    if not dry_run:
        upsert_profile(url, headers, "veille_pref_rules", rules)
        upsert_profile(url, headers, "veille_pref_updated_at",
                       f"{date.today().isoformat()} (sur {len(votes)} votes)")
    return True


def main():
    dry_run = "--dry-run" in sys.argv
    recal_only = "--recalibrate-only" in sys.argv
    day = date.today().isoformat()
    if "--date" in sys.argv:
        day = sys.argv[sys.argv.index("--date") + 1]

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("FATAL: GEMINI_API_KEY manquant")
        sys.exit(1)

    url, headers = sb_env()
    client = genai.Client(api_key=api_key)

    print("=" * 60)
    print(f"📰 VEILLE — sélection du {day}")
    print("=" * 60)

    profile_rows = sb_get(url, headers, "user_profile", "select=key,value")
    kv = {r["key"]: r.get("value") or "" for r in profile_rows}
    rules = kv.get("veille_pref_rules") or ""

    # Feedback + titres des articles votés (le verdict seul n'apprend rien).
    fb = sb_get(url, headers, "article_feedback",
                "select=article_id,verdict,reason&order=created_at.desc&limit=80")
    votes = []
    if fb:
        ids = ",".join(f['article_id'] for f in fb)
        voted = sb_get(url, headers, "articles",
                       f"id=in.({ids})&select=id,title,section")
        by_id = {a["id"]: a for a in voted}
        for f in fb:
            a = by_id.get(f["article_id"])
            votes.append({**f,
                          "_title": (a or {}).get("title", "?"),
                          "_section": (a or {}).get("section")})

    # ── Recalibrage d'abord : les règles fraîches servent à la sélection
    # du jour même. L'ordre inverse ferait perdre une journée à chaque cycle.
    print(f"\n🎯 Recalibrage ({len(votes)} votes en base)")
    recalibrated = recalibrate(client, url, headers, votes, dry_run)
    if recalibrated and not dry_run:
        rules = sb_get(url, headers, "user_profile",
                       "key=eq.veille_pref_rules&select=value")[0]["value"]

    if recal_only:
        return 0

    # ── Sélection
    articles = sb_get(url, headers, "articles",
                      f"fetch_date=eq.{day}&select=id,title,summary,section,source"
                      f"&order=date_fetched.desc&limit=100")
    if not articles:
        print(f"\n⚠️  Aucun article pour le {day} — rien à sélectionner.")
        return 0

    print(f"\n📥 {len(articles)} articles du jour")
    try:
        resp = client.models.generate_content(
            model=MODEL, contents=build_pick_prompt(profile_rows, rules, votes, articles))
        picks = clean_picks(safe_json_parse(resp.text), articles)
    except Exception as exc:
        print(f"[ERREUR] Sélection Gemini : {exc}")
        return 1

    if not picks:
        # Échec bruyant : le front retombera sur l'ancien comportement, mais on
        # veut savoir que la sélection n'a rien produit plutôt que le découvrir
        # par un Top redevenu arbitraire.
        print("[ERREUR] Aucun pick valide — le front retombera sur l'ordre de crawl.")
        return 1

    by_id = {a["id"]: a for a in articles}
    print()
    for p in picks:
        print(f"   {p['rank']}. [{p['confidence'] or '—'}] {by_id[p['article_id']]['title'][:70]}")
        print(f"      → {p['why']}")

    if not dry_run:
        rows = [{**p, "pick_date": day} for p in picks]
        # La clé primaire est (pick_date, rank) : un re-run du même jour
        # remplace proprement au lieu d'empiler.
        sb_upsert(url, headers, "daily_picks", rows, "pick_date,rank")
        print(f"\n✓ {len(picks)} picks écrits pour le {day}")
    else:
        print("\n[dry-run] aucune écriture en base")

    return 0


if __name__ == "__main__":
    sys.exit(main())
