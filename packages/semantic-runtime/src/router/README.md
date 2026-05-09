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
- Treat static route metadata as `Route.getConfig` input, not as decorator-only sugar. Classes with route-shaped static
  properties can produce route config facts even when no route decorator has run.
- Treat `RouteableComponent` as its own convergeable framework concept. The source lane remains visible (`class`,
  `promise`, custom-element name, resource definition, navigation strategy, or open), and resolved resource handles
  express the `resolveCustomElementDefinition(...)` / `_resolveLazy(...)` handoff when static module evaluation can close
  it.
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
- Feed resolved routeable custom elements into template compilation as routeable seeds. This is the current recursive
  rendering bridge: it lets routed component templates, nested route configs, and nested `au-viewport`s be analyzed
  without pretending that viewport activation or route-tree transitions have run.
- Materialize static `RouteContext` topology after route configs and routed templates are visible. A `RouteContext`
  points at its parent/root route context, its owning `RouteConfigContext`, the modeled child DI container when a
  controller/container boundary is available, and the hosting `ViewportAgent` for non-root contexts. This prevents
  `au-viewport` products from pretending that a configured-route context is the runtime route context. Follow
  `Router._getRouteContext(...)`: the same configured route context can produce multiple runtime route contexts when it
  is hosted by different viewport agents, so callers must use plural context sets or the explicit
  `(RouteConfigContext, ViewportAgent | null)` pair.
- Materialize `ViewportCustomElement` and `ViewportAgent` products against the owning `RouteContext`. Viewport selection
  follows the framework's `ViewportAgent._handles(...)` shape: non-default viewport requests require a name match, and
  `usedBy` narrows by component name.
- Materialize static router-resource instruction trees from `load` and internal `href` custom attributes. This mirrors
  the `valueChanged(...) -> createViewportInstructions(...)` handoff: closed string values are parsed as router
  `RouteExpression` input, then become nested/sibling `TypedNavigationInstruction`, `ViewportInstruction`, and
  `ViewportInstructionTree` products with viewport, parameter-count, grouping, query, and fragment shape. Binding-owned
  source-value evaluation can close getter/field-backed string values when the modeled `Scope` and static evaluator can
  prove them; host-dependent values stay open with the evaluator boundary-value reason attached. Interpolation and template strings with an authored
  static route prefix use opaque dynamic holes for the unknown runtime values, allowing recognizer matching to continue
  for static path/query shape without pretending the concrete parameter values are known. Root and relative string
  prefixes are normalized through the owning `RouteContext` before the instruction tree is materialized, matching
  `RouteContext.createViewportInstructions(...)`.
- Walk static string instruction paths through the owning `RouteConfigContext` recognizer after instruction-tree
  creation. `RecognizedRoute` products are emitted from the same candidate-chain rules as
  `RouteRecognizer.recognize(...)`: state traversal uses the forward `State.nextStates` graph, candidate selection
  compares segment ranks, optional-state skips are preserved, and endpoint grouping compares the route-config handler
  identity rather than the configurable-route row so multi-path and residual endpoints stay attached to one route
  handler. Closed static redirects are re-recognized as additional `RecognizedRoute` facts with `redirectDepth` so
  route-tree compilation can consume the redirect target instead of pretending the redirect route has a `RouteNode`.
- Materialize the initial synthetic `RouteTree` root that `Router.routeTree` creates before navigation transition
  compilation. These products connect the root `RouteContext`, root `RouteConfig`, and effective `RouterOptions` so API
  consumers can distinguish configured/runtime topology from the later active route-node tree.
- Materialize context-relative transition `RouteTree` / `RouteNode` products once a static `ViewportInstructionTree`
  has closed and recognizer matching has produced non-redirect `RecognizedRoute` facts. Route nodes now carry the
  framework-shaped handoff fields from `RouteNode.create(...)`: instruction/original-instruction references,
  recognized route, params/query/fragment counts, viewport name, residue count, parent/child node references, component,
  title, path, and final path. A transition chain emits a route tree only when every `ViewportRequest` can resolve
  through the parent route context's available `ViewportAgent`s and the resulting context pair is materialized; otherwise
  it records a router open seam at the parent route context instead of publishing a partial route tree as if it had
  closed.
- Materialize the first `ComponentAgent` handoff for recognized route nodes with resolved custom-element components.
  The framework creates a child container with inherited parent resources before `Controller.$el(...)`; semantic-runtime
  mirrors that as a `ComponentAgent` product and a `RuntimeControllerCreationKind.RoutedCustomElement` controller row
  in `created` readiness. This is the pre-activation handoff, not proof that viewport activation or component lifecycle
  scheduling completed.

## Non-Responsibilities

- Running navigation, history, URL parsing, guard lifecycles, or viewport activation.
- Emulating guard/lifecycle scheduling, viewport-agent activation, route-node/controller activation, redirect loop
  diagnostics, or every redirect parameter edge case. Recognized-route and transition-tree products are pre-activation
  handoff facts, not proof that navigation completed.
- Claiming that every static `RouteContext` has an active `RouteNode`. The current `RouteContext` products are
  potential runtime contexts rooted in framework-shaped controller/container and viewport boundaries.
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
- Follow-up expression readers must preserve the `StaticModuleEvaluationResult` policy/runtime host. Re-reading route
  component expressions through a fresh evaluator amputates dynamic-import and framework intrinsics that the module graph
  already resolved.
- Router resources (`au-viewport`, `load`, `href`) are ordinary Aurelia resources supplied by router configuration.
  They flow through the same resource/registration/DI/compiler-world machinery as framework resources, not through a
  router-only shortcut.
- Static `href` and `load` strings are not single opaque component names. The framework sends them through
  `RouteExpression.parse(...)` before route-tree transition compilation, so semantic-runtime should preserve nested
  children, sibling `+` segments, viewport suffixes, root-only expressions, query params, and fragments before any
  recognizer matching is attempted.
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
