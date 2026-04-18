# Decision Log

Append-only. Add new entries at the bottom so future sessions can read the
decision trail in order.

## 2026-04-18 - Authority-first campaign established

- Continuity for long-running work must live in repo files, not in chat memory.
- `deps`, `typerefs`, and `exports` are legacy projections and compatibility
  contracts, not the durable semantic axes of the package.
- New semantic capability work should land in shared authority, semantic, or
  evaluator layers first, then materialize outward only when a stable
  projection is genuinely needed.
- Natural-language ingress and ranking remain edge adapters only. They should
  not absorb semantic ambiguity that belongs in typed locators, candidate sets,
  narrowing axes, or authority adjudication.
- Future autonomous sessions should continue only the first `in_progress` step
  in `current-state.json` unless the operator explicitly redirects the work.

## 2026-04-18 - Initial authority contracts and navigation seam

- The first shared authority contracts now live under `src/authority/`.
- `query.navigate` should enter through a named authority adapter from the host
  side instead of receiving raw `AnalysisViews` directly.
- The current authority adapter is explicitly transitional and is allowed to
  read the legacy projection bundle, but it should shrink over time rather than
  become a second hidden architecture center.
- The next slice should deepen the navigation vertical slice before moving on to
  `route-witness` or `audit`.

## 2026-04-18 - Navigation now spends authority-backed evaluator seams

- `query.navigate` now spends authority-backed seams for focused analyzability,
  file localization, symbol localization, and structural owning-package
  resolution.
- Those new authority methods should remain thin delegations into shared
  evaluator modules such as `analyzability-posture`, `focused-file-query`,
  `structural-declaration-surface`, and `structural-source-file-surface`; do
  not clone their logic into multiple query surfaces.
- The next migration target is `route-witness`, followed by `audit`, using the
  same evaluator-backed seams rather than new legacy-projection joins.

## 2026-04-18 - Route-witness and audit now enter through the shared authority seam

- `route-witness` file/type localization and regime classification now spend
  the same authority-backed seam as navigation.
- `audit` package adjudication and regime classification now spend that same
  authority seam before finding collection begins.
- The next pressure point is no longer entry-path ambiguity. It is the deeper
  route/reachability and package-surface construction that still happens
  directly against `AnalysisViews`.

## 2026-04-18 - Workspace authority now owns package surface and reachability setup

- The shared authority seam now owns structural package-surface lookup,
  package-reachability construction, and route-witness retrieval.
- `route-witness` and `audit` should spend those shared package surfaces rather
  than constructing them locally.
- Snapshot provenance/freshness packaging has started to converge through
  `analysis-metadata-support.ts`, but navigation still needs the same cleanup.
- The authority file was renamed from `navigation-authority.ts` to
  `workspace-authority.ts` because it now serves multiple query families.

## 2026-04-18 - Route and audit migration completed

- Package route/reachability/blindspot diagnostics now live behind the shared
  `package-audit-evaluator.ts` seam instead of remaining embedded inside
  `audit.ts`.
- Coordination and presentation fragmentation checks intentionally remain
  audit-local for now because they are still package-self-pressure heuristics
  about answer construction, not shared semantic truth.
- `navigation.ts` now spends `analysis-metadata-support.ts` for snapshot
  provenance/metadata packaging so legacy projection metadata reads continue to
  converge behind one helper.
- The `route-and-audit-migration` campaign step is now considered complete.
- The next campaign step is the inquiry-ontology split, with pressure centered
  on `inquiry-model.ts` and the broad unions consumed by policy, catalogs, and
  answer envelopes.

## 2026-04-18 - Inquiry ontology split started through policy and provenance seams

- Structured answer policy now spends presentation read modes only; payload
  mode is no longer treated as a peer of answer presentation inside render
  policy or structured answer envelopes.
- Policy and catalog focus contracts now spend `PolicyFocusKind` instead of the
  full `FocusKind` union, leaving evidence-only focus kinds out of that
  high-fanout internal seam.
- Inquiry provenance entries now split explicitly into carrier (`snapshot` /
  `host`) and evidence (`substrate` / `claim` / `route`) families, and the
  shared analysis metadata helpers now return carrier provenance directly.
- Capability and inquiry ingress answers now normalize payload-mode requests
  back onto presentation policy for structured answers, with a local TODO to
  replace that coercion with a first-class higher-order materialization surface
  later.
- The remaining ontology pressure is now centered on route-family planning and
  `WorldFrame` posture/targeting overload, not on presentation-mode or
  provenance family confusion.

## 2026-04-18 - Route families and world-frame slices now have shared contracts

- Capability and inquiry catalog definitions now record cognitive versus
  maintenance route families explicitly, then flatten them only for
  compatibility views and ingress matching.
- Shared inquiry-model helpers now expose `WorldTargeting`,
  `ExecutionPosture`, `composeWorldFrame(...)`, and extractors so high-fanout
  runtime/planning code can stop rebuilding those slices locally.
