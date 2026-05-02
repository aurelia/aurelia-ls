# runtime

`runtime` executes inquiry contracts against an in-memory world.

This is not a compatibility layer for old readers and not the default caller surface. It is the package-local implementation workbench used by the durable session daemon.

## Responsibilities

- [world.ts](world.ts) owns the static in-memory contract world.
- [engine.ts](engine.ts) validates and answers inquiries against that world.
- [api.ts](api.ts) exposes the in-memory inquiry API used inside the daemon.
- [lenses.ts](lenses.ts) contains implemented in-memory lenses over static contracts.
- [self-analysis.ts](self-analysis.ts) builds the source-backed substrate behind `atlas.self`. It indexes Atlas enum
  axes, grouped string literals, structural row surfaces, relationship-axis surfaces, class/function declaration
  surfaces, mapper/parallel-axis pressure rows, lens implementation paths, projection branches, continuation objects,
  continuation helper calls, module dependencies, and index/cache provenance through the hot TypeScript Program.
  `atlas.self` exposes these as compact projections with source continuations; full source-project package details
  stay opt-in so self-maintenance queries do not flood the caller. Projection branch rows are observational: an
  unobserved projection may be handled by a default branch or pre-switch logic, so callers should treat it as a
  follow-up prompt rather than a failure.
  Prefer named classes for substantial analyzers, builders, graphs, classifiers, registries, and caches. `atlas.self`
  can now inspect class and function surfaces directly, so future refactors should leave stable TypeScript shapes that
  the API can navigate without source-reading fallback.
- [ts-lenses.ts](ts-lenses.ts) adapts the hot TypeScript source substrate and LanguageService into `ts.source`,
  `ts.structure`, and `ts.type` answers, including IDE primitives and read-only TypeScript edit plans.
  `ts.structure:document-symbols` supports exact query filtering and its source continuations use the whole symbol
  span, so callers can jump from a method/class row directly to the implementation body without opening files.
- [bridge-lenses.ts](bridge-lenses.ts) adapts product bridge substrates such as `bridge.aulink` into exact inquiry
  answers. `bridge.aulink` now uses the daemon-prewarmed bridge index so exact product-to-framework target reads are
  cheap after startup.
- [framework-lenses.ts](framework-lenses.ts) is now a compatibility facade. The actual inquiry work is split across
  discovery, compiler, and rendering answerers, entity catalogs, bundle readers, rendering syntax/instruction/binding
  phases, evidence builders, filters, and continuation families. Keep new framework semantics in the narrowest phase
  module that owns them; use facade files only to preserve stable import surfaces.
- [framework-cache.ts](framework-cache.ts) owns runtime cache policy for expensive framework atoms. Its producer
  versions hash the participating recognition modules, not just the cache wrapper. Entity catalog producer versions are
  catalog-scoped so syntax-recognition edits do not invalidate unrelated resource/export/observer caches; bundle
  admission keeps its own producer version because it spends evaluator association logic.
- [framework-di-lenses.ts](framework-di-lenses.ts) exposes the first relationship-atom lens, `framework.di`. It reads
  DI relationship atoms from `framework/di-index.ts` and keeps keys, registrations, provider/alias targets, lookups,
  and materialization mechanics navigable without folding those phases into the discovery catalog.
- [framework-materialization-lenses.ts](framework-materialization-lenses.ts) spends DI provider atoms into first-pass
  materialization routes. It closes exact provider expressions and constructable/instance/alias seeds, while carrying
  callback-provider return/value closure as explicit evaluator seams. Callback provider routes now also spend evaluator
  invocation effects into exact container dependency rows for calls such as `handler.get(...)` and `handler.has(...)`,
  classify those dependency rows by direct/guarded/fallback/repeated/deferred policy, and expose graph rows that
  separate "key materializes through provider", "key enters runtime existence here", and "key depends on dependency
  key". It also exposes resource instantiation rows that join resource carriers to runtime/compiler/evaluator
  materialization sites for view-model construction, expression-resource lookup/application, binding-command build, and
  resource-kind DI registration/lookup.
- [framework-resource-lenses.ts](framework-resource-lenses.ts) exposes `framework.resources`. It converges resource
  carriers with public package exports, evaluated bundle admissions, syntax products, and materialization lanes without
  claiming final container/template visibility. Use it when the question starts from "which resource is this and what
  evidence lanes does Atlas already know?" instead of from DI, admission, rendering, or lifecycle.
- [framework-compiler-lenses.ts](framework-compiler-lenses.ts) exposes `framework.compiler`. It projects
  binding-command `build(...)` and instruction-factory instruction production into compiler relationship atoms, then
  continues into rendering dispatch and controller creation rows for the produced instruction by instruction name so
  template-compiler producers can cross into runtime-html renderers.
- [framework-rendering-controllers.ts](framework-rendering-controllers.ts) indexes renderer hydration rows that
  construct resource view models, create child controllers with `Controller.$el` / `Controller.$attr`, recursively
  dispatch child property instructions, invoke template-controller link hooks, and admit children back to the parent
  controller. This is the source-backed bridge from resource construction into controller lifecycle without flattening
  recursive rendering into fake closure.
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
  renderer controller-creation and child-admission rows, using shared lifecycle lane axes from the framework substrate.
- [framework-observation-lenses.ts](framework-observation-lenses.ts) exposes `framework.observation`. It joins the
  observer/reactivity entity catalog with binding observer/accessor lookup rows, binding observation setup overrides,
  observation subsystem surface/flow rows, flow-to-entity links, and normalized observation relationships derived from
  rendering plus observer-locator internals. Narrow page projections intentionally compute only their own row family;
  use `summary` when the full observation rollup is worth paying for.
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

The first runtime lenses answer only contract-world questions. Thick TypeScript, product, and framework substrates plug
into this layer by satisfying the same inquiry and answer contracts. Runtime continuations may carry route claims from
the inquiry navigation grammar so repeated local moves can be promoted into boot-time indexes instead of staying hidden
in lens implementation code. Route claims can also carry `basisTransition` metadata when a concrete continuation has
source-backed reason to change epistemic footing; static product or framework handoff catalogs do not belong here.
