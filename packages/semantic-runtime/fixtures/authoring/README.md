# Authoring Fixtures

This folder is reserved for app fixtures that represent code we would be comfortable recommending to Aurelia users.
Authoring semantics are documented in [../../src/authoring/README.md](../../src/authoring/README.md), app topology in
[../../src/application/README.md](../../src/application/README.md), and the broader capability map in
[../../src/authoring/CAPABILITY_CHECKLIST.md](../../src/authoring/CAPABILITY_CHECKLIST.md).

Do not use this folder for analyzer stress fixtures. Authoring fixtures should favor framework-normal app structure,
including external templates and real package imports, even when that makes the semantic runtime work harder.

Add fixtures only when the semantic runtime can analyze the idiomatic shape without falling back to inline `static $au`
templates for convenience.

## Fixtures

- `external-template` is the first narrow authoring slice: a root custom element uses a default `.html` template import,
  and the runtime can reopen the app with the external file as the compiled template source. `api.AppTopology` also
  recovers its entrypoint, root component, external template asset, and roleful app files.
- `storefront` is the first app-building pressure fixture: a small storefront shell with a product catalog service,
  DI-resolved composed state, model, nested custom elements, ID-based component boundaries, component dependencies,
  `repeat.for`, `if.bind`/`with.bind` type handoff, promise pending/then/catch flow, checkout form controls, and
  external templates. It also pressures renderer-created runtime child containers through nested custom elements and
  template controllers, binding bind-time target accessor/observer materialization for native form controls, and
  source/target binding data-flow rows for two-way form state. The checkout form also pressures observer value channels
  with a static
  single-select option domain, static multi-select array element domain, plain checkbox boolean branch, radio group
  values, checkbox array membership, class token/toggle channels, and style rule/property channels. The checkout form
  also includes standards-shaped presentation and attribute edges such as CSS custom properties, logical CSS
  properties, multi-token `.class`, `data-*`/`aria-*` attributes on both native and custom-element hosts, and SVG
  presentation attributes. Its `field-shell` component is a `capture: true` wrapper that forwards static, boolean, and
  parent-scope input bindings such as `value.bind="email"` through inner `...$attrs`, including one usage below
  `if.bind`, pressuring dynamic spread compilation and recursive scope handoff without turning the fixture into
  analyzer-only code. It should remain idiomatic app code, not a dense analyzer stress case.
