#!/usr/bin/env python3
"""Tests du walk franchise (contrat commun front JS / pipeline Python).
Run: python tests/test_franchise_walk.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipelines.anime_tracker_sync import build_franchise, chain_ids, missing_ids

FIXTURES = json.loads((Path(__file__).parent / "fixtures" / "franchise_graphs.json").read_text(encoding="utf-8"))


def media_map(case):
    return {m["id"]: m for m in case["media"]}


def main():
    failures = 0
    for case in FIXTURES["cases"]:
        got = build_franchise(media_map(case), case["anchor"])
        exp = case["expected"]
        if got != exp:
            failures += 1
            print(f"FAIL {case['name']}\n  expected: {exp}\n  got:      {got}")
        else:
            print(f"ok   {case['name']}")
    for mc in FIXTURES["missing_cases"]:
        all_media = None
        for case in FIXTURES["cases"]:
            if mc["anchor"] in media_map(case):
                all_media = media_map(case)
                break
        known = {k: v for k, v in all_media.items() if k in set(mc["known"])}
        got = sorted(missing_ids(known, mc["anchor"]))
        if got != sorted(mc["expected_missing"]):
            failures += 1
            print(f"FAIL {mc['name']}: expected {mc['expected_missing']}, got {got}")
        else:
            print(f"ok   {mc['name']}")
    if failures:
        print(f"\n{failures} failure(s)")
        sys.exit(1)
    print("\nAll walk tests passed.")


if __name__ == "__main__":
    main()
