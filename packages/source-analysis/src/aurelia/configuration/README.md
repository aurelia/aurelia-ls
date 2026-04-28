# Configuration

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

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
- Configuration sequence records describe source/evaluation order for app setup, plugin setup, registry bodies,
  builder-style configuration objects, and lifecycle-slot dispatch.
- Configuration option contributions describe defaults, user customization callbacks, forwarded options, and builder
  method mutations before convergence decides final precedence.
- AppTask records describe deferred lifecycle tasks. Their callback bodies may be inspected later, but they are not
  spent into container state merely because the task was registered.
- Configuration records describe where app/world admission happens.
- Registration records describe what is offered to registration admission.
- DI world construction later spends registration records into container/resource reachability.

The first producer slice is deliberately conservative about method receivers. `Aurelia.app(...)`, chained Aurelia
calls, and local variables initialized from `new Aurelia(...)` are treated as app admission; direct
`container.register(...)`-shaped calls are treated as container registration. Other `.app(...)` and `.register(...)`
methods should stay invisible until evaluation or DI context can prove what they are. False positives here would
pollute the app map and later DI world.

## Ordering Axes

Configuration has at least two ordering axes that should stay separate:

- Source/app setup order: call-chain and statement order for `new Aurelia()`, `.register(...)`, `.app(...)`,
  `.customize(...)`, builder methods such as `.withStore(...)`, and plugin `register`/`configure` entrypoints.
- Lifecycle-slot order: AppRoot dispatch points such as `creating`, `hydrating`, `hydrated`, `activating`, and
  `activated`.

`AppTask.*(...)` bridges those axes: it is admitted during source/app setup order, then selected later by lifecycle
slot. The configuration layer records both facts without executing the callback.

## Watchpoints

- Do not execute the full runtime lifecycle here. Model app admission products and the handoff to AppRoot/controller
  state, not DOM events, lifecycle task execution, activation, deactivation, enhance, or hydrate behavior.
- Do not hide app-task callback effects inside configuration. Callback bodies may produce registration observations,
  but their container consequences belong to registration and DI world construction.
- Configuration ordering is semantic, but it is not a linear compiler stage machine. Use derivation/provenance for
  why an ordering was observed.
- Do not use option contributions as generic payloads for unresolved configuration objects. If a value matters beyond
  primitive option state, keep it referential until a domain-specific product earns a shape.
