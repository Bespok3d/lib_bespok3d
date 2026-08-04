# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""The Bespok3d patch engine: a pure-Python unified-diff reader, matcher and applier.

It exists so the daemon stops shelling out to the `patch` binary, which is not on every printer and
answers differently from the app's preview when it is."""
from bespok3d_patch.engine import AMBIGUOUS_MIN, SNAP_THRESHOLD, analyze, apply, parse_unified_diff

__all__ = ["AMBIGUOUS_MIN", "SNAP_THRESHOLD", "analyze", "apply", "parse_unified_diff"]
