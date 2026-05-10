# Configuration

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Configuration is the app-admission layer between boot/evaluation and registration/DI.

It answers which evaluated modules, exports, calls, and plugin surfaces participate in constructing an Aurelia app
world. It should not construct a DI world, execute container registrations, or recognize resource definitions. Those
belong to `registration`, `di`, and `resources`.

## Responsibilities

- Read evaluated module records from `evaluation`.
- Recognize app creation and admission shapes such as `new Aurelia(...)`, `Aurelia.app(...)`, and `register(...)`
  call chains.
- Recognize configuration exports and plugin entrypoints that expose `IRegistry`-like `register(container, ...)`
  behavior.
- Preserve configuration ordering, option contributions, root/app boundaries, lifecycle task slots, and source
  provenance as kernel records.
- Emit open seams for dynamic imports, dynamic register arguments, unknown plugin shapes, and configuration calls whose
  target cannot be closed.

## Non-Responsibilities

- Evaluating arbitrary user callbacks.
- Turning registration arguments into container state.
- Resolving DI keys or invoking default registration policy.
- Deciding whether a resource is visible to a template.

## Runtime Grounding

The runtime `Aurelia` facade owns the root container and registers resolvers for `IAurelia`, `Aurelia`, and `IAppRoot`.
`Aurelia.register(...)` is a thin delegate into `container.register(...)`. `Aurelia.app(...)` creates an `AppRoot`,
and `AppRoot` connects the host, root component, container, platform, and root custom-element controller. App tasks
are ordinary `IRegistry` values registered under `IAppTask`, then consumed by `AppRoot` in lifecycle slots.

The tooling model should keep that split:

- `Aurelia` records describe the facade/container/root-provider handoff before start/stop lifecycle execution.
- `AppRoot` records describe the host/component/container/controller connection.
- Controller records describe runtime controller kind and phase so later template/compiler work can attach definition,
  container, scope, DOM, and hydration facts to the right boundary.
- Binding-scope records model runtime `Scope`, binding context, and override context separately from compiler resource
  scope. They are the future meeting point for controller activation, template locals, expression name lookup,
  autocomplete, rename, and go-to-definition.
- Binding and override contexts may carry a type-system context type beside explicit template-local slots. Scope
  materialization spends projected type members into slots so runtime `name in context` lookup has a concrete
  product-owned surface; the context type still answers `$this`, member-chain projection, and deeper TypeChecker
  follow-up without making `Scope` itself a TypeScript evaluator.
- `scope-materializer.ts` materializes runtime-shaped `Scope`, binding-context, and override-context products together,
  then attaches typed product details. Inquiry should read those details for expression name visibility instead of
  peeking into controller construction or compiler-world internals.
- Configuration sequence records describe source/evaluation order for app setup, plugin setup, registry bodies, and
  builder-style configuration objects.
- Configuration product publication should flow through one configuration-owned primitive for `ConfigurationIdentity`,
  `MaterializedProduct`, and `MaterializationRecord`. Do not hand-spell that envelope for sequences, steps, app roots,
  Aurelia facades, app-root configs, app tasks, or option contributions unless the product has genuinely different
  ownership semantics.
- `IRegistry.register(container, ...)` bodies are recognized as registry-owned configuration sequences. Their
  `container.register(...)` calls keep `RegistryMethod` admission provenance instead of being flattened into ordinary
  container-register calls, and static array spreads such as `...DefaultComponents` are expanded through the shared
  evaluator before registration admission materialization.
- Configuration option contributions currently describe object-literal customize options, user customization callbacks,
  and builder method mutations before convergence decides final precedence.
- Direct object-literal options passed to `.customize(...)` and direct assignments inside simple customization
  callbacks, such as `options.translationAttributeAliases = [...]`, may produce typed option contributions. Callback
  bodies only remain open when they contain control flow or side effects beyond those direct assignments.
- AppTask records describe deferred lifecycle tasks. Their callback bodies may be inspected later, but they are not
  spent into container state merely because the task was registered.
