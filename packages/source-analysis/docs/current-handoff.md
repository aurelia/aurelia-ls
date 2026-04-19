# Current Handoff

Last updated: 2026-04-18

## Current objective

Aggressively replace the current natural-language and heuristic machine-facing
API shell with typed semantic primitives so steering no longer depends on
question routing, family ranking, or conversational ingress.

## Exact next slice

1. Treat [src/protocol-read-kernel.ts](../src/protocol-read-kernel.ts)
   as the current derivation-first center for machine-facing protocol work.
2. Treat the repo-owned packet set under
   [../fixtures/protocol-derivation/README.md](../fixtures/protocol-derivation/README.md)
   as the current derivation substrate for protocol pressure tests.
3. Keep workbook derivation single-path and fixture-driven:
   if a fixture is Aurelia-shaped, Aurelia semantics should auto-detect rather
   than being modeled as a separate TypeScript pass and Aurelia pass.
4. Flesh out concepts, invariants, and authority-law boundaries from the
   kernel and packet set before freezing more specific feature surfaces.
5. Treat the new Aurelia export-lens grounding under
   [docs/aurelia/export-semantic-surface-ledger.yaml](./aurelia/export-semantic-surface-ledger.yaml)
   and [docs/aurelia/atlas/README.md](./aurelia/atlas/README.md)
   as active derivation aids for fixture planning and protocol pressure tests,
   not as frozen framework contract.
6. Use that grounding plus the current packet set to derive workbook scenarios
   and invariants before freezing export-facing Aurelia request/response shapes.
7. For the near-term operational Aurelia slice, use
   [docs/aurelia/framework-export-integration-plan.md](./aurelia/framework-export-integration-plan.md)
   as the concrete plan for classifying the full Aurelia framework export
   surface.
8. Prefer a thin export-classification authority over a richer protocol if
   that trade keeps the first framework-wide integration slice honest and
   complete.
9. Keep treating the historical `deps` / `typerefs` / `exports` query scripts
   as retirement candidates rather than architecture to preserve.
10. Finish moving current-query boot paths onto the live query kernel in
   `src/live-query/`; `deps` is live by default now, `exports` and `typerefs`
   still need the same reset.
11. Keep useful command intent, but keep shrinking the giant query-local
   indexes/renderers into thin adapters over shared live runtime/evaluator
   surfaces.
12. When adding new focused lenses, keep canonical records plain, keep
    derivation explicit, and use repo-owned lens charters before widening the
    evaluator ceiling or projection shape.
13. Only after the legacy triple no longer dominates current-query work should
   framework-world and registration evidence become the next major primitive
   family.

## Recently landed

- Added a standalone read/adjudicate protocol kernel in
  [src/protocol-read-kernel.ts](../src/protocol-read-kernel.ts)
  and dropped the broader `protocol-kernel.ts` sketch instead of keeping two
  competing protocol centers.
- Recorded the decision to work derivation-first from that narrow kernel
  toward more specific features, with protocol concepts and invariants taking
  priority over adapter or command-surface expansion.
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
- Added a local `docs/aurelia/` grounding set so future framework-aware work in
  this package can start from a repo-owned owner-ingress/compile-time-DI
  direction instead of relying on Atlas or older compiler-local semantics
  during implementation.
- Expanded that local grounding set with declaration-world, resource-family,
  and current-world construction notes so compiler-facing Aurelia work can
  start from a repo-owned world-formation model instead of reconstructing one
  from Atlas on every pass.
- Added a repo-owned local Atlas excerpt bundle under
  [docs/aurelia/atlas/README.md](./aurelia/atlas/README.md)
  plus an initial
  [docs/aurelia/export-semantic-surface-ledger.yaml](./aurelia/export-semantic-surface-ledger.yaml)
  so export-addressable Aurelia semantics can be pressure-tested locally
  without hard-coded non-local references.
- That new Aurelia export-lens material is still explicit work-in-progress for
  protocol and fixture derivation; it should pressure-test the kernel and
  guide fixture choice before it hardens into more public framework-facing
  surfaces.
- Added
  [docs/aurelia/framework-export-integration-plan.md](./aurelia/framework-export-integration-plan.md)
  to capture the near-term operational plan for pointing `source-analysis` at
  the Aurelia framework repo and classifying the full export surface with a
  deliberately thin answer contract.
- Added a first repo-owned Aurelia framework export golden harness under
  [../fixtures/aurelia-framework-exports/README.md](../fixtures/aurelia-framework-exports/README.md)
  plus a generator script and focused Node test so the package can now
  normalize and deep-compare the full export surface of the in-repo `aurelia`
  submodule package-by-package.
- Added repo-owned modeling laws in
  [modeling-laws.md](./modeling-laws.md) and an Aurelia lens charter in
  [aurelia/di-and-registration-lens-charter.md](./aurelia/di-and-registration-lens-charter.md)
  so current and future Aurelia lenses have an explicit rule set for canonical
  records, evaluators, projections, cost ceilings, and focused golden layout.
