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
Generated fixtures use the public `aurelia` package for core app imports and add explicit plugin dependencies only
when a recipe uses a plugin. Convention-based fixtures may rely on the modeled Aurelia class/file/template naming
conventions instead of importing `customElement` when that shape is the recipe intent. Hand-authored recommendable
fixtures should follow the same public-import policy unless they are deliberately demonstrating low-level package usage.
Run `pnpm --filter @aurelia-ls/semantic-runtime check:authoring-fixtures` after materializing recipe fixtures when the
source-plan TypeScript surface changes. The check covers generated fixtures plus the hand-authored `storefront`
fixture and uses a repo-local TypeScript overlay that maps fixture `aurelia` and `@aurelia/*` dependencies to the
in-repo framework declaration output, so it is a fixture-code canary and not a substitute for installing each fixture
as a standalone package. Keep fixture tsconfigs aligned with the current framework declaration posture; current
decorator-authored fixtures use TypeScript's standard-decorator checking rather than legacy `experimentalDecorators`
mode.
Use `pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api` for the checkpoint-friendly compact fixture flywheel
view before opening summary/raw pressure detail.
Supplying `SEMANTIC_RUNTIME_PRESSURE_ROOTS=packages/semantic-runtime/fixtures/authoring` expands to the same durable
fixture children as the default broad sweep (`generated-*` plus `storefront`), so fixture-lane rows stay comparable
between targeted and full pressure runs. Combining a collection root with an explicit child root is de-duplicated.
When the broad sweep reports `project-tooling` failures, read the
`authoring.intent-project-tooling-fixture-lane-outcomes` line before changing recipes: generated fixtures should satisfy
package/typecheck rows, while stress fixtures may intentionally omit local project tooling.
Compact `authoring.intent-*` rows describe the recipe lane the generated fixture is meant to prove; hand-authored
authoring fixtures can deliberately have no intent recipe even when they are recommendable app pressure. Compact
`authoring.applicable-*` rows describe partial or satisfied recipe candidates and are useful for repair/selection
pressure, but they can include unrelated recipe families whose signatures partially match an app shell. Compact
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
- `generated-convention-minimal-app` is the convention-based app-shell companion to `generated-minimal-app`. It mirrors
  `buildConventionMinimalAppPlan(...)`: the entrypoint still uses the public `aurelia` facade, while `src/my-app.ts`
  and `src/my-app.html` are admitted through the current modeled Aurelia convention rules instead of a `customElement`
  decorator. Expected effects prove project tooling, app/root component shape, convention resource declaration,
  convention template ownership, external template compilation, runtime controller rows, and zero open seams. Keep it
  as a code-economy scaffold canary, not as a replacement for explicit decorator recipes that need bindables,
  dependencies, capture, shadow options, or other non-conventional metadata.
- `generated-routed-app-shell` is the generic routing fixture. It mirrors `buildRoutedAppShellPlan(...)`: the entrypoint
  registers `RouterConfiguration`, the root declares decorator route config for a home route plus a parameterized detail
  route, the template uses static `load` links and a named `au-viewport`, and the detail route reads route parameters
  and query values through `IRouteContext.getRouteParameters`. Expected effects prove router options, route config,
  route patterns/endpoints, recognized route params, query/fragment propagation, route-node aggregation,
  RouteContext/viewport/component-agent products, routeable component roles, and zero open seams. Keep this fixture as
  the generic routing companion for MCP app-building guidance; use richer routed form/table/catalog fixtures when the
  domain model itself owns routed state.
- `generated-state-backed-form` is the first generated-intent fixture shape for the authoring API. It mirrors the
  `buildStateBackedFormPlan(...)` recipe: a root component composes a DI-owned state class and a form component that
  receives only a scalar ID. The template performs the id-to-domain-object adaptation through
  `<let request.bind="state.readRequest(requestId)"></let>` and then binds controls directly to `request.*` members
  rather than generated view-model forwarding accessors. The fixture also uses native value bindings forwarded through
  a capture-based `field-shell`, checked/radio bindings, nullable and object
  select bindings, a component-owned stylesheet, and one
  state-driven class-token binding. Its expected effects include captured static target operations and captured dynamic
  value data-flow for the `field-shell`, `LetBinding` scope-slot data-flow from `state.readRequest(requestId)` into the
  template-local `request`, direct `request.*` observed dependencies, and exact
  checked/radio/single-select/object-select/multiple-select data-flow channels for the request fields, plus a
  `usesCustomMatcher` value-channel row for the assignee select. Keep it small and boring; it is
  meant to prove the recipe/effect loop, not to absorb every analyzer edge case. The state-backed form
  smoke now also writes the recipe's own `AuthoringSourceEditPlan` into a temporary app and reopens that generated
  source, so this fixture is a durable example rather than the only materialization proof. Source-parameterized draft
  form plans such as `request-entity=Contact` plus `request-fields=email, message` are intentionally leaner direct
  starters: they omit the scalar ID boundary, omit the field-shell files, carry `caller-applied` source-pattern
  authority, and keep only sample data as host-adapted starter material.
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
  bindings, `validation-errors.from-view` error presentation, and error-array driven class bindings on the field
  regions. It mirrors `buildValidatedStateBackedFormPlan(...)`: validation is a distinct recipe signature, not
  something every generated form silently absorbs, and the fixture verifies both validate binding-behavior applications
  with static argument rows and the validation-errors target/value/data-flow handoff. Validation rules target the
  `ServiceRequest` class through lambda property expressions, matching the same domain-model object edited by the
  rendered form bindings without requiring a component-level `request` getter.
