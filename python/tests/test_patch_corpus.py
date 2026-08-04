# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Any

import pytest
from bespok3d_patch.corpus import (
    REQUIRED_CASE_KEYS,
    REQUIRED_EXPECT_KEYS,
    VECTOR_DIR,
    load_patch_vectors,
)

# The app's patch-corpus.test.ts asserts the same floor, so a case added for one engine and not the
# other shows up as a count mismatch between the two gates instead of passing quietly on one side.
TS_CASES_COVERED = 12

VECTORS = load_patch_vectors()


def test_every_vector_file_parses() -> None:
    assert len(VECTORS) == len(list(VECTOR_DIR.glob("*.json")))
    assert len(VECTORS) >= TS_CASES_COVERED


@pytest.mark.parametrize("case", VECTORS, ids=lambda case: str(case["name"]))
def test_case_carries_the_required_keys(case: dict[str, Any]) -> None:
    assert all(key in case for key in REQUIRED_CASE_KEYS)
    assert all(key in case["expect"] for key in REQUIRED_EXPECT_KEYS)
    assert case["expect"]["analyses"]


@pytest.mark.parametrize("case", VECTORS, ids=lambda case: str(case["name"]))
def test_case_states_what_applying_it_produces(case: dict[str, Any]) -> None:
    produced = "result" if case["expect"]["applied"] else "rejects"
    assert produced in case["expect"]


def test_case_names_are_unique_and_match_their_file() -> None:
    names = sorted(str(case["name"]) for case in VECTORS)
    assert len(set(names)) == len(names)
    files = sorted(path.name for path in VECTOR_DIR.glob("*.json"))
    assert [f"{name}.json" for name in names] == files
