# lib_bespok3d

[![licence](https://img.shields.io/badge/licence-AGPL--3.0-blue)](LICENSE)
[![release](https://img.shields.io/github/v/release/Bespok3d/lib_bespok3d)](https://github.com/Bespok3d/lib_bespok3d/releases)
![runtime](https://img.shields.io/badge/runtime-TypeScript%20and%20Python-informational)
![stock firmware](https://img.shields.io/badge/stock%20firmware-no%20flashing-brightgreen)

The home for genuinely-common, cross-boundary code (TypeScript and Python) shared across Bespok3d
repos. It is a curated collection, not a dumping ground: code that belongs to a single app stays in
that app, and the build and packaging toolchain lives in its own repo, neither belongs here.

## Layout (language-split top-level dirs)

```text
lib_bespok3d/
  ts/                     TypeScript package: @bespok3d/contract (types, plus the one shared comparator)
    package.json          name "@bespok3d/contract", private, type:module
    tsconfig.json         standalone typecheck (noEmit)
    vitest.config.ts      standalone test
    contract/
      index.ts            barrel: the public @bespok3d/contract surface
      wire.ts             app<->daemon HTTP response shapes
      keys.ts             GPG key types shared across the app main<->renderer boundary
      boundary.ts         shapes crossing the app main<->renderer boundary
      version.ts          the one version comparator (runtime, not a type)
      contract.test.ts    compile-time shape pins + a runnable vitest
  python/                 Python package: bespok3d_contract (skeleton)
    pyproject.toml
    bespok3d_contract/__init__.py
```

## How the app consumes it

The Electron app reaches this sibling repo by the `@bespok3d/contract` alias (mirroring `@adapters`
/ `@plugins`), wired in both tsconfigs (`tsconfig.node` + `tsconfig.web`) and both Vite configs
(`electron.vite.config.ts` main + renderer, plus `vitest.config.ts`). The wire and boundary exports are
pure types, so consumers `import type` and those imports are erased from every bundle. `contract/version.ts`
is the one exception and the only runtime code in the package: the single version comparator the app's
main process, its renderer and the plugin install path all read, because a version string that means one
thing on one path and something else on the next is how a compatibility floor stops holding.

The app's own `tsc -b` typechecks these files (they are in both composite projects' `include`), and the
app's `daemon-client/contract.test.ts` exercises the wire types against the daemon golden fixture, so
the contract is gate-covered through the app. The `ts/` package also carries its own `package.json` /
`tsconfig` / `vitest.config` so it can be built and tested standalone.

## TS<->Python contract (contract test now, codegen later)

The TypeScript wire types here are the app side. The daemon's FastAPI Pydantic models
(`daemon/api/schemas/*.py`) remain the Python wire source; a golden-fixture round-trip test keeps the
two halves from drifting (see `python/bespok3d_contract/__init__.py` for the loop). The Python package
is a skeleton for now; the plan is to generate it and the TypeScript side from one shared source.

## Naming reconciliation (not yet done)

The wire shapes here mix conventions: some are the app's post-parse camelCase projection
(`InstallLog.pluginId`), others mirror the daemon snake_case verbatim (`CapabilitiesResult.firmware_version`).
Unifying them onto one convention waits until the whole contract lives here and one source generates
both sides.

## Licence

Copyright (C) 2026 unlucio and the Bespok3d contributors

This program is free software: you can redistribute it and/or modify it under the terms of the GNU
Affero General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If
not, see <https://www.gnu.org/licenses/>. The full text is in [LICENSE](LICENSE).

Bespok3d is a project of the Bespok3d Organisation, which is not a legal entity. Copyright is held by
the individual authors named above.

## Support this project

Bespok3d is built and maintained in the open, on stock printer firmware. If it saved you an
afternoon, you can [buy me a coffee](https://buymeacoffee.com/unlucio).
