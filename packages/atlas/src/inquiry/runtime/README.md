# runtime

`runtime` executes inquiry contracts against an in-memory world.

This is not a compatibility layer for old readers and not the default caller surface. It is the package-local implementation workbench used by the durable session daemon.

## Responsibilities

- [world.ts](world.ts) owns the static in-memory contract world.
- [engine.ts](engine.ts) validates and answers inquiries against that world.
- [api.ts](api.ts) exposes the in-memory inquiry API used inside the daemon.
- [lenses.ts](lenses.ts) contains implemented in-memory lenses over static contracts.
- [self-analysis.ts](self-analysis.ts) builds the source-backed substrate behind `atlas.self`. It indexes grouped
  string literals, structural row surfaces, relationship-axis surfaces, class/function declaration surfaces,
  mapper/parallel-axis pressure rows, lens implementation paths, projection branches, continuation objects,
  continuation helper calls, declared framework semantic routes, module dependencies, and substrate surface rows
  through the hot TypeScript Program. [self-enums.ts](self-enums.ts) owns the Atlas-facing enum, value-space, and
  mapping rows projected from the package-scoped TypeScript enum usage index. [self-strings.ts](self-strings.ts) owns
  literal occurrence roles and contract-bearing string classification. Keep enum and string ontology work in those
  modules unless it needs to join across broader Atlas surfaces.
  Lens reachability follows same-file calls and exact named imports, which keeps fact ownership inspectable without
  fuzzy global name matching.
  `atlas.self` exposes these as compact projections with source continuations; full source-project package details
  stay opt-in so self-maintenance queries do not flood the caller. Projection branch rows are observational: an
  unobserved projection may be handled by a default branch or pre-switch logic, so callers should treat it as a
  follow-up prompt rather than a failure. Contract rows also carry declared parameter ids and coherence facts with
  interpretation space plus next inquiries; use those facts to decide whether a smell is a duplicate axis, a wrong
  layer, or a missing primitive rather than turning every pressure signal into an auto-running check.
  `atlas.self` is not intended to judge architecture for the caller. It should expose exact rows, stable source
  continuations, and small composition aids; strategic decisions still come from reading the surrounding code and
  deciding which primitive should exist.
  Prefer named classes for substantial analyzers, builders, graphs, classifiers, registries, and memos. `atlas.self`
  can now inspect class and function surfaces directly, including line-count, method-count, and property-count pressure
  filters for class rows plus line-count, direct-call-count, and unique-call-target-count pressure filters for function
  rows, so future refactors should leave stable TypeScript shapes that the API can navigate without source-reading
  fallback.
- [ts-lenses.ts](ts-lenses.ts) adapts the hot TypeScript source substrate and LanguageService into `ts.source`,
  `ts.structure`, and `ts.type` answers, including IDE primitives and read-only TypeScript edit plans.
  `ts.type:call-sites` supports exact callee and runtime-argument filters (`argumentText`, `argumentSymbolName`,
  `argumentFullyQualifiedName`) so higher semantic lenses can preserve call precision when they hand off to raw
  TypeScript facts.
  `ts.structure:document-symbols` supports exact query filtering and its source continuations use the whole symbol
  span, so callers can jump from a method/class row directly to the implementation body without opening files.
