# Semantic Runtime Workbench

This note keeps active context close to the code while the package is still settling. It is not a roadmap and it should
not become a procedural dossier. If a detail stops being useful for orientation, delete it or promote the durable part
into the owning README or source contract.

Product-pressure grounding lives in [../../atlas/workbench/product-specific-pressures.md](../../atlas/workbench/product-specific-pressures.md).
Use that note when deciding whether a semantic concept belongs in product records, claims, provenance, inquiry answers,
or Atlas-only navigation.

Durable package boundaries live in [README.md](./README.md). App-builder durable context lives in
[app-builder/README.md](./app-builder/README.md), source artifact policy lives in
[source-plan/README.md](./source-plan/README.md), and fixture verification lives in
[fixture-verification/README.md](./fixture-verification/README.md). Keep this workbench focused on live context that
should not be mistaken for stable contract.

## Standing Context

The repo has consolidated around two internal surfaces:

- `packages/semantic-runtime` owns the Aurelia semantic product model.
- `packages/atlas` owns live orientation, inquiry contracts, and the hot local session used by Codex-facing work.

The static document packet and snapshot/query shell have been removed. The intent is for product semantics to live in typed substrate, vocabulary, auLink anchors, claims, provenance, materialized products, and open seams, with Atlas reading those surfaces directly instead of relying on parallel summaries.

## Package Shape

The broad horizontal substrate is present but not finished end to end. The active layers are:

- `kernel` for handles, vocabulary, records, claims, provenance, materialization, product details, and auLink.
- `boot` for source admission before semantic interpretation.
- `application` for framework-normal app topology shared by analysis, fixtures, and future app-building.
- `app-builder`, `source-plan`, and `fixture-verification` for AI-first app-building intent, neutral source artifact
  plans, and row-backed fixture pressure.
- `evaluation` for static module/value evaluation and explicit open seams.
- `resources`, `configuration`, `registration`, and `di` for Aurelia world construction.
- `i18n` for translation-key products admitted from static i18n configuration resources.
- `template` and `expression` for authored template/compiler surfaces and parser-owned recovery.
- `type-system` for TypeChecker-backed projection where runtime emulation should stop.
- `observation` for TypeChecker-backed ObserverLocator lookup, value channels, and source/target data flow.
- `router` for router model anchors that are not yet deeply wired into passes.

This breadth is intentional. The useful work is not to preserve compatibility with retired readers, but to let real
consumers pressure these layers and then refactor horizontally when the boundaries become clearer.

## Working Rules

- Start repo work through `pnpm --filter @aurelia-ls/atlas orient`.
- Build this package with `pnpm --filter @aurelia-ls/semantic-runtime build`.
- Keep `auLink` narrow: framework-symbol anchors only, not product taxonomy.
- When adding a prominent framework-shaped product concept, add or verify the corresponding `auLink` decorator while
  the framework source is fresh in context. If the bridge view is noisy, improve Atlas role/topology classification
  before treating the semantic-runtime concept as ungrounded.
- Use `auLink` placement facets only when one framework symbol is deliberately modeled by several product concepts.
  Current examples are built-in resource definitions, built-in template-controller semantics, and router runtime models;
  same-facet duplicate placements should still be treated as split-brain.
- Put durable semantics in product records and vocabulary, not in documentation tables.
- Keep uncertainty explicit with open seams instead of flattening partial knowledge into resolved-looking facts.
- Treat package-local READMEs as boundary notes. Keep them short enough that future agents actually read them.

## Decision Provenance

User-directed product taste:

- Model Aurelia framework concepts directly when possible. Prefer names such as `PropertyBinding`, `Controller`,
  `ObserverLocator`, renderer, binding, and template-controller semantics over custom emulator/policy suffix sprawl.
- Avoid compatibility shims while there are no external consumers. Breaking refactors are acceptable when they improve
  conceptual clarity and framework correspondence.
- Treat `runtime.ts` growth as pressure. If it starts compensating for missing semantic products, add or reshape the
  product layer instead.
- Use ordinary DI-injectable state classes and ID-shaped component boundaries in app-pattern fixtures where that better
  reflects idiomatic app design; do not lean on function bindables as an app composition pattern.
- Do not infer custom elements from cross-framework heuristics such as dash-cased tag names. Follow Aurelia runtime
  semantics and generated framework data instead.
- When evaluator or other low-level substrate gaps block an app-analysis path, pivot into the substrate instead of
  adding a narrow workaround. It is acceptable and expected for one gap to recursively trigger evaluator work,
  refactors, vocabulary/claim/open-seam refinement, Atlas visibility work, profiling, inquiry algebra improvements, and
  continuation cleanup.
- Treat external app repos as a clean-room understandability floor, not as smoke-test targets or literal product
  requirements. They should reveal pressure in routing, state, i18n, conventions, monorepo entrypoints, and mixed
  plugin usage, but the durable answer must be framework-grounded semantic substrate.
- Router work must be designed as a serious emulator-quality substrate for MCP, IDE, AOT, SSR, and SSG consumers. Do
  not build product features on top of a half-baked router model; verify `RouteConfig`, `RouteConfigContext`,
  `RouteContext`, route-recognizer, route-tree, and router resource behavior against Aurelia framework source and
  auLink/Atlas mirrors before generalizing from app pressure.
- For router specifically, prefer an early broad substrate that can represent context ownership, recursive route-context
  topology, recognizer ownership/inheritance, endpoint/state graph population, recognition candidates, viewport
  instruction creation, and route-tree/controller handoff over locally convenient vertical additions.
- Router topology also needs explicit `au-viewport` and `ViewportAgent` semantics. The viewport layer builds a parallel
  agent/tree surface alongside the controller tree, so route-context and route-tree products should not pretend routed
  component loading is only controller hydration. Treat `RouteableComponent` as a convergeable framework concept, closer
  in spirit to `CustomElement` convergence, not as a loose string/class/promise field on route configs.
- Use field-level provenance for authored TS/HTML/configuration facts whose fields can point at different spans,
  symbols, or contributions. Framework-fixed catalog concepts such as built-in resources, built-in bindables, syntax
  handlers, and renderers should normally rely on product/source provenance only; assigning the same framework
  provenance handle to every built-in field creates false edit/rename precision.

Current inferred engineering heuristics:

- If Atlas needs large local tables or fragile inference to explain this package, first ask whether semantic-runtime
  should expose a typed product record, vocabulary term, claim, or provenance link.
- Use Atlas pressure scripts as navigation, not as a substitute for understanding. A pressure row just chooses the
  next source span to inspect.
- Treat repeated kernel publication envelopes as ownership pressure. Router product records already have a shared
  helper; configuration products now have the same local primitive for the normal identity/product/materialization
  triplet. Remaining pressure in those files should mean orchestration or domain semantics, not copy-pasted record
  ceremony.
- Small framework-policy tables are helpful when they make a real axis mapping explicit; observation, hydration, and
  recursive rendering classifiers need framework-semantic review before table-only cleanup.
- When TypeChecker-backed expression, cursor, or binding-pattern code needs the same projected member/index/reference
  access, keep that as reusable type-system substrate. Answer-specific or evaluator-local resolvers are a split-brain
  smell unless the runtime semantics genuinely differ.
- Resource-definition watches now close at metadata convergence time for class/method `@watch(...)`, static `watches`,
  and definition-object `watches`. Treat runtime watcher execution, observer subscription, and lifecycle scheduling as
  a later controller/observation problem; do not push those concerns back into resource recognition.
- Weakly typed template member access should become diagnostic/suggestion pressure, not autocomplete guesswork.
  Index-signature-only owners can yield a selected synthetic member for hover/explanation, but no declaration-backed
  navigation target; cursor-info diagnostics should carry enough typed context for future code actions to recommend
  explicit owner properties or stronger app interfaces.
- Keep diagnostic policy explicit. Framework-grounded errors should be verified against Aurelia source and Atlas
  `framework.errors` before they are presented as framework diagnostics. TypeChecker strictness, weak app typings, and
  authoring suggestions can still be valuable LSP guidance, but they are product policy unless the framework itself
  throws/logs an equivalent code path.
- Framework kernel errors should enter through the substrate that owns the runtime behavior. DI world construction now
  has a `DiIssue` lane for duplicate source/static `$au` resource-key publication
  (`kernel ErrorNames.resource_already_exists` / `AUR0007`), modeled as the kernel warn-and-skip path. Runtime-html
  resource-definition registrar duplicates are not DI issues: custom elements (`AUR0153`), custom attributes
  (`AUR0154`), value converters (`AUR0155`), and binding behaviors (`AUR0156`) now surface as `ResourceIssue`
  resource-registration warnings from DI registration spending. Keep resolver-backed `registerResolver(...)`
  resource-key throws separate until resolver publication models that exact path. Ambient `resolve(...)` also enters
  through DI, but only module/static evaluation contexts spend `kernel ErrorNames.no_active_container_for_resolve` /
  `AUR0016`; instance activation contexts with statically nullish resolve keys spend
  `kernel ErrorNames.null_undefined_key` / `AUR0014`; caller-dependent functions/methods stay visible as app-topology
  facts until controller/activation semantics can prove more. Invalid `@inject`-family decorators also enter through
  DI when the TC39 decorator target is a method, getter, setter, or accessor; class and field targets are valid
  injection metadata carriers, and legacy parameter decorators are not claimed by the `AUR0022` lane.
- Treat same-handle field provenance as false precision unless there is a distinct authored span, symbol, contribution,
  or lower-level product provenance behind the field. Generated products such as compiler worlds, compiled templates,
  runtime/DI containers, resolver slots, renderer-created controllers, renderer-produced runtime bindings and target
  operations, spread-compiled instructions, generated view factories, embedded view definitions, router recognizer rows,
  and framework catalogs should normally rely on their product/source/evidence records and claims. If Atlas
  `pressure:product-architecture` reports same-handle fan-out again, inspect whether the row needs exact field sources
  or whether field-level provenance should disappear.
- Inline multi-binding is a secondary compiler grammar, not a custom-attribute-only domain. Keep custom attributes and
  template controllers on the same `MultiBindingValue` value-site lane and let the `AttributeClassification` carry the
  resource owner. Portal pressure exposed this: `portal="target: ...; position: ..."` must lower to bindable props,
  while neighboring HTML attributes do not target the portal view model.

## Active Pressure

Atlas should increasingly learn from this package through typed contracts:

- read terrain and source-surface inventory from typed product records, vocabulary, and claims;
- follow auLink anchors into the framework checkout;
- report stale, missing, or overlapping typed declarations where the product model itself exposes them;
- expose continuations that move between Atlas self-maintenance, semantic-runtime source, and framework anchors;
- avoid growing private product-specific inference tables when the product model itself can carry the intent.

The expression parser remains useful but provisional. It has grammar, AST, and recovery algebra, yet it predates the current kernel shape. Keep it callable parser machinery above source text until template/compiler ownership proves where its products should land.

Public plugin pressure added a first registry-body layer: `IRegistry.register(container, ...)` methods now become
registry-owned configuration sequences, static `container.register(...SomeArray)` spreads can expand through the
static evaluator, and evaluated object values with a `register` method classify as registry admissions. Registry body
invocation now uses source-address containment, including imported bundle modules when the evaluator can point at the
owning source-file address. Remaining open cases should mean the module/value is genuinely unresolved, not that the
join fell back to local-name matching.

External app pressure exposed the difference between a named bundle and the capabilities it carries. The browser
`aurelia` facade's default container is modeled as an implicit `StandardConfiguration` admission, but compiler-world
formation now asks for a runtime-html compiler-services capability rather than the bundle name directly. Decomposed
runtime-html groups such as `...DefaultComponents`, `...DefaultBindingSyntax`, `...DefaultBindingLanguage`,
`...DefaultResources`, and `...DefaultRenderers` are explicit framework registration kinds so custom bundles and AOT
decomposition have a semantic lane to enter later.

Large-app resource pressure moved convergence toward a mixed evaluator/checker boundary. Dependency arrays still prefer
evaluator-closed class/function values, but checker-visible constructable/callable identifier entries can now contribute
resource dependencies instead of opening purely because the evaluator stopped at an import or declaration boundary.
Member `@bindable(...)` contributes the bindable property even when its optional config object stays open.

