#!/usr/bin/env bash
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

workflow_pinning_check "$REPO_ROOT"
em_dash_check "$REPO_ROOT/tooling" "$REPO_ROOT/scripts" "$REPO_ROOT/ts/contract" \
    "$REPO_ROOT/python" "$REPO_ROOT/README.md"
shellcheck_repo "$REPO_ROOT/tooling" "$REPO_ROOT/scripts"

gate_summary || exit 1
