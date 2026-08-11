// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest'
import {
  parseSemanticVersion,
  compareReleases,
  compareSemanticVersions,
  isReleaseNewer,
  isDaemonVersionAtLeast,
  isNewerVersion,
  sameVersion,
} from './version'

describe('parseSemanticVersion', () => {
  it('splits release triple and prerelease', () => {
    expect(parseSemanticVersion('0.1.0-alpha.13')).toEqual({
      release: [0, 1, 0],
      prereleaseLabel: 'alpha',
      prereleaseNumber: 13,
    })
  })

  it('tolerates a leading v and a missing prerelease', () => {
    expect(parseSemanticVersion('v1.2.3')).toEqual({
      release: [1, 2, 3],
      prereleaseLabel: null,
      prereleaseNumber: 0,
    })
  })

  it('drops build metadata before reading the triple', () => {
    expect(parseSemanticVersion('0.1.6+dev.3a7f1c2')).toEqual({
      release: [0, 1, 6],
      prereleaseLabel: null,
      prereleaseNumber: 0,
    })
  })
})

describe('compareSemanticVersions', () => {
  it('orders two alphas of the same release', () => {
    expect(compareSemanticVersions('0.1.0-alpha.13', '0.1.0-alpha.14')).toBe(-1)
    expect(compareSemanticVersions('0.1.0-alpha.14', '0.1.0-alpha.13')).toBe(1)
  })

  it('treats identical versions as equal', () => {
    expect(compareSemanticVersions('0.1.0-alpha.13', '0.1.0-alpha.13')).toBe(0)
  })

  it('sorts a stable release above a prerelease of the same triple', () => {
    expect(compareSemanticVersions('0.1.0-alpha.13', '0.1.0')).toBe(-1)
    expect(compareSemanticVersions('0.1.0', '0.1.0-alpha.13')).toBe(1)
  })

  it('compares the release triple before the prerelease', () => {
    expect(compareSemanticVersions('0.2.0', '0.1.0-alpha.99')).toBe(1)
    expect(compareSemanticVersions('0.1.0-alpha.1', '0.2.0-alpha.1')).toBe(-1)
  })
})

describe('isReleaseNewer', () => {
  it('is true only when the candidate tag is strictly newer', () => {
    expect(isReleaseNewer('0.1.0-alpha.13', 'v0.1.0-alpha.14')).toBe(true)
    expect(isReleaseNewer('0.1.0-alpha.13', '0.1.0-alpha.13')).toBe(false)
    expect(isReleaseNewer('0.1.0-alpha.13', 'v0.1.0-alpha.12')).toBe(false)
  })

  // Renaming the prerelease series from alpha to beta must not change what an installed app offers:
  // the release triple decides first, and a suffix with no number is still a prerelease.
  it('offers a beta to an app still on an alpha, on the version alone', () => {
    expect(isReleaseNewer('0.1.0-alpha.36', 'v0.7.0-beta')).toBe(true)
    expect(isReleaseNewer('0.7.0-beta', 'v0.7.0-beta')).toBe(false)
    expect(isReleaseNewer('0.7.0-beta', 'v0.7.1-alpha.1')).toBe(true)
  })
})

describe('compareReleases', () => {
  // The two questions this module keeps apart: the auto-updater orders a beta below its release, the
  // compatibility floor sees one release. Both readings are correct and neither may leak into the other.
  it('ignores the prerelease the auto-updater orders on', () => {
    expect(compareReleases('0.7.0-beta', '0.7.0')).toBe(0)
    expect(compareSemanticVersions('0.7.0-beta', '0.7.0')).toBe(-1)
  })
})

describe('isDaemonVersionAtLeast', () => {
  it('treats equal versions as satisfied', () => {
    expect(isDaemonVersionAtLeast('0.9.0-dev', '0.9.0-dev')).toBe(true)
  })

  it('compares minor versions numerically, not lexically', () => {
    expect(isDaemonVersionAtLeast('0.10.0-dev', '0.9.0-dev')).toBe(true)
    expect(isDaemonVersionAtLeast('0.9.0-dev', '0.10.0-dev')).toBe(false)
  })

  it('flags an older daemon as not satisfying the requirement', () => {
    expect(isDaemonVersionAtLeast('0.7.0-dev', '0.9.0-dev')).toBe(false)
  })

  it('ignores the prerelease suffix', () => {
    expect(isDaemonVersionAtLeast('1.0.0', '1.0.0-dev')).toBe(true)
    expect(isDaemonVersionAtLeast('1.0.0-dev', '1.0.0')).toBe(true)
  })

  it('treats an unknown (0.0.0) daemon as below any real requirement', () => {
    expect(isDaemonVersionAtLeast('0.0.0', '0.9.0-dev')).toBe(false)
  })
})

describe('isNewerVersion', () => {
  it('is true only when the candidate is strictly newer', () => {
    expect(isNewerVersion('0.1.1', '0.1.0')).toBe(true)
    expect(isNewerVersion('0.2.0', '0.1.9')).toBe(true)
  })

  it('is false for an equal or older candidate (no downgrade-as-update)', () => {
    expect(isNewerVersion('0.1.0', '0.1.0')).toBe(false)
    expect(isNewerVersion('0.1.0', '0.1.2')).toBe(false)
  })

  it('treats a dev build-tag as the same release (no phantom update)', () => {
    expect(isNewerVersion('0.1.6+dev.3a7f1c2', '0.1.6')).toBe(false)
    expect(isNewerVersion('0.1.6', '0.1.6+dev.3a7f1c2')).toBe(false)
    expect(isNewerVersion('0.1.6+dev.9b04c01', '0.1.6+dev.3a7f1c2')).toBe(false)
    expect(isNewerVersion('0.2.0-experiment+dev.9b04c01', '0.2.0-experiment+dev.3a7f1c2')).toBe(false)
  })
})

describe('sameVersion', () => {
  it('reads a dev build of a release as that release', () => {
    expect(sameVersion('0.1.6+dev.3a7f1c2', '0.1.6')).toBe(true)
    expect(sameVersion('0.1.6', '0.1.7')).toBe(false)
  })
})
