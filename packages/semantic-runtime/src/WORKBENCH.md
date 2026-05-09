# Semantic Runtime Workbench

This note keeps active context close to the code while the package is still settling. It is not a roadmap and it should
not become a procedural dossier. If a detail stops being useful for orientation, delete it or promote the durable part
into the owning README or source contract.

Product-pressure grounding lives in [../../atlas/workbench/product-specific-pressures.md](../../atlas/workbench/product-specific-pressures.md).
Use that note when deciding whether a semantic concept belongs in product records, claims, provenance, inquiry answers,
or Atlas-only navigation.

Durable package boundaries live in [README.md](./README.md). Authoring durable context lives in
[authoring/README.md](./authoring/README.md), [authoring/ONTOLOGY.md](./authoring/ONTOLOGY.md), and
[authoring/CAPABILITY_CHECKLIST.md](./authoring/CAPABILITY_CHECKLIST.md). Keep this workbench focused on live context
that should not be mistaken for stable contract.

## Standing Context

The repo has consolidated around two internal surfaces:

- `packages/semantic-runtime` owns the Aurelia semantic product model.
- `packages/atlas` owns live orientation, inquiry contracts, and the hot local session used by Codex-facing work.

The static document packet and snapshot/query shell have been removed. The intent is for product semantics to live in typed substrate, vocabulary, auLink anchors, claims, provenance, materialized products, and open seams, with Atlas reading those surfaces directly instead of relying on parallel summaries.

## Package Shape

The broad horizontal substrate is present but not finished end to end. The active layers are:

- `kernel` for handles, vocabulary, records, claims, provenance, materialization, product details, and auLink.
- `boot` for source admission before semantic interpretation.
- `application` for framework-normal app topology shared by analysis and authoring.
- `authoring` for semantic app-creation intent, operation, plan, capability, and verification contracts.
- `evaluation` for static module/value evaluation and explicit open seams.
- `resources`, `configuration`, `registration`, and `di` for Aurelia world construction.
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
- Use ordinary DI-injectable state classes and ID-shaped component boundaries in authoring fixtures where that better
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

Current inferred engineering heuristics:

- If Atlas needs large local tables or fragile inference to explain this package, first ask whether semantic-runtime
  should expose a typed product record, vocabulary term, claim, or provenance link.
- Use Atlas pressure scripts as navigation, not as a substitute for understanding. A pressure row just chooses the
  next source span to inspect.
- Small framework-policy tables are helpful when they make a real axis mapping explicit; observation, hydration, and
  recursive rendering classifiers need framework-semantic review before table-only cleanup.

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
from the first project with an entrypoint-signal source. Keep the classifier conservative; explicit host project
selection is still the strongest answer when a monorepo has multiple app packages.

The operational API boundary now lives in `api`. It opens an app by composing source admission, static module
evaluation, resource recognition, configuration admission, DI world construction, compiler-world formation, template
compilation, rendering dispatch, and TypeChecker-backed scope products. Keep initial answers compact; expose opaque
kernel handles only through explicit detail projections so the API can serve app developers and AI callers without
forcing every query into full graph expansion.
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
handler in the framework. Closed static redirects now publish re-recognized target rows with `redirectDepth`, which lets
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
Binding data-flow API rows carry the parser publication state and result kind alongside source/target flow facts. That
keeps open data-flow pressure explainable when the expression parser intentionally published a companion/degraded result
instead of a canonical AST-bearing success.
Known-invalid reverse writes are not open seams. A two-way/default binding whose source expression is a computed
comparison is fully understood as source-to-target flow plus a runtime-unassignable target-to-source assignment. Keep
that on `sourceAssignmentKind` / `sourceAssignmentReason` and pressure summaries instead of reporting an `OpenDataFlow`
seam.
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
idiomatic app authoring. Future fixtures should split stress coverage from authoring examples: stress fixtures can be
dense, while `../fixtures/authoring` should contain framework-normal app shapes once the substrate can analyze them.

The authoring spine is intentionally non-operational for the moment. It exists to make future codegen land inside a
typed plan/verification structure instead of drifting into ad hoc scaffold templates.

Recent observer work clarified that `CheckedObserver` value channels are source-shape driven. Plain checkbox bindings
can close as boolean flows without requiring `model`/`value` element closure, while array/set membership sources still
consume the lowered sibling `model.bind`/`value.bind` products or the platform default input value. Source TypeChecker
gaps for otherwise closed binding flows should stay on the data-flow row as strictness pressure, not reopen runtime
binding emulation.
Router-resource dynamic binding pressure belongs in the binding-source substrate, not in router-specific expression
guessing. `binding-source-value-evaluator.ts` now lets router instruction materialization ask the binding layer for a
static string value, including guarded local getter reads over evaluator-known view-model classes. If the getter depends
on host environment state, the router seam should remain open with that lower-level reason attached rather than being
forced into either an internal route or external-link bucket.
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
that latter bucket because it mirrors framework `ICommandBuildInfo` through auLink and carries product/identity handles;
ordinary parse/lower/materialize pass inputs should stay as request interfaces.
The first cleanup pass left no ordinary zero-method `*Input` class pressure at the default Atlas threshold. If the smell
returns, check whether the class is a product/facility with lifecycle or merely a method payload; projector and runtime
handoff payloads should default inside the receiving service instead of encoding positional constructor order.

