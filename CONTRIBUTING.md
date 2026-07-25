# Contributing

Thanks for working on `lib_bespok3d`. This is the shared-code home for the Bespok3d workspace: code
that more than one repo needs lives here once and is imported, rather than copied. It also carries the
detectors every repo's gate runs (the em-dash guard, workflow-pinning, and the shared gate library).
See [README.md](README.md) for what it holds and how other repos consume it.

## Before you write code

Read [CLAUDE.md](CLAUDE.md). It is the contract for changes here: the non-negotiables (RULE ZERO: no
em-dash or en-dash; every identifier carries domain meaning; nesting beyond one level is suspicious;
rule of three), and the working procedure. If you use an AI assistant, point it at that file;
`AGENTS.md` sends non-Claude tools there too.

Because other repos vendor this one as a submodule, treat every change here as a change to shared
surface. A detector's behavior, a helper's signature, or a contract shape moving here affects every
repo that imports it, so keep changes small, additive, and covered by a test.

## Develop

```sh
bash scripts/check.sh
```

Run it before every push; CI runs the same gate.

## Constraints

- The maintainer owns git history and releases; submit changes as a pull request against `dev`.
- A change that alters a detector or a shared contract ships with a test that pins the new behavior.
