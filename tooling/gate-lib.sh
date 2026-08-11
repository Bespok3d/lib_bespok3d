# SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
# The shared half of every repo's gate: the reporting shell, and the Python 3.11 toolchain the Python
# repos lint and test with. A repo's check.sh sources this, declares only its own checks, and ends with
# gate_summary. Without it, 20-odd plugin repos would each carry a copy of run_check and a copy of the
# interpreter provisioning, which is the duplication this whole split is meant to remove.
#
#   B3D_TOOLING="${B3D_TOOLING:-$REPO_ROOT/../../lib_bespok3d/tooling}"
#   . "$B3D_TOOLING/gate-lib.sh"
#
# B3D_TOOLING is the ONE line in each repo that knows where the shared tooling lives. When it ships as
# a package instead of a sibling checkout, each repo changes that line and nothing else; the checks
# themselves never learn how the dependency arrives.
#
# shellcheck shell=bash

B3D_TOOLING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
B3D_CHECK_OUT="${TMPDIR:-/tmp}/b3d-check-out.$$"
B3D_PASS=0
B3D_FAIL=0
B3D_FAILURES=""

# Keep Python from writing __pycache__ into a plugin's files/ tree, which would end up in the package.
export PYTHONDONTWRITEBYTECODE=1

run_check() {
    local label="$1"
    shift
    printf "  %-42s" "$label"
    if "$@" > "$B3D_CHECK_OUT" 2>&1; then
        echo "ok"
        B3D_PASS=$((B3D_PASS + 1))
    else
        echo "FAIL"
        B3D_FAIL=$((B3D_FAIL + 1))
        B3D_FAILURES="$B3D_FAILURES\n--- $label ---\n$(cat "$B3D_CHECK_OUT")\n"
    fi
}

skip_check() {
    printf "  %-42s skipped (%s)\n" "$1" "$2"
}

gate_summary() {
    rm -f "$B3D_CHECK_OUT"
    echo ""
    if [ "$B3D_FAIL" -eq 0 ]; then
        echo "All checks passed ($B3D_PASS/$((B3D_PASS + B3D_FAIL)))"
        return 0
    fi
    echo "Failures: $B3D_FAIL / $((B3D_PASS + B3D_FAIL))"
    printf "%b\n" "$B3D_FAILURES"
    return 1
}

# ── The detectors every repo runs over itself ─────────────────────────────────

# RULE ZERO. Extra args are passed through, so a repo adds a suffix or an extensionless file name
# without forking the guard.
em_dash_check() {
    run_check "em-dash / en-dash ban" node "$B3D_TOOLING_DIR/em-dash-guard.mjs" "$@"
}

# The signing-key closure, over this repo's own workflows. A repo with no .github/workflows passes.
workflow_pinning_check() {
    run_check "workflow pinning" node "$B3D_TOOLING_DIR/workflow-pinning-detector.mjs" "$@"
}

# A release is published by a version tag and by nothing else, and a manual Run workflow click
# reaches the version guard instead of skipping the job. A repo with no release.yml passes.
release_trigger_check() {
    run_check "release trigger" node "$B3D_TOOLING_DIR/release-trigger-detector.mjs" "$@"
}

# A source or homepage that reads as one of our own addresses is this repo, read from its git origin.
# The homepage of a project we wrap is that project's own address and is not judged. A repo with no
# manifest.json, and a manifest declaring neither field, both pass.
manifest_origin_check() {
    run_check "manifest source and homepage" node "$B3D_TOOLING_DIR/manifest-origin-detector.mjs" "$@"
}

# Every shell script the repo ships. shellcheck is not installable everywhere, so its absence is a
# reported skip rather than a failure. Args: the dirs to search.
#
# The lib_bespok3d checkout is skipped because it gates itself, and dependency directories are
# skipped because they are not the repo's own shell. They are pruned during descent rather than
# matched by path, because a path match on `*/lib_bespok3d/*` also matches every file in
# lib_bespok3d's own tree, which left the repo that owns the shared shell never checking any of it.
# Pruning means a search root must be a directory inside the repo, never the repo root of the shared
# checkout itself.
shellcheck_repo() {
    if ! command -v shellcheck > /dev/null 2>&1; then
        skip_check "shellcheck" "not installed: brew install shellcheck"
        return 0
    fi
    while IFS= read -r -d '' script; do
        run_check "shellcheck $(basename "$script")" shellcheck "$script"
    done < <(find "$@" \( -name node_modules -o -name ".venv*" -o -name lib_bespok3d \) -prune -o \
        -name "*.sh" -print0 2>/dev/null)
}

