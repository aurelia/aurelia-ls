# Router

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Router is now a broad but still non-navigating substrate. Router configuration participates in app-world construction
through registration, DI, resource visibility, lifecycle-task products, and option convergence. Source-backed route
configs materialize as normalized `RouteConfig` facts, routeable component inputs preserve their
string/class/promise/navigation-strategy lane while carrying resolved resource handles when static evaluation can close
them, route-config contexts model parent/root/child topology, router options control recognizer ownership, route-
recognizer paths materialize configurable routes plus primary/residual endpoints, route runtime topology separates
runtime `RouteContext` from static `RouteConfigContext` and keys contexts by the framework's
`(ViewportAgent | null, RouteConfigContext)` cache shape, and routed components can seed template compilation so nested `au-viewport` /
`ViewportAgent` topology becomes visible before runtime navigation runs. Static router resource values materialize the
`TypedNavigationInstruction` / `ViewportInstruction` / `ViewportInstructionTree` handoff layer, closed static and
static-prefix interpolated instruction paths now walk the recognizer graph into `RecognizedRoute` products, and the first route-tree layer materializes the
framework's initial synthetic root `RouteTree` / `RouteNode` shape plus context-relative transition-tree products for
non-redirect recognized routes. Recognized route nodes can also materialize the first `ComponentAgent` plus
`routed-custom-element` controller handoff without claiming guard or viewport activation.

## Responsibilities

- Provide `auLink`-grounded model anchors for the public router runtime shapes.
- Keep value-side DI interface symbols visible as service-token products instead of flattening them into the service
  implementation models. `IRouter`, `IContextRouter`, `ICurrentRoute`, `IRouteContext`, and `IRouterOptions` are
  runtime ingress points for DI world construction.
- Preserve the split between router configuration/options, router services, normalized route config records, route
  contexts, route-tree state, viewport instructions, and router-supplied built-in resources in the resource catalog.
- Keep router registration visible as a configuration/registration pressure source before DI spending.
- Materialize `RouterOptions` from `RouterConfiguration` admissions and owner-tagged `customize(...)` option
  contributions. Option folding follows the framework defaults before route-context topology decides recognizer
  ownership.
- Materialize authored route config records from `@route(...)` and `Route.configure(...)` without running navigation.
  These records are anchored to Aurelia's `RouteConfig` convergence class, not the authoring-only route config
  interfaces. They stay source/provenance oriented so route-context and route-recognizer products can point back to the
  exact authoring site.
  Route configs also preserve separate origin and value-shape dimensions: whether the config came from `@route(...)`,
  `Route.configure(...)`, class static defaults, or a child `routes` property, and whether the read value closed as an
  object literal, path expression, routeable component, class static defaults, or open expression. Authoring taste should
  consume those two dimensions instead of guessing decorator/static/dynamic policy from route presence alone.
  Multiple normalized route fields can legitimately share one authored source node: for example a string routeable
  component can supply both the fallback `id` and `path` lane. Recognition should group shared fields under one
  combined source record and map each field to that record instead of emitting duplicate kernel records or choosing one
  arbitrary field name as the source identity.
- Publish route-config validation issues while source-backed route config records are recognized. This mirrors
  `validateRouteConfig(...)` / `validateRedirectRouteConfig(...)` before route-context, recognizer, or route-tree
  materializers consume normalized facts: statically closed invalid property values publish
  `rtInvalidConfigProperty` / `AUR3554` with the framework property path such as `.routes[0].path`, and null route
  config inputs publish `rtInvalidConfig` / `AUR3555` on the null source span. Unknown authored keys publish
  `rtUnknownConfigProperty` / `AUR3556`; redirect route objects use the narrower `path`/`redirectTo` vocabulary and
  publish `rtUnknownRedirectConfigProperty` / `AUR3557` for route-only keys. Open/static-evaluation-boundary values stay
  unclaimed until their value can be proven.
- Publish child-route lazy component path issues while route configs are still source-backed. This mirrors
  `RouteConfigContext._configureChildRoutes(...)`: a child route object with `component: import(...)` must specify
  `path` before the import resolves, so semantic-runtime publishes `rcNoPathLazyImport` / `AUR3173` on the child route
  object instead of treating it as a generic open route.
