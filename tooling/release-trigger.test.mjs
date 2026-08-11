// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs on plain node (`node --test`), so the shared tooling needs no test framework of its own and
// every repo can run this suite with the runtime its gate already requires.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { violationsInReleaseWorkflow } from './release-trigger-detector.mjs'

function rulesFired(text) {
  return violationsInReleaseWorkflow(text).map((hit) => hit.rule)
}

const TAG_TRIGGERED = `name: build-and-release
on:
  push:
    tags:
      - 'plugin-*-v*'
  workflow_dispatch:

jobs:
  build-and-release:
    runs-on: ubuntu-latest
    steps:
      - name: Refuse a tag that disagrees with the manifest
        run: sh scripts/tag_version_guard.sh "\${{ github.ref_name }}"
`

const BRANCH_TRIGGERED = `name: build-and-release
on:
  push:
    branches: [main]
    paths:
      - '*/manifest.json'
  workflow_dispatch:

jobs:
  build-and-release:
    steps:
      - run: sh scripts/tag_version_guard.sh "\${{ github.ref_name }}"
`

describe('release trigger', () => {
  it('passes a workflow published by a version tag and guarded on the number', () => {
    assert.deepEqual(rulesFired(TAG_TRIGGERED), [])
  })

  it('fails the moment a branch trigger is added back', () => {
    assert.ok(rulesFired(BRANCH_TRIGGERED).includes('branch-trigger'))
  })

  it('fails a branch trigger even when a tag trigger sits beside it', () => {
    const both = TAG_TRIGGERED.replace("    tags:", "    branches: [main]\n    tags:")

    assert.deepEqual(rulesFired(both), ['branch-trigger'])
  })

  it('reads branches-ignore as a branch trigger too', () => {
    const ignoring = TAG_TRIGGERED.replace("    tags:", "    branches-ignore: ['wip/**']\n    tags:")

    assert.ok(rulesFired(ignoring).includes('branch-trigger'))
  })

  it('fails a push trigger that names no tags', () => {
    assert.ok(rulesFired(BRANCH_TRIGGERED).includes('no-tag-trigger'))
  })

  it('fails a job that skips itself on a manual run instead of reaching the guard', () => {
    const skipping = TAG_TRIGGERED.replace(
      '    runs-on: ubuntu-latest',
      "    if: github.event_name == 'push'\n    runs-on: ubuntu-latest",
    )

    assert.deepEqual(rulesFired(skipping), ['event-name-if'])
  })

  it('fails a single step that skips itself on a manual run, not only a whole job', () => {
    const skippingStep = TAG_TRIGGERED.replace(
      '      - name: Refuse a tag',
      "      - if: github.event_name == 'push'\n        run: echo publish\n      - name: Refuse a tag",
    )

    assert.deepEqual(rulesFired(skippingStep), ['event-name-if'])
  })

  it('refuses an inline trigger, because what publishes cannot be read from it', () => {
    const inline = TAG_TRIGGERED.replace(
      "on:\n  push:\n    tags:\n      - 'plugin-*-v*'\n  workflow_dispatch:",
      'on: [push, workflow_dispatch]',
    )

    assert.deepEqual(rulesFired(inline), ['unreadable-trigger'])
  })

  it('fails a release that runs no version guard', () => {
    const unguarded = TAG_TRIGGERED.replace(/^.*tag_version_guard.*$/m, '        run: echo build')

    assert.deepEqual(rulesFired(unguarded), ['no-version-guard'])
  })

  it('does not accept a comment naming the guard as a step that runs it', () => {
    const talkedAbout = TAG_TRIGGERED.replace(
      /^.*tag_version_guard.*$/m,
      '        # scripts/tag_version_guard.sh refuses a tag that disagrees with the manifest',
    )

    assert.deepEqual(rulesFired(talkedAbout), ['no-version-guard'])
  })

  it('does not read a tags key from another trigger as the push trigger', () => {
    const elsewhere = `name: build-and-release
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  build-and-release:
    steps:
      - run: sh scripts/tag_version_guard.sh "\${{ github.ref_name }}"
`

    assert.ok(rulesFired(elsewhere).includes('no-tag-trigger'))
  })

  it('is not fooled by a comment between the trigger and its keys', () => {
    const commented = TAG_TRIGGERED.replace('  push:', '  # what publishes\n  push:')

    assert.deepEqual(rulesFired(commented), [])
  })
})
