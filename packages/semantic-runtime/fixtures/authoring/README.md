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
Use `pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api` for the checkpoint-friendly compact fixture flywheel
view before opening summary/raw pressure detail.
Supplying `SEMANTIC_RUNTIME_PRESSURE_ROOTS=packages/semantic-runtime/fixtures/authoring` expands to the same durable
fixture children as the default broad sweep (`generated-*` plus `storefront`), so fixture-lane rows stay comparable
between targeted and full pressure runs. Combining a collection root with an explicit child root is de-duplicated.
When the broad sweep reports `project-tooling` failures, read the
`authoring.applicable-project-tooling-fixture-lane-outcomes` line before changing recipes: generated fixtures should
satisfy package/typecheck rows, while stress fixtures may intentionally omit local project tooling.
Compact `authoring.applicable-*` rows describe the recipe lane that is actually in play for the fixture. Compact
`authoring.all-candidate-*` rows are contrastive: they include recipes that are not applicable to the current fixture
and should not be read as active pressure by themselves.
When the next question is which fixture owns a semantic gap, read the fixture-owner cross-tabs such as
`bindings.data-flow-assignment-reason-fixtures`, `templates.missing-input-fixtures`, and
`open-seams.reason-fixtures`; they use public fixture folder keys and collapse external/custom roots. For exact
framework diagnostic work, prefer the error-code fixture rows such as `templates.diagnostic-error-code-fixtures`,
`app.diagnostic-error-code-fixtures`, `bindings.data-flow-error-code-fixtures`, and
`router.error-code-fixtures`.

Add fixtures only when the semantic runtime can analyze the idiomatic shape without falling back to inline `static $au`
templates for convenience.

## Fixtures

- `generated-minimal-app` is the generated baseline for `buildMinimalAppPlan(...)`: entrypoint, root custom element,
  external root template, recipe-owned package manifest, TypeScript config, and asset declaration. It exists so the
  durable fixture set covers every concrete recipe source plan; the older `external-template` fixture remains useful as
  the original hand-authored minimal app shape.
- `generated-state-backed-form` is the first generated-intent fixture shape for the authoring API. It mirrors the
  `buildStateBackedFormPlan(...)` recipe: a root component composes a DI-owned state class and a form component that
  receives only a scalar ID, then exposes state through getters/setters, native value bindings forwarded through a
  capture-based `field-shell`, checked/radio bindings, select bindings, a component-owned stylesheet, and one
  state-driven class-token binding. Its expected effects include captured static target operations and captured dynamic
  value data-flow for the `field-shell`. Keep it small and boring; it is meant to prove the recipe/effect loop, not to
  absorb every analyzer edge case. The state-backed form
  smoke now also writes the recipe's own `AuthoringSourceEditPlan` into a temporary app and reopens that generated
  source, so this fixture is a durable example rather than the only materialization proof.
- `generated-localized-state-backed-form` keeps the same recommendable DI-owned form shape and adds
  `@aurelia/i18n` plugin registration through static `I18nConfiguration` resources. It mirrors
  `buildLocalizedStateBackedFormPlan(...)`: root/form templates use `t` and valid `t-params.bind` attributes, while
  expected effects verify plugin admission, `i18n-translation-key` rows, rendered `i18n-translation-binding` groups,
  normalized translation target properties/kinds for `[title]form.submit;form.submit`, standard form
  value-channel/data-flow facts, and zero open seams. It is the generated static-catalog plus valid rendered binding
  lifecycle slice; dynamic backend loaders and runtime locale switching belong in later pressure fixtures or substrate
  work.
- `generated-validated-state-backed-form` keeps the same DI state/component shape as the state-backed form and adds
  `ValidationHtmlConfiguration`, validation service resolution, source-authored rules, default `& validate:'blur'`
  bindings, and
  `validation-errors.from-view` error presentation. It mirrors `buildValidatedStateBackedFormPlan(...)`: validation is
  a distinct recipe signature, not something every generated form silently absorbs, and the fixture verifies both
  validate binding-behavior applications with static argument rows and the validation-errors target/value/data-flow
  handoff.
- `generated-service-backed-form` extends the generated form lane with DI-owned state that uses an injected service for
  loading/submission side effects. Components still resolve state and expose it through getters/setters; the service
  boundary belongs to the state class instead of becoming the template-facing view-model API. It mirrors
  `buildServiceBackedFormPlan(...)` and keeps the component dependency explicit on the root custom element so recursive
  template compilation is proved through ordinary Aurelia resource visibility. It carries the same component-owned root
  stylesheet, capture-based `field-shell`, class-token style binding, checked/radio, and select binding expectations as
  the simpler generated form.
  Its smoke writes the recipe's own source plan into a temporary app before reopen verification.
