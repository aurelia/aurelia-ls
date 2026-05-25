# State

This folder models the `@aurelia/state` plugin as its own semantic product surface. It should not be folded into
ordinary DI-injectable app state classes: plugin-backed stores, action handlers, binding syntax, and store-registry
errors have framework semantics that need their own products and diagnostics.

`state-store-materialization.ts` reads `StateDefaultConfiguration.init(...)` and `.withStore(...)` builder mutations
from configuration recognition. It emits `StateStoreConfiguration` products for builder calls that would survive to the
framework's creating `AppTask`, and `StateIssue` products for source-visible framework rejection paths. Store
configuration also projects the TypeChecker type of the initial state argument so later template analysis can treat
`store.getState()` as a typed binding context, and retains the initial-state source address so static source-value
consumers can reduce the configured initial value without pretending to execute store actions.

`state-binding-scope.ts` owns the state-scope handoff into template expression typing. It mirrors the framework's
`createStateBindingScope(state, scope)`: the new scope is a boundary, its parent is the original template scope, and its
binding context is the configured store's initial-state type. `& state` binding behaviors use the scope as a transient
expression-evaluation handoff; `.state` / `.dispatch` commands publish the prepared scope as their instruction
expression scope because framework `StateBinding.bind(...)` and `StateDispatchBinding.bind(...)` create that scope
during controller bind.
`observation/runtime-binding-expression-scope.ts` spends the same handoff for source data-flow and observed-dependency
projection. This matters because Aurelia `astBind(...)` lets the state binding behavior call `binding.useScope(...)`
before later source evaluation, while `astEvaluate(...)` simply unwraps binding behaviors. Binding-behavior arguments
are evaluated during bind with no active connectable, so they are not ordinary observed source dependencies. Interpolation
holes participate through runtime-html `InterpolationPartBinding`: each hole binds its own expression, so `& state`
inside text interpolation can install the same store-backed scope as a bind-command expression.
When binding-source value evaluation reads a slot from a modeled state binding scope, it may evaluate the configured
initial-state expression through the shared static evaluator frame before falling back to type-only slot evaluation.
This lets consumers such as dynamic composition or route-resource values reuse the same `& state` handoff while keeping
dynamic store-name selection and later action-driven state changes explicit frontiers.

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
  payloads such as `{ type: "setDraft", value: $event.target.value }` close through the same DOM tag-name-map substrate
  as observer lookup while preserving the action type literal when the payload object is statically known.

Open state frontiers:

- Dynamic store-name expressions such as `& state: storeName` remain runtime-dependent until semantic-runtime has a
  bind-time value strategy for selecting a configured store.
- Broader dispatch event policy remains open for non-form `$event.target` expressions where DOM retargeting and nested
  authored content make the target less exact than `currentTarget`.
- DevTools errors belong to runtime host/extension and dispatch lifecycle state, not store configuration.
