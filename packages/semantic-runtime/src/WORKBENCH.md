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

The operational API boundary now lives in `api`. It opens an app by composing source admission, static module
evaluation, resource recognition, configuration admission, DI world construction, compiler-world formation, template
compilation, rendering dispatch, and TypeChecker-backed scope products. Keep initial answers compact; expose opaque
kernel handles only through explicit detail projections so the API can serve app developers and AI callers without
forcing every query into full graph expansion.
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
belongs to a dependency/resource package. If no app contains the cursor, they open the selected project with a stable
project-wide authoring lane instead of creating one app-world variant per cursor file. Keep that distinction; external
app pressure showed that file-owner project selection alone can lose app context and can also duplicate shared kernel
publication when repeated LSP queries walk different templates in one runtime instance.
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
on host environment state, the router seam should remain open with typed lower-level reason kinds attached rather than
being forced into either an internal route or external-link bucket. Open seam pressure should aggregate those reason
kinds, not parse summary prose. If the blocked value comes from a runtime/local scope slot, the router seam should carry
the binding-source slot reason alongside `router-instruction-needs-static-value`; do not hide that under a generic
router expression failure.
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

Cursor/LSP pressure has its own script now: `pressure:cursor-loci`. It samples bounded template cursor positions and
prints aggregate site kinds, outcomes, completion pressure classes, value-site kinds, candidate lanes, public API
answer mismatches, cursor-info source coverage, focused selected-member coverage, hover/navigation targets, diagnostic
signals, compact LSP envelopes, value-domain gaps, and bucketed missing-input reasons without paths, source text, or candidate names. Use it with
`SEMANTIC_RUNTIME_CURSOR_PRESSURE_ROOTS` for external roots when a question is about hovers/completion/navigation
pressure rather than whole app topology. Current sampled behavior is: generic expression scopes, binding-command names,
resource names, bindable names, expression member owners, and parent repeat scopes are reachable; plain platform
attribute values can remain empty misses; finite checker-backed static bindable domains offer literal
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
authored JSON property spans rather than the generated default-export wrapper.
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
Diagnostic rows now carry `diagnosticAuthority` and `frameworkErrorCode`. The existing weak-owner and TypeScript
strictness rows are `semantic-authoring-policy`; runtime no-op assignment is `framework-runtime-behavior` with no
framework error code. Do not add `framework-error-code` diagnostics without first checking Aurelia source through Atlas
`framework.errors` and carrying the exact code.
The current resource-library pressure exposed a dynamic `SelectValueObserver` multi-select channel; that is modeled as a
typed `binding-value-channel-dynamic-select-multiple` open reason on the value-channel seam and preserved by dependent
data-flow seams.
Public plugin pressure then exposed the sibling single-select case: a select with no static option domain should report
`binding-value-channel-select-option-domain-open`, not a summary-only seam. Cursor-pressure public API comparisons are
now project-scoped in multi-project runs so cache/app-context ambiguity does not masquerade as candidate drift.
The 2026-05-10 clean-room external app and mixed-monorepo samples still show stable public API behavior:
app/resource-library shape triage opens bounded app-world emissions, router/controller/resource products materialize,
unresolved module edges stay closed, cursor completions and cursor-info agree, and public cursor/file calls report no
exception or template-resource miss classes. Treat remaining rows as typed product pressure: weak owner diagnostics,
TypeScript assignment strictness, expected-empty plain-attribute interpolation completions, and explicit open seams such
as dynamic select-multiple value channels or dynamic router-href externality.

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
- `di/world-constructor.ts` owns real world-construction semantics, so size alone is not the smell. Framework resolver
  effects now share the source resolver-admission publication path and effect tables have moved out to
  `di/framework-registration-effects.ts`; remaining pressure is whether registry/AppTask/callback effects and lifecycle
  output still have one coherent world-constructor model or whether some subproducts should be split along
  Aurelia-facing interfaces without weakening DI provenance.
- `router/route-tree-materialization.ts` sits on the route-context, viewport-agent, recognizer, instruction, and
  component-agent handoff. Router product record boilerplate now lives in `router/router-product-records.ts`; remaining
  cleanup has to preserve exact route-node provenance and framework-shaped `RouteTree` / `RouteNode` semantics; do not
  flatten this into app-specific navigation shortcuts. Transition-tree construction now runs through a dedicated frame:
  missing instruction-tree / route-context / route-config products are treated as internal invariant failures, while a
  framework redirect handoff that cannot yet be compiled into its target tree is recorded as an explicit router open
  seam.