- [bridge-lenses.ts](bridge-lenses.ts) adapts product bridge substrates such as `bridge.aulink` into exact inquiry
  answers. `bridge.aulink` reads a source-project-scoped bridge index on demand so exact product-to-framework target
  reads stay cached within the current source epoch without daemon startup warmup.
  [bridge-aulink-lens-support.ts](bridge-aulink-lens-support.ts) owns the common bridge basis, route, and source-hop
  primitives; [bridge-aulink-usage-lenses.ts](bridge-aulink-usage-lenses.ts) owns the `usage-comparison`,
  `member-surface`, `usage-members`, `usage-consumers`, and `usage-sites` answer families. Keep new bridge detail
  families near the substrate they spend, and keep `bridge-lenses.ts` focused on base auLink
  catalog/anchor/target/gap/mirror routing. `usage-comparison` supports pressure-oriented `orderBy` values such as
  `frameworkUsageCount`, `productUsageCount`, `memberDivergence`, `publicMemberDivergence`,
  `publicFrameworkOnlyMemberNameCount`, `publicProductOnlyMemberNameCount`, and `usageImbalance` so broad
  framework/product shape questions can start from
  the largest exact rows instead of alphabetical lookup order; compact comparison rows also report public shared,
  framework-only, product-only, and divergence member counts for that rank signal. `member-surface` rows carry
  declaration-kind and access-kind counts and accept `memberAccess`, side-specific `frameworkMemberAccess` /
  `productMemberAccess`, and `memberDeclarationKind` filters so API shape questions can be separated from private
  implementation churn and data-record fields. Use `frameworkScopeMode: "direct"` when only the directly linked
  framework subject should count, `frameworkScopeMode: "subject"` when inherited shape subjects should count, or the
  default implementation scope when the full implementation-shaped contract is the question.
  `bridge.aulink:mirror` also accepts `hasRoleEvidence`, `hasEmulationObligations`, and pressure-oriented `orderBy`
  values such as `roleEvidence`, `emulationObligation`, and `mirrorPressure`. Use those before reading source when
  you need to distinguish well-grounded framework anchors from auLink placements that still lack semantic evidence.
- [product-vocabulary-analysis.ts](product-vocabulary-analysis.ts) and
  [product-vocabulary-lenses.ts](product-vocabulary-lenses.ts) expose `product.vocabulary`. They walk the
  semantic-runtime vocabulary package through the hot TypeScript Program, then return the declared catalog, exact
  definition/key usages, claim predicate signatures, and product-kind adjacency expanded from those signatures. Keep
  this lens algebra-oriented: product-specific pressure belongs in the product model and in maintainer judgment, not in
  hard-coded Atlas cleanup checks.
- [product-architecture-analysis.ts](product-architecture-analysis.ts) and
  [product-architecture-lenses.ts](product-architecture-lenses.ts) expose `product.architecture`. They walk
  `packages/semantic-runtime/src` through the hot TypeScript Program and return source areas, modules, declarations,
  exact import rows, grouped area-to-area dependency rows, strongly-connected import cycle rows, class surfaces, and
  function/method/constructor/accessor surfaces. It resolves semantic-runtime call/constructor invocations as
  `call-sites` and groups them into `call-dependencies`, then separately resolves identifier usages as
  `symbol-references` and `symbol-dependencies`, with `usageFamily` filters for import/export, type, value, call, or
  runtime-side coupling. Module, declaration, cycle, class, function, call, and symbol dependency rows support
  `orderBy` for size and coupling triage, and class rows support `minMethodCount` / `minPropertyCount` filters for
  large-class pressure. Projection cost is intentionally visible: `summary`, `symbol-references`,
  and `symbol-dependencies` spend the full symbol-backed memo, while row projections such as `functions`,
  `call-sites`, and `call-dependencies` use the lighter core memo and omit rollup counts that would pretend symbol
  rows had been built. `areas`, `modules`, `dependencies`, `area-dependencies`, `declarations`, `cycles`, and
  `classes` use the no-call-site structure lane; `functions`, `call-sites`, and `call-dependencies` use the
  call-site lane; symbol projections use the symbol lane. The `profile` projection accepts `includeCallSites` and
  `includeSymbols` so future profiling can separate those costs. Use `profile` or
  `pnpm --filter @aurelia-ls/atlas profile:product-architecture` before adding cache, warmup, or split points; the
  current cold pressure tends to sit in checker call-site rows and checker symbol reference rows. Source-file,
  source-range, symbol-with-file, semantic-runtime package, and semantic-runtime repo-area loci now scope rows the same
  way as an explicit `pathPrefix`, including exact participant-file filtering for `area-dependencies`, so
  continuations and direct file probes do not need to rediscover the path filter.
  Use this lens when semantic-runtime architecture or refactor pressure would otherwise require source spelunking; it
  is a visibility substrate, not an automated judgment about which dependencies are good or bad.
