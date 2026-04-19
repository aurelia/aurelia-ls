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

## 2026-04-18 - Primitive machine-legible API reset declared

- The operator clarified that `source-analysis` was never meant to become a
  natural-language AI conversation surface.
- The intended target is a machine-legible semantic inquiry API whose durable
  commitments are answer algebra, result kinds, miss-path honesty,
  governing-anchor jump, and continuation basis over one truth core.
- The current conversational shell (`ask.question`, `plan.question`,
  `describe.*`, `repair.command`, capability/inquiry ingress catalogs, and
  noun/verb/alias/confusion ranking) is now treated as architectural drift to
  remove, not a surface to refine.
- The package is not considered directionally back on track until those
  natural-language and heuristic paths are gone from the primary API and
  replaced by typed semantic primitives.

## 2026-04-18 - Read/adjudicate protocol kernel adopted as the derivation-first center

- The protocol work now derives outward from a narrow read/adjudicate kernel
  instead of trying to freeze one broad cross-surface protocol up front.
- The new center is [src/protocol-read-kernel.ts](../src/protocol-read-kernel.ts),
  which keeps request, adjudication, and result separate while treating typed
  continuations as part of the answer law.
- The earlier broader `protocol-kernel.ts` sketch was removed rather than kept
  as a competing center of gravity.
- Near-term protocol work should flesh out concepts, invariants, and authority
  law first, then derive more specific features and adapters from that kernel.
- Session control, materialization, authoring, and other neighboring action
  laws remain intentionally outside this kernel for now.

## 2026-04-18 - Protocol derivation now starts from repo-owned fixtures and one authority path

- The repo-owned packet set under
  [../fixtures/protocol-derivation/README.md](../fixtures/protocol-derivation/README.md)
  is now the primary derivation substrate for protocol pressure tests.
- If a fixture is Aurelia-shaped, Aurelia semantics should auto-detect and be
  spent by one authority path. The main workbook should not model derivation as
  separate TypeScript and Aurelia passes.
- If a derivation needs to show what the framework layer added, it should do so
  through auto-detected semantic layers, consulted world, basis, provenance,
  and continuations rather than a second pass.
- The next value is in filling derivations and invariants from the packet set,
  not in expanding the packet count indefinitely.

## 2026-04-18 - Aurelia framework export integration should start with a thin slice

- The near-term operational Aurelia target is to point `source-analysis` at
  the Aurelia framework repo and classify the full export surface honestly.
- For that first slice, broader framework coverage is more important than a
  richer public protocol surface.
- Continuations, current-world activity, and other richer answer-law features
  may be deferred if doing so allows the first framework-wide export
  classification pass to stay thin, deterministic, and complete.
- The concrete planning note for that slice is
  [docs/aurelia/framework-export-integration-plan.md](./aurelia/framework-export-integration-plan.md).

## 2026-04-18 - Aurelia framework export pressure now has a thin golden harness

- The first broad-coverage framework integration harness is now package-level
  export goldens over the in-repo `aurelia` submodule, not a large generated
  TypeScript spec file.
- The current golden row shape is intentionally tiny and TypeScript/export
  centered. It does not yet try to freeze richer protocol concepts like
  continuation law or current-world activity.
- Generator and comparison should now evolve from this rule:
  keep coverage broad, keep the row shape small, and only expand the model
  when the current golden surface stops being enough to steer the next slice.

## 2026-04-18 - Primary hosted NL shell removed and replaced with direct primitives

- The hosted runtime no longer dispatches `ask.question`, `plan.question`,
  `plan.inquiry`, `describe.capabilities`, `describe.inquiries`, or
  `repair.command`.
- The primary machine-facing host now exposes direct authority-backed
  primitives for package/type/export resolution plus symbol lookup and focused
  file inspection.
- The hosted CLI now mirrors those direct primitives (`resolve`, `lookup`,
  `inspect`, and direct `query` topics) instead of translating prose
  questions.
- The public `./inquiry` subpath is gone, and the dead capability/inquiry
  ingress, catalog, and ingress-recognition modules were deleted instead of
  being kept as dormant compatibility baggage.
- Structured answer-bearing surfaces such as `query.navigate`,
  `query.route.witness`, and `query.audit.package` remain temporarily, but
  they are now explicit compatibility queries sitting beside the new primitive
  path rather than defining the package center of gravity.

## 2026-04-18 - Package surface, reachability, and export-trace primitives promoted

- The hosted runtime now exposes direct machine-facing primitives for
  structural package-surface inspection, package reachability inspection, and
  package-bounded export tracing.
- The workspace authority grew a package-local export adjudication path so
  export tracing no longer needs to start from the broad global
  `query.export.resolve` ambiguity set when the caller already knows the
  package boundary.
- The hosted CLI `inspect` surface now maps directly onto these new carriers:
  `package-surface`, `package-reachability`, and `export-trace`.
- This slice intentionally keeps `query.navigate`, `query.route.witness`, and
  `query.audit.package` alive as compatibility answers, but it narrows their
  monopoly over package/file route semantics by making the lower-level
  substrates directly queryable.

## 2026-04-18 - Shared audit signals and file/type route evidence promoted

