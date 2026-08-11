# Shared gate tooling

Every repo in the workspace gates itself: `cd <repo> && ./scripts/check.sh`, green from its own root,
with no reach into a sibling. Two things would otherwise have to be copied into all of them: the
detectors that enforce project-wide rules, and the plumbing every gate needs (a pass/fail reporter and
a Python 3.11 toolchain). They live here once.

This directory is a holding pen, not part of the `lib_bespok3d` library. Nothing here imports from
`ts/` or `python/`, and nothing there imports from here. How repos consume it WILL change (a published
package rather than a sibling checkout), so the coupling is held to one line per repo.

## How a repo consumes it

One line, at the top of the repo's `scripts/check.sh`:

```sh
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
B3D_TOOLING="${B3D_TOOLING:-$REPO_ROOT/../lib_bespok3d/tooling}"   # depth matches where the repo sits
. "$B3D_TOOLING/gate-lib.sh"
```

That is the only line that knows where the tooling is. Override `B3D_TOOLING` in the environment to
point a gate somewhere else. When this ships as a package, each repo changes that one line; no check
changes.

## What `gate-lib.sh` gives you

| Call | What it does |
| --- | --- |
| `run_check <label> <cmd...>` | runs the command quietly, prints `ok` or `FAIL`, keeps the output for the summary |
| `skip_check <label> <why>` | records a check that could not run, with the reason on screen |
| `gate_summary` | prints the tally and every failure's output; returns non-zero if anything failed |
| `em_dash_check <path>...` | RULE ZERO over the paths given (see below) |
| `workflow_pinning_check <dir>...` | the signing-key closure over the repo's own `.github/workflows` |
| `manifest_origin_check <dir>...` | a manifest `source` or `homepage` under our own account is this repo |
| `b3d_python_tools` | builds the shared Python 3.11 tool venv if needed; call once before any Python check |
| `ruff_in_dir <dir> <paths...>` | ruff with the shared config, run FROM `<dir>` |
| `pytest_in_dir <dir> <paths...>` | pytest with the shared config, run FROM `<dir>` |
| `mypy_in_dir <dir> <paths...>` | mypy with the shared config, run FROM `<dir>` |

The three `_in_dir` helpers run from the target directory on purpose: ruff's per-file-ignores and
pytest's `conftest.py` collection are both resolved relative to the working directory, so an absolute
path from elsewhere silently changes what is checked.

A repo's gate ends with `gate_summary` and exits on its status:

```sh
gate_summary || exit 1
```

## The detectors

**`em-dash-guard.mjs`** fails on an em-dash or en-dash in any authored file (RULE ZERO). Scope comes
from the caller, detection does not:

```sh
em_dash_check "$REPO_ROOT/src" "$REPO_ROOT/doc" "$REPO_ROOT/README.md"
em_dash_check "$REPO_ROOT" --name S99bespok3d --suffix .cfg
```

Directories are walked, a named file is always read. Dependency, build and cache directories are
skipped by name; inside a walked tree only authored suffixes are read. `--suffix` and `--name` ADD to
the defaults. A path that does not exist is skipped, so a gate can name an optional tree without a
conditional.

**`workflow-pinning-detector.mjs`** fails on a workflow that lets mutable code near the org signing
key: an unpinned org action or cross-repo checkout, a secret in a `pr-build.yml`, a
`pull_request`-triggered `release.yml`. Each repo scans its own checkout:

```sh
workflow_pinning_check "$REPO_ROOT"
```

**`manifest-origin-detector.mjs`** fails when a `manifest.json` declares a `source` or `homepage` that
reads as one of our own addresses and is not the repo the manifest lives in. The app shows both to the
user as the plugin's links, and 25 manifests once shipped an invented
`github.com/bespok3d-org/plugin-<name>` address that had never existed. The repo's own git origin is
the truth, so the check is offline and exact:

```sh
manifest_origin_check "$REPO_ROOT"
```

A plugin that wraps somebody else's project points its homepage at that project, so only an address
under our own account is judged: `octoeverywhere.com` passes, and `bespok3d-org` is caught because it
is a near miss on our account name rather than a different account. Built copies under `dist/` and
vendored ones under `node_modules/` are skipped, an ssh origin and an https manifest compare equal,
and a checkout with no origin at all is reported and passed because there is nothing on disk to
compare against.

## Running the tooling's own tests

```sh
node --test lib_bespok3d/tooling/*.test.mjs
```

Plain `node`, no framework: node is the one runtime every repo's gate already needs, so the tooling
adds no dependency to any repo that uses it. `lib_bespok3d`'s own `scripts/check.sh` runs this suite.

## The Python config files

`ruff.toml`, `mypy.ini`, `pytest.ini` and `python-tools.txt` configure the Python that ships inside
plugin and adapter packages. They are kept in step with `daemon/pyproject.toml` **by hand**: the daemon
gates standalone and therefore owns its own config, but the rules are meant to be identical everywhere,
so a rule change belongs in both places.