- The expression scanner and completed-input iterator corridor are parser substrate, not incidental helper code. The
  interpolation parser has been split between boundary extraction and a publication frame, and scanner punctuation/operator
  recognition now dispatches through token-family helpers instead of one giant switch. Future parser refactors should
  preserve parser ownership, boundary/frontier semantics, template-literal-aware lookahead, active-hole selection, token
  family law, and exact source slices before trying to reduce body size.
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
- Runtime rendering now separates renderer-product publication from render-loop/controller orchestration.
  `runtime-rendered-instruction-recorder.ts` owns renderer-produced runtime bindings, target operations, scope effects,
  and binding render contexts. `runtime-rendering-materializer.ts` still owns controller, synthetic-view, view-factory,
  child-container, and render-host orchestration. If more runtime-rendering pressure appears, split along those
  framework-shaped responsibilities rather than moving record constructors around by file size alone.
- Template API cursor/file readers now delegate weak-owner and binding-assignment diagnostic decisions to
  `api/template-diagnostic-policy.ts`. Keep source selection and cursor context in the API reader, but keep severity,
  diagnostic authority, framework error-code attachment, suggestion/action-target routing, and product-policy wording in
  that policy module until diagnostics become a deeper materialized product.

Treat that cluster as a future substrate pass across DI, router, parser/evaluator boundaries, and product catalog
identity.

Expression type evaluation now carries a shared per-template-runtime-analysis cache across scope construction,
binding value-channel, and binding data-flow materializers. App pressure prints aggregate `expression type cache`
entries/hits/misses/writes plus semantic buckets for binding expressions, member owners, iterator locals, template
controllers, and contextual keys. If binding observation cost rises again, first inspect whether a materializer is
bypassing the shared cache or introducing a downstream role into the local key; expression type projections should be
keyed by modeled scope plus expression product, not by the materializer lane that asked. Contextual target types should
only enter the cache key for expression kinds whose evaluator semantics actually consume them. At the moment that means
arrow-function parameter projection, including paren-wrapped arrows. Do not pay contextual cache cardinality for
ordinary member/value expressions until the evaluator grows a real contextual semantics for them.

Binding data-flow source writeability is demand-driven by flow direction. Source-to-target bindings still project source
kind/name/type, but they should not ask whether the source expression is assignable because no target-to-source
`astAssign` can happen. This matters for member expressions: owner-type writeability checks are useful strictness policy
for two-way/from-view flows, but they are wasted TypeChecker work for one-way rendering. If future source-assignment
pressure changes, verify the direction gate before widening assignment policy.

DI world construction now uses a shared resolver-publication primitive for both source resolver admissions and framework
resolver effects. Framework registration effect tables live in `di/framework-registration-effects.ts`; keep adding
capability-keyed framework effects there rather than inlining them into `DiWorldConstructor`.

App-world project construction now runs through a construction frame. The frame has a real lifetime, owns timing phase
state, and gives each project phase a named handoff method. Preserve that shape if adding more router, SSR/SSG, or AOT
phases; do not grow `constructAndEmit` back into a single long dependency chain.

Router product record emission is shared by route-instruction and route-tree materialization through
`router/router-product-records.ts`. Use that primitive for RouterIdentity + materialized-product + materialization-record
bundles unless a router product needs materially different ownership or provenance semantics.

## Template Compiler Emulation Notes

The compiler front door now lives on `TemplateCompilerService` instead of only in `TemplateCompilationProjectPass`.
`compile(...)` owns the runtime short-circuit branches and delegates product materialization to a host. Compiler
collaborators should be used through their service models (`IAttributeParser.parse`, `IBindingCommandResolver.get`,
`IExpressionParser.parse`, `AttrMapper.map/isTwoWay`) rather than through local aliases or duplicated helper logic.

`compileSpread(...)` is wired from runtime rendering back into `TemplateCompilerService`, but dynamic spread instruction
materialization is intentionally still open. The runtime path now preserves the captured AttrSyntax handles and emits
open pressure when the spread compiler cannot close; future work should fill that host with real instruction emission
rather than bypassing the compiler service again.
