// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// The one rule for offering an update of a plugin, the daemon, a jinni or an adapter: when both
// package fingerprints are known, the offer is decided by them alone and never by the version, so a
// rebuild under any version number is offered. A missing fingerprint on either side leaves only the
// version test. Machinery the app ships (the daemon, a jinni) adds one guard: never an older version.
import { compareReleases, compareSemanticVersions } from './version'

// A version and the fingerprint (sha256 hex) of the package that carried it, when known.
export interface PackageBuild {
  version: string
  fingerprint?: string | null
}

// 'build' orders by the full version with its prerelease, 'release' by the release triple alone.
// Each call site keeps the ordering it has always used.
export type VersionOrdering = 'release' | 'build'

function isPublishedAhead(installedVersion: string, publishedVersion: string, ordering: VersionOrdering): boolean {
  if (ordering === 'release') return compareReleases(publishedVersion, installedVersion) > 0

  return compareSemanticVersions(installedVersion, publishedVersion) < 0
}

export function isUpdateOffered(
  installed: PackageBuild,
  published: PackageBuild,
  ordering: VersionOrdering = 'build',
): boolean {
  const installedFingerprint = knownFingerprint(installed)
  const publishedFingerprint = knownFingerprint(published)
  if (!installedFingerprint || !publishedFingerprint) return isPublishedAhead(installed.version, published.version, ordering)

  return installedFingerprint.toLowerCase() !== publishedFingerprint.toLowerCase()
}

// A fingerprint read from a remote list or a printer is only as typed as the JSON it came in: anything
// but a non-empty string is no fingerprint at all.
function knownFingerprint(build: PackageBuild): string | null {
  return typeof build.fingerprint === 'string' && build.fingerprint ? build.fingerprint : null
}

// The same rule for machinery the app ships (the daemon, a jinni): a build older than the installed
// one is never offered, whatever its fingerprint, so a printer is never pushed backwards. Older is
// judged on the full version whatever the ordering, so a prerelease never goes over its own release.
export function isUpgradeOffered(
  installed: PackageBuild,
  published: PackageBuild,
  ordering: VersionOrdering = 'build',
): boolean {
  if (compareSemanticVersions(installed.version, published.version) > 0) return false

  return isUpdateOffered(installed, published, ordering)
}