- [framework-compiler-products.ts](framework-compiler-products.ts) owns compiler relationship atoms derived from both
  instruction-producing syntax products and source-backed TemplateCompiler compile-flow/attribute-classification rows.
  This keeps actors such as `CompilationContext` and `AttrSyntax` visible in the auLink mirror as framework
  relationships instead of only as derived emulation obligations.
- [framework-expression-relationships.ts](framework-expression-relationships.ts) and
  [framework-structural-relationships.ts](framework-structural-relationships.ts) lift framework catalog entity rows
  into relationship evidence for the auLink mirror and composition graph. They intentionally model definition/catalog
  grounding (`defines-expression`, `defines-observer`, `defines-rendering-structure`, and `defines-router-entity`)
  rather than pretending those entities have DI, hydration, or lifecycle behavior when the lower-level substrates have
  not exposed that behavior yet.
- [framework-lenses.ts](framework-lenses.ts) is now a compatibility facade. The actual inquiry work is split across
  discovery, compiler, and rendering answerers, entity catalogs, bundle readers, rendering syntax/instruction/binding
  phases, evidence builders, filters, and continuation families. Keep new framework semantics in the narrowest phase
  module that owns them; use facade files only to preserve stable import surfaces. Rendering/binding row projections
  are owned by `framework.rendering`, while `framework.discovery` stays focused on seed/package/resource/bundle/entity
  catalogs.
- [framework-continuation-core.ts](framework-continuation-core.ts) owns the shared continuation primitives for
  framework answers. `FrameworkRouteEndpoint` names the stable lens/projection endpoint,
  `FrameworkSemanticRouteSpec` names the declared semantic route topology, and `FrameworkSemanticRouteBuilder`
  materializes row-local continuations with filters, evidence, and rationale. Use these for repeated framework
  row-to-lens hops so route meaning is declared once instead of rebuilt as inline object literals.
  `projectionContinuation` and `nextPageContinuation` own generic framework projection/page moves; pass basis,
  evidence, priority, and route summary through options rather than cloning local helper functions.
  `FrameworkRowContinuationBuilder` owns repeated row-local source, type-facts, call-site, and evaluator-effect
  inspection moves. Prefer it over hand-written `TsSource`/`TsType` continuation objects so Atlas can continue to
  inspect those moves through `atlas.self:continuations`.
- [framework-route-catalog.ts](framework-route-catalog.ts) declares the current framework semantic endpoints and route
  specs. `atlas.self:semantic-routes` reads this catalog directly; `atlas.self:continuations` reads call sites that
  instantiate these specs. Add new route specs here when a semantic hop repeats across admission, rendering, lifecycle,
  observation, resources, or materialization.
- [framework-composition-lenses.ts](framework-composition-lenses.ts) exposes `framework.composition`. It projects
  auLink anchors and framework relationship rows into the shared `SemanticClaim` answer algebra, so class/interface
  actors such as `Container`, `TemplateCompiler`, or `Controller` can be inspected as induced signed graphs rather than
  as manual hops across bridge, DI, compiler, rendering, lifecycle, and observation projections.
- [framework-emulation-view.ts](framework-emulation-view.ts) derives `framework.composition:emulation` from existing
  framework substrates. It is a semantic-runtime obligation map, not a product implementation model: rows say which
  framework behavior must be covered by ECMAScript evaluation, a semantic-runtime emulator, template-controller
  virtualization, or TypeChecker handoff, then continue back to the exact DI/resource/compiler/rendering projection
  that owns the evidence.
- [framework-emulation-report.ts](framework-emulation-report.ts) renders the deterministic Markdown eyeball golden
  behind `createApi().frameworkEmulationSymbolsReport()` and
  `pnpm --filter @aurelia-ls/atlas report:framework-emulation`. Keep the report as a view over
  `framework.composition:emulation` and `framework.observation:entities` substrates rather than giving it its own
  ontology; changes should make the underlying rows clearer first, then let the report expose the new shape.
