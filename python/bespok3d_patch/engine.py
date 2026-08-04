# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pure text in, text out. The engine never opens a file and never sees a path: the caller reads the
source, hands it over, and writes whatever comes back.

Ported one to one from Bespok3d-desktop/src/main/dev-tools/patch-engine.ts and patch-apply.ts; the
shared vectors under lib_bespok3d/vectors/patch pin both sides to the same answers. The three
functions below are the public surface; _diff, _scoring and _splice hold the concern each name is
ported from, split out to stay under this repo's file-size ceiling."""
from bespok3d_patch._diff import parse_unified_diff
from bespok3d_patch._scoring import AMBIGUOUS_MIN, SNAP_THRESHOLD, analyze
from bespok3d_patch._splice import apply

__all__ = ["AMBIGUOUS_MIN", "SNAP_THRESHOLD", "analyze", "apply", "parse_unified_diff"]
