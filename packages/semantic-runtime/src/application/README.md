# Application Topology

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns the framework-normal app model that both analysis and authoring can point at. It is not a scaffold
template library and not a source parser. It names the app-level shapes the semantic runtime must understand:
entrypoints, root components, external templates, styles, services, registrations, resources, routes, and assets.

The topology should stay close to idiomatic Aurelia application structure. If a future authoring API proposes source,
the proposed source should be able to round-trip through this model and then through the existing evaluation,
configuration, DI, resource, and template layers.

## Boundary

- `application` describes what an app contains.
- `authoring` describes how an intent becomes a semantic edit plan; see [../authoring/README.md](../authoring/README.md).
- `api` opens workspaces and exposes analysis/query answers; see [../api/README.md](../api/README.md).
- `boot`, `evaluation`, `configuration`, `di`, `resources`, `template`, and `type-system` prove whether the authored app
  actually means what the plan expected.

Do not put generator taste, user preferences, or code formatting policy here. Those belong in authoring profiles or the
AI/codegen layer. This folder should remain a calm topology model that TypeScript and Atlas can inspect.

## Baseline Topology Pressure

A minimal good Aurelia app topology includes:

- `src/main.ts` starts Aurelia through real package imports.
- `src/app.ts` owns the root component class.
- `src/app.html` owns the root template.
- Optional component CSS and services are explicit files, not inline analyzer conveniences.

Recognition and verification should catch up to that topology rather than forcing authoring examples into whichever
shape happens to be easiest for today's analyzer.