- [framework-api-lenses.ts](framework-api-lenses.ts) exposes `framework.api`. It keeps public/module API subjects,
  implementation shapes, member slots, source declarations, raw usage sites, and `usage-consumers` owner groups
  separate. Usage rows also carry compact call-shape facts for call usages, so filters such as `callArgumentSymbolName`
  can localize edges like `Container.get(ITemplateCompiler)` before the caller opens raw source. Use `usage-consumers`
  as the compact owner map before opening large API usage pages; bridge owner rows can jump into this projection for
  framework-side context.
- [framework-di-lenses.ts](framework-di-lenses.ts) exposes the first relationship-atom lens, `framework.di`. It reads
  DI relationship atoms from `framework/di-index.ts` and keeps keys, registrations, provider/alias targets, lookups,
  and materialization mechanics navigable without folding those phases into the discovery catalog.
- [framework-di-graph.ts](framework-di-graph.ts) lifts those atoms plus materialization routes into a typed DI graph.
  The graph layers follow semantic-runtime's DI emulator boundary: admission, container state, lookup, resolution,
  materialization, and dependency. Use `framework.di` projection `graph` for edge navigation and `dag` for the
  SCC-collapsed key dependency view. Do not treat arbitrary lookup arguments as closed DI keys; graph rows preserve
  those as `key-expression` nodes until a source/checker fact closes their identity.
- [framework-materialization-lenses.ts](framework-materialization-lenses.ts) spends DI provider atoms and concrete
  StandardConfiguration DI-world slots into first-pass materialization routes. It closes exact provider expressions and
  constructable/instance/alias seeds, while carrying callback-provider return/value closure as explicit evaluator seams.
  Callback provider routes now also spend evaluator invocation effects into exact container dependency rows for calls
  such as `handler.get(...)` and `handler.has(...)`; DI-world routes carry provider dependency rows from spent
  registrations such as `getAll(IRenderer)` and renderer `container.invoke(...)`. These rows separate "key
  materializes through provider", "key enters runtime existence here", and "key depends on dependency key".
  Materialization route rows also carry `providerIdentity`, which separates concise graph/display names from raw
  provider endpoint text for anonymous callback/class/object expressions. It also exposes resource instantiation rows
  that join resource carriers to runtime/compiler/evaluator
  materialization sites for view-model construction, expression-resource lookup/application, binding-command build,
  resource-kind DI registration/lookup, and singleton runtime renderer registration.
- [framework-resource-lenses.ts](framework-resource-lenses.ts) exposes `framework.resources`. It converges resource
  carriers with public package exports, evaluated bundle admissions, syntax products, and materialization lanes without
  claiming final container/template visibility. Its materialization, admission, and syntax-product route hops use the
  shared framework semantic route primitive. Use it when the question starts from "which resource is this and what
  evidence lanes does Atlas already know?" instead of from DI, admission, rendering, or lifecycle. Convergence evidence
  uses the exact resource carrier span as its primary source, such as a static `$au` initializer, resource `define`
  call, decorator, attribute-pattern create call, or renderer helper call. Rows also carry a separate declaration-source
  continuation when the backing class/export header is a different span.
- [framework-compiler-lenses.ts](framework-compiler-lenses.ts) exposes `framework.compiler`. It projects
  binding-command `build(...)` and instruction-factory instruction production into compiler relationship atoms, then
  continues into rendering dispatch and controller creation rows for the produced instruction by instruction name so
  template-compiler producers can cross into runtime-html renderers.
  [framework-compiler-products.ts](framework-compiler-products.ts) owns the compiler product/relationship substrate
  used by both the compiler lens and cross-phase flow corridors; keep instruction-production facts there rather than
  coupling graph composition to the answerer.