Large external-root pressure narrowed template runtime cost to binding observation rather than the compiler front door.
`pressure:app-api` now prints nested template/runtime-analysis timings so future runs can distinguish parsing/lowering
cost from runtime rendering, scope construction, controller bind, value-channel, and data-flow work. Binding expression
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
only need a narrower resource/router slice.

When `product.architecture` reports duplicate helpers, treat the row as a question, not a quota. Shared primitives that
now have one home include kernel claim filtering/nullability, attribute fallback casing, instruction-kind vocabulary
mapping, generic first-seen de-dupe, TypeScript declaration names/static modifier detection, whitespace tokenization,
and checker type-shape classification. Catalog-specific summaries intentionally remain local until there is a real
shared message model.

Resource-recognition performance pressure can be a proxy for lower-level TypeChecker provenance cost. A large-root
profile showed `kernel-emission` dominating while named/syntax recognition and convergence were cheap; the root cause
was checker type projection scanning all store addresses for every projected member declaration. `KernelStore` now owns
a source-file-address suffix index via `readBestSourceFileAddressForFileName(...)`, so declaration provenance lookup is
indexed and shared by every checker projection lane. If this pressure returns, profile below the resource-recognition
label before tuning recognizers or weakening source provenance.

Mixed-monorepo pressure should be separated into workspace discovery, project-shape triage, app-world construction, and
all-project stress. `SemanticRuntimeSummary` now exposes per-project source-role counts, likely-entrypoint filename
signals, and a formal cheap `SemanticProjectShapeKind`. The shape policy first counts manifest dependencies on
`aurelia` / `@aurelia/*`, then parses app-source files for Aurelia facade import/default-import/namespace-import,
constructor, `.register(...)`, `.app(...)`, and `.enhance(...)` signals. `openApp()` without a project key prefers `aurelia-app` projects
before falling back to filename/source heuristics. Use these rows to choose whether a caller wants app entrypoints,
resource-library packages, Aurelia packages without app facade evidence, or a full package scan before paying
TypeChecker/static-evaluation/app-world cost for every project. The stress script may still open every discovered
project because it is intentionally pressure-oriented; product APIs should make the scope explicit.
`SEMANTIC_RUNTIME_PROJECT_SHAPES` lets pressure runs select a subset of shape kinds when the question is app-like
topology rather than all-package stress.

TypeSystem construction has its own profile under app pressure. On large mixed roots, TS `program` creation dominates
the checker phase, with checker creation second and project-options discovery much smaller. Treat future TypeSystem
cost work as either project-scope policy, shared project-program substrate, or a deliberate TypeScript-program volume
cost; do not hide it under resource/template/router phase labels.

### Deliberate Cleanup Pressure

The next real product-architecture cleanup pressure is not tiny and should not be treated as tail-end polish.
`pressure:product-architecture` currently points at a cluster that needs a deliberate pass:

- `di/world-constructor.ts` owns real world-construction semantics, so size alone is not the smell. The pressure is
  whether framework registration spending, resolver effects, registry/AppTask/callback effects, and lifecycle output
  still have one coherent world-constructor model or whether some subproducts should be split along Aurelia-facing
  interfaces without weakening DI provenance.
- `router/route-tree-materialization.ts` sits on the route-context, viewport-agent, recognizer, instruction, and
  component-agent handoff. Any cleanup has to preserve exact route-node provenance and framework-shaped `RouteTree` /
  `RouteNode` semantics; do not flatten this into app-specific navigation shortcuts.
- The expression scanner, interpolation parser, and completed-input iterator corridor are parser substrate, not incidental
  helper code. Refactors here should preserve parser ownership, boundary/frontier semantics, template-literal-aware
  lookahead, and exact source slices before trying to reduce body size.
- Repeated helpers such as `summaryForFrameworkKind`, `observationLocalKey`, `encodeLocal`, `catalogKey`,
  `catalogInputsForAdmission`, and `expressionProductHandlesForInstruction` are questions about identity,
  provenance, catalog row modeling, and local-key policy. Some duplication may be lane-specific vocabulary; some may
  want a shared primitive. Inspect the owning products first instead of extracting a generic utility by name alone.

Treat that cluster as a future substrate pass across DI, router, parser/evaluator boundaries, and product catalog
identity.

## Template Compiler Emulation Notes

The compiler front door now lives on `TemplateCompilerService` instead of only in `TemplateCompilationProjectPass`.
`compile(...)` owns the runtime short-circuit branches and delegates product materialization to a host. Compiler
collaborators should be used through their service models (`IAttributeParser.parse`, `IBindingCommandResolver.get`,
`IExpressionParser.parse`, `AttrMapper.map/isTwoWay`) rather than through local aliases or duplicated helper logic.

`compileSpread(...)` is wired from runtime rendering back into `TemplateCompilerService`, but dynamic spread instruction
materialization is intentionally still open. The runtime path now preserves the captured AttrSyntax handles and emits
open pressure when the spread compiler cannot close; future work should fill that host with real instruction emission
rather than bypassing the compiler service again.
