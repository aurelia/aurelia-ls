# Authoring Workbench

This workbench keeps live authoring context close to the code while the authoring spine is young. Promote durable rules
to [README.md](./README.md), [ONTOLOGY.md](./ONTOLOGY.md), [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md), or
source contracts once they prove stable.

## Current Shape

The authoring layer is intentionally only a spine:

- `application` names framework-normal app topology.
- `authoring/ontology.ts` names operation families, actions, targets, capabilities, profiles, and common ambiguity points.
- `authoring` operation/plan classes point into that ontology instead of owning parallel categories.
- `authoring/expected-effect.ts` is the verifier-facing contract for reopened app facts; keep it separate from
  `plan.ts`, which owns intent/precondition/step/plan composition.
- `api.AuthoringOrientation` exposes the first read-only authoring query over coverage, taste, capabilities, operations,
  surfaces, recipes, and open reasons. Concrete source edit application is still outside semantic-runtime.

Do not add an app generator here until the semantic edit loop is real enough to verify what it writes.

## Landed Vertical Pressure

- `fixtures/authoring/external-template` exercises a decorator-authored root custom element whose `template` metadata
  points at a default `.html` import. The app reopens through the API with the HTML file as the template source address
  and one compiled template row.
- `api.AppTopology` recovers the minimal reopened app shape for that fixture: roleful entrypoint/configuration,
  component source, external template file, root component identity, compiler world, and template compilation counts.
- `fixtures/authoring/storefront` exercises a small docs-shaped app: root shell, DI-resolved composed state, product
  catalog service, model, component dependencies, ID-based component boundaries, nested custom elements, `repeat.for`,
  `if.bind`/`with.bind` type handoff, promise pending/then/catch flow, event binding, basic checkout form controls, and
  external templates. It intentionally avoids passing functions or domain objects through bindables between app
  components.
- Resource convergence now closes static `dependencies: [...]` arrays enough for app-root compiler worlds to include
  dependency custom elements recursively. `api.AppTopology` reports bindables and dependency component names for
  authoring verification.
- `api.AppTopology` also reports conventional `state/`, `services/`, and `models/` files as roleful support files, and
  reports class-level `services` rows only when those support files actually declare classes. This keeps folder
  topology separate from DI-owned state/service claims; plugin state such as `@aurelia/state`/`IStore` is a separate
  state-ownership signal.
- Runtime rendering now materializes child containers for renderer-created custom elements, custom attributes, and
  template controllers. The storefront fixture's nested components, `if.bind`, and `repeat.for` no longer produce
  `di.open-child-container` seams; summary/template rows expose runtime child-container and hydration-context slot
  counts.
- Built-in template-controller semantics now provide auLink-backed child-scope profiles. The current closed slice
  models pass-through controllers, repeat iterator scopes, promise's empty object child scope plus awaited `then`
  result locals and `unknown` catch locals, `with.bind` object scopes, and local `if.bind`/`else` narrowing before child
  expression typechecking.
- TypeChecker project boot is now app-local for authoring fixtures: a fixture root without its own `tsconfig.json` uses
  bundler-shaped defaults, a `*.html` module shim, and local Aurelia checkout type paths. The storefront fixture now
  opens with zero checker diagnostics and injected `resolve(StorefrontState)` fields project as `StorefrontState`
  instead of `any`.
- StandardConfiguration no longer leaves a generic DI registry-body seam after the app-world path has consumed its
  known resource, syntax, compiler-service, and runtime-renderer effects. Other framework/plugin registries should stay
  open until their specific effects are productized.
- Top-level Aurelia facade setup chains are no longer reported as static-evaluation dynamic-call seams when the
  configuration recognizer already owns the app-admission facts. With the current fixture pressure, both authoring
  fixtures reopen with zero kernel open seams.
- Runtime bindings now emit target-access products through an explicit binding bind-time materializer backed by the
  framework-shaped `ObserverLocator` model. The storefront checkout form verifies `input.value`, `select.value`,
  `input.checked`, `textarea.value`, ordinary element-property access, target/property types, and
  template-controller/view-model target access through `api.BindingTargetAccesses`.
