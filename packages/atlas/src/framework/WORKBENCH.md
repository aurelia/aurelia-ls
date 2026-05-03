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
`continuations` for route/source follow-up objects, `semantic-routes` for declared framework route topology,
`modules` for Atlas area dependency edges, `substrate-surfaces` for reader/builder/schema declarations, and `contract-strings` for string values that behave like API contract. Keep these
answers compact by default; opt into the full source-project package summary only when the package inventory itself is
the question. Projection observations are intentionally literal: an unobserved projection string is not automatically a
bug because some lenses answer through default branches or pre-switch logic.

Keep `self-check` as a thin liveness/contract sanity pass, not as the place where evolving ontology is defended.
Architectural soundness should come from coherent substrates and from using Atlas projections to interpret exact facts,
not from adding compatibility assertions for whatever enum or row shape happened to exist in one session.
Do not treat `atlas.self` as an architectural judge. Its job is to expose exact source-backed rows and stable
continuations so a maintainer can reason faster; when a row creates friction, improve the underlying primitive or
delete the misleading surface rather than teaching self-analysis to make stronger claims.

`axis-pressure` is now value-space aware. A field label such as `relation` is not treated as a complete axis identity;
rows keep the field label, typed value space, and stable axis id separately so framework relations, navigation
relations, loose filters, and reflected enum member names do not collapse into one fake split-brain. Row surfaces also
carry a role such as `relationship-row`, `filter`, `classification`, `basis-transition`, or `navigation-contract`;
only graph-like relationship rows should produce relationship-shape gap pressure. Continuation target/projection
coherence is also checked against `LensCatalog`, including helper-generated continuations.
The self-analysis call graph follows same-file calls and exact named imports across modules, so barrel/facade imports
that hide owned functions should be treated as analyzability pressure, not harmless convenience.

Atlas no longer carries a static framework handoff catalog. The semantic-runtime evaluator/checker handoff is a future
product concern that Atlas can learn later through explicit product metadata. For now, Atlas should expose concrete
framework rows, source-backed provenance, route claims, and optional `basisTransition` metadata only when a real
continuation changes epistemic footing.

When touching Atlas internals, treat static analyzability as a design constraint. Substantial behaviors should prefer
named classes such as builders, indexes, classifiers, graphs, registries, and memos over sprawling object literals or
anonymous helper clusters. The point is not ceremony; it is to leave stable TypeScript shapes that Atlas can inspect
through `classes`, `functions`, `modules`, and relationship projections before falling back to raw source.

Framework semantic continuations now split stable topology from row-local continuation instances.
`packages/atlas/src/inquiry/runtime/framework-route-catalog.ts` declares `FrameworkRouteEndpoint` and
`FrameworkSemanticRouteSpec` instances for repeated framework row-to-lens hops; call sites apply those specs with
row-local filters, evidence, and rationale through `FrameworkSemanticRouteBuilder`. Route claims now carry
both the generic navigation `specId` and a domain `semanticRouteId`. Use `atlas.self:semantic-routes` to inspect the
declared route topology and `atlas.self:continuations` to inspect where those routes are instantiated. Avoid local
route wrapper aliases and avoid reconstructing target lens/projection/relation/basis bundles inline once a hop has a
stable semantic route.

Framework source/type/call-site inspection continuations are now a separate row-local primitive.
`FrameworkRowContinuationBuilder` owns the repeated `TsSource:text`, `TsType:facts`, `TsType:call-sites`, and
`framework.evaluator:effects` moves for source-backed framework rows. `atlas.self` recognizes these builder calls, so
using the primitive reduces object-literal continuation surfaces without making navigation invisible. If a row needs a
special non-source-range target, keep that local until a narrower primitive emerges rather than widening the builder
into a catch-all adapter.

