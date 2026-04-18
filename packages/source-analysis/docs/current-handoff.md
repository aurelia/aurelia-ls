# Current Handoff

Last updated: 2026-04-18

## Current objective

Start moving `route-witness` and then `audit` onto the same shared authority
and evaluator seams that now carry the primary `query.navigate` resolution
paths.

## Exact next slice

1. Pull `route-witness` reachability construction and witness retrieval behind a
   named shared route/reachability authority instead of letting the query
   surface assemble those internals directly from `AnalysisViews`.
2. Pull `audit` package-surface, dependency-surface, and reachability setup
   behind the same authority/evaluator seams so finding collection starts from
   shared semantic inputs rather than a fresh local join.
3. Decide whether snapshot provenance/world-frame assembly should remain query-
   local or graduate into a thinner shared helper now that navigation,
   route-witness, and audit all depend on the same metadata contract.

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
- Moved package analyzability classification, file localization, symbol
  localization, and structural owning-package lookup behind authority-backed
  evaluator seams so the primary navigation routes no longer resolve directly
  against raw `AnalysisViews`.
- Moved the primary `route-witness` file/type localization and analyzability
  entry paths onto the same authority seam used by navigation.
- Moved the `audit` package lookup and regime-classification entry path onto
  authority-backed adjudication while leaving deeper finding assembly for the
  next pass.
- Added direct tests for the navigation authority adapter and kept the existing
  live navigation, route-witness, and audit suites green.

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
- `query.navigate` still uses raw snapshot metadata for provenance, snapshot
  nodes, export-route freshness notes, and default world-frame assembly even
  though its primary resolution path now spends authority-backed seams.
- `route-witness` still constructs reachability and route witnesses directly
  from `AnalysisViews` even though its focus localization and regime
  classification now spend authority-backed seams.
- `audit` still constructs package surfaces, dependency surfaces, reachability,
  and findings directly from raw analysis carriers after the initial package
  adjudication step.

## Likely files for the next pass

- `src/route-witness.ts`
- `src/audit.ts`
- `src/reachability.ts`
- `src/structural-source-file-surface.ts`
- `src/authority/navigation-authority.ts`
- `src/analyzability-posture.ts`
- `src/focused-file-query.ts`
- `src/structural-declaration-surface.ts`

## Verification reminders

- Run `pnpm preflight` before non-trivial work.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build`.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build:tests`.
- Re-run `node ./out-test/test/navigation-authority.test.js`.
- Re-run `node ./out-test/test/navigation.test.js`.

## Resume command

`pnpm --filter @aurelia-ls/source-analysis preflight`
