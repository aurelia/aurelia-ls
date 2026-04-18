# Protocol Derivation Fixtures

This directory holds repo-owned machine-legible fixtures for protocol and
scenario derivation work.

The goal is to make derivation cheaper and less prose-heavy by giving us:

- tiny concrete source workspaces
- machine-legible fixture packets
- machine-legible scenario packets
- structured framework-detection evidence
- stable query seeds for repeated pressure tests

These fixtures are intentionally small and opinionated.
They are not intended to model a whole app.
They are meant to pressure the protocol kernel at specific semantic seams.

## Layout

- [schema.yaml](./schema.yaml)
  Packet shape for fixtures and scenarios.
- [vocabulary.yaml](./vocabulary.yaml)
  Lightweight registry for current semantic-world, lookup-regime, and
  subject-kind leaf names used by the packet set.
- [manifest.yaml](./manifest.yaml)
  Top-level index of the current derivation fixture set.
- `fixtures/<fixture-id>/`
  One fixture workspace plus one `fixture.yaml`.
- `scenarios/`
  Query seeds that spend one fixture.

## Current Focus

The first fixture set is export-lens oriented.
It is meant to pressure:

- export-addressable identity
- export topology
- resource-definition versus registry-like exports
- DI key-space versus resource key-space
- closed no-claim versus honest open frontier
- open-boundary and activation-gap classification
- continuation design
- retreat and reread implications

Some fixtures now also describe derived mutation states.
Those let scenarios pressure withdrawal and retreat without needing a second
workspace copy for every before-and-after variant.

Framework detection should be automatic.
If a fixture is Aurelia-shaped, the fixture packet declares that and scenario
derivation should assume Aurelia semantics are active.

Scenario packets should also keep a few layers separate on purpose:

- `dominant_outcomes` versus `dominant_trust_kinds`
- kernel `continuation_kinds` versus scenario-local `followup_queries`
- structured `identity_expectation` versus structured `anchor_expectation`
- structured `resolution_expectation` when single versus ambiguous closure matters
- explicit `expected_consulted_world` instead of only implied world assumptions
- light registered leaf names in `vocabulary.yaml` instead of silent free-text drift
