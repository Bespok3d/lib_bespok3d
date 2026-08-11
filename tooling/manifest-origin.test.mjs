// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// The address that shipped for months is the case that has to stay caught: a plugin manifest naming
// github.com/bespok3d-org/plugin-<name>, an account and a repo that never existed. The two parts that
// can silently stop catching it are the comparison and the walk, so both are covered here.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { violationsInManifest, browsableRepoUrl, manifestsUnder } from './manifest-origin-detector.mjs'

const FLUIDD_REPO = 'https://github.com/Bespok3d/fluidd-plugin'
const INVENTED_ADDRESS = 'https://github.com/bespok3d-org/plugin-fluidd'
const ANOTHER_REPO_OF_OURS = 'https://github.com/Bespok3d/u1-extras'
const UPSTREAM_PROJECT_SITE = 'https://octoeverywhere.com'
const UPSTREAM_PROJECT_REPO = 'https://github.com/Bambu-Research-Group/RFID-Tag-Guide'

function fieldsFlagged(manifest, origin) {
  return violationsInManifest(JSON.stringify(manifest), origin).map(function fieldOf(hit) { return hit.field })
}

describe('manifest origin: the repo a manifest names is the repo it lives in', () => {
  it('fails on the invented address, in both user facing fields', () => {
    assert.deepEqual(
      fieldsFlagged({ source: INVENTED_ADDRESS, homepage: INVENTED_ADDRESS }, FLUIDD_REPO),
      ['source', 'homepage'],
    )
  })

  it('passes once both fields name the repo the manifest lives in', () => {
    assert.deepEqual(fieldsFlagged({ source: FLUIDD_REPO, homepage: FLUIDD_REPO }, FLUIDD_REPO), [])
  })

  it('flags the wrong field on its own', () => {
    assert.deepEqual(fieldsFlagged({ source: FLUIDD_REPO, homepage: INVENTED_ADDRESS }, FLUIDD_REPO), ['homepage'])
  })

  it('passes a manifest that declares neither link', () => {
    assert.deepEqual(fieldsFlagged({ name: 'Remote screen', start_url: '/index.html' }, FLUIDD_REPO), [])
  })

  it('flags a real repo of ours that is not the one the manifest lives in', () => {
    assert.deepEqual(fieldsFlagged({ source: ANOTHER_REPO_OF_OURS }, FLUIDD_REPO), ['source'])
  })

  it('leaves the wrapped project its own homepage, on its own site or on GitHub', () => {
    assert.deepEqual(fieldsFlagged({ source: FLUIDD_REPO, homepage: UPSTREAM_PROJECT_SITE }, FLUIDD_REPO), [])
    assert.deepEqual(fieldsFlagged({ source: FLUIDD_REPO, homepage: UPSTREAM_PROJECT_REPO }, FLUIDD_REPO), [])
  })

  it('reads every remote shape as the address a browser opens', () => {
    assert.equal(browsableRepoUrl('git@github.com:Bespok3d/fluidd-plugin.git'), FLUIDD_REPO)
    assert.equal(browsableRepoUrl('ssh://git@github.com/Bespok3d/fluidd-plugin.git'), FLUIDD_REPO)
    assert.equal(browsableRepoUrl('https://github.com/Bespok3d/fluidd-plugin.git'), FLUIDD_REPO)
    assert.equal(browsableRepoUrl('https://github.com/Bespok3d/fluidd-plugin/'), FLUIDD_REPO)
  })

  it('does not read a clone over ssh as a different repo than the manifest names', () => {
    assert.deepEqual(
      fieldsFlagged({ source: FLUIDD_REPO }, browsableRepoUrl('git@github.com:Bespok3d/fluidd-plugin.git')),
      [],
    )
  })
})

describe('manifest origin: the walk reaches authored manifests and no others', () => {
  var repo

  before(() => {
    repo = mkdtempSync(join(tmpdir(), 'b3d-manifest-origin-'))
    for (const dir of ['fluidd', 'dist/package/fluidd', 'node_modules/vendored']) {
      mkdirSync(join(repo, dir), { recursive: true })
      writeFileSync(join(repo, dir, 'manifest.json'), JSON.stringify({ source: INVENTED_ADDRESS }))
    }
    writeFileSync(join(repo, 'fluidd/package.json'), '{}')
  })

  after(() => rmSync(repo, { recursive: true, force: true }))

  it('reads the authored manifest, not the built copy or a vendored one', () => {
    assert.deepEqual(
      manifestsUnder(repo).map(function underRepo(path) { return path.slice(repo.length + 1) }),
      ['fluidd/manifest.json'],
    )
  })
})
