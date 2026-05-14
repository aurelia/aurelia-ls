# State

This folder models the `@aurelia/state` plugin as its own semantic product surface. It should not be folded into
ordinary DI-injectable app state classes: plugin-backed stores, action handlers, binding syntax, and store-registry
errors have framework semantics that need their own products and diagnostics.

`state-store-materialization.ts` reads `StateDefaultConfiguration.init(...)` and `.withStore(...)` builder mutations
from configuration recognition. It emits `StateStoreConfiguration` products for builder calls that would survive to the
framework's creating `AppTask`, and `StateIssue` products for source-visible framework rejection paths.

Raw framework errors are linked through `StateRawErrorAuthority` because `@aurelia/state` currently throws plain
`Error` instances instead of `ErrorNames`/AUR codes. Only add a raw authority constant when semantic-runtime has a
modeled product that cites it; otherwise leave the row visible in Atlas' `framework.errors` raw gap projection.

Current closed raw authority rows:

- `StateDefaultConfiguration.withStore('default', ...)` -> reserved default store name.
- `StoreRegistry.registerStore(...)` -> duplicate store name during AppTask store registration.

Open state frontiers:

- `.withStore(...)` after registration needs ordered builder/register receiver state before it can be claimed.
- `fromState(...)` invalid decorator usage needs source decorator-target recognition for the plugin API.
- `IStoreRegistry.getStore(...)` missing store lookup needs store-name consumer analysis.
- DevTools errors belong to runtime host/extension and dispatch lifecycle state, not store configuration.
