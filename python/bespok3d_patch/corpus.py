# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Reads the shared patch vectors. The app's TypeScript engine and this one answer the same
questions, so both gates drive themselves from this one corpus instead of two drifting fixture
sets."""
import json
from pathlib import Path
from typing import Any

VECTOR_DIR = Path(__file__).resolve().parents[2] / "vectors" / "patch"
REQUIRED_CASE_KEYS = ("name", "source", "diff", "expect")
REQUIRED_EXPECT_KEYS = ("applied", "analyses")


def load_patch_vectors(vector_dir: Path = VECTOR_DIR) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = [
        json.loads(case_file.read_text()) for case_file in sorted(vector_dir.glob("*.json"))
    ]

    return cases
