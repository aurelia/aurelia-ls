# Atlas Framework Workbench

This file is for long-running Atlas framework discovery notes that must survive compaction. Keep it current when a
new thread of work opens, closes, or changes shape.

## Current Direction

Atlas should first become able to index and navigate the Aurelia framework itself. The forcing function is an
Aurelia-wide dependency graph built from exact source, TypeChecker, evaluator, and explicit open-seam evidence:

- exported DI interface symbols, including direct and indirect `DI.createInterface(...)` return values
- exported resources: custom elements, custom attributes, template controllers, value converters, binding behaviors,
  binding commands, attribute patterns, and runtime renderers
- configuration and registry bundles discovered by evaluating exported values and associating them with DI keys,
  resources, registrations, app tasks, renderers, and option contributions
- framework flows from `Aurelia.app(...)` / `Aurelia.register(...)` through container registration, AppTasks,
  compiler-world formation, compilation, rendering, controller lifecycle, binding, scope, and reactivity setup

Do not hard-code names such as `StandardConfiguration` as semantic truth. Discover them as evaluated bundles over
previously indexed atoms.

This is not a linear feature queue. General refactoring, taxonomy/inquiry algebra refinement, performance work, and
Atlas self-analysis capabilities are in scope whenever the current implementation creates friction, repeated work,
compensatory aliases, or unclear ontology.

## Active Substrates

- `framework.discovery` can list admitted Aurelia package exports and structurally detect exports with registry-like
  members such as `register`, `customize`, `init`, `withStore`, and `withChild`.
- `framework.discovery` now emits `framework.evaluator` continuations for registry exports with a concrete
  non-interface target.
- `framework.evaluator` has an initial static invocation/effect tracer. It reports exact TypeChecker-backed call
  sites, receiver facts, argument facts, lexical binding flow, root parameters, factory captures, and open seams.
- The evaluator can trace factory-produced registry values such as `createDialogConfiguration(...).register(...)` by
  following a local factory call into returned object-literal methods and carrying captured factory arguments into the
  returned method body.
- Deferred callback effects are represented separately from unconditional method-body effects. AppTask callbacks and
  similar callback arguments should remain deferred until a lifecycle/materialization pass spends them.
- `framework.discovery` has a public `di-interfaces` projection for Aurelia package entrypoint exports whose source
  carrier is a direct or indirect `DI.createInterface(...)` product. It preserves the exact creation call and
  resolver-builder calls as TypeChecker-backed call-site rows.
- `framework.discovery` has a public `resources` projection for Aurelia package entrypoint exports that carry resource
  definition headers. It currently recognizes decorator, static `$au`, `.define(...)`, and
  `AttributePattern.create(...)` carriers and uses the TypeChecker to close string-literal and const-enum names.
- `framework.discovery` has a public `resource-carriers` projection for source-exported resource carriers independent
  of package publicness. It now recognizes decorator carriers, static `$au`, local helper-return `$au` objects whose
  return type exposes a literal `type`, `.define(...)`, direct static-block `defineAttribute(...)` /
  `defineElement(...)`, `AttributePattern.create(...)`, and runtime `renderer(class ...)` helpers.
- `framework.discovery` has a public `bundles` projection for evaluator-derived `register(...)` associations on
  registry/configuration exports. `runtime-html:StandardConfiguration` currently closes to DI interface registration,
  registry export registrations, catalog rows, resource registrations, syntax resources, and renderer registrations
  without residual `registration-argument` rows.
- Framework discovery indexing is now layered: seed anchor/flow rows are cheap and separate from call hierarchy/call
  site expansion. Export-name admission is also separate from richer export-surface rows so DI indexing can avoid
  formatting every barrel export type.
- The old `spine.ts`/`FRAMEWORK_DISCOVERY_SPINE` naming has been replaced with `discovery-seeds.ts` and
  `FRAMEWORK_DISCOVERY_SEEDS`. The seed contract is orientation material, not the ontology itself.
- The current seed-graph target is the framework-wide catalog of exported and wireable atoms: DI interfaces,
  source-level resource carriers, public resource exports, registry/configuration exports, and evaluated bundle
  admissions. This catalog is the base layer before deeper ontology work connects binding commands to instructions,
  instructions/renderers to bindings, bindings to observer-locator products, and so on.