- Keep field-level provenance on authored router configuration surfaces only when the fields can plausibly be tied back
  to authored route/options fields. Generated router products such as `RouteConfigContext`, `RouteContext`,
  `ViewportInstruction`, recognizer states/endpoints, recognized routes, route nodes/trees, viewport agents, and
  component agents should rely on product/source/evidence provenance until exact sub-field source ranges are modeled.
  Stamping one router provenance handle onto every generated property creates false edit and rename precision.
- Treat static route metadata as `Route.getConfig` input, not as decorator-only sugar. Classes with route-shaped static
  properties can produce route config facts even when no route decorator has run.
- Treat `RouteableComponent` as its own convergeable framework concept. The source lane remains visible (`class`,
  `promise`, custom-element name, resource definition, navigation strategy, or open), and resolved resource handles
  express the `resolveCustomElementDefinition(...)` / `_resolveLazy(...)` handoff when static module evaluation can close
  it.
  Lazy-imported routeable modules publish `rcInvalidLazyImport` / `AUR3175` only when the fulfillment lane is definitely
  not a custom-element type, a module with a resource definition, or a partial custom-element-definition-like object.
  If the module exports a class/function but resource recognition cannot prove the definition, the routeable stays
  unresolved rather than guessing.
  String component/fallback values first use the current route context component's converged custom-element
  `dependencies`, matching the first branch of `resolveCustomElementDefinition(...)`. This closes the common
  dependency-scoped case where multiple same-named resources exist but the parent component admits one of them. After
  that scoped pass, string routeables fall back to unique project-visible custom-element names and aliases. The model
  publishes `rtNoComponent` / `AUR3552` only when the authored string resolves to no known custom-element definition at
  all; full root-container/global-registration visibility is still a separate resource-scope frontier.
- Treat string entries in child `routes` arrays as routeable component inputs. When a string routeable resolves to a
  custom-element definition in the current resource index, semantic-runtime can derive the same fallback path lane that
  `RouteConfig.path` derives from the custom-element name and aliases; unresolved strings remain open routeable
  components rather than pretending to be closed route paths.
- String routeable lookup should consume converged custom-element names, aliases, and dependency-scope entries through
  `ResourceDefinitionIndex`. If a routeable string misses while the component source is present, first inspect shared
  static evaluation and resource recognition admission, especially local side-effect imports, before adding
  router-local discovery.
- Materialize `RouteConfigContext` parent/root/config/child-route topology from app roots when available, falling back
  to graph roots for library-like analysis. Explicit child route configs win; otherwise a route whose component has
  static route metadata borrows that component route config's child routes, matching the framework's
  `_applyChildRouteConfig(...)` handoff closely enough for static topology.
- Model recognizer ownership from effective router options. In lazy mode each route-config context owns its recognizer;
  with `useEagerLoading: true`, child contexts reuse the root recognizer reference and route-recognizer paths include the
  parent route path prefix.
- Parse closed route config paths into `ConfigurableRoute`, `Parameter`, `StaticSegment`, `DynamicSegment`, and
  `StarSegment` facts, preserving local `path` and optional `parentPath`, then materialize the `Endpoint` products that
  `RouteRecognizer.add(..., true)` creates. Every non-star route gets a primary endpoint plus the framework's residual
  catch-all endpoint.
- Materialize the first `State` graph nodes produced by appending endpoint paths: separator states, static-character
  states, dynamic parameter states, star states, and residual states. State products carry previous and next-state
  references plus segment name/pattern pressure so route-recognizer candidate matching can walk the same forward graph
  shape as the framework instead of reverse-engineering from route config rows.
- Publish source-backed route-recognizer issue products when framework registration would throw, rather than silently
  accepting a valid-looking static graph. Duplicate endpoint paths and ambiguous endpoint assignment are modeled as
  diagnostic-role products tied to the recognizer, endpoint/state references, framework-shaped message, and authored
  source location. Reserved `$$residue` parameter usage and invalid dynamic-parameter regex constraints are registration
  issues too; semantic-runtime should publish the issue and avoid materializing endpoints/state graph rows for a route
  path the framework would reject. API rows expose these as `framework-runtime-behavior` rather than fake
  `framework-error-code` authority because the framework currently throws raw `Error` instances for this package.
  When the framework throw is a source-visible raw Error row, the issue carries a `frameworkRawErrorAuthority` key
  through `RouteRecognizerRawErrorAuthority` so Atlas can close the exact raw framework usage without inventing a
  mapped AUR code. Keep these separate from open seams: an issue means known framework failure semantics, while an open seam means
  semantic-runtime lacks enough authority to close behavior.
