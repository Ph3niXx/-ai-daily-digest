"""Construction des requetes IGDB. Aucun appel reseau.
Run: python tests/test_igdb_client.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from igdb_client import chunks, id_list, quoted_list

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


check("id_list simple", id_list([1, 2, 3]), "(1,2,3)")
check("id_list un seul", id_list([42]), "(42)")
check("id_list dedoublonne et trie", id_list([3, 1, 3, 2]), "(1,2,3)")
# external_games.uid est une CHAINE cote IGDB : un appid non quote ne
# matche rien et la requete revient vide sans erreur — panne silencieuse.
check("quoted_list quote chaque valeur",
      quoted_list([620, 1145360]), '("1145360","620")')
check("quoted_list dedoublonne", quoted_list([620, 620]), '("620")')
check("chunks exact", list(chunks([1, 2, 3, 4], 2)), [[1, 2], [3, 4]])
check("chunks reste", list(chunks([1, 2, 3], 2)), [[1, 2], [3]])
check("chunks liste vide", list(chunks([], 2)), [])
check("chunks plus grand que la liste", list(chunks([1], 10)), [[1]])

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
