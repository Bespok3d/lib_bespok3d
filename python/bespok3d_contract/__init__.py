"""Bespok3d shared contract, Python side (SDK skeleton, ADR-0038).

This package is the eventual home of the app<->daemon wire contract on the Python side. Today the
daemon's FastAPI Pydantic models (daemon ``api/schemas/*.py``) remain the wire source of truth, and the
loop that keeps them from drifting against the TypeScript ``@bespok3d/contract`` is a golden-fixture
round-trip test, NOT a shared import:

    daemon Pydantic models
      -> daemon emits ``daemon/tests/api/contract_fixture.json``  (test_contract_fixture.py)
      -> app copies it as the committed golden fixture, deep-equal-pinned to the daemon's
      -> app ``satisfies`` it against ``@bespok3d/contract``     (daemon-client/contract.test.ts)

So a field changed on either side fails a test. The TS and Python wire shapes also use different
naming conventions today (camelCase app projection vs snake_case Pydantic); reconciling them onto one
convention is deferred until the contract is fully collected here and the SDK codegen is built.

The skeleton exists now so the collection home has its Python half stood up; it is intentionally empty
of declarations until the codegen makes this the single generated source.
"""

__version__ = "0.0.0"
