# core/ — Reactive Semantic Compiler

The reactive core of the Aurelia 2 semantic compiler. Replaces the old
batch pipeline (analysis/ + pipeline/ + synthesis/ + facade.ts) and the
old project discovery (project-semantics/resolve.ts) with demand-driven
evaluation and value-sensitive cutoff.

## Status map

```
core/
  graph/              DONE     reactive dep graph (types, topology, staleness, cutoff)
  interpret/          DONE     interpreter (AST -> observations, convention policy)
  convergence/        DONE     observation -> conclusion merge algebra
  resource/           DONE     green resource types, builtins, catalog, graph projection
  scope/              DONE     scope-visibility evaluation
  vocabulary/         DONE     frozen syntax registry (BCs, APs)
  template/           DONE     template analysis (lowerTemplate)
  project/            PARTIAL  workspace layout, conventions, discovery (stub)
```

### What's tested

| Module | Test coverage |
|--------|--------------|
| graph + interpret + convergence | Tiers 1-5 (126 + 50 + ongoing tests) |
| scope-visibility | Tier 5 (27 tests) |
| vocabulary | Tier 5 |
| template/semantic-analysis | Tier 6 (103 tests) |
| resource/from-graph | Consumed by tier 6 tests via harness bridge |
| project/workspace | Empirical (aurelia-60: 51 packages detected, 369/971 files filtered) |
| project/conventions | Empirical (default policy matches old hardcoded behavior, 379 tests pass) |
| project/discovery | Stub |

## Architecture

Three well-known patterns composed:

- **Roslyn-style green/red separation** — structural content (green,
  in `value/green.ts`) is position-free and internable. Provenance
  (red, in `value/sourced.ts`) carries spans and declaration forms.
  Cutoff operates on green only.
- **Salsa-style demand-driven evaluation** — pull-based, lazy. Nodes
  evaluate only when pulled and stale. Evaluation callbacks are
  per-node-kind, not pipeline stages.
- **Dataflow-style fixed-point convergence** — multiple observations
  of the same field merge via an operator algebra. Cycles resolve
  through iterative re-evaluation to a stable fixed point.

## Data flow

```
workspace root
    |
    v
project/workspace.ts               detect packages, source roots, excludes
    |
    v
ts.Program (filtered source files)
    |
    v
project/conventions.ts             compile convention rules into policy
    |
    v
interpret/interpreter.ts           AST -> observations in the graph
    |                               (per-file, per-class, per-field)
    |                               convention policy drives Form 4 recognition
    v
graph/graph.ts                     observations + convergence -> conclusions
    |                               (staleness propagation, pull, cutoff)
    v
resource/from-graph.ts             conclusions -> ResourceCatalogGreen
scope/scope-visibility.ts          conclusions -> per-CE visibility + completeness
vocabulary/vocabulary.ts           root registrations -> VocabularyGreen
    |
    v
project/discovery.ts     [STUB]    orchestrates the above into ProjectSemanticsGreen
    |
    v
template/semantic-analysis.ts      HTML + catalog + vocabulary -> TemplateSemantics
    |                               (single-pass, replaces 6,278 lines in analysis/)
    v
[consumer layer]                   TemplateSemantics -> features
                                    (completions, hover, diagnostics, etc.)
                                    Lives in semantic-workspace/, not here.
```

## File overview

### graph/ — reactive infrastructure

| File | Status | Role |
|------|--------|------|
| `graph/types.ts` | DONE | Node IDs, edge construction, tracer, registrar, convergence function, push/pull engines, event protocol. **Read this first.** |
| `graph/graph.ts` | DONE | Graph implementation. Topology, staleness, intern pool, pull-side re-evaluation with cutoff, orphan cleanup. |

Node layers:
```
input               evaluation           observation              conclusion
-----               ----------           -----------              ----------
file:/path    ->  eval:/path#Unit  ->  obs:kind:name:field:eval  ->  conclusion:kind:name::field
type-state
config
manifest
```

