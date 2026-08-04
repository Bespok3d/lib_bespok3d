#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
# This repo's own gate. lib_bespok3d is the shared collection: the SDK contract (TS and Python) and
# the gate tooling every other repo sources. It depends on no sibling repo at all. Exits non-zero on
# any failure.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# This repo IS the home of the shared gate helpers and the workspace-wide detectors, so the path is
# local. Every other repo points at this directory. See tooling/README.md.
B3D_TOOLING="${B3D_TOOLING:-$REPO_ROOT/tooling}"
# shellcheck source=/dev/null
. "$B3D_TOOLING/gate-lib.sh"

cd "$REPO_ROOT" || exit 1

echo ""
echo "lib_bespok3d gate"

b3d_python_tools

# The detectors enforce a rule in every repo, so a break here breaks every gate at once.
run_check "detector tests"     node --test "$B3D_TOOLING"/*.test.mjs
run_check "tsc (contract)"     ts/node_modules/.bin/tsc -p ts/tsconfig.json
run_check "vitest (contract)"  ts/node_modules/.bin/vitest run --root ts
run_check "ruff (contract)"    ruff_in_dir "$REPO_ROOT" python
run_check "pytest (python)"    pytest_in_dir "$REPO_ROOT/python" tests

workflow_pinning_check "$REPO_ROOT"
em_dash_check "$REPO_ROOT/tooling" "$REPO_ROOT/scripts" "$REPO_ROOT/ts/contract" \
    "$REPO_ROOT/python" "$REPO_ROOT/README.md"
shellcheck_repo "$REPO_ROOT/tooling" "$REPO_ROOT/scripts"

# Per-file REUSE compliance: every file is covered by a copyright and licence statement, its own
# header or the REUSE.toml block, and every licence a file names has its text in LICENSES/. The file
# list is tracked plus not-yet-committed files, so a newly added file is checked before it is
# committed rather than after, and a not-yet-committed rename does not point the linter at a path
# that no longer exists. `reuse` is not a workspace dependency: an installed one is used when
# present, otherwise uv runs it from cache, and a machine with neither reports the check as skipped
# rather than as passed.
# shellcheck disable=SC2329  # run_check invokes this by name, which shellcheck cannot follow.
run_reuse_lint() {
    if command -v reuse > /dev/null 2>&1; then
        reuse "$@"
    else
        uvx --quiet --from 'reuse[charset-normalizer]' reuse "$@"
    fi
}

# shellcheck disable=SC2329  # run_check invokes this by name, which shellcheck cannot follow.
reuse_per_file_check() {
    local licensed_paths=()
    local candidate_path
    local licensed_count=0
    while IFS= read -r -d '' candidate_path; do
        if [ -f "$candidate_path" ]; then
            licensed_paths+=("$candidate_path")
            licensed_count=$((licensed_count + 1))
        fi
    done < <(git ls-files -z --cached --others --exclude-standard)
    if [ "$licensed_count" -eq 0 ]; then
        return 0
    fi
    run_reuse_lint lint-file "${licensed_paths[@]}"
}

if command -v reuse > /dev/null 2>&1 || command -v uvx > /dev/null 2>&1; then
    run_check "reuse (per-file licensing)" reuse_per_file_check
else
    skip_check "reuse (per-file licensing)" "install reuse, or install uv so it can be run from cache"
fi

gate_summary || exit 1
