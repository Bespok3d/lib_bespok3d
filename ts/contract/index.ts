// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// @bespok3d/contract - the shared wire + boundary types of the Bespok3d SDK (ADR-0038). Collected from
// the app where they were hand-mirrored across the main<->renderer boundary and the app<->daemon wire.
// The wire and boundary shapes are pure types, erased at build time, so consumers import them with
// `import type`. `./version` is the one exception and the only runtime code here: the single version
// comparator both halves of the app and the store install path read, which has to be one
// implementation or the same string means different things on different paths.

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

export type { ParsedVersion } from './version'

export {
  parseSemanticVersion,
  compareReleases,
  compareSemanticVersions,
  isReleaseNewer,
  isDaemonVersionAtLeast,
  isNewerVersion,
  sameVersion,
} from './version'

export {
  reportedVersionOrNull,
  declaredDaemonFloor,
  declaredJinniFloor,
  daemonMeetsFloor,
  jinniMeetsFloor,
} from './compat'
