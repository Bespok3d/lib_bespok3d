// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// The guard now takes its scope from the command line, so the scope parsing and the walk are the
// parts that can silently stop checking a tree. Both are covered here.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseScope, scannedFiles, hasBannedDash } from './em-dash-guard.mjs'

const EM_DASH = String.fromCharCode(0x2014)

function scanned(argv) {
  return scannedFiles(parseScope(argv)).map((path) => path.split('/').slice(-2).join('/')).sort()
}

describe('em-dash guard: scope comes from the caller, detection does not', () => {
  var sandbox

  before(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'b3d-em-dash-'))
    mkdirSync(join(sandbox, 'src'))
    mkdirSync(join(sandbox, 'node_modules'))
    mkdirSync(join(sandbox, 'etc'))
    writeFileSync(join(sandbox, 'src/clean.ts'), 'const answer = 42, and a comma\n')
    writeFileSync(join(sandbox, 'src/dirty.md'), `a banned ${EM_DASH} dash\n`)
    writeFileSync(join(sandbox, 'src/payload.bin'), `not authored ${EM_DASH}\n`)
    writeFileSync(join(sandbox, 'node_modules/vendored.md'), `someone else's ${EM_DASH}\n`)
    writeFileSync(join(sandbox, 'etc/S99bespok3d'), `an init script ${EM_DASH}\n`)
  })

  after(() => rmSync(sandbox, { recursive: true, force: true }))

  it('walks a named directory and reads only authored suffixes', () => {
    assert.deepEqual(scanned([join(sandbox, 'src')]), ['src/clean.ts', 'src/dirty.md'])
  })

  it('skips dependency and build directories by name', () => {
    assert.deepEqual(scanned([sandbox]), ['src/clean.ts', 'src/dirty.md'])
  })

  it('picks up an extensionless file the caller names', () => {
    assert.deepEqual(scanned([join(sandbox, 'etc'), '--name', 'S99bespok3d']), ['etc/S99bespok3d'])
  })

  it('picks up an extra suffix the caller adds', () => {
    assert.ok(scanned([join(sandbox, 'src'), '--suffix', '.bin']).includes('src/payload.bin'))
  })

  it('reads a file named directly whatever its suffix', () => {
    assert.deepEqual(scanned([join(sandbox, 'src/payload.bin')]), ['src/payload.bin'])
  })

  it('skips a path that does not exist rather than failing', () => {
    assert.deepEqual(scanned([join(sandbox, 'absent'), join(sandbox, 'src')]), ['src/clean.ts', 'src/dirty.md'])
  })

  it('flags the banned dash and clears the clean file', () => {
    assert.equal(hasBannedDash(join(sandbox, 'src/dirty.md')), true)
    assert.equal(hasBannedDash(join(sandbox, 'src/clean.ts')), false)
  })
})