- [framework-rendering-syntax.ts](framework-rendering-syntax.ts) owns the shared source syntax-product scan, but public
  lenses split the result by semantic phase. Compiler instruction production (`builds-instruction` and
  `emits-instruction`) feeds `framework.compiler`; rendering syntax products (`handles-instruction` and
  `creates-binding`) feed `framework.rendering:syntax-products`. Resource convergence routes binding-command resources
  to compiler products and renderer resources to rendering syntax products, avoiding a single `syntax-products`
  projection that means both "compiled instruction producer" and "runtime renderer product."
- [framework-rendering-controllers.ts](framework-rendering-controllers.ts) indexes renderer hydration rows that
  construct resource view models, create child controllers with `Controller.$el` / `Controller.$attr`, recursively
  dispatch child property instructions, invoke template-controller link hooks, and admit children back to the parent
  controller. This is the source-backed bridge from resource construction into controller lifecycle without flattening
  recursive rendering into fake closure. Public `controller-creations` rows expose an ordered `hydrationSteps` trace so
  semantic-runtime controller/view-factory/synthetic-view modeling can be compared to the actual framework handoff
  sequence before opening raw `renderer.ts` source.
- [framework-rendering-hydration-flow.ts](framework-rendering-hydration-flow.ts) owns the compact resolved-runtime
  hydration corridor. It is not a second rendering graph; it is a source-backed entry map from `AppRoot` and
  `Controller` through `Rendering.compile`, `Rendering.render`, renderer-table materialization, renderer-side
  `find`/`invoke`/controller creation, binding admission, lifecycle hooks, and observation setup. The broad
  `framework.rendering:hydration-flow` answer should remain small and navigable, then continue into detailed
  `controller-creations`, `instruction-dispatches`, `binding-admissions`, compiler, lifecycle, DI, resource, and
  observation projections when the caller asks for more. The compiler hand-off is route-backed in both directions:
  hydration rows can localize the `Rendering.compile` / `TemplateCompiler.compile` source of a compiled definition,
  and compile-flow rows that produce definitions or instruction rows can return to hydration-flow by target kind.
  The default answer is an overview; it reports total corridor rows separately so callers can see that detail rows are
  available through filters such as `operation`, `targetKind`, `ownerName`, or `methodName`. Binding-admission rows in
  hydration-flow are projected from `binding-admissions`, so filtered binding reads are complete even though the default
  overview only keeps a small bridge row.
- [framework-rendering-consequences.ts](framework-rendering-consequences.ts) owns the compact renderer consequence
  view behind hydration. It derives from normalized rendering relationship atoms rather than scanning source again, and
  names the runtime consequences of dispatch as `instruction-dispatch`, `controller-creation`,
  `child-controller-admission`, `binding-production`, `binding-admission`, `observer-lookup`,
  `observation-setup`, and binding/lifecycle effect rows. The default answer is an overview with per-kind quotas and
  total counts; filtered reads open the full consequence set and row-local continuations jump into the heavy detail
  families only when needed. Emulation rows should lift `consequenceKind` into their domain `targetKind`; do not leak
  relationship endpoint kinds such as `symbol`, `method`, or `expression` into the semantic-runtime worklist.
  Render-consequence rows expose those source-level categories as `actorEndpointKind` and `targetEndpointKind`.
- [framework-rendering-public-rows.ts](framework-rendering-public-rows.ts) owns compact public answer rows for
  historically heavy rendering detail projections. `syntax-products`, `instruction-slots`, `instruction-dispatches`,
  `controller-creations`, `binding-products`, and `binding-admissions` still use the full internal index rows for
  continuations, evidence source ranges, and relationship derivation, but their public value/evidence payload is now a
  stable summary shape. Keep this split: the public projection should be a token-cheap jump surface, while
  source/type/detail continuations provide the expensive nested checker facts only when a caller asks for them.
- [framework-rendering-relationships.ts](framework-rendering-relationships.ts) derives normalized rendering
  relationship rows from the existing rendering catalogs, including controller creation rows. It is intentionally a
  relationship projection over catalog atoms, not a second scanner. Continuations from those rows should prefer
  semantic hops first and only use source/type inspection when the next useful lens is not known yet.
