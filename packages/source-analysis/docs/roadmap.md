# Roadmap

This is a working roadmap for getting `source-analysis` from its current transitional shape toward the layered system described in the README and seed docs.

It is not meant to freeze the design. It is meant to:

- keep long-running autonomous refactors pointed at the same north star
- make compaction-safe continuation easier
- keep open tensions visible instead of letting them hide inside local cleanup work
- mark where operator steering is actually required

## Working North Star

The target shape is:

1. Structural substrate
   Live, shared claims about packages, files, imports, exports, declarations, and relations.

2. Semantic analysis kernel
   Shared checker-backed semantic claims and evaluators over symbols, exports, aliases, declarations, references, control flow, data flow, and abstract interpretation.

3. Evaluators
   Shared logic that spends structural and semantic claims to classify analyzability, explain blockers, trace routes, and recover deeper structure.

4. Derived projections and caches
   Optional materializations derived from the live layers when they genuinely help with performance, interchange, or debugging, not the place where live inquiry logic owns the model.

5. Inquiry surface
   A truthful, AI-usable read surface that can discover what is askable, answer it, explain misses, and suggest continuations.

6. Semantic adapters
   Aurelia-aware meaning on top of the shared substrate and evaluator layer rather than mixed into the core too early.

## Current Pressure

The main recurring pressures right now are:

- dependency, export, type, and package reasoning are still partly split between shared structural surfaces and legacy compatibility carriers
- the AI still has to read too much raw source during inquiry-oriented work, which means the read surface and semantic layer are not strong enough yet
- the inquiry ontology still overloads routes, read modes, focus kinds, provenance kinds, and world-frame posture in one model file
- the `exports` compatibility surface still owns too much semantic reasoning locally
- the new Aurelia export-lens grounding is promising, but it is still
  work-in-progress derivation material and needs fixture pressure before it
  should harden into public framework-facing ontology
- the repo-owned fixture matrix now exists, but the next value is in
  deriving invariants and answer-shape pressure from it, not just adding more
  fixtures
- self-analysis still shows a 6-directory SCC across `src`, `deps`, `exports`, `host`, `public`, and `typerefs`
- `FocusKind` remains a type hub, which is a good smell for ontology gravity leaking too widely
- the architecture still carries too much visible identity from `deps`, `typerefs`, and `exports` as if they were durable peers rather than transitional projections

## Tracks

### Track 1: Finish moving live inquiry onto shared structural and evaluator surfaces

Goal:
Live inquiry should spend shared structural and semantic surfaces directly, with any materialization remaining secondary to the live center of gravity.

Done so far:

- file identity and package ownership moved onto the structural source-file surface
- blindspot files became explicit structural blindspots instead of snapshot-derived pseudo-truth
- dependency reasoning for reachability and file navigation now goes through a shared dependency surface
- internal declaration-localization questions can now spend a live structural declaration surface instead of forcing raw source reads for symbol implementation lookup

Next:

- move more package-level and route-level reasoning off direct `deps`/`exports`/`typerefs` field reads and onto named shared surfaces
- reduce ad hoc joins inside `audit`, `navigation`, and `route-witness`
- keep replacing “query logic over historical projection tables” with “query logic over shared substrate/evaluator APIs”
- keep shrinking `AnalysisViews` as a passive bundle of raw projection-owned payload types when a narrower shared contract would be more honest
- keep making the package feel like one intelligent system with projections, not three historical tools plus glue

Exit condition:

- live inquiry answers remain truthful even if an older derived payload is sparse, reordered, or locally stale
- query surfaces read named shared layers rather than directly stitching historical projection tables together

### Track 2: Build the dedicated semantic analysis kernel

Goal:
Grow a dedicated checker-backed semantic module family that can power export, symbol, flow, and abstract interpretation questions directly.

Current anchors:

- [docs/semantic-analysis.md](./semantic-analysis.md)
- [exports/analyze.ts](../src/exports/analyze.ts)

Next:

