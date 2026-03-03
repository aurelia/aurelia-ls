# deps/ — Reactive Dependency Graph

The reactive core of the semantic compiler. Implements demand-driven
evaluation with value-sensitive cutoff: edits that don't change
semantic content produce zero downstream work.

## Architecture

Three well-known patterns composed:

- **Roslyn-style green/red separation** — structural content (green,
  in `../value/green.ts`) is position-free and internable. Provenance
  (red, in `../value/sourced.ts`) carries spans and declaration forms.
  Cutoff operates on green only.
- **Salsa-style demand-driven evaluation** — pull-based, lazy. Nodes
  evaluate only when pulled and stale. Evaluation callbacks are
  per-node-kind, not pipeline stages.
- **Dataflow-style fixed-point convergence** — multiple observations
  of the same field merge via an operator algebra. Cycles resolve
  through iterative re-evaluation to a stable fixed point.

What is specific to this implementation:

- **Four-layer node taxonomy** with strict layering (input → evaluation
  → observation → conclusion). No skip-layer edges.
- **Two edge kinds** with identical staleness propagation but different
  evaluation semantics: data edges (failed → gap) and completeness
  edges (failed → demotion). Same graph, distinguished at the callback.
- **Orphaned observation cleanup** on resource identity change. When
  re-evaluation produces observations under a different resource key,
  old observations are detected and removed, downstream conclusions
  marked stale.
- **GraphEventListener protocol** for zero-cost instrumentation.
  Optional listener receives structured events (staleness, evaluation,
  convergence, cutoff, change). Pass no listener in production.

## File overview

| File | Role |
|------|------|
| `types.ts` | All interfaces: node IDs, edge construction, evaluation tracer, observation registrar, convergence function, push/pull engines, event protocol. **Read this first.** |
| `graph.ts` | Graph implementation. Topology, staleness propagation, intern pool, pull-side re-evaluation with cutoff, orphan cleanup. |
| `convergence.ts` | Merge operators and evidence ranking. Operator dispatch by field path. |
| `scope-visibility.ts` | Standalone evaluation: two-level resource lookup, completeness, aliases, known plugin contributions. |
| `vocabulary.ts` | Standalone evaluation: frozen syntax registry (core BCs/APs, plugin postulates). |
| `template-parser.ts` | Source-faithful HTML walker. Abstract `TemplateNode` interface. |
| `template-analysis.ts` | Standalone evaluation: 8-step classification, element resolution, binding mode, scope chain, DOM schema. |

## Graph mechanics (graph.ts + types.ts)

### Node layers

```
input               evaluation           observation              conclusion
─────               ──────────           ───────────              ──────────
file:/path    →  eval:/path#Unit  →  obs:kind:name:field:eval  →  conclusion:kind:name::field
type-state
config
manifest
```

Edges are maintained in both directions. Forward edges carry staleness
propagation. Backward edges drive pull-side traversal.

### Push side: staleness

`markFileStale(file)` eagerly marks all transitive dependents stale
through forward edges. The staleness source is tracked per propagation
for event attribution.

### Pull side: re-evaluation and cutoff

`evaluation.pull(conclusionId)`:

1. Not stale → return cached value (fast path)
2. Find stale observations, re-evaluate their source eval nodes via
   the `UnitEvaluator` callback
3. Detect orphaned observations (produced by eval on previous run but
   not on this run) — remove them, mark downstream conclusions stale
4. Collect surviving observations, run convergence
5. Intern the converged green value
6. Compare with previous green (pointer equality)
7. Same → **cutoff** (no downstream impact). Different → **changed**

### Intern pool invariant

All green values stored in the graph are interned. This happens at
two points: observation registration and convergence output. Cutoff
depends on this — without interning, pointer equality always fails
and every re-convergence cascades. The pool lives on the graph
instance (one per graph, cleared on full rebuild).

### Orphan cleanup invariant

When an eval node is re-evaluated, the graph compares the set of
observations it produced before vs after. Observations that no longer
exist (resource renamed, field removed, etc.) are deleted and their
downstream conclusions marked stale. This prevents stale data from
surviving identity changes.

## Convergence (convergence.ts)

Observations of the same `(resourceKey, fieldPath)` merge via an
operator selected by field path. The operator dispatch table maps
field path patterns to one of the merge operators. Evidence ranking
determines which observation wins when operators need a "best"
candidate.

**To add a new field**: ensure the dispatch table in `convergence.ts`
maps its field path to the appropriate operator. If the field has
novel merge semantics, add a new operator.

## Standalone evaluations

Three evaluation functions sit on top of the graph. They read from
conclusions via `pull()` but are not graph nodes themselves. Each is
called imperatively from the test harness or consumer code.

### scope-visibility.ts

Determines which resources are visible in each CE's template scope.
Implements the two-level lookup: local container (dependencies,
template imports, local elements) checked first, root container
(global registrations, builtins, known plugin resources) checked
second. No intermediate ancestors.

Key concepts:
- **Completeness** — a scope is complete when all registration paths
  are deterministic. Negative claims ("resource X absent") require
  completeness to be safe for diagnostics.
- **Aliases** — registered alongside primary names, mapping to the
  same resource key.
- **Known plugin resources** — plugins like the router contribute
  specific resources (CAs, CEs) to root scope when detected.
  Extensible via the `KNOWN_PLUGIN_RESOURCES` array.
- **Standard builtins** — always present in root scope. Listed in the
  `STANDARD_BUILTINS` array.

### vocabulary.ts

