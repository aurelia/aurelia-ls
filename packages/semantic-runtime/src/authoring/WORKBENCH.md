# Authoring Workbench

This workbench keeps live authoring context close to the code while the authoring spine is young. Promote durable rules
to [README.md](./README.md), [ONTOLOGY.md](./ONTOLOGY.md), [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md), or
source contracts once they prove stable.

## Current Shape

The authoring layer is intentionally only a spine:

- `application` names framework-normal app topology.
- `authoring/ontology.ts` names operation families, actions, targets, capabilities, profiles, and common ambiguity points.
- `authoring` operation/plan classes point into that ontology instead of owning parallel categories.
- `api` can reopen apps after edits, but it does not yet expose authoring queries or edit application.

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
- `api.AppTopology` also reports conventional `state/`, `services/`, and `models/` files as roleful support files. This
  is an authoring-facing source role, not a claim that those classes have been fully DI-materialized yet.
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
  `CheckoutAddon[]` membership. The fixture also exercises static multi-select `value.bind` against a getter-only
  array source, which closes as collection mutation rather than source assignment.
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
  closes these rows for cart count, checkout progress text, and product count with zero open flow pressure.
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
  framework-shaped `SpreadBinding`. `value.bind="email"` is deliberately captured rather than modeled as a
  `FieldShell` bindable; its forwarded input value flow resolves `email` against the checkout-form parent usage scope.
  A second `field-shell` under `if.bind` forwards `postalCode`, pressuring captured-attribute scope handoff through a
  built-in template-controller child view.
- `pnpm --filter @aurelia-ls/semantic-runtime smoke:storefront` rebuilds semantic-runtime and reopens the storefront
  fixture with semantic assertions for zero open seams, spread-value fan-out, ref source operations, and renderer-owned
  surrogate target operations plus closed field-shell capture forwarding. Keep it as a pressure smoke, not a brittle
  golden snapshot.

## Active Pressure

- Runtime child-container materialization is still shallow: view-model instance providers, definition dependency
  registration, template-controller view-factory containers, synthetic-view containers, lifecycle activation, and
  cross-template per-instance parent container chains are not closed yet.
- Binding data-flow materialization covers the first source-side TS handoff for runtime property bindings, but it does
  not yet trace setter bodies into composed state, validation semantics, value-converter `fromView`, or richer
  coercion policies. Observer value channels close single-select option domains, static multi-select array element
  domains, plain checkbox boolean flow, radio values, checkbox array/set membership, class token/toggle channels, and
  style rule/property channels from static attributes or lowered sibling bindings; dynamic `multiple.bind`, non-literal
  dynamic element values, map key/value flow, matcher-specific comparison, spread-value unknown target keys or missing
  source properties, and richer class/style value-shape checking remain active pressure. SVG attribute accessor closure
  uses generated data from Aurelia's `SVGAnalyzer` and is gated by the authored HTML IR namespace.
- Captured parent-scope expressions have a first usage-scope bridge, not a full recursive hydration model. Dynamic
  spread instructions remember their captured `AttrSyntax` origin and can use the parent `HydrateElementInstruction`
  scope when one is available; definition-level fallback groups captures by parent usage instead of flattening all
  captures for a definition into one request. Nested template-controller views inside child templates, repeated runtime
  instances, and lifecycle-sensitive child hydration still need instance-specific recursive rendering products.
- Extend app topology beyond the component/support-file slice: imports, class ownership, DI injection edges, state
  composition edges, stylesheets, registrations, routes, and host assets need source-backed topology rows before
  app-building plans can verify them deeply.
- Extend external template closure beyond default `.html` imports: convention-owned sibling templates, loader query
  variants, and host-supplied virtual assets should stay explicit until each path has source-address provenance.
- Add an API capability query that can say which authoring operations are supported, partial, or open without collapsing
  substrate coverage, API exposure, edit capability, verification, and taste policy into one axis.
- Add a recipe layer that composes ontology operations for flows such as minimal app, routed app, auth setup, and service-backed forms.
- Add a plan builder for a minimal app topology, then verify it by reopening the app through the existing API.
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