- `generated-localized-validated-state-backed-form` combines the localized and validated plugin lanes over the same
  DI-owned form state. It mirrors `buildLocalizedValidatedStateBackedFormPlan(...)`: the entrypoint registers
  `I18nConfiguration` resources and `ValidationHtmlConfiguration`, the domain model carries source-authored validation
  rules, templates use translated labels plus valid `t-params.bind` attributes, controls bind directly to
  template-local `request.*` members with `& validate:'blur'`, and `validation-errors.from-view` renders errors for the
  same validation controller handoff. Expected effects prove i18n keys/bindings, validation usage, standard form value
  channels/data flow, plugin-registration taste, and zero open seams without making either plugin mandatory for simpler
  form recipes.
- `generated-multi-step-state-backed-form` is the wizard/progress form recipe. It mirrors
  `buildMultiStepStateBackedFormPlan(...)`: the root composes a DI-owned wizard state, the state owns a composed
  `OnboardingProfile` domain object, and the wizard template binds directly to `state.profile.*` fields while
  repeat/if template controllers render steps and review sections. Expected effects prove validation-html
  configuration, `& validate:'blur'` applications, validation-errors handoff, native value/checked/select channels,
  error-array driven field presentation classes, checked collection membership, nullable option domains, class-token
  and class-toggle channels, style interpolation, state-composition rows, component-to-state service interactions,
  direct state progress binding, profile getter `ComputedObserver` rows, and zero open seams. It is the recommendable
  large-form canary before adding route or
  service complexity.
- `generated-service-backed-form` extends the generated form lane with DI-owned state that uses an injected service for
  loading/submission side effects. Components still resolve state, but the form template binds through an
  `if.bind`-narrowed `<let>` local `request.*` path instead of `with.bind`, `$parent`, or one-hop forwarding accessors.
  The service boundary belongs to the state class instead of becoming the template-facing view-model API. It mirrors
  `buildServiceBackedFormPlan(...)` and keeps the component dependency explicit on the root custom element so recursive
  template compilation is proved through ordinary Aurelia resource visibility. It carries the same component-owned root
  stylesheet, capture-based `field-shell`, class-token style binding, checked/radio, and select binding expectations as
  the simpler generated form, including the object-valued assignee select with `matcher.bind`.
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
  style-resource verification, direct `request.*` form bindings through a template-local `<let>` lookup under
  `if.bind` narrowing, capture-based `field-shell`, class-token style binding, checked/radio, and select binding inside
  the generated authoring loop, including object-valued assignee select comparison through `matcher.bind`. Its smoke now
  writes the routed source plan into a temporary app, so the committed
  fixture remains a durable example rather than the only proof of the
  materialized source shape.
- `generated-routed-service-backed-form` combines the routed form lane with the service-backed state boundary. It
  mirrors `buildRoutedServiceBackedFormPlan(...)`: the routed component reads `IRouteContext` parameters, triggers
  background loading through DI-owned state during `binding()`, the state class owns the injected service/repository
  calls, and the form component/template keep scalar `requestId` input plus template-local `request.*` domain binding.
  Expected effects prove router topology, service-class rows, component-to-state and state-to-service interactions,
  service-backed template reads, `LetBinding` scope-slot flow, form value channels, and zero open seams.
- `generated-routed-validated-state-backed-form` is the narrower routed validation fixture. It mirrors
  `buildRoutedValidatedStateBackedFormPlan(...)`: router configuration and route-param selected state own the current
  request identity, while `ValidationHtmlConfiguration`, source-authored validation rules, default
  `& validate:'blur'` bindings, and `validation-errors.from-view` prove validation ownership over the same
  template-local request object. Keep it separate from the localized routed validation fixture so feature guidance can
  choose routed validation without adding i18n or service-loading source.
