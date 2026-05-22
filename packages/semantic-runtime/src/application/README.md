# Application Topology

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns the framework-normal app model that both analysis and authoring can point at. It is not a scaffold
template library and not a source parser. It names the app-level shapes the semantic runtime must understand:
entrypoints, root components, component-local dependencies, external templates, styles, services, registrations,
resources, routes, and assets.

The topology should stay close to idiomatic Aurelia application structure. If a future authoring API proposes source,
the proposed source should be able to round-trip through this model and then through the existing evaluation,
configuration, DI, resource, and template layers.

`ApplicationTopologyBuilder` is the app-level construction helper for recipes and future authoring operations. Keep
file/component/template/service/route assembly there when it is topology structure rather than recipe taste; recipes
should name intent and preferences, not rebuild the same topology product graph by hand.
For larger recipes, keep the recipe topology function as a short phase assembler and use named helpers for each
topology artifact it contributes. This keeps root components, child components, state/service rows, routes, and
entrypoints visible to Atlas without turning the builder into a recipe-specific DSL.
When a recipe allows custom source paths, topology references and template/style import specifiers must be derived from
those paths in the same way the source plan derives authored imports. `ApplicationTopologyBuilder.component(...)`
therefore accepts the importer path as `referenceFromPath` and derives the component reference module specifier from
that plus the component source path. A default-layout module specifier such as `./app` is only correct for the default
layout.
The shared `moduleSpecifier(...)` helper lives in this folder because relative authored imports are part of app
topology, not a source-template-only convenience.

`readApplicationServiceTopology(...)` is the source-backed recognition side for class-bearing app support code. It
projects service/state/model classes, Aurelia `resolve(...)` injection sites, and TypeChecker-confirmed reads, writes,
and calls into those classes before the API serializes rows. Keep this layer roleful and source-backed: folder roles may
admit a support file, but class rows, injection rows, and interaction rows should come from declarations, imports, and
checker identity rather than name-only assumptions.

Injection rows carry the member that owns a `resolve(...)` call. Interaction recognition uses that source/member fact
for `this.<field>.<member>` receivers before falling back to TypeChecker receiver identity. This is deliberate: Aurelia's
ambient helper can be weakly typed in generated or externally opened projects, but the import-aware key expression still
names the injected class and should keep service/state flow visible.

Interaction rows distinguish the consumer file role and whether the operation is internal to the target class. This is
important for authoring verification: internal state/service self-access may be useful topology, but it must not prove a
component-to-service or service-to-state layering expectation by accident.

Service interaction binding rows join template binding data-flow back to the component member that owns the service or
state interaction. Binding data-flow carries both the display source and the root source member, so ordinary member
chains and single-root interpolations can still converge on the getter/setter that performs the service handoff. This
keeps form setter/getter handoff visible as one source-backed app fact:
`template binding -> component root member -> service/state/model operation`.
Direct template bindings to an injected support member are also first-class topology. If a component exposes
`readonly state = resolve(AppState)` and the template binds `state.checkout.email`, the topology API should report the
binding-to-state read/write handoff directly instead of requiring a view-model getter whose only purpose is to shorten
the template expression. Getter/setter rows still matter when the member performs real adaptation, validation,
projection, or service calls. The direct lane must still spend modeled `BindingScope.locate(...)` results: the root
name only proves a DI support handoff when the resolved scope slot points back to the injected component member. Do not
fall back to string-root matching for this join, because template locals can legally shadow names such as `state`.
Listener bindings participate in this direct lane too. A template submit handler such as
`submit.trigger="state.submitRequest(requestId)"` should close through the runtime listener binding, an
`event-handler-invocation` value channel, and a topology `call` interaction against the injected state layer. A component
method remains appropriate when it performs real validation, route, presentation, or argument adaptation, not merely to
make the state call visible. Listener expressions may also evaluate to a function reference that Aurelia invokes with
the DOM event; topology rows should keep the full authored `bindingSourceName` while reporting the invoked state member
without call arguments as `interactionMemberName`.

Authoring topology and reopened app topology both expose stylesheet ownership through the same style asset vocabulary:
component/global ownership, asset kind, source kind, optional source file, and optional import specifier.
`ApplicationTopologyBuilder` can assemble component-local styles and app-level global styles before source exists.
`readApplicationStyleAssetSites(...)` then recognizes local CSS imports plus inline Aurelia `cssModules(...)` and
`shadowCSS(...)` registry arguments from app source, keeps plain component/global stylesheet imports separate from those
framework style registries, and feeds both `AppTopology.styles` and component-local `styles` rows. Dynamic
`class`/`style` binding facts remain a separate template binding lane.

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
- Optional component CSS and support files for services, state, and models are explicit files, not inline analyzer
  conveniences. A roleful support file and a DI-owned class are separate facts: topology may record both, but should
  not promote a folder name into a service/state class without a class declaration.
- Service topology should show both ownership and usage. A service-backed app is not proved only because a class exists:
  topology should expose `resolve(...)` consumers and source-backed calls across the actual app boundary, such as
  components reading/mutating DI state and state calling a service/repository for loading or submission side effects.
  Direct component-to-service facades and service-to-state calls are still valid app shapes when the source uses them,
  but they should be verified as the observed architecture rather than assumed as the only service-backed pattern. Where
  a template binding sources a component member that performs one of those operations, topology should also expose the
  binding-to-interaction join.
- Component-local resource visibility is part of topology. If a recipe expects recursive child-component compilation,
  the parent component should list the child resource dependency instead of relying on fixture source to carry hidden
  `dependencies: [...]` knowledge.
- Route topology should name routeable components and paths without pretending that router lifecycle activation has
  already run.

Recognition and verification should catch up to that topology rather than forcing authoring examples into whichever
shape happens to be easiest for today's analyzer.
