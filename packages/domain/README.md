# packages/domain

Pure, in-process Aurelia template compiler and program facade. Everything in this package is pure TypeScript with deterministic, mutation-free phases; host-facing layers are opt-in and sit behind the program services.

## Primitives and data shapes
- `compiler/model/identity.ts` centralizes branded ids (ExprId, NodeId, TemplateId, SourceFileId, NormalizedPath, UriString) plus builders (`NodeIdGen`, `DomIdAllocator`, `NodeAddressBuilder`, sequential id allocators) and deterministic hashing helpers (`hashIdentity`, `stableHash`, `deterministicStringId`).
- `compiler/model/span.ts` and `compiler/model/source.ts` define Text/Source spans (UTF-16), normalization, offset math, and SourceFile resolution/branding. `spanContainsOffset`, `narrowestContainingSpan`, and `coverSpans` are reused across phases.
- `compiler/model/origin.ts` carries provenance (`Origin`/`Provenance`) for diagnostics/mapping with helpers to derive stage-tagged origins and traces.
- IR lives in `compiler/model/ir.ts`: DOM tree, instruction IR (bindings, controllers, lets, rows), expression AST/table, and shared JsonValue. Scope graph is in `compiler/model/symbols.ts` (frames, overlay bases, locals, expr-to-frame map, AU12xx diagnostics).
- Public contract types for tooling are in `contracts.ts` (TemplateMappingArtifact, SsrMappingArtifact, TemplateQueryFacade shape, bindable/query info).

## Language and parsing
- Attribute parsing is handled by `compiler/parsing/attribute-parser.ts` (`AttributeParser`, pattern registry, `AttrSyntax`); default patterns live in `DEFAULT_SYNTAX`.
- Semantics + registry live in `compiler/language/registry.ts`: DOM schema, resource catalogs (elements/attributes/controllers/valueConverters/bindingBehaviors), naming rules, event schema, two-way defaults. Resource scoping is modeled by `compiler/language/resource-graph.ts` (scope graph, `materializeResourcesForScope`).
- Expressions are parsed via `compiler/parsing/lsp-expression-parser.ts` behind the `IExpressionParser` contract; `getExpressionParser()` in `compiler/parsing/expression-parser.ts` provides a shared instance. Tokenization utilities live in `compiler/parsing/expression-scanner.ts`.

## Pipeline engine and caching
- `compiler/pipeline/engine.ts` defines the stage DAG contract (`StageKey`, `StageDefinition`, `StageOutputs`, `PipelineOptions`) and executes stages via `PipelineSession`. Each stage declares deps, a pure fingerprint, and a run function. Fingerprints and artifacts are hashed with `stableHash`.
- Sessions memoize stage results, optionally persist artifacts through `FileStageCache` (`compiler/pipeline/cache.ts`), and expose per-stage metadata (`StageArtifactMeta`) noting version, cache source, and artifact hash. Callers can also seed stages to reuse prior outputs.
- Stage definitions and dependencies live in `compiler/pipeline/stages.ts`. `createDefaultStageDefinitions()` wires the main phases, scopes semantics/resources, threads parsers, and applies overlay/SSR options. `runCoreStages()` and `runCorePipeline()` are helpers for the pure path (10->40).

## Phase graph (data flow)
- **10-lower** (`phases/10-lower/lower.ts` + helpers): parse HTML with parse5, build a static DOM tree (TemplateIR) and instruction rows. Attribute/expr parsing is driven by the provided parsers and semantics; expression occurrences are recorded in the expr table with deterministic ids.
- **20-resolve-host** (`phases/20-resolve-host/resolve.ts`): link IR against semantics/resources. Resolves host kinds (custom/native/none), normalizes attr->prop, resolves bindable targets/modes (including iterator header parsing), and lifts controller metadata. Emits AU11xx diagnostics. Output: `LinkedSemanticsModule`.
- **30-bind** (`phases/30-bind/bind.ts`): build the scope graph. Maps each expression occurrence to a frame, introduces overlay frames for controllers (repeat/with/promise), materializes locals/contextuals/let values, and records provenance. Emits AU12xx diagnostics. Output: `ScopeModule`.
- **40-typecheck** (`phases/40-typecheck/typecheck.ts`): derives expected types from linked bindables and inferred types from scope environments (`shared/type-analysis.ts`), keyed by ExprId. Reports AU1301 mismatches. Output: `TypecheckModule` with expected/inferred maps and diagnostics.
- **50-plan-overlay** (`phases/50-plan/overlay/plan.ts`): overlays are planned per frame. Builds frame type expressions (using VM reflection + synthetic prefixes), emits one lambda per authored expression, and captures per-member segments for mapping. Output: `OverlayPlanModule`.
- **60-emit-overlay** (`phases/60-emit/overlay/emit.ts`): emits TS/JS overlay text (`__au$access` calls with type aliases or JSDoc). Produces per-expr overlay spans plus member segments for mapping; filename/banner/EOL are customizable.
- **50-plan-ssr** (`phases/50-plan/ssr/plan.ts`): plans SSR render tree from linked+scope data (frames, hydration ids, branch data).
- **60-emit-ssr** (`phases/60-emit/ssr/emit.ts`): emits SSR HTML skeleton and JSON manifest, returning node->span/hydration mapping (`SsrEmitResult`).