- Configuration records describe where app/world admission happens.
- Registration records describe what is offered to registration admission.
- DI world construction later spends registration records into container/resource reachability.
- `configuration-recognition-project-pass.ts` is the project-level recognition pass over shared static evaluation.
  It is the source/module composition layer for configuration facts, not a second evaluator.
- `app-world-composer.ts` is the current composition point for the configuration-to-DI/compiler handoff. It does not
  create a new semantic "app world" kernel product; it runs the already-owned configuration, DI, built-in syntax,
  built-in resource, and compiler-world materializers and returns an orchestration envelope for callers. Compiler worlds
  select one app-level syntax surface from the owning app-root sequence, including both attribute-pattern parser
  inputs and binding-command executables, then read ordinary named resource visibility from DI-produced container
  resource slots. They must not receive every framework catalog recognized in the project.
- `app-world-resource-visibility.ts` owns the compiler-world resource-scope projection from DI resource slots,
  configured framework resource catalogs, the app root component, and app-local component dependencies. Keep this
  projection separate from app-world orchestration so future router, plugin, or view-factory visibility rules can land
  as visibility semantics instead of private composer glue.
- `app-world-project-pass.ts` is the current whole-project orchestration pass: shared static evaluation, TypeChecker
  epoch construction, resource recognition/convergence, resource indexing, configuration recognition, DI spending,
  compiler-world construction, template compilation-front-door materialization, renderer emulation, and binding-scope
  projection. It exists so those materializers can run in the intended order without making any one layer own the
  others' facts. Its emission carries aggregate phase timings so pressure lanes can locate large-app friction without
  turning the API facade into a profiler or preserving app-specific identities.
- Treat this composition point as a watchpoint while template/controller semantics keep sharpening. The handoff needs
  to stay explicit enough that compiler work can decide which facts belong to the app root, container, controller,
  compilation context, parser context, TypeChecker projection, or inquiry answer without moving source scanning back
  into the template layer.

Configuration recognition admits method receivers it can identify from evaluated construction shapes:
`Aurelia.app(...)`, chained Aurelia calls, and local variables initialized from `new Aurelia(...)` are treated as app
admission; direct `container.register(...)`-shaped calls are treated as container registration. Other `.app(...)` and
`.register(...)` methods stay invisible until evaluation or DI context can prove what they are. False positives here
would pollute the app map and later DI world.

Known framework configuration registries such as `StandardConfiguration`, `I18nConfiguration`,
`RouterConfiguration.customize(...)`, and `StateDefaultConfiguration.init(...).withStore(...)` are classified as
registry admissions when they appear as register arguments. Decomposed runtime-html groups such as
`...DefaultComponents`, `...DefaultBindingSyntax`,
`...DefaultBindingLanguage`, `...DefaultResources`, and `...DefaultRenderers` are classified as framework group
admissions. The configuration layer records an explicit `FrameworkRegistrationKind`; it does not hide those semantics
in trace names. Body effects still belong to registration/DI spending and later resource/compiler-world materializers.
The current app-world pass reads framework registration capabilities from those admissions through the registration
manifest: `StandardConfiguration` is one bundle that carries runtime-html compiler services, syntax, resources, and
renderers, but it is not the only possible source of those effects. Custom bundles, plugin bundles, and AOT-decomposed
setup should enter the same capability lane by replaying framework-owned registry bodies or decomposed groups instead
of adding new hard-coded app-world gates.

The browser `aurelia` facade also admits `StandardConfiguration` implicitly. Framework source constructs the default
container for `new Aurelia()` and static quick-start calls such as `Aurelia.app(...)` through a `createContainer()`
helper that registers `StandardConfiguration`; semantic-runtime records that as an `AureliaFacadeDefault` registration
admission. This is intentionally tied to imports from the umbrella `aurelia` package. `@aurelia/runtime-html` imports
and `new Aurelia(customContainer)` do not get the implicit admission, because those paths either name the lower-level
class or supply the container explicitly.