- establish a dedicated semantic module family, likely under `src/semantic/`
- keep extracting shared export/alias/symbol-face reasoning out of `exports/analyze.ts`
- let more inquiry surfaces and snapshot-only readers spend the shared export trace surface directly instead of falling back to historical export-record chain carriers
- add semantic symbol and declaration surfaces that live inquiry can consume directly
- treat repeated raw source reading by the AI as evidence that semantic inquiry is still missing a capability
- make analyzer ceilings explicit when a question crosses from static semantic recovery into genuinely runtime-only territory

Exit condition:

- shared checker-backed semantic surfaces exist as first-class architecture
- new semantic capability work lands there first rather than inside compatibility projections

### Track 3: Collapse the overloaded inquiry ontology into narrower families

Goal:
Stop treating focus, route, read mode, provenance, and execution posture as one broad label space.

Current anchors:

- [inquiry-model.ts](../src/inquiry-model.ts)

Next:

- push policy, ingress, catalog, and answer-envelope call sites onto narrower route families
- separate presentation read modes from payload/materialization modes at more call sites
- keep answer rendering and answer-reference surfaces separate from broader inquiry/session policy carriers
- keep shrinking APIs that accept the broad `FocusKind` union when they only honestly support a narrower family
- keep narrowing capability focus contracts so broad snapshot readers do not compete with declaration-localization or other focused inquiry paths
- separate request targeting from observed execution posture inside `WorldFrame` or its successor types
- separate evidence provenance from carrier provenance in answer-layer payloads

Exit condition:

- broad unions still exist only at the outer inquiry boundary where they are genuinely needed
- planner, policy, and rendering code mostly speak narrower families

### Track 4: Retire scaffold identity from `deps`, `typerefs`, and `exports`

Goal:
Reach a point where those names mostly describe projections or contracts, not the real center of gravity of the package.

Next:

- keep moving shared logic out of those surfaces into structural, semantic, and evaluator modules
- let the old projection names survive only where they still help as stable contract labels
- avoid designing new features as if the historical scaffold boundaries were the “real” architecture

Exit condition:

- the package feels architecturally coherent even if a future reader never learns the history of the three original scaffolds

### Track 5: Reduce SCC pressure by clarifying package-internal layer boundaries

Goal:
Pull `host`, `public`, `deps`, `exports`, and `typerefs` toward a dependency shape that reflects the intended architecture rather than the historical snapshot tools.

Current pressure signal:

- self-analysis still reports a 6-directory SCC for `packages/source-analysis`

Next:

- keep shared substrate/evaluator code in neutral modules instead of inside compatibility or ingress surfaces
- make hosted runtime orchestration depend on shared layers, not on compatibility tools as peers
- keep public exports thin and projection-oriented
- make package audit and related evaluator surfaces report package-internal source-area cycles honestly instead of letting known SCC pressure disappear behind a false clean bill

Exit condition:

- the SCC meaningfully shrinks, or the remaining cycle is clearly justified and documented as a deliberate kernel rather than accidental entanglement

### Track 6: Raise the analyzability ceiling before the Aurelia semantic layer lands

Goal:
Strengthen path-level classification, blocker explanation, and live inquiry usefulness so the Aurelia layer lands on a better substrate.

Next:

- keep promoting path-level closure and blocker evidence instead of repo-level handwaving
- treat tool-use friction as product feedback and remove repeated source-spelunking requirements where possible
- make open fronts and evaluator ceilings more visible in the inquiry answers
- add more checker-backed and evaluator-backed capabilities proactively rather than waiting until the Aurelia layer forces them
- grow toward control-flow, data-flow, and speculative static interpretation where that remains honest

Exit condition:

- the package can explain not just what it knows, but why a path is source-analyzable, type-assisted, blocked, or runtime-only

### Track 7: Land Aurelia-aware semantics on top, not through the core

Goal:
Add framework-aware meaning after the substrate/evaluator seams are strong enough to carry it cleanly.

Next:

- define which semantic claims belong in the framework-agnostic core versus adapters
- add Aurelia semantic surfaces as a new layer that spends shared substrate/evaluator primitives
- use the local Aurelia Atlas ports and export semantic surface ledger as
  derivation aids, not as already-settled framework contract
- use the repo-owned packet set under `fixtures/protocol-derivation/` as the
  current derivation substrate
- derive workbook exercises through one authority path per fixture;
  Aurelia semantics should auto-detect when present instead of being modeled as
  separate TypeScript and Aurelia passes