# ── The Python 3.11 toolchain ─────────────────────────────────────────────────
# The printer runs Python 3.11, so the whole fleet lints and tests on 3.11 and nothing else. A silent
# fallback to a newer python3 once hid a target-versus-test interpreter mismatch. One shared tool venv
# serves every repo whose Python has no runtime dependencies of its own: 21 plugin repos do not each
# need their own copy of ruff.

B3D_TOOLS_VENV="$B3D_TOOLING_DIR/.venv-tools"
B3D_PY="$B3D_TOOLS_VENV/bin/python"
B3D_RUFF_CFG="$B3D_TOOLING_DIR/ruff.toml"
B3D_MYPY_CFG="$B3D_TOOLING_DIR/mypy.ini"
B3D_PYTEST_CFG="$B3D_TOOLING_DIR/pytest.ini"

# Follow the interpreter to the real file. A python3.11 on PATH is often a symlink into a standalone
# build's cache (uv drops one in ~/.local/bin); a venv built through that symlink records the link's
# own directory as its home, and the venv's python then cannot find its stdlib at all.
b3d_real_python_path() {
    "$1" -c 'import os, sys; print(os.path.realpath(sys.executable))' 2> /dev/null
}

b3d_python311_bin() {
    if command -v python3.11 > /dev/null 2>&1; then
        b3d_real_python_path "$(command -v python3.11)"
        return 0
    fi
    # A project-local standalone build, downloaded into uv's cache. No system install.
    if command -v uv > /dev/null 2>&1; then
        uv python install 3.11 > /dev/null 2>&1 || true
        b3d_real_python_path "$(uv python find 3.11 2> /dev/null)"
    fi
}

# Build the shared tool venv if it is missing or was built against another interpreter. Call once,
# before any Python check. Exits the gate if 3.11 cannot be found: running the suite on a different
# interpreter than the device would make a green gate meaningless.
b3d_python_tools() {
    local interpreter
    interpreter="$(b3d_python311_bin || true)"
    if [ -z "$interpreter" ] || ! "$interpreter" --version 2>&1 | grep -q "^Python 3\.11\."; then
        echo "  ERROR: Python 3.11 (the printer's runtime) is required but was not found and could not" >&2
        echo "         be provisioned. Install python3.11 or uv; refusing to lint or test on a" >&2
        echo "         different interpreter." >&2
        exit 2
    fi
    if [ -d "$B3D_TOOLS_VENV" ] && ! "$B3D_PY" --version 2>&1 | grep -q "^Python 3\.11\."; then
        echo "  Shared tool venv is $("$B3D_PY" --version 2>&1), not 3.11; rebuilding..."
        rm -rf "$B3D_TOOLS_VENV"
    fi
    # The question is whether the tools are there, not whether the directory is: a build that died
    # halfway leaves a directory behind, and treating that as done fails every Python check instead.
    if [ ! -x "$B3D_TOOLS_VENV/bin/ruff" ]; then
        echo "  Creating the shared tool venv ($("$interpreter" --version 2>&1))..."
        rm -rf "$B3D_TOOLS_VENV"
        b3d_build_tool_venv "$interpreter" || exit 2
    fi
}

b3d_build_tool_venv() {
    local interpreter="$1"
    "$interpreter" -m venv "$B3D_TOOLS_VENV" \
        && "$B3D_TOOLS_VENV/bin/pip" install --quiet --upgrade pip \
        && "$B3D_TOOLS_VENV/bin/pip" install --quiet -r "$B3D_TOOLING_DIR/python-tools.txt" \
        && return 0
    rm -rf "$B3D_TOOLS_VENV"
    echo "  ERROR: could not build the shared tool venv with $interpreter." >&2
    return 1
}

# Lint FROM the target dir. The shared ruff config's per-file-ignores (PLR2004 in tests/**) match on
# the path relative to the working dir, so an absolute path never matches them and would spuriously
# flag legitimate magic values in a test's assertions. Args: <dir> then paths relative to it.
ruff_in_dir() {
    local dir="$1"
    shift
    ( cd "$dir" && "$B3D_TOOLS_VENV/bin/ruff" check --config "$B3D_RUFF_CFG" "$@" )
}

# Test FROM the target dir, with the dir as rootdir. Pointing pytest at a config file outside the tree
# would otherwise move rootdir out of the repo and stop the tests' own conftest.py from being
# collected. Args: <dir> then paths relative to it.
pytest_in_dir() {
    local dir="$1"
    shift
    ( cd "$dir" && "$B3D_TOOLS_VENV/bin/pytest" -c "$B3D_PYTEST_CFG" --rootdir . --tb=short -q "$@" )
}

# Type-check FROM the target dir, for the same reason. MYPYPATH may be set by the caller.
mypy_in_dir() {
    local dir="$1"
    shift
    ( cd "$dir" && "$B3D_TOOLS_VENV/bin/mypy" --config-file "$B3D_MYPY_CFG" "$@" )
}
