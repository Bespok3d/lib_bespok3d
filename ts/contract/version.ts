// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// The one version comparator in the TypeScript half of Bespok3d. The daemon/jinni compatibility
// floors, the plugin store's update arrows and the app auto-updater all read version strings written
// the same way, so they read them here. A second implementation is how a `+dev` build tag came to
// mean one thing on one path and something else on the next.
//
// Two different questions get asked of a version string, and keeping them apart is the whole point:
//   which RELEASE is this (compareReleases): the numeric triple alone, so `0.1.6+dev.3a7f1c2`,
//   `0.1.6-dev` and `0.1.6` are one release and never look like an update of one another.
//   which BUILD ships first (compareSemanticVersions): the triple, then semver prerelease
//   precedence, so `0.7.0-beta` sorts below `0.7.0` and `alpha.13` below `alpha.14`.
// Build metadata (`+...`) decides neither, which is what the semver spec says of it.

export interface ParsedVersion {
  release: number[]
  prereleaseLabel: string | null
  prereleaseNumber: number
}

function parsePrerelease(prerelease: string | undefined): { prereleaseLabel: string | null; prereleaseNumber: number } {
  if (!prerelease) return { prereleaseLabel: null, prereleaseNumber: 0 }
  const [label, ordinal] = prerelease.split('.')

  return { prereleaseLabel: label ?? null, prereleaseNumber: Number(ordinal) || 0 }
}

export function parseSemanticVersion(version: string): ParsedVersion {
  const withoutBuildTag = version.trim().replace(/^v/, '').split('+')[0] ?? ''
  const [releaseTriple, prerelease] = withoutBuildTag.split('-')

  return {
    release: (releaseTriple ?? '').split('.').map((slot) => parseInt(slot, 10) || 0),
    ...parsePrerelease(prerelease),
  }
}

function compareSlots(leftSlots: number[], rightSlots: number[]): number {
  const slotCount = Math.max(leftSlots.length, rightSlots.length)
  const slots = Array.from({ length: slotCount }, (_unused, slot) => slot)
  const firstDifference = slots.find((slot) => (leftSlots[slot] ?? 0) !== (rightSlots[slot] ?? 0))
  if (firstDifference === undefined) return 0

  return (leftSlots[firstDifference] ?? 0) < (rightSlots[firstDifference] ?? 0) ? -1 : 1
}

function comparePrerelease(installed: ParsedVersion, candidate: ParsedVersion): number {
  if (!installed.prereleaseLabel && !candidate.prereleaseLabel) return 0
  if (!installed.prereleaseLabel) return 1
  if (!candidate.prereleaseLabel) return -1
  if (installed.prereleaseLabel !== candidate.prereleaseLabel) {
    return installed.prereleaseLabel < candidate.prereleaseLabel ? -1 : 1
  }

  return Math.sign(installed.prereleaseNumber - candidate.prereleaseNumber)
}

// The release triple alone, as -1 / 0 / 1. Prerelease and build tags are not read.
export function compareReleases(leftVersion: string, rightVersion: string): number {
  return compareSlots(parseSemanticVersion(leftVersion).release, parseSemanticVersion(rightVersion).release)
}

// -1 when installed is older than the candidate, 0 when they are the same build, 1 when it is newer.
export function compareSemanticVersions(installedVersion: string, candidateVersion: string): number {
  const installed = parseSemanticVersion(installedVersion)
  const candidate = parseSemanticVersion(candidateVersion)
  const releaseOrder = compareSlots(installed.release, candidate.release)
  if (releaseOrder !== 0) return releaseOrder

  return comparePrerelease(installed, candidate)
}

export function isReleaseNewer(installedVersion: string, candidateTag: string): boolean {
  return compareSemanticVersions(installedVersion, candidateTag) < 0
}

// The compatibility floor test: does the version running meet the oldest peer the other side accepts.
export function isDaemonVersionAtLeast(current: string, required: string): boolean {
  return compareReleases(current, required) >= 0
}

export function isNewerVersion(candidate: string, installed: string): boolean {
  return compareReleases(candidate, installed) > 0
}

export function sameVersion(leftVersion: string, rightVersion: string): boolean {
  return compareReleases(leftVersion, rightVersion) === 0
}