Paged row answers are inquiry algebra, not framework ontology. `packages/atlas/src/inquiry/paged-row-family.ts`
owns the common row-family answer envelope: paging, evidence slicing, page continuations, optional open seams, and the
default hit/miss outcome. Runtime lenses should use `PagedRowFamily` when they are returning one ordered row family
with evidence and continuation semantics; they should keep genuinely different summaries, multi-family rollups, or
flow-specific answer shapes local. DI, materialization, admission, rendering, discovery, compiler, lifecycle,
observation, resource convergence, and `atlas.self` source-row projections now use this primitive, which removed
repeated answer plumbing and made missing evidence/continuation rows visible as taxonomy pressure rather than silent
inconsistency. The runtime should not reintroduce local `pageRows`/`pageInfo`/`pageOffset`/`evidenceLimit` helpers;
use `inquiry/paging.ts` and `PagedRowFamily` unless a lower substrate already owns a paged trace, as with evaluator
effect rows and TypeScript source-reader result envelopes. Discovery recipes were promoted to typed `LensId`/`Locus`
asks and now expose first-hop continuations; do not add string-to-lens casts around recipe asks. Atlas self-maintenance
recipes/contracts also use the row-family primitive now; keep them literal rows with evidence rather than adding
higher-level self-judgment. `bridge.aulink` also uses the row-family primitive, which required the primitive to allow
one row to emit a bounded evidence group. Do not use that as permission to hide unrelated rows behind one row; it exists
for exact row products like auLink framework targets where one logical target can have multiple concrete candidate
declarations.

Reality-grounding probes after the row-family pass showed Atlas can cheaply walk compiler instruction products into
rendering dispatch/relationship rows, admission into world-formation/materialization rows, and callback materialization
routes into evaluator/dependency follow-ups. The remaining pressure is higher-order: Atlas still returns composable row
families, not path products for latent cross-lens routes that have not been modeled yet. When a hard framework question
requires manual composition across several projections, treat that as evidence for a missing route/path primitive or a
missing framework relationship family, not as a reason to add another local compatibility projection. The latest
post-refactor probes hit compiler products/relationships, resource convergence, lifecycle AppTask/relationship rows,
observation flow/relationship rows, and evaluator package effects successfully; resource convergence still takes about
one foreground second cold because it composes resource carriers, exports, bundle admissions, syntax products, and
materialization rows, which is acceptable until a profiler says the convergence substrate itself needs a new atom.
The first semantic-widening follow-up promoted compiler-to-rendering instruction hops into declared semantic routes and
let rendering observer/configuration relationships enter `framework.observation` binding lookup/setup projections
directly. Prefer this shape when a row crosses a real ownership boundary: add a named route endpoint/spec, then let
row-local continuations supply exact filters and evidence. Do not leave repeated cross-lens hops as anonymous
`ProjectionOf` continuations once the target lens has become the owner of that semantic phase.
The next composition primitive is actor-centered rather than route-centered. `inquiry/composition.ts` defines a small
answer algebra for `SemanticEntityRef`, signed `SemanticClaim` rows (`subject -> predicate -> object`), and
`SemanticCompositionValue`. `framework.composition` uses that shape to join auLink anchors with framework relationship
rows around high-salience class/interface names such as `Aurelia`, `Container`, `TemplateCompiler`, `Rendering`, and
`Controller`. Treat this as the Atlas-side analogue of semantic-runtime's future claim schema graph: product-kind-like
nodes and claim-predicate-like signed relations are the durable kernel, while route continuations and source projections
are navigation over the graph. Do not turn this into another broad compatibility adapter; if a family cannot project a
signed claim with clear subject, predicate, object, owner lens, basis, and evidence, improve that family first.

