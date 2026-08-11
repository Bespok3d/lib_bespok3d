// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// A release is published by a version tag, and by nothing else.
//
// A release workflow signs a package and registers its atom in the org index, which is what makes
// the app offer that package to every enrolled printer. On a branch trigger every merged commit
// becomes an offered update, work in progress included, so the trigger shape is a release-safety
// invariant and is checked by the gate rather than left to review.
//
// The second half is the manual run. A job level `if: github.event_name == 'push'` makes a Run
// workflow click skip the whole job and report success, so a maintainer re-running a failed publish
// believes it went out when it did not. The version guard decides instead: it refuses any ref that
// is not a release tag, so a manual run against a tag republishes and one against a branch is
// refused loudly.
//
// Parsed by indentation rather than with a YAML library: the shared tool set is node and shell, and
// a repo whose gate ships no Python at all still has to run this.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { relative } from 'node:path'

// Fires on a job level `if` and on a step level one alike: either shape skips work on a manual run
// and still reports success, which is the thing that misleads the maintainer.
const EVENT_NAME_IF = /^\s*(-\s+)?if:\s*\$?\{?\{?\s*github\.event_name\s*==\s*'push'/
// A step that RUNS the guard, not a comment naming it: prose about the guard publishes nothing.
const VERSION_GUARD_CALL = /^\s*(-\s+)?run:.*tag_version_guard/m
// `on: [push]` and `on: push` say what publishes on one line, which this indentation reader cannot
// see into. Refusing the inline shape keeps the block shape, which it can read, the only shape.
const UNREADABLE_TRIGGER = 'the `on:` block is written inline, so what publishes cannot be read here'

function at(index, rule, detail) {
  return { line: index + 1, rule, detail }
}

function indentOf(line) {
  return line.length - line.trimStart().length
}

// The lines under `key:` at the given indent, up to the next line at that indent or shallower.
// Blank and comment lines never end a block: they carry no structure.
function blockUnder(lines, headerIndex) {
  const headerIndent = indentOf(lines[headerIndex])

  return lines.slice(headerIndex + 1).reduce(function collectUntilDedent(collected, line, offset) {
    if (collected.closed) return collected
    if (line.trim() === '' || line.trim().startsWith('#')) return collected
    if (indentOf(line) <= headerIndent) return { ...collected, closed: true }

    return { ...collected, lines: [...collected.lines, { line, index: headerIndex + 1 + offset }] }
  }, { lines: [], closed: false }).lines
}

function headerIndexOf(lines, pattern, from) {
  const found = lines.findIndex(function matchesHeader(line, index) {
    return index >= from && pattern.test(line)
  })

  return found
}

// YAML 1.1 reads a bare `on` as the boolean true, which is why this reads the text and not a parse
// tree: the key a parser hands back is not the one the file spells.
function pushTriggerLines(lines) {
  const triggerIndex = headerIndexOf(lines, /^on:\s*(#.*)?$/, 0)
  if (triggerIndex < 0) return UNREADABLE_TRIGGER
  const trigger = blockUnder(lines, triggerIndex)
  const pushEntry = trigger.find(function isPush(entry) { return /^\s*push:\s*(#.*)?$/.test(entry.line) })
  if (!pushEntry) return null

  return blockUnder(lines, pushEntry.index)
}

export function violationsInReleaseWorkflow(text) {
  const lines = text.split('\n')
  const push = pushTriggerLines(lines)
  const manualIf = lines.flatMap(function reportEventIf(line, index) {
    return EVENT_NAME_IF.test(line) ? [at(index, 'event-name-if', line.trim())] : []
  })
  const missingGuard = VERSION_GUARD_CALL.test(text)
    ? []
    : [at(0, 'no-version-guard', 'no step runs a tag version guard')]
  if (push === UNREADABLE_TRIGGER) {
    return [...manualIf, ...missingGuard, at(0, 'unreadable-trigger', UNREADABLE_TRIGGER)]
  }
  if (push === null) return [...manualIf, ...missingGuard]
  const branchTrigger = push.flatMap(function reportBranchKey(entry) {
    return /^\s*branches(-ignore)?:/.test(entry.line) ? [at(entry.index, 'branch-trigger', entry.line.trim())] : []
  })
  const hasTags = push.some(function isTags(entry) { return /^\s*tags:/.test(entry.line) })
  const missingTags = hasTags ? [] : [at(0, 'no-tag-trigger', 'the push trigger names no tags')]

  return [...branchTrigger, ...missingTags, ...manualIf, ...missingGuard]
}

function releaseWorkflowIn(repoDir) {
  const path = `${repoDir}/.github/workflows/release.yml`

  return existsSync(path) && statSync(path).isFile() ? [path] : []
}

export function scan(repoDirs) {
  return repoDirs.flatMap(releaseWorkflowIn).flatMap(function violationsIn(path) {
    return violationsInReleaseWorkflow(readFileSync(path, 'utf8'))
      .map(function locate(hit) { return { file: relative(process.cwd(), path), ...hit } })
  })
}

function main(repoDirs) {
  if (repoDirs.length === 0) {
    console.error('release trigger: name at least one repo directory to scan')

    return 2
  }
  const violations = scan(repoDirs)
  for (const hit of violations) console.error(`  ${hit.file}:${hit.line}  [${hit.rule}] ${hit.detail}`)
  if (violations.length > 0) {
    console.error(`release trigger: ${violations.length} violation(s). A release is published by a version tag, and by nothing else.`)

    return 1
  }
  console.log('release trigger: published by a version tag, no branch trigger, manual runs reach the version guard.')

  return 0
}

if (process.argv[1] && process.argv[1].endsWith('release-trigger-detector.mjs')) {
  process.exit(main(process.argv.slice(2)))
}
