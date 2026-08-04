# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Applying analyzed hunks to source text. Ported one to one from applyPatch in
Bespok3d-desktop/src/main/dev-tools/patch-apply.ts."""
from bespok3d_patch._scoring import analyze, pre_image_lines
from bespok3d_patch.types import ApplyResult, Hunk, HunkAnalysis, HunkLine, HunkTag, RejectedHunk


def _swap_tag(tag: HunkTag) -> HunkTag:
    if tag == "+":
        return "-"
    if tag == "-":
        return "+"
    return " "


def _reversed_hunk(hunk: Hunk) -> Hunk:
    swapped_lines = [HunkLine(tag=_swap_tag(line.tag), text=line.text) for line in hunk.lines]
    return Hunk(
        hunk_id=hunk.hunk_id,
        title=hunk.title,
        lines=swapped_lines,
        suggested_offset=hunk.suggested_offset,
    )


def _post_image_lines(hunk: Hunk) -> list[str]:
    return [line.text for line in hunk.lines if line.tag in (" ", "+")]


def _rejected_hunk(hunk: Hunk, analysis: HunkAnalysis) -> RejectedHunk:
    best_confidence = max(point.confidence for point in analysis.confidence_profile)
    return RejectedHunk(
        hunk_id=hunk.hunk_id,
        title=hunk.title,
        state=analysis.state,
        best_confidence=best_confidence,
    )


def _splice_hunk(lines: list[str], hunk: Hunk, offset: int) -> None:
    lines[offset - 1 : offset - 1 + len(pre_image_lines(hunk))] = _post_image_lines(hunk)


def apply(hunks: list[Hunk], source_text: str, reverse: bool = False) -> ApplyResult:
    working_hunks = [_reversed_hunk(hunk) for hunk in hunks] if reverse else hunks
    analyses = analyze(working_hunks, source_text)
    rejects = [_rejected_hunk(hunk, analysis) for hunk, analysis in zip(working_hunks, analyses)
               if analysis.state != "snapped"]
    if rejects:
        return ApplyResult(applied=False, text=source_text, rejects=rejects)

    lines = source_text.split("\n")
    ordered = sorted(
        zip(working_hunks, analyses), key=lambda pair: pair[1].candidates[0].offset, reverse=True
    )
    for hunk, analysis in ordered:
        _splice_hunk(lines, hunk, analysis.candidates[0].offset)

    return ApplyResult(applied=True, text="\n".join(lines), rejects=[])