`atlas.self:enum-mappings` should remain exact enum-member translation evidence. Raw literal/member value overlap lives
in `enum-value-spaces`; do not re-expand mapping rows to include incidental string literals or enum initializer value
overlap. This keeps enum pressure actionable: a mapping row should mean "code translated one enum member space into
another", while a value-space row means "these raw values collide or repeat." The source substrate owns this boundary in
`source/enum-usage.ts`. Case-return indexing is switch-block aware so grouped cases such as
`case A: case B: return X` credit every active case label, and returned complex objects only contribute direct returned
members or top-level discriminator-like enum members rather than nested configuration values.
`FrameworkDiRelationshipEvidenceProfile` owns the answer-layer presentation of DI relationship atoms as
`EvidenceKind.DiRegistration`, `EvidenceKind.DiLookup`, or `EvidenceKind.TypeFact`. This is an evidence-profile
boundary, not a framework relation ontology; keep it named in runtime evidence helpers rather than scattering
`FrameworkRelationshipRelation -> EvidenceKind` switches through answerers.
`framework.di:graph` is now the preferred entry point for "what resolves what?" questions. It was shaped against
semantic-runtime's `di/` and `registration/` folders rather than invented from the old atom pages: registration
admission, container-owned resolver/self/resource slots, lookup/resolution requests, provider materialization routes,
and callback dependency edges are separate graph layers. Closed framework keys are `di-key` nodes; arbitrary lookup
arguments that are not closed to known framework keys are `key-expression` nodes and do not pollute the DI dependency
DAG. `framework.di:dag` collapses only exact key-to-key alias/dependency edges into components, so a "DAG" answer is
derived from graph semantics rather than assumed of the full DI system. If future probes need constructor/static-inject
dependencies or registry body spending, add those as new graph-producing facts instead of smuggling them into
`materializes-through` summaries.
The DI index now follows TypeChecker-backed aliases for package-local `createInterface` wrappers such as
`rtCreateInterface`/`tcCreateInterface` and registration-factory aliases such as runtime-html `instanceRegistration`.
It also recognizes class static `register = createImplementationRegister(IKey)` as a constructable provider seed for
the keyed class. These are substrate facts, not StandardConfiguration special cases: without them the compiler,
runtime, and runtime-html DI surfaces look artificially sparse and downstream admission answers preserve too many
registry exports as opaque leaves.

Framework boot and DI world spending now sit above the generic evaluator. `framework/module-boot.ts` resolves Aurelia
package imports to framework `src/` entrypoints and evaluates linked source modules; do not let evaluator-based
framework reads fall back to package `.d.ts` truth. `framework/di-world.ts` spends `StandardConfiguration` from those
booted values into abstract resolver/resource slots, nested registry registrations, implementation-register class
providers, and provider dependency edges. `StandardConfiguration` is still only the first canary, not a privileged
ontology: future configuration/plugin worlds should reuse this machinery rather than adding local admission shims.
The canary now closes `ITemplateCompiler -> TemplateCompiler -> CompilationContext` container dependencies:
`IResourceResolver`, `IBindingCommandResolver`, `ITemplateElementFactory`, `IAttributeParser`, `IExpressionParser`,
`IAttrMapper`, `ILogger`, and `IPlatform`. `framework.di:world` and `framework.di:dependencies` expose the spent world;
`framework.materialization:dependencies` joins the same dependency edges to materialization routes. If a future query
needs constructor/static-inject/default-interface registration behavior, extend DI-world spending as a new source-backed
fact rather than teaching materialization or admission to special-case the symptom.
DI-world now follows on-demand `createInterface` default providers discovered from requested dependency keys, tracks
TypeChecker-proven container aliases/properties instead of local variable name lists, and follows bounded same-file
helper calls when they reveal container accesses such as `invokeAttribute(...) -> ctn.invoke(definition.Type)`. Runtime
`renderer(class ... implements IRenderer)` helper products are spent as registrable-metadata `IRenderer` slots from the
concrete class source; the helper body's generic `target` parameter remains a DI relationship fact, not a
materialization route. `framework.materialization` now also admits concrete StandardConfiguration DI-world slots as
provider routes, so `key: IRenderer` yields the 18 concrete renderer providers and `Rendering.renderers` has a
`getAll(IRenderer)` edge that can land on those providers.
`framework.admission:flow` now composes the same DI-world routes transitively: admitted values materialize DI keys,
providers expose their dependency-key reads, and dependency keys pull in their own materialization providers. Dependency
flow edges are provider-to-key facts with `ownerKey` metadata, not key-to-key guesses; this matters for multi-provider
keys like `IRenderer`, where the renderer class is the actor and `IRenderer` is the materialized role. A
StandardConfiguration flow query for `IRenderer` should remain a small graph: 18 concrete renderer providers plus the
provider dependency reads, including `Rendering -> getAll(IRenderer)`.
Materialization provider identity is now split from raw provider endpoint text. `FrameworkMaterializationProviderIdentity`
keeps named providers as source symbols, but gives anonymous callback/class/object/expression providers concise graph
names such as `INodeObserverLocator callback provider` or `IKeyMapping value provider` while preserving the raw
expression text as evidence. Do not use raw endpoint `name` as both graph identity and display; broad flow and DI graph
answers should stay actor-readable without losing source-backed raw provider provenance.

