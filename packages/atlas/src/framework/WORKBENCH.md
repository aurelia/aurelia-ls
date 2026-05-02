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

Atlas self-maintenance now has a source-backed `atlas.self` substrate for inspecting Atlas itself before reading
implementation files. Use `taxonomy` for compact rollup, `enums` for enum axes and member reference pressure,
`strings` for magic string literal pressure, `row-surfaces` for structural interface/type shapes,
`relationship-surfaces` only for surfaces with relationship axes, `axis-pressure` for exact mapper/stringly-field/parallel-axis pressure, `classes` for OOP surfaces, `functions` for top-level function and class-method pressure,
`contracts` for LensCatalog-to-runtime coherence, `projections` for observed runtime projection branches,
`continuations` for route/source follow-up objects, `modules` for Atlas area dependency edges, `indexes` for
cache/schema/warmup provenance, and `contract-strings` for string values that behave like API contract. Keep these
answers compact by default; opt into the full source-project package summary only when the package inventory itself is
the question. Projection observations are intentionally literal: an unobserved projection string is not automatically a
bug because some lenses answer through default branches or pre-switch logic.

Keep `self-check` as a thin liveness/contract sanity pass, not as the place where evolving ontology is defended.
Architectural soundness should come from coherent substrates and from using Atlas projections to interpret exact facts,
not from adding compatibility assertions for whatever enum or row shape happened to exist in one session.

`axis-pressure` is now value-space aware. A field label such as `relation` is not treated as a complete axis identity;
rows keep the field label, typed value space, and stable axis id separately so framework relations, navigation
relations, loose filters, and reflected enum member names do not collapse into one fake split-brain. Row surfaces also
carry a role such as `relationship-row`, `filter`, `classification`, `basis-transition`, or `navigation-contract`;
only graph-like relationship rows should produce relationship-shape gap pressure. Continuation target/projection
coherence is also checked against `LensCatalog`, including helper-generated continuations.

Atlas no longer carries a static framework handoff catalog. The semantic-runtime evaluator/checker handoff is a future
product concern that Atlas can learn later through explicit product metadata. For now, Atlas should expose concrete
framework rows, source-backed provenance, route claims, and optional `basisTransition` metadata only when a real
continuation changes epistemic footing.

When touching Atlas internals, treat static analyzability as a design constraint. Substantial behaviors should prefer
named classes such as builders, indexes, classifiers, graphs, registries, and caches over sprawling object literals or
anonymous helper clusters. The point is not ceremony; it is to leave stable TypeScript shapes that Atlas can inspect
through `classes`, `functions`, `modules`, and relationship projections before falling back to raw source.

Framework runtime implementation is intentionally split by semantic phase. Facade modules such as
`framework-lenses.ts`, `framework-continuations.ts`, `framework-rendering-graph.ts`, and
`framework-entity-catalogs.ts` preserve stable import surfaces only. New behavior should usually land in a phase module:
answerers orchestrate projections, evidence modules build provenance, continuation families own route hops, entity
catalog modules own "what exists", rendering modules own syntax/instruction/binding phases, and bundle modules separate
public bundle reads from evaluator association walking and classification indexes. If a facade starts owning logic
again, treat that as architectural drift.

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
  summary reports syntax products, instruction slots, instruction dispatch edges, binding products, admission edges,
  binding effects, and binding setup overrides without forcing callers back through `framework.discovery`.
- `framework.rendering` has a public `instruction-dispatches` projection that turns slot-to-renderer matching into
  explicit dispatch rows. This is now the direct bridge from emitted instruction discriminators into renderer behavior.
- `framework.rendering` has a public `controller-creations` projection for renderer hydration flows. It records the
  view-model construction call, `Controller.$el` / `Controller.$attr` child-controller factory call, parent
  `addChild(...)` admission, recursive `renderers[propInst.type].render(...)` dispatches, and template-controller
  `link(...)` hooks. Relationship rows expose these as `creates-controller`, `admits-child-controller`,
  `dispatches-instruction`, and `invokes-callback` atoms with renderer/controller mechanisms instead of hiding them in
  source snippets.
- `framework.rendering` has a public `binding-setups` projection for renderer/resource-side setup calls that alter
  binding observation behavior outside the binding class. It currently recognizes `useTargetObserver`, `useAccessor`,
  and `useTargetSubscriber`.
