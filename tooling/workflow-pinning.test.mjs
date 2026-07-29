// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs on plain node (`node --test`), so the shared tooling needs no test framework of its own and
// every repo can run this suite with the runtime its gate already requires.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { violationsInWorkflow } from './workflow-pinning-detector.mjs'

function rulesFired(text, path) {
  return violationsInWorkflow(text, path).map((hit) => hit.rule)
}

const PINNED_SHA = '66509afcc88b13f911e252ebede80ac04c13f6bd'

const RELEASE_PINNED = `name: build-and-release
on:
  push:
    branches: [main]
jobs:
  release:
    steps:
      - uses: Bespok3d/b3-builder@${PINNED_SHA}  # main @ 2026-07-19
        with:
          main-index-token: \${{ secrets.MAIN_INDEX_TOKEN }}
`

const PR_BUILD_CLEAN = `name: pr-build
on:
  pull_request:
jobs:
  build:
    steps:
      - uses: Bespok3d/b3-builder@${PINNED_SHA}  # main @ 2026-07-19
        with:
          publish: 'false'
`

const ASSEMBLE_PINNED = `name: assemble
on:
  push:
jobs:
  assemble:
    steps:
      - uses: actions/checkout@v4
        with:
          repository: Bespok3d/b3-builder
          ref: ${PINNED_SHA}  # main @ 2026-07-19
          path: b3-builder
`

describe('workflow pinning: CI holding the signing key runs only pinned code', () => {
  it('passes the shapes the workspace actually ships', () => {
    assert.deepEqual(rulesFired(RELEASE_PINNED, 'release.yml'), [])
    assert.deepEqual(rulesFired(PR_BUILD_CLEAN, 'pr-build.yml'), [])
    assert.deepEqual(rulesFired(ASSEMBLE_PINNED, 'assemble.yml'), [])
  })

  it('flags an org action floating on a branch instead of a commit SHA', () => {
    const floating = RELEASE_PINNED.replace(`b3-builder@${PINNED_SHA}  # main @ 2026-07-19`, 'b3-builder@main')

    assert.deepEqual(rulesFired(floating, 'release.yml'), ['mutable-action-ref'])
  })

  it('flags a nested org action ref, not just the repo root action', () => {
    const nested = `      - uses: Bespok3d/main-index/.github/actions/register-atoms@main\n`

    assert.deepEqual(rulesFired(nested, 'release.yml'), ['mutable-action-ref'])
  })

  it('flags a lowercased org name, which GitHub resolves to the same action', () => {
    const lowercased = RELEASE_PINNED.replace(`Bespok3d/b3-builder@${PINNED_SHA}  # main @ 2026-07-19`, 'bespok3d/b3-builder@main')

    assert.deepEqual(rulesFired(lowercased, 'release.yml'), ['mutable-action-ref'])
  })

  it('flags a quoted, lowercased cross-repo checkout with no ref', () => {
    const quoted = ASSEMBLE_PINNED
      .replace('repository: Bespok3d/b3-builder', "repository: 'bespok3d/b3-builder'")
      .replace(`          ref: ${PINNED_SHA}  # main @ 2026-07-19\n`, '')

    assert.deepEqual(rulesFired(quoted, 'assemble.yml'), ['unpinned-checkout'])
  })

  it('flags a cross-repo checkout of a Bespok3d repository with no ref', () => {
    const unpinned = ASSEMBLE_PINNED.replace(`          ref: ${PINNED_SHA}  # main @ 2026-07-19\n`, '')

    assert.deepEqual(rulesFired(unpinned, 'assemble.yml'), ['unpinned-checkout'])
  })

  it('flags a cross-repo checkout pinned to a branch name rather than a SHA', () => {
    const branchRef = ASSEMBLE_PINNED.replace(`ref: ${PINNED_SHA}  # main @ 2026-07-19`, 'ref: main')

    assert.deepEqual(rulesFired(branchRef, 'assemble.yml'), ['unpinned-checkout'])
  })

  it('does not confuse a sibling step ref with the checkout it belongs to', () => {
    const refOnAnotherStep = `      - uses: actions/checkout@v4
        with:
          repository: Bespok3d/b3-builder
          path: b3-builder
      - uses: actions/checkout@v4
        with:
          ref: ${PINNED_SHA}
`

    assert.deepEqual(rulesFired(refOnAnotherStep, 'assemble.yml'), ['unpinned-checkout'])
  })

  it('flags a secret reaching a pr-build, where an untrusted PR can run', () => {
    const leaky = PR_BUILD_CLEAN.replace("          publish: 'false'", '          token: ${{ secrets.MAIN_INDEX_TOKEN }}')

    assert.deepEqual(rulesFired(leaky, 'pr-build.yml'), ['secret-in-pr-build'])
  })

  it('leaves the same secret alone in a release, where it belongs', () => {
    assert.deepEqual(rulesFired(RELEASE_PINNED, 'release.yml'), [])
  })

  it('flags a pull_request_target trigger on a release', () => {
    const prTriggered = RELEASE_PINNED.replace('  push:\n    branches: [main]', '  pull_request_target:')

    assert.deepEqual(rulesFired(prTriggered, 'release.yml'), ['pr-triggered-release'])
  })

  it('flags a plain pull_request trigger on a release', () => {
    const prTriggered = RELEASE_PINNED.replace('  push:\n    branches: [main]', '  pull_request:')

    assert.deepEqual(rulesFired(prTriggered, 'release.yml'), ['pr-triggered-release'])
  })

  it('does not read a pull_request mention outside the trigger block as a trigger', () => {
    const mentionedLater = `${RELEASE_PINNED}      - name: note\n        run: echo "not for pull_request runs"\n`

    assert.deepEqual(rulesFired(mentionedLater, 'release.yml'), [])
  })
})
