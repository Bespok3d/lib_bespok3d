// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// The daemon/jinni compatibility floors, as one decision both halves of the app read.
//
// Two independent floors, no ranges and no ceilings: a package declares the oldest daemon it will run
// against (`min_daemon_version` in its manifest), and the daemon declares the oldest jinni it will
// drive (`min_jinni_version`, served on capabilities).
//
// The rule the whole contract rests on: REFUSE WHEN BOTH NUMBERS ARE KNOWN, and do not refuse when
// one of them is not knowable. A version the app could not read is not evidence of a bad pair, and
// turning "I could not ask" into "no" strands a printer whose daemon was briefly mid-restart.
//
// This lives in the shared contract because the store card and the install path must reach the same
// verdict. A card that offers a package the install path then refuses is worse than either answer on
// its own.
import { isDaemonVersionAtLeast } from './version'

// A version string a peer actually reported, or null when the peer did not report one. 'unknown' is
// what the daemon serves for a jinni that does not report a version, and '0.0.0' is what the app used
// to stand in with; both are the same fact as an absent value, so both read as not knowable.
export function reportedVersionOrNull(version: string | null | undefined): string | null {
  if (!version || version === 'unknown' || version === '0.0.0') return null

  return version
}

// A declaration is only a demand when it is a real version string. Absent, blank or not a string is
// silence, and silence is not a demand.
function declaredFloorOrNull(declared: unknown): string | null {
  return typeof declared === 'string' && declared.trim() !== '' ? declared : null
}

// The floor an index entry or a package manifest declares, or null when it declares none. A package
// that declares no floor runs against any daemon: that was the behaviour before floors existed and it
// stays the behaviour, because a missing declaration is silence, not a demand.
export function declaredDaemonFloor(entry: { min_daemon_version?: unknown }): string | null {
  return declaredFloorOrNull(entry.min_daemon_version)
}

// The oldest jinni a package will drive, declared the same way and read from the same places. The
// daemon package is the one that carries it today: a daemon that reaches a printer whose jinni is
// older than this will refuse to be driven by it once it is running, so the number has to be readable
// before a byte is sent, not only afterwards from the printer.
export function declaredJinniFloor(entry: { min_jinni_version?: unknown }): string | null {
  return declaredFloorOrNull(entry.min_jinni_version)
}

// Unknown on either side answers true: not knowable is not a refusal.
function versionMeetsFloor(reportedVersion: string | null | undefined, declaredFloor: string | null | undefined): boolean {
  const running = reportedVersionOrNull(reportedVersion)
  if (!declaredFloor || !running) return true

  return isDaemonVersionAtLeast(running, declaredFloor)
}

// Whether this daemon clears this floor. The install path and the store card both ask this and
// nothing else.
export function daemonMeetsFloor(runningDaemonVersion: string | null | undefined, declaredFloor: string | null | undefined): boolean {
  return versionMeetsFloor(runningDaemonVersion, declaredFloor)
}

// Whether the jinni on this printer clears this floor. The mirror of `daemonMeetsFloor`, asked of the
// other half of the pair, so a package can be refused for either side being behind.
export function jinniMeetsFloor(runningJinniVersion: string | null | undefined, declaredFloor: string | null | undefined): boolean {
  return versionMeetsFloor(runningJinniVersion, declaredFloor)
}