DI materialization now uses `FrameworkMaterializationRouteKind` as the single DI provider route/runtime-existence
classification. The old derived `FrameworkMaterializationInstantiationKind` was removed because it mechanically
translated route kind into synonym values. Resource materialization still keeps `FrameworkResourceInstantiationKind`
because resource runtime modes are not DI provider routes. Shared answer code should use `materializationCounts(...)`
rather than rebuilding the same rollup object per projection.
`FrameworkMaterializationRouteKind` and `FrameworkMaterializationRouteDescriptor` live in the framework substrate, not
the materialization answerer. Resolver strategy is kernel evidence; the descriptor is the named materialization
interpreter that turns provider/alias atoms into route shape, callback tracing policy, construction-site policy,
instantiation relationship emission, closure, and route summaries. Do not reintroduce a runtime-lens-local
`FrameworkDiResolverStrategy -> FrameworkMaterializationRouteKind` switch; if this classifier becomes awkward, improve
the descriptor or promote a more explicit route primitive instead of adding a compatibility mapping.

`EvaluationOpenKind` is not the same kind of pressure as Atlas `OpenSeamKind`. Treat it as evaluator-local closure
boundary evidence: the ECMAScript evaluator reached a real limit where semantic-runtime may later hand off to
TypeChecker/speculative modeling for lifecycles, reactivity, expression tooling, or app-world conceptual trees. Atlas
open seams are answer-layer envelopes and can stay coarser. Do not collapse these value spaces without first modeling
the evaluator/checker handoff explicitly. `FrameworkEvaluatorOpenSeamProfile` is the runtime answer profile that
projects evaluator-local closure evidence into public `OpenSeamKind` envelopes without pretending the two enum spaces
are the same ontology.

The inquiry-locus/subject to source-selector transition is centralized in
`inquiry/runtime/source-selector.ts`. `ts.*` and `framework.evaluator` should use that primitive instead of carrying
local `LocusKind -> SourceSelectorScheme` switch copies. This is a real layer transition, not a duplicate ontology, so
keep it named and inspectable rather than hiding it in each lens.

