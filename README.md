# lib_bespok3d

The home for genuinely-common, cross-boundary code (TypeScript and Python) shared across Bespok3d
repos. It is a curated collection, not a dumping ground: code that belongs to a single app stays in
that app, and the build and packaging toolchain lives in its own repo, neither belongs here.

## Layout (language-split top-level dirs)

```text
lib_bespok3d/
  ts/                     TypeScript package: @bespok3d/contract (pure types)
    package.json          name "@bespok3d/contract", private, type:module
    tsconfig.json         standalone typecheck (noEmit)
    vitest.config.ts      standalone test
    contract/
      index.ts            barrel: the public @bespok3d/contract surface
      wire.ts             app<->daemon HTTP response shapes
      keys.ts             GPG key types shared across the app main<->renderer boundary
      contract.test.ts    compile-time shape pins + a runnable vitest
  python/                 Python package: bespok3d_contract (skeleton)
    pyproject.toml
    bespok3d_contract/__init__.py
```

## How the app consumes it

The Electron app reaches this sibling repo by the `@bespok3d/contract` alias (mirroring `@adapters`
/ `@plugins`), wired in both tsconfigs (`tsconfig.node` + `tsconfig.web`) and both Vite configs
(`electron.vite.config.ts` main + renderer, plus `vitest.config.ts`). Every export is a pure type, so
consumers `import type` and the import is erased from every bundle (no runtime boundary is crossed).

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
