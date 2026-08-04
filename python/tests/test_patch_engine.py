# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Drives the shared patch vectors through the ported engine. A failing vector means the port is
wrong, never the vector: the same fixtures pass against the app's real TS engine."""
from dataclasses import asdict
from typing import Any

import pytest
from bespok3d_patch import analyze, apply, parse_unified_diff
from bespok3d_patch.corpus import load_patch_vectors

VECTORS = load_patch_vectors()
NON_REVERSE_VECTORS = [case for case in VECTORS if not case.get("reverse", False)]


@pytest.mark.parametrize("case", VECTORS, ids=lambda case: str(case["name"]))
def test_apply_matches_expectation(case: dict[str, Any]) -> None:
    hunks = parse_unified_diff(case["diff"])
    result = apply(hunks, case["source"], reverse=bool(case.get("reverse", False)))
    expect = case["expect"]
    assert result.applied == expect["applied"]
    if result.applied:
        assert result.text == expect["result"]
    else:
        assert [asdict(reject) for reject in result.rejects] == expect["rejects"]


@pytest.mark.parametrize("case", NON_REVERSE_VECTORS, ids=lambda case: str(case["name"]))
def test_analyze_matches_expectation(case: dict[str, Any]) -> None:
    hunks = parse_unified_diff(case["diff"])
    analyses = analyze(hunks, case["source"])
    assert [asdict(analysis) for analysis in analyses] == case["expect"]["analyses"]
