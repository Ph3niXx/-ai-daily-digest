#!/usr/bin/env python3
"""
Vocabulaire japonais des franchises de la Médiathèque → Supabase.

Extrait, pour chaque franchise anime, les mots japonais utiles de son titre
natif, avec lecture en kana, romaji et sens en français. Le front s'en sert
pour la bande « Avant l'épisode » : 2-3 mots de la série qu'on s'apprête à
lancer, un tap, terminé.

Pourquoi Gemini plutôt qu'une chaîne NLP (sudachipy + JMdict) :
  - JMdict glose en anglais ; l'utilisateur veut du français
  - la segmentation seule ne dit pas quels mots valent la peine d'être appris
  - Gemini Flash-Lite est déjà dans la stack, gratuit, et 44 franchises font
    44 appels une seule fois — le coût marginal est nul

INCRÉMENTAL : ne retraite jamais une franchise qui a déjà des mots. Les 44
franchises actuelles sont traitées au premier run, puis seules les nouvelles
ajoutées coûtent un appel.

Usage:
    python pipelines/jp_vocab_sync.py
    python pipelines/jp_vocab_sync.py --dry-run     # n'écrit pas
    python pipelines/jp_vocab_sync.py --force       # retraite tout
    python pipelines/jp_vocab_sync.py --limit 5     # borne le nombre d'appels
"""

import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from media_tracker_common import sb_env, sb_get, sb_upsert  # noqa: E402

from google import genai  # noqa: E402

MODEL = "gemini-2.5-flash-lite"
MAX_WORDS_PER_TITLE = 5
THROTTLE_S = 1.0

# Un titre sans un seul caractère japonais (kanji ou kana) n'a rien à donner.
JP_CHARS = re.compile(r"[぀-ゟ゠-ヿ一-鿿]")

PROMPT = """Tu es professeur de japonais pour un francophone qui regarde beaucoup d'anime.

Voici le titre original d'une série qu'il suit :
  Titre japonais : {native}
  Romanisation   : {romaji}
  Genres         : {genres}

Extrais au maximum {max_words} mots ou expressions japonais VRAIMENT PRÉSENTS dans ce titre,
en privilégiant ceux qui reviennent souvent dans ce genre et qui valent la peine d'être retenus.

Règles strictes :
- N'invente RIEN. Chaque mot doit apparaître littéralement dans le titre japonais.
- Ignore les particules seules (の, は, が, を, に, で…) et la ponctuation décorative (～, 【】).
- Ignore les emprunts à l'anglais évidents transcrits en katakana (ライフ, スキル, チート…) :
  ils n'apprennent rien à un francophone.
- Découpe en mots utiles, pas en kanji isolés : « 異世界 » vaut mieux que « 異 » puis « 世界 ».
- La lecture doit être en hiragana uniquement.
- Le sens doit être court (1 à 4 mots français), sans article ni phrase.
- S'il n'y a aucun mot digne d'intérêt, renvoie un tableau vide.

Réponds UNIQUEMENT par un tableau JSON, sans texte autour, sans backticks :
[{{"word":"転生","reading":"てんせい","romaji":"tensei","meaning_fr":"réincarnation"}}]
"""


def safe_json_parse(text):
    """Parse le JSON d'une réponse Gemini en tolérant les backticks."""
    if not text:
        return None
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


def clean_words(raw, native):
    """Valide la sortie du modèle contre le titre réel.

    Le garde-fou qui compte : on jette tout mot absent du titre natif. C'est
    la seule protection efficace contre une hallucination plausible, et elle
    est vérifiable sans dictionnaire.
    """
    if not isinstance(raw, list):
        return []
    out, seen = [], set()
    for item in raw[:MAX_WORDS_PER_TITLE]:
        if not isinstance(item, dict):
            continue
        word = (item.get("word") or "").strip()
        meaning = (item.get("meaning_fr") or "").strip()
        if not word or not meaning:
            continue
        if word not in native:      # ← hallucination : le mot n'est pas dans le titre
            print(f"      ✗ rejeté (absent du titre) : {word}")
            continue
        if word in seen:
            continue
        seen.add(word)
        out.append({
            "word": word,
            "reading": (item.get("reading") or "").strip() or None,
            "romaji": (item.get("romaji") or "").strip() or None,
            "meaning_fr": meaning,
            "sort_order": len(out),
        })
    return out


def main():
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        i = sys.argv.index("--limit") + 1
        if i >= len(sys.argv) or not sys.argv[i].isdigit():
            print("FATAL: --limit attend un entier")
            sys.exit(1)
        limit = int(sys.argv[i])

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("FATAL: GEMINI_API_KEY manquant")
        sys.exit(1)

    url, headers = sb_env()
    client = genai.Client(api_key=api_key)

    franchises = sb_get(url, headers, "media_franchises",
                        "select=id,title_native,title_romaji,genres,media_type&order=added_at.asc")
    # On ne traite que l'anime : un film TMDB a un title_native qui n'est pas
    # forcément japonais (un film coréen ou français y atterrit aussi).
    franchises = [f for f in franchises
                  if f.get("media_type") == "anime"
                  and f.get("title_native")
                  and JP_CHARS.search(f["title_native"])]

    done = set()
    if not force:
        existing = sb_get(url, headers, "jp_words", "select=franchise_id")
        done = {r["franchise_id"] for r in existing}

    todo = [f for f in franchises if f["id"] not in done]
    if limit:
        todo = todo[:limit]

    print("=" * 60)
    print("🇯🇵 VOCABULAIRE JAPONAIS — Médiathèque")
    print(f"   {len(franchises)} franchises anime · {len(done)} déjà traitées · {len(todo)} à faire")
    print("=" * 60)

    if not todo:
        print("\nRien à faire.")
        return 0

    total_words = 0
    failures = 0

    for i, fr in enumerate(todo, 1):
        native = fr["title_native"]
        label = fr.get("title_romaji") or native
        print(f"\n[{i}/{len(todo)}] {label}")
        print(f"      {native}")

        prompt = PROMPT.format(
            native=native,
            romaji=fr.get("title_romaji") or "—",
            genres=", ".join(fr.get("genres") or []) or "—",
            max_words=MAX_WORDS_PER_TITLE,
        )

        try:
            resp = client.models.generate_content(model=MODEL, contents=prompt)
            words = clean_words(safe_json_parse(resp.text), native)
        except Exception as exc:
            print(f"      ! échec Gemini : {exc}")
            failures += 1
            time.sleep(THROTTLE_S)
            continue

        if not words:
            print("      → aucun mot retenu")
            time.sleep(THROTTLE_S)
            continue

        for w in words:
            print(f"      · {w['word']:8} {w['reading'] or '':10} {w['meaning_fr']}")

        if not dry_run:
            rows = [{**w, "franchise_id": fr["id"]} for w in words]
            sb_upsert(url, headers, "jp_words", rows, "franchise_id,word")

        total_words += len(words)
        time.sleep(THROTTLE_S)

    print("\n" + "=" * 60)
    print(f"✓ {total_words} mots extraits sur {len(todo)} franchises"
          + (f" · {failures} échec(s)" if failures else ""))
    if dry_run:
        print("[dry-run] aucune écriture en base")
    return 0


if __name__ == "__main__":
    sys.exit(main())
