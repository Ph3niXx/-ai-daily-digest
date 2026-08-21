"""backup_supabase est le garde-fou d'intégrité de la sauvegarde.

Une sauvegarde partielle qui se croit complète est pire que pas de sauvegarde :
on ne découvre le trou qu'au moment de restaurer. Quatre invariants la protègent.

1. La pagination doit trier. Sans ORDER BY, PostgREST ne garantit pas la stabilité
   des pages entre deux requêtes : un offset peut alors sauter ou dupliquer des
   lignes, silencieusement. Chaque table du périmètre doit donc déclarer sa clef.
2. Une erreur HTTP doit remonter. Si fetch_table avalait un 500 au milieu de la
   pagination, il renverrait les pages déjà lues comme si c'était le total —
   exactement le défaut relevé sur weekly_analysis (run vert, zéro écriture).
3. Le périmètre doit couvrir tout ce que la donnée a d'irremplaçable. On ne
   verrouille pas la liste ligne à ligne (elle bougera), mais la RÈGLE qui la
   produit : toute table que le catalogue d'architecture donne pour saisie par
   l'utilisateur doit être dans TABLES. Sans ce test, une table saisie ajoutée
   demain resterait hors sauvegarde sans que rien ne le signale — c'est
   exactement comme ça qu'usage_events avait été oubliée.
4. Une table vide ne doit pas faire échouer le run. Un périmètre qui grandit
   finit par inclure une table légitimement vide (personne n'a encore rien
   saisi) ; si elle faisait rougir la sauvegarde, la réaction serait de la
   retirer du périmètre — donc d'arrêter de sauvegarder pour faire taire
   l'alerte. Seule la sauvegarde entièrement blanche est un échec.

Run: python tests/test_backup_supabase.py
"""
import os
import sys
from pathlib import Path
from urllib.parse import unquote

# pyyaml est installé par .github/workflows/tests.yml ; l'invariant de périmètre
# se lit dans le catalogue d'architecture, pas dans une liste recopiée ici.
import yaml

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

# Le critère est « refabricable À L'IDENTIQUE ». Ces quatre-là sont datées :
# daily_briefs et signal_tracking sortent bien d'un pipeline, mais depuis des
# flux RSS dont les items disparaissent — le relancer aujourd'hui n'écrirait que
# le brief d'aujourd'hui, pas ceux d'avril.
check(
    "les tables datées sont dans le périmètre",
    sorted(
        t
        for t in ("usage_events", "daily_briefs", "signal_tracking", "jarvis_conversations")
        if t not in TABLES
    ),
    [],
)

print("-- invariant : tout ce qui est saisi est sauvegardé")

# Le catalogue attribue à chaque table un owner_pipeline. Trois valeurs
# désignent une donnée que personne ne sait re-produire : `front` (écrite depuis
# le cockpit), `manual` (posée à la main en base) et `db_trigger` (dérivée d'une
# saisie, ici l'historique du profil). Toutes doivent être dans TABLES.
#
# Le second volet du critère — « daté » — n'est PAS vérifiable ici : le
# catalogue ne porte aucun champ disant si une table est horodatée, et le
# deviner depuis owner_pipeline reviendrait à réécrire le jugement à la main.
# Ces tables-là restent donc verrouillées nommément par le check ci-dessus.
SAISIE_UTILISATEUR = ("front", "manual", "db_trigger")

catalogue = yaml.safe_load(
    (Path(__file__).resolve().parents[1] / "docs/architecture/dependencies.yaml").read_text(
        encoding="utf-8"
    )
)
saisies = [
    t["name"]
    for t in catalogue["tables"]
    if t.get("owner_pipeline") in SAISIE_UTILISATEUR
]

check("le catalogue déclare bien des tables saisies", len(saisies) > 5, True)
check(
    "aucune table saisie n'est hors sauvegarde",
    sorted(set(saisies) - set(TABLES)),
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

print("-- table vide")

getter = FakeGet([])
backup_supabase.requests.get = getter
got = with_page_size(3, lambda: fetch_table("https://x.test", {}, "usage_events", "id"))
check("une table vide rend une liste vide", got, [])
check("une table vide ne coûte qu'une requête", len(getter.urls), 1)


class FakeGetByTable:
    """Sert un jeu de lignes par table ; une table absente du dict rend un 404."""

    def __init__(self, par_table):
        self.par_table = par_table

    def __call__(self, url, headers=None, timeout=None):
        table = url.split("/rest/v1/")[1].split("?")[0]
        if table not in self.par_table:
            return FakeResponse(None, status=404)
        offset = int(url.split("offset=")[1].split("&")[0])
        limit = int(url.split("limit=")[1].split("&")[0])
        return FakeResponse(self.par_table[table][offset:offset + limit])


def run_main(par_table, tables):
    """Joue main() en dry-run sur un périmètre bidon ; rend le code de sortie."""
    original_tables = backup_supabase.TABLES
    original_argv = sys.argv
    backup_supabase.TABLES = tables
    backup_supabase.requests.get = FakeGetByTable(par_table)
    sys.argv = ["backup_supabase.py", "--dry-run"]
    os.environ["SUPABASE_URL"] = "https://x.test"
    os.environ["SUPABASE_SERVICE_KEY"] = "clef-de-test"
    try:
        backup_supabase.main()
        return 0
    except SystemExit as exc:
        return exc.code
    finally:
        backup_supabase.TABLES = original_tables
        sys.argv = original_argv


print("-- une table vide ne fait pas échouer la sauvegarde")

# Le périmètre grandit : il finira par contenir une table que l'utilisateur n'a
# pas encore alimentée. Si zéro ligne faisait rougir le run, la façon la plus
# simple de rétablir le vert serait de la sortir du périmètre — donc d'arrêter
# de la sauvegarder.
check(
    "une table vide parmi des tables pleines → succès",
    run_main(
        {"jobs": [{"id": 1}, {"id": 2}], "jarvis_conversations": []},
        {"jobs": "id", "jarvis_conversations": "id"},
    ),
    0,
)

print("-- sauvegarde blanche et table absente")

check(
    "toutes les tables vides → échec",
    run_main({"jobs": [], "jarvis_conversations": []}, {"jobs": "id", "jarvis_conversations": "id"}),
    1,
)

# Un DROP ou un renommage doit être bruyant : sans ça la sauvegarde rétrécit
# sans que personne ne s'en aperçoive avant d'avoir à restaurer.
check(
    "une table absente (404) → échec",
    run_main({"jobs": [{"id": 1}]}, {"jobs": "id", "table_disparue": "id"}),
    1,
)

print()
if failures:
    print(f"{failures} échec(s)")
    sys.exit(1)
print("Tous les checks passent.")
