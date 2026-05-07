# Observation Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns TypeChecker-backed emulation of Aurelia observation decisions. It sits at the split where runtime
binding/controller products know which object or node is being targeted, but the language server must reason from
static type surfaces rather than hydrated runtime values.

## Current Shape

- `observer-locator.ts` models `ObserverLocator.getAccessor/getObserver`, `NodeObserverLocator`, and binding-owned
  accessor paths for property bindings and interpolations. It is framework-shaped and auLink-backed; the current lookup
  mechanics are TypeChecker-backed static semantics rather than hydrated DOM/JS execution. Direct framework nouns such
  as `PropertyAccessor`, `SetterObserver`, `ComputedObserver`, `ValueAttributeObserver`, `CheckedObserver`, and
  `SelectValueObserver` are local emulator classes, not anonymous strategy cases, so Atlas can keep their runtime mirror
  pressure visible. Direct
  `AttributeBinding.updateTarget(...)` writes are target-operation products instead of observer-locator lookups.
- Native element targets use framework-grounded node observer configuration first, then the TypeChecker DOM surface to
  attach target/property type facts such as `HTMLInputElement.value: string` or `HTMLInputElement.checked: boolean`.
  `data-*`, `aria-*`, and SVG-standard attributes close through the runtime-shaped `DataAttributeAccessor` lane instead
  of being treated as ordinary element properties. SVG attribute closure uses `svg-analyzer-data.generated.ts`, generated
  from Aurelia's own `runtime-html` `SVGAnalyzer`, and only applies when the authored HTML IR node is in the SVG
  namespace.
  Dash-cased tag names are not treated as custom elements here; renderer target selection decides whether a binding
  targets a controller view-model or a host node. Unknown host-node tag names fall back to `HTMLElement`/`SVGElement`
  when the TypeScript tag-name maps cannot provide a narrower DOM type.
- Controller/view-model targets use TypeChecker-backed resource target types when available. Ordinary accessor lookups
  close through Aurelia's runtime-default `PropertyAccessor`; observer lookups use the same framework fallback shape as
  Aurelia, selecting `ComputedObserver` for statically readonly getter-like members and `SetterObserver` for ordinary or
  missing keys. TypeChecker facts such as property existence and writability remain attached to the target-access row so
  a later strictness/policy layer can decide whether a framework-valid dynamic write should become a diagnostic.
- `binding-data-flow-materializer.ts` consumes target-access or target-operation products plus instruction `Scope`
  applications after template scope construction. It materializes flow rows for property bindings, attribute bindings,
  and interpolations with direction, source expression lane, source and target property type displays, source
  writability, TypeChecker assignability checks in each active direction, and a row-local open reason when the flow
  cannot be closed honestly.
- `binding-value-channel-materializer.ts` sits between target-side products and data flow. It captures the value shape an
  observer/accessor or direct operation actually transports. Closed observer-specific slices include static
  single-select option domains, such as `select.value` carrying `'ship' | 'pickup'` instead of raw DOM `string`, plain
  checkbox boolean channels, radio element values, and checkbox element values bound to array/set membership sources.
  Element values can come from static `value`/`model` attributes or from lowered sibling `model.bind`/`value.bind`
  property bindings.
- `runtime-binding-observation.ts` owns `RuntimeBindingValueChannel`, `RuntimeBindingDataFlow`, their references, and
  their value/data-flow enums. The framework-shaped binding classes still live in the template runtime model, but the
  products that explain observer/accessor value shape and source/target data flow are materialized, typed, and
  registered through the observation substrate.
- `product-details.ts` owns observation detail slots for those value-channel and data-flow products.
- `checker-type-helpers.ts` owns shared TypeChecker helpers for string-literal domains, boolean-like lanes, and
  collection/map element projection used by both value-channel and data-flow materializers.
- Class and style bindings are modeled as value channels too. `ClassAttributeAccessor` channels cover `class.bind` and
  class interpolations, `.class` bindings carry their toggled class-token domain, `StyleAttributeAccessor` channels
  cover `style.bind` and style interpolations, and `.style` bindings carry their targeted style-property domain.
  Direct style operations preserve authored CSS property names, including custom properties such as
  `--checkout-accent` and logical properties such as `border-inline-start-width`.

## Boundaries

This is not full JavaScript framework execution. It deliberately produces static observation facts: selected access
strategy, DOM events, target type, property type, observer value channel, writability, observability, authority, and
open reason. Future deeper runtime execution should plug in below this boundary by providing richer target values or
property descriptors, not by teaching template materializers another private observer switch.

Target observers own the target-to-source edge for from-view/two-way bindings, while accessors own the source-to-target
write edge. Keep those flow products separate from expression parsing so binding direction does not get flattened into
ordinary read-expression semantics. Expression parsing says what was authored; observation data flow says how runtime
binding will spend that expression against target-side products, value channels, and `Scope` lookup.

Select and checked observers are modeled in two layers. `observer-locator.ts` owns the framework-shaped
`SelectValueObserver` and `CheckedObserver` target-access identities, while `binding-value-channel-materializer.ts` owns
the value channel they imply. That split matters because the observers select the accessor branch, but the actual value
domain depends on authored option/input nodes plus TypeChecker-visible source facts. The current value-channel model
closes the single-select option domain from static `option.value`, static `option.model`, or expression-backed
`option.model/value` bindings. Static multi-selects close the selected option element domain for TypeChecker-visible
array sources, while dynamic `multiple.bind` stays open until its value is closed. `CheckedObserver` closes plain
checkbox boolean flow, radio values, and checkbox values for array/set membership sources using static attributes or
expression-backed `model/value` bindings. Map key/value flow, custom matcher semantics, and non-literal dynamic element
values remain explicit pressure.

The template compiler interaction matters here. Aurelia reorders `checked` with `model`/`value`/`matcher` instructions
for order-sensitive inputs, and this substrate consumes the resulting lowered sibling `PropertyBinding` products rather
than rediscovering those expressions from raw attributes. Class/style command syntax is also consumed after lowering:
`.class` and `.style` sites are runtime `AttributeBinding` products with direct target operations, while plain
`class="${...}"` and `style="${...}"` sites are runtime `InterpolationBinding` products with target access.