- pressure export identity, registry-like exports,
  recognized/admissible/current-world distinctions, DI/resource key-space
  splits, and retreat/no-claim/open pressure before freezing more public
  Aurelia request/response shapes

Exit condition:

- Aurelia-specific reasoning improves the inquiry surface without contaminating the structural core with framework-specific shortcuts

## Autonomous Work Rules

These are the kinds of moves that can usually proceed autonomously:

- extracting shared structural or evaluator surfaces from duplicated query logic
- replacing snapshot-derived live truth with structural/evaluator truth
- extracting checker-backed semantic capabilities into shared semantic modules
- centralizing repeated joins or classifier logic when behavior remains honest
- improving tests so they pin the intended architecture rather than incidental carrier details
- recording new `// TODO`s when a meaningful seam cannot be finished honestly in one pass

## Operator Steering Gates

These are the points where operator judgement should usually decide direction:

1. Freezing public ontology names
   When a narrower family becomes part of the public inquiry contract rather than just an internal refactor.

2. Choosing canonical truth across layers
   When live state, structural claims, and derived projections disagree and we need to decide which one defines user-visible truth for a concern.

3. Bounding speculative semantic evaluation
   How aggressive the semantic kernel should be when it starts doing interpretation, flow recovery, or non-trivial checker-backed inference.

4. Defining the framework-agnostic versus Aurelia-specific boundary
   Especially once semantic claims begin landing.

5. Deciding acceptable compatibility breakage
   If removing a shim or changing a contract would break callers, scripts, or established workflows.

6. Operator steering and taste surfaces
   When operator direction should become explicit product surface rather than staying as ad hoc prompt context.

7. Evaluator semantics that are inherently judgmental
   For example, what should count as “closed,” “qualified,” “runtime-only,” or “frontier” in edge cases.

## Near-Term Checkpoints

- [x] Move file identity and blindspots onto the structural source-file surface
- [x] Move live dependency reasoning for reachability and file navigation onto a shared dependency surface
- [x] Establish the dedicated semantic analysis module family
- [x] Extract checker-backed export symbol-face classification into `src/semantic/`
- [x] Extract a shared semantic export surface from `exports/analyze.ts`
- [x] Route live export navigation through the shared export trace surface
- [x] Extract answer rendering into its own policy surface instead of spending `InquiryPolicy` directly
- [x] Extract answer refs into a shared model instead of keeping them folded into `answer-card.ts`
- [x] Split snapshot loading away from neutral `AnalysisViews` composition
- [x] Move typerefs export-member fallback onto shared export contract and inspection helpers
- [x] Let live inquiry localize internal symbol declarations through a shared structural declaration surface
- [x] Narrow query capability focus contracts so declaration-location questions route to `query.navigate`
- [ ] Push inquiry policy and ingress onto narrower ontology families
- [ ] Make `deps` / `typerefs` / `exports` feel like projections rather than architectural peers
- [x] Reduce the 6-directory SCC in a measurable way
- [x] Make package audit surface package-internal source-area cycle pressure honestly
- [ ] Decide whether `AnalysisViews` should remain a raw projection bundle or gain a narrower shared payload contract
- [ ] Define the landing contract for Aurelia semantic adapters
- [x] Create a small repo-owned protocol-derivation fixture matrix for
  export-lens and current-world pressure
- [ ] Fill workbook derivations and invariants from that fixture matrix before
  promoting export semantic categories into broader framework-facing protocol
  surfaces

## How To Use This Roadmap

When resuming after compaction:

1. Re-read the README and seed docs.
   Start with `docs/working-map.md` and follow it before choosing a slice.
2. Read `docs/authority-first-campaign.md`, `docs/current-handoff.md`, `docs/decision-log.md`, and `docs/current-state.json`.
3. Run `pnpm preflight`.
4. Re-read this roadmap.
5. Use self-analysis to see which pressure points still show up in the package itself.
6. Continue only the first `in_progress` step from `docs/current-state.json` unless the operator redirects the campaign.
7. If a seam cannot be finished honestly in one pass, leave a local `// TODO` near the code that still carries the pressure and update `current-handoff.md` before stopping.