- `framework.discovery` has a public `syntax-products` projection for the first layer below the resource/bundle seed
  graph. It scans source producers across admitted Aurelia packages and emits:
  - binding-command `build(...)` products, including constructor-returned instructions and object-literal instruction
    records typed by the TypeChecker
  - renderer `target`/`render(...)` instruction handling rows, including named `IInstruction` descendants such as
    `HydrateTemplateController` that do not end in `Instruction`
  - renderer binding-creation rows for `new *Binding(...)` and `*Binding.create(...)` products inside render bodies
  - instruction-factory object literals that emit instruction records outside binding-command `build(...)`, including
    compiler methods and SSR instruction translation
  - exact source/TypeChecker continuations for each row, plus jumps back to resource carriers and evaluated bundles
- `framework.discovery` has a public `instruction-slots` projection for runtime instruction discriminator constants.
  It joins source slot constants such as `itPropertyBinding`, numeric runtime values, instruction declarations whose
  `type` property references the slot, and syntax products that construct or handle the slot. Declaration-file rows
  from `dist/types` are intentionally excluded from this source-semantics scan.
- `framework.discovery` has a public `binding-products` projection for binding classes materialized by renderer
  syntax products or admitted through controller binding lists. It joins renderer construction products, exact
  `controller.addBinding(...)` / `renderingCtrl.addBinding(...)` admission edges, binding class declarations,
  constructor parameter surfaces, lifecycle-relevant methods, observer-locator constructor parameters,
  observer-locator call sites, and target-observer override methods such as `useTargetObserver` / `useAccessor`.
- `framework.discovery` has a public `binding-admissions` projection for exact controller binding-list admission
  edges. It recognizes inline `new *Binding(...)`, inline `*Binding.create(...)`, local variable construction, and
  factory collection elements such as `SpreadBinding.create(...).forEach(b => renderingCtrl.addBinding(b))`.
- `framework.discovery` has a public `binding-effects` projection for binding-class lifecycle and setup effects. It
  emits separate rows for lifecycle method declarations, observer/accessor lookups, event listener registration/removal,
  and subscription/unsubscription effects inside binding classes.
- `framework.rendering` is now the first split lens for the resource/instruction/rendering/binding corridor. Its
  summary currently reports 101 syntax products, 26 instruction slots, 23 instruction dispatch edges, 16 binding
  products, 21 admission edges, 92 binding effects, and 5 binding setup overrides.
- `framework.rendering` has a public `instruction-dispatches` projection that turns slot-to-renderer matching into
  explicit dispatch rows. This is now the direct bridge from emitted instruction discriminators into renderer behavior.
- `framework.rendering` has a public `binding-setups` projection for renderer/resource-side setup calls that alter
  binding observation behavior outside the binding class. It currently recognizes `useTargetObserver`, `useAccessor`,
  and `useTargetSubscriber`.
- Rest-package discovery now covers the non-`runtime-html` configuration/resource surfaces:
  - `dialog` configurations close to two DI registrations, one registry export registration, and one AppTask.
  - `i18n` expands nested `coreComponents(...)` into DI registrations, an AppTask, renderer/resource catalogs, and
    alias-sensitive dynamic binding-command/attribute-pattern registrations.
  - `router` expands the local `configure(...)` call into DI registrations, AppTasks, default component/resource
    catalogs, and the concrete `RouterOptions` registration helper.
  - `ui-virtualization` closes to collection/dom renderer registry exports plus `VirtualRepeat`.
  - `validation`, `validation-html`, and `validation-i18n` close their `Registration.*`, chained configuration,
    `registerFactory`, binding behavior, custom attribute, and dynamic custom element admissions.
- Full resource-carrier query after the rest-package pass: 91 rows total.
  - `runtime-html`: 48
  - `template-compiler`: 18
  - `i18n`: 13
  - `state`: 6
  - `router`: 3
  - `validation-html`: 2
  - `ui-virtualization`: 1
- Full DI interface export query after the rest-package pass: 90 rows total across dialog, expression-parser,
  fetch-client, i18n, kernel, router, runtime, runtime-html, state, template-compiler, ui-virtualization, validation,
  validation-html, and validation-i18n.
- Full syntax-product query after the first instruction-slot/factory pass: 101 rows total.
  - `i18n`: 9
  - `runtime-html`: 44
  - `state`: 6
  - `template-compiler`: 42
  - product lanes: 18 binding-command instruction-build rows, 23 renderer instruction-handler rows, 17 renderer
    binding-creation rows, and 43 instruction-factory emission rows
- Full instruction-slot query after the first slot pass: 26 rows total.
  - `template-compiler`: 21 core compiler/runtime-html instruction slots
  - `i18n`: 3 plugin instruction slots (`100`-`102`)
  - `state`: 2 plugin instruction slots (`120`-`121`)
  - every discovered slot has at least one syntax product after adding the instruction-factory lane