## Products, mapping, and query
- `compiler/products/overlay.ts` orchestrates overlay product assembly using a `PipelineSession`: runs 10/20/30/40/50/60, builds template mappings, and constructs the template query facade. Overlay path is normalized alongside per-callsite offsets.
- `compiler/mapping.ts` builds `TemplateMappingArtifact` by correlating overlay emit spans with authored spans (`buildExprSpanIndex`, member path pairing). Returns expr span index for downstream use.
- `compiler/query.ts` exposes `TemplateQueryFacade` over authored HTML: node/expr/controller lookup by offset, bindable discovery, and expected type resolution using linked rows + typecheck output + mapping segments.
- `compiler/expr-utils.ts` collects expression spans across IR, builds span indexes, extracts member segments, and supplies helpers (`exprIdsOf`, `primaryExprId`, `buildExprSpanIndex`).
- `compiler/products/ssr.ts` wraps SSR plan/emit and normalizes output paths; `buildSsrMapping` stitches template/html/manifest spans into `SsrMappingArtifact`.
- Path helpers in `compiler/path-conventions.ts` compute overlay/SSR base names, filenames, and normalized paths.

## Facade entrypoints
- `compiler/facade.ts` is the main consumer API: `compileTemplate()` (overlay product + mapping/query + diagnostics/meta) and `compileTemplateToSSR()` (SSR HTML/manifest + core stage outputs). Both build pipeline options, choose overlay/SSR base names, and expose per-stage metadata snapshots.
- `compiler/pipeline.ts` provides `createDefaultEngine()` plus `runCorePipeline()` to get IR/link/bind/typecheck without product planning.
- Public exports are consolidated in `src/index.ts`.

## Program layer (host-facing orchestration)
- `program/program.ts` implements `DefaultTemplateProgram`: owns document storage (`SourceStore`), pipeline caches (overlay, SSR, and core stage seeds keyed by content hash + options fingerprint), provenance ingestion, and telemetry hooks. It derives template/overlay/SSR paths (`deriveTemplatePaths`), seeds core stages when hashes match, and emits cache/provenance stats.
- Provenance is indexed by `program/provenance.ts` (`InMemoryProvenanceIndex`): ingests overlay/SSR mappings, normalizes URIs/SourceSpans, expands mapping entries into edges, and supports offset lookups and stats.
- `program/services.ts` exposes a `TemplateLanguageService` and `TemplateBuildService` that layer TypeScript services over overlay artifacts. It projects TS diagnostics/quick info/definitions/references/completions/code actions/rename edits back to templates using provenance and mapping, falling back to template bindable/type info when TS is unavailable.
- `program/sources.ts` supplies `SourceStore` contracts and an in-memory implementation; `program/primitives.ts` brands document URIs/snapshots; `program/paths.ts` normalizes document URIs and derives overlay/SSR filenames consistently.

## Mapping, diagnostics, and provenance flow
- Overlay/SSR mappings (`TemplateMappingArtifact`, `SsrMappingArtifact`) are produced during product assembly, then fed into provenance (`program/provenance.ts`) to enable offset projections between generated artifacts and templates.
- Diagnostics from link/bind/typecheck (`compiler/diagnostics.ts`) attach normalized spans and origins; program/services re-map TS diagnostics through provenance to surface them in authored HTML.
- Query + provenance power hover/definition/reference/code actions by correlating template offsets to overlay spans and member paths.

## Caching and fingerprints
- Stage-level caching is handled in `compiler/pipeline/engine.ts` with optional persistence via `FileStageCache`. Fingerprints combine stage input hashes, dependency artifact hashes, and per-option fingerprint hints to keep cache keys stable across custom parsers/semantics/vm reflections.
- Program-level caching (overlay/SSR/core) in `program/program.ts` is keyed by document content hash + options fingerprint (computed with `stableHash` in `compiler/pipeline/hash.ts` and normalized hints). Stage metadata is recorded to report seed/cache/compute reuse.