- Added a repo-owned protocol derivation packet set under
  [../fixtures/protocol-derivation/README.md](../fixtures/protocol-derivation/README.md)
  with concrete export-lens fixtures, scenario packets, and mutation-backed
  states for `open`, `withdrawn`, and world-role `no-claim` pressure.
- The derivation workbook now treats Aurelia semantics as auto-detected from
  the fixture when present; protocol derivation should no longer be modeled as
  separate TypeScript and Aurelia passes in the main workbook.
- Added `docs/machine-legible-api-reset.md` and redirected the active campaign
  state around removing the current natural-language/heuristic API shell in
  favor of typed semantic primitives.
- Removed the primary hosted natural-language command shell:
  `ask.question`, `plan.question`, `plan.inquiry`, `describe.capabilities`,
  `describe.inquiries`, and `repair.command` no longer exist on the active
  host dispatch surface.
- Added direct hosted primitives for package/type/export resolution plus
  symbol lookup and focused file inspection, and rewired the hosted CLI around
  direct `resolve`, `lookup`, `inspect`, and explicit `query` topics.
- Added direct hosted primitives for structural package-surface inspection,
  package reachability inspection, and package-bounded export tracing, and
  wired the hosted CLI `inspect` surface onto those explicit carriers.
- Added direct hosted primitives for shared package audit signals plus file-
  and type-bounded route evidence, and wired the hosted CLI `inspect` surface
  onto those explicit carriers instead of requiring package-audit or
  route-witness answers to reach the substrate.
- Added direct hosted primitives for package context, file context, and type
  context, and exposed shared navigation inspection helpers so those direct
  carriers plus `query.navigate` now spend the same lower-level
  package/file/type adjudication paths instead of maintaining separate host-
  local truth assembly.
- Added an initial `src/live-query/` kernel scaffold that can open the current
  workspace, build the structural runtime once, and materialize current
  deps/typerefs/exports outputs plus `AnalysisViews` without going through the
  snapshot boot path.
- Added a repo-owned retirement note for the old `deps` / `typerefs` /
  `exports` split-brain surface and linked it from the main package docs.
- Rebased `src/deps/query.ts` onto the live query kernel by default so
  current `pnpm source-analysis deps ...` calls no longer require snapshot
  materialization unless `--file` is passed explicitly.
- Added `test/deps-query.test.ts` to pin that the top-level deps CLI works
  against a repo with no `.source-analysis/snapshots/` directory and that
  `stale` explains live mode instead of demanding refresh.
- Moved `route-witness` file/type inspection onto explicit shared helpers so
  the compatibility answer and the direct `query.file.route` /
  `query.type.route` primitives now spend the same lower-level route-target
  inspection path instead of maintaining parallel host-local logic.
- Moved package-audit package/surface/reachability/shared-signal inspection
  onto an explicit shared helper so the compatibility answer and direct
  `query.package.audit-signals` primitive now spend the same package-audit
  target adjudication path.
- Removed the public `./inquiry` subpath and deleted the now-dead capability /
  inquiry ingress, catalog, and ingress-recognition modules instead of
  preserving them as dormant compatibility baggage.

## Constraints

- Do not solve semantic ambiguity by adding more alias, noun, verb, or example
  matching to the ingress layer.
- Do not preserve conversational ingress or heuristic question routing as the
  machine-facing center of gravity of the package.
- Do not grow `query.deps.*`, `query.typerefs.*`, or `query.exports.*` into a
  larger architectural family. Treat them as legacy compatibility shims.
- Prefer shared authority or evaluator surfaces over direct
  `analysis.deps` / `analysis.typeRefs` / `analysis.exports` stitching.
- Keep no-claim and blocked outcomes explicit rather than weakening everything
  into a fuzzy positive answer.

## Loose threads intentionally left open

- `AnalysisViews` still carries the historical projection triple and remains a
  major continuity seam.
- `src/exports/query.ts` and `src/typerefs/query.ts` still boot from snapshot
  resolution even though a live kernel now exists under `src/live-query/`.
- `src/deps/query.ts` now loads live current state by default, but it still
  owns a large local index/render layer that should keep shrinking toward a
  thin adapter.
- The hosted/public API no longer depends on the conversational ingress shell,
  but several answer-bearing compatibility queries still aggregate too much
  semantic work behind broad labels.
- Package surface, package reachability, and export tracing are now directly
  machine-queryable, package/file/type context is now directly
  machine-queryable, and shared package audit signals plus file/type route
  evidence are now directly machine-queryable too, but `query.navigate`,
  `query.route.witness`, and `query.audit.package` still expose broad
  answer-local coordination that should keep shrinking.
