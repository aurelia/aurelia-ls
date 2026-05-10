# Atlas Framework Workbench

This is the near-work note for Atlas framework work. Keep it short enough that a future agent will read it.
Stable ownership belongs in [README.md](README.md), runtime lens details belong in
[../inquiry/runtime/README.md](../inquiry/runtime/README.md), and generated evidence belongs in
[../../workbench/emulation-symbols.md](../../workbench/emulation-symbols.md).

When adding a directional note, include the code file, API projection, report, or command that should be inspected
before the note is treated as current truth.

## Current Direction

Atlas should let an agent answer Aurelia framework architecture questions from exact, composable substrates before
opening raw source:

- framework source/checker facts from [../source](../source/README.md) and
  [../source/semantic-surface](../source/semantic-surface/README.md);
- generic ECMAScript evaluation from [../evaluation](../evaluation/README.md);
- Aurelia-specific framework facts from this folder;
- inquiry answers and continuations from [../inquiry/runtime](../inquiry/runtime/README.md).

The forcing function remains an Aurelia-wide dependency graph: app/configuration admission, DI world construction,
resource catalogs, compiler-world formation, JIT compilation, rendering/hydration, lifecycle, observation/reactivity,
and bridge pressure into semantic-runtime.

Do not hard-code names such as `StandardConfiguration` as semantic truth. Discover them through evaluated bundles,
DI/resource/materialization atoms, and route-backed corridors. `StandardConfiguration` is a useful canary because it
touches most framework surfaces; it is not the ontology.

## Design Decisions To Preserve

- `self-check` is a thin liveness/contract sanity pass. Architectural judgment comes from coherent substrates and exact
  Atlas projections, not from compat-style assertions over today's row shapes.
- `atlas.self` is not an architectural judge. It exposes source-backed rows, enum/value-space pressure, route topology,
  continuations, modules, classes, and functions so maintainers can reason faster.
- `product.architecture` is the product-side source map for semantic-runtime. Use its `area-dependencies`, `modules`,
  `cycles`, `declarations`, `classes`, `functions`, `call-sites`, `call-dependencies`, `symbol-references`,
  `symbol-dependencies`, and `profile` projections before manually spelunking semantic-runtime architecture pressure;
  it should expose import coupling, checker-backed call flow, checker-backed runtime/type/value coupling, cold analysis
  phase cost, and source surfaces, not decide the refactor.
- Substantial Atlas behavior should prefer named classes, indexes, classifiers, graphs, registries, builders, and memos
  over broad object-literal surfaces. Atlas and TypeScript must be able to inspect Atlas itself.
- Repeated row-family answers should use [../inquiry/paged-row-family.ts](../inquiry/paged-row-family.ts) and
  [../inquiry/paging.ts](../inquiry/paging.ts). Do not reintroduce local `pageRows` / `pageInfo` / `evidenceLimit`
  helper clusters in lenses.
- Repeated framework row-to-lens hops should use
  [../inquiry/runtime/framework-route-catalog.ts](../inquiry/runtime/framework-route-catalog.ts) and
  [../inquiry/runtime/framework-continuation-core.ts](../inquiry/runtime/framework-continuation-core.ts).
  Same-answer narrowing is `NavigationRelation.RefinementOf`; projection/lens changes are not the same relation.
- Source/type/call-site inspection continuations should use `FrameworkRowContinuationBuilder`; local continuation
  objects are acceptable only while a route is genuinely one-off.
- `EvaluationOpenKind` and Atlas `OpenSeamKind` are different value spaces. Evaluator closure evidence may later feed
  a TypeChecker or semantic-runtime handoff, but answer-layer open seams can stay coarser.
- Do not restore static framework handoff catalogs. If a boundary matters, spend it into source-backed relationship,
  effect, lifecycle, observer, or product-provenance rows.
- Keep durable cache/warmup machinery out until profiling proves a repeated foreground query cannot be made cheap at
  the owning substrate. Prefer source-epoch memos and stable atom producers over persisted projection caches.

## Active Evidence Surfaces

- Framework API usage: [api-usage.ts](api-usage.ts) and
  [../../workbench/framework-api-usage-workbench.md](../../workbench/framework-api-usage-workbench.md). Current pressure:
  join implementation shapes and usage owner groups to DI/materialization/compiler/rendering relationship rows so a
  class-centric query can say which semantic phase a member participates in.
- TypeScript semantic surface: [../source/semantic-surface/README.md](../source/semantic-surface/README.md). Current
  pressure: receiver-type-aware member calls and callable surfaces if bridge/API questions keep needing them.
