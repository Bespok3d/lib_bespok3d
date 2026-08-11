// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest'
import {
  reportedVersionOrNull,
  declaredDaemonFloor,
  declaredJinniFloor,
  daemonMeetsFloor,
  jinniMeetsFloor,
} from './compat'

describe('reportedVersionOrNull', () => {
  it('keeps a version the peer actually reported', () => {
    expect(reportedVersionOrNull('0.12.23')).toBe('0.12.23')
  })

  it('reads the daemon placeholder for a jinni that reports nothing as not knowable', () => {
    expect(reportedVersionOrNull('unknown')).toBeNull()
    expect(reportedVersionOrNull('0.0.0')).toBeNull()
    expect(reportedVersionOrNull(undefined)).toBeNull()
    expect(reportedVersionOrNull('')).toBeNull()
  })
})

describe('declaredDaemonFloor', () => {
  it('reads the floor a manifest declares', () => {
    expect(declaredDaemonFloor({ min_daemon_version: '0.12.22' })).toBe('0.12.22')
  })

  it('treats a package that declares no floor as demanding nothing', () => {
    expect(declaredDaemonFloor({})).toBeNull()
    expect(declaredDaemonFloor({ min_daemon_version: '  ' })).toBeNull()
    expect(declaredDaemonFloor({ min_daemon_version: 12 })).toBeNull()
  })
})

describe('daemonMeetsFloor', () => {
  it('clears a daemon at or above the floor', () => {
    expect(daemonMeetsFloor('0.12.22', '0.12.22')).toBe(true)
    expect(daemonMeetsFloor('0.12.23', '0.12.22')).toBe(true)
    expect(daemonMeetsFloor('0.13.0', '0.12.22')).toBe(true)
  })

  it('refuses a daemon below the floor', () => {
    expect(daemonMeetsFloor('0.12.21', '0.12.22')).toBe(false)
    expect(daemonMeetsFloor('0.11.99', '0.12.22')).toBe(false)
  })

  it('does not refuse when the daemon version is not knowable', () => {
    expect(daemonMeetsFloor(undefined, '0.12.22')).toBe(true)
    expect(daemonMeetsFloor('unknown', '0.12.22')).toBe(true)
    expect(daemonMeetsFloor('0.0.0', '0.12.22')).toBe(true)
  })

  it('does not refuse a package that declares no floor', () => {
    expect(daemonMeetsFloor('0.1.0', null)).toBe(true)
    expect(daemonMeetsFloor('0.1.0', undefined)).toBe(true)
  })

  it('ignores the prerelease tag a dev daemon build carries', () => {
    expect(daemonMeetsFloor('0.12.22-dev', '0.12.22')).toBe(true)
  })
})

describe('declaredJinniFloor', () => {
  it('reads the oldest jinni a package will drive', () => {
    expect(declaredJinniFloor({ min_jinni_version: '0.1.10' })).toBe('0.1.10')
  })

  it('treats a package that declares no jinni floor as demanding nothing', () => {
    expect(declaredJinniFloor({})).toBeNull()
    expect(declaredJinniFloor({ min_jinni_version: '  ' })).toBeNull()
    expect(declaredJinniFloor({ min_jinni_version: 12 })).toBeNull()
  })
})

describe('jinniMeetsFloor', () => {
  it('clears a jinni at or above the floor', () => {
    expect(jinniMeetsFloor('0.1.10', '0.1.10')).toBe(true)
    expect(jinniMeetsFloor('0.1.11', '0.1.10')).toBe(true)
  })

  it('refuses a jinni below the floor, which is the pair the daemon would not drive', () => {
    expect(jinniMeetsFloor('0.1.9', '0.1.10')).toBe(false)
    expect(jinniMeetsFloor('0.0.14', '0.1.10')).toBe(false)
  })

  it('does not refuse when the jinni version is not knowable', () => {
    expect(jinniMeetsFloor(undefined, '0.1.10')).toBe(true)
    expect(jinniMeetsFloor('unknown', '0.1.10')).toBe(true)
    expect(jinniMeetsFloor('0.0.0', '0.1.10')).toBe(true)
  })

  it('does not refuse a package that declares no jinni floor', () => {
    expect(jinniMeetsFloor('0.1.9', null)).toBe(true)
    expect(jinniMeetsFloor('0.1.9', undefined)).toBe(true)
  })
})
