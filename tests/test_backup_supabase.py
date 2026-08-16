"""fetch_table est le garde-fou d'intégrité de la sauvegarde.

Une sauvegarde partielle qui se croit complète est pire que pas de sauvegarde :
on ne découvre le trou qu'au moment de restaurer. Deux invariants la protègent.

1. La pagination doit trier. Sans ORDER BY, PostgREST ne garantit pas la stabilité
   des pages entre deux requêtes : un offset peut alors sauter ou dupliquer des
   lignes, silencieusement. Chaque table du périmètre doit donc déclarer sa clef.
2. Une erreur HTTP doit remonter. Si fetch_table avalait un 500 au milieu de la
   pagination, il renverrait les pages déjà lues comme si c'était le total —
   exactement le défaut relevé sur weekly_analysis (run vert, zéro écriture).

Run: python tests/test_backup_supabase.py
"""
import sys
from pathlib import Path
from urllib.parse import unquote

# La console Windows est en cp1252 : sans ça, le premier caractère hors Latin-1
# fait planter le test au print, alors que tous ses checks sont passés.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))

import backup_supabase  # noqa: E402
from backup_supabase import TABLES, fetch_table  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        print(f"  FAIL {name}\n       attendu: {expected!r}\n       obtenu : {got!r}")
        failures += 1
    else:
        print(f"  ok   {name}")


class FakeResponse:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status = status

    def raise_for_status(self):
        if self.status >= 400:
            raise RuntimeError(f"HTTP {self.status}")

    def json(self):
        return self._payload


class FakeGet:
    """Sert des pages depuis une liste de lignes, et enregistre les URLs vues."""

    def __init__(self, rows, fail_on_call=None):
        self.rows = rows
        self.fail_on_call = fail_on_call
        self.urls = []

    def __call__(self, url, headers=None, timeout=None):
        self.urls.append(url)
        if self.fail_on_call is not None and len(self.urls) == self.fail_on_call:
            return FakeResponse(None, status=500)
        offset = int(url.split("offset=")[1].split("&")[0])
        limit = int(url.split("limit=")[1].split("&")[0])
        return FakeResponse(self.rows[offset:offset + limit])


def with_page_size(size, fn):
    original = backup_supabase.PAGE_SIZE
    backup_supabase.PAGE_SIZE = size
    try:
        return fn()
    finally:
        backup_supabase.PAGE_SIZE = original


print("-- périmètre de sauvegarde")

check(
    "toutes les tables déclarent une colonne de tri",
    sorted(t for t, col in TABLES.items() if not col),
    [],
)
check("jobs est dans le périmètre", "jobs" in TABLES, True)
check(
    "les corpus refabricables sont exclus",
    sorted(t for t in ("articles", "news_articles", "music_scrobbles", "memories_vectors") if t in TABLES),
    [],
)

print("-- pagination")

rows = [{"id": i} for i in range(1, 8)]  # 7 lignes, pages de 3 → 3 requêtes
getter = FakeGet(rows)
backup_supabase.requests.get = getter
got = with_page_size(3, lambda: fetch_table("https://x.test", {}, "jobs", "id"))

check("toutes les lignes sont récupérées", got, rows)
check("le nombre de pages est correct", len(getter.urls), 3)
check("chaque page est triée par la clef", all("order=id.asc" in unquote(u) for u in getter.urls), True)
check("les offsets se suivent", [int(u.split("offset=")[1]) for u in getter.urls], [0, 3, 6])

print("-- page pleine en dernière position")

# 6 lignes en pages de 3 : la 2e page est pleine, il faut une 3e requête pour
# constater la fin. Ne pas la faire reviendrait à s'arrêter au hasard.
getter = FakeGet([{"id": i} for i in range(1, 7)])
backup_supabase.requests.get = getter
got = with_page_size(3, lambda: fetch_table("https://x.test", {}, "jobs", "id"))
check("6 lignes en pages de 3 → 3 requêtes", len(getter.urls), 3)
check("aucune ligne dupliquée", len(got), 6)

print("-- échec HTTP")

getter = FakeGet([{"id": i} for i in range(1, 8)], fail_on_call=2)
backup_supabase.requests.get = getter
raised = False
try:
    with_page_size(3, lambda: fetch_table("https://x.test", {}, "jobs", "id"))
except RuntimeError:
    raised = True
check("un 500 en cours de pagination remonte", raised, True)

print()
if failures:
    print(f"{failures} échec(s)")
    sys.exit(1)
print("Tous les checks passent.")