- Feed resolved routeable custom elements into template compilation as routeable seeds. This is the current recursive
  rendering bridge: it lets routed component templates, nested route configs, and nested `au-viewport`s be analyzed
  without pretending that viewport activation or route-tree transitions have run.
- Materialize static `RouteContext` topology after route configs and routed templates are visible. A `RouteContext`
  points at its parent/root route context, its owning `RouteConfigContext`, the modeled child DI container when a
  controller/container boundary is available, and the hosting `ViewportAgent` for non-root contexts. This prevents
  `au-viewport` products from pretending that a configured-route context is the runtime route context. Follow
  `Router._getRouteContext(...)`: the same configured route context can produce multiple runtime route contexts when it
  is hosted by different viewport agents, so callers must use plural context sets or the explicit
  `(RouteConfigContext, ViewportAgent | null)` pair. The route-runtime topology frame owns this recursive traversal so
  route-config indexes, parent-child context topology, viewport drafts, and emitted context/viewport products stay in
  one runtime-topology lifetime.
- Materialize `ViewportCustomElement` and `ViewportAgent` products against the owning `RouteContext`. Viewport selection
  follows the framework's `ViewportAgent._handles(...)` shape: non-default viewport requests require a name match, and
  `usedBy` narrows by component name.
- Materialize static router-resource instruction trees from `load` and internal `href` custom attributes. This mirrors
  the `valueChanged(...) -> createViewportInstructions(...)` handoff: closed string values are parsed as router
  `RouteExpression` input, then become nested/sibling `TypedNavigationInstruction`, `ViewportInstruction`, and
  `ViewportInstructionTree` products with viewport, parameter-count, grouping, query, and fragment shape. Binding-owned
  source-value evaluation can close getter/field-backed string values when the modeled `Scope` and static evaluator can
  prove them; host-dependent values stay open with the evaluator boundary-value reason attached as a typed open-seam
  reason kind. `href` first follows the framework's `_resolveIsExternal(...)` gate: explicit `external` /
  `data-external` attributes and statically external URL strings do not become viewport-instruction products, while a
  dynamic `href` value stays open with `router-href-externality-open` until semantic-runtime can either prove the
  external URL lane or close an internal route string. `RouterOptions.useHref=false`, non-anchor hosts, and a co-located
  `load` custom attribute also carry `router-href-click-interception-disabled`; anchor `target` values other than
  `_self` carry `router-href-click-interception-target-open` because the framework compares them with the runtime
  window name before deciding. Both reason kinds mirror the framework constructor/binding click-interception gates
  without pretending URL generation is disabled. Dynamic `href` seams should anchor to the binding value source span when that
  span is known; the route context is the runtime seam owner, but the binding value is the source a user or future
  repair plan needs to inspect. Interpolation, template strings, string concatenation, and
  evaluator-local view-model method calls can preserve authored static route prefixes as string-pattern values with
  runtime holes, allowing recognizer matching to continue for static path/query shape without pretending the concrete
  parameter values are known. Root and relative string prefixes are normalized through the owning `RouteContext` before
  the instruction tree is materialized, matching `RouteContext.createViewportInstructions(...)`. Closed primitive
  router-resource values that cannot be a route string, routeable component, or viewport instruction publish
  `instrInvalid` / `AUR3400`; routeable classes/functions/promises that are not yet modeled stay open so this
  diagnostic does not mask missing routeable-instruction support.
- Keep router issue ownership in router products even when the source span is a template value. API template diagnostics
  and cursor-info may project template-locus copies of router failures for LSP surfaces, but the owning rows remain
  `RouterIssues` / router-domain `AppDiagnostics`. Route-instruction issue provenance should prefer the narrowest
  expression or HTML attribute-value source address; the full custom-attribute carrier is fallback evidence, not the
  edit locus, once a value span is available.