- [framework-lifecycle-lenses.ts](framework-lifecycle-lenses.ts) exposes `framework.lifecycle`. It joins controller
  lifecycle method/call sites, binding lifecycle effects, and resource materialization phases into a separate lifecycle
  view instead of pushing controller activation or expression-resource behavior into the rendering lens. Controller
  call rows keep self-lifecycle, child-controller, binding-list, state-gate, and teardown lanes separate. AppTask rows
  keep AppRoot slot invocation, `IAppTask` collection lookup, slot filtering, and `task.run()` execution separate from
  configuration-time AppTask admission. Hook dispatch rows keep direct view-model hook calls, registered hook collection
  dispatch, and registered hook helper callback invocation separate. Child-controller activation rows continue back to
  renderer controller-creation and child-admission rows through shared semantic route facts, using shared lifecycle lane
  axes from the framework substrate.
- [framework-observation-lenses.ts](framework-observation-lenses.ts) exposes `framework.observation`. It joins the
  observer/reactivity entity catalog with binding observer/accessor lookup rows, binding observation setup overrides,
  observation subsystem surface/flow rows, flow-to-entity links, and normalized observation relationships derived from
  rendering plus observer-locator internals. Binding lookup and flow-to-entity semantic hops are emitted through
  declared semantic route specs with explicit source/checker basis. Narrow page projections intentionally compute only their
  own row family; use `summary` when the full observation rollup is worth paying for.
- [framework-observation-internals.ts](framework-observation-internals.ts) indexes source-backed observation machinery:
  `ObserverLocator`, `NodeObserverLocator`, dirty-checking, collection helper functions, observer cache access, and
  connectable subscribe/unsubscribe mechanics. It also records watcher/effect surfaces around `@watch`,
  the `Watch` registry, CE/CA resource watch metadata merges, `createWatchers`, `ComputedWatcher`,
  `ExpressionWatcher`, `Observation`, private effect runners, and slot watchers, including parser/access-scope branches
  and dependency-collection entry/exit points. It can associate internal flow-site targets with public `runtime` and
  `runtime-html` observer entity rows through explicit match bases. It is an internal relationship producer, not a
  replacement for the public observer entity catalog.
- [framework-admission-lenses.ts](framework-admission-lenses.ts) turns evaluator-derived bundle/configuration
  associations into first-class `framework.admission` relationship rows. It keeps the admission relation, mechanism,
  phase, original association kind, evaluator certainty, source bundle, and admitted target separate on the shared
  framework relationship axes so callers can jump from configuration into DI keys, resources, registry exports,
  catalogs, factories, and AppTasks without expanding raw evaluator output. The `materializations` projection bridges
  admitted DI keys and resources to visible DI/resource runtime-existence rows while preserving admission source,
  materialization source, match basis, and closure separately. The `world-formation` projection then joins those
  materialization links and AppTask lifecycle execution rows while preserving registry, catalog, factory, argument,
  and unknown admissions as explicit admission-only or open boundaries. Its broad summary intentionally returns a
  cheap orientation and asks for `packageId` or `exportName` before paying the cold all-package bundle cost.