Admission world-formation kind should name world evidence shape, not restate the admitted endpoint kind. Keep
`RuntimeExistence`, `AppTaskExecution`, `CatalogExpansion`, and `AdmissionOnly` as the formation axis; registry export,
factory, registration argument, unknown, DI key, resource, and AppTask specificity belongs on
`admittedTarget.kind`/`formedTarget.kind` plus `status`.
`FrameworkAdmissionWorldFormationDisposition` is the framework-owned admission-only boundary interpreter. It classifies
an admitted target into a disposition such as catalog expansion, missing DI/resource materialization, missing AppTask
execution, registry admission, unclassified open admission, or plain admission-only preservation, then emits
formation kind, status, open reason, closure, and summary together. Keep this as a named boundary primitive instead of
reintroducing separate `FrameworkRelationshipEndpointKind -> FrameworkAdmissionWorldFormationKind/Status` switches.
`framework.admission:flow` is the current answer for configuration-root questions such as
`StandardConfiguration`: it composes configuration admission, catalog expansion, registry body expansion,
DI materialization routes, and resource convergence roles into one graph-shaped answer family. Treat it as a path
product over existing exact substrates. The base `flow` projection should stay a cheap rollup; agents should follow
`flow-edges`, `flow-nodes`, or explicit `flow-edge-details` continuations only after the rollup shows that row detail is
worth the context cost. Compact edge pages should not offer per-edge source continuations directly; route through
`flow-edge-details` first so source inspection is paid only when a concrete edge payload is already under review. It
should reveal missing world links by preserving registry/materialization/resource edges with source rows; do not turn it
into a hand-maintained StandardConfiguration diagram or a fuzzy importance ranker.
Flow-specific filters are downstream graph filters. Use `packageId` and `exportName` to scope the admission root; apply
`targetName`, `key`, `nodeKind`, `edgeKind`, `role`, `resourceKind`, and `query` after graph composition so registry
expansion and DI/resource joins can still reveal nodes that are not directly admitted by the root configuration.
`framework.admission:flow` also has a first named graph corridor, `corridor: "jit-compiler"`. This is the compiler-only
StandardConfiguration slice: resource definitions needed by compilation, TemplateCompiler and binding-command
materialization/dependency reads, and compiler instruction-production edges. It deliberately keeps renderer dispatch
and controller hydration out of the corridor so the compiler path can be reasoned about before widening into the next
resolved-runtime phase. The corridor maintains two notions of relevance: resource definitions can be part of the
compiler world without seeding runtime DI construction, while compiler producers such as `TemplateCompiler` and
admitted binding commands do seed DI dependency closure.
Within that corridor, CE/CA/TC rows are definition lookup facts, not construction facts. ResourceResolver `find` calls
should remain visible as lookup edges (`ResourceResolver -> CustomElement/CustomAttribute`) but must not recursively
pull in view-model construction, renderer dispatch, or hydration dependencies. Container `get`/`invoke` edges are the
materialization boundary. A recent substrate bug came from treating `WeakMap<IContainer, ...>.get(c)` as a container
read because the old type check matched any type string containing `IContainer`; container identity is now checked
against the actual `IContainer` type symbol/constraint so generic cache keys do not become DI dependencies.
The JIT compiler corridor and compiler lens now have a declared bidirectional semantic route:
`framework.route.admission-flow.compiler-instruction-products` jumps from the corridor rollup to TemplateCompiler
instruction products, and `framework.route.compiler.admission-jit-flow` places compiler summaries or TemplateCompiler
instruction rows back into the `StandardConfiguration` JIT flow slice. The corridor constants live in
`framework-jit-compiler-corridor.ts`; keep the root export, actor, package, and DI key named there instead of scattering
`StandardConfiguration` / `TemplateCompiler` strings through continuation code.
Rendering instruction dispatch/syntax rows also navigate back to `framework.compiler:instruction-products` through
`framework.route.rendering.compiler-instruction-products`, closing the existing compiler-to-rendering instruction path.
`framework.compiler:compile-flow` and `framework.compiler:attribute-classification` are intentionally separate.
Compile flow is the high-level TemplateCompiler corridor: `compile(...)`, `compileSpread(...)`, context/template setup,
hook/local-element passes, node dispatch, element compilation, attribute classification as one stage, order-sensitive
attribute reordering, projection extraction, custom-attribute bindable compilation, multi-bindings, instruction
assembly, template-controller wrapping, leaf compilation, surrogate compilation, and compiled-definition output.
Attribute classification is the dense `_classifyAttributes` decision tree inside that corridor. Keep it as a detail
projection with its own branch rows and instruction-product/resource continuations; do not make the compiler overview
pay for the full branch taxonomy up front. Broad `compile-flow` returns overview rows, while `methodName`,
`compileStage`, `instructionName`, and `query` filters can expose method-local detail. The compiler summary is
rollup-only and should stay cheap. Agents should follow `compile-flow` before spending the more detailed
`attribute-classification`, `instruction-products`, or rendering continuations. Flow rows carry exact `SourceRange`
provenance and small pages expose row-local source continuations; keep that property if the flow widens again.
`framework.rendering:hydration-flow` is the next resolved-runtime corridor after that JIT compiler slice. It should
answer "how does a compiled definition become hydrated controller/rendered instruction/binding work?" without expanding
the heavy rendering row families by default. Its first-pass axes are `stage`, `operation`, and `targetKind`; operations
deliberately separate `find` resource lookup from `get`/`get-all` DI lookup, `invoke` view-model construction,
`compile`, `render`, `dispatch`, `create-controller`, `admit-child`, `admit-binding`, hook execution, and
watcher/observer setup. Keep this as an entry map with source provenance and continuations into compiler, DI,
resources, lifecycle, observation, controller creation, instruction dispatch, and binding admission; do not let it
become a duplicate detailed rendering graph.
The default `hydration-flow` projection is an overview answer. It now reports both the visible overview count and the
total source-backed corridor row count, so a caller can see when detail rows exist and reach them with filters instead
of receiving a 26k-token dump up front.
`framework.rendering:render-consequences` is the compact layer behind hydration. It is derived from rendering
relationship atoms, not another source scanner, and exposes dispatch consequences with `consequenceKind`,
`actorName`, `targetName`, `detailProjection`, and exact `detailFilters`. Keep this as the first rendering detail hop:
use it to answer "what did rendering produce or effect?" before opening nested `instruction-dispatches`,
`controller-creations`, `binding-products`, `binding-admissions`, `binding-effects`, or `binding-setups` rows. Its
default answer is an overview with explicit total counts; filtered reads expose the full consequence set.
The old rendering detail projections should behave as jump surfaces, not as raw substrate dumps. `syntax-products`,
`instruction-slots`, `instruction-dispatches`, `controller-creations`, `binding-products`, and `binding-admissions`
now return compact public rows from `framework-rendering-public-rows.ts` while preserving full internal index rows for
relationship derivation and continuations. This is the preferred pattern for any remaining heavy rendering detail
projection: first return stable identifiers, names, counts, source ranges, and detail references; keep nested
checker/call-site payloads behind source/type/detail continuations.
The route catalog declares the compiler-to-hydration, rendering-detail-to-hydration, and
hydration-to-compiler-compile-flow hops, so this corridor is a prominent navigation point without relying on anonymous
projection glue. Compile-flow rows that produce compiled definitions or instruction rows can route back to
hydration-flow with local `targetKind` filters, which makes the rendering -> compilation -> rendering loop inspectable
without asking callers to remember the previous lens context.

