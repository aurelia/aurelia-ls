# Current Handoff

Last updated: 2026-04-18

## Current objective

Finish the `route-witness` / `audit` migration by deciding which remaining
package-diagnostics and answer-packaging pieces should stay query-local versus
graduate into shared helpers now that lookup, regime classification, package
surface, and reachability all spend the shared workspace authority seam.

## Exact next slice

1. Decide whether audit-only package diagnostics such as coordination surface
   recovery and partition-cycle collection should stay query-local or move
   behind shared package-evaluator helpers.
2. Decide whether `navigation.ts` should adopt the new
   `analysis-metadata-support.ts` helper so snapshot provenance/freshness
   packaging stops re-reading the legacy triplet there too.
3. If those remaining seams are acceptable, mark
   `route-and-audit-migration` done and advance to the inquiry-ontology split.

## Recently landed

- Added high-signal `// TODO` markers calling out legacy projection pressure,
  ingress-ranking pressure, and answer-local truth assembly seams.
- Established repo-owned continuity files and a preflight command so future
  sessions resume through the same state instead of relying on chat memory.
- Added `src/authority/contracts.ts` and a transitional
  `src/authority/workspace-authority.ts` adapter over the legacy projection
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
  authority-backed adjudication.
- Moved structural package-surface and package-reachability construction behind
  the shared authority seam so `route-witness` and `audit` no longer build
  those internals directly from raw `AnalysisViews`.
- Added `src/analysis-metadata-support.ts` so route-witness and audit share one
  thin helper for analysis snapshot provenance/freshness packaging.
- Renamed the shared authority file from `navigation-authority.ts` to
  `workspace-authority.ts` so the boundary name matches its broader role.
- Added direct tests for the workspace authority adapter and kept the existing
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
- `audit` still owns package-diagnostic interpretation such as coordination
  fragmentation and source-area cycle findings even though package surfaces and
  reachability are now authority-backed inputs.
- Default world-frame assembly still lives separately in navigation,
  route-witness, and audit even after snapshot metadata packaging started to
  converge.

## Likely files for the next pass

- `src/route-witness.ts`
- `src/audit.ts`
- `src/navigation.ts`
- `src/analysis-metadata-support.ts`
- `src/reachability.ts`
- `src/coordination-surface.ts`
- `src/structural-source-file-surface.ts`
- `src/authority/workspace-authority.ts`

## Verification reminders

- Run `pnpm preflight` before non-trivial work.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build`.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build:tests`.
- Re-run `node ./out-test/test/workspace-authority.test.js`.
- Re-run `node ./out-test/test/navigation.test.js`.

## Resume command

`pnpm --filter @aurelia-ls/source-analysis preflight`
