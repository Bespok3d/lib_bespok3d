import { describe, it, expect } from 'vitest'
import type {
  CapabilitiesResult,
  InstallLog,
  KeyRecord,
  RecoverResult,
} from './index'

// @bespok3d/contract is a pure-type package: there is no runtime surface to unit-test. These cases
// pin the exported shapes at compile time (a removed or renamed field fails tsc on the `satisfies`)
// and give the package a runnable vitest so its own hygiene gate has something green to assert.

describe('@bespok3d/contract shapes are constructible', () => {
  it('builds a CapabilitiesResult', () => {
    const caps = {
      adapter: 'snapmaker-u1',
      hardware: [],
      installed: {},
      firmware_version: 'unknown',
      klipper_version: 'unknown',
      jinni_version: 'unknown',
      capability_flags: [],
      interface_extras: [],
      preferred_registries: [],
      endpoints: [{ label: 'Spoolman', url: 'http://{host}:7912' }],
    } satisfies CapabilitiesResult
    expect(caps.endpoints[0].label).toBe('Spoolman')
  })

  it('builds an InstallLog and a RecoverResult', () => {
    const log = {
      pluginId: 'spoolman',
      timestamp: 0,
      ok: true,
      phases: [{ id: 'extract', label: 'Extract', ok: true, items: [] }],
    } satisfies InstallLog
    const recover = { ok: true, results: [] } satisfies RecoverResult
    expect(log.phases[0].id).toBe('extract')
    expect(recover.ok).toBe(true)
  })

  it('builds a KeyRecord', () => {
    const key = {
      id: 'k1',
      label: 'release',
      isDefault: false,
      assignments: [{ purpose: 'packages', entityId: 'spoolman' }],
      type: 'rsa',
      fingerprint: 'ABCD',
      fingerprintShort: 'CD',
      publicKey: '-----',
      addedAt: '2026-01-01',
    } satisfies KeyRecord
    expect(key.assignments[0].purpose).toBe('packages')
  })
})