- `generated-routed-state-backed-form` extends that generated-intent lane through router configuration, a static route
  decorator with nested child `routes`, `au-viewport`, and a route-owned form component. It mirrors `buildRoutedStateBackedFormPlan(...)`
  while keeping router support honest: the recipe uses `form/:requestId`, a static navigation target, an explicit
  `viewport: 'main'` route target, a sibling `summary` route targeting `viewport: 'sidebar'`,
  `<au-viewport name="main">` plus `<au-viewport name="sidebar">`, and
  `IRouteContext.getRouteParameters({ includeQueryParams: true })`, then verifies route config, route-parameter names,
  decoded route-parameter values, query parameters, repeated query-key arrays, fragment propagation, child-first
  route-node aggregation, sibling named viewport layout, route tree, recognizer, and component-agent effects. Static
  append/by-route route-parameter strategy rows are API evidence rather than generated authoring style. Broader router
  authoring still needs deeper viewport activation, guard, dynamic query merging, and route lifecycle semantics. The root stylesheet keeps
  style-resource verification, capture-based `field-shell`, class-token style binding, checked/radio, and select binding
  inside the generated authoring loop. Its smoke now writes the routed
  source plan into a temporary app, so the committed fixture remains a durable example rather than the only proof of the
  materialized source shape.
- `generated-state-store-todo` is the first generated `@aurelia/state` fixture. It mirrors
  `buildStateStoreTodoPlan(...)`: the entrypoint registers `StateDefaultConfiguration.init(...)` plus a named
  `.withStore(...)`, the root template uses `.state` / `.dispatch` command syntax and default plus named `& state`
  binding behaviors, and the source plan keeps project tooling and component stylesheet rows in the same durable
  fixture lane as the other generated recipes. Verification proves default/named `state-store` products,
  plugin-registration taste, `aurelia-state-store` ownership taste, state binding-behavior applications, typed
  `& state` and `.state` data flow through the configured initial-state types, `.dispatch` action payload value
  channels, input `$event.target.value` payload typing through the authored native input, repeat-local member access,
  and zero open seams.
- `generated-catalog-storefront` is the first generated app-building fixture beyond the form lane. It mirrors
  `buildCatalogStorefrontPlan(...)`: a root shell composes a DI-owned `CatalogState`, the state owns typed child state
  instances and a catalog service boundary for loading/cart effects, product list/card components communicate by scalar
  product IDs, and templates read getter projections rather than nullable domain objects. Its expected effects verify
  project tooling, app/root/list/card component roles, `state-composition` rows, component-to-state and state-to-service
  interaction rows, binding-to-state interaction joins, scalar ID binding data flow, conditional/repeat runtime
  controller rows, promise pending/then/catch controller linkage, switch case/default-case controller linkage,
  class-token interpolation rows, style-rule interpolation rows, per-class toggle rows, per-property style rows, and
  zero open seams.
- `generated-composed-dashboard` pressures dynamic composition without making it a stress-only analyzer case. It mirrors
  `buildComposedDashboardPlan(...)`: a root dashboard resolves DI-owned widget state, repeats widget cards, and hands a
  TypeChecker-visible union of widget component classes to `<au-compose component.bind="widget.component"
  model.bind="widget" flush-mode="async">`. It also includes a scoped template-only `<au-compose>` summary with static
  `scope-behavior`, `tag`, `flush-mode`, and `composition`/`composing` from-view bindings, promise-valued component
  and template bindings, plus a static `component="inventory-widget"` preview that exercises aggregate composed child-controller handoff for a closed
  composition branch. Its expected effects verify runtime composition rows with two resolved widget candidates and two
  compiled templates, complete candidate resource-analysis coverage, the static child-controller handoff, the
  template-only context inputs, direct-vs-promise input fulfillment rows, repeat template-controller/synthetic-view rows, plus the observed
  `dynamic-component-composition` taste.
- `external-template` is the first narrow authoring slice: a root custom element uses a default `.html` template import,
  and the runtime can reopen the app with the external file as the compiled template source. Keep it as the hand-authored
  companion to `generated-minimal-app`: `api.AppTopology` recovers its entrypoint, root component, external template
  asset, and roleful app files.
- `storefront` is the first app-building pressure fixture: a small storefront shell with a product catalog service,
  DI-resolved composed state, model, nested custom elements, ID-based component boundaries, component dependencies,
  `repeat.for`, `if.bind`/`with.bind` type handoff, promise pending/then/catch flow, checkout form controls, and
  external templates. It carries a local package manifest, TypeScript config, and asset declarations so the hand-authored
  recommendable fixture lane has the same package/typecheck baseline as generated recipe fixtures. It also pressures renderer-created runtime child containers through nested custom elements and
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