Lifecycle AppTask execution rows carry their observed relationship target endpoint directly. Do not rederive the target
endpoint from `FrameworkLifecycleAppTaskExecutionKind` in a relationship builder; the detector that found the execution
site already knows whether it saw the AppTask slot, IAppTask key lookup, slot-filter concept, or `task.run` method.

Observation flow-site classification carries `targetKind` alongside `siteKind`, relation, mechanism, and target name.
Avoid a late `FrameworkObservationFlowSiteKind -> FrameworkRelationshipEndpointKind` switch: the classifier that
recognizes a watch parse, observer cache read, connectable subscription, or constructed observer should state whether
the target is a symbol, concept, or expression at the source of the classification.

Generic framework projection and pagination moves should go through `projectionContinuation` and
`nextPageContinuation`. Lens-specific authority belongs in their options (`basis`, `priority`, `summary`, evidence),
not in copied local helper functions. `projectionContinuation` now emits `SwitchLens` only when the target lens differs
from the caller at runtime; otherwise it remains `SwitchProjection`. Filter/locus/subject narrowing is now named by
`NavigationRelation.RefinementOf`; do not use `ProjectionOf` for continuations that preserve the same answer family and
only tighten the question.

Framework runtime implementation is intentionally split by semantic phase. Facade modules such as
`framework-lenses.ts`, `framework-rendering-graph.ts`, and `framework-entity-catalogs.ts` preserve stable import
surfaces only. Continuation barrels should not sit on the answerer hot path; answerers should import the phase
continuation module that owns the hop family so `atlas.self` can trace ownership through named imports. New behavior
should usually land in a phase module: answerers orchestrate projections, evidence modules build provenance,
continuation families own route hops, entity catalog modules own "what exists", rendering modules own
syntax/instruction/binding phases, and bundle modules separate public bundle reads from evaluator association walking
and classification indexes. If a facade starts owning logic again, treat that as architectural drift.

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
- Rendering/binding row families no longer live on `framework.discovery`. The old discovery `syntax-products`,
  `instruction-slots`, `instruction-dispatches`, `binding-products`, `binding-admissions`, `binding-effects`, and
  `binding-setups` projections were removed once `framework.rendering` became the owning lens. Discovery should stay
  focused on seed/package/resource/bundle/entity catalogs and point into rendering instead of duplicating those row
  surfaces.