- Materialize object navigation instructions as the eager path-generation handoff owned by
  `RouteConfigContext._generateViewportInstruction(...)`. When a `load.bind`/internal `href.bind` object closes to a
  routeable component plus `params`, semantic-runtime asks the route-config context and recognizer endpoint graph to
  produce the path before lowering back into the ordinary RouteExpression instruction-tree lane. RouteConfig/class
  components that cannot satisfy endpoint requirements publish `RouterIssue` products with exact
  `rcEagerPathGenerationFailed` / `AUR3166` authority; string route ids still follow the framework's non-throwing
  branch and stay open/not-eager when they cannot close. Closed object instruction `children` recurse through the
  generated component's `RouteConfigContext`, merge child query params, preserve viewport suffixes, and then re-enter
  the ordinary static instruction-tree lane.
- Resolve the owning router-resource `RouteContext` through modeled controller/container ancestry before falling back to
  route-config component-definition matching. `load` and `href` resolve `IContextRouter` / `IRouteContext` from the
  custom-attribute controller's container chain; ordinary child components inside a routed component can therefore
  inherit the route context even when their own definition is not a routeable component. Root route contexts also publish
  a root-container fallback, mirroring the framework's extra root `IContextRouter` registration.
- Publish `RouteConfig` typed product details after committing route-config products. Inquiry surfaces such as
  template completion should consume these details by product handle when they need route-authoring domains; they should
  not rescan source files for route-like strings or reach through API row projections.
- Walk static string instruction paths through the owning `RouteConfigContext` recognizer after instruction-tree
  creation. `RecognizedRoute` products are emitted from the same candidate-chain rules as
  `RouteRecognizer.recognize(...)`: state traversal uses the forward `State.nextStates` graph, candidate selection
  compares segment ranks, optional-state skips are preserved, and endpoint grouping compares the route-config handler
  identity rather than the configurable-route row so multi-path and residual endpoints stay attached to one route
  handler. Closed static redirects are re-recognized as additional `RecognizedRoute` facts with `redirectDepth` and
  `redirectSourceRouteConfig` so route-tree compilation can consume the exact redirect target instead of pretending the
  redirect route has a `RouteNode`.
  A closed static instruction path that reaches the recognizer, matches no configured route, and has no fallback on the
  owning route config publishes `instrNoFallback` / `AUR3401` as a route-recognition issue. Dynamic/open instructions
  and contexts without a materialized recognizer remain open seams instead of spending this framework code.
  If a recognized redirect route migrates to a closed target path and that target does not match the owning recognizer,
  semantic-runtime publishes `instrUnknownRedirect` / `AUR3402` against the redirect route config. The framework throws
  this from `RouteTree.createConfiguredNode(...)`; the product pass records it during redirect expansion because the
  recognizer miss is already closed there.
- Materialize the initial synthetic `RouteTree` root that `Router.routeTree` creates before navigation transition
  compilation. These products connect the root `RouteContext`, root `RouteConfig`, and effective `RouterOptions` so API
  consumers can distinguish configured/runtime topology from the later active route-node tree.
- Materialize context-relative transition `RouteTree` / `RouteNode` products once a static `ViewportInstructionTree`
  has closed and recognizer matching has produced non-redirect `RecognizedRoute` facts. Route nodes now carry the
  framework-shaped handoff fields from `RouteNode.create(...)`: instruction/original-instruction references,
  recognized route, params/query/fragment counts, viewport name, residue count, parent/child node references, component,
  title, path, and final path. A transition chain emits a route tree only when every `ViewportRequest` can resolve
  through the parent route context's available `ViewportAgent`s and the resulting context pair is materialized. A closed
  request with no matching viewport agent publishes `rcNoAvailableVpa` / `AUR3174` as an exact router issue without also
  recording a router open seam; missing request pieces and missing route-context pairs stay as open seams instead of
  publishing partial route trees as if they had closed. Initial root, transition root, and transition child nodes all
  publish through the same route-node
  materialization primitive so route-node handles and config references stay aligned as the router tree substrate grows.
