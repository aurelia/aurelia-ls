# Current Handoff

Last updated: 2026-04-18

## Current objective

Start the inquiry-ontology split by separating route families, read modes,
provenance families, and execution posture so the outer inquiry boundary stops
carrying one overloaded label space.

## Exact next slice

1. Split route-family usage in planner/runtime code so cognitive inquiry moves
   (`search` / `join` / `route` / `inventory`) stop sharing one label space
   with maintenance/control moves (`refresh` / `diff` / `materialize`).
2. Separate request targeting from observed execution posture inside
   `WorldFrame` or a successor type so repo/target/profile selection stops
   traveling in the same bundle as regime/freshness/partiality.
3. Migrate one or two more high-fanout consumers, likely host runtime
   rendering/execution summaries plus inquiry/capability planning helpers, onto
   those narrower families without freezing premature public names.

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
  route-family planning/execution has not yet split cognitive inquiry moves
  from maintenance/control moves.
- `route-witness` and `audit` still describe freshness in terms of the legacy
  projections rather than a named shared route/reachability authority.
- `query.navigate`, `route-witness`, and `audit` still describe freshness in
  terms of legacy projection labels even though metadata packaging has started
  to converge behind shared helpers.
- `audit` still owns coordination and presentation fragmentation checks as
  package-self-pressure heuristics rather than shared semantic evaluators.
- `WorldFrame` still blends request targeting inputs with observed execution
  posture, and default world-frame assembly still lives separately in
  navigation, route-witness, and audit even after snapshot metadata packaging
  started to converge.

## Likely files for the next pass

- `src/route-witness.ts`
- `src/audit.ts`
- `src/inquiry-model.ts`
- `src/inquiry-policy.ts`
- `src/inquiry-catalog.ts`
- `src/capability-catalog.ts`
- `src/inquiry-ingress.ts`
- `src/capability-ingress.ts`
- `src/host/runtime.ts`
- `src/analysis-surface.ts`
- `src/answer-envelope.ts`

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