- Framework boot and DI world: [module-boot.ts](module-boot.ts), [di-world.ts](di-world.ts), and
  [../inquiry/runtime/framework-di-graph.ts](../inquiry/runtime/framework-di-graph.ts). Current pressure: keep
  `Container` emulator behavior in semantic-runtime while Atlas exposes framework facts that make emulator gaps visible.
  `framework.di:world` accepts `configurationPackageId` and `configurationExportName`; it can spend both
  register-method configurations and closed bundle arrays such as runtime-html default groups.
- Admission flow: [admission.ts](admission.ts), [admission-world.ts](admission-world.ts), and
  [../inquiry/runtime/framework-admission-flow.ts](../inquiry/runtime/framework-admission-flow.ts). Current pressure:
  keep `flow` as a cheap graph rollup, with source/evidence paid through `flow-edge-details`. Bundle discovery should
  preserve returned-registry factory shapes such as configuration `init(...)` methods, including local const/arrow
  factories that return `AppTask` or registration helper products.
- JIT compiler corridor: [../inquiry/runtime/framework-jit-compiler-corridor.ts](../inquiry/runtime/framework-jit-compiler-corridor.ts),
  [../inquiry/runtime/framework-compiler-flow.ts](../inquiry/runtime/framework-compiler-flow.ts), and
  [../inquiry/runtime/framework-compiler-products.ts](../inquiry/runtime/framework-compiler-products.ts). Current
  pressure: keep `compile-flow` high-level and `attribute-classification` as the dense `_classifyAttributes` detail
  view. [../inquiry/runtime/framework-compiler-contracts.ts](../inquiry/runtime/framework-compiler-contracts.ts) owns
  the exact source-backed contract rows for compiler concepts that semantic-runtime mirrors directly with `auLink` but
  that are not instruction products, such as binding-command definitions/instances, command build info, attribute
  patterns, compiled patterns, and bindables-info interfaces.
- Rendering/hydration: [../inquiry/runtime/framework-rendering-hydration-flow.ts](../inquiry/runtime/framework-rendering-hydration-flow.ts),
  [../inquiry/runtime/framework-rendering-consequences.ts](../inquiry/runtime/framework-rendering-consequences.ts), and
  [../inquiry/runtime/framework-rendering-public-rows.ts](../inquiry/runtime/framework-rendering-public-rows.ts).
  Current pressure: use compact overview rows before opening instruction/controller/binding detail families. For
  controller detail, `framework.rendering:controller-creations` now exposes ordered `hydrationSteps` so renderer
  handoffs such as `TemplateControllerRenderer` can be compared with semantic-runtime controller materialization before
  reading raw source.
- Router grounding: [../inquiry/runtime/framework-router-analysis.ts](../inquiry/runtime/framework-router-analysis.ts),
  [../inquiry/runtime/framework-router-descriptor-map.ts](../inquiry/runtime/framework-router-descriptor-map.ts),
  [../inquiry/runtime/framework-router-source-map.ts](../inquiry/runtime/framework-router-source-map.ts),
  [../inquiry/runtime/framework-router-lenses.ts](../inquiry/runtime/framework-router-lenses.ts), and
  [../inquiry/runtime/framework-router-relationships.ts](../inquiry/runtime/framework-router-relationships.ts).
  Current pressure: use `framework.router:flow`, `recognizer`, `flow-issues`, `recognizer-issues`, and `relationships`
  before semantic-runtime router modeling. The flow and recognizer mechanic rows must self-audit against live
  router/route-recognizer source, and relationship rows should use router-specific relation/mechanism/phase axes rather
  than generic app-pressure heuristics. Router relationships include both the ordered router flow spine and
  route-recognizer mechanic rows so auLink mirror reads can attach role evidence to `RouteConfig`,
  `RouteConfigContext`, `ContextRouter`, `TypedNavigationInstruction`, `ConfigurableRoute`, `Parameter`, and segment
  anchors. Router stage rows now have
  declared semantic route hops into resource materialization, rendering hydration/controller creation, and lifecycle
  controller-call projections when they cross those framework boundaries.
  Relationship targets split multi-target flow descriptors, so `createConfiguredNode` exposes `ViewportRequest`,
  `ViewportAgent`, `RouteContext`, and `RouteNode` as separate role-evidence targets for router emulation work.
- Resource runtime policy: [resources.ts](resources.ts) and
  [../inquiry/runtime/framework-materialization-lenses.ts](../inquiry/runtime/framework-materialization-lenses.ts).
  Resource catalog admission is not resource instance lifetime.
- Observation and TypeChecker handoff: [../inquiry/runtime/framework-observation-lenses.ts](../inquiry/runtime/framework-observation-lenses.ts),
  [../inquiry/runtime/framework-observation-internals.ts](../inquiry/runtime/framework-observation-internals.ts), and
  [../../workbench/emulation-symbols.md](../../workbench/emulation-symbols.md). Current handoff rows are navigation
  boundaries, not a complete binding/reactivity behavior graph. The watcher/effect/collection call-site classifiers are
  now descriptor-driven, but treat future observation pressure as framework-semantic pressure and read the Aurelia
  observation flow before doing table-only cleanup.
