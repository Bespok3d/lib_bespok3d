// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// Workflow-pinning guard for the CI that carries the org signing key (no deps).
//
//   node <tooling>/workflow-pinning-detector.mjs <repo-dir> [<repo-dir>...]
//
// Each repo runs this over its OWN checkout, so the guard travels with the repo it protects instead
// of one workspace-wide sweep that only fired where every sibling happened to be cloned.
//
// A release run has the signing key in scope, so everything it executes must be pinned to an immutable
// commit. A floating `@main` means whoever can push to b3-builder or main-index changes what every
// release run executes, key included. This guard fails the gate on the three ways that closure rots:
//
//   1. an org-action `uses:` ref, or a cross-repo checkout of a `Bespok3d/*` repository, that is not a
//      40-hex commit SHA;
//   2. a `secrets.` reference in a pr-build.yml (a PR-triggered run must never hold a secret);
//   3. a `pull_request` or `pull_request_target` trigger on a release.yml (publishing stays push-only).
//
// KNOWN AND ACCEPTED LIMITATION: this protects the checkout, not GitHub's side. Repo-side enforcement
// (branch protection, a required check inside each plugin repo) is a go-public item, not this guard.
//
// A repo with no `.github/workflows` is a PASS, not an error.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { relative } from 'node:path'

const isCommitSha = (ref) => /^[0-9a-f]{40}$/.test(ref)
const indentOf = (line) => line.length - line.trimStart().length
const isReleaseWorkflow = (path) => path.endsWith('release.yml')
const isPrBuildWorkflow = (path) => path.endsWith('pr-build.yml')

// The lines of one YAML mapping, seen from a key inside it: its siblings run until the indentation
// drops back out of the mapping in either direction.
function mappingSiblings(lines, keyLine) {
  const indent = indentOf(lines[keyLine])
  const outdented = (line) => line.trim() !== '' && indentOf(line) < indent
  const before = lines.slice(0, keyLine).reverse()
  const after = lines.slice(keyLine + 1)
  const upTo = (block) => {
    const edge = block.findIndex(outdented)

    return edge === -1 ? block : block.slice(0, edge)
  }

  return [...upTo(before), ...upTo(after)]
}

// The `on:` block, whatever its shape: the trigger line itself plus every line nested under it, each
// carrying its own index so a violation reports the line it actually sits on.
function triggerBlock(lines) {
  const start = lines.findIndex((line) => /^on:/.test(line))
  if (start === -1) return []
  const rest = lines.slice(start + 1)
  const nextTopLevel = rest.findIndex((line) => /^\S/.test(line))
  const nestedCount = nextTopLevel === -1 ? rest.length : nextTopLevel

  return lines.slice(start, start + 1 + nestedCount).map((line, offset) => ({ line, index: start + offset }))
}

// Every pinning violation in one workflow file. `path` decides which per-file rules apply.
export function violationsInWorkflow(text, path) {
  const lines = text.split('\n')
  const at = (index, rule, detail) => ({ line: index + 1, rule, detail })
  // GitHub resolves owner names case-insensitively, so `bespok3d/b3-builder@main` is the same mutable
  // action as `Bespok3d/...`. Match it the way GitHub would, or the gate has a one-keystroke bypass.
  const floatingUses = lines.flatMap((line, index) => {
    const used = line.match(/uses:\s*(Bespok3d\/\S+?)@(\S+)/i)

    return used && !isCommitSha(used[2]) ? [at(index, 'mutable-action-ref', `${used[1]}@${used[2]}`)] : []
  })
  const floatingCheckouts = lines.flatMap((line, index) => {
    const checkedOut = line.match(/repository:\s*['"]?(Bespok3d\/[^'"\s]+)/i)
    if (!checkedOut) return []
    const pinned = mappingSiblings(lines, index).some((sibling) => /^\s*ref:\s*[0-9a-f]{40}\b/.test(sibling))

    return pinned ? [] : [at(index, 'unpinned-checkout', `checkout of ${checkedOut[1]} with no 40-hex ref:`)]
  })
  const secretsInPreview = !isPrBuildWorkflow(path) ? [] : lines.flatMap((line, index) =>
    /secrets\./.test(line) ? [at(index, 'secret-in-pr-build', line.trim())] : [])
  const prTriggeredRelease = !isReleaseWorkflow(path) ? [] : triggerBlock(lines).flatMap((trigger) =>
    /\bpull_request(_target)?\b/.test(trigger.line) ? [at(trigger.index, 'pr-triggered-release', trigger.line.trim())] : [])

  return [...floatingUses, ...floatingCheckouts, ...secretsInPreview, ...prTriggeredRelease]
}

function workflowFilesIn(repoDir) {
  const dir = `${repoDir}/.github/workflows`
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return []

  return readdirSync(dir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml')).map((name) => `${dir}/${name}`)
}

export function scan(repoDirs) {
  return repoDirs.flatMap(workflowFilesIn).flatMap((path) =>
    violationsInWorkflow(readFileSync(path, 'utf8'), path).map((hit) => ({ file: relative(process.cwd(), path), ...hit })))
}

function main(repoDirs) {
  if (repoDirs.length === 0) {
    console.error('workflow pinning: name at least one repo directory to scan')

    return 2
  }
  const violations = scan(repoDirs)
  for (const hit of violations) console.error(`  ${hit.file}:${hit.line}  [${hit.rule}] ${hit.detail}`)
  if (violations.length > 0) {
    console.error(`workflow pinning: ${violations.length} violation(s). CI holding the signing key must run only pinned code.`)

    return 1
  }
  console.log('workflow pinning: all org-action refs and cross-repo checkouts pinned to commit SHAs.')

  return 0
}

if (process.argv[1] && process.argv[1].endsWith('workflow-pinning-detector.mjs')) {
  process.exit(main(process.argv.slice(2)))
}
