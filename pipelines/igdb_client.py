#!/usr/bin/env python3
"""Client IGDB v4 — authentification Twitch et requetes apicalypse.

IGDB limite a 4 requetes/seconde et 8 requetes ouvertes ; on serialise et
on throttle a 0.25 s. Le token applicatif Twitch vit ~60 jours mais on le
redemande a chaque run : un run par jour, le cout est negligeable et ca
evite un cache a invalider.

Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md
"""
from __future__ import annotations
import time

import requests

TOKEN_URL = "https://id.twitch.tv/oauth2/token"
BASE = "https://api.igdb.com/v4"
THROTTLE_S = 0.25      # 4 req/s documentees
RETRY_ON_429 = 3
BATCH = 100            # ids par requete ; IGDB accepte limit 500


def get_token(client_id, client_secret):
    r = requests.post(TOKEN_URL, params={
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def chunks(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def id_list(ids):
    """(1,2,3) — dedoublonne et trie pour que deux runs identiques
    produisent la meme requete (utile en debug et pour les logs)."""
    return "(" + ",".join(str(i) for i in sorted(set(ids))) + ")"


def quoted_list(values):
    """(\"620\",\"1145360\") — external_games.uid est une chaine, pas un entier."""
    uniq = sorted({str(v) for v in values})
    return "(" + ",".join(f'"{v}"' for v in uniq) + ")"


class IgdbClient:
    def __init__(self, client_id, token):
        self.headers = {
            "Client-ID": client_id,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        self.calls = 0

    def query(self, endpoint, body):
        """Une requete apicalypse. `body` est du texte, pas du JSON."""
        for _ in range(RETRY_ON_429):
            r = requests.post(f"{BASE}/{endpoint}", headers=self.headers,
                              data=body.encode("utf-8"), timeout=30)
            self.calls += 1
            if r.status_code == 429:
                time.sleep(float(r.headers.get("Retry-After", 1)))
                continue
            try:
                r.raise_for_status()
                return r.json()
            finally:
                # Le rythme doit etre tenu meme quand la requete echoue : un
                # appelant qui rattrape l'exception et relance immediatement
                # repartirait sans espacement et brulerait le quota.
                time.sleep(THROTTLE_S)
        raise RuntimeError(f"IGDB: 429 persistant sur {endpoint} — {body[:120]}")