- Preserve the framework RouteExpression tree shape, not only flattened viewport instructions. Redirect parameter
  migration in `RouteTree.createConfiguredNode(...)` accepts only `Segment` / slash-scoped `Segment` chains; sibling
  composites and grouped expressions are known framework failures and should publish router issue products with
  `exprUnexpectedKind` / `AUR3502` instead of being treated as recognizer misses or generic redirect open seams.
  Redirect route configs should only produce `router-redirect-target-open` when redirect expansion genuinely did not
  close and no exact framework issue was published.
- Materialize the first `ComponentAgent` handoff for recognized route nodes with resolved custom-element components.
  The framework creates a child container with inherited parent resources before `Controller.$el(...)`; semantic-runtime
  mirrors that as a `ComponentAgent` product and a `RuntimeControllerCreationKind.RoutedCustomElement` controller row
  in `created` readiness. This is the pre-activation handoff, not proof that viewport activation or component lifecycle
  scheduling completed.

## Non-Responsibilities

- Running navigation, history, URL parsing, guard lifecycles, or viewport activation.
- Computing `NavigationRoute.isActive` menu state from the live route tree. `NavigationRoute._setIsActive` /
  `AUR3450` belongs to active navigation state, while semantic-runtime currently exposes recognizer endpoints and
  pre-activation route-tree facts.
- Executing routed view-model `getRouteConfig(...)` hooks or detecting repeated hook application. `RouteConfig._applyFromConfigurationHook`
  / `AUR3550` is a runtime view-model lifecycle guard.
- Resolving `NavigationStrategy` components outside a concrete viewport instruction. `RouteConfig.component` /
  `AUR3558` stays unclaimed because navigation-strategy routeables remain referential/open until navigation supplies
  the instruction context.
- Resolving string or lazy-import routeables through a full `RouteConfigContext` dependency/resource scope. The current
  model handles dependency-array custom-element names for child route contexts and can claim the closed string miss
  where no component is known (`rtNoComponent` / `AUR3552`), but root-container registration visibility, imported view
  resources, inline templates, and `resolveCustomElementDefinition(...)` guards such as `AUR3551` and `AUR3553` stay
  unclaimed until semantic-runtime has a fuller scope-specific routeable resolver product.
- Emulating imperative router path-generation API calls such as `generateRootedPath(...)` /
  `generateRelativePath(...)`; `createEagerInstructions(...)` / `AUR3404` belongs to that public API surface, while
  router-resource object values are modeled through `RouteConfigContext._generateViewportInstruction(...)`.
- Exposing arbitrary `TypedNavigationInstruction.toUrlComponent(...)` calls. `instrInvalidUrlComponentOperation` /
  `AUR3403` is a framework internal-bug guard for asking non-URL instruction kinds to render as URL components.
- Executing `RouteContext.setRoot(...)` or `RouteContext.resolve(...)` against arbitrary mutable runtime containers or
  caller-provided context objects. Startup guards such as `AUR3167` through `AUR3170` stay outside the static app-world
  product surface.
- Claiming exact `rcNoContextStringComponent` / `AUR3178` from generic route-context absence. Router-resource
  no-context cases stay as open seams until relative string normalization can distinguish an exact framework throw from
  an unresolved context handoff.
- Emulating imperative `Router` API calls against pre-root lifecycle/container state. `Router._ctx` / `AUR3272`
  belongs to using the router singleton before `RouteContext.setRoot` has registered `IRouteContext`; router-resource
  route-context seams are not proof of that lifecycle failure.
- Emulating guard/lifecycle scheduling, viewport-agent activation, route-node/controller activation, redirect loop
  diagnostics, or every redirect parameter edge case. Recognized-route and transition-tree products are pre-activation
  handoff facts, not proof that navigation completed. ViewportAgent unexpected-state guards such as `AUR3350` through
  `AUR3353` stay unclaimed until semantic-runtime admits a transition/activation state-machine product.
- Claiming that every static `RouteContext` has an active `RouteNode`. The current `RouteContext` products are
  potential runtime contexts rooted in framework-shaped controller/container and viewport boundaries, while
  `RouteContext.node` / `AUR3171` is an active-navigation pointer assigned by root setup or route-tree construction.
- Claiming that every `RouteContext` has a `ViewportAgent`. Root contexts deliberately have none, unresolved child
  hosting stays as a viewport-resolution seam, and `RouteContext.vpa` / `AUR3172` belongs to runtime activation reads
  rather than static route-context topology.
