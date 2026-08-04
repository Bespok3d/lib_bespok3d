# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unified-diff text into Hunk objects. Ported one to one from parseUnifiedDiff in
Bespok3d-desktop/src/main/dev-tools/patch-engine.ts."""
import re

from bespok3d_patch.types import Hunk, HunkLine

_HUNK_HEADER = re.compile(r"^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@")


def _hunk_line(diff_line: str) -> HunkLine | None:
    if diff_line.startswith("+") and not diff_line.startswith("+++"):
        return HunkLine(tag="+", text=diff_line[1:])
    if diff_line.startswith("-") and not diff_line.startswith("---"):
        return HunkLine(tag="-", text=diff_line[1:])
    if diff_line.startswith(" "):
        return HunkLine(tag=" ", text=diff_line[1:])
    return None


def _hunk_lines(diff_lines: list[str]) -> list[HunkLine]:
    mapped = (_hunk_line(diff_line) for diff_line in diff_lines)
    return [line for line in mapped if line is not None]


def _hunk_title(lines: list[HunkLine], hunk_idx: int) -> str:
    first_add = next((line for line in lines if line.tag == "+"), None)
    trimmed = first_add.text.strip() if first_add else ""
    if trimmed:
        snippet = trimmed[:60]
        return f"{snippet}…" if len(snippet) < len(trimmed) else snippet
    return f"Hunk {hunk_idx + 1}"


def _parse_hunk(
    hunk_idx: int, start_idx: int, raw_lines: list[str], hunk_starts: list[int]
) -> Hunk:
    matched = _HUNK_HEADER.match(raw_lines[start_idx])
    suggested_offset = int(matched.group(1)) if matched else 1
    end_idx = hunk_starts[hunk_idx + 1] if hunk_idx + 1 < len(hunk_starts) else len(raw_lines)
    lines = _hunk_lines(raw_lines[start_idx + 1 : end_idx])
    return Hunk(hunk_id=f"h{hunk_idx + 1}", title=_hunk_title(lines, hunk_idx), lines=lines,
                suggested_offset=suggested_offset)


def parse_unified_diff(patch_text: str) -> list[Hunk]:
    raw_lines = patch_text.split("\n")
    hunk_starts = [idx for idx, raw in enumerate(raw_lines) if raw.startswith("@@")]
    hunks = [_parse_hunk(hunk_idx, idx, raw_lines, hunk_starts)
             for hunk_idx, idx in enumerate(hunk_starts)]
    return [hunk for hunk in hunks if hunk.lines]
