// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest'
import { isUpdateOffered, isUpgradeOffered } from './offer'

const installedPrint = 'a'.repeat(64)
const rebuiltPrint = 'b'.repeat(64)

describe('isUpdateOffered', () => {
  it('offers a newer published version', () => {
    expect(isUpdateOffered({ version: '1.0.0' }, { version: '1.0.1' })).toBe(true)
  })

  it('lets the fingerprints decide over any version when both are known', () => {
    const installed = { version: '1.0.1', fingerprint: installedPrint }
    const published = { version: '1.0.0', fingerprint: rebuiltPrint }
    expect(isUpdateOffered(installed, published)).toBe(true)
    expect(isUpdateOffered(installed, published, 'release')).toBe(true)
  })

  it('offers a different prerelease build under release ordering when the fingerprints differ', () => {
    const installed = { version: '1.0.0-beta.3', fingerprint: installedPrint }
    expect(isUpdateOffered(installed, { version: '1.0.0', fingerprint: rebuiltPrint }, 'release')).toBe(true)
  })

  it('does not offer a newer version whose fingerprint equals the installed one', () => {
    const installed = { version: '1.0.0', fingerprint: installedPrint }
    expect(isUpdateOffered(installed, { version: '1.0.1', fingerprint: installedPrint })).toBe(false)
  })

  it('offers the same version when both fingerprints are known and differ', () => {
    const installed = { version: '1.0.0', fingerprint: installedPrint }
    expect(isUpdateOffered(installed, { version: '1.0.0', fingerprint: rebuiltPrint })).toBe(true)
    expect(isUpdateOffered(installed, { version: '1.0.0', fingerprint: rebuiltPrint }, 'release')).toBe(true)
  })

  it('does not offer the same version with the same fingerprint, whatever its case', () => {
    const installed = { version: '1.0.0', fingerprint: installedPrint }
    expect(isUpdateOffered(installed, { version: '1.0.0', fingerprint: installedPrint.toUpperCase() })).toBe(false)
  })

  it('falls back to the version alone when either fingerprint is missing', () => {
    expect(isUpdateOffered({ version: '1.0.0' }, { version: '1.0.0', fingerprint: rebuiltPrint })).toBe(false)
    expect(isUpdateOffered({ version: '1.0.0', fingerprint: installedPrint }, { version: '1.0.0' })).toBe(false)
    expect(isUpdateOffered({ version: '1.0.0', fingerprint: null }, { version: '1.0.0', fingerprint: '' })).toBe(false)
  })

  it('takes a fingerprint that is not a string, read from a remote list, as no fingerprint', () => {
    const published = { version: '1.0.0', fingerprint: 42 as unknown as string }
    expect(isUpdateOffered({ version: '1.0.0', fingerprint: installedPrint }, published)).toBe(false)
  })

  it('orders by the release triple alone under release ordering', () => {
    expect(isUpdateOffered({ version: '1.0.0-pre.1' }, { version: '1.0.0-pre.2' }, 'release')).toBe(false)
    expect(isUpdateOffered({ version: '1.0.0-pre.1' }, { version: '1.0.0-pre.2' })).toBe(true)
  })
})

describe('isUpgradeOffered', () => {
  it('never offers an older build, whatever the fingerprints say', () => {
    expect(isUpgradeOffered({ version: '1.0.1', fingerprint: installedPrint }, { version: '1.0.0', fingerprint: rebuiltPrint })).toBe(false)
  })

  it('never offers a prerelease over its own release, under release ordering too', () => {
    const installed = { version: '1.0.0', fingerprint: installedPrint }
    expect(isUpgradeOffered(installed, { version: '1.0.0-beta.3', fingerprint: rebuiltPrint }, 'release')).toBe(false)
  })

  it('offers a same-version rebuild and a newer version', () => {
    expect(isUpgradeOffered({ version: '1.0.0', fingerprint: installedPrint }, { version: '1.0.0', fingerprint: rebuiltPrint })).toBe(true)
    expect(isUpgradeOffered({ version: '1.0.0' }, { version: '1.0.1' })).toBe(true)
  })
})