- Claiming that `RouteConfigContext` and `RouteContext` have one-to-one cardinality. Configured topology remains visible
  even when a child route has no currently modeled hosting viewport; runtime contexts require the framework-shaped
  viewport-agent handoff.
- Publishing partial transition `RouteTree` products for a recognized instruction chain whose nested viewport resolution
  stays open. Add a first-class partial tree product before exposing those prefixes as products.
- Materializing a cloned/applied `RouteConfig` product for component-level child metadata. The current route-context
  graph applies those children during topology traversal; add a first-class applied-config product if another consumer
  needs exact `RouteConfig._applyChildRouteConfig(...)` provenance.

## Watchpoints

- Router route configs can name components by strings, imported resource definitions, view-model classes, promises,
  navigation strategies, and nested viewport instructions. Keep those forms referential until a materializer has enough
  evaluated source facts to converge them.
  Dynamic `import(...)` route components belong to the promise routeable lane because `TypedNavigationInstruction.create`
  treats promises as lazy module instructions, even when `_resolveLazy(...)` can already point at the fulfilled custom
  element definition.
- Route-config validation should not become a broad TypeScript type checker. Spend `AUR3554` / `AUR3555` only for
  statically closed values matching the router's runtime validation branches; leave weak/external route config values as
  open semantic pressure so the authoring layer can ask for intent or stronger typing.
- Follow-up expression readers must preserve the `StaticModuleEvaluationResult` policy/runtime host. Re-reading route
  component expressions through a fresh evaluator amputates dynamic-import and framework intrinsics that the module graph
  already resolved.
- Router resources (`au-viewport`, `load`, `href`) are ordinary Aurelia resources supplied by router configuration.
  They flow through the same resource/registration/DI/compiler-world machinery as framework resources, not through a
  router-only shortcut.
- Authoring value completion for router resources should mirror that same shape. `load` and internal `href` values can
  offer modeled route-config ids/paths as candidates, but `href` remains open-ended because the framework intentionally
  allows external URLs and only turns non-external values into viewport instructions.
- A dynamic `href` flowing through a weakly typed callback, external-link-like field, or bare external module should
  remain open. A non-current-window `target` makes external/native-link intent more likely for authoring repair, but it
  does not close the value because `HrefCustomAttribute.valueChanged(...)` still rewrites non-external strings.
  String-pattern closure is for values where the evaluator can see a static internal route prefix; it is not a license
  to classify arbitrary dynamic strings as internal router instructions.
- Static `href` and `load` strings are not single opaque component names. The framework sends them through
  `RouteExpression.parse(...)` before route-tree transition compilation, so semantic-runtime should preserve nested
  children, sibling `+` segments, viewport suffixes, root-only expressions, query params, and fragments before any
  recognizer matching is attempted. The parser substrate now exposes both the framework-shaped expression tree and
  source-backed parser failures: `exprUnexpectedSegment` / `AUR3500` and `exprNotDone` / `AUR3501` are router issue
  products for closed malformed strings, not open seams. Use the expression tree when a framework algorithm branches on
  expression kind, such as redirect migration.
- Object-form `load.bind`/`href.bind` values are not RouteExpression strings. They belong to the
  `RouteConfigContext._generateViewportInstruction(...)` substrate, whose output re-enters the string route-expression
  lane only after endpoint path generation succeeds. Keep failures as router issue products when the framework would
  throw, not as recognizer misses.
- Relative router-resource strings must normalize against `RouteContext.createViewportInstructions(...)` before
  recognizer matching. In particular, every `../` prefix climbs one parent route context before the runtime flips its
  context-changed flag; stripping multiple prefixes while climbing only once sends recognition into the wrong
  `RouteConfigContext` and can surface false viewport-resolution seams.
- `@aurelia/route-recognizer` is a lower-level route matching engine. Do not model it as app semantics until router
  materializers actually need recognizer-level route matching facts. State and endpoint products are now parser-like
  substrate; candidate and recognized-route products should follow the same framework-grounded path rather than becoming
  a small extension of route config rows.
  Start from Atlas `framework.router` recognizer rows so the semantic-runtime model follows Aurelia's actual
  segment/state/candidate machinery.