- The shared syntax-product substrate still scans source producers across admitted Aurelia packages, but public lenses
  now split ownership. `framework.compiler:instruction-products` owns binding-command `build(...)` products and
  instruction-factory object literals that emit instruction records. `framework.rendering:syntax-products` owns only
  rendering-time syntax products: renderer `target`/`render(...)` instruction handling rows and renderer binding
  creation rows for `new *Binding(...)` / `*Binding.create(...)` products inside render bodies. Do not make rendering
  relationship rows claim `produces-instruction`; that relation belongs to the compiler lens. Rendering rows can
  navigate back to compiler products by instruction name when provenance is needed.
- `framework.rendering` has a public `instruction-slots` projection for runtime instruction discriminator constants.
  It joins source slot constants such as `itPropertyBinding`, numeric runtime values, instruction declarations whose
  `type` property references the slot, and syntax products that construct or handle the slot. Declaration-file rows
  from `dist/types` are intentionally excluded from this source-semantics scan.
- `framework.rendering` has a public `binding-products` projection for binding classes materialized by renderer
  syntax products or admitted through controller binding lists. It joins renderer construction products, exact
  `controller.addBinding(...)` / `renderingCtrl.addBinding(...)` admission edges, binding class declarations,
  constructor parameter surfaces, lifecycle-relevant methods, observer-locator constructor parameters,
  observer-locator call sites, and target-observer override methods such as `useTargetObserver` / `useAccessor`.
- `framework.rendering` has a public `binding-admissions` projection for exact controller binding-list admission
  edges. It recognizes inline `new *Binding(...)`, inline `*Binding.create(...)`, local variable construction, and
  factory collection elements such as `SpreadBinding.create(...).forEach(b => renderingCtrl.addBinding(b))`.
- `framework.rendering` has a public `binding-effects` projection for binding-class lifecycle and setup effects. It
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
  binding effects, and observer catalogs through declared semantic route specs instead of only source/type inspection
  or local projection-only route claims.
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
    and application, BC compiler command resolution/build, AP compiler parser registry/handler resolution, and
    resource-kind DI registration/lookup seams.
  - Attribute-pattern materialization is a useful evaluator canary. Exact AP registry rows require booted framework
    source values for `Symbol.for(...)`, object-freeze helpers, and object-binding exports before
    `AttributePattern.create(...).register(...)` can be spent as a metadata registry. Avoid reclassifying APs as
    "definition-only" unless the evaluator/registy substrate has genuinely lost that path.
  - callback routes deliberately remain partial and carry open seams for return/value closure until evaluator/effect
    tracing can model the produced value, not just its container reads
  - this lens is a route layer over DI provider atoms, not yet the full container construction model
- `framework.resources` is now the resource convergence lens:
  - it joins source carriers, public package exports, evaluated bundle admissions, syntax products, and
    materialization lanes into one row per resource carrier
  - the row is an evidence convergence view, not a claim about final container/template visibility
  - use this lens when a resource-specific question would otherwise require hopping through discovery, admission,
    materialization, and rendering just to learn which facts Atlas already has
  - convergence/resource-carrier/resource-export hops into materialization, admission, and syntax products now use
    declared semantic route specs so target lens/projection facts remain visible to `atlas.self`
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
    relationship rows through declared semantic route specs, making the hydration-to-activation handoff bidirectional
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
  - binding lookup, observer entity, and flow-to-entity semantic hops now use declared semantic route specs with
    explicit source/checker basis instead of empty local route claims
