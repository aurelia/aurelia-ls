# State

This folder models the `@aurelia/state` plugin as its own semantic product surface. It should not be folded into
ordinary DI-injectable app state classes: plugin-backed stores, action handlers, binding syntax, and store-registry
errors have framework semantics that need their own products and diagnostics.

`state-store-materialization.ts` reads `StateDefaultConfiguration.init(...)` and `.withStore(...)` builder mutations
from configuration recognition. It emits `StateStoreConfiguration` products for builder calls that would survive to the
framework's creating `AppTask`, and `StateIssue` products for source-visible framework rejection paths. Store
configuration also projects the TypeChecker type of the initial state argument so later template analysis can treat
`store.getState()` as a typed binding context.

`state-binding-scope.ts` owns the state-scope handoff into template expression typing. It mirrors the framework's
`createStateBindingScope(state, scope)`: the new scope is a boundary, its parent is the original template scope, and its
binding context is the configured store's initial-state type. `& state` binding behaviors use the scope as a transient
expression-evaluation handoff; `.state` / `.dispatch` commands publish the prepared scope as their instruction
expression scope because framework `StateBinding.bind(...)` and `StateDispatchBinding.bind(...)` create that scope
during controller bind.

Raw framework errors are linked through `StateRawErrorAuthority` because `@aurelia/state` currently throws plain
`Error` instances instead of `ErrorNames`/AUR codes. Only add a raw authority constant when semantic-runtime has a
modeled product that cites it; otherwise leave the row visible in Atlas' `framework.errors` raw gap projection.

Current closed raw authority rows:

- `StateDefaultConfiguration.withStore(...)` after registration -> builder mutation happened too late.
- `StateDefaultConfiguration.withStore('default', ...)` -> reserved default store name.
- `StoreRegistry.registerStore(...)` -> duplicate store name during AppTask store registration.
- `fromState(...)` invalid decorator usage -> decorator target is not a field or setter.
- `IStoreRegistry.getStore(...)` missing store lookup -> named store lookup from `@fromState(...)`, state/dispatch
  binding commands, or static `& state:'name'` behavior arguments.

- `.state` and `.dispatch` binding commands are first-class value-site/data-flow rows. `StateBinding` reads are evaluated
  against the configured store-state scope and publish ordinary target accessor/value-channel flow; `StateDispatchBinding`
  publishes event-listener target operations, state-store dispatch source operations, and `state-dispatch-action` value
  channels for the payload expression.
- Dispatch payload scopes reuse the template listener event model. `$event.currentTarget` is refined from the authored
  host element, and `$event.target` is refined for native value-bearing form controls (`input`, `select`, `textarea`) so
  payloads such as `{ value: $event.target.value }` close through the same DOM tag-name-map substrate as observer
  lookup.

Open state frontiers:

- Dynamic store-name expressions such as `& state: storeName` remain runtime-dependent until semantic-runtime has a
  bind-time value strategy for selecting a configured store.
- Broader dispatch event policy remains open for non-form `$event.target` expressions where DOM retargeting and nested
  authored content make the target less exact than `currentTarget`.
- DevTools errors belong to runtime host/extension and dispatch lifecycle state, not store configuration.