Evaluator pressure from real app and plugin packages should keep landing in generic ECMAScript-shaped substrate before
domain recognizers compensate for it. The current evaluator can materialize class instances for statically known
constructors, including `this`, constructor parameter properties, instance fields, and instance methods/getters as
object-like properties. Function, class, and instance values are ordinary own-property carriers for static reads/writes,
CommonJS `exports`/`module.exports` participates in local module export linking, literal `require(...)` calls use the
same module graph as ESM imports, and small standard intrinsics cover closed array/object/map/set operations that app
configuration commonly uses. Regular-expression literals plus static `RegExp(...)` / `new RegExp(...)` calls now close
to evaluator-local RegExp values with source/flag property reads. `Function.prototype.call(...)` can invoke statically
known evaluator function values with an explicit `this` binding, and `typeof` follows ECMAScript's undeclared-identifier
behavior before reducing closed evaluator values to their primitive/object/function category. Unsupported runtime
construction, unknown globals, unresolved module edges, async/generator body execution, and dynamic mutation should
remain evaluator seams until there is a framework-independent substrate reason to close them.

Clean-room app pressure currently suggests imported bindable metadata is not, by itself, a semantic-runtime gap: local
module graph evaluation plus the Aurelia external value resolver can close exported bindable config objects,
`BindingMode` values, function setters, and type-coercion setters when the source is statically reachable. Treat future
failures in this area as evaluator/source-resolution pressure first, then as resource-convergence pressure only if the
evaluator value is already closed.

External monorepo pressure added a conservative boot source-role lane. Source files remain admitted for inventory and
navigation, but static app-world evaluation now spends only `app-source` TS/JS admissions. Tests, declarations, known
tool configs, package manifests, templates, and styles no longer contribute evaluator seams or app configuration by
being present under the workspace root. Boot now also discovers package/tsconfig project frames by default when the
host does not supply projects, excludes nested project roots from parent source discovery, and opens the default app
from the first project with import/receiver-grounded Aurelia app bootstrap signals. Keep the classifier conservative; explicit host project
selection is still the strongest answer when a monorepo has multiple app packages.
MCP hand-testing on a larger monorepo showed that workspace/project discovery can stay cheap enough to select an app,
but app-world opening may exceed Node's default heap even when the caller only asks for a summary. The immediate MCP
launch workaround is an explicit heap budget; the semantic-runtime frontier is to profile app-world construction by
phase and inquiry depth, then make callers pay only for the minimum honest substrate needed by the question instead of
materializing full downstream products by habit.
Follow-up MCP pressure confirmed the analysis-depth ladder: the same selected app shape can fail at full
`binding-observation` depth while `runtime-topology` succeeds and still exposes route/resource/diagnostic/open-seam
pressure. At topology depth, the dominant cost is still template compilation/runtime analysis, especially runtime
rendering and scope construction; TypeChecker program construction is visible but not the top bucket. Treat future MCP
first-read defaults and app-world performance work accordingly.
Default `openApp()` now chooses `runtime-topology`; template cursor/diagnostic convenience methods still default to
`binding-observation` because those LSP-style answers intentionally need observer/data-flow and weak-member pressure.
Opening a deeper or otherwise non-compatible app epoch for the same project clears cached app epochs before rebuilding,
because app-world handles are currently request-unsalted and duplicate if a shallow epoch remains in the same
workspace kernel. This is an honest invalidation policy, not the final cache architecture: a future app-epoch store or
handle-salt design could retain multiple depths at once.
`pressure:app-api` now has project-key and project-root filters so a broad workspace discovery pass can be followed by
one selected app-world profile without opening unrelated monorepo packages deeply. A clean-room app pressure sample
showed the useful timing split at this layer: template runtime analysis can dominate selected-app app-world opening,
with value-channel/data-flow/rendering/scope-construction buckets visible below the template pass, while TypeChecker
program construction remains separately visible. Treat that as a routing signal for future performance/inquiry-depth
work, not as a proof that MCP should hide the cost with larger heaps.
Project shape and project analysis policy are now deliberately separate. `shapeKind` records the discovered source/package
shape, while `analysisKind` says whether this project should be opened as an app world, opened as a standalone resource
library authoring world, inspected as an Aurelia package, or skipped as outside Aurelia. Pressure scripts default to the
app/resource-library policy; use explicit project-shape filters when deliberately stressing non-app packages.

The operational API boundary now lives in `api`. It opens an app by composing source admission, static module
evaluation, resource recognition, configuration admission, DI world construction, compiler-world formation, template
compilation, rendering dispatch, and TypeChecker-backed scope products. Keep initial answers compact; expose opaque
kernel handles only through explicit detail projections so the API can serve app developers and AI callers without
forcing every query into full graph expansion.
Query outcomes now pass through `QueryClaimGraph` before public answer serialization. Treat that graph as the lazy
answer/outcome layer, not as a kernel substitute: durable facts still belong in kernel products and claims, while
answer-local work, nested query composition, payload shape, query type projections, and disposal policy belong in
the query-claim layer. When a public query grows kernel products, first check the query catalog materialization policy
and telemetry output before adding another cache or eager projection.
Telemetry pressure has already shown a few useful compression rules:
type-member details can be hot children of a durable type-shape rather than durable products themselves; declaration-backed
TypeChecker/evaluated-value type shapes can converge by checker key and declaration source while expression/binding rows
own the user-facing source locus; checker-owned union/intersection keys can converge structurally when their
constituents are source-independent; template-requested checker-returned types should keep `TypeChecker` origin instead
of being mislabeled as synthetic; and kernel handle strings are session transport links that may compact long recursive
local keys. Do not recover semantics by parsing handles. True synthetic template/expression products still keep their
runtime expression/site identity unless a later structural synthetic-type policy proves it can preserve lost provenance.
Query-time type projections that are retained only for an answer should stay behind query-claim retention/disposal
whenever the inquiry profile does not need durable app-world facts.
Template weak-member diagnostics are now explicitly depth- and projection-gated. `runtime-topology` and
`binding-targets` overview and diagnostic-summary queries should not publish retained TypeChecker products, and
`AppOverview` asks its nested diagnostic summary with `diagnosticProjection: available-products` even at
`binding-observation` depth. Explicit diagnostic surfaces still default to `type-projection` because those queries are
the current file/app-locus weak-member substrate. The next frontier is a query-local projection store behind
`QueryClaimGraph`, so retained diagnostic TypeChecker facts can be disposed with query/session/app epochs instead of
graduating to durable kernel records by default.
Authoring/LSP template analysis is now a separate opt-in lane on app opening. Hydrated app templates remain on
`templates.resources`; standalone resource-library templates can be compiled into `templates.authoringResources`.
`openApp({ includeAuthoringTemplates: true, authoringTemplateSourceFiles: [...] })` is the preferred editor/LSP shape:
source-file selection keeps the authoring compiler world tied to the file being asked about. `authoringTemplateLimit`
remains a pressure/fallback budget, not the durable API shape. This split exists because external monorepo sampling
showed hundreds of recognized custom-element templates with no app-root compiler world, while compiling all of them at
once can exhaust the Node heap. The durable direction is file/locus-budgeted authoring opens, not pretending every
recognized component is part of the hydrated app topology. Source-file address lookup now indexes suffixes of admitted
source paths, so project-relative editor paths can resolve to the same source-file addresses as workspace-relative or
absolute host paths. `openApp({ sourceFilePath, includeAuthoringTemplates: true })` now uses the source file to select
the owning project when the caller does not already know a monorepo project key, and uses that file as the default
authoring template selection.
Direct cursor-locus API calls (`templateCompletions(...)` / `templateCursorInfo(...)`) have a slightly different
context rule: they first reuse an opened app whose compiled template owns the cursor source, even when the file itself
belongs to a dependency/resource package. If no app contains the cursor, they open the selected project with an
authoring lane whose default source selection is the cursor file. Keep that distinction; external app pressure showed
that file-owner project selection alone can lose app context, while project-wide fallback compilation can make a single
cursor inquiry pay for an entire resource library.
Route configuration is now a first authored router layer in that flow. `@route(...)` and `Route.configure(...)` produce
source-backed route config products and `routes` API rows before route-context, route-tree, or route-recognizer
emulation exists. The product is anchored to Aurelia's normalized `RouteConfig` class; `IRouteConfig` and
`IChildRouteConfig` remain authoring input shapes until there is a real input-contract product. Static route properties
now follow Aurelia's `Route.getConfig` behavior: a class with route-shaped static metadata can produce a route config
even without a `@route` decorator, and lazy `import(...)` components are modeled as the router's promise-shaped
routeable component lane instead of as open components. Routeable components now preserve that source lane while
carrying resolved custom-element resource handles when the static module graph can close the fulfillment. The evaluator
supports simple promise-fulfillment chains, and follow-up expression readers must preserve the evaluated module's
policy/runtime host so dynamic imports stay linked after the first module pass.

`routePatterns` now adds the first route-recognizer handoff by parsing closed route-config paths into
`ConfigurableRoute`, `Parameter`, and static/dynamic/star segment facts with route-config-context ownership.
`routeEndpoints` materializes the next framework product from `RouteRecognizer.add(..., true)`: primary endpoints and
residual catch-all endpoints for routes that do not already end in a star parameter. The first state-graph products are
also materialized as separator/static/dynamic/star/residual `State` nodes, following the same append semantics as
Aurelia's route-recognizer. `RouteRecognizerStates` rows now expose state kind, segment name/pattern presence, previous
state, forward `nextStates`, endpoint closure, and dynamic/optional/constrained flags. Closed static router-resource
instruction paths now walk that forward state graph into `RecognizedRoute` products and `recognizedRoutes` API rows. The
recognizer port follows Aurelia's candidate chain closely enough to preserve optional-state skips, segment-rank
candidate ordering, residual extraction, and handler-based endpoint grouping; compare endpoints through the owning
route-config identity, not the configurable-route row, because multiple paths and residual endpoints share the same
handler in the framework. Route-recognizer registration failures now cite exact raw framework Error authority through
`RouteRecognizerRawErrorAuthority` when Aurelia has no mapped AUR code: duplicate paths, reserved `$$residue` dynamic
or star parameters, and ambiguous endpoint assignment close the corresponding Atlas `semantic-raw-references` rows.
Closed static redirects now publish re-recognized target rows with `redirectDepth`, which lets
transition tree compilation skip the redirect route itself and consume the target route node. Resolved routeable
components also seed template compilation as routeable resources, which lets
nested routed templates and `au-viewport` / `ViewportAgent` topology surface before a future route-tree/navigation
emulator exists. Treat this as recursive static topology, not viewport activation.

Router option convergence now sits before route-context materialization. `RouterConfiguration` admissions create
framework-defaulted `RouterOptions` products, owner-tagged `customize(...)` option contributions fold into those options,
and the API exposes them through `routerOptions`. Route-context topology starts from configured app roots when the app
root is known, with graph-root fallback for library-style package analysis. Component-level static route metadata is
applied during topology traversal when a route points at a component that owns child route metadata, so nested child
routes become visible without requiring navigation. `useEagerLoading: true` reuses the root recognizer for child
contexts and materializes parent-prefixed recognizer paths while keeping local authored route paths separate. A future
applied-`RouteConfig` product may still be needed if consumers need exact `RouteConfig._applyChildRouteConfig(...)`
provenance rather than topology-level application.