- `framework.rendering` has a public `relationships` projection that normalizes syntax products, instruction
  dispatch, binding construction/admission/effects, and observation setup onto the shared relation/mechanism/phase
  axes. Relationship continuations now offer semantic hops back into instruction slots/dispatches, binding products,
  binding effects, and observer catalogs instead of only source/type inspection.
- `framework.rendering` continuations stay source-backed: instruction dispatch, binding products, binding effects, and
  setup rows jump to concrete source/type/observer/catalog projections instead of a static handoff catalog.
- Rendering-to-observer continuations now switch explicitly into `framework.discovery:observers` and add capability
  filters such as `locate-observer`, `locate-accessor`, or `subscribe` when the binding effect/setup row provides that
  provenance.
- Rest-package discovery now covers the non-`runtime-html` configuration/resource surfaces:
  - `dialog` configurations close to DI registrations, registry export registration, and AppTask admission.
  - `i18n` expands nested `coreComponents(...)` into DI registrations, an AppTask, renderer/resource catalogs, and
    alias-sensitive dynamic binding-command/attribute-pattern registrations.
  - `router` expands the local `configure(...)` call into DI registrations, AppTasks, default component/resource
    catalogs, and the concrete `RouterOptions` registration helper.
  - `ui-virtualization` closes to collection/dom renderer registry exports plus `VirtualRepeat`.
  - `validation`, `validation-html`, and `validation-i18n` close their `Registration.*`, chained configuration,
    `registerFactory`, binding behavior, custom attribute, and dynamic custom element admissions.
- Resource-carrier discovery now spans framework and plugin packages that contribute resources or syntax products.
- DI interface export discovery spans the framework and plugin packages that publish `createInterface` keys.
- Syntax-product discovery covers binding commands, renderers, binding construction, and instruction factories.
- Instruction-slot discovery joins slot constants to instruction declarations and syntax products.
- Instruction-dispatch discovery includes rows such as `itPropertyBinding -> PropertyBindingRenderer`,
  `itInterpolation -> InterpolationBindingRenderer`, `itTranslation -> TranslationBindingRenderer`, and
  `itState -> StateBindingRenderer`.
- Binding-admission discovery covers inline construction, local variable construction, and factory collection elements.
- Binding-product discovery covers renderer-created and controller-admitted bindings, including lifecycle/decorator
  bindings that have admission edges but no renderer construction products.
- Binding-effect discovery exposes rows such as `PropertyBinding.bind -> observerLocator.getObserver/getAccessor`,
  `ListenerBinding.bind/unbind -> addEventListener/removeEventListener`, and
  `StateBinding.bind/useStore -> store.subscribe/unsubscribe`.
- Binding-setup discovery includes setup calls such as `InterpolationBindingRenderer.render -> InterpolationBinding.useAccessor(...)`,
  `PropertyBindingRenderer.render -> PropertyBinding.useTargetObserver(...)`,
  `AttrBindingBehavior.bind -> PropertyBinding.useTargetObserver(...)`,
  `UpdateTriggerBindingBehavior.bind -> PropertyBinding.useTargetObserver(...)`, and
  `ValidateBindingBehavior.bind -> PropertyBinding.useTargetSubscriber(...)`.
- Full observer-system entity query after the first catalog pass:
  - the seed layer now names `runtime:IObserverLocator`, `runtime:ObserverLocator`,
    `runtime:INodeObserverLocator`, and `runtime-html:NodeObserverLocator` as first-class reactivity anchors
  - rows are public package exports with explicit `observerKinds`, `observerCapabilities`, `exportShape`,
    `matchedBy`, and DI default implementation provenance when visible from `createInterface` builder callbacks
  - this is still an existence catalog, not a relationship graph; binding lookup/setup rows now continue into it
    instead of making observer-locator relationships implicit
- The framework entity seed layer now also exposes public export catalogs for AppTask/lifecycle work, router,
  expression, and rendering structures:
  - `app-tasks`: AppTask factories, task-slot constants, task callbacks, task queues, recurring task helpers, and
    lifecycle hook exports
  - `router-entities`: router, configuration, route tree/context, navigation, viewport/endpoint, URL parser,
    recognizer, state, route-resource, event, instruction, and router-local location rows
  - `expression-entities`: AST nodes, parser/evaluator/unparser/visitor helpers, interpolation,
    access/call/literal/operator/pattern nodes, binding behavior, and value-converter expression rows
  - `rendering-structures`: app root, controller, view/view-factory, hydration, renderer, render context/location,
    node sequence, lifecycle hook, platform boundary, mount target, and SSR rows
  - these are still "what exists" catalogs. The next layers should spend these seeds into relationship lenses for DI,
    lifecycle, compiler/rendering, activation, and observer flow instead of overloading `framework.discovery`.
