# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pure text in, text out. The engine never opens a file and never sees a path: the caller reads the
source, hands it over, and writes whatever comes back.

Stage A1 lays the road; the bodies are ported from the app's patch-engine.ts in Stage A2, and the
shared vectors under lib_bespok3d/vectors/patch pin both sides to the same answers."""
from bespok3d_patch.types import ApplyResult, Hunk, HunkAnalysis

# A hunk lands only where the source matches it this well; below that the install fails rather than
# guessing, because nobody is standing at the printer to answer a fuzz prompt.
SNAP_THRESHOLD = 80
# Below this a candidate offset is not worth showing a human at all.
AMBIGUOUS_MIN = 50

PORT_PENDING = "Stage A2 ports this from Bespok3d-desktop/src/main/dev-tools/patch-engine.ts"


def parse_unified_diff(patch_text: str) -> list[Hunk]:
    raise NotImplementedError(PORT_PENDING)


def analyze(hunks: list[Hunk], source_text: str) -> list[HunkAnalysis]:
    raise NotImplementedError(PORT_PENDING)


def apply(hunks: list[Hunk], source_text: str, reverse: bool = False) -> ApplyResult:
    raise NotImplementedError(PORT_PENDING)