Route runtime topology now separates `RouteContext` from `RouteConfigContext`. The former is materialized after routed
templates are compiled, because it needs the controller/container and `au-viewport` boundaries that the framework uses
when `ViewportCustomElement.hydrated`, `RouteContext._registerViewport`, and `Router._getRouteContext` cooperate.
`ViewportCustomElement` and `ViewportAgent` products now point at runtime `RouteContext` references; child route contexts
point back to the hosting viewport agent selected through framework-shaped viewport-name/`usedBy` matching. These are
static potential route contexts, not proof that a `RouteNode` exists or that viewport activation has run.
`Router._getRouteContext(...)` is pair-keyed by `(ViewportAgent | null, RouteConfigContext)`, so semantic-runtime no
longer treats component definitions or route config contexts as singular route-context owners. Router-resource
instruction materialization follows every modeled runtime context for a component template, and transition route trees
are emitted only when the full recognized instruction chain resolves through `ViewportRequest -> ViewportAgent ->
RouteContext` without an open seam. Without a first-class partial-tree product, prefixes of an unresolved chain should
stay as open pressure rather than resolved-looking route trees.
External pressure also caught a faithful-porting bug in parent-relative router resources: the framework's
`RouteContext.createViewportInstructions(...)` climbs once per `../` before setting the context-changed flag. Setting
that flag inside the loop stripped extra prefixes without climbing and pushed recognizer matching into a sibling
configured context. Treat future router-resource normalization drift as framework-source pressure first.
The first `RouteTree` materialization now mirrors the framework's lazy initial tree: a synthetic root `RouteTree` with
one root `RouteNode` tied to the root route context, root route config, and effective router options. This is deliberately
weaker than full navigation. The router-resource handoff layer now materializes static `load` and internal `href`
values through a RouteExpression parser into `TypedNavigationInstruction`, `ViewportInstruction`, and
`ViewportInstructionTree` products, with compact API rows that expose instruction kind, nested child shape, viewport
suffixes, parameter counts, grouping markers, route-context closure, option/query/fragment flags, and dynamic-route open
seams. Recognized-route products are visible as the next handoff, and non-redirect recognized routes now compile into
context-relative transition `RouteTree` / `RouteNode` products that preserve `RouteNode.create(...)`-shaped instruction,
recognized-route, params/query/fragment, viewport, residue, path/final-path, parent, and child facts. Static-prefix
interpolated route strings now keep static path/query shape by substituting opaque dynamic holes before RouteExpression
and recognizer materialization; fully dynamic `href.bind` values remain open until evaluator or TypeChecker flow can
prove enough about the value. Redirect-target recognition is visible through `redirectDepth`, while redirect loop
diagnostics, guard/lifecycle scheduling, and viewport activation remain separate router products to design from the
framework source before they are exposed as app facts.

Component-agent pressure has crossed the first framework-shaped handoff. Recognized route nodes with resolved routeable
components now materialize `ComponentAgent` rows and `routed-custom-element` runtime controllers backed by inherited
child containers, matching `RouteContext._createComponentAgent(...)`/`Controller.$el(...)` closely enough for static
controller/template visibility. These rows are pre-activation products: `created` readiness is honest and should not be
inflated into bound/attached lifecycle state.

External-template provenance pressure found that imported HTML asset modules can be linked by static evaluation even
when the boot project did not originally include those assets. Resource recognition now receives the graph-linked source
admissions and matches imported template paths by absolute path, so template attributes point at the HTML file instead
of the TypeScript carrier span. Treat similar source fallbacks as substrate bugs until proven otherwise.

The remaining router pressure should be handled like attribute/expression parser pressure: redirect loop/edge-case
diagnostics, component-agent / ViewportAgent handoff, endpoint requirements, recognition candidates if they need
first-class provenance, and route-tree provenance before app-specific navigation behavior is wired to them.
Atlas now has a `framework.router` recognizer projection for Aurelia's route-recognizer internals. It separates path
grammar, state graph, endpoint registration/materialization, recognition walks, candidate selection, and cache/lookup
mechanics, with self-audit rows over the curated exact-source descriptors. The auLink mirror now joins those router
relationship rows, so `bridge.aulink` can verify that semantic-runtime router and route-recognizer anchors have
framework-router role evidence rather than only raw declaration matches. Use those projections before designing deeper
semantic-runtime route-recognizer products.
App-world project emissions carry aggregate phase timings for pressure lanes. Treat those timings as diagnostic
orientation, not as product facts: they are useful for deciding whether large-app friction is in static evaluation,
TypeChecker construction, resource recognition, app-world composition, or template compilation without storing
app-specific identities.
Binding data-flow API rows carry the parser publication state, result kind, and value-site kind alongside source/target
flow facts. That keeps open data-flow pressure explainable when the expression parser intentionally published a
companion/degraded result instead of a canonical AST-bearing success, and lets app pressure distinguish weak/null target
types in binding-command values, text interpolation, attribute interpolation, and multi-binding lanes.
Known-invalid reverse writes are not open seams. A two-way/default binding whose source expression is a computed
comparison is fully understood as source-to-target flow plus a runtime-unassignable target-to-source assignment. Keep
that on `sourceAssignmentKind` / `sourceAssignmentReason` / `sourceAssignmentReasonKinds` and pressure summaries
instead of reporting an `OpenDataFlow` seam. The reason-kind array is the durable policy surface; the prose reason is
for local human explanation and may include type displays or source member names.
Spread value bindings should not reopen runtime data flow merely because the TypeChecker source object lacks a target
bindable property. Record that as a source-type gap; the runtime read still has a well-defined `undefined` outcome.
External template pressure closed an interpolation/data-flow gap around class attributes whose interpolation holes contain
template literals and nested `${...}` template expressions. The durable lesson is parser ownership, not the app shape:
interpolation scanning now uses shared template-aware boundary lookahead to find the exact hole slice before completed
input parsing, and successful expressions without a closing interpolation `}` publish a frontier instead of relying on EOF
as a pseudo-boundary. The larger external pressure lane now reports complete binding data-flow parse state for all
observed rows.
Framework comparison proved that Aurelia's runtime interpolation parser accepts a final complete interpolation body at
EOF even without an authored closing `}`. Semantic-runtime keeps the parser publication strict, but
`template/expression-parse-projection.ts` gives binding value-channel and data-flow materializers a runtime-accepted AST
projection for exactly that missing-close frontier. External pressure now keeps those rows as
`interpolation-frontier-publication` companion parses while the binding data-flow itself is closed.
Parser span rebasing is now explicit: `absoluteTextSpan(...)` is the non-null path when a relative parser span and a
base source span are both known. Do not reintroduce nullable absolute-span fallbacks in parser publication code; if a
span cannot be rebased, the caller has lost the parser/source ownership chain and should fix that lower-level handoff.
`InterpolationParser` is split into scanning and an `InterpolationPublicationFrame` lifetime object so active-hole
selection, suppressed-hole promotion, and strict/runtime projection pressure stay separate from boundary extraction.
Unresolved globals and async/generator bodies in non-app-root resource libraries remain evaluator boundary pressure,
not app authoring API pressure.
The dialog configuration registry pressure also exposed a lower-level evaluator leak: configuration recognition was
re-reading expressions through a fresh default evaluator, losing the Aurelia runtime host used during module evaluation.
`StaticModuleEvaluationResult` now carries the policy/runtime host into `StaticEvaluationExpressionReader`, and dialog
configuration chains preserve a framework registration kind through `.customize(...)`/`.withChild(...)`. AppTask factory
calls are configuration-owned lifecycle products, not registry bodies for DI to spend. DI world construction now threads
registered AppTask products into its lifecycle task list and closes the AppTask registry admission without executing the
callback body. Remaining seams in that lane should mean evaluator/global-boundary pressure or a genuinely unrecognized
registry body.
Public plugin pressure also clarified the registration/activation boundary for callback resolvers: a
`Registration.callback(...)` or `Registration.cachedCallback(...)` call is a closed resolver admission once its key and
callback expression are known. Reading `container.get(...)` inside that callback belongs to future activation-dependency
queries, not registration recognition, so callback bodies should not appear as registration open seams.
Public plugin pressure added a checker-backed IRegistry admission lane. If a register argument's static type exposes a
callable `register` member, configuration recognition now classifies it as a registry even when static evaluation cannot
read the imported value. This intentionally moves pressure from "unknown registration strategy" to "registry body source
not admitted/interpreted"; the next architectural pressure is cross-project or dependency-source composition, not local
name matching.
The same public plugin pressure also exposed declaration-first module resolution as a substrate issue. The evaluation
module host now maps shipped package declarations back to authored `src/*` files for common package layouts, so a
source-shipped plugin can contribute its actual registry body and resources instead of only a checker-shaped opaque
registry.

The previous analyzer-shaped fixture was removed because it optimized for current recognizer closure rather than
idiomatic app-building pressure. Future fixtures should split stress coverage from app-pattern examples: stress fixtures
can be dense, while `../fixtures/pressure/app-pattern-*` and `../fixtures/pressure/app-builder-*` should carry
framework-normal app shapes once the substrate can analyze them. The legacy authoring spine has now been retired; future
codegen should land through app-builder plus neutral source-plan and fixture-verification layers instead of ad hoc
scaffold templates.

Recent observer work clarified that `CheckedObserver` value channels are source-shape driven. Plain checkbox bindings
can close as boolean flows without requiring `model`/`value` element closure, while array/set membership sources still
consume the lowered sibling `model.bind`/`value.bind` products or the platform default input value. Map sources use a
distinct checked-map keyed-boolean channel: the element model/value is the key, and data-flow assignability checks both
key compatibility and whether the map value type can accept the checked boolean. Source TypeChecker gaps for otherwise
closed binding flows should stay on the data-flow row as strictness pressure, not reopen runtime binding emulation.

The value-channel layer is now split by responsibility. `binding-value-channel-drafts.ts` owns observer/accessor/direct
operation semantics such as select option domains, checked collection/map behavior, class/style channels, ref source
writes, and lazy source-type reads. Inside that draft layer, direct binding, select, and checked observer collaborators
depend on explicit TypeChecker/type support rather than on a catch-all materializer-as-service-object. `binding-value-channel-materializer.ts` owns kernel publication only: product
handles, identities, claims, provenance, materialization records, and open seams. Keep that split intact; future
observer semantics should move into the draft layer or into framework-shaped observer classes, not back into product
publication.

The data-flow layer now follows the same publication-vs-semantics split. `binding-data-flow-materializer.ts` still owns
the `RuntimeBindingDataFlow` product records, claims, and open seams, while local collaborators own draft assembly,
source-expression projection, `astAssign` write capability, TypeChecker member access, and source/target assignability.
Do not re-add data-flow policy to the publication owner just because a new observer branch needs one more assignment
rule; put it near the source/write/assignability collaborator that owns the data-flow question.

Router-resource dynamic binding pressure belongs in the binding-source substrate, not in router-specific expression
guessing. `binding-source-value-evaluator.ts` now lets router instruction materialization ask the binding layer for a
static string value, including guarded local getter reads over evaluator-known view-model classes. If the getter depends
on host environment state, the router seam should remain open with typed lower-level reason kinds attached rather than
being forced into either an internal route or external-link bucket. Open seam pressure should aggregate those reason
kinds, not parse summary prose. If the blocked value comes from a runtime/local scope slot, the router seam should carry
the binding-source slot reason alongside `router-instruction-needs-static-value`; do not hide that under a generic
router expression failure.
Parent-to-child controller property values are now carried by `RuntimeBoundControllerValueTable` in
`observation/runtime-bound-controller-value.ts`, with `RuntimeBindingSourceValueEvaluator` as a consumer. This matters
when a child view-model method reads a bindable callback or scalar supplied by a parent template:
the binding target is the child controller, while the source expression is evaluated in the parent scope. Template
controller and narrowing scopes can copy a view-model binding context while legitimately changing the scope owner to a
synthetic view, so value evaluation must be able to fall back from exact controller handles to an unambiguous
definition/type match. If several call sites bind the same definition property, keep the value open until recursive
rendering can select the concrete call context; do not collapse that ambiguity in router or diagnostics.
Host environment and external module reads are now explicit evaluator boundary values. The old object-level
missing-property reason blurred host state with ordinary object fallbacks, and external package imports blurred
dependency boundaries with missing lexical bindings. The durable rule is: boundary objects/values propagate through
expression evaluation as boundary values; materializers such as router-resource instruction materialization decide
whether a boundary value is a product seam.

Evaluator open-seam provenance must be node-owned. Imported function or class bodies can be interpreted while the
current caller module is elsewhere, so each evaluator seam carries the source file of the syntax node that produced it
and kernel emission resolves/admitts that source before writing source spans. Treat any future "caller source with
out-of-range span" symptom as a substrate bug, not as a presentation issue.

External app pressure closed several generic ECMAScript lanes that should stay in the evaluator layer: optional chains
over concrete nullish receivers reduce to `undefined`; function declarations inside interpreted function/block bodies are
instantiated before statement execution for authored UMD/CommonJS helper shapes; async function calls produce
Promise-shaped values whose fulfillment lane is an explicit async-execution boundary, with Promise continuation
intrinsics preserving that lane instead of executing callbacks. Remaining host-backed product seams should now be
handled by environment/dependency policy or by the consuming materializer, not by reclassifying them as lexical or
dynamic evaluator failures.