- `framework.di` is now the first relationship-atom lens. It starts at the Aurelia kernel because DI is the lowest
  framework dependency layer:
  - `relationships.ts` separates relation, mechanism, phase, evidence basis, closure, and endpoints so later lenses can
    compose atoms without collapsing ontology dimensions into one enum
  - `di-index.ts` discovers exported `createInterface` keys across admitted framework packages, TypeChecker-qualified
    `Registration.*` provider/alias targets across admitted packages, and kernel DI registration/lookup/materialization
    mechanics from exact source and TypeChecker-backed call facts
  - createInterface builder callbacks now produce both a registration-strategy atom and, when an argument is visible,
    a provider or alias-target atom. This keeps "a resolver registration exists" separate from "this key is provided
    by this expression".
  - registration-factory calls now produce a separate provider/alias-target atom only when the callee resolves back to
    Aurelia kernel registration API declarations and its call type is a registration/registry product
  - the lens exposes `keys`, `relationships`/`facts`, `registrations`, `providers`, `lookups`, and `materializations`
    projections, with source continuations for every returned atom
  - this is still provider-source substrate, not a full app-world constructor; admission/configuration execution and
    resource construction should later be expressed as outer relationships over these DI primitives
- `framework.materialization` now spends visible DI provider atoms into first-pass route rows:
  - instance providers, constructable singleton/transient providers, and aliases close to exact provider expressions
    with TypeChecker facts and source continuations
  - callback and cached-callback providers now spend evaluator invocation effects into exact container dependency rows
    for callback receiver calls such as `handler.get(...)`, `handler.has(...)`, `getAll(...)`, `getResolver(...)`,
    and `find(...)`
  - dependency rows now carry a separate policy axis for direct, guarded, fallback, repeated, and deferred callback
    dependencies. This policy is derived from evaluator certainty plus control-path labels; it is not a substitute for
    semantic-runtime's eventual container execution model.
  - materialization graph rows now keep `materializes-through` and `depends-on-key` as shared framework relation
    values, so callers can traverse from a DI key to its provider or from a DI key to callback dependency keys it reads
  - `instantiations` is now the cheap "DI key is instantiated here" hop. It keeps existing values, constructable
    providers, callback returns, aliases, provider source, and low-level factory/constructor construction sites in one
    row without treating provider admission as container execution.
  - materialization graph rows also include `instantiates-key` for non-alias routes so relationship traversals can jump
    from a key to the runtime-existence edge without reinterpreting route rows by hand.
  - `resource-instantiations` is the first resource materialization layer. It joins source-backed resource carriers to
    runtime/compiler/evaluator sites: CE/CA/TC view-model `container.invoke(...)`, VC/BB expression evaluator lookup
    and application, BC compiler command resolution/build, and resource-kind DI registration/lookup seams.
  - callback routes deliberately remain partial and carry open seams for return/value closure until evaluator/effect
    tracing can model the produced value, not just its container reads
  - this lens is a route layer over DI provider atoms, not yet the full container construction model
- `framework.resources` is now the resource convergence lens:
  - it joins source carriers, public package exports, evaluated bundle admissions, syntax products, and
    materialization lanes into one row per resource carrier
  - the row is an evidence convergence view, not a claim about final container/template visibility
  - use this lens when a resource-specific question would otherwise require hopping through discovery, admission,
    materialization, and rendering just to learn which facts Atlas already has
- `framework.compiler` is now a dedicated instruction-production lens:
  - instruction products cover binding-command `build(...)` outputs and instruction-factory object literals
  - relationship rows use the shared `compiler` family with `produces-instruction` relation and source mechanisms such
    as `binding-command-build` or `instruction-factory`
  - continuations jump forward into renderer instruction dispatch and controller creation for the produced instruction
    by instruction name, without assuming the producer package is also the renderer package