- `generated-routed-localized-validated-state-backed-form` combines that route-owned form lane with the i18n and
  validation plugin lanes. It mirrors `buildRoutedLocalizedValidatedStateBackedFormPlan(...)`: `RouterConfiguration`,
  `I18nConfiguration`, and `ValidationHtmlConfiguration` are registered together, the route parameter selects the
  request model, the form keeps direct template-local `request.*` field bindings, `t`/`t-params.bind` cover route/form
  labels and counts, and `& validate:'blur'` plus `validation-errors.from-view` cover the same edited model. Expected
  effects prove router topology, route-node parameter/query values, component-agent handoff, static i18n resources,
  rendered translation bindings, validation rows, standard form value channels including object-valued select matcher
  handoff, and zero open seams.
- `generated-state-store-list` is the first generated `@aurelia/state` fixture. It mirrors
  `buildStateStoreListPlan(...)`: the entrypoint registers `StateDefaultConfiguration.init(...)` plus a named
  `.withStore(...)`, the root template uses `.state` / `.dispatch` command syntax and default plus named `& state`
  binding behaviors, and the source plan keeps project tooling and component stylesheet rows in the same durable
  fixture lane as the other generated recipes. Verification proves default/named `state-store` products,
  plugin-registration taste, `aurelia-state-store` ownership taste, state binding-behavior applications, typed
  `& state` and `.state` data flow through the configured initial-state types, `.dispatch` action payload value
  channels, input `$event.target.value` payload typing through the authored native input, repeat-local member access,
  observed dependencies for store-scope reads, readable predicate source display such as `draft === ""`, and zero open
  seams. The fixture keeps simple text reads as interpolation holes with `& state`; runtime-html binds each
  interpolation part through `InterpolationPartBinding`, so the framework binding-behavior bind phase can install the
  store-backed scope for interpolation parts too.
- `generated-catalog-storefront` is the first generated app-building fixture beyond the form lane. It mirrors
  `buildCatalogStorefrontPlan(...)`: a root shell composes a DI-owned `CatalogState`, the state owns typed child state
  instances and a catalog service boundary for background loading and selection effects, item list/card components communicate by local
  typed `Item | null` object handoff, filter controls bind directly to nested catalog state, and state/domain
  collection projections use ordinary getters so Aurelia's observer-locator/computed-observer path can track accessor
  reads without decorator boilerplate. The card binds
  directly to `item.*` domain/presentation members rather than generated component forwarding getters. Its expected effects verify
  project tooling, app/root/list/card component roles, `state-composition` rows, component-to-state and state-to-service
  interaction rows, direct binding-to-state projection joins, item-object component binding data flow,
  item-domain binding data flow, computed observer source and observed-dependency rows,
  native value/checked/select filter channels, debounce binding behavior, conditional/repeat runtime controller rows,
  promise pending/then/catch controller linkage, switch case/default-case controller linkage, class-token interpolation
  rows, style-rule interpolation rows, per-class toggle rows, per-property style rows, and zero open seams.
- `generated-compact-catalog-storefront` is the caller-domain catalog canary for low-token MCP output. It is generated
  from `catalog-storefront` with `catalog-entity=Product Tier` and `catalog-collection=productTiers`, then kept as a
  distinct `catalog-storefront:compact` pressure intent. App-pressure rebuilds the same concrete source-parameterized
  plan and verifies its expected effects directly, so this proves the direct-start shape: DI-owned catalog state,
  service-backed loading, search text, one getter-observed collection projection, inline list-card markup, starter
  sample records, no reference CSS, no selection state, no checked/select filter channels, no promise-status
  presentation, and no separate card component.
- `generated-routed-catalog-storefront` combines the larger catalog app-building lane with common router authoring. It
  mirrors `buildRoutedCatalogStorefrontPlan(...)`: the root registers `RouterConfiguration`, declares `products` and
  `products/:productId` child routes through `@route`, exposes a named `au-viewport`, and includes a static product
  detail navigation target with query and fragment. It configures router `activeClass` for active link styling instead
  of adding view-model booleans solely for CSS. The product list/card communicate through local typed product objects,
  while route/detail selection remains scalar-ID based. Card/detail templates read `product.*` members directly. The detail route reads
  `IRouteContext.getRouteParameters` and keeps selected identity at the route boundary. The shared catalog list still
  owns search, stock, and badge filter state directly. Expected effects prove route
  options, route config, route pattern/endpoint parameters, recognized route
  parameter values, query/fragment propagation, route-node aggregation, viewport/component-agent rows, DI
  state/service interactions, class/style channels, template controllers, and zero open seams.
