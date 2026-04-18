# Current Handoff

Last updated: 2026-04-18

## Current objective

Deepen the `query.navigate` vertical slice so more of its remaining file,
symbol, analyzability, and neighborhood logic spends shared authority or
evaluator surfaces instead of direct legacy projection stitching.

## Exact next slice

1. Keep `query.navigate` moving inward by replacing more direct
   `builder.snapshots` reads with authority-backed surfaces, especially around
   symbol/file localization and package/file neighborhood assembly.
2. Decide which remaining navigation helpers should become authority methods
   versus shared evaluator surfaces so the adapter does not turn into a second
   hidden center of gravity.
3. Once the navigation slice is cleaner, use the same contracts to start moving
   `route-witness` and then `audit` off raw legacy projection carriers.

## Recently landed

- Added high-signal `// TODO` markers calling out legacy projection pressure,
  ingress-ranking pressure, and answer-local truth assembly seams.
- Established repo-owned continuity files and a preflight command so future
  sessions resume through the same state instead of relying on chat memory.
- Added `src/authority/contracts.ts` and a transitional
  `src/authority/navigation-authority.ts` adapter over the legacy projection
  bundle.
- Routed the host-side `query.navigate` path through the new navigation
  authority and moved package/type/export resolution plus some neighborhood
  reads onto authority methods.
- Added direct tests for the navigation authority adapter and kept the existing
  live navigation suite green.

## Constraints

- Do not solve semantic ambiguity by adding more alias, noun, verb, or example
  matching to the ingress layer.
- Do not grow `query.deps.*`, `query.typerefs.*`, or `query.exports.*` into a
  larger architectural family. Treat them as legacy compatibility shims.
- Prefer shared authority or evaluator surfaces over direct
  `analysis.deps` / `analysis.typeRefs` / `analysis.exports` stitching.
- Keep no-claim and blocked outcomes explicit rather than weakening everything
  into a fuzzy positive answer.

## Loose threads intentionally left open

- `AnalysisViews` still carries the historical projection triple and remains a
  major continuity seam.
- `claim-lattice.ts` is promising, but it is not yet clearly the persistent
  authority runtime consulted by all live query surfaces.
- `inquiry-model.ts` still overloads routes, read modes, focus kinds,
  provenance kinds, and execution posture.
- `route-witness` and `audit` still describe freshness in terms of the legacy
  projections rather than a named shared route/reachability authority.
- `query.navigate` now enters through authority contracts, but much of its file
  and symbol logic still reaches through transitional `analysis` access instead
  of fully authority-owned surfaces.

## Likely files for the next pass

- `src/authority/navigation-authority.ts`
- `src/navigation.ts`
- `src/analysis-views.ts`
- `src/focused-file-query.ts`
- `src/structural-declaration-surface.ts`
- `src/analyzability-posture.ts`

## Verification reminders

- Run `pnpm preflight` before non-trivial work.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build`.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build:tests`.
- Re-run `node ./out-test/test/navigation-authority.test.js`.
- Re-run `node ./out-test/test/navigation.test.js`.

## Resume command

`pnpm --filter @aurelia-ls/source-analysis preflight`