- `framework.admission` is now the relationship layer over evaluated configuration and bundle associations:
  - it turns bundle rows into relationship rows from configuration export to admitted target
  - relation, mechanism, phase, endpoint kind, original association kind, and evaluator certainty now reuse stable
    typed axes instead of admission-local enum/string mirrors; path/catalog/helper data remain admission-local evidence
  - admission relationship rows now use one generic `admits-value` relation. The admitted target taxonomy is carried by
    `to.kind` plus `associationKind`, so DI key/resource/registry/catalog/AppTask/factory distinctions do not create
    relation enum mirrors.
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
- Admission-to-materialization and admission-to-world-formation axes now live in
  `packages/atlas/src/framework/admission-world.ts`, not in runtime lens files. The runtime world-formation reader joins
  materialization/lifecycle evidence, while `FrameworkAdmissionWorldFormationInterpreter` owns the admission-only
  boundary interpretation. Semantic route hops for admission rows are centralized in
  `FrameworkAdmissionContinuationPlanner` and emitted through declared semantic route specs, so relation-to-lens
  choices are inspectable as typed route facts instead of being hidden in the large answerer.
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
  - record when broad admission queries become hot enough to justify a substrate improvement; do not promote them into
    daemon warmup by default
  - decide whether repeated AppTask admission-to-execution joins should become indexed relationship atoms or stay
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
  - decide whether repeated admission/materialization bridge rows should become indexed relationship atoms or remain
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
- Keep durable cache machinery out until repeated foreground pressure proves it belongs:
  - the package-scoped framework JSON cache was removed after source-epoch file/version caching made the old
    daemon-restart benefit narrow. Keep hot `SourceProject`-scoped memos near their owning readers, but
    do not reintroduce persisted cache families, producer hashes, dependency fingerprints, or env toggles without a
    fresh profile and a named substrate primitive that explains why the data deserves durability.
  - source-epoch memoization now lives in `source/memo.ts` as `SourceProjectMemo` and `SourceProjectKeyedMemo`. Use
    those named primitives for hot per-epoch rows instead of repeating ad hoc `WeakMap<SourceProject, Map<...>>`
    scaffolding in framework lenses.
  - if a derived relationship/effect family becomes slow again, first ask whether it should become a stable atom
    producer with exact row keys. A disk cache should be a consequence of durable substrate ownership, not a way to
    hide an awkward query path.
- Keep performance honest:
  - broad export member scans can still be expensive without a narrowing query
  - full call hierarchy/call-site expansion remains lazy unless an owning framework projection asks for it
  - bundle cold paths are dominated by first TypeChecker/evaluator reads and package-scoped resource fallback for
    declaration-file imports, not all-package scans.
  - rendering graph projections share cold materialization paths when they join syntax products, construction
    products, admissions, and binding effects.
  - daemon projection warmup and startup seed-index preloads have been removed. Keep startup focused on constructing
    the source epoch; bridge and framework indexes should fill on demand unless a profiler shows a repeated foreground
    query that cannot be made cheap at the owning substrate.
  - CPU profiling showed cold observation/rendering summaries were dominated by TypeScript host `getScriptVersion`
    `statSync` calls and repeated `normalizeFileKey` path resolution. `SourceProjectFileCache` and
    `NormalizedFileKeyCache` now make these source-epoch facts explicit; keep future source substrate performance
    work near those named primitives instead of adding per-lens caches for file identity/version facts.
  - `observers` uses `readExportNames` as the cheap admission surface and only expands TypeChecker export facts for
    observer-ish candidate names and DI observer interfaces.
  - `app-tasks`, `router-entities`, `expression-entities`, and `rendering-structures` use the same cheap public-name
    admission surface plus exact export expansion.
  - `framework.di`, `framework.materialization`, and bundle admissions now fill on first foreground use. If one becomes
    foreground-slow again, profile before adding cache or warmup policy back.
  - cold bundle admission without persisted JSON now costs roughly one foreground second on this checkout; keep that
    as the current price of simpler substrate ownership and profile before adding durability back.
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
