// SPDX-FileCopyrightText: Copyright (C) 2026 unlucio and the Bespok3d contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
// GPG key contract shared across the app's main<->renderer boundary, collected here in
// @bespok3d/contract (ADR-0038). The renderer is a separate tsconfig project that must not import
// main/keys.ts (it carries openpgp + fs); main, preload and renderer all import these types from here
// so the shape is declared once instead of hand-mirrored. Types only, no runtime deps, so the import
// is erased from every bundle.

export type KeyPurpose = 'printers' | 'packages' | 'lists' | 'contribution'

export interface KeyAssignment {
  purpose: KeyPurpose
  entityId: string
}

export interface GenerateKeyOptions {
  label: string
}

export interface KeyRecord {
  id: string
  label: string
  isDefault: boolean
  assignments: KeyAssignment[]
  publishedAt?: string
  iconColor?: string
  iconImage?: string
  iconSize?: number
  type: string
  fingerprint: string
  fingerprintShort: string
  publicKey: string
  addedAt: string
}
