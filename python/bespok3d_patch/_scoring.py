# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Confidence scoring and candidate offsets for a hunk against source text. Ported one to one from
scoreAtOffset/buildProfile/pickCandidates/analyzeHunk in
Bespok3d-desktop/src/main/dev-tools/patch-engine.ts."""
import math

from bespok3d_patch.types import ConfidencePoint, Hunk, HunkAnalysis, HunkCandidate, MatchState

# A hunk lands only where the source matches it this well; below that the install fails rather than
# guessing, because nobody is standing at the printer to answer a fuzz prompt.
SNAP_THRESHOLD = 80
# Below this a candidate offset is not worth showing a human at all.
AMBIGUOUS_MIN = 50
# Two or more offsets this strong is not a snap, it is a choice a human has to make.
AMBIGUOUS_STRONG_COUNT = 2
CANDIDATE_LIMIT = 3
# Below this length a substring match is too common to mean anything.
MIN_SNIPPET_LENGTH = 4


def _round_like_js(value: float) -> int:
    """JS Math.round rounds half up, not half to even; a real vector needs 12.5 -> 13."""
    return math.floor(value + 0.5)


def pre_image_lines(hunk: Hunk) -> list[str]:
    """The source-side lines a hunk expects to find, in order. Shared with _splice, which needs the
    same count to know how much of the source a snapped hunk replaces."""
    return [line.text for line in hunk.lines if line.tag in (" ", "-")]


def _line_similarity(patch_line: str, source_line: str) -> float:
    if patch_line == source_line:
        return 1.0
    trimmed_patch = patch_line.strip()
    trimmed_source = source_line.strip()
    if trimmed_patch == trimmed_source:
        return 0.85
    if not trimmed_patch or not trimmed_source:
        return 0.0
    contains_snippet = len(trimmed_patch) > MIN_SNIPPET_LENGTH and trimmed_patch in source_line
    return 0.5 if contains_snippet else 0.0


def _line_contribution(
    patch_line: str, source_lines: list[str], source_idx: int
) -> tuple[float, float]:
    source_line = source_lines[source_idx] if 0 <= source_idx < len(source_lines) else ""
    weight = 1.0 if patch_line.strip() else 0.3
    return _line_similarity(patch_line, source_line) * weight, weight


def _score_at_offset(pre_image: list[str], source_lines: list[str], offset: int) -> int:
    if not pre_image:
        return 100
    start_idx = offset - 1
    contributions = [_line_contribution(patch_line, source_lines, start_idx + line_idx)
                      for line_idx, patch_line in enumerate(pre_image)]
    total = sum(score for score, _ in contributions)
    weight_sum = sum(weight for _, weight in contributions)
    return _round_like_js(total / weight_sum * 100)


def _confidence_point(
    pre_image: list[str], source_lines: list[str], offset: int
) -> ConfidencePoint:
    confidence = _score_at_offset(pre_image, source_lines, offset)
    return ConfidencePoint(offset=offset, confidence=confidence)


def _build_profile(pre_image: list[str], source_lines: list[str]) -> list[ConfidencePoint]:
    max_offset = max(1, len(source_lines) - len(pre_image) + 1)
    return [_confidence_point(pre_image, source_lines, offset_idx + 1)
            for offset_idx in range(max_offset)]


def _as_candidates(points: list[ConfidencePoint]) -> list[HunkCandidate]:
    return [HunkCandidate(offset=point.offset, confidence=point.confidence) for point in points]


def _pick_candidates(
    profile: list[ConfidencePoint], suggested_offset: int
) -> tuple[MatchState, list[HunkCandidate]]:
    strong = [point for point in profile if point.confidence >= SNAP_THRESHOLD]
    if len(strong) == 1:
        return "snapped", _as_candidates(strong)
    if len(strong) >= AMBIGUOUS_STRONG_COUNT:
        sorted_strong = sorted(strong, key=lambda point: -point.confidence)
        return "ambiguous", _as_candidates(sorted_strong[:CANDIDATE_LIMIT])
    partial = sorted(
        (point for point in profile if point.confidence >= AMBIGUOUS_MIN),
        key=lambda point: (-point.confidence, abs(point.offset - suggested_offset)),
    )[:CANDIDATE_LIMIT]
    return "no_match", _as_candidates(partial)


def _analyze_hunk(hunk: Hunk, source_lines: list[str]) -> HunkAnalysis:
    pre_image = pre_image_lines(hunk)
    profile = _build_profile(pre_image, source_lines)
    state, candidates = _pick_candidates(profile, hunk.suggested_offset)
    return HunkAnalysis(
        hunk_id=hunk.hunk_id, state=state, confidence_profile=profile, candidates=candidates
    )


def analyze(hunks: list[Hunk], source_text: str) -> list[HunkAnalysis]:
    source_lines = source_text.split("\n")
    return [_analyze_hunk(hunk, source_lines) for hunk in hunks]