### interpret/ — declaration evaluator

| File | Status | Role |
|------|--------|------|
| `interpret/interpreter.ts` | DONE | Walks TS AST, recognizes resources, emits observations. Entry points: `interpretProject()`, `createUnitEvaluator()`. |
| `interpret/extract-fields.ts` | DONE | Per-field observation emission with green extraction. |
| `interpret/recognize.ts` | DONE | Four declaration form recognition (decorator, static $au, define(), convention). |
| `interpret/resolve.ts` | DONE | Tracer-integrated cross-file import resolution. |
| `interpret/html-meta.ts` | DONE | Convention-paired HTML meta element processing. |

### convergence/ — merge algebra

| File | Status | Role |
|------|--------|------|
| `convergence/convergence.ts` | DONE | 6 operators (locked-identity, known-over-unknown, stable-union, patch-object, first-defined, first-available). Evidence ranking. Field path dispatch. |

### resource/ — green resource types

| File | Status | Role |
|------|--------|------|
| `resource/types.ts` | DONE | FieldValue<T>, per-kind resource green types (CE, CA, TC, VC, BB), vocabulary types, ResourceCatalogGreen, manifest container. |
| `resource/builtins.ts` | DONE | 30 resources + 14 BCs + 14 APs as green literals. JSON-serializable. |
| `resource/catalog.ts` | DONE | `buildCatalog()` — assembles ResourceGreen[] into name-indexed ResourceCatalogGreen. |
| `resource/provenance.ts` | DONE | Red-layer types (FieldProvenance, GapDetail, ConvergenceDecision). |
| `resource/annotate.ts` | DONE | `uniformProvenance()`, `annotate()` — pair green + red. |
| `resource/from-graph.ts` | DONE | `graphToResourceCatalog()` — projects graph conclusions into ResourceCatalogGreen. Reads per-field conclusion nodes, maps Sourced<T> to FieldValue<T>, assembles per-kind ResourceGreen, merges over builtins. |

### scope/ — visibility evaluation

| File | Status | Role |
|------|--------|------|
| `scope/scope-visibility.ts` | DONE | `evaluateScopeVisibility()` — two-level resource lookup, completeness, aliases, known plugin contributions, standard builtins. |

### vocabulary/ — frozen syntax registry

| File | Status | Role |
|------|--------|------|
| `vocabulary/vocabulary.ts` | DONE | `evaluateProjectVocabulary()` — core BCs/APs + plugin postulates. Gap model. |

### template/ — template analysis

| File | Status | Role |
|------|--------|------|
| `template/semantic-analysis.ts` | DONE | `lowerTemplate()` — single-pass 8-step classification, element resolution, binding, scope chain, DOM schema. 1,276 lines replacing 6,278. |
| `template/template-parser.ts` | DONE | Source-faithful HTML walker. `TemplateNode` abstraction boundary. |

### project/ — discovery orchestration

| File | Status | Role |
|------|--------|------|
| `project/workspace.ts` | DONE | `resolveWorkspaceLayout()` — detects npm/pnpm/single-package workspace structure. `filterAnalysisFiles()` — intersects layout with ts.Program file list. Extensible to nx, turbo, lerna. |
| `project/conventions.ts` | DONE | `compileConventionPolicy()` — compiles user-facing `ConventionConfig` into lookup-optimized policy. Single canonical place for suffix rules, file patterns, name derivation. Consumed by `interpret/recognize.ts`. |
| `project/discovery.ts` | **STUB** | `discoverProjectSemanticsGreen()` — composes interpret + graph + convergence + catalog + scope + vocabulary into `ProjectSemanticsGreen`. Replaces `project-semantics/resolve.ts`. |

## What this replaces (old code, LOC)

When the green path is complete and verified, these can be deleted:

| Old module | LOC | Replaced by |
|------------|-----|-------------|
| `analysis/10-lower/` | 3,353 | `template/semantic-analysis.ts` |
| `analysis/20-link/` | 2,021 | `template/semantic-analysis.ts` |
| `analysis/30-bind/` | 904 | `template/semantic-analysis.ts` |
| `analysis/40-typecheck/` | 737 | Dissolves — BindingTarget carries the info |
| `pipeline/` | 404 | Dissolves — graph handles ordering |
| `synthesis/overlay/` | 2,110 | Not needed for IDE surface |
| `facade.ts` | 149 | `project/discovery.ts` |
| `project-semantics/resolve.ts` | 588 | `project/discovery.ts` |
| `convergence/` (old) | 838 | `convergence/convergence.ts` |
| `reactive-graph/` | 619 | Unused generalization — delete |
| `schema/model.ts` | 568 | Direct graph queries |
| `program/program.ts` | 433 | TBD — caching strategy not yet decided |
| **Total deletable** | **~12,724** | |

Modules that **survive** (architecture-independent):
- `model/` (2,091) — identity types, IR types
- `parsing/` (3,785) — expression parser, attribute parser
- `value/` (805) — GreenValue, Sourced<T>, interning
- `shared/` (2,843) — type-analysis (TS checker queries)
- `diagnostics/` (2,839) — diagnostic catalog (needs type updates)
- `program/services.ts` (~1,200) — LSP protocol adapters

Modules with **mixed fate**:
- `project-semantics/` (28,891 total) — extract/ and evaluate/ are
  reused by the interpreter. recognize/ is reimplemented in
  interpret/recognize.ts. The rest dissolves.
- `schema/` (9,471 total) — types.ts replaced by resource/types.ts.
  cursor-resolve.ts needs new implementation on TemplateSemantics.
  cursor-entity.ts type definitions may survive with field renames.

## Consumer layer (NOT in core/)

The consumer layer lives in `semantic-workspace/`. It consumes
`TemplateSemantics` + `ResourceCatalogGreen` + expression model to
produce IDE features.

Consumer migration is a separate phase. It cannot begin until
`project/discovery.ts` is implemented and verified against the old
path. The architectural seams document (meta-repo
`models/current/architectural-seams.md`) maps all consumer
integration points.

Consumer modules and their migration status:

| Module | LOC | What changes |
|--------|-----|--------------|
| `engine.ts` | ~2,500 | Calls discoverProjectSemanticsGreen instead of discoverProjectSemantics |
| `workspace.ts` | ~500 | Program/query dispatch adapts to new types |
| `completions-engine.ts` | ~2,100 | Position resolution walks TemplateSemantics instead of TemplateQueryFacade |
| `expression-model.ts` | ~1,700 | Frame tree from ScopeFrame linked list (400 LOC dissolves) |
| `hover.ts` | 430 | Type renames (ElementRes -> CustomElementGreen etc) |
| `definition.ts` | ~1,100 | Walks TemplateSemantics instead of linked templates |
| `semantic-tokens.ts` | ~300 | Walks TemplateSemantics instead of linked templates |
| `template-edit-engine.ts` | ~2,300 | Walks TemplateSemantics instead of linked templates + IR |
| `cursor-resolve.ts` | ~1,380 | Rewrites to span-walking on TemplateSemantics (~260 LOC) |

## Known gaps in the DONE modules

**Multi-binding sub-parsing** — CAs with `"prop: val; prop2.bind: expr"`
are classified at step 7 but not split into per-bindable instructions.

**processContent gap flag** — CEs with processContent are recognized
but analysis doesn't flag their templates as non-deterministic.

**Content projection grouping** — `au-slot` routing is classified but
children aren't grouped into projection slot maps.

**Expression AST** — interpolation and entry points are detected, but
expressions aren't parsed into AST. Identifier resolution against the
scope chain is structural, not semantic.
