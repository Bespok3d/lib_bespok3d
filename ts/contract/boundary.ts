// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
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

// Something wrong with the printer itself rather than with one plugin's links: its own config no
// longer includes bespok3d, part of the bespok3d tree is gone, a plugin was left half removed, a
// plugin never came back from a recovery. Reported whatever the plugin count is, because a printer
// with no plugins left has nothing to drift and can still be thoroughly broken.
export interface PrinterProblem {
  kind: string
  detail: string
  pluginId: string | null
}

// The per-printer records behind the Config tab's truth ladder, declared once for the persisted
// PrinterRecord (main) and the renderer Printer state: the vars THIS computer last sent per plugin
// id with the ISO timestamp of that send (tier 2, shown with a visible "as sent from this computer
// on [date]" marker; pruned on uninstall), and the daemon-minted stable printer identity from
// /status (daemon >= 0.12.12-dev; survives OTA, keys the scoped plugin-config store, never cleared
// once learned).
export interface ConfigTruthRecords {
  appliedPluginVars?: Record<string, Record<string, string>>
  appliedPluginVarsAt?: Record<string, string>
  printerUuid?: string
}

// What main learns about a managed printer's daemon after a probe; the renderer applies it to state.
export interface DaemonMetadata {
  daemonVersion?: string
  daemonUpdateAvailable?: boolean
  installedIds?: string[]
  installedVersions?: Record<string, string>
  daemonDrift?: DriftReport[]
  printerProblems?: PrinterProblem[]
  // Whether the printer itself says bespok3d is switched off on it: wiring gone and plugins unlinked
  // because someone asked for that. A reachable daemon otherwise reads as a fully working printer, so
  // without this the app shows a switched-off printer as healthy and offers no way to switch it on.
  switchedOff?: boolean
  // Machine tokens (kebab-case) the printer says require a power cycle to clear, e.g.
  // "display-pipe-wedged". Empty list or absent = no reboot needed; a daemon too old to answer must
  // read the same way, never as "unknown". Tokens are device knowledge; the app localizes them.
  rebootRequired?: string[]
  jinniVersion?: string
  jinniCapabilities?: string[]
  jinniExtras?: string[]
  // The daemon-minted stable printer identity (/status printer_uuid, daemon >= 0.12.12-dev).
  // Absent when the daemon predates it or has not minted one; never used to clear a learned uuid.
  printerUuid?: string
}