- [framework-admission-flow.ts](framework-admission-flow.ts) composes one configuration or bundle root through
  admission relationships, catalog expansion, registry body expansion, DI materialization routes, and resource
  convergence roles. Use `framework.admission` projection `flow` when the question is "what world does this
  configuration form?" rather than "show me one row family." `flow` is a cheap graph rollup; follow `flow-edges`,
  `flow-nodes`, or explicit `flow-edge-details` continuations when the rollup proves the detailed rows are worth the
  token cost. Compact edge pages should route to `flow-edge-details` before offering per-edge source inspection, so
  source continuations do not dominate first-pass graph browsing. The graph is derived from exact admission, bundle,
  materialization, and resource substrates; it should expose gaps as missing or open edges rather than hand-ranking
  framework importance. Flow uses `packageId` and
  `exportName` as root-admission scope, then follows admitted values into DI keys, provider dependency reads, and
  recursively materialized dependency providers before applying graph filters such as `targetName`, `key`, `nodeKind`,
  `edgeKind`, `role`, `resourceKind`, and `query`. Dependency edges are provider-to-key facts with `ownerKey` metadata
  so multi-provider roles like `IRenderer` stay analyzable without pretending the DI key itself owns every constructor
  dependency.
  Flow also accepts `corridor: "jit-compiler"` for the compiler-only slice of a configuration world. That corridor
  keeps compiler-relevant resource-definition roles, TemplateCompiler/binding-command materialization and dependency
  edges, and source-backed compiler instruction-production edges. It intentionally does not pull renderer dispatch or
  controller hydration into the same view; `framework.rendering:hydration-flow` owns that resolved-runtime corridor.
  The JIT corridor distinguishes compile-time `find`/definition lookup from `get`/`invoke` materialization pressure:
  custom elements, custom attributes, and template controllers stay visible as compiler definition lookups, while their
  view-model construction and hydration dependencies are outside this corridor.
- `framework.di:dependencies` separates exact DI dependency edges from variable-carried key/type reads. Exact rows have
  a stable `dependencyKey` such as an `InterfaceSymbol` or module-level class; variable rows preserve
  `FrameworkDiVariableKeyRef` (`handlerInfo.type`, `comp`, `def.Type`, etc.) with checker type and source. Lenses and
  reports should keep this split visible so variable carrier names do not masquerade as DI keys or drive recursive DI
  closure.
- `framework.composition:emulation` marks TypeChecker handoff rows with
  `interpretationStatus: "provisional-typechecker-handoff"`. These rows are source-backed boundaries into future
  semantic-runtime binding/reactivity work, not a complete behavior graph. Avoid filling missing renderer peer rows by
  hand unless a first-class binding/reactivity handoff substrate exists to own that taxonomy. Handoff interpretation is
  also depth-sensitive: root/controller-owned binding materialization may be deterministic, while bindings under
  template-controller synthetic views can remain speculative because the owning controller realization is speculative.
- [framework-jit-compiler-corridor.ts](framework-jit-compiler-corridor.ts) names the StandardConfiguration /
  TemplateCompiler corridor affordance shared by admission-flow and compiler continuations. The route catalog declares
  both directions: JIT flow rollups can jump to TemplateCompiler instruction products, and compiler summaries or
  TemplateCompiler rows can jump back to the focused JIT flow slice. Rendering instruction dispatch/syntax rows can
  also navigate back to compiler instruction products, closing the compiler-to-rendering path without merging rendering
  into the JIT corridor.
- [framework-compiler-flow.ts](framework-compiler-flow.ts) keeps TemplateCompiler compile-flow separate from
  `_classifyAttributes` detail. `framework.compiler:compile-flow` is the high-level compiler stage map across
  `compile(...)`, `compileSpread(...)`, node/element compilation, local elements, projections, attribute reordering,
  custom-attribute bindables, multi-bindings, and instruction assembly; it should answer "where am I in compilation?"
  without expanding every attribute branch. Broad flow uses overview rows, while `methodName` and `compileStage`
  filters expose method-local detail. `framework.compiler:attribute-classification` owns the detailed branch taxonomy,
  including find/get/build/emit/error roles plus instruction-product and resource-convergence continuations. The
  compiler summary should remain a rollup and point into these projections instead of embedding row samples.

Runtime lenses answer through the same inquiry and answer contracts whether they spend static contract rows, TypeScript
facts, product vocabulary, bridge anchors, or framework substrates. Runtime continuations may carry route claims from
the inquiry navigation grammar so repeated local moves can be promoted into named substrate indexes instead of staying
hidden in lens implementation code. Route claims can also carry `basisTransition` metadata when a concrete continuation
has source-backed reason to change epistemic footing; static product or framework handoff catalogs do not belong here.
