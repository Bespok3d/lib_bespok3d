# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
import dataclasses
import json
from collections.abc import Callable
from pathlib import Path

import bespok3d_patch
import pytest
from bespok3d_patch.corpus import load_patch_vectors
from bespok3d_patch.types import ApplyResult, Hunk, HunkAnalysis, HunkLine, RejectedHunk

EXPORTED_NAMES = ("parse_unified_diff", "analyze", "apply", "SNAP_THRESHOLD", "AMBIGUOUS_MIN")
STAGED_CASE = {
    "name": "staged-case",
    "source": "a line of context\n",
    "diff": "@@ -1,1 +1,1 @@\n-a line of context\n+a line of changed context\n",
    "expect": {"applied": True, "result": "a line of changed context\n", "analyses": []},
}


def test_the_package_exports_the_settled_api() -> None:
    assert sorted(bespok3d_patch.__all__) == sorted(EXPORTED_NAMES)
    assert all(hasattr(bespok3d_patch, name) for name in EXPORTED_NAMES)


def test_the_thresholds_match_the_typescript_engine() -> None:
    assert bespok3d_patch.SNAP_THRESHOLD == 80
    assert bespok3d_patch.AMBIGUOUS_MIN == 50


def test_a_hunk_snaps_only_above_the_ambiguous_band() -> None:
    assert bespok3d_patch.AMBIGUOUS_MIN < bespok3d_patch.SNAP_THRESHOLD


@pytest.mark.parametrize(
    "call_the_engine",
    [
        lambda: bespok3d_patch.parse_unified_diff("@@ -1,1 +1,1 @@\n"),
        lambda: bespok3d_patch.analyze([], "source"),
        lambda: bespok3d_patch.apply([], "source"),
    ],
    ids=["parse_unified_diff", "analyze", "apply"],
)
def test_the_engine_says_it_is_unported_rather_than_answering_wrongly(
    call_the_engine: Callable[[], object],
) -> None:
    with pytest.raises(NotImplementedError, match="patch-engine.ts"):
        call_the_engine()


def test_the_types_are_frozen_so_an_analysis_cannot_be_edited_after_the_fact() -> None:
    analysis = HunkAnalysis(hunk_id="h1", state="snapped", confidence_profile=[], candidates=[])
    with pytest.raises(dataclasses.FrozenInstanceError):
        analysis.state = "no_match"  # type: ignore[misc]


def test_a_hunk_carries_its_lines_and_the_offset_the_patch_suggested() -> None:
    hunk = Hunk(
        hunk_id="h1",
        title="a line of context",
        lines=[HunkLine(tag=" ", text="a line of context")],
        suggested_offset=4,
    )
    assert hunk.suggested_offset == 4
    assert hunk.lines[0].tag == " "


def test_a_result_carries_the_rejects_that_explain_a_refusal() -> None:
    reject = RejectedHunk(hunk_id="h1", title="a line", state="no_match", best_confidence=12)
    result = ApplyResult(applied=False, text="unchanged", rejects=[reject])
    assert result.applied is False
    assert result.rejects[0].hunk_id == "h1"


def test_the_loader_reads_a_directory_it_is_handed(tmp_path: Path) -> None:
    (tmp_path / "notes.txt").write_text("not a vector")
    (tmp_path / "staged-case.json").write_text(json.dumps(STAGED_CASE))

    assert [case["name"] for case in load_patch_vectors(tmp_path)] == ["staged-case"]