- Runtime property bindings now also emit source/target data-flow products after scope materialization. The storefront
  checkout form verifies two-way source writability and type assignability for setter-backed view-model getters,
  with observer value channels now distinguishing raw DOM property type from runtime observer value type. The
  `select.value` binding for `FulfillmentMethod` closes through `option.model.bind` values; checked bindings now close
  the plain boolean branch, `model.bind` radio values for `ContactPreference`, and `model.bind` checkbox values for
  `CheckoutAddon[]` membership. The mixed pressure fixture also exercises checkbox `Map<K, boolean>` keyed-state
  channels. The fixture also exercises static multi-select `value.bind` against a getter-only array source, which closes
  as collection mutation rather than source assignment.
- Class/style presentation bindings now run through the same target-access, value-channel, and data-flow products. The
  storefront checkout form verifies `class.bind`, class interpolation, `.class` toggles, `style.bind`, style
  interpolation, and `.style` property bindings with closed class-token/style-property channels.
- The storefront checkout form now widens that surface with standards-shaped attributes and presentation bindings:
  CSS custom properties, logical CSS properties, multi-token `.class`, `data-*`/`aria-*` attributes, SVG presentation
  attributes, and `data-*` property binding on both native and custom-element hosts. `NodeObserverLocator` now reports
  `DataAttributeAccessor` for the `data-*` target-access path instead of hiding it as a generic element-property
  accessor.
- Renderer-owned target operations are now visible beside binding-owned operations. The storefront `product-card`
  template uses root `<template>` surrogate host attributes, which lower into `SetClassAttributeRenderer`,
  `SetStyleAttributeRenderer`, and `SetAttributeRenderer` target-operation rows; its `else` surrogate bindable still
  exercises `SetPropertyRenderer`. This gives the authoring API a compact pressure signal for static host class/style
  and attribute transfer.
- Text interpolation now has the same direct-operation/data-flow spine: `ContentBinding.updateTarget(...)` publishes
  `text-content-set` operations, `text-content` value channels, and source-to-text data flows. Storefront currently
  closes these rows for selection count, checkout progress text, and product count with zero open flow pressure.
- Listener bindings now expose their target-side subscription operation as `event-listener-add` rows. Storefront's
  checkout form `submit.trigger` closes as a listener-owned target operation while event-to-expression invocation flow
  remains a separate future product concern.
- Ref bindings now expose their source-side assignment operation as `ref-assign-target` rows. Storefront's checkout form
  uses `element.ref` against a typed `HTMLFormElement | null` field; semantic-runtime resolves the authored `<form>`
  through DOM tag maps, publishes a `ref-target` value channel, and closes the target-to-source assignability check.
  Product list also uses direct `component.ref` against `ProductCard | null`, closing controller view-model ref
  resolution for non-recursive custom-element hydration, and `availability-badge.ref` against `AvailabilityBadge | null`,
  closing custom-attribute view-model ref resolution.
- Direct spread value syntax now stays on the framework-shaped spread lane. Product list uses
  `...$bindables="featuredCardBindings"` on a direct `product-card`; semantic-runtime lowers it to
  `SpreadValueBindingInstruction`, fans out through the known `ProductCard` bindable keys during bind materialization,
  and publishes closed `productId` target-access, value-channel, and data-flow rows from
  `featuredCardBindings.productId` instead of pretending the spread is a static `...$bindables` property.