Registry-body interpretation is separate from body-step production. A recognized `register(container)` body that emits
zero registration steps is still interpreted for that admission, so DI world construction should not report it as an
uninterpreted body merely because the body had no effects. Registry/admission handles include project identity because
shared linked sources can be analyzed under multiple project frames in one runtime session.

Zero-method `*Input` classes are not automatically product models. Template pass handoffs that only bundle arguments for
one call should be request/plan interfaces plus named object literals, not positional constructor envelopes. Keep classes
for things with product identity, framework grounding, behavior, or lifetime. `BindingCommandBuildInput` is currently in
that latter bucket because it mirrors framework `ICommandBuildInfo` through auLink and carries command-execution topology;
ordinary parse/lower/materialize pass inputs should stay as request interfaces.
Do not let that product become a dumping ground for surrounding compiler topology. It should model the framework command
input boundary (`node`, `attr`, optional bindable/definition), while selected value-site or expression topology should
stay claim-backed or be looked up by the materializer that actually needs it.
The first cleanup pass left no ordinary zero-method `*Input` class pressure at the default Atlas threshold. If the smell
returns, check whether the class is a product/facility with lifecycle or merely a method payload; projector and runtime
handoff payloads should default inside the receiving service instead of encoding positional constructor order.

Large external-root pressure narrowed template runtime cost to binding observation rather than the compiler front door.
`pressure:app-api` and `profile:app-telemetry` now print nested template compilation and runtime-analysis timings,
including memory/kernel deltas when full telemetry is enabled. `profile:app-telemetry` also has an opt-in fine phase lane
(`SEMANTIC_RUNTIME_TELEMETRY_FINE_PHASES=true`) that breaks runtime rendering and scope construction into internal
subphases. Use full phase memory/kernel snapshots for density questions; use fine phases with
`SEMANTIC_RUNTIME_TELEMETRY_PHASE_MEMORY=false` and `SEMANTIC_RUNTIME_TELEMETRY_PHASE_KERNEL=false` for cleaner CPU
attribution because each measured subphase otherwise pays snapshot overhead. Current canaries show render-target sequence walking and nested
template-controller child sequences as the hot scope-construction path, while runtime rendering's product growth is
mostly admitted at commit time. Parent templates hydrate child custom-element controllers and child view-model scopes
for bindable flow, while child view internals stay owned by the child resource's own runtime-analysis emission; only
built-in template-controller synthetic views recurse through embedded instruction sequences. The large-root canary that
exposed the issue dropped from roughly 388k records / 71k products / 404MiB construction heap to roughly 120k records /
23k products / 249MiB after this aggregate boundary was restored, and the top product growth shifted back to ordinary
template compiler/value-site rows. After that cut, observer setup diagnostics were the next runtime-rendering CPU
canary: they now invoke ObserverLocator only when a bindable actually has coercion or change-callback semantics to
validate, with target-type property checks cached per controller definition. Binding expression
type projections should be keyed by the expression product and modeled `Scope`, not by the downstream materializer that
asks first; otherwise value-channel and data-flow duplicate the same TypeChecker projection under different local keys.
Value-channel source-type reads should stay lazy because many channels can be described from target access, source
operation, observer semantics, or static template domain without projecting the bound expression.

The performance lesson is also an inquiry-algebra lesson. Full template typechecking/autocomplete legitimately needs
value-channel and data-flow source-type analysis. Router/resource/controller topology generally does not.
`SemanticAppAnalysisDepth` is the first API-level expression of that distinction:
`runtime-topology` materializes runtime rendering, scopes, route topology, route instructions, route trees, and component
agents; `binding-targets` adds Controller.bind target/source setup; `binding-observation` adds value-channel and
data-flow products. Binding-specific API queries should report `unsupported` when an app was opened at a shallower
depth rather than returning silently empty rows. The next inquiry-algebra pressure is below this app-world split:
large roots still pay TypeChecker construction, resource recognition, and static evaluation when a product question may
only need a narrower resource/router slice. Generic adapters should choose app depth from the query catalog's
`minimumAnalysisDepth` instead of defaulting to deepest analysis.
Query-claim retention is the first per-consumer memory/CPU policy layer below app-world depth. `lsp-diagnostics` now
keeps lightweight session claim records but disposes answer-local TypeChecker products; fixture and app-builder pressure
lanes may retain those products for app-epoch inspection. Keep this split intentional when adding query-local
projections: cursor queries need fast follow-up, diagnostics can spend more CPU, and fixture/app-builder pressure often
needs to inspect the generated kernel shape. Session profiles have retained-record budgets so repeated cursor/diagnostic/MCP queries do not
make the claim graph another unbounded cache; budget disposal is graph-owned and prunes answered/failed nodes only.
`profile:app-telemetry` aggregate output now preserves root/depth/profile groups before global totals. Use that view for
depth-policy comparisons; if a global aggregate points at memory pressure, first check the grouped row to see whether
the cost arrived at `runtime-topology`, `binding-targets`, or `binding-observation` before adding a cache or trimming a
detail shape.

When `product.architecture` reports duplicate helpers, treat the row as a question, not a quota. The pressure includes
both exact body fingerprints and AST/control-flow body-shape fingerprints, so rows can mean exact duplication, equivalent
control-flow shape, or only same-name conceptual pressure. Shared primitives that now have one home include kernel claim
filtering/nullability, attribute fallback casing, instruction-kind vocabulary mapping, generic first-seen de-dupe,
TypeScript declaration names/static modifier detection, whitespace tokenization, checker type-shape classification,
HTML tag/attribute helpers, module specifier policy, interface-key recognition, bindable attribute fallback, and
registration factory argument/name reading. Catalog-specific summaries intentionally remain local until there is a real
shared message model.

Resource-recognition performance pressure can be a proxy for lower-level TypeChecker provenance cost. A large-root
profile showed `kernel-emission` dominating while named/syntax recognition and convergence were cheap; the root cause
was checker type projection scanning all store addresses for every projected member declaration. `KernelStore` now owns
a source-file-address suffix index via `readBestSourceFileAddressForFileName(...)`, so declaration provenance lookup is
indexed and shared by every checker projection lane. If this pressure returns, profile below the resource-recognition
label before tuning recognizers or weakening source provenance.
Checker-backed declaration provenance also needs to handle Program files that were not boot-admitted as app sources.
`type-system/declaration-source.ts` owns that boundary: it first reuses admitted source-file addresses and otherwise
materializes a Program-source file address for declaration navigation. Keep this path source/provenance-oriented only;
do not treat Program-only declaration files as newly discovered app code.

Mixed-monorepo pressure should be separated into workspace discovery, project-shape triage, app-world construction, and
all-project stress. `SemanticRuntimeSummary` now exposes per-project source-role counts, Aurelia app entrypoint
signals, and a formal cheap `SemanticProjectShapeKind`. The shape policy first counts manifest dependencies on
`aurelia` / `@aurelia/*`, then parses app-source files for Aurelia facade import/default-import/namespace-import,
constructor, `.register(...)`, `.app(...)`, and `.enhance(...)` signals. `openApp()` without a project key prefers `aurelia-app` projects
before falling back to a project with admitted app source and then the first booted project. Use these rows to choose whether a caller wants app entrypoints,
resource-library packages, Aurelia packages without app facade evidence, or a full package scan before paying
TypeChecker/static-evaluation/app-world cost for every project. The stress script may still open every discovered
project because it is intentionally pressure-oriented; product APIs should make the scope explicit.
`SEMANTIC_RUNTIME_PROJECT_SHAPES` lets pressure runs select a subset of exact shape kinds when the question is app-like
topology rather than all-package stress. The accepted tokens are the runtime enum values: `aurelia-app`,
`aurelia-resource-library`, `aurelia-package`, and `non-aurelia`.

Static-evaluation module graph cost is now source-host-profiled instead of opaque. A large external runtime-topology
canary showed evaluator execution itself was small; the hot work was building one graph through TypeScript module
resolution and file-system probing. `FileSystemEvaluationModuleSourceHost` now owns a per-pass TypeScript
module-resolution cache, cached file-system adapter, declaration-to-source policy cache, framework/package external
boundary policy, and source-host profile rows. On that canary, static-evaluation fell from roughly 1.07s before
profiling to roughly 0.33s after host caching, framework/package boundary skipping, and admission-policy cleanup. Treat
future module-graph pressure as a source-host/admission/inquiry-depth question before adding evaluator semantics or
broad app-world caches. Direct evaluator path probes are for JSON/HTML/CSS asset imports and query-bearing specifiers;
ordinary TS/JS relative imports should let TypeScript choose source/declaration semantics. A measured post-TypeScript
fallback path-probe retry resolved no modules in the large canary and should not be reintroduced without profile
evidence.

`pressure:app-api` defaults to checkpoint-friendly compact aggregate output: request shape, fixture lanes, timing
buckets, expression-type cache buckets, and one-line pressure buckets for app-patterns, router, binding, observation,
diagnostics, and open seams. Use compact first during fixture-contract work, then open
summary/raw detail only for the pressure family being changed. Treat `inputs.fixture-lanes` as part of the reading:
app-pattern fixtures, app-builder pressure fixtures, and stress pressure fixtures intentionally answer different questions. The
same compact output carries safe `inputs.fixture-keys` and fixture-owner cross-tabs for
source-assignment reasons, framework error codes, template missing inputs, and open-seam reasons; internal fixtures use
`pressure:<folder>` or `pressure:<folder>`, while custom roots collapse to `custom-root`. Use those rows to choose
the next public fixture to open before doing isolated per-fixture runs. The error-code fixture rows are the preferred
first read when a broad diagnostic count such as `AUR0654`, `AUR0813`, or a router code needs a concrete owner.