- `generated-compact-routed-catalog-storefront` is the caller-domain routed catalog/list-detail canary for low-token
  MCP output. It is generated from `routed-catalog-storefront` with `catalog-entity=Service Plan`,
  `catalog-collection=servicePlans`, `detail-route-parameter=planId`, `list-route-path=plans`, and
  `list-route-title=Plans`, then kept as a distinct `routed-catalog-storefront:compact` pressure intent.
  App-pressure verifies the concrete source-parameterized plan directly. It proves that compact routed catalog
  starters keep RouterConfiguration, list/detail child routes, a named `au-viewport`, route-context parameter reads,
  data-driven `load.bind` row links, DI-owned catalog state, service-backed loading, one getter-observed collection
  projection, and a native search value channel without importing reference CSS, selection state, a separate card
  component, promise-status presentation, or unrequested checked/select/card-style channels.
- `generated-searchable-data-table` is the first generated data-grid/list-management recipe. It mirrors
  `buildSearchableDataTablePlan(...)`: the table component resolves one DI-owned `UserTableState`, that state composes
  filter, sort, pagination, and selection state objects, and templates bind directly to `state.*` and `user.*` surfaces
  rather than view-model forwarding getters. Expected effects prove service-backed loading, state composition, native
  `value.bind` and select/option `model.bind`, checkbox `checked.bind` with row identity, `& debounce`, keyed repeats,
  class-token/class-toggle/style channels, direct observed dependencies for state reads, ordinary getter
  `ComputedObserver` rows for filter/sort/page projections, and zero open seams.
- `generated-compact-searchable-data-table` is the caller-domain table/list canary for low-token MCP output. It is
  generated from `searchable-data-table` with `table-entity=Customer Account` and
  `table-collection=customerAccounts`, then kept as a distinct `searchable-data-table:compact` pressure intent.
  App-pressure rebuilds the same concrete source-parameterized plan and verifies its expected effects directly. It
  proves the compact direct-start shape: DI-owned table state, service-backed loading, search text, keyed rows,
  direct `state.*`/domain reads, starter sample records, no reference CSS, no presentation slot, no sort/page/selection
  state, and no select/boolean facet channels unless caller field parameters request them.
- `generated-routed-searchable-data-table` combines the data-grid/list-management lane with common router authoring. It
  mirrors `buildRoutedSearchableDataTablePlan(...)`: the root registers `RouterConfiguration`, declares `users` and
  `users/:userId` child routes, exposes a named viewport, includes a static profile navigation target with query and
  fragment, and lets table rows navigate through data-driven `load.bind` route links. The detail route reads
  `IRouteContext.getRouteParameters`, adapts route params/query values through meaningful getters, and shares the same
  DI-owned `UserTableState` that owns loading, filtering, sorting, pagination, and selection. Expected effects prove
  route options/config/pattern/endpoint rows, recognized static and dynamic route params, query/fragment propagation,
  viewport/component-agent rows, native table value channels, direct `state.*` and `user.*` template reads, getter
  observation, and zero open seams.
- `generated-compact-routed-searchable-data-table` is the caller-domain routed list/detail canary for low-token MCP
  output. It is generated from `routed-searchable-data-table` with `table-entity=Support Ticket`,
  `table-collection=supportTickets`, `detail-route-parameter=ticketId`, `list-route-path=tickets`, and
  `list-route-title=Tickets`, then kept as a distinct `routed-searchable-data-table:compact` pressure intent.
  App-pressure verifies the concrete source-parameterized plan directly. It proves that compact routed starters keep
  RouterConfiguration, list/detail child routes, a named `au-viewport`, route-context parameter reads, data-driven
  `load.bind` row links, DI-owned list state, service-backed loading, and a native search value channel without
  importing reference CSS, sort/page/selection state, presentation slots, or unrequested checked/select channels.
- `generated-composed-dashboard` pressures dynamic composition without making it a stress-only analyzer case. It mirrors
  `buildComposedDashboardPlan(...)`: a root dashboard resolves DI-owned widget state, repeats widget cards, and hands a
  TypeChecker-visible union of widget component classes to `<au-compose component.bind="widget.component"
  model.bind="widget" flush-mode="async">`. It also includes a scoped template-only `<au-compose>` summary with static
  `scope-behavior`, `tag`, `flush-mode`, and `composition`/`composing` from-view bindings, promise-valued component
  and template bindings, plus a static `component="inventory-widget"` preview that exercises aggregate composed child-controller handoff for a closed
  composition branch. Its expected effects verify runtime composition rows with two resolved widget candidates and two
  compiled templates, complete candidate resource-analysis coverage, the static child-controller handoff, the
  template-only context inputs, direct-vs-promise input fulfillment rows, repeat template-controller/synthetic-view rows, plus the observed
  `dynamic-component-composition` taste. The widget components bind directly through the activated `model` object after
  an `if.bind` narrowing boundary, keeping `model.items` and `model.points` in the template instead of generating
  forwarding getters whose only job is shortening the path. The remaining `peakLabel` getter is intentionally derived
  presentation state and verifies source-backed getter observation.
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
