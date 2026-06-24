# lib_bespok3d

The home where the Bespok3d cleanup COLLECTS genuinely-common / cross-boundary code (TypeScript +
Python). Collecting common code here IS cleanup work, and the same act seeds the Bespok3d SDK
(ADR-0038). It is a curated collection of shared things, not a dumping ground: god-file chunks split
app-internally, and the build/packaging toolchain is the future `plugin-build`, neither lives here.

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

## TS<->Python contract (ADR-0038: contract test now, codegen later)

The TypeScript wire types here are the app side. The daemon's FastAPI Pydantic models
(`daemon/api/schemas/*.py`) remain the Python wire source; a golden-fixture round-trip test keeps the
two halves from drifting (see `python/bespok3d_contract/__init__.py` for the loop). The Python package
is a skeleton until the SDK codegen makes it the single generated source.

## Deferred: naming reconciliation

The wire shapes here mix conventions: some are the app's post-parse camelCase projection
(`InstallLog.pluginId`), others mirror the daemon snake_case verbatim (`CapabilitiesResult.firmware_version`).
Unifying them onto one convention is deliberately deferred to the SDK build, when the whole contract
lives here and one source generates both sides.
