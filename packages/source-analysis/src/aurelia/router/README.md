# Router

Router is a deliberately thin semantic island for now. The package is not part of the template compiler path yet, but
it contributes real Aurelia configuration, DI services, resources, route config, route contexts, and navigation
instruction objects that will eventually interact with app-world construction.

## Responsibilities

- Provide `auLink`-grounded model anchors for the public router runtime shapes.
- Keep value-side DI interface symbols visible as service-token products instead of flattening them into the service
  implementation models. `IRouter`, `IContextRouter`, `ICurrentRoute`, `IRouteContext`, and `IRouterOptions` are
  runtime ingress points for DI world construction.
- Preserve the split between router configuration/options, router services, route config records, route contexts,
  route-tree state, viewport instructions, and router-owned built-in resources.
- Keep router registration visible as a configuration/registration pressure source before DI spending.

## Non-Responsibilities

- Running navigation, history, URL parsing, async loading, guard lifecycles, or viewport activation.
- Recognizing route configs from user source. That belongs to a later recognizer pass over evaluation/configuration.
- Admitting router resources into compiler worlds. That belongs to registration, DI world construction, and resource
  visibility once router configuration is modeled as an actual registration effect.

## Watchpoints

- Router route configs can name components by strings, imported resource definitions, view-model classes, promises,
  navigation strategies, and nested viewport instructions. Keep those forms referential until a materializer has enough
  evaluated source facts to converge them.
- Router resources (`au-viewport`, `load`, `href`) are ordinary Aurelia resources supplied by router configuration.
  They should eventually flow through the same resource/registration/DI/compiler-world machinery as framework
  resources, not through a router-only shortcut.
- `@aurelia/route-recognizer` is a lower-level route matching engine. Do not model it as app semantics until router
  materializers actually need recognizer-level route matching facts.
