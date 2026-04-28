# Configuration

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

Configuration is the app-admission layer between boot/evaluation and registration.

It answers which evaluated modules, exports, calls, and plugin surfaces participate in constructing an Aurelia app
world. It should not construct a DI world, execute container registrations, or recognize resource definitions. Those
belong to `registration`, `di`, and `resources`.

## Responsibilities

- Read evaluated module records from `evaluation`.
- Recognize app creation and admission shapes such as `new Aurelia(...)`, `Aurelia.app(...)`, `enhance(...)`,
  `hydrate(...)`, and `register(...)` call chains.
- Recognize configuration exports and plugin entrypoints that expose `IRegistry`-like `register(container, ...)`
  behavior.
- Preserve configuration ordering, root/app boundaries, lifecycle task slots, and source provenance as kernel records.
- Emit open seams for dynamic imports, dynamic register arguments, unknown plugin shapes, and configuration calls whose
  target cannot be closed.

## Non-Responsibilities

- Evaluating arbitrary user callbacks.
- Turning registration arguments into container state.
- Resolving DI keys or invoking default registration policy.
- Deciding whether a resource is visible to a template.

## Runtime Grounding

The runtime makes `Aurelia.register(...)` a thin delegate into `container.register(...)`; `Aurelia.app(...)`,
`enhance(...)`, and `hydrate(...)` create root app boundaries. App tasks are ordinary `IRegistry` values registered
under `IAppTask`, then consumed by `AppRoot` in lifecycle slots.

The tooling model should keep that split:

- Configuration records describe where app/world admission happens.
- Registration records describe what is offered to registration admission.
- DI world construction later spends registration records into container/resource reachability.

## Watchpoints

- Do not rebuild the old runtime-shaped `AppRoot` or `Aurelia` classes here. Model source facts and app admission
  products, not a miniature runtime instance.
- Do not hide app-task callback effects inside configuration. Callback bodies may produce registration observations,
  but their container consequences belong to registration and DI world construction.
- Configuration ordering is semantic, but it is not a linear compiler stage machine. Use derivation/provenance for
  why an ordering was observed.
