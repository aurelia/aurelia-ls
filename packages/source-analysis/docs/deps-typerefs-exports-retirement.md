# Deps / Typerefs / Exports Reset

This note records a stronger corrective direction for the historical
`deps` / `typerefs` / `exports` layer.

## Problem

Those tools were useful, but the current shape is now a liability:

- snapshot materialization became a hidden prerequisite for steering
- query scripts became large parallel truth owners
- docs kept explaining both the live/runtime path and the snapshot path
- the package kept paying for the same semantic information twice

That split-brain situation is now considered active technical debt.

## Direction

The useful part to preserve is the command intent:

- dependency inspection
- type-reference inspection
- export inspection

The part to retire is the architecture:

- snapshot-first loading
- giant query-local indexes and renderers
- `refresh` as a normal prerequisite for asking current questions
- treating `deps` / `typerefs` / `exports` as the durable semantic axes

Snapshots may remain as optional materialized artifacts.
They should not remain the default query substrate.

## New Center Of Gravity

The replacement direction is a live query kernel over the current workspace.

Current seed:

- [src/live-query/contracts.ts](../src/live-query/contracts.ts)
- [src/live-query/runtime.ts](../src/live-query/runtime.ts)

That kernel should be the one place that knows how to:

- open a repo session
- scan tsconfig source files
- build the structural claim graph
- materialize current deps / typerefs / exports outputs
- produce current analysis views for higher-level consumers

## Current Migration State

- `deps` now boots from the live query kernel by default and keeps `--file`
  only as explicit materialized/offline inspection mode.
- `typerefs` and `exports` still need the same treatment.
- The large query-local renderers and indexes are still technical debt even
  after the loader path moves to live current-state.

## TODOs

- Keep shrinking `src/deps/query.ts` now that it no longer depends on
  snapshot-path resolution by default.
- Rewrite `src/typerefs/query.ts` as a thin adapter over `src/live-query/`.
- Rewrite `src/exports/query.ts` as a thin adapter over `src/live-query/`.
- Remove snapshot-path resolution as the default boot path for current queries.
- Keep `--file` only as an explicit materialized/offline inspection mode.
- Move any reusable query logic out of the giant query scripts and into shared evaluators.
- Stop teaching docs that `refresh all` is the normal prerequisite for understanding the current repo.
- Delete or quarantine snapshot-first compatibility code once the live adapters cover the useful commands.
- Reassess whether `AnalysisViews` should keep carrying the legacy triple as its primary identity.

## Non-goal

The goal is not to cosmetically improve the old snapshot shell.

The goal is to make that shell unnecessary.