- `analysis-surface`, `analysis-metadata-support`, host runtime world-frame
  construction, and navigation/audit/route-witness freshness/target reads now
  spend those shared targeting/posture helpers.
- The remaining ontology pressure is now in the still-broad outer carriers:
  continuation routing, delta reread floors, and the flattened `WorldFrame`
  that still travels through answer/wire payloads for compatibility.

## 2026-04-18 - Continuation and wire adapters now spend split route and world slices

- Shared `QuestionRouteSelection` helpers now carry cognitive versus
  maintenance route family information for concrete route targets.
- Continuations now preserve typed route selections internally while still
  exposing the flattened `targetQuestionRoute` field as a compatibility
  carrier on the outcome surface.
- `inquiry-wire.ts` now accepts split continuation-basis and delta sources so
  `answer-envelope.ts` can flatten `QuestionRouteSelection`,
  `WorldTargeting`, and `ExecutionPosture` only at the wire payload boundary.
- The remaining ontology pressure is now centered on the broad public query and
  policy carriers (`QuestionRoute`, `WorldFrame`, and `ReadMode`) rather than
  on the newer continuation/delta/wire adapters.

## 2026-04-18 - Read-mode families now live in the model and policy is presentation-only

- Shared `ReadModeFamilies`, `createReadModeFamilies(...)`, and
  `flattenReadModeFamilies(...)` now give read-mode splitting an explicit
  ontology instead of treating `snapshot` as just another rendering label.
- Capability and inquiry catalogs now store read-mode families internally and
  flatten back to `readModes` only for compatibility views exposed at ingress.
- `resolveInquiryPolicy(...)` now accepts presentation-only policy input; broad
  `ReadMode` coercion moved into explicit adapter seams such as
  `createPresentationPolicyInput(...)` and `resolvePresentationReadMode(...)`.
- The remaining read-mode pressure is now at the public compatibility
  carriers: `Inquiry.readMode`, ingress option types, host render/query args,
  and the still-mixed `snapshot-maintenance` inquiry family.

## 2026-04-18 - Ingress internals now speak presentation-only reads and snapshot maintenance has explicit planner intent

- `CapabilityIngress` and `InquiryIngress` option contracts now accept
  `PresentationReadMode` instead of the broad `ReadMode` union, so payload
  materialization no longer masquerades as a valid internal rendering peer.
- Hosted runtime entrypoints now normalize broad host-side `ReadMode` values at
  the outer boundary before they call discovery, planning, repair, audit,
  route-witness, or navigation answer builders.
- The `snapshot-maintenance` planner now resolves explicit maintenance intent
  (`inspect-session`, `refresh-session`, `invalidate-session`,
  `materialize-snapshots`) so session-state moves and snapshot export stop
  sharing one ad hoc branch even though the catalog still exposes one
  compatibility family label.
- The remaining pressure is now centered on the broad public carriers and
  discovery labels themselves: `Inquiry.readMode`, `HostRenderOptions`,
  CLI `--read-mode`, and whether `snapshot-maintenance` should remain a
  compatibility family or split into narrower discovery-facing labels.

## 2026-04-18 - Local Aurelia grounding docs established

- `packages/source-analysis` now owns a local distilled Aurelia grounding set
  under `docs/aurelia/` instead of relying on Atlas or legacy compiler-local
  semantics alone to preserve direction.
- Framework owner-surface ingress remains identity-focused. It owns exact
  owner/package/export/member/face grounding and its honest closure classes,
  not DI consequence, admissibility closure, or corridor-local meaning.
- Compile-time DI is modeled locally as a qualified container-state carrier
  above owner grounding and below evaluator/product routing, with stable axes
  such as world anchor, key family, resolver strategy, stage, transition,
  qualification, analyzability, witness, and completeness posture.
- Registration-world constructors are first-class static-analysis burden above
  kernel primitives. They should be modeled as real framework truth rather
  than convenience wrappers or opaque side channels.
- Future framework-aware work in this package should preserve separate proof
  classes for positive grounding, wrong-surface or wrong-member admissibility
  sentinels, unresolved cases, and honest open/runtime-only outcomes.

## 2026-04-18 - Local declaration-world and current-world construction grounding added

- The local Aurelia grounding set now explicitly includes declaration-world,
  resource-family, and current-world construction notes instead of treating the
  framework burden as only owner-ingress plus compile-time DI.
- The package should model the Aurelia resource world as a constructed
  declaration world with distinct `recognized`, `admissible`, and
  `current-world active` states.
- Resource families, carrier families, ontology roles, registration paths,
  consultation roles, lookup regimes, and timing profiles are now treated as
  first-class local grounding vocabulary for compiler work.
- Current-world construction should stay question-bounded and boundary-aware:
  build the smallest honest searched world, widen only on evidence, and keep
  boundary pressure explicit instead of bluffing dependency-graph closure.
- Runtime-world formation remains a later neighboring slice. Framework-aware
  compiler work in this package should not collapse declaration-world
  construction into runtime-world semantics prematurely.
