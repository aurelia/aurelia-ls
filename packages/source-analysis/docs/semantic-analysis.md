# Semantic Analysis

This note describes the dedicated checker-backed semantic layer that `source-analysis` should grow next.

The package should grow far beyond the original `deps` / `typerefs` / `exports` scaffolds.
It should proactively add checker-backed semantic capabilities before Aurelia-specific meaning lands, and that work should live in a dedicated, well-designed module rather than leaking out of compatibility surfaces.

## Why This Exists

The direct consumer of this layer is the AI. The operator benefits through stronger steering, clearer reasoning, and more reviewable results.

Right now, the AI still has to open too much raw source to answer questions that should eventually close through the package's own read surface.

That friction is product feedback.

The package already knows how to recover a lot of structure, but it still lacks a strong enough semantic layer to answer questions like:

- what symbol does this export really resolve to?
- what file or declaration is the true implementation target here?
- what are the call, alias, control-flow, or data-flow consequences of this change?
- what can be inferred without running the program?
- where does the analyzability ceiling stop because the remaining decision is genuinely runtime-only?

The goal is to build an aggressive AOT semantic engine that can answer a much larger class of engineering questions truthfully before runtime.

Think:

- SourceGraph-style code intelligence
- checker-backed symbol and declaration reasoning
- aggressive ahead-of-time structural-plus-semantic recovery
- control-flow and data-flow analysis
- speculative interpretation where that is honest and cheap enough

## Architectural Position

This semantic layer should sit between the structural substrate and the higher inquiry/adaptor surfaces.

Target layering:

1. Structural substrate
   Files, packages, imports, declarations, project membership, and other cheap claims.

2. Semantic analysis kernel
   Checker-backed claims and evaluators over symbols, exports, aliases, declarations, references, call targets, control flow, data flow, and interpretation.

3. Derived projections and caches
   Optional materializations derived from the shared layers, used only when they genuinely help with performance, interchange, or debugging.

4. Inquiry surface
   AI-facing answers and continuations.

5. Aurelia semantic adapters
   Framework-aware meaning built on top of the shared semantic kernel.

## Dedicated Module Direction

The codebase should grow a dedicated module family for this work instead of keeping semantic reasoning trapped inside legacy surfaces.

Recommended landing area:

- `packages/source-analysis/src/semantic/`

That module family should become the home for:

- checker-backed symbol identity and alias resolution
- export-face and public-surface reasoning
- semantic declaration and member interpretation
- call graph recovery
- control-flow and data-flow evaluators
- speculative evaluation of obviously static paths
- analyzability ceilings and blockers for semantic questions

That module family should stay:

- shared rather than projection-owned
- framework-agnostic at the kernel layer
- explicit about evidence provenance and trust

## Initial Capability Families

The first semantic surfaces should probably be:

### Export semantics

- export target resolution
- alias chains
- symbol-face classification
- merged declaration handling
- public surface ownership

This is the clearest current pressure because `exports/analyze.ts` still owns too much of it locally.

### Symbol and declaration semantics

- canonical symbol identity
- declaration-to-symbol grouping
- declaration faces and merge families
- semantic references beyond the existing type-ref projection

### Call and effect semantics

- call target recovery
- string-addressed handoff refinement
- obvious framework/bootstrap entry transitions

### Control-flow and data-flow semantics

- local control-flow narrowing
- constant and literal propagation
- module-local data movement
- package-local flow questions

### Speculative interpretation

- only for paths that are static enough to stay honest
- no hidden “maybe” execution passed off as truth
- explicit provenance and confidence when the result is evaluator-derived

## Trust And Provenance

The semantic layer must keep truth kinds visible:

- directly observed checker/compiler facts
- evaluator-derived semantic claims
- speculative conclusions
- open fronts or unresolved runtime dependencies

If the semantic kernel gets stronger but less honest about provenance, that is architectural regression.

## Relationship To `deps`, `typerefs`, And `exports`

Long term, the package should look as if those three initial scaffolds were never the true architecture.

That does not mean the snapshot names must disappear immediately.
It means:

- they should stop being where live reasoning fundamentally lives
- they should become projections over shared substrate and semantic layers
- new capabilities should land in the shared layers first, then materialize outward when useful

The end state should feel like:

- one smart package with structural and semantic intelligence
- optional derived projections or exports produced from it when useful

not:

- three historical tools plus a lot of glue

## Operator Steering Gates

This semantic track can proceed autonomously for a while, but operator steering is especially important for:

1. Speculation policy
   How aggressive should speculative interpretation be, and what should count as honest enough to surface?

2. Cost ceilings
   What kinds of checker-backed or flow analyses are acceptable in live inquiry paths versus slower derived or offline paths?

3. Canonical truth choices
   When checker-backed semantic conclusions disagree with cheaper structural recovery or snapshot projections.

4. Public semantic contract shape
   When a semantic surface graduates from internal architecture to a public inquiry or export contract.

5. Aurelia adapter boundary
   Which semantic capabilities belong in the shared kernel versus the Aurelia-specific layer above it.

## Near-Term Build Order

1. Extract shared export semantics from `exports/analyze.ts` into a semantic kernel surface.
2. Let live inquiry spend that surface directly.
3. Add symbol/declaration semantic surfaces next.
4. Add call and flow evaluators after the symbol layer is stable.
5. Land Aurelia-aware semantics on top of that shared kernel.