- `framework.lifecycle` now separates controller, binding, resource, and AppTask lifecycle rows:
  - AppTask execution rows come from `AppRoot` and include concrete slot invocations, `IAppTask` collection lookup,
    slot filtering, and `task.run()` execution
  - this is intentionally distinct from `framework.admission:app-tasks`; configuration can admit an AppTask while
    lifecycle rows explain when the runtime later looks up and runs admitted tasks
  - admission AppTask rows now continue directly to lifecycle execution rows when the helper exposes a concrete
    `AppTask.*` slot name
  - lifecycle participant, controller call, AppTask execution, and hook dispatch lanes now live in the framework
    substrate so cross-lens continuations do not encode those lanes as ad hoc strings
  - child-controller activation rows now continue back to renderer `controller-creations` and `controller-add-child`
    relationship rows, making the hydration-to-activation handoff bidirectional
  - hook dispatch rows separate direct view-model lifecycle hook calls from registered lifecycle-hook collection
    dispatch and helper callback invocation
- `framework.observation` is now the dedicated observation/reactivity lens:
  - `entities` returns the observer/reactivity catalog rows seeded by package exports and DI provenance
  - `binding-lookups` returns binding class calls into `IObserverLocator`-style APIs
  - `binding-setups` returns renderer/resource-side setup calls such as `useTargetObserver`, `useAccessor`, and
    `useTargetSubscriber`
  - `surface-methods` returns source-backed methods/functions on `ObserverLocator`, `NodeObserverLocator`,
    `DirtyChecker`, dirty-check properties, collection helpers, connectable helpers/records, watcher classes,
    watch decorators/definitions, the `Watch` registry, CE/CA resource watch metadata merges, effect runners, and slot
    watcher surfaces
  - `flow-sites` returns source-backed observer cache reads/writes, node-locator delegation, dirty-check fallback,
    collection observer helpers, computed/expression/setter observer construction, node observer/accessor paths, and
    connectable subscribe/unsubscribe sites
  - watcher/effect flow sites expose `@watch` definition storage, WeakMap registry reads/writes, resource-definition
    watch metadata merges, `createWatchers` expression-kind branching, parser/access-scope paths,
    `ComputedWatcher`/`ExpressionWatcher` construction and evaluation, watcher callback invocation,
    `Observation.run/watch` effect subscription/cleanup, and dependency collection entry/exit points
  - page projections compute only their own row family; `summary` is the intentional full rollup. Keep this policy
    because watcher/effect calibration should not force unrelated flow-to-entity or relationship joins.
  - `flow-entity-links` joins internal observation flow-site targets back to public `runtime` / `runtime-html`
    observer entity rows with an explicit match basis (`fully-qualified-name`, `symbol-name`, `target-name`, or
    `target-root-name`)
  - `relationships` joins binding lookup/setup rows with the internal observation flow sites through shared
    relationship axes, so the rendering-to-observation handoff is now visible without rereading the locator sources
- `framework.admission` is now the relationship layer over evaluated configuration and bundle associations:
  - it turns bundle rows into relationship rows from configuration export to admitted target
  - relation, mechanism, phase, endpoint kind, original association kind, and evaluator certainty now reuse stable
    typed axes instead of admission-local enum/string mirrors; path/catalog/helper data remain admission-local evidence
  - admitted targets currently include DI keys, resources, registry/configuration exports, catalogs, factories,
    concrete registration arguments, unknown arguments, and AppTasks
  - `materializations` joins admitted DI keys and resources to visible `framework.materialization` DI/resource
    runtime-existence rows. The bridge keeps admission source, materialization source, match basis, link class,
    materialization class, and closure separate so callers can ask "what was admitted?" and "where can it exist?"
    without treating configuration admission as container execution.
  - `world-formation` joins admitted DI/resources to visible materialization evidence and admitted AppTasks to
    AppRoot lifecycle execution rows. Registry exports, catalogs, factories, concrete registration arguments, unknowns,
    and unresolved DI/resource/AppTask admissions remain explicit admission-only or open rows instead of being promoted
    into fake container/world state.
  - the broad `summary` projection intentionally returns a cheap orientation until callers narrow by `packageId` or
    `exportName`; this avoids making a naive API consumer pay the cold all-package bundle-evaluation cost
  - source/type continuations are capped tightly, and semantic continuations jump into `framework.di`,
    `framework.discovery`, or back into `framework.admission` depending on target kind