Cursor/LSP pressure has its own script now: `pressure:cursor-loci`. It samples bounded template cursor positions and
prints aggregate site kinds, outcomes, completion pressure classes, value-site kinds, candidate lanes, public API
answer mismatches, cursor-info source coverage, focused selected-member coverage, hover/navigation targets, diagnostic
signals, compact LSP envelopes, value-domain gaps, and bucketed missing-input reasons without paths, source text, or candidate names. Use it with
`SEMANTIC_RUNTIME_CURSOR_PRESSURE_ROOTS` for external roots when a question is about hovers/completion/navigation
pressure rather than whole app topology. It now mirrors app pressure's project-discovery override and requests paged
runtime-summary project rows explicitly, so package-tsconfig monorepo roots do not accidentally report zero cursor
pressure. Current sampled behavior is: generic expression scopes, binding-command names,
resource names, bindable names, expression member owners, and parent repeat scopes are reachable; plain static platform
attribute values are classified directly from HTML/syntax products and do not publish durable value-site products or
missing-input rows, while
real platform interpolation values publish `plain-attribute-interpolation` and spend expression holes through normal expression completion; finite checker-backed static bindable domains offer literal
`attribute-value` candidates; open-ended checker-backed scalar bindables are expected-empty completion sites; inline
multi-binding custom-attribute values can offer bindable segment names from the resource definition; and router
`load` primary values now offer `router-route` candidates from typed `RouteConfig` product details threaded through
the completion query. Plugin-style segment values such as table sort keys now report bindable-domain pressure when the
inner segment resolves to a bindable, which keeps untyped plugin semantics separate from whole-custom-attribute grammar
gaps.
Static i18n resources now have their own product lane: `I18nConfiguration` `initOptions.resources` contributions can
materialize `I18nTranslationKey` products, and `t="..."` value completion spends those product handles through the same
cursor adapter as router/resource/scope candidates. Keep this as configuration-owned i18n substrate, not an answer-local
string scan. Imported JSON key spans use the evaluator's asset-module source mapping so i18n key products can point at
authored JSON property spans rather than the generated default-export wrapper. If pressure shows top-level
`I18nConfiguration.resources`, treat that as a configuration option-shape diagnostic instead of widening the catalog:
the framework callback receives `I18nConfigurationOptions`, whose resources live under `initOptions.resources`.
Built-in template-controller primary values now read the framework-shaped semantics profile before reporting a domain
gap. Open primary values such as `case="..."` are expected-empty completion sites because the framework accepts broad
runtime values; secondary bindables and custom/plugin template-controller grammars should still surface value-domain
pressure until their grammar or checker-backed candidate lane is modeled.
Router-resource instructions now resolve their owning `RouteContext` from modeled controller/container ancestry before
falling back to route-config component-definition matching. This matches `load` / `href` resolving `IContextRouter` from
the custom-attribute controller container chain and prevents ordinary child components inside routed components from
being misclassified as context-less router-resource sites. Remaining router-resource seams after that are static-value
or host-environment boundaries, not route-context ownership gaps.
For `href`, the open seam must also preserve the framework's externality gate. `HrefCustomAttribute.valueChanged(...)`
calls `_resolveIsExternal(...)` before it creates viewport instructions; static external URLs and explicit
`external`/`data-external` markers should not publish router instruction products. Dynamic `href` values that cannot be
proven external or internal now carry `router-href-externality-open` beside the static-value and binding-source reasons.
External app pressure then split the dynamic `href` problem into honest lanes. Values that flow through weakly typed
callbacks, external URL fields, or bare external module imports stay open, because the framework would decide
externality at runtime. Values whose view-model method body preserves an authored internal route prefix now close
through evaluator `string-pattern` values:
runtime binding-scope locals become boundary holes, TypeScript template strings / concatenation preserve static parts,
and router instruction materialization feeds the placeholder path into route recognition without claiming the concrete
runtime parameter is known. `fixtures/pressure/router-dynamic-pattern` keeps that distinction alive.
Listener expression scopes now model Aurelia's transient `$event` override-context slot before the expression is
evaluated. Member-owner completion uses an offset-aware evaluator walk, so a listener expression can surface event
members through `$event.foo` and through callback parameters such as `(e) => e.foo()` without adding a second
completion path.
Expression evaluation now accepts a contextual target type from binding data-flow and template completion value sites.
This lets function-valued bindables type arrow parameters through the target callable signature when that signature is
available. The sampled external callback pressure did not drop because those app/plugin surfaces expose `unknown`,
`any`, or index-signature-only member owners; that is useful app typing pressure, not a reason to invent completion
members.
The public template-completion API now reselects compiled resources by matching the cursor against the resource's
authored HTML span set rather than only the template-source carrier span. Keep that shape: exact cursor ownership can
live on HTML nodes, attributes, values, or generated template-address authored spans depending on how the template was
admitted.
The public `TemplateCursorInfo` API shares that cursor-selection path but returns the semantic site under the cursor
instead of candidates. External cursor pressure now compares both completion answers and cursor-info site/value-site
classification and source-bearing target coverage. It also derives hover targets, navigation targets, diagnostic
signals, and compact LSP envelopes from those same cursor-info rows, giving future hover/definition/diagnostic work a
shared footing without a separate source scan.
Cursor-info also carries the selected bindable when classification or the active value site resolves one, so future
definition/hover answers can target the bindable declaration rather than only the owning resource definition.
Weak member-owner diagnostics now carry the owner type projection origin. The sampled external app currently buckets
weak owner diagnostics as TypeChecker-origin app typing pressure rather than synthetic template-semantics pressure; keep
that distinction visible in pressure output before deciding whether the next fix belongs in app guidance, plugin
typings, or semantic-runtime scope construction.
Diagnostic suggestions now also carry an action target. External pressure currently splits weak owner repairs as
`owner-type:source` and assignment strictness repairs as `scope-slot:source`, which is the right asymmetry: if the
TypeChecker owner exists, future code actions can target that owner type; if the write created a scope name before a
declared member exists, the best honest target is the authored scope-slot expression, not a fabricated owner
declaration.
Cursor-info diagnostics must stay aligned with file/app diagnostics. Weak owner diagnostics come from the completion
cursor context; binding assignment diagnostics come from the observation data-flow row whose authored source span
contains the cursor. The cursor pressure diagnostic-probe lane reads enough file diagnostics to preserve rare classes
and samples by diagnostic pressure class before generic expression loci, so do not regress it to first-N source-order
sampling.

Runtime target-to-source assignments can create scope names that do not exist on the declared view-model surface. The
modeled example is a two-way custom-attribute bindable assigning to a fresh scope name and later template expressions
reading it. `template-controller-scope-materializer.ts` now publishes a runtime-only binding-context slot after the
assigning instruction so later scopes see the name. That slot can retain the target bindable TypeMember as a type
carrier, allowing repeat locals and member hovers/completions to hydrate through the TypeChecker when the bindable is
typed. `binding-data-flow-materializer.ts` still reports TypeScript strictness for the original write expression instead
of pretending there is an authored TypeChecker member. This is an Aurelia scope/assignment timing rule, not
plugin-specific local injection; untyped plugin bindables should surface as weak-type pressure rather than missing-slot
pressure.
Cursor-pressure classes now keep that distinction visible. `expression-member-owner-type:any`,
`expression-member-owner-type:index-signature-only`, and `expression-member-owner-type:no-members` still flow through
public `missingInputs`, but sampled expression-member sites with no candidates are bucketed as `weak-type:*` instead of
`missing-input:*`. Do not close those rows by synthesizing members; either improve the app/plugin typings or design a
separate value-shape bridge that is explicit about where finite members came from.
`expression-member-owner-type:missing-slot-type` is the same family at an earlier boundary: the member name is authored,
but the owning template scope slot has no TypeChecker-backed type. It should surface as a diagnostic with
`declare-scope-slot-type` guidance, while the deeper fix remains scope/type projection rather than answer-local member
guessing.

File/app diagnostics are now a first batch locus over that same cursor substrate. `TemplateDiagnostics` walks
parser-owned stable member-name spans for compiled templates, asks cursor-info at those source offsets, and returns
weak-owner diagnostic rows with exact authored source ranges. The current materializer is deliberately an aggregation
over cursor facts rather than a second source scan; if diagnostics start needing facts that cursor-info cannot express,
extend the shared selection/value-site substrate first. Direct file diagnostics also exposed an app-context rule:
runtime instances can be reused across app-scope and LSP-scope queries, so source-file admission must be idempotent and
direct cursor/file APIs should reuse an opened app when its compiled template already owns the requested source file.
Nested app pressure added a source-root rule for that batch scan: admitted source-file addresses are workspace-relative,
even when the selected app project is below the workspace and even when the compiled template came from a source-shipped
dependency package. Batch diagnostics should read template text through workspace-root source-address semantics;
resolving those addresses relative to the app project makes cursor-info and file/app diagnostics diverge.

Resource-library app pressure now uses source-file-selected authoring templates too. `pressure:app-api` asks bounded
resource-library projects for admitted template source files and opens those through the authoring lane, so the same
diagnostics/value-channel/open-seam substrate is exercised without pretending the package has an app runtime topology.
Public binding projections must use that same combined app-runtime plus authoring template basis. A monorepo pressure
pass caught `TemplateDiagnostics` counting authoring binding strictness rows that `BindingDataFlows` did not expose;
the projections now share the same basis so diagnostic and data-flow reason counts compare the same template world.
Binding assignment diagnostics distinguish TypeScript strictness from runtime no-op assignment. Framework source shows
`astAssign` falls through for unsupported assignment target shapes outside the explicit throw cases, so
`runtime-expression-unassignable` is authoring guidance (`binding-source-assignment-runtime-noop` plus
`use-assignable-expression`) rather than a framework-grounded error.
Diagnostic rows now carry `diagnosticAuthority` and `frameworkErrorCode`. Weak-owner rows remain
`semantic-authoring-policy`, while TypeScript strictness rows from binding assignment are `semantic-runtime-product`
because data-flow has enough observer/value-channel/writeback/source assignability evidence to make the earlier static
call. Runtime no-op assignment is `framework-runtime-behavior` with no framework error code. Do not add
`framework-error-code` diagnostics without first checking Aurelia source through Atlas `framework.errors` and carrying
the exact code. Parser-owned hard failures can now carry exact Aurelia parser labels via
`ExpressionFrameworkErrorCode`, whose table also records the intended framework package/enum/member because AUR labels
can collide across packages; companion/frontier parser publications preserve those labels and the failure message. Keep
that bridge low in the completed-input parser so file/app diagnostics receive framework authority from the parse product
rather than by wording heuristics. The Atlas `framework.errors` pressure lane now separates declared parser-code links
from links actually spent by semantic-runtime code; do not treat a new `ExpressionFrameworkErrorCode` member as coverage
until a parser failure path uses it. The expression-parser `parse*` frontier is deliberately 26/27 right now:
`parse_invalid_empty` belongs to framework `None`/`IsChainable` entry-family behavior that semantic-runtime does not
expose, so claiming that label would be false precision unless the facade grows those entry families.
Runtime AST callable diagnostics now follow the same authority rule. `CheckerExpressionTypeEvaluator` is linked to
framework `astEvaluate`, but it produces TypeChecker-backed expression projections rather than runtime values. Binding
data-flow rows preserve `sourceTypeOpenKind`, and cursor/file diagnostics spend only the modeled callable error subset:
missing `$host` context (`AUR0105`), reserved `$host` writeback targets (`AUR0106`), non-callable call targets (`AUR0107`), non-callable tagged-template
tags (`AUR0110`), non-callable named/member calls (`AUR0111`), connectable-mode increment/compound assignment
(`AUR0113`), definitely-nullish strict member/keyed access (`AUR0114`, `AUR0115`), and strict member/keyed assignment
through a definitely-nullish owner (`AUR0116`). `$host` is not a synthetic `$` writeback local: framework
`astEvaluate` rejects a missing `$host` context, and framework `astAssign` rejects `$host` before ordinary scope lookup,
so binding data-flow owns those exact diagnostics. Nullish access diagnostics must be
strictness-gated from the rendering controller because Aurelia's non-strict bindings return `undefined` instead of
throwing; nullish assignment uses the same gate because framework `astAssign` only throws in strict mode. Repeat destructuring diagnostics are deliberately not data-flow rows: `repeat.ts` spends
`astAssign(...)` while creating/updating repeat scopes, so scope construction now publishes `RuntimeBindingScopeIssue`
products for `ast_destruct_null` (`AUR0112`) when checker-backed binding-pattern projection can prove or warn about a
non-object destructuring item or non-Array array-rest source. The Atlas runtime `ast*` frontier remains partial; leave
the other runtime evaluator codes unclaimed until the matching expression, assignment, or scope-effect families and
source spans are modeled. Source-authored `@astTrack` misuse is a sibling observation source-issue lane rather than a
binding expression evaluator row: non-method decorator targets spend runtime `ast_track_decorator_not_a_method`
(`AUR0117`) through `ObservationIssue` products.

`@aurelia/state` currently contributes raw framework `Error` rows rather than mapped AUR codes. The state substrate now
keeps that honest with `StateIssue` products and exact `StateRawErrorAuthority` links: `.withStore('default', ...)`
is rejected before a store-configuration product is emitted, while duplicate store names are store-registry
registration issues over otherwise source-visible store configurations. The remaining state raw rows should stay open
until their owning runtime state is modeled: withStore-after-register needs ordered builder/register receiver state,
invalid `fromState` decorator usage needs plugin decorator-target recognition, missing store lookup needs store-name
consumer analysis, and DevTools errors need host extension/dispatch lifecycle semantics.