- Full instruction-dispatch query after the first rendering-lens split: 23 rows total.
  - `runtime-html`: 18
  - `i18n`: 3
  - `state`: 2
  - rows include `itPropertyBinding -> PropertyBindingRenderer`,
    `itInterpolation -> InterpolationBindingRenderer`,
    `itTranslation -> TranslationBindingRenderer`, and
    `itState -> StateBindingRenderer`
- Full binding-admission query after the first admission pass: 21 rows total.
  - `runtime-html`: 16
  - `i18n`: 1
  - `state`: 4
  - construction lanes: 13 inline `new`, 5 local variable, 3 factory collection element
- Full binding-product query after the first admission pass: 16 rows total.
  - `runtime-html`: 12 (`PropertyBinding`, `InterpolationBinding`, `ContentBinding`, `AttributeBinding`, `LetBinding`,
    `RefBinding`, `ListenerBinding`, `SpreadBinding`, `SpreadValueBinding`, `DevStylePropertyBinding`,
    `AuSlotWatcherBinding`, `ChildrenBinding`)
  - `i18n`: 1 (`TranslationBinding`)
  - `state`: 3 (`StateBinding`, `StateDispatchBinding`, `StateGetterBinding`)
  - every renderer-created or controller-admitted binding name has a source class row
  - three admitted lifecycle/decorator bindings currently have admission edges but no renderer construction products:
    `AuSlotWatcherBinding`, `ChildrenBinding`, and `StateGetterBinding`
- Full binding-effect query after the first effect pass: 92 rows total.
  - `runtime-html`: 55
  - `state`: 31
  - `i18n`: 6
  - effect lanes: 63 lifecycle methods, 5 observer/accessor lookups, 4 event listener operations, 20 subscriptions
  - this now exposes rows such as `PropertyBinding.bind -> observerLocator.getObserver/getAccessor`,
    `ListenerBinding.bind/unbind -> addEventListener/removeEventListener`, and
    `StateBinding.bind/useStore -> store.subscribe/unsubscribe`
- Full binding-setup query after the first rendering-lens split: 5 rows total.
  - `runtime-html`: 4
  - `validation-html`: 1
  - setup lanes: 3 target-observer, 1 accessor, 1 target-subscriber
  - rows include `InterpolationBindingRenderer.render -> InterpolationBinding.useAccessor(...)`,
    `PropertyBindingRenderer.render -> PropertyBinding.useTargetObserver(...)`,
    `AttrBindingBehavior.bind -> PropertyBinding.useTargetObserver(...)`,
    `UpdateTriggerBindingBehavior.bind -> PropertyBinding.useTargetObserver(...)`, and
    `ValidateBindingBehavior.bind -> PropertyBinding.useTargetSubscriber(...)`
- Full observer-system entity query after the first catalog pass: 75 public export rows total.
  - the seed layer now names `runtime:IObserverLocator`, `runtime:ObserverLocator`,
    `runtime:INodeObserverLocator`, and `runtime-html:NodeObserverLocator` as first-class reactivity anchors
  - rows are public package exports with explicit `observerKinds`, `observerCapabilities`, `exportShape`,
    `matchedBy`, and DI default implementation provenance when visible from `createInterface` builder callbacks
  - this is still an existence catalog, not a relationship graph; binding lookup/setup rows now continue into it
    instead of making observer-locator relationships implicit
  - first broad all-package materialization was around 18s after the daemon/source project was warm; subsequent reads
    are around 100ms from the daemon cache
- The framework entity seed layer now also exposes public export catalogs for AppTask/lifecycle work, router,
  expression, and rendering structures:
  - `app-tasks`: 36 rows across `runtime-html`, including AppTask factories, task-slot constants, task callbacks,
    task queues, recurring task helpers, and lifecycle hook exports
  - `router-entities`: 90 rows across `router`, `route-recognizer`, and umbrella `aurelia` exports, including router,
    configuration, route tree/context, navigation, viewport/endpoint, URL parser, recognizer, state, route-resource,
    event, instruction, and router-local location rows
  - `expression-entities`: 144 rows across `expression-parser`, `runtime`, `runtime-html`, `template-compiler`, and
    umbrella `aurelia` exports, including AST nodes, parser/evaluator/unparser/visitor helpers, interpolation,
    access/call/literal/operator/pattern nodes, binding behavior, and value-converter expression rows
  - `rendering-structures`: 123 rows across `runtime-html`, `template-compiler`, `runtime`, and umbrella `aurelia`
    exports, including app root, controller, view/view-factory, hydration, renderer, render context/location,
    node sequence, lifecycle hook, platform boundary, mount target, and SSR rows
  - these are still "what exists" catalogs. The next layers should spend these seeds into relationship lenses for DI,
    lifecycle, compiler/rendering, activation, and observer flow instead of overloading `framework.discovery`.

