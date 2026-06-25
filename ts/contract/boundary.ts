// App-internal boundary types hand-mirrored across the Electron main<->renderer split (IPC payload
// shapes). Collected here so the two sides import ONE definition instead of drifting copies.

// The `b3d://` route the OS protocol handler (main) parses and the renderer's deep-link router consume.
export type B3dRoute =
  | { kind: 'entity'; publisher: string; name: string }
  | { kind: 'registry-add'; url: string }
  | { kind: 'printer'; fingerprint: string }
  | { kind: 'auth-callback'; params: Record<string, string> }
  | { kind: 'unknown'; raw: string }

// A single plugin's symlink drift, reported by the daemon selfcheck and surfaced in the printer record.
export interface DriftReport {
  pluginId: string
  symlinkIssueCount: number
}

// What main learns about a managed printer's daemon after a probe; the renderer applies it to state.
export interface DaemonMetadata {
  daemonVersion?: string
  daemonUpdateAvailable?: boolean
  installedIds?: string[]
  installedVersions?: Record<string, string>
  daemonDrift?: DriftReport[]
  jinniVersion?: string
  jinniCapabilities?: string[]
  jinniExtras?: string[]
}