Observation runtime-effect lifecycle owns `stopping_a_stopped_effect` (`AUR0225`) through the framework-shaped
`RuntimeEffect` model: first stop transitions, a second stop carries the exact framework code. Runtime
`method_not_implemented` (`AUR0099`) usages in AST-evaluator mixins and connectable default methods stay intentionally
unclaimed because semantic-runtime currently models concrete evaluator/observation products, not user-extensible
framework mixin stubs.
Runtime `Scope` API diagnostics are configuration-owned source/API issues, not expression lookup misses. Direct
`Scope.getContext(...)` and `Scope.fromParent(...)` calls with a statically nullish first argument spend `null_scope`
(`AUR0203`), and direct `Scope.create(...)` calls with a statically nullish binding context spend
`create_scope_with_null_context` (`AUR0204`). Rendered binding lookup keeps using non-null `BindingScope` products.
Runtime-html AST resource diagnostics are a sibling binding-utils lane, not another callable-expression bucket.
`ValueConverter.get(...)` and `BindingBehavior.get(...)` failures now surface as `AUR0103` and `AUR0101`, while duplicate
authored binding-behavior names surface as `AUR0102`; diagnostics preserve resource-registration and duplicate-rewrite
suggestions so repair planning does not route them through callable-expression inspection. The remaining runtime-html
`ast*` names are mostly dormant framework authority at this checkpoint, so do not claim them without an exact framework
usage row and modeled semantic-runtime owner.
Runtime-html resource registrar duplicate diagnostics are modeled in the resource-registration lane. Framework source
shows `CustomElementDefinition.register`, `CustomAttributeDefinition.register`, `ValueConverterDefinition.register`,
and `BindingBehaviorDefinition.register` warning on duplicate names with `element_existed` (`AUR0153`),
`attribute_existed` (`AUR0154`), `value_converter_existed` (`AUR0155`), and `binding_behavior_existed` (`AUR0156`).
DI registration spending now routes these through `ResourceIssue` rows and keeps kernel `resource_already_exists`
(`AUR0007`) for source/static `$au` resource registration. Runtime-html's duplicate `binding_command_existed`
(`AUR0157`) label remains dormant, while template-compiler's used `binding_command_existed` / `AUR0157` belongs to
compiler-world binding-command registration and is modeled as a warning-severity `TemplateCompilerIssue`.
Runtime-html resource API definition diagnostics are modeled through `ResourceDefinitionApiIssueMaterializer`.
TypeChecker-resolved direct calls to `CustomElementDefinition.create(...)` with only a string name spend
`element_only_name` (`AUR0761`), while project-local `getDefinition(...)` calls whose target class has no recognized
matching resource definition spend `element_def_not_found` (`AUR0760`), `attribute_def_not_found` (`AUR0759`),
`value_converter_def_not_found` (`AUR0152`), or `binding_behavior_def_not_found` (`AUR0151`). Keep this lane source/API
owned; renderer named-resource misses stay in `RuntimeControllerIssue`, and expression value-converter/behavior name
misses stay in the binding-utils/type-system lane.
Runtime-html repeat diagnostics now split across the modeled framework owners. `RepeatableHandlerResolver` uses built-in
handlers for arrays, sets, maps, numbers, and nullish; semantic-runtime maps unsupported checker-visible repeat sources
to `repeat_non_iterable` (`AUR0777`) through scope issues and leaves `IRepeatableHandler` extension points as future
DI/configuration pressure. The `Repeat` constructor option checks are controller-owned now:
`repeat_invalid_key_binding_command` (`AUR0775`), `repeat_extraneous_binding` (`AUR0776`), and
`repeat_invalid_contextual_binding_command` (`AUR0821`) publish `RuntimeControllerIssue` products while renderer
emulation creates the template-controller frame. The rest of the repeat frontier stays explicit:
`repeat_mismatch_length` (`AUR0814`) belongs to runtime collection consistency, and dormant `repeat_non_countable`
(`AUR0778`) is not a current static diagnostic claim.
Configuration diagnostics follow the same product-owned path. AppTask-time `NodeObserverLocator.useConfig(...)` and
`useConfigGlobal(...)` duplicates now publish `ConfigurationIssue` rows with exact runtime-html
`node_observer_mapping_existed` (`AUR0653`) authority. Observer lookup diagnostics now spend the sibling
`node_observer_strategy_not_found` (`AUR0652`) only when the exact framework path is modeled: dirty checking is disabled,
the target property exists on a native node type, and no configured observer/data/namespace/class/style branch applies.
The runtime-html `node*` frontier remains intentionally partial because the remaining host-node controller codes belong
to controller host/topology semantics.
Runtime-html binding-behavior diagnostics are bind-time pressure after rendered bindings and target-access
facts exist. `RuntimeBindingBehaviorIssue` now claims `SelfBindingBehavior.bind(...)` non-listener failures
(`AUR0801`), `SignalBindingBehavior.bind(...)` invalid-binding/no-signal failures (`AUR0817`, `AUR0818`),
`UpdateTriggerBindingBehavior.bind(...)` no-trigger/invalid-mode/no-config failures (`AUR0802`, `AUR0803`, `AUR9992`),
`AttrBindingBehavior.bind(...)` non-property failures (`AUR9994`), and the shared throttle/debounce rate-limit guard
(`AUR9996`). Custom binding-behavior resources can now contribute direct bind-method
`PropertyBinding.useTargetSubscriber(...)` effects through `RuntimeBindingBehaviorBindEffectReader`; conflicts claim
`binding_already_has_target_subscriber` (`AUR9995`) only after the behavior resource is visible in the compiler scope
and another behavior on the same binding has already claimed the target-subscriber slot. Leave
`update_trigger_behavior_not_supported` (`AUR9993`) unclaimed until service replacement/custom
`INodeObserverLocator` semantics are explicit in configuration/world construction; leave binding behavior
definition/registration failures in the resource/DI catalog lane until that exact framework path is modeled.
Runtime-html value-converter diagnostics are invocation pressure after rendered bindings and compiler resource scope
exist. `RuntimeValueConverterIssue` now claims `SanitizeValueConverter.toView(...)` default-sanitizer failure
(`AUR0099`) only when the `sanitize` value converter is visible and the active container tree has no modeled
`ISanitizer` resolver. App-provided `ISanitizer` registrations suppress the issue; the sibling runtime-html
`method_not_implemented` usages in children/projection runtime stubs stay unclaimed until a product path needs them.
Runtime-html spread `no*` diagnostics are binding-owned. `RuntimeBindingIssue` spends
`no_spread_scope_context_found` (`AUR9999`) for `SpreadBinding.create` hydration-context transfer failures and
`no_spread_template_controller` (`AUR9998`) for the `SpreadBinding.addChild` template-controller branch. Keep
`no_composition_root` (`AUR0770`) unclaimed until `Aurelia.start(...)` app-root lifecycle state is modeled explicitly;
app-root absence should not be recovered from API wording alone.
Template-compiler failures now have the same authority rule through compiler issue products. Attribute classification
publishes exact framework `ErrorNames` authority for reserved spread syntax (`AUR0720`) and reserved `$bindables`
syntax outside custom-element declarations (`AUR0721`); compiler-world service registration publishes duplicate
attribute-pattern (`AUR0089`) and duplicate binding-command (`AUR0157`) issues before those duplicate services become
spendable; binding-command lowering publishes the same issue shape for
custom-attribute inline bindings to non-bindables (`AUR0707`) and modeled command build failures such as invalid
class-binding syntax (`AUR0723`); compiled-template assembly publishes it for invalid root `<template>` surrogate
attributes (`AUR0702`), template controllers on surrogates (`AUR0703`), projection on non-custom elements (`AUR0706`),
`<slot>` without shadow DOM (`AUR0717`), invalid `<let>` commands (`AUR0704`), and framework local-template checks:
root local-element templates (`AUR0701`), only-local-template content (`AUR0708`), local templates outside the root
(`AUR0709`), local bindables outside the local template root (`AUR0710`), missing local bindable names (`AUR0711`),
duplicate local bindable property/attribute pairs (`AUR0712`), empty local-template names (`AUR0715`), and duplicate
local-template names (`AUR0716`). The runtime spread compile host also publishes template-compiler
`no_spread_template_controller` (`AUR9998`) for the `compileSpread(...)`/`SpreadBinding.addChild` path while preserving
the sibling runtime-html binding issue.
Cursor/file diagnostics read those products and produce `template-compiler-error` rows plus `template-syntax` repair
targets, so invalid framework-thrown cases do not need open seams or wording-based API checks. The remaining precision
issue is source-address depth:
classification and command failures can still point at the full attribute span when the framework error is about a
target/name grammar sub-span, so attribute-syntax sub-span provenance is a legitimate next substrate pressure.
Resource metadata diagnostics now follow the same product-owned rule. `ResourceIssue` products cover malformed
runtime-html bindable decorator metadata (`AUR0227`, `AUR0228`, `AUR0229`), malformed `@processContent(...)` hooks
(`AUR0766`), the watch frontier (`AUR0772`, `AUR0773`, `AUR0774`), and the controller watcher callback materialization
path (`AUR0506`) when TypeChecker/resource convergence can prove the framework error statically. Resource convergence
also claims the definition-side cause of `controller_no_shadow_on_containerless` (`AUR0501`) for custom elements that
are statically containerless and shadow/slot-backed. The remaining runtime-html `invalid*` codes are intentionally
outside this resource pass for now: `invalid_platform_impl` is platform/app-root host state and `invalid_dispose_call`
is Aurelia instance lifecycle state. `ResourceIssues` exposes those products directly, and `AppDiagnostics` aggregates
  them with template, router, and route-recognizer diagnostics while preserving `diagnosticDomain`. Do not push future
controller/resource/configuration/DI/router errors into `TemplateDiagnostics`; first add or reuse the owning product
issue substrate. The runtime-html controller frontier is still only partially claimed. Renderer resource lookup now
owns named-resource misses from `CustomElementRenderer`, `CustomAttributeRenderer`, and `TemplateControllerRenderer`
as `RuntimeControllerIssue` rows (`AUR0752`, `AUR0753`, `AUR0754`), and those misses stop child-controller
materialization rather than producing null-definition controller frames. Bindable observer setup also has an honest
owner: observer-locator collection branches expose hook capability, and runtime rendering publishes
`RuntimeControllerIssue` for `controller_property_not_coercible` (`AUR0507`) and
`controller_property_no_change_handler` (`AUR0508`) when `createObservers(...)` would ask a collection observer for
unsupported coercer/callback hooks. The runtime-html `au*` frontier is also intentionally partial: static
`AuCompose` input failures are controller-owned because lowered `SetPropertyInstruction`s can prove them during
controller creation. Setter failures (`scopeBehavior` / `AUR0805` and `flushMode` / `AUR0809`) stay on bindable set,
while static string `component` / `view-model` misses (`AUR0806`) probe the parent hydration-context controller
container after controller-local dependency resources have been registered. Static string component pressure exposed
that root render analysis also needs the framework's AppRoot child-container shape rather than using the app/compiler
container as the root controller's own container.
Dynamic `AuCompose` composition now has a separate runtime-analysis lane: `RuntimeCompositionMaterializer` creates
`CompositionContext` / `CompositionController` products after bind/data-flow facts exist, resolves static values or
TypeChecker-visible component candidates, and exposes those rows through `RuntimeCompositions` plus app-pressure
aggregate buckets. Candidate rows now include the first composition lifecycle handoff: absent/parameterless
`activate` is closed, and `activate(model)` compares the model binding source type with the activation parameter type.
Composition contexts now join both AuCompose input lanes: dynamic property bindings from controller bind and static
literal bindables from `HydrateElementInstruction.bindableInstructionProductHandles`. That lets rows report
`scopeBehavior`, `tag`, `flushMode`, template-only composition, and `composition`/`composing` from-view bindings
without pretending literal inputs are runtime bindings.
A statically evaluated plain object, instance, boundary object, or non-resource constructable component now closes as
`object-view-model`, matching AuCompose's `_createComponentInstance(...)` branch where no custom-element definition is
required. Object view-model rows reuse the same TypeChecker-backed activation handoff as custom-element candidates, but
without compiled-template/candidate-runtime-analysis coverage because no custom-element definition exists.
Recursive rendering pressure then exposed a parent-to-child value-flow gap rather than an AuCompose-only gap. A child
resource that receives a broad `Constructable`-typed widget kit through bindables and resolves a concrete component with
`widgets.find(entry => entry.isApplicable(id))` now closes because template runtime analysis threads an incremental
`RuntimeBoundControllerValueTable` through project resource analysis, extends it with the current resource's rendered
controller values during runtime composition, and records child controller definition target types. The evaluator also
binds `this` for property method calls such as `entry.isApplicable(id)`, and exact evaluated object literals now return
`undefined` for absent keys instead of fabricating unknown properties. Keep this as substrate: project resource analysis
now schedules compiled resources by rendered-child SCCs, so reversed resource registration does not hide acyclic
parent-to-child values. Recursive groups remain finite aggregate boundaries and intentionally use only predecessor facts
until runtime-state-specific composition lifecycle work exists.
`RuntimeCompositions` rows now also expose `renderingContextKind`: `definition-resource` means the row came from
analyzing a resource's own template with public bindables still supplied by consumers, while
`recursive-resource-instance` means a parent render pass supplied child controller values. App-pressure should read open
rows through that context instead of treating every standalone definition-local open as an app use-site failure.
Composition controller run/deactivate errors and recursive child composition hydration still need deeper composition
lifecycle state before they can be claimed.
The same controller issue lane now owns switch/case link-hook errors: `case` / `default-case` without a parent switch
map to `AUR0815`, and duplicate `default-case` under one switch maps to `AUR0816`.
Lifecycle-state controller errors should remain unclaimed until controller state emulation owns them.
The current resource-library pressure exposed a dynamic `SelectValueObserver` multi-select channel. This is now modeled
as `select-dynamic-option-value` when the value source type can carry both runtime branches: scalar single-select
updates and array-valued multi-select mutation. Keep the typed
`binding-value-channel-dynamic-select-multiple` open reason for cases where a dynamic `multiple.bind` source cannot
plausibly accept both branches; dependent data-flow seams should preserve that reason when the channel itself remains
open.
Public plugin pressure then exposed the sibling single-select case: a select with no static option domain should report
`binding-value-channel-select-option-domain-open`, not a summary-only seam. Cursor-pressure public API comparisons are
now project-scoped in multi-project runs so cache/app-context ambiguity does not masquerade as candidate drift.
The 2026-05-10 clean-room external app and mixed-monorepo samples still show stable public API behavior:
app/resource-library shape triage opens bounded app-world emissions, router/controller/resource products materialize,
unresolved module edges stay closed, cursor completions and cursor-info agree, and public cursor/file calls report no
exception or template-resource miss classes. Treat remaining rows as typed product pressure: weak owner diagnostics,
TypeScript assignment strictness, expected-empty plain static attribute completions, and explicit open seams such
as dynamic select-multiple value channels or dynamic router-href externality.

