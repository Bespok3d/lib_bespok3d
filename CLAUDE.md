# lib_bespok3d: instructions for AI assistants

You are working in `lib_bespok3d`, the shared-code home for the Bespok3d workspace. Bespok3d is a
printer-agnostic plugin manager for Klipper printers that runs on stock firmware. This repo is where the
code that is genuinely common across the app, the daemon, and the adapters is collected once and imported,
never duplicated, and it carries the shared gate detectors every other repo runs. This file is the
contract for any LLM or agent that edits this repo. Contributors here often work with AI assistance, so
the rules and the design intent are written down and enforced in the gate, not left implicit.

If you are a non-Claude tool, `AGENTS.md` points you here.

## What this repo ships

Read `README.md` for the full layout. In short:

- `ts/`: the `@bespok3d/contract` package. Pure TypeScript types with no runtime: the app-to-daemon HTTP
  wire shapes (`contract/wire.ts`) and the GPG key types shared across the app's main-to-renderer boundary
  (`contract/keys.ts`). Every export is a type, so consumers `import type` and the import is erased from
  every bundle.
- `python/`: `bespok3d_contract`, the Python side of the contract. It is a skeleton today; the SDK codegen
  is what makes it a generated source later.
- `tooling/`: the shared gate detectors and helpers every repo's `check.sh` sources: the em-dash guard
  (RULE ZERO), the workflow-pinning check, the shellcheck runner, and `gate-lib.sh`. **A change here
  changes every repo's gate.**

## Single source of truth across the boundary

The app-to-daemon wire shapes are declared once. The TypeScript side lives here; the daemon's Pydantic
models are the Python wire source, and a golden-fixture round-trip test keeps the two from drifting. Do
NOT hand-mirror a wire shape into a consumer: add it here, and let the drift test guard it. If you find a
shape mirrored by hand somewhere, that is the bug to fix.

## This is a curated collection, not a dumping ground

Before adding code here, prove it is genuinely cross-boundary: shared by more than one of {app, daemon,
adapters}. A god-file chunk split out of one app is app-internal and does not belong here; the
build/packaging toolchain does not belong here. "Reuse before create" points work AT this repo: check
whether the shared thing already exists here before writing a new one anywhere else.

## The non-negotiables

1. **RULE ZERO: no em-dash or en-dash, anywhere** (code, comments, docs, commit messages). Use a comma,
   colon, semicolon, parentheses, or two sentences. A hyphen in a compound word is fine. The em-dash guard
   in this repo's own `tooling/` fails the build on a violation, here and everywhere else.
2. **Every identifier carries domain meaning.** A name says what the thing *is* in the domain, never its
   type, its position, or a role-free abbreviation.
3. **Nesting beyond one level is suspicious.** Flatten by default.
4. **Rule of three.** The third copy of a block, shape, or constant gets extracted. That is this repo's
   whole reason to exist.
5. **Never commit a real secret or a real LAN value.** Fixtures are obviously fake.

## How to work a change

1. **Understand first.** Read `README.md` and the file you are changing. If the intent is unclear, ask one
   specific question and stop.
2. **Scope it to a user story** and implement only what it needs.
3. **Write the change** to the rules above.
4. **Run the gate and make it green:** `bash scripts/check.sh`. It runs `node --test` over the detector
   tests, `tsc` and vitest over the contract, ruff over the Python, the workflow-pinning check, the
   em-dash guard over its own sources and this README, and shellcheck. This repo depends on no sibling
   repo: it is the dependency the others reach for.
5. **A detector change carries extra weight.** A detector here runs in every repo's gate, so a
   false-positive you introduce reddens the whole workspace. Keep the detector's own test green, and think
   about what it does to its consumers before you change its behavior. Fix a real detector bug at the
   detector (teach it the truth); never weaken a real check to make a number move.
6. **Add a regression test** in the same change: a vitest for a contract change, a `node --test` case for a
   detector change. It fails on the old behavior and passes on the fix.
7. **Keep the docs current.** If you change the contract surface or a detector's contract, say so in
   `README.md`.

## Hard constraints

- **Never run git.** The maintainer commits. Leave the tree green and hand over exact commands if a git
  action is needed.
- **The gate must be green** before a change is considered done.

## When you are unsure

Ask one specific question and stop. Do not guess and implement. The architecture is the maintainer's; your
job is to implement it to the rules above.
