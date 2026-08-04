# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""The shapes the patch engine speaks. They mirror the app's dev-tools patch types one to one, so a
vector written from one side reads on the other."""
from dataclasses import dataclass
from typing import Literal

HunkTag = Literal[" ", "+", "-"]
MatchState = Literal["snapped", "ambiguous", "no_match"]


@dataclass(frozen=True)
class HunkLine:
    tag: HunkTag
    text: str


@dataclass(frozen=True)
class Hunk:
    hunk_id: str
    title: str
    lines: list[HunkLine]
    suggested_offset: int


@dataclass(frozen=True)
class ConfidencePoint:
    offset: int
    confidence: int


@dataclass(frozen=True)
class HunkCandidate:
    offset: int
    confidence: int


@dataclass(frozen=True)
class HunkAnalysis:
    hunk_id: str
    state: MatchState
    confidence_profile: list[ConfidencePoint]
    candidates: list[HunkCandidate]


@dataclass(frozen=True)
class RejectedHunk:
    hunk_id: str
    title: str
    state: MatchState
    best_confidence: int


@dataclass(frozen=True)
class ApplyResult:
    applied: bool
    text: str
    rejects: list[RejectedHunk]
