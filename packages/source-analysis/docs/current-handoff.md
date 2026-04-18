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
2. Keep pushing route selection and world-frame flattening outward from the
   compatibility boundary itself so the public query and outcome carriers stop
   being the next place that route/world family information gets collapsed.
3. Keep pushing payload/materialization mode outward from the remaining broad
   public compatibility carriers (`Inquiry.readMode`, host render/query args,
   CLI `--read-mode`, and host/public type exports) now that ingress internals
   and live query entrypoints normalize onto presentation-only requests.
4. Decide whether the next honest move is to split the public
   `snapshot-maintenance` family into narrower discovery families or to keep it
   as a compatibility label while moving more explicit maintenance intent into
   the catalog and wire model.

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
- Added shared `QuestionRouteSelection` helpers so internal route targets can
  carry cognitive versus maintenance family information without immediately
  collapsing back to the flattened `QuestionRoute` union.
- Moved continuation targets onto typed route selections while preserving the
  flattened `targetQuestionRoute` field as a compatibility carrier on the
  public outcome surface.
- Added split answer/wire adapters in `inquiry-wire.ts` so continuation bases
  and delta reread floors can spend `QuestionRouteSelection`,
  `WorldTargeting`, and `ExecutionPosture` internally before flattening at the
  wire payload boundary.
- Moved `answer-envelope.ts` onto those split wire adapters and added a direct
  `inquiry-wire` test that pins the compatibility payload shape.
- Added shared `ReadModeFamilies`, `createReadModeFamilies(...)`,
  `flattenReadModeFamilies(...)`, and `resolvePresentationReadMode(...)` so
  read-mode splitting now has the same explicit family vocabulary as routes.
- Moved capability and inquiry catalogs onto internal read-mode families while
  preserving flattened `readModes` compatibility views for ingress discovery.
- Narrowed `resolveInquiryPolicy(...)` onto presentation-only policy input and
  moved the broad-to-narrow `ReadMode` normalization into explicit adapter
  seams used by capability ingress, inquiry ingress, host rendering, and the
  live answer builders.
- Added direct read-mode family coverage in `test/inquiry-model.test.ts` and
  updated `test/answer-renderer.test.ts` to pin the new explicit
  presentation-policy adapter.
- Narrowed `CapabilityIngress` and `InquiryIngress` option surfaces onto
  `PresentationReadMode` so payload/materialization mode is no longer part of
  their internal API contract.
- Moved hosted runtime read-mode normalization to the host boundary before
  discovery, planning, repair, audit, route-witness, and navigation enter
  presentation-oriented answer builders.
- Split snapshot-maintenance planning onto explicit internal maintenance
  intents (`inspect-session`, `refresh-session`, `invalidate-session`,
  `materialize-snapshots`) so session-state moves and payload export no longer
  share one ad hoc planner branch.
- Added direct coverage for the new snapshot-maintenance intent split and for
  host-side normalization of `readMode: 'snapshot'` back onto presentation
  answers.

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
- `query.navigate`, `route-witness`, and `audit` still describe freshness in
  terms of legacy projection labels even though metadata packaging has started
  to converge behind shared helpers.
- `audit` still owns coordination and presentation fragmentation checks as
  package-self-pressure heuristics rather than shared semantic evaluators.
- `WorldFrame` is now split internally into `WorldTargeting` and
  `ExecutionPosture`, and answer/wire adapters now spend those slices
  internally, but the public query and wire carriers still flatten them for
  compatibility.
- Capability and inquiry catalogs now hold explicit `ReadModeFamilies`
  internally, but their public discovery/read surfaces still flatten back to
  `readModes` for compatibility.
- `resolveInquiryPolicy` is now presentation-only and ingress option types are
  narrowed, but `Inquiry.readMode`, host render/query arg types, CLI parsing,
  and public host compatibility exports still carry the broad `ReadMode` union.
- The `snapshot-maintenance` inquiry family now has explicit planner intents,
  but the catalog/discovery layer still exposes one compatibility family that
  mixes session-maintenance and payload/materialization concerns.

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
- `src/public/inquiry.ts`
- `src/host/types.ts`
- `src/public/host.ts`
- `src/cli-hosted.ts`
- `test/inquiry-model.test.ts`
- `test/answer-renderer.test.ts`
- `test/inquiry-wire.test.ts`
- `test/host-runtime.test.ts`
- `test/inquiry-ingress.test.ts`

## Verification reminders

- Run `pnpm preflight` before non-trivial work.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build`.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build:tests`.
- Re-run `node ./out-test/test/inquiry-model.test.js`.
- Re-run `node ./out-test/test/answer-renderer.test.js`.
- Re-run `node ./out-test/test/inquiry-ingress.test.js`.
- Re-run `node ./out-test/test/inquiry-wire.test.js`.
- Re-run `node ./out-test/test/host-runtime.test.js`.
- Re-run `node ./out-test/test/workspace-authority.test.js`.
- Re-run `node ./out-test/test/navigation.test.js`.
- Re-run `node ./out-test/test/route-witness.test.js`.
- Re-run `node ./out-test/test/audit.test.js`.

## Resume command

`pnpm --filter @aurelia-ls/source-analysis preflight`