Static evaluation treats facade setup chains as configuration-owned expression statements for both `new Aurelia()...`
and static browser-facade chains such as `Aurelia.register(...).app(...).start()`. That keeps evaluator seams focused
on ECMAScript substrate gaps while configuration recognition owns the Aurelia facts.

Closed i18n `translationAttributeAliases` contributions are already consumed by built-in syntax materialization when they
can be source-associated with the `I18nConfiguration.customize(...)` admission. That mirrors the runtime
`coreComponents(options)` path without executing the callback body generally.

Dialog configuration uses the same framework-registration capability lane. `createDialogConfiguration(...)` and dialog
configuration chains such as `.customize(...)`/`.withChild(...)` preserve `DialogConfiguration` as a framework kind
through static evaluation so DI world construction can admit dialog service resolvers and the settings-provider
AppTask without requiring registry-body source containment. Do not generalize this to arbitrary plugin `customize`
methods; unknown registries should still close through source-associated `register(container)` bodies or remain open.

App-root compiler worlds are complete only when the owning sequence admitted known runtime compiler services. The
current app-world composer recognizes that capability from `StandardConfiguration` and decomposed
`...DefaultComponents`. Direct custom service registrations should become explicit DI/resource products before they are
treated as complete compiler-world services.

Known framework registration spreads such as `...ShortHandBindingSyntax` are modeled separately from registry bodies.
They produce framework-registration admissions rather than pretending the spread itself is an `IRegistry`.

Evaluated object values that expose a `register` method are classified as IRegistry-shaped admissions. Imported or
declaration-only values can also be admitted through the TypeChecker when their static type exposes a callable
`register` member. That checker lane mirrors Aurelia's runtime `isRegistry` branch without executing arbitrary package
code: it classifies the argument as a registry but does not claim the body has been interpreted. Spending a specific
registry admission into a specific app container is a DI/app-world join. Registry bodies are joined by source
containment: when the registry value's source span owns a recognized `register(container)` method in an admitted module,
that body can be replayed into the receiving container. If the owning module is not admitted or the evaluator cannot
carry its source-file address, the registry body stays open. Avoid matching registries by local names.
An interpreted registry body may legitimately produce zero registration steps. Keep the "body was recognized for this
admission" bit separate from the list of emitted steps so no-effect registries do not look unresolved.

## Ordering Axes

Configuration has at least two ordering axes that should stay separate:

- Source/app setup order: call-chain and statement order for `new Aurelia()`, `.register(...)`, `.app(...)`,
  `.customize(...)`, builder methods such as `.withStore(...)`, and plugin `register`/`configure` entrypoints.
- Lifecycle-slot order: AppRoot dispatch points such as `creating`, `hydrating`, `hydrated`, `activating`, and
  `activated`.

`AppTask.*(...)` bridges those axes: it is admitted during source/app setup order, then selected later by lifecycle
slot. The configuration layer currently records the deferred task definition without executing the callback; lifecycle
dispatch should only become a product once AppRoot lifecycle emulation actually spends that boundary.

## Watchpoints

- Do not execute the full runtime lifecycle here. Model app admission products and the handoff to AppRoot/controller
  state, not DOM events, lifecycle task execution, activation, deactivation, enhance, or hydrate behavior.
- Do not hide app-task callback effects inside configuration. Callback bodies may produce registration observations,
  but their container consequences belong to registration and DI world construction.
- Keep runtime binding scope distinct from compiler resource scope. Binding scope answers "which object/local does this
  expression name target?"; resource scope answers "which Aurelia resources and compiler services are visible here?".
- Configuration ordering is semantic, but it is not a linear compiler stage machine. Use provenance and claims for
  why an ordering was observed.
- Do not use option contributions as generic payloads for unresolved configuration objects. If a value matters beyond
  primitive option state, keep it referential until a domain-specific product earns a shape.
- App-world composition is orchestration, not ownership of every downstream fact. If a later materializer needs to ask
  whether a resource, syntax executable, service, or controller state is visible to compilation, prefer adding a
  directional product/claim at the actual owner rather than hiding that relationship inside the composition envelope.