Public plugin/resource-library pressure also closed a TypeChecker handoff that should remain substrate, not
template-specific logic: repeat locals can flow through nullable iterable unions and finite mapped-record keyed access
before a nested repeat reads item members. The durable fix belongs in checker related-type and expression type
projection, because the same pattern appears in authored apps, plugin templates, and future LSP cursor inquiries.

TypeSystem construction has its own profile under app pressure. On large mixed roots, TS `program` creation dominates
the checker phase, with checker creation second and project-options discovery much smaller. Treat future TypeSystem
cost work as either project-scope policy, shared project-program substrate, or a deliberate TypeScript-program volume
cost; do not hide it under resource/template/router phase labels.

### Deliberate Cleanup Pressure

The default `pressure:product-architecture` function-pressure lane is currently clear. Treat that as a clean navigation
baseline, not as a claim that the substrate is finished. The remaining deliberate pressure is mostly large-class,
cross-area, and product-flow topology:

- Kernel-store publication is now visible through Atlas as a product-flow lane, not just through vocabulary tables.
  Use the KernelStoreRecord module/owner hot spots before opening source: they show which emitters construct the most
  low-level records, which vocabulary expressions are direct versus delegated, and where KernelStoreBatch labels define
  pass boundaries. Treat this as a guide for finding product-flow ownership, not as a mandate to reduce record count.
- `di/world-constructor.ts` owns real world-construction semantics, so size alone is not the smell.
  `di/world-publication.ts` now owns resolver/resource/self-resolver publication, DI key identities, and source/open-seam
  records, while `di/framework-registration-effects.ts` owns framework effect tables. Remaining DI pressure is whether
  registry/AppTask/callback effects and lifecycle output still have one coherent world-constructor model or whether some
  subproducts should be split along Aurelia-facing interfaces without weakening DI provenance.
- `router/route-tree-materialization.ts` sits on the route-context, viewport-agent, recognizer, instruction, and
  component-agent handoff. Router product record boilerplate now lives in `router/router-product-records.ts`; remaining
  cleanup has to preserve exact route-node provenance and framework-shaped `RouteTree` / `RouteNode` semantics; do not
  flatten this into app-specific navigation shortcuts. Transition-tree construction now runs through a dedicated frame:
  missing instruction-tree / route-context / route-config products are treated as internal invariant failures, while a
  framework redirect handoff that cannot yet be compiled into its target tree is recorded as an explicit router open
  seam. RouteTree redirect-parameter migration now has a first-class `RouterIssue` lane for `exprUnexpectedKind`
  (`AUR3502`) when the framework RouteExpression tree contains sibling composites or grouped segments where only
  segment/scoped-segment chains are accepted; keep future router errors in owning router issue products rather than
  pushing them into route-recognizer rows or template diagnostics.
- The expression scanner, completed-input binding-pattern corridor, and completed-input iterator corridor are parser
  substrate, not incidental helper code. Binding declarations for iterator headers now live in their own corridor so
  array/object destructuring recovery can evolve without making `repeat.for` header parsing own the whole pattern
  grammar. Closed-subtree prefix witnesses live in `completed-input-prefix-refs.ts`, leaving parser state on cursor,
  span, and failure handoff mechanics. Parser-local failure retention and companion/hard-failure construction live in
  `completed-input-failures.ts`; corridors ask `state.failures` so cursor state does not own recovery policy. Delimiter
  stack law lives in `completed-input-delimiters.ts`; corridors push and pop through `state.delimiters` directly so
  matched-delimiter snapshots remain a parser-local state facet rather than generic cursor state. The interpolation
  parser has been split between boundary extraction and a publication frame, and scanner punctuation/operator
  recognition now dispatches through module-level token-family helpers instead of one giant switch. Scanner character
  classification and operator token law are module-level substrate, leaving scanner instance methods for mutable
  cursor/token state plus identifier, number, and string scanning. HTML parsing now has the same front-door/tree split:
  the parse materializer
  owns source/document products and commits, while the tree materializer owns recursive node/attribute/recovery
  publication and source-address mapping. Future parser refactors should preserve parser ownership,
  boundary/frontier semantics, template-literal-aware lookahead, active-hole selection, token family law, and exact
  source slices before trying to reduce body size.
- The default duplicate-helper lane is currently clean. The last pass resolved it by moving real concepts downward:
  instruction expression-handle extraction into `instruction-ir.ts`, element/attribute owner lookup and element lookup
  naming into `html-ir.ts`, source-span containment into `kernel/address.ts`, type-reference equality into
  `type-shape.ts`, and arbitrary local-key component encoding into `kernel/local-key.ts`. Catalog group/variant locals
  should keep using the central local-key helpers so framework package ids, groups, aliases, and variants are encoded
  at the boundary instead of hand-joined in individual catalog materializers. Keep treating future duplicate helper rows
  as ownership questions first, not as generic utility extraction prompts.
- The compact function-pressure cleanup that followed split resource catalog publication, API source-reference
  expansion, registration observation product emission, resource source-span selection, and configuration
  sequence/callback/open-seam publication into named phases. If those rows return, inspect whether a new caller is
  rebuilding product/source/identity envelopes locally before adding another local helper.
- Runtime rendering now separates renderer-product publication, view-factory materialization, controller creation, and
  controller-product publication from render-loop orchestration. `runtime-rendered-instruction-recorder.ts` owns
  renderer-produced runtime bindings, target operations, scope effects, and binding render contexts.
  `runtime-view-factory-materializer.ts` owns generated embedded custom-element definitions, `IViewFactory` products,
  synthetic-view aggregate products, and the factory/definition/instruction-sequence claims created by
  template-controller rendering. `runtime-controller-creation-materializer.ts` owns root, renderer-created child, and
  synthetic-view controller frame creation, including child-container materialization and controller hydration lifecycle
  steps. `runtime-controller-publication.ts` owns durable controller products, controller materialization records, and
  controller-to-template/instruction/binding claims after scope materialization attaches modeled `Scope` references.
  `runtime-rendering-materializer.ts` still owns render-target planning, render-host dispatch, traversal, and the
  decision to recursively render embedded instruction sequences. If more runtime-rendering pressure appears, split
  along those framework-shaped responsibilities rather than moving record constructors around by file size alone.
- Template-controller scope construction now has a TypeChecker support boundary. `template-scope-type-projector.ts`
  owns listener event typing, repeat override locals, iterator local projection, let-target types, and promise/value
  template-controller slot types. `template-controller-flow-scope-materializer.ts` owns built-in controller-flow
  dispatch, branch/promise/switch link hooks, and narrowed/object child-scope construction for template controllers.
  `template-controller-scope-materializer.ts` should stay focused on template-order traversal, ordinary scope effects,
  runtime assignment slots, scope materialization, and claim publication.
- Controller bind materialization now has a publication boundary. `runtime-controller-bind-materializer.ts` should stay
  on `Controller.bind` traversal, target-controller lookup from render contexts, target/ref resolution, and
  `ObserverLocator` lookup requests. `runtime-controller-bind-publication.ts` owns bind-time source records, open seams,
  target-access products, target-operation products, source-operation products, and runtime-binding-to-product claims.
  If this area grows again, inspect whether the next split belongs around ref/controller target resolution rather than
  moving product envelopes back into bind traversal.
- Binding-command lowering now has the same publication split. `binding-command-lowering-materializer.ts` owns command
  execution handoff, ordinary classification lowering, and inline multi-binding secondary grammar decisions.
  `binding-command-lowering-publication.ts` owns command/multi-binding product envelopes, source/open-seam records,
  instruction identity publication, and produced-instruction/expression claims. The publication module may remain a
  record-construction hotspot; the smell to watch for is behavior drifting back into it or product envelopes being
  rebuilt in the materializer.
- Template API cursor/file readers now delegate weak-owner and binding-assignment diagnostic decisions to
  `api/template-diagnostic-policy.ts`. Keep source selection and cursor context in the API reader, but keep severity,
  diagnostic authority, framework error-code attachment, suggestion/action-target routing, and product-policy wording in
  that policy module until diagnostics become a deeper materialized product.
- The public app API facade now has a router query boundary. `api/runtime.ts` should stay focused on boot/app opening,
  project selection, generic app answer dispatch, and non-router query delegation; `api/answer-helpers.ts` owns shared
  answer/page envelopes, and `api/app-route-queries.ts` owns the router family of answerers from options/configs through
  route trees, viewport agents, and component agents. If route API pressure returns, first ask whether the router product
  substrate or route projection rows need a clearer boundary before moving answer assembly back into the facade.
- The public app API facade now also has a template query boundary. `api/app-template-queries.ts` owns template
  compilation rows plus template completion, cursor-info, and diagnostic answer handoff. `api/runtime.ts` should keep
  direct runtime-level cursor methods only because they select/reuse the owning app before delegating; do not move
  template row assembly back into `SemanticApp` as the API grows.

Treat that cluster as a future substrate pass across DI, router, parser/evaluator boundaries, and product catalog
identity.

Expression type evaluation now enters runtime analysis through `CheckerExpressionTypeWorld`, a pass-local owner for the
shared projector, resource-scope-specific evaluator instances, and expression cache used by scope construction, binding
value-channel, and binding data-flow materializers. App pressure prints aggregate `expression type cache`
entries/hits/misses/writes plus semantic buckets for binding expressions, member owners, iterator locals, template
controllers, and contextual keys. If binding observation cost rises again, first inspect whether a materializer is
bypassing the shared world/cache or introducing a downstream role into the local key; expression type projections should be
keyed by modeled scope plus expression product, not by the materializer lane that asked. Contextual target types should
only enter the cache key for expression kinds whose evaluator semantics actually consume them. At the moment that means
arrow-function parameter projection, including paren-wrapped arrows. Do not pay contextual cache cardinality for
ordinary member/value expressions until the evaluator grows a real contextual semantics for them.

Type-system expression evaluation has started to split around product responsibilities instead of file size.
`expression-type-evaluation.ts` owns the result/open/cache vocabulary consumed by template, observation, and inquiry
lanes. `expression-type-world.ts` owns the pass-local expression evaluator lifetime. `expression-type-support.ts`
owns shared project/open/resolve/union primitives for evaluator-adjacent projectors so call projection, cursor owner
projection, and future expression inquiries do not grow their own result factories. `expression-type-synthesis.ts` owns
synthetic expression/template type-shape products such as arrays, objects, arrow functions, unions, unknowns, and
map-entry tuples. `checker-type-shape-access.ts` owns reusable member/key/index
reads over projected shapes, including finite keyed access. Keep expression semantics in
`expression-type-evaluator.ts`; do not duplicate member/index/checker access in cursor answers, binding-pattern locals,
or diagnostics policy.

