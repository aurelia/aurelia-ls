# Authoring Fixtures

This folder is reserved for app fixtures that represent code we would be comfortable recommending to Aurelia users.
Authoring semantics are documented in [../../src/authoring/README.md](../../src/authoring/README.md), app topology in
[../../src/application/README.md](../../src/application/README.md), and the broader capability map in
[../../src/authoring/CAPABILITY_CHECKLIST.md](../../src/authoring/CAPABILITY_CHECKLIST.md).

Do not use this folder for analyzer stress fixtures. Authoring fixtures should favor framework-normal app structure,
including external templates and real package imports, even when that makes the semantic runtime work harder. Mixed
hand-authored stress cases belong in [../pressure](../pressure).

Generated recipe fixtures should include the recipe-owned project tooling files (`package.json`, `tsconfig.json`, and
local asset declarations) as well as app source. The source-plan smokes still write temporary copies, but these durable
fixtures are the app-pressure canary for project-tooling expected effects and the observed
`build-tool-profile:typecheck-only-tooling` taste. Refresh them with
`pnpm --filter @aurelia-ls/semantic-runtime fixtures:authoring` after changing recipe source plans. The refresh command
replaces each `generated-*` folder before writing the current source plan, so removed recipe files cannot linger as
false app-pressure evidence.

Add fixtures only when the semantic runtime can analyze the idiomatic shape without falling back to inline `static $au`
templates for convenience.

## Fixtures

- `generated-minimal-app` is the generated baseline for `buildMinimalAppPlan(...)`: entrypoint, root custom element,
  external root template, recipe-owned package manifest, TypeScript config, and asset declaration. It exists so the
  durable fixture set covers every concrete recipe source plan; the older `external-template` fixture remains useful as
  the original hand-authored minimal app shape.
- `generated-state-backed-form` is the first generated-intent fixture shape for the authoring API. It mirrors the
  `buildStateBackedFormPlan(...)` recipe: a root component composes a DI-owned state class and a form component that
  receives only a scalar ID, then exposes state through getters/setters, native form bindings, a component-owned
  stylesheet, and one state-driven class-token binding. Keep it small and boring; it is meant to prove the recipe/effect loop, not to absorb every analyzer edge case. The state-backed form
  smoke now also writes the recipe's own `AuthoringSourceEditPlan` into a temporary app and reopens that generated
  source, so this fixture is a durable example rather than the only materialization proof.
- `generated-validated-state-backed-form` keeps the same DI state/component shape as the state-backed form and adds
  `ValidationHtmlConfiguration`, validation service resolution, source-authored rules, and `& validate` bindings. It
  mirrors `buildValidatedStateBackedFormPlan(...)`: validation is a distinct recipe signature, not something every
  generated form silently absorbs.
- `generated-service-backed-form` extends the generated form lane with an injected service class between the form
  component and DI-owned state. It mirrors `buildServiceBackedFormPlan(...)` and keeps the component dependency explicit
  on the root custom element so recursive template compilation is proved through ordinary Aurelia resource visibility.
  It carries the same component-owned root stylesheet and class-token style binding expectations as the simpler
  generated form.
  Its smoke writes the recipe's own source plan into a temporary app before reopen verification.
- `generated-routed-state-backed-form` extends that generated-intent lane through router configuration, a static route
  decorator with nested child `routes`, `au-viewport`, and a route-owned form component. It mirrors `buildRoutedStateBackedFormPlan(...)` while
  keeping router support honest: the recipe can verify current semantic effects, but router authoring remains partial
  until deeper viewport activation, guard, and route lifecycle semantics are modeled. The root stylesheet keeps
  style-resource verification and class-token style binding inside the generated authoring loop. Its smoke now writes the routed
  source plan into a temporary app, so the committed fixture remains a durable example rather than the only proof of the
  materialized source shape.
- `external-template` is the first narrow authoring slice: a root custom element uses a default `.html` template import,
  and the runtime can reopen the app with the external file as the compiled template source. Keep it as the hand-authored
  companion to `generated-minimal-app`: `api.AppTopology` recovers its entrypoint, root component, external template
  asset, and roleful app files.
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