- Shared framework axes should live in `packages/atlas/src/framework` instead of runtime lens files when more than one
  semantic layer needs them. Resource definition kind now lives in the framework substrate so relationship endpoints,
  entity catalogs, bundle associations, and rendering syntax rows can carry the same typed resource value space.
- Static handoff definitions were removed from the framework surface. If a future boundary matters, spend it into
  source-backed relationship, effect, lifecycle, observer, or product-provenance rows instead of maintaining a parallel
  catalog by hand.

## Immediate Loose Ends

- Deepen `framework.admission` beyond the first admission-to-world formation join:
  - add registry execution rows only when source-backed execution evidence makes that distinction visible
  - distinguish registry export admission from registry execution; an admitted registry/configuration export may own
    further admissions, but it is not automatically executed without a world-formation path
  - record when broad admission queries become hot enough to safely promote more package summaries into daemon prewarm
  - decide whether repeated AppTask admission-to-execution joins should become cached relationship atoms or stay
    derived rows over admission and lifecycle indexes
- Promote repeated boundary-like facts only after source-backed rows demand them:
  - connect package-export admission and registration evaluation through admission/DI/materialization relationships
  - connect instruction hydration and activation through rendering, controller, view, and lifecycle rows
  - deepen binding observation from first-pass lookup/setup relationships into observer-locator internals
  - connect recursive compilation through explicit branch/open-seam rows instead of flattening dynamic activation loops
  - connect auLink/product obligations only through explicit auLink/product provenance when semantic-runtime supplies it
- Deepen `framework.di` without turning it into a product emulator:
  - add explicit alias rows for non-`createInterface` key aliases such as interface-token casts
  - distinguish provider registration, resolver slot ownership, resource slot mirroring, array resolver aggregation,
    and default resolver/JIT pressure as separate relation/mechanism combinations when the current atoms prove too
    coarse
  - extend provider-target atoms beyond `createInterface` builder callbacks into evaluated configuration and
    registration-factory admissions once the evaluator can close the call/effect route
  - validate the callback dependency policy classifier against more callback-provider shapes as provider admission grows
  - add source/type continuations from DI atoms into `ts.type` call-sites, references, and definitions where useful
  - keep `Container` emulator behavior in semantic-runtime; Atlas should expose framework facts and corridors that make
    emulator gaps obvious
- Deepen materialization after the instantiation surface:
  - validate whether constructable rows should separate factory-entry and constructor-call continuations into distinct
    projections once the site list becomes too large for common navigation
  - decide whether repeated admission/materialization bridge rows should become cached relationship atoms or remain
    cheap derived rows over admission and materialization indexes
  - keep callback return/value closure evaluator-backed; do not collapse callback dependency reads into produced-value
    claims
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
  - rendering relationships now normalize the corridor from syntax products through renderer dispatch, binding
    admission/effects, and observation setup; exact same-source binding construction duplicates are collapsed toward
    the richer target-provenance row
  - compiler and SSR instruction-factory rows are now visible; next, distinguish direct compiler production,
    deserialization/translation production, and nested child-instruction production without collapsing them into one
    semantic effect
  - binding classes now expose constructor/lifecycle/observer-locator surfaces, controller admission edges, and
    renderer/resource-side observer setup overrides
  - binding admission rows currently close direct controller admission, factory-local admission such as
    `TranslationBinding.create(...)`, and factory collection admissions; next, connect call-site arguments such as
    `{ controller: renderingCtrl }` back to the renderer that delegates admission to the factory
  - renderer calls into child controller creation and recursive renderer dispatch are now explicit
    `controller-creations` rows and rendering relationship atoms; next, connect those rows to lifecycle activation and
    compiler/recursive compilation seams without flattening branch-dependent loops into fake closure
  - next lens/dimension pressure: keep `framework.discovery` focused on seed/package/bundle discovery; keep
    `framework.rendering` focused on instruction, renderer, binding, and observer-adjacent rows; `framework.di` and
    `framework.lifecycle` now own their dedicated dimensions; `framework.compiler` remains the next likely split once
    compiler rows start outgrowing rendering/resource semantics
