// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// @bespok3d/contract - the shared wire + boundary types of the Bespok3d SDK (ADR-0038). Collected from
// the app where they were hand-mirrored across the main<->renderer boundary and the app<->daemon wire.
// Pure types: every export is erased at build time, so consumers import with `import type`.

export type {
  Endpoint,
  KernelInfo,
  DaemonStatusResult,
  PluginConfigResult,
  CapabilitiesResult,
  InstallLogItem,
  InstallLogPhase,
  InstallLog,
  PluginRecoveryResult,
  RecoverResult,
} from './wire'

export type { KeyPurpose, KeyAssignment, GenerateKeyOptions, KeyRecord } from './keys'

export type { B3dRoute, DriftReport, PrinterProblem, DaemonMetadata, ConfigTruthRecords } from './boundary'