- The hosted runtime now exposes direct machine-facing primitives for shared
  package audit signals plus file-bounded and type-bounded route evidence.
- `query.package.audit-signals` reaches the shared package-audit evaluator
  seam directly instead of requiring the broad `query.audit.package` answer
  surface just to inspect blindspots, dormant files, candidate roots, or
  other evaluator signals.
- `query.file.route` and `query.type.route` now expose focused file/type route
  evidence directly, including route witnesses and regime context, instead of
  forcing callers through the answer-shaped `query.route.witness` surface.
- The hosted CLI `inspect` surface now maps directly onto these carriers:
  `package-audit-signals`, `file-route`, and `type-route`.
- This slice further narrows the compatibility monopoly of
  `query.route.witness` and `query.audit.package`, and it makes the next
  primitive step clearer: framework-world and registration evidence rather
  than more general-purpose answer wrappers.

## 2026-04-18 - Route/audit compatibility answers converged on shared inspection helpers

- `route-witness` now exposes shared file/type route-target inspection helpers,
  and both the compatibility answer surface plus the direct
  `query.file.route` / `query.type.route` primitives spend those helpers
  instead of maintaining parallel host-local package/file/type route logic.
- `audit` now exposes a shared package-audit target inspection helper, and
  both the compatibility answer surface plus the direct
  `query.package.audit-signals` primitive spend the same package-resolution,
  regime, structural-surface, reachability, and shared-signal adjudication
  path.
- Host-runtime coverage now explicitly pins that the shared signal codes seen
  by `query.package.audit-signals` also appear in `query.audit.package`, and
  that `query.route.witness` returns the same witness set as the matching
  `query.file.route` primitive for the same focus.
- This does not finish the compatibility cleanup, but it reduces truth-owner
  duplication and leaves `query.navigate` as the most obvious remaining broad
  compatibility shell to decompose before moving deeper into framework-world
  primitives.

## 2026-04-18 - Package/file/type context primitives promoted and navigation converged on them

- The hosted runtime now exposes direct machine-facing context carriers for
  package, file, and type navigation facts through `query.package.context`,
  `query.file.context`, and `query.type.context`.
- `navigation.ts` now exports shared package/type/file inspection helpers, and
  `query.navigate` spends those same helpers for its package, file, and type
  answer branches instead of re-deriving that truth through answer-local host
  logic.
- The export branch also now spends a shared export-navigation inspection
  helper, and the direct `query.export.trace` host primitive reuses that
  helper when the global export resolution already closes on the same package.
- The hosted CLI `inspect` surface now exposes `package-context`,
  `file-context`, and `type-context`, so callers can ask for those raw facts
  without entering the broad `query.navigate` answer shell.
- This leaves `query.navigate` thinner and more honestly compatibility-shaped:
  symbol localization still closes through `query.symbol.lookup`, export
  routing already has a direct trace primitive, and the broad shell is losing
  reasons to exist as a truth owner.

## 2026-04-18 - Deps / typerefs / exports reset moved from rhetoric to concrete retirement work

- We explicitly stopped treating the historical `deps` / `typerefs` /
  `exports` query scripts as a surface to keep rationalizing.
- A new live kernel now exists in `src/live-query/` as the cleaner center of
  gravity for current-query bootstrapping over repo session, tsconfig scan,
  structural runtime, and live deps/typerefs/exports materialization.
- The historical query scripts now carry local TODOs marking them as
  retirement candidates to be rewritten as thin adapters over that live
  kernel.
- A repo-owned reset note now records the stronger direction:
  snapshot materialization may remain as an optional artifact, but it should
  not remain the default substrate for current queries.

## 2026-04-18 - Deps query now defaults to live current-state analysis

- `src/deps/query.ts` no longer resolves the current snapshot path by default.
  It now boots from `src/live-query/` unless `--file` is passed explicitly.
- `--file` remains the explicit materialized/offline inspection mode for deps;
  refresh/materialization is no longer a hidden prerequisite for current deps
  questions.
- `stale` now explains live mode when the caller is querying current state
  directly instead of pretending a missing snapshot is the default failure
  mode.
- This is intentionally only the first query-script reset. `src/exports/query.ts`
  and `src/typerefs/query.ts` still need the same migration, and the giant
  query-local evaluators/renderers remain active debt even after the loader
  path moves.

## 2026-04-19 - Modeling laws and Aurelia lens charters now govern focused semantic slices

- Canonical records should stay plain data; derived facts should live in
  explicit evaluators or projections instead of hidden getters or constructor
  work.
- No canonical field should survive if it is mechanically derivable from other
  canonical fields in the same record without answering a distinct semantic
  burden.
- Focused lenses should now be chartered explicitly before they widen scope:
  subject, burden, canonical carrier, evaluator ceiling, load-bearing coverage,
  cost rules, and golden layout should be written down first.
- The first concrete operationalization of that rule is the Aurelia
  DI-interface and registration-effect charter under
  [docs/aurelia/di-and-registration-lens-charter.md](./aurelia/di-and-registration-lens-charter.md).
- Shared Aurelia lenses should reuse one live analysis context when possible
  instead of reopening the same repo/session/outputs in parallel.