## Immediate Loose Ends

- Harden the DI interface classifier:
  - current projection is public package-entrypoint exports only; source-export carriers are not treated as package
    exports
  - current candidate admission uses public export names plus a case-insensitive `createInterface` text prefilter,
    then requires checker-confirmed `InterfaceSymbol` return type
  - exact exported-name queries are narrow; broad package/all-package queries are cached after first materialization
  - remaining open seam: aliases that do not contain `createInterface` text need import/provenance-based admission
    instead of the current syntax prefilter
  - preserve and later spend builder callback effects (`singleton`, `transient`, `callback`, `cachedCallback`,
    `aliasTo`, `instance`)
- Promote repeated cross-lens patterns into calmer taxonomy:
  - distinguish exported value shape, source carrier, evaluator effect, DI consequence, resource definition, and
    configuration bundle membership
  - avoid putting syntax shape, semantic role, and graph relation in the same enum
  - add self-analysis rows when a route/projection starts relying on repeated local conventions
- Build a framework resource export classifier:
  - current projection is public package-entrypoint resource exports only; resources admitted only through bundles such
    as `DefaultResources` must be associated later by bundle evaluation, not pretended to be public exports
  - learn from semantic-runtime resource recognition/convergence, but do not copy it blindly
  - recognized now: decorator, static `$au`, static `$au` helper returns, `.define(...)`, static-block
    `defineAttribute(...)` / `defineElement(...)`, `AttributePattern.create(...)`, and renderer helper carriers
  - still pending: convergence from headers into full resource definitions and template/container visibility
  - separate resource headers from converged definitions and from container/template visibility
  - keep attribute patterns and binding commands as syntax resources, not ordinary DI keys
- Turn configuration bundles into evaluated associations:
  - bundle association now classifies `container.register(...)` arguments by TypeChecker-resolved declaration identity
    first, then only uses package-scoped declaration-file fallbacks for DI/resource carriers
  - follow helper calls such as `singletonRegistration(...)`, `instanceRegistration(...)`, `aliasRegistration(...)`;
    `instanceRegistration(ICoercionConfiguration, ...)` now closes through the runtime `.d.ts` declaration back to the
    source `DI.createInterface(...)` carrier
  - record bundles as associations/effects, not as name-based meanings; avoid global name scans because they recreate
    au-mcp-style maze pressure
  - next: represent renderer/resource/registry consequences as separate graph products instead of only bundle
    association rows
- Extend effect tracing:
  - expose direct/indirect return-value provenance for selected exports
  - add object/array returned value summaries when useful for bundle association
  - represent nested helper-return effects without forcing every helper call to be executed
  - memoize repeated local factory/helper trace results by declaration plus argument shape
  - make deferred callback boundaries queryable so AppTask and lifecycle work can spend them later
- Deepen the syntax-product graph:
  - instruction slots now have declaration/value/product joins; next, make slot-to-renderer dispatch queryable as a
    first-class relation instead of only implicit via matching `instructionTarget` (done in `framework.rendering`)
  - compiler and SSR instruction-factory rows are now visible; next, distinguish direct compiler production,
    deserialization/translation production, and nested child-instruction production without collapsing them into one
    semantic effect
  - binding classes now expose constructor/lifecycle/observer-locator surfaces, controller admission edges, and
    renderer/resource-side observer setup overrides
  - binding admission rows currently close direct controller admission, factory-local admission such as
    `TranslationBinding.create(...)`, and factory collection admissions; next, connect call-site arguments such as
    `{ controller: renderingCtrl }` back to the renderer that delegates admission to the factory
  - model renderer calls into child controller creation and recursive renderer dispatch (`renderers[propInst.type]`)
    without flattening dynamic loops into fake closure
  - next lens/dimension pressure: keep `framework.discovery` focused on seed/package/bundle discovery; keep
    `framework.rendering` focused on instruction, renderer, binding, and observer-adjacent rows; introduce
    `framework.di`, `framework.lifecycle`, and `framework.compiler` as the next dedicated dimensions once their row
    shapes are stable enough to avoid overloading rendering/resource enums
- Deepen the observer-system catalog into relationships only after the entity set is stable:
  - current `framework.discovery:observers` deliberately answers "what public observation/reactivity exports exist"
    before answering how they relate
  - next relationship layer should connect `ObserverLocator` to `INodeObserverLocator`, dirty checker fallback,
    collection observer helpers, computed observers, target observers/accessors/subscribers, and watcher/connectable
    dependency collection
  - keep the observer-locator contracts and implementations as spine anchors because bindings delegate through them
    rather than constructing most observers directly