- Deepen the observer-system catalog into relationships only after the entity set is stable:
  - current `framework.discovery:observers` deliberately answers "what public observation/reactivity exports exist";
    `framework.observation` is now the relationship/consumer lens for binding lookup/setup rows and observer-locator
    internals
  - rendering relationship continuations now enter this catalog through observer capability filters rather than
    method-name text, which keeps lookup methods like `getAccessor` connected to locator exports
  - observer-locator internals now expose `surface-methods`, `flow-sites`, and `flow-entity-links`; next, spend the
    link rows into better semantic continuations from binding lookups and observer entity rows
  - node observer configuration is currently source-backed as flow sites, but the event/default/readonly object shapes
    are not yet evaluated into configuration facts; promote that only when node-specific observation questions need it
  - connectable dependency collection is visible through subscribe/unsubscribe and observer-record rows; watcher/effect
    classes that consume `connectable()` now expose source-backed dependency enter/exit/clear/evaluation rows
  - remaining watcher seam: CE/CA metadata merge rows show where watch definitions are gathered, but Atlas does not yet
    close from string/symbol watch expressions to view-model property symbols for rename planning
  - keep the observer-locator contracts and implementations as spine anchors because bindings delegate through them
    rather than constructing most observers directly
- Deepen `framework.lifecycle` now that the first dedicated lifecycle lens exists:
  - it currently joins controller lifecycle method/call sites, binding lifecycle effects, and resource materialization
    phases through shared relation/mechanism/phase axes
  - controller call rows now separate self-lifecycle, child-controller, binding-list, state-gate, and teardown lanes
  - child-controller activation has a reverse continuation to renderer child-controller creation/admission rows
  - AppTask execution rows now expose AppRoot slot invocation, `IAppTask` lookup, slot filtering, and `task.run()`;
    admitted `AppTask.*(...)` rows now continue to the matching lifecycle slot without flattening admission into
    execution
  - VM hook dispatch and lifecycle hook dispatch are now separate rows; next, connect lifecycle-hook entity exports and
    DI admissions to these dispatch rows when the hook registry side is modeled more deeply
  - keep controller/view/binding lifecycle out of `framework.rendering` unless the row is specifically about renderer
    construction, instruction dispatch, binding construction, or observer setup
- Add a stable disk manifest layer above the daemon's warm in-memory cache:
  - the JSON cache now covers the current existence/entity atom families; see `JSON-CACHE.md` for the storage
    contract, invalidation keys, inclusion policy, trade-offs, and falsifiers
  - entity catalog producer versions are catalog-scoped so syntax-recognition refactors do not invalidate unrelated
    resource, export, observer, or structural entity JSON
  - the first relationship atom cache family is `framework.di.relationship-atoms`; use it as the template for future
    relationship caches only if the atom axes continue to hold up under query pressure
  - next candidates are relationship/effect families, starting with evaluated bundle admissions and then DI,
    lifecycle, compiler, activation, and observer-flow atoms as their row shapes stabilize
  - keep manifest rows as stable semantic addresses/evidence summaries; rehydrate or lazily reacquire full TypeScript
    nodes from the live Program when a query needs rich checker/source graph access
  - avoid letting the manifest become a hand-maintained substrate contract; it should be derived output with exact
    invalidation rules
- Keep performance honest:
  - broad export member scans can still be expensive without a narrowing query
  - full call hierarchy/call-site expansion remains lazy unless `ATLAS_PREWARM_FRAMEWORK_FLOW=1`
  - bundle cold paths are dominated by first TypeChecker/evaluator reads and package-scoped resource fallback for
    declaration-file imports, not all-package scans.
  - rendering graph projections share cold materialization paths when they join syntax products, construction
    products, admissions, and binding effects.
  - `observers` uses `readExportNames` as the cheap admission surface and only expands TypeChecker export facts for
    observer-ish candidate names and DI observer interfaces; it is prewarmed by the session daemon so ordinary API reads
    should be warm-cache cheap.
  - `app-tasks`, `router-entities`, `expression-entities`, and `rendering-structures` use the same cheap public-name
    admission surface plus exact export expansion.
  - `framework.di` and `framework.materialization` are blocking daemon prewarm reads. Bundle admissions use their own
    JSON cache family and package-by-package background prewarm because a cold all-package bundle fill can exceed the
    session startup budget.
  - package-scoped JSON hydration should materially reduce daemon restart warmup after the cache has been filled.
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
