# Current Handoff

Last updated: 2026-04-18

## Current objective

Start the inquiry-ontology split by separating route families, read modes,
provenance families, and execution posture so the outer inquiry boundary stops
carrying one overloaded label space.

## Exact next slice

1. Keep shrinking the broad route carriers around continuations, delta floors,
   and wire payloads so cognitive inquiry moves (`search` / `join` / `route` /
   `inventory`) stop sharing one label slot with maintenance/control moves
   (`refresh` / `diff` / `materialize`) after the catalog split.
2. Push `WorldFrame` flattening outward toward compatibility-only boundaries by
   letting more answer/wire/runtime surfaces spend `WorldTargeting` and
   `ExecutionPosture` directly.
3. Decide how payload/materialization mode should escape the remaining broad
   `ReadMode` union without prematurely freezing a public materialization
   contract.

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
- Moved route/reachability package diagnostics out of `audit.ts` and behind the
  shared `src/package-audit-evaluator.ts` seam while intentionally keeping
  answer-coordination and presentation-fragmentation checks audit-local.
- Updated `navigation.ts` to spend `analysis-metadata-support.ts` for snapshot
  provenance/metadata packaging instead of re-reading the legacy projection
  triplet directly.
- Finished the `route-and-audit-migration` step and advanced the campaign to
  the inquiry-ontology split.
- Narrowed structured-answer policy onto presentation read modes and
  policy-focus kinds so render policy no longer treats payload/materialization
  mode as a peer of answer presentation.
- Split inquiry provenance payloads into explicit carrier (`snapshot` / `host`)
  versus evidence (`substrate` / `claim` / `route`) entry families and moved
  shared metadata helpers onto the carrier side.
- Moved capability/inquiry ingress and the main structured answer builders onto
  the narrowed policy/provenance seams while keeping the outer query model
  broad enough to avoid freezing premature public names.
- Split capability and inquiry catalog definitions onto explicit cognitive
  versus maintenance route families while preserving the flattened
  `questionRoutes` view for compatibility/read surfaces.
- Added shared `WorldTargeting`, `ExecutionPosture`, and world-frame helper
  contracts so high-fanout planning/runtime consumers can stop mixing repo
  targeting with observed freshness/posture in one local ad hoc bundle.
- Moved `analysis-surface`, `analysis-metadata-support`, host runtime world
  frame construction, and navigation/audit/route-witness freshness reads onto
  those new targeting/posture helpers while keeping the flattened `WorldFrame`
  wire shape intact.

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
- `resolveInquiryPolicy` still carries the broad `QuestionRoute` union because
  continuation/delta/wire carriers still flatten the route families back into
  one label space after the catalog split.
- `route-witness` and `audit` still describe freshness in terms of the legacy
  projections rather than a named shared route/reachability authority.
- `query.navigate`, `route-witness`, and `audit` still describe freshness in
  terms of legacy projection labels even though metadata packaging has started
  to converge behind shared helpers.
- `audit` still owns coordination and presentation fragmentation checks as
  package-self-pressure heuristics rather than shared semantic evaluators.
- `WorldFrame` is now split internally into `WorldTargeting` and
  `ExecutionPosture`, but the flattened carrier still travels through answer
  and wire payloads for compatibility.

## Likely files for the next pass

- `src/inquiry-model.ts`
- `src/inquiry-policy.ts`
- `src/inquiry-wire.ts`
- `src/answer-envelope.ts`
- `src/outcome-algebra.ts`
- `src/inquiry-catalog.ts`
- `src/capability-catalog.ts`
- `src/inquiry-ingress.ts`
- `src/capability-ingress.ts`
- `src/host/runtime.ts`
- `src/analysis-surface.ts`

## Verification reminders

- Run `pnpm preflight` before non-trivial work.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build`.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build:tests`.
- Re-run `node ./out-test/test/workspace-authority.test.js`.
- Re-run `node ./out-test/test/navigation.test.js`.
- Re-run `node ./out-test/test/route-witness.test.js`.
- Re-run `node ./out-test/test/audit.test.js`.

## Resume command

`pnpm --filter @aurelia-ls/source-analysis preflight`