- Captured attributes now have a first closed wrapper-component slice. Checkout form uses a `capture: true`
  `field-shell` custom element that forwards standards-shaped input attributes through inner `...$attrs`; dynamic
  `TemplateCompiler.compileSpread(...)` emulation turns the captured static `data-field-kind` into a renderer target
  operation and captured input bindings into target-access, value-channel, and data-flow rows owned by a
  framework-shaped `SpreadBinding`. The recursive child custom-element render lane now renders the `field-shell`
  compiled template in the usage controller context, and recursive scope construction walks that same child template.
  `value.bind="email"` is deliberately captured rather than modeled as a `FieldShell` bindable; its forwarded input
  value flow resolves `email` against the checkout-form parent usage scope. A second `field-shell` under `if.bind`
  forwards `postalCode`, pressuring captured-attribute scope handoff through a built-in template-controller child view.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:storefront` rebuilds semantic-runtime and reopens the storefront
  fixture with semantic assertions for zero open seams, spread-value fan-out, ref source operations, and renderer-owned
  surrogate target operations plus closed field-shell capture forwarding. Keep it as a pressure smoke, not a brittle
  golden snapshot. `check:authoring-fixtures` also includes `storefront`, so stale hand-authored fixture compiler
  options cannot drift from the public app-diagnostic TypeScript surface.
- `api.AuthoringOrientation` is now the first authoring-facing read surface. It aggregates project/source coverage,
  taste-axis evidence, capability support, operation support, available surfaces, recipe seeds, and open reasons from app topology,
  resources, runtime controllers, binding value channels, binding data flows, template diagnostics, and open seams.
  Taste axes are explicitly layered as primitive policy, observed shape, or derived reading so future policy does not
  collapse back into semantic substrate.
- Authoring orientation now exposes taste-axis value counts by layer and only infers axis `policyState` from
  primitive-policy values. Recipe expected-effect rows also carry the target taste value layer and ontology summary, so
  fixture pressure can distinguish policy targets from observed-shape signatures without reopening the ontology file.
- Expected-effect observation now filters binding target-access, direct target-operation, value-channel, binding-behavior,
  and data-flow rows when row-level facts are present, while count-only snapshots only satisfy unfiltered effects.
  Generated form recipe verification uses this to prove native `targetProperty=value` target access, value channels, and
  data flows instead of accepting any binding row as enough form evidence. The storefront smoke also uses
  `target-operation` effects for captured static `...$attrs` renderer writes, and generated form recipes now assert
  captured `valueSiteKind=captured-value` data-flow for field-shell value bindings, so direct DOM writes and dynamic
  capture flow do not have to be asserted through source-path-specific script code.
- Authoring orientation now has a middle operation-support layer between broad capabilities and named recipes. Operation
  rows come from `AuthoringOperationDescriptors`, inherit required capability state/open reasons, and make action/target
  negotiation visible without pretending the source edit boundary is solved.
- Authoring orientation now also publishes first-pass repair rows. Template diagnostics map to repair kinds such as
  `declare-missing-member`, `inspect-type-surface`, `strengthen-owner-type`, `rewrite-binding-source`, and
  `rewrite-template-syntax`; app open seams map to `resolve-runtime-boundary`, `inspect-open-seam`, or
  `extend-semantic-substrate`. These are typed handoffs for
  future operations, not edits.
- Repair clusters now add a planning layer over those handoffs: plan kind, likely change domain, readiness, source
  coverage, action-target source rows, observed member names, owner/value type display sets, and member-level hints with
  evidence/value-type coverage. Cluster keys include the concrete action target source when one exists; weak-owner
  diagnostics that all say `any` must split by the source owner surface that a future repair would strengthen. Member
  hints also track whether a value type came from a selected member, a binding assignment target, or an honest
  binding-target expectation. Missing value-type coverage is not automatically a bug: weak/null target observers and
  text interpolation should stay unfilled rather than feeding speculative autofixes.
  Scope-slot typing clusters must use the evaluator's open subject as the action target rather than the selected member
  token. A repeated-local expression like `item.label` should group on the `item` slot and carry `label` as member
  evidence, so multiple reads on the same weak slot converge into one repair cluster.
  The intent is to make high-volume weak typing pressure useful for future suggestions or autofixes without skipping
  the still-open source-edit policy boundary.
- Open-seam repair clusters also carry runtime boundary and runtime intent kinds. Dynamic router `href` pressure, for
  example, should surface as router href classification plus static-navigation-target and href-ownership intent instead
  of collapsing into an opaque open seam or a premature code action. When a dynamic `href` sits on an anchor with a
  non-current-window `target`, the cluster should also expose router href click-interception and external-href intent;
  this mirrors Aurelia's `HrefCustomAttribute` constructor gate without pretending the runtime URL-generation decision
  is statically solved.
  Repair kind, runtime boundary kind, and runtime intent kind now share the same typed open-seam reason vocabulary.
  Select multiple source-shape pressure, binding-source resource/type openings, and other known runtime-boundary seams
  should not fall through to `extend-semantic-substrate` merely because the repair-kind classifier forgot a new reason
  that the boundary/intent classifiers already understood.
- `buildAuthoringRepairPlan(...)` turns repair clusters into `repair-app` operations plus expected `authoring-repair`
  closure effects. This is still a semantic negotiation plan: source edits, formatting, and runtime-policy decisions
  remain outside the builder. `repair-app` operation summaries preserve runtime boundary and intent kind buckets when a
  cluster owns them, so compact plan review does not erase whether the work is router href ownership, external-module
  declaration, static navigation, or a substrate gap. `smoke:repair-plan` proves the mixed fixture's current clusters
  become failing pre-repair closure effects, so later repairs have a concrete semantic disappearance target.
- Resource declaration taste now reads the resource model's preserved declaration modes instead of staying empty or
  guessing from source shape. Decorator, static property, definition-object/factory, and current legacy convention
  carriers survive resource convergence into API rows; convention authoring becomes observable only when those current
  convention rows are actually present. A future modern convention declaration lane remains outside active ontology.
- Resource and app-topology bindable rows now carry TypeChecker-backed value type surfaces. This lets authoring
  orientation identify object bindables, callback-function bindables, scalar ID inputs, and weak bindable type surfaces
  without inspecting source text or relying on naming conventions beyond the intentionally weak ID signal.
- `fixtures/pressure/mixed-form-surfaces` is the first non-recommendation pressure fixture. It intentionally mixes
  ID inputs, object inputs, callback-function bindables, weak metadata bags, custom two-way controls, and dynamic native
  form controls. It should pressure diagnostics and repair guidance without teaching the authoring API to generate this
  shape.
- `SelectValueObserver` value-channel materialization no longer treats dynamic repeated `<option>` values as open only
  because no static string domain exists. Static domains still produce literal unions; dynamic options can now close
  through TypeChecker-backed option/source element types, with weak typing left to diagnostics.
- `authoring/recipe.ts` advertises recipe descriptors while concrete builders live beside it. `buildMinimalAppPlan(...)`,
  `buildStateBackedFormPlan(...)`, `buildLocalizedStateBackedFormPlan(...)`,
  `buildValidatedStateBackedFormPlan(...)`, and `buildRoutedStateBackedFormPlan(...)` produce typed plans with topology,
  preferences, ordered operations, and expected
  semantic effects. `buildCatalogStorefrontPlan(...)` adds the first generated app-building recipe beyond forms: DI
  composed state, catalog service loading, nested list/card components, local object handoff, getter projections, service
  interaction bindings, and state-composition verification. `buildRoutedCatalogStorefrontPlan(...)` composes that
  catalog shape with common router authoring: `RouterConfiguration`, list/detail route configs,
  `products/:productId`, a root static detail navigation target with query/fragment, data-driven card links,
  `IRouteContext` parameter reads, viewport/component-agent products, and route-node aggregation effects. `buildComposedDashboardPlan(...)` adds the first generated
  dynamic-composition recipe: DI-owned widget state, repeated dashboard cards, TypeChecker-visible widget component
  unions, scoped template-only composition, async flush-mode composition, composition/composing from-view handoff, and
  `runtime-composition` expected effects over `api.RuntimeCompositions` rows, including candidate resource-analysis
  coverage and closed-branch aggregate composed child-controller handoff without claiming full recursive composed-child
  rendering. The localized form builder
  adds static `@aurelia/i18n` plugin resources, `t`/`t-params.bind` usage, and `i18n-translation-key` expected effects
  over `api.I18nTranslationKeys` rows plus `i18n-translation-binding` expected effects over rendered
  `api.I18nTranslationBindings` target groups. State-backed, localized state-backed, validated state-backed,
  service-backed, routed state-backed form, catalog, routed catalog, and composed-dashboard builders also attach source
  edit plans; the source edit boundary remains explicit through source text authority, conflict policy, formatting
  policy, and package-tooling policy rather than hidden in operation prose. The generated form builders now include a
  capture-based `field-shell` component, so recipe verification exercises recursive child custom-element rendering/scope
  handoff for recommendable app output rather than only the hand-authored storefront fixture.
- Catalog and routed-catalog source generation is now field-profile sensitive. Rich unparameterized reference plans keep
  category/select badge filters, price presentation, stock checked filters, availability switch flow, disabled actions,
  and card class/style getters because the default field schema asks for them. Caller-domain-only catalog plans default
  to `name, summary` and emit only search filtering plus the DI/service/list/card architecture, with expected effects and
  source-pattern modules narrowed to that lean surface.
- `template-controller-expected-effects.ts` is the shared recipe helper for row-backed runtime-controller verification.
  Use it when a generated fixture relies on built-in `if`/`else`/`repeat`/`promise` semantics so the expected effect
  verifies template-controller and synthetic-view handoff rows rather than a plain aggregate controller count. Promise
  branch helpers also assert `promise-branch-to-promise` linkage for `pending`/`then`/`catch` controllers, and switch
  helpers assert `switch-case-to-switch` linkage for `case`/`default-case` controllers.
- Recipe readiness is now owned by recipe descriptors rather than inferred from broad capability open reasons.
- `semanticTargetKey` remains a reporting/grouping key for expected-effect rows. Recipe-local expected-effect
  deduplication uses `expectedSemanticEffectContractKey(...)` so future filtered/cardinality variants do not get
  collapsed by display compression.
- Recipe descriptors now expose direct base recipes, lineage, and specificity rank. Use `currentFitState` together
  with specificity when several recipes are satisfied, because richer recipes intentionally contain their base recipe
  shapes. Current fit checks failed discriminators/signatures before unsupported row-backed effects, so non-applicable
  recipes do not become false unsupported candidates only because they have filtered runtime-controller expectations.
  `minimal-app`, `state-backed-form`, `localized-state-backed-form`, `validated-state-backed-form`,
  `localized-validated-state-backed-form`, `multi-step-state-backed-form`, `service-backed-form`, `routed-state-backed-form`,
  `routed-localized-validated-state-backed-form`, `catalog-storefront`, `routed-catalog-storefront`, and
  `searchable-data-table` are
  plannable/editable because builders and expected effects exist. Treat broader router authoring beyond these generated
  recipes, such as guards, lifecycle hooks, dynamic query merging, and repair/autofix policy, as router substrate
  pressure rather than a reason to keep verified common-path recipes marked partial.
- Import-aware Aurelia `resolve(...)` detection lives in `di/resolve-call-recognition.ts`. Authoring orientation uses
  that low-level signal to strengthen DI-owned state readings; folder roles such as `state/` and `services/` remain weak
  source-shape evidence, not DI proof. `api.AppTopology` now projects those resolve sites as `injections` rows, joining
  consumer class/source span to project-local key declarations when available and to authored framework/plugin imports
  when the key is external.
- Application service topology now owns the next usage layer over those DI facts. `readApplicationServiceTopology(...)`
  projects class-bearing service/state/model declarations, `resolve(...)` injection sites, and TypeChecker-backed calls
  into those classes before `api.AppTopology` serializes rows. The service-backed form recipe now verifies
  component-to-state calls/reads plus state-to-service calls as `service-interaction` expected effects, filtered by
  consumer role and self-interaction state, so service-backed state is pressure-tested as behavior topology rather than
  only folder/class ownership. Direct component-to-service or service-to-state facades remain observable app shapes, but
  are no longer the recommendable generated recipe default.
- `api.AppTopology.serviceInteractionBindings` joins binding data-flow rows to the component member whose body performs
  the service/state/model read, write, or call. The service-backed form recipe now verifies component-to-state reads and
  calls, direct object-backed `with.bind` form-field data flow, and separate state-to-service interaction facts for the
  side-effect boundary. Do not restore per-field component setter handoffs merely to make the topology join easier.
  Binding data-flow now carries a `sourceRootName` beside the display source, letting single-root interpolations and
  object-backed field reads join back to the owning component/state surface when a meaningful interaction exists.
- `api.AppTopology` also projects `stateCompositions` for public state-class properties whose TypeChecker value is a
  project-local class instance. Storefront currently exposes `StorefrontState -> CatalogState/CartState/CheckoutState`
  as source-backed composition rows, keeping idiomatic composed state visible without teaching topology to guess from
  arbitrary object literals or private implementation fields.
- `state-composition` is now a verifier-facing expected-effect kind over those topology rows. The generated catalog
  storefront recipe uses it as a signature for DI-owned state composition, so composed state is no longer only a
  topology observation or hand-authored storefront pressure.
- Authoring-side `ApplicationComponent` now carries component-local dependencies. This is deliberately app topology,
  not source text formatting: recipes that expect child components to compile recursively should name the dependency
  edge so the plan does not rely on hidden fixture source shape.
- `api.AppTopology` now projects component-role rows as generated joins over already-modeled facts: app-root
  configuration, route components, routed controllers, child controller creation, built-in template-controller flow,
  listener target operations, native form value flows, and captured-attribute forwarding. `AuthoringOrientation`
  consumes those rows for `component-role-authoring`, so form/widget/layout negotiation no longer needs an
  `api-query-missing` placeholder while still avoiding name-based role guesses.
- `@aurelia/state` is now visible as a plugin-backed state product rather than only as DI side effects or a taste flag.
  `api.StateStores` reads `StateDefaultConfiguration.init(...)` and `.withStore(...)` builder contributions before the
  creating `AppTask` registers the runtime store instance, so authoring orientation can report `aurelia-state-store`
  without inventing a custom DI-owned state class.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:state-backed-form` writes the state-backed source plan into a
  temporary app, reopens it, and verifies the recipe's expected effects against the live app facts, including app-root,
  component-composition, and data-entry component-role rows. Keep this as a recipe/effect smoke, not as proof that
  general source emission is solved.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:localized-state-backed-form` writes the localized state-backed
  source plan into a temporary app, reopens it, and verifies static `I18nConfiguration` resource admission,
  `I18nTranslationKeys` rows, rendered `I18nTranslationBindings` groups, plugin-registration taste, standard form
  value-channel/data-flow expectations, and zero open seams. It proves static catalog availability plus valid rendered
  `t`/`t-params.bind` lifecycles, not dynamic backend loading or runtime language switching.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:validated-state-backed-form` writes the validated source plan into
  a temporary app, reopens it, and verifies validation-html registration, validation service usage, `& validate:'blur'`
  binding behavior materialization through `BindingBehaviorApplications.staticArgumentValues`, validation-errors handoff,
  error-array driven class data-flow for field presentation, and validation ownership taste without making validation an
  implicit part of every form recipe.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:localized-validated-state-backed-form` writes the combined plugin
  source plan into a temporary app, reopens it, and verifies static i18n catalog/binding rows, validation-html
  registration, validation rule/controller usage, `& validate:'blur'` binding behavior materialization, standard form
  value channels, and zero open seams against the same DI-owned request model.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:multi-step-state-backed-form` writes the wizard/progress source
  plan into a temporary app, reopens it, and verifies DI-owned wizard/profile state, repeat/if controller rows,
  validation-html usage, direct `state.profile.*` value flows, checked collection membership, class-token/class-toggle
  channels including error-array driven field presentation, style interpolation, state-composition, service-interaction
  binding, and getter observation.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:service-backed-form` writes the service-backed source plan into a
  temporary app, reopens it, and verifies state/service topology rows, DI-owned service-layer taste, recursive
  child-component compilation, native form value channels, component/state interaction rows, state/service interaction
  rows, binding-to-state interaction joins including a single-root interpolation over a typed projection object, and no
  open seams.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:minimal-app` reopens the external-template fixture and verifies the
  minimal app recipe's expected effects. `fixtures:authoring` also materializes `generated-minimal-app` from the same
  source plan so the durable generated fixture set covers every concrete recipe source plan.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:routed-state-backed-form` writes the routed source plan into a
  temporary app, reopens it, and verifies the route/form effects, including route-pattern, route-endpoint, and
  recognized-route parameter names for the generated `form/:requestId` route, sibling `main`/`sidebar` viewport
  propagation through route-config, router-viewport, route-node, and component-agent rows, decoded route parameter
  values plus child-first route-node parameter aggregation, and routed-component/form/data-entry component-role rows.
  Passing this smoke proves current static topology, recognizer parameter facts, and pre-activation route-tree viewport
  targeting, not full router activation or every `IRouteContext.getRouteParameters(...)` runtime strategy.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:routed-localized-validated-state-backed-form` writes the routed
  plugin form source plan into a temporary app, reopens it, and verifies router config/route-node/component-agent
  effects, static i18n key/binding rows, validation-html setup, validate binding behavior rows, validation-errors
  handoff, direct state-backed form value channels, and zero open seams on the same route-selected request model.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:catalog-storefront` writes the catalog storefront source plan into a
  temporary app, reopens it, and verifies project tooling, list/card/root component roles, state composition,
  component-to-state calls, state-to-service calls, local product-object binding data flow, direct template bindings to state
  projections and product-domain members, binding-to-state interaction joins, and zero open seams.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:searchable-data-table` writes the searchable data-table source plan
  into a temporary app, reopens it, and verifies composed DI-owned table state, state/service interaction rows, native
  value/select/checked channels, option/input model identity handoff, `& debounce` binding behavior application, keyed
  repeats, class/style channels, direct state/domain template reads, source-backed getter observation, and zero open
  seams. Use it as the rich reference table verifier. The MCP-facing low-boilerplate canary is the domain-only
  table recipe-plan path: caller entity/collection source parameters with no explicit `table-filter-fields` now emit
  a compact search-only table profile and omit selection, checked collection, sorting, and pagination source.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:composed-dashboard` writes the composed dashboard source plan into a
  temporary app, reopens it, and verifies project tooling, runtime composition candidate resolution, compiled widget
  templates, candidate resource-analysis coverage, DI-owned state taste, dynamic composition taste, activation model
  assignability for `activate(model)`, scoped template-only context inputs, static/defaulted flush/scope/tag fields,
  `composition`/`composing` from-view binding presence, and zero open seams. It does not yet claim lifecycle
  activation/deactivation or recursive composed child controller hydration closure.

## Active Pressure

- Runtime child-container materialization is still shallow: view-model instance providers, definition dependency
  registration, template-controller view-factory containers, synthetic-view containers, lifecycle activation, and
  cross-template per-instance parent container chains are not closed yet.
- Binding data-flow materialization covers the first source-side TS handoff for runtime property bindings, but it does
  not yet trace setter bodies into composed state, validation semantics, value-converter `fromView`, or richer
  coercion policies. Observer value channels close single-select option domains, static multi-select array element
  domains, dynamic select mode when the source can accept both scalar and array branches, dynamic repeated option value
  types, plain checkbox boolean flow, radio values, checkbox array/set membership, checkbox map keyed-boolean flow,
  class token/toggle channels, and style rule/property channels from static attributes or lowered sibling bindings;
  custom matcher presence is visible as a value-channel fact and authoring taste, without executing matcher bodies.
  Primitive form model values are now first-class value-channel domains too: nullable select placeholders and
  boolean/null radio models use `primitiveValueDomain` instead of being forced into string-only `valueDomain`, and
  generated form recipes assert the nullable select case through expected effects.
  Dynamic `multiple.bind` with a source that cannot carry both branches, matcher behavior analysis, spread-value unknown
  target keys or missing source properties, and richer class/style value-shape checking remain active pressure. SVG
  attribute accessor closure uses generated data from Aurelia's `SVGAnalyzer` and is gated by the authored HTML IR
  namespace.
- Generated catalog output deliberately uses getter projections over nullable entity lookups instead of exposing
  `product.name`-style reads in templates. Deeper template-controller branch narrowing and recursive nullable-object
  diagnostics remain substrate pressure, but recommendable fixtures should not encode that pressure as user-facing style.
- Captured parent-scope expressions now have a recursive aggregate usage-scope bridge. Dynamic spread instructions
  remember their captured `AttrSyntax` origin and use the parent `HydrateElementInstruction` scope when one is
  available; recursive child custom-element rendering and scope construction keep wrapper templates aligned with the
  controller that supplied the capture. Self-recursive or mutually recursive custom-element definitions now stop at a
  controller-level `recursive-hydration-boundary` with `childViewRenderingState=recursive-boundary` rather than an open
  seam. Repeated runtime instances and lifecycle-sensitive child hydration still need instance-specific recursive
  rendering products.
- Extend app topology beyond the component/support-file slice: imports, class ownership, deeper DI activation edges,
  richer state composition/value-flow edges, stylesheets, registrations, routes, and host assets need source-backed topology rows before
  app-building plans can verify them deeply.
- Extend external template closure beyond default `.html` imports: convention-owned sibling templates, loader query
  variants, and host-supplied virtual assets should stay explicit until each path has source-address provenance.
- Extend operation support beyond observational negotiation. `AuthoringOrientation` can now say which operations are open,
  partial, plannable, repairable, or verifiable from required capabilities; it still cannot apply edits or represent
  source placement policy.
- Deepen repair planning beyond grouped orientation rows. The current layer groups related diagnostics/open seams and
  distinguishes app-source, runtime-policy, and substrate pressure; the next layer should turn ready clusters into
  operation/effect plans without collapsing into a code-action generator too early.
- Promote `AuthoringOrientation` from first read surface into a real capability negotiation input once edit operations
  exist. Its current rows are intentionally observational; it should not become a hidden generator policy blob.
- Extend the recipe layer beyond the first minimal/form/routed-form/catalog/composition builders: auth setup, richer
  route hooks, and lifecycle-sensitive composition still need recipe coverage.
- Router authoring has a first generated route-parameter and sibling named-viewport slice: routed forms now source the
  scalar form ID from `IRouteContext.getRouteParameters(...)`, target named `main` and `sidebar` viewports, and verify
  the static request parameter, query parameters, fragment, and viewport targets through route pattern, endpoint,
  recognized-route, viewport-instruction-tree, route-config, router-viewport, route-node, and component-agent API rows.
  Recognized-route and route-node rows now carry the concrete decoded request parameter value, and route-node rows expose
  child-first / parent-first aggregates over their materialized parent node chain. The generated routed fixture uses
  `getRouteParameters({ includeQueryParams: true })` for a `mode` query and repeated `tag` query values so query
  inclusion is represented in recommendable fixture code too. The `router-route-parameter-aggregation` pressure fixture
  now proves recursive residual child-route recognition for nested `RouteConfigContext`s, closest-parameter-wins
  projection, closed static query-param inclusion, duplicate query-key arrays, and fragment propagation without making
  repeated `:id` names a generated recommendation. Static append and by-route parameter strategy rows are now exposed
  by the API as analysis evidence, including the framework-shaped repeated query values produced when include-query
  aggregation walks every active route node. The next parameter frontier is not another source-plan shortcut; it is
  dynamic query merging, viewport activation, guard/lifecycle handoff, live active-navigation state, and repair policy.
- Keep analyzer stress fixtures separate from authoring fixtures. Stress fixtures may be dense; authoring fixtures should
  look like code we would be comfortable recommending.

## Watchpoints

- User-directed authoring taste currently includes DI-injectable state classes,
  ID-shaped component boundaries for non-leaf app components, sparse bindable
  use, and ordinary framework-shaped app structure. Treat those as profile or
  authoring policy, not as universal semantic truth.
- Inferred implementation guidance is weaker: prefer fixtures that look like
  recommendable Aurelia apps, and use fixture friction to improve substrate
  coverage before inventing generator shortcuts.
- If an operation requires taste, keep the taste outside semantic truth and make the choice visible to the caller.
- If authoring needs a shortcut because analysis cannot verify an idiomatic shape yet, improve analysis first or mark the
  capability open.
- If a plan cannot name expected semantic effects, the operation is probably still too textual and needs a better product
  primitive.