- `query.navigate` now shares package/file/type inspection helpers with the
  direct context primitives and shares export adjudication with the direct
  export-trace path, but it still remains an answer-bearing compatibility
  surface instead of a thin optional presentation layer.
- `query.route.witness` and `query.audit.package` now reuse the same lower-
  level inspection helpers as the direct primitives, but they still remain
  answer-bearing compatibility surfaces rather than fully decomposed machine
  carriers.
- `claim-lattice.ts` is promising, but it is not yet clearly the persistent
  authority runtime consulted by all live query surfaces.
- `inquiry-model.ts` still overloads routes, read modes, focus kinds,
  provenance kinds, and execution posture.
- The new Aurelia export semantic surface ledger is useful grounding, but it is
  still provisional and needs fixture pressure before it should steer public
  framework-facing request or response names.
- The repo-owned fixture matrix now exists, but the next real value comes from
  filling derivations and invariants from those packets rather than expanding
  packet count indefinitely.
- `route-witness` and `audit` still describe freshness in terms of the legacy
  projections rather than a named shared route/reachability authority.
- `query.navigate`, `route-witness`, and `audit` still describe freshness in
  terms of legacy projection labels even though metadata packaging has started
  to converge behind shared helpers.
- `audit` still owns coordination and presentation fragmentation checks as
  package-self-pressure heuristics rather than shared semantic evaluators.
- `query.navigate` is now the broadest remaining compatibility shell and the
  likeliest next target for further decomposition now that its package/file/
  type branches share direct context helpers.
- The command-level reset now has two centers in tension: the newer live host
  runtime and the older snapshot-first `deps` / `typerefs` / `exports` CLI
  scripts. The next pass should reduce that split rather than document around
  it.
- `WorldFrame` is now split internally into `WorldTargeting` and
  `ExecutionPosture`, and answer/wire adapters now spend those slices
  internally, but the public query and wire carriers still flatten them for
  compatibility.
- `resolveInquiryPolicy` is now presentation-only, but host render/query arg
  types, CLI parsing, and some compatibility query surfaces still carry the
  broad `ReadMode` union.
- Snapshot/materialization/session maintenance are now directly reachable, but
  the remaining compatibility read surfaces still flatten multiple concerns
  into a single host vocabulary.

## Likely files for the next pass

- `src/inquiry-model.ts`
- `src/host/runtime.ts`
- `src/host/types.ts`
- `src/public/host.ts`
- `src/cli.ts`
- `src/cli-hosted.ts`
- `src/live-query/contracts.ts`
- `src/live-query/runtime.ts`
- `src/navigation.ts`
- `src/authority/workspace-authority.ts`
- `src/deps/query.ts`
- `src/typerefs/query.ts`
- `src/exports/query.ts`
- `test/deps-query.test.ts`
- `src/export-trace-runtime-surface.ts`
- `src/reachability.ts`
- `src/structural-source-file-surface.ts`
- `src/structural-declaration-surface.ts`
- `src/focused-file-query.ts`
- `src/package-audit-evaluator.ts`
- `src/route-witness.ts`
- `src/audit.ts`
- `src/inquiry-policy.ts`
- `src/inquiry-wire.ts`
- `src/answer-envelope.ts`
- `src/outcome-algebra.ts`
- `src/analysis-surface.ts`
- `docs/aurelia/README.md`
- `docs/aurelia/export-semantic-surface-ledger.yaml`
- `docs/aurelia/atlas/README.md`
- `docs/protocol-derivation-workbook.md`
- `fixtures/protocol-derivation/README.md`
- `fixtures/protocol-derivation/manifest.yaml`
- `fixtures/protocol-derivation/schema.yaml`
- `test/inquiry-model.test.ts`
- `test/answer-renderer.test.ts`
- `test/inquiry-wire.test.ts`
- `test/host-runtime.test.ts`
- `test/cli.test.ts`
- `test/public-api.test.ts`
- `test/audit.test.ts`

## Verification reminders

- Run `pnpm preflight` before non-trivial work.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build`.
- Re-run `pnpm --filter @aurelia-ls/source-analysis build:tests`.
- Re-run `node ./out-test/test/inquiry-model.test.js`.
- Re-run `node ./out-test/test/answer-renderer.test.js`.
- Re-run `node ./out-test/test/inquiry-wire.test.js`.
- Re-run `node ./out-test/test/host-runtime.test.js`.
- Re-run `node ./out-test/test/cli.test.js`.
- Re-run `node ./out-test/test/public-api.test.js`.
- Re-run `node ./out-test/test/workspace-authority.test.js`.
- Re-run `node ./out-test/test/navigation.test.js`.
- Re-run `node ./out-test/test/route-witness.test.js`.
- Re-run `node ./out-test/test/audit.test.js`.

## Resume command

`pnpm --filter @aurelia-ls/source-analysis preflight`