Static evaluation literal construction now has the same boundary shape as intrinsics. `evaluation/literals.ts` owns
array/object literal element and property assembly through a host interface, while `StaticEvaluator` remains the owner
of expression recursion, property-name interpretation, seam creation, unknown/boundary values, and syntax-kind naming.
Do not move Aurelia recognition or materializer policy into literal helpers. If later ECMAScript literal pressure
appears, extend this substrate first and preserve the existing distinction between object-spread boundary carriers and
array-spread dynamic mutation seams.

Binding data-flow source writeability is demand-driven by flow direction. Source-to-target bindings still project source
kind/name/type, but they should not ask whether the source expression is assignable because no target-to-source
`astAssign` can happen. This matters for member expressions: owner-type writeability checks are useful strictness policy
for two-way/from-view flows, but they are wasted TypeChecker work for one-way rendering. If future source-assignment
pressure changes, verify the direction gate before widening assignment policy.

DI world construction now uses shared publication primitives for source/open-seam records, resolver/resource/self-resolver
products, registry and parameterized-registry products, framework-produced AppTask products, and DI key identities. Keep
those envelopes in `di/world-publication.ts`; keep capability-keyed framework effect tables in
`di/framework-registration-effects.ts`; keep `DiWorldConstructor` focused on admission spending, registry recursion,
live container mutation, and the final emission frame.

Registration admission support now distinguishes constructable DI keys from syntax-shaped identifier keys. Plain class
fallback registration should carry evaluator-proven constructable value shape into `ConstructableDiKeyIdentity`, with a
source-backed TypeScript declaration identity when available. Do not recover this by name heuristics in DI world
construction; missing constructable key closure is a registration/evaluator/type-system substrate gap.

Container lookup pressure now has a runtime key-shape boundary. `ContainerLookupKey` carries the identity plus
constructable/native/intrinsic/registry/resolver/interface/string/resource/object/primitive/nullish classification into
`Container`, `Resolver`, and registry delegation. This is deliberately below diagnostics: `AUR0009`, `AUR0010`,
`AUR0012`, `AUR0013`, and `AUR0015` should only be cited when the exact framework branch is modeled. `ContainerResolverLookup`,
`ContainerFactoryLookup`, and `ContainerInvocation` now expose `frameworkErrorCode` for the lookup failures the emulator
itself can decide: unable JIT non-constructor, intrinsic-type JIT, interface JIT, and native-function construction. A
direct `IContainer.invoke(Array)` source call can spend `no_construct_native_fn` because `Container.invoke` checks native
functions before container state; direct fresh object keys can spend `unable_jit_non_constructor` because the runtime
identity is created at the call site and must miss resolver/factory maps. Stable keys such as strings, identifiers,
intrinsic constructors, or interface symbols still need resolver/factory state and should not be inferred from syntax
alone. Resolver slots now retain the modeled resolver object when DI publication owns it, so `Container.getFactory(...)`
can follow Aurelia's resolver-backed factory fallback before failing. `InstanceProvider` is now named as an auLink-backed
runtime-shaped resolver and owns `no_instance_provided` (`AUR0013`) at the provider-resolution answer level. `no_factory`
(`AUR0004`) is intentionally not claimed for the stock container model: Aurelia's built-in `Container.getFactory(...)`
returns a factory or throws its own getFactory/JIT error before `Resolver.resolve(...)` can observe a null factory; that
guard belongs to custom `IContainer` implementations until semantic-runtime admits those as handler products.

Binding-scope materialization now keeps TypeChecker-backed slot projection out of runtime scope publication.
`binding-scope-slot-projector.ts` spends projected context type members into explicit binding-context slot drafts, while
`scope-materializer.ts` owns `Scope`, `BindingContext`, `OverrideContext`, identities, claims, materialized products,
and detail registration. If scope pressure returns, decide whether the next boundary is scope product publication or
scope-owner/link claims; do not move TypeChecker member reads back into the runtime scope materializer.

Configuration emission now has the same split. `configuration-publication.ts` owns source/evidence/provenance records,
configuration product envelopes, open seams, and configuration-owned claims. `aurelia-app-frame-materializer.ts` owns
the runtime-shaped app admission frame: root container, `Aurelia` facade, app-root config, AppRoot, and component target
convergence. `configuration-step-materializer.ts` owns per-step AppTask, option contribution, callback/key source, and
registration handoff products. Keep `configuration-kernel-emitter.ts` focused on source-order sequence orchestration;
if configuration pressure returns, first check whether sequence order, app admission, step materialization, and
registration handoff have started bleeding into each other again.
Configuration issues now have a sibling publication path for known framework failures discovered while recognizing
configuration/AppTask service customization. `configuration-issue-publication.ts` builds the source/evidence/product
records, and callers must attach `ConfigurationProductDetails.Issue` only after the kernel records are committed.
`framework-service-customization.ts` currently spends that path for duplicate `NodeObserverLocator` config mappings
(`AUR0653`) while preserving the non-duplicated service state for observer lookup.

Registration emission now follows the same support/publication split at a smaller scale. `RegistrationKernelEmitter`
owns admission product classification, materialized-product envelopes, claims, and batch framing. Its support
materializer owns key/value/registry-parameter source products and recognition open seams. If registration pressure
returns, avoid folding key/value support back into product classification; decide whether the next boundary is DI-key
classification, registry body interpretation, or product publication.

Resource recognition emission now mirrors that pattern. `resource-recognition-kernel-emitter.ts` owns observation
framing, source records, definition-header products, materialization records, product-detail registration, and the batch
commit. `resource-recognition-publication.ts` owns target references, TypeChecker-backed target type projection,
resource identity/alias/pattern publication, and recognition open seams. If resource-recognition pressure returns, ask
whether the next split is header product publication or convergence carrier policy; do not move target/type or identity
publication back into carrier recognition.

App-world project construction now runs through a construction frame. The frame has a real lifetime, owns timing phase
state, and gives each project phase a named handoff method. Preserve that shape if adding more router, SSR/SSG, or AOT
phases; do not grow `constructAndEmit` back into a single long dependency chain. If Atlas flags
`AureliaAppWorldProjectConstructionFrame` as a large class, treat that as intentional orchestration pressure unless
phase-local behavior starts accumulating inside the measured handoff methods.

Router product record emission is shared by route-instruction and route-tree materialization through
`router/router-product-records.ts`. Use that primitive for RouterIdentity + materialized-product + materialization-record
bundles unless a router product needs materially different ownership or provenance semantics.

Template compilation-unit materialization should keep front-door products separate from relationship publication.
`TemplateCompilationUnitMaterializer` owns authored template source, parse context, root compilation context,
compilation unit, identities, and materialized-product envelopes. `TemplateCompilationClaimMaterializer` owns the
source/resource, unit/world/parse/root-context, and root-context service/resource-scope claim families. If this pressure
returns, decide whether identity/envelope publication deserves a sibling boundary rather than moving claims back into
product construction.

Framework built-in resource target projection is now part of app-world construction. Built-in full definitions should
carry checker-projected target types when the current app program can resolve the framework package export, with rare
documented internal fallbacks only for resources that the framework registers but does not export. If target-access
pressure regresses to `none` for controller view-model bindings, inspect built-in resource target projection and
renderer `getTarget(target)` handoff before adding API-side fallback policy.

Standalone resource-library authoring worlds share that same target projection rule. If app-world pressure reports
typed built-in template-controller targets while authoring/resource-library pressure reports `none`, inspect whether the
authoring compiler world is threading its current `TypeSystemProject` into built-in resource materialization before
changing `BuiltInResourceTargetTypeProjector`.

Built-in resource catalog materialization now has a per-resource publication boundary. Catalog materialization owns
catalog grouping, catalog products, source records, product-detail registration, and configured catalog selections.
The resource publisher owns individual header/full-definition products, declaration/alias/convergence claims, and
resource materialization records. Full-definition construction remains in `built-in-resource-definition-materializer.ts`.
If built-in catalog pressure returns, avoid folding the per-resource publisher back into catalog grouping; decide
whether the next split is catalog product publication, configured-selection publication, or framework definition
construction.

Route-config field provenance can share a single authored source node across multiple normalized fields. Group those
fields under a combined source identity and deduplicate record emission; duplicate kernel records or arbitrary
`field:id` style locals are a provenance primitive smell, not a route materialization problem.

Dynamic router `href` seams are source-spanned now, but remain real runtime boundaries. `RouterOptions.useHref=false`,
non-anchor hosts, non-current-window targets, or a co-located `load` custom attribute can disable click interception
while `HrefCustomAttribute.valueChanged(...)` still classifies non-external values into viewport instructions. Future
repair/diagnostic work should use the binding value span to explain or propose intent, not close the seam without
proving external URL or internal route semantics.
External app pressure confirmed that this needs to survive diagnostics-to-action planning: source-bearing router open
seams now publish `runtime-boundary:source` action targets, so future repair/edit planners can point at the value
boundary while still requiring runtime intent.
`fixtures/pressure/router-dynamic-pattern` now covers that same repair handoff without external app dependency by
including an internal string-pattern href, an external-link-like field href, and an unresolved bare-module href.

Telemetry now has an opt-in detail-density lane for memory/performance substrate work. Use
`SEMANTIC_RUNTIME_TELEMETRY_DETAIL_DENSITY=true` with kernel breakdowns, or
`SemanticRuntime.analysisCacheOverview({ includeKernelBreakdowns: true, includeDetailDensity: true })`, when retained
heap pressure needs a shallow x-ray of product-detail and hot-detail sidecars. The lane reports detail kinds,
constructors, direct field totals, direct array items, direct string characters, and the heaviest direct string/array
fields. The first large-app canary showed the heaviest detail-side strings are mostly handle fields such as identity,
source, product, declaration, and parser handles. Treat that as representation or inquiry-depth pressure, not as proof
that navigable handles can be dropped.

Store-local sidecar indexes are now named and disposable through `KernelStore.registerSidecarIndex(...)`; telemetry
prints their entry counts under kernel breakdowns. The immediate pressure came from the TypeChecker type-shape projector
index: query-local `disposeSince(...)` removed product and hot details, but the private WeakMap index could otherwise
retain stale type shapes, members, and checker carriers until a later lazy miss. The projector index now prunes on
kernel disposal, and a canary projection returned its sidecar entry count from 1 to 0 after reclaiming the query-local
type shape and its hot members.

`scripts/app-telemetry.mjs` now respects app-query catalog paging modes. Offset/continuation row tables use
`SEMANTIC_RUNTIME_TELEMETRY_QUERY_PAGE_SIZE`; router-overview row samples use
`SEMANTIC_RUNTIME_TELEMETRY_ROW_SAMPLE_SIZE` and default to 0. This matters for MCP-orientation pressure: a large app's
summary-first router overview stayed around 2.6 KiB, while treating row samples as ordinary pages pushed that single
answer to roughly 255 KiB.

Repeat scope construction now spends one combined iterator projection for each repeat effect. The old local path asked
for element type, binding-pattern locals, and repeatability diagnostics separately, which re-entered the
TypeChecker-backed evaluator around the same repeat source. `CheckerExpressionIterableProjector` now publishes
`CheckerExpressionIteratorProjection`, and `TemplateScopeTypeProjector.iteratorProjection(...)` converts that into the
scope-construction view. Large-app timing moved only modestly in a noisy run, but the substrate is cleaner: repeat
source, element, locals, and repeatability all share one semantic projection boundary.

## Template Compiler Emulation Notes

The compiler front door now lives on `TemplateCompilerService` instead of only in `TemplateCompilationProjectPass`.
`compile(...)` owns the runtime short-circuit branches and delegates product materialization to a host. Compiler
collaborators should be used through their service models (`IAttributeParser.parse`, `IBindingCommandResolver.get`,
`IExpressionParser.parse`, `AttrMapper.map/isTwoWay`) rather than through local aliases or duplicated helper logic.

Custom-element child content projection is closed at the compiled-template boundary now. `HydrateElementInstruction`
owns default/named projection instruction sequences, and direct parent row traversal skips the extracted children so
non-shadow custom-element content is not analyzed as if it rendered in the parent. If projection pressure returns, start
from `contract:template-content-projection` and the framework compiler `_extractProjections(...)` shape before touching
runtime renderer or app-builder generation.

`compileSpread(...)` is wired from runtime rendering back into `TemplateCompilerService`, but dynamic spread instruction
materialization is intentionally still open. The runtime path now preserves the captured AttrSyntax handles and emits
open pressure when the spread compiler cannot close; future work should fill that host with real instruction emission
rather than bypassing the compiler service again.
