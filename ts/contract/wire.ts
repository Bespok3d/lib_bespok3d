// The app<->daemon response contract: the shapes the daemon returns over HTTP, declared once and
// collected here in @bespok3d/contract (the SDK's shared layer, ADR-0038). The daemon mirrors these
// as FastAPI Pydantic models (daemon api/schemas/*.py); a golden-fixture round-trip test pins the two
// halves so a field added on one side without the other fails a test rather than drifting silently
// (the app-side test daemon-client/contract.test.ts, the daemon-side test_contract_fixture.py).
//
// NAMING NOTE (deferred reconciliation): the daemon wire is snake_case Pydantic; some shapes here are
// the app's post-parse projection (camelCase, e.g. InstallLog.pluginId, built by client.ts toInstallLog)
// while others mirror the wire snake_case verbatim (CapabilitiesResult.firmware_version). The two
// conventions are not yet unified; the consistent target is decided once the whole contract lives here.
//
// Types only, no runtime deps, so the import is erased from every bundle (use import type at call sites).

// One browser-openable endpoint a managed printer exposes (a plugin's web UI, the camera stream): a
// human label and the resolved URL. Shared by the live capabilities read and the persisted record.
export interface Endpoint {
  label: string
  url: string
}

export interface CapabilitiesResult {
  adapter: string
  hardware: string[]
  installed: Record<string, string>
  deactivated?: string[]
  firmware_version: string
  klipper_version: string
  jinni_version: string
  capability_flags: string[]
  interface_extras: string[]
  preferred_registries: string[]
  endpoints: Endpoint[]
}

export interface InstallLogItem {
  label: string
  ok: boolean
  output: string
}

export interface InstallLogPhase {
  id: string
  label: string
  ok: boolean
  items: InstallLogItem[]
}

export interface InstallLog {
  pluginId: string
  timestamp: number
  ok: boolean
  phases: InstallLogPhase[]
}

export interface PluginRecoveryResult {
  pluginId: string
  ok: boolean
  skipped: boolean
  reason: string
  log: InstallLogPhase[]
  autoDeactivated?: string
  fixDetail?: string
}

export interface RecoverResult {
  ok: boolean
  results: PluginRecoveryResult[]
}