- Add a stable disk manifest layer above the daemon's warm in-memory cache:
  - cache expensive, deterministic catalog products such as DI interfaces, resource carriers, public resources,
    registry exports, and evaluated bundle admissions
  - include scanner/recognition/evaluator version keys and manifest schema version keys so cache invalidation is tied
    to Atlas logic changes and manifest shape changes, not only source timestamps
  - keep manifest rows as stable semantic addresses/evidence summaries; rehydrate or lazily reacquire full TypeScript
    nodes from the live Program when a query needs rich checker/source graph access
  - avoid letting the manifest become a hand-maintained substrate contract; it should be derived output with exact
    invalidation rules
- Keep performance honest:
  - broad export member scans can still be expensive without a narrowing query
  - framework seed discovery is around tens of milliseconds; full call hierarchy/call-site expansion remains several
    seconds and is now lazy unless `ATLAS_PREWARM_FRAMEWORK_FLOW=1`
  - `di-interfaces` is around sub-second for exact export-name reads, several seconds for cold large packages, and
    tens of milliseconds after cache warmup
  - `bundles(runtime-html:StandardConfiguration)` is currently about 20s cold and about 130ms warm. The cold path is
    dominated by first TypeChecker/evaluator reads and package-scoped resource fallback for declaration-file imports,
    not all-package scans.
  - `syntax-products` is currently about 27s for the first broad query after daemon restart when it has to materialize
    source project/resource-carrier/factory caches, then about 100ms for broad or filtered warm-cache reads.
  - `instruction-slots` is currently about the same cold path as syntax-products because it joins syntax products, then
    about 95ms for broad or exact warm-cache reads.
  - `binding-admissions` is currently about the same cold path as syntax-products because it joins construction
    products, then about low hundreds of milliseconds for broad or exact warm-cache reads.
  - `binding-products` is currently about the same cold path as syntax-products because it joins construction products
    and admissions, then about low hundreds of milliseconds for broad or exact warm-cache reads.
  - `binding-effects` is currently about the same cold path as binding-products because it uses the binding product set
    as admission; after warmup it returns low hundreds of milliseconds for broad or filtered reads.
  - `binding-setups` currently rides the `framework.rendering` cold path, then returns low hundreds of milliseconds
    after warmup.
  - `observers` uses `readExportNames` as the cheap admission surface and only expands TypeChecker export facts for
    observer-ish candidate names and DI observer interfaces; it is prewarmed by the session daemon so ordinary API reads
    should be warm-cache cheap.
  - `app-tasks`, `router-entities`, `expression-entities`, and `rendering-structures` use the same cheap public-name
    admission surface plus exact export expansion. Cold broad materialization after the source project is warm is about
    6s, 6s, 16s, and 12s respectively; warm-cache reads are intended to be low hundreds of milliseconds.
  - `readExportNames` is the cheap public-name surface; avoid `readExportSurface` when only admission names are needed
  - profile before adding more boot-time graph work; prefer indexed atoms with stable keys over repeated scans

## Semantic Runtime Lessons To Reuse Carefully

- Configuration is an admission layer, not a DI world constructor.
- Registration observations describe values offered to registration, not final container state.
- DI world construction spends registration products into resolver/resource/lookup rows.
- Resource recognition headers are not the same as converged definitions or template visibility.
- Built-in framework resource catalogs are real model rows but should still be associated through registration effects.
- Runtime renderers are part of the compiler/rendering graph and should be indexed alongside syntax/resources.
- AppTask callbacks are registered during configuration but execute at lifecycle slots; do not flatten them into
  immediate registration effects.

## Open Questions

- Where should the eventual Aurelia-wide dependency graph live: `framework.discovery`, a new `framework.index`, or
  split into `framework.di`, `framework.resources`, and `framework.materialization` boot indexes?
- Should `framework.evaluator` remain generic invocation/effect tracing, with Aurelia classification layered above it,
  or own small framework-aware projections such as `di-interfaces` and `bundle-effects`?
- How much static evaluator value modeling is needed before bundle association is reliable enough to make vocabulary
  and substrate-contract compensation shrink?
- Which open seams should become first-class continuations because they repeatedly guide the next useful query?

## Verification Notes

- Run `pnpm --filter @aurelia-ls/atlas build` after every substrate change.
- Run `pnpm --filter @aurelia-ls/atlas smoke` before handing off a coherent milestone.
- Run `pnpm --filter @aurelia-ls/atlas orient` after source changes before trusting daemon orientation.