Frozen syntax registry: binding commands and attribute patterns that
the compiler recognizes. Must be closed before template analysis
begins (the subject's `IAttributeParser` freezes after first parse).

Key concepts:
- **Core builtins** — always present (DefaultBindingSyntax,
  DefaultBindingLanguage, DefaultComponents).
- **Plugin postulates** — known plugins with deterministic base
  vocabulary. Detected from root registration refs.
- **Gap model** — `customizeGapKind: 'none'` (deterministic) vs
  `'marginal'` (base vocabulary survives `.customize()`, additional
  aliases indeterminate).

### template-analysis.ts

8-step attribute classification + element resolution + binding mode
resolution + scope chain construction. Consumes vocabulary, scope-
visibility, and resource conclusions.

Key concepts:
- **Classification is deterministic but trusts its inputs.** Every
  attribute classifies into exactly one of 8 categories. Missing
  upstream data causes silent misclassification, not errors.
- **AP simulation** — regex-based matching against vocabulary patterns.
  The sole arbiter of binding syntax. No splitting on dots.
- **LE-30 namespace rule** — bare attributes in SVG/MathML skip CA
  lookup at step 7. Only explicit binding syntax triggers it.
- **Scope chain is structural** — determined from DOM tree and per-TC
  scope effects. CEs are boundaries. Only a subset of TCs create child
  scopes (documented in the `TC_SCOPE_EFFECTS` map). All others pass
  through.
- **DOM schema** — known HTML and SVG elements, `data-*`/`aria-*`
  passthrough, `isTwoWay` mapping, attribute-to-property mapping.
  Static tables — see "needs review" below.

## Template parser (template-parser.ts)

Source-faithful markup walker. Not a spec-compliant HTML parser.

Design rationale: IDE template analysis needs to match what the
developer sees in source, not what the HTML spec says the tree should
be. No auto-closing, no implicit elements, no foster parenting.
Preserves source positions exactly.

The `TemplateNode` interface is the abstraction boundary. Analysis
callbacks consume it. For AOT compilation, a parse5 adapter produces
the same interface with spec-compliant parsing. Parser choice is an
upstream concern — template analysis doesn't know which parser ran.

## Integration guide (for migration)

### Wrapping a pipeline stage as a graph node

1. Identify the stage's inputs (what it reads) and outputs (what it
   produces)
2. Express inputs as `tracer.readFile()`, `tracer.readEvaluation()`,
   or `pull()` calls — these create dependency edges
3. Express outputs as `observations.registerObservation()` calls
4. The graph handles ordering, caching, cutoff, and re-evaluation

### Making standalone evaluations into graph nodes

scope-visibility, vocabulary, and template-analysis already consume
the right inputs via `pull()`. To make them incremental:

1. Register a new node kind in the graph (new evaluation node type)
2. In the evaluation callback, call the existing function
3. Store the result as an observation or conclusion
4. The graph's cutoff prevents unnecessary downstream re-evaluation

This is mechanical — the functions are already pure (input →
output with no side effects beyond `pull()`).

### Connecting to the existing parse5 template pipeline

1. Implement `TemplateTree` adapter for parse5's output
2. Template analysis consumes the adapter's output unchanged
3. Parser choice (source-faithful vs parse5) is a config input node
4. When config changes, template parse nodes go stale, analysis
   re-evaluates, cutoff handles the equivalent-tree case

### Adding new resource kinds or fields

1. Update the interpreter to extract the new field
   (`../interpret/extract-fields.ts`)
2. Add the field path to the convergence operator dispatch
   (`convergence.ts`)
3. If it affects visibility, update `scope-visibility.ts`
4. If it affects classification, update the relevant step in
   `template-analysis.ts`
5. The graph, cutoff, and interning handle the rest automatically

## Known gaps

**Multi-binding sub-parsing** — CAs with `"prop: val; prop2.bind: expr"`
are classified at step 7 but not split into per-bindable instructions.

**processContent gap flag** — CEs with processContent are recognized
but analysis doesn't flag their templates as non-deterministic.

**Content projection grouping** — `au-slot` routing is classified but
children aren't grouped into projection slot maps.

**Expression AST** — interpolation and entry points are detected, but
expressions aren't parsed into AST. Identifier resolution against the
scope chain is structural, not semantic.

**Template analysis as graph nodes** — currently a single standalone
function. Splitting into template-ir / template-link / template-bind
nodes enables incremental template analysis (e.g., bindable mode change
cutoffs at classification while binding re-evaluates).

## Needs review

**Convergence operator dispatch** — field path → operator mapping is
a hardcoded table. New fields require updating the table. Consider
whether the dispatch should be declarative (metadata on field
definitions) rather than procedural.

**AP simulation** — covers standard and plugin patterns via regex but
doesn't implement the full `SyntaxInterpreter` scoring. Edge cases
with multiple close-scoring pattern matches may diverge from the
subject compiler.

**DOM schema** — static element/attribute sets. The subject compiler
generates its schema from `lib.dom.d.ts`. The static sets should be
reconciled with the generated schema during migration to prevent
divergence.

**Intern pool growth** — grows monotonically (no eviction). For
long-running sessions, monitor `pool.size` and `clear()` on full
rebuild to prevent unbounded memory growth.

**Re-interpret-all in test harness** — the mutable test session
re-interprets all files on every edit. Production should use the
graph's targeted re-evaluation via staleness propagation + unit
evaluator. The graph supports this; only the test harness uses the
blunt approach.