- auLink bridge pressure: [../../workbench/aulink-mirror-workbench.md](../../workbench/aulink-mirror-workbench.md) and
  [../../workbench/bridge-usage-navigation-workbench.md](../../workbench/bridge-usage-navigation-workbench.md). Re-run
  live bridge projections before treating older probe notes as current product/framework mirror state.
- Framework composition: [../inquiry/runtime/framework-composition-lenses.ts](../inquiry/runtime/framework-composition-lenses.ts)
  should include router flow relationships in `family: "router"` claims alongside structural router entity claims.
  Structured filters such as `family`, `relation`, `mechanism`, and `phase` should not be intersected with the default
  high-salience actor seed terms.

## Semantic Watchpoints

- Resource lookup versus construction:
  - `find` rows are resource definition/catalog lookup facts.
  - `get`, `getAll`, `resolve`, and `invoke` are materialization/construction pressure.
  - CE/CA/TC view-model instances are per-invocation runtime products; renderers are singleton `IRenderer` providers.
- Variable-carried DI keys:
  - stable module/interface/class symbols such as `IPlatform` or `ITemplateCompiler` may seed DI closure;
  - runtime values such as `handlerInfo.type`, `comp`, `def.Type`, and `definition.Type` are source-backed variable
    carriers and must not become ordinary DI key identities.
- TypeChecker handoff:
  - root/controller-owned binding materialization can be deterministic;
  - bindings under template-controller-created synthetic views can be speculative because the owning controller
    realization is speculative;
  - phrase these rows as handoff/navigation boundaries until semantic-runtime introduces a first-class
    binding/reactivity handoff graph.
- Admission:
  - configuration admission is not DI execution;
  - AppTask admission and AppTask lifecycle execution are separate axes;
  - registry exports/catalogs/factories should remain explicit downstream questions unless world-formation evidence
    spends them.

## Near Work

- Before choosing Atlas maintenance work, run
  `pnpm --filter @aurelia-ls/atlas pressure:self`; before choosing semantic-runtime cleanup pressure, run
  `pnpm --filter @aurelia-ls/atlas pressure:product-architecture`.
  For the compact cross-cutting handoff, read
  [../../workbench/agent-handoff.md](../../workbench/agent-handoff.md).
1. Re-run `bridge.aulink` usage comparison after the semantic-runtime TemplateCompilerService refactor.
   Inspect `usage-comparison`, `member-surface`, and `usage-consumers` for `TemplateCompiler`, `IAttributeParser`,
   `IBindingCommandResolver`, `Rendering`, and `Container`.
2. Add a bridge/API responsibility grain if the next probe still has to infer whether a product method is implemented by
   a mirror service, materializer, pass, or unmodeled product obligation. Evidence surfaces:
   [../source/semantic-surface/README.md](../source/semantic-surface/README.md),
   [api-usage.ts](api-usage.ts), and
   [../inquiry/runtime/bridge-aulink-usage.ts](../inquiry/runtime/bridge-aulink-usage.ts).
3. Keep `framework.composition:emulation` as the compact semantic-runtime obligation map, but avoid encoding the final
   semantic-runtime ontology there. If semantic-runtime product metadata or auLink evidence can carry the bridge, use
   that instead.
4. Before adding cache/warmup, profile the live query with `product.architecture:profile` or
   `pnpm --filter @aurelia-ls/atlas profile:product-architecture`. Compare structure, core, symbol, and full lanes; if
   a derived row family is repeatedly slow, ask whether it should become a stable atom producer with exact row keys.
5. Current semantic-runtime cleanup pressure from `pressure:product-architecture` is a deliberate multi-area thread:
   `di/world-constructor.ts`, `router/route-tree-materialization.ts`, expression scanner/interpolation/completed-input
   parser substrate, and repeated catalog/local-key helpers. Use Atlas to inspect source architecture, call flow,
   auLink/framework anchors, and provenance before refactoring; the goal is conceptual compression around framework
   semantics, not line-count reduction or a rushed helper extraction.
6. Keep docs tight. If this workbench starts accumulating file-by-file implementation descriptions again, move stable
   ownership into the relevant README and leave only active pressure plus evidence pointers here.

## Verification Notes

- Run `pnpm --filter @aurelia-ls/atlas build` after substrate or runtime changes.
- Run `pnpm --filter @aurelia-ls/atlas smoke` before handing off a coherent Atlas milestone.
- Run `pnpm --filter @aurelia-ls/atlas orient` after source changes before trusting daemon orientation.
- Re-run `pnpm --filter @aurelia-ls/atlas report:framework-emulation` before treating
  [../../workbench/emulation-symbols.md](../../workbench/emulation-symbols.md) counts or rows as evidence.
