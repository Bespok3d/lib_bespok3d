// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// A manifest link that claims to be one of ours has to be the repo that manifest lives in.
//
//   node <tooling>/manifest-origin-detector.mjs <repo dir> [<repo dir>...]
//
// The app shows source and homepage to the user as the plugin's links, so a wrong one is a dead link
// in the store rather than a cosmetic slip. Twenty five manifests once shipped a
// github.com/bespok3d-org/plugin-<name> address that had never existed: invented once, copied on,
// and impossible to notice from inside the file. The repo's own git origin is the truth and it is
// already on disk, so this is offline and exact: no network call, no allow list, no deciding which
// of two addresses is the live one.
//
// Only an address under our own account is judged. A plugin that wraps someone else's project points
// its homepage at that project, and octoeverywhere.com or a Bambu tag guide is exactly the address
// the user should land on. What is never legitimate is an address that reads as ours and is not:
// bespok3d-org was a near miss on our own account name, which is why the test is a prefix on the
// account rather than an exact match.
//
// The origin is read with `git remote get-url origin`, and only when the named directory is that
// repo's own top level: a directory that merely sits inside another checkout would otherwise be
// judged against its parent's origin. A tree with no origin at all (an exported tarball, a checkout
// with no remote) is reported and passed, because there is no truth on disk to compare against.
//
// A manifest.json that is not readable as JSON is passed over: this detector judges two URLs, and
// manifest validity belongs to the package builder that has to read the whole file anyway.
import { readFileSync, realpathSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { relative } from 'node:path'
import { scannedFiles } from './em-dash-guard.mjs'

const USER_FACING_LINKS = ['source', 'homepage']

// One walk, shared with the em-dash guard, so the directory exclusions are shared too: a built copy
// of a manifest under dist/ or a vendored one under node_modules/ is never judged as an authored one.
export function manifestsUnder(repoDir) {
  return scannedFiles({ paths: [repoDir], suffixes: new Set(), names: new Set(['manifest.json']) })
}

function gitOutput(repoDir, args) {
  try {
    return execFileSync('git', ['-C', repoDir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

// Every remote shape a checkout carries, reduced to the address a person can open in a browser, so
// that a manifest written as https compares against an origin cloned over ssh.
export function browsableRepoUrl(remoteUrl) {
  const bare = remoteUrl.trim().replace(/\/+$/, '').replace(/\.git$/, '')
  const scpShorthand = bare.match(/^[^@/]+@([^:/]+):(.+)$/)
  if (scpShorthand) return `https://${scpShorthand[1]}/${scpShorthand[2]}`

  return bare.replace(/^(?:ssh|git):\/\/(?:[^@/]+@)?/, 'https://')
}

export function originOf(repoDir) {
  const topLevel = gitOutput(repoDir, ['rev-parse', '--show-toplevel'])
  if (topLevel === '' || realpathSync(topLevel) !== realpathSync(repoDir)) return null
  const origin = gitOutput(repoDir, ['remote', 'get-url', 'origin'])

  return origin === '' ? null : browsableRepoUrl(origin)
}

function parsedManifest(text) {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

// The origin with its repo name dropped: the account every repo of ours sits under. An address that
// starts with this is claiming to be one of ours and is held to the origin exactly; an address that
// does not is somebody else's project and is none of this detector's business.
export function ourAccount(origin) {
  const segments = origin.split('/')

  return segments.slice(0, segments.length - 1).join('/').toLowerCase()
}

export function claimsToBeOurs(browsableUrl, origin) {
  return browsableUrl.toLowerCase().startsWith(ourAccount(origin))
}

export function violationsInManifest(text, origin) {
  const manifest = parsedManifest(text)

  return USER_FACING_LINKS.flatMap(function reportMisnamedAddressOfOurs(field) {
    const declared = manifest[field]
    if (typeof declared !== 'string') return []
    const browsable = browsableRepoUrl(declared)
    if (browsable === origin || !claimsToBeOurs(browsable, origin)) return []

    return [{ field, declared }]
  })
}

function violationsAgainstOrigin(repo) {
  return manifestsUnder(repo.repoDir).flatMap(function locate(path) {
    return violationsInManifest(readFileSync(path, 'utf8'), repo.origin)
      .map(function withLocation(hit) {
        return { file: relative(process.cwd(), path), origin: repo.origin, ...hit }
      })
  })
}

export function scan(repoDirs) {
  const checked = repoDirs.map(function withOrigin(repoDir) {
    return { repoDir, origin: originOf(repoDir) }
  })

  return {
    withoutOrigin: checked.filter(function hasNoOrigin(repo) { return repo.origin === null }),
    violations: checked
      .filter(function hasOrigin(repo) { return repo.origin !== null })
      .flatMap(violationsAgainstOrigin),
  }
}

function main(repoDirs) {
  if (repoDirs.length === 0) {
    console.error('manifest origin: name at least one repo directory to scan')

    return 2
  }
  const scanned = scan(repoDirs)
  for (const repo of scanned.withoutOrigin) {
    console.log(`manifest origin: ${repo.repoDir} has no git origin, so there is nothing to compare against.`)
  }
  for (const hit of scanned.violations) {
    console.error(`  ${hit.file}  "${hit.field}": ${hit.declared}  is not this repo: ${hit.origin}`)
  }
  if (scanned.violations.length > 0) {
    console.error(`manifest origin: ${scanned.violations.length} link(s) read as one of ours but name something other than the repo the manifest lives in. The app shows these to the user.`)

    return 1
  }
  console.log('manifest origin: every link of ours names the repo the manifest lives in.')

  return 0
}

if (process.argv[1] && process.argv[1].endsWith('manifest-origin-detector.mjs')) {
  process.exit(main(process.argv.slice(2)))
}
