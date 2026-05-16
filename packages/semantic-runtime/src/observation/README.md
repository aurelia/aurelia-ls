# Observation Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns TypeChecker-backed emulation of Aurelia observation decisions. It sits at the split where runtime
binding/controller products know which object or node is being targeted, but the language server must reason from
static type surfaces rather than hydrated runtime values.

## Current Shape

- `AstTrackDecoratorIssueMaterializer`, `ComputedDecoratorIssueMaterializer`, and `ObservableDecoratorIssueMaterializer`
  scan project TypeScript source for observation-owned decorator forms that the runtime rejects before observer setup.
  This is an observation source-issue lane, not resource metadata: these decorators can appear on ordinary classes as
  well as Aurelia resources.
  `@astTrack` currently claims exact runtime `ast_track_decorator_not_a_method` (`AUR0117`) only for source-proved
  non-method targets. `@computed(...)` currently claims exact runtime `computed_not_getter` (`AUR0228`) only for
  source-proved call-form decorators on non-getter/non-method targets; bare `@computed` stays tied to the direct method
  overload until a framework source path proves otherwise. `@observable` currently claims exact runtime
  `invalid_observable_decorator_usage` (`AUR0224`) only for source-proved forms where the framework throws:
  zero-argument `@observable()` on non-fields, and object-configuration `@observable({...})` on non-field/non-class
  targets. Other odd decorator forms stay unclaimed until the framework source shows the same mapped error path. Shared
  decorator target classification lives in `decorator-target.ts` so new observation decorator lanes do not grow their
  own class/member taxonomy.
- `runtime-effect.ts` models the framework-shaped `IEffect` stop lifecycle shared by `Observation.watch(...)` effects
  and `RunEffect`. The first `stop()` closes as a normal lifecycle transition; a second `stop()` claims exact runtime
  `stopping_a_stopped_effect` (`AUR0225`). The sibling runtime `method_not_implemented` (`AUR0099`) usages in
  AST-evaluator mixins and connectable defaults stay intentionally unclaimed until semantic-runtime admits user-extensible
  evaluator/connectable classes rather than concrete observation products.
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
- `node-observer-config-reader.ts` owns decoding statically evaluated `NodeObserverLocator` service calls into node
  config, global config, accessor override, and global accessor override entries. Configuration recognition may discover
  AppTask-time service calls, but the observation substrate owns what a node observer config means, including observer
  type constructors, `events`, `readonly`, and primitive defaults. Node-specific config keys preserve the framework's
  exact `nodeName` lane: built-ins are registered as `INPUT`, `SELECT`, and `TEXTAREA`, and lookup uses the normalized
  runtime node name rather than an authored-tag heuristic. Lowercase app config for an HTML node is therefore not
  treated as equivalent to the built-in uppercase mapping.
  A closed AppTask assignment to `NodeObserverLocator.allowDirtyCheck` is also carried in this service state. When
  dirty checking is disabled, an observer lookup for an existing native node property with no configured observer
  publishes the exact runtime-html `node_observer_strategy_not_found` (`AUR0652`) framework code on the target-access
  product; unknown TypeChecker input stays an open observer-locator seam instead of spending that code. That framework
  throw is a closed diagnostic, not an unresolved observer-locator seam: target-access rows keep `openReason` for
  genuinely open semantics, carry `diagnosticReason` for the framework rejection, and value-channel materialization
  publishes `rejected-target-access` so binding data-flow does not duplicate the same failure as generic open pressure.
- Controller/view-model targets use TypeChecker-backed resource target types when available. Ordinary accessor lookups
  close through Aurelia's runtime-default `PropertyAccessor`; observer lookups use the same framework fallback shape as
  Aurelia, selecting `ComputedObserver` for statically readonly getter-like members and `SetterObserver` for ordinary or
  missing keys. Collection-shaped view-model targets also preserve Aurelia's special object-observer branches:
  array/tuple `length` uses `CollectionLengthObserver`, map/set `size` uses `CollectionSizeObserver`, and numeric array
  keys use `ArrayIndexObserver`. Lookup results expose whether the selected observer supports controller bindable
  `useCoercer` and `useCallback` hooks, so controller hydration can report `AUR0507`/`AUR0508` without duplicating
  observer-locator rules. TypeChecker facts such as property existence and writability remain attached to the
  target-access row so a later strictness/policy layer can decide whether a framework-valid dynamic write should become
  a diagnostic.
- `binding-data-flow-materializer.ts` consumes target-access or target-operation products plus instruction `Scope`
  applications after template scope construction. The outer materializer owns product/seam publication; the draft
  collaborators own target value type selection, source-expression projection, source write capability, shared
  TypeChecker member access, and source/target assignability. It materializes flow rows for property bindings,
  attribute bindings, and interpolations with direction, source expression lane, source and target property type
  displays, source writability, TypeChecker assignability checks in each active direction, and a row-local open reason
  when the runtime data-flow itself cannot be closed honestly. TypeChecker source-expression gaps, such as a missing
  projected view-model member, stay on the data-flow row as `sourceTypeOpenReason` instead of becoming a binding open
  seam.
  It asks the template parse-projection layer for runtime-accepted expression ASTs, so authoring-strict companion
  parses remain visible without forcing closed Aurelia runtime data-flow to reopen. Source-expression evaluation
  receives the target value type as contextual type, so callback and function-valued bindables can type arrow
  parameters when the target bindable exposes a callable signature. If the target type is `unknown`, `any`, or
  index-signature-only, the data-flow row stays honest instead of manufacturing members.
  `$`-prefixed synthetic writeback locals created by from-view/two-way bindable assignments, such as
  `display-data.bind: $displayData`, are treated as runtime-assignable even when no authored view-model member exists;
  the target bindable value type is used as the assignment type for later scope analysis. `$host` is reserved by
  Aurelia runtime and is excluded from this synthetic-local lane: missing `$host` reads report `AUR0105`, while
  `astAssign` throws `ast_no_assign_$host` before ordinary scope lookup, so data-flow reports `AUR0106` as an exact
  framework assignment diagnostic. Other runtime-only scope slots can still report TypeScript strictness pressure when
  the product cannot prove a real TypeChecker member. A
  runtime-created slot may still carry the target bindable's TypeMember product as a type carrier for expression
  analysis; assignment policy should not treat that carrier as proof that the scope name is an authored view-model
  member. Member-expression writes should spend `CheckerTypeShapeAccess` before reporting owner-member pressure: the
  type-system layer resolves projected members, retained checker/apparent properties, and string index-signature
  writeability, while observation only maps that result into Aurelia `astAssign` policy. Only after those fail should
  the row report `owner-member-not-projected`; otherwise app pressure will confuse ordinary indexed/dynamic TypeScript
  surfaces with missing Aurelia runtime semantics.
  Data-flow rows pass rendering-controller `strictBinding` into the TypeChecker evaluator because Aurelia only throws
  nullish member/keyed/call access errors in strict expression-evaluation mode. The evaluator projects `undefined` for
  optional and non-strict nullish reads, preserves open nullish results when strictness is unknown, and lets template
  diagnostics spend `AUR0114`/`AUR0115` or strict call-target runtime codes only when the binding row's strictness is
  known true.
  Source writeability uses the same strict gate for `astAssign`: member/keyed writes through a definitely nullish owner
  report `AUR0116` as runtime-unassignable source-assignment pressure instead of TypeScript assignment strictness.
  Source-to-target flow evaluates expressions with a connectable evaluation context, so `++`, `--`, and compound
  assignment report `AUR0113` through the TypeChecker evaluator before the API maps it to a framework diagnostic. Target
  writes that call `astAssign` with no connectable stay out of that lane.
  Select observer source-to-target flow also spends target-side channel facts here: a definitely array-valued source
  flowing into a non-multiple `SelectValueObserver` channel publishes runtime-html
  `select_observer_array_on_non_multi_select` (`AUR0654`) on the data-flow product. The value channel owns whether the
  select is single, multiple, or dynamic; data flow owns the source type comparison and the exact framework-code claim.
  Target-side observer writes also publish exact runtime observation failures here when ObserverLocator has already
  selected the throwing observer: `CollectionSizeObserver` source-to-target writes spend `assign_readonly_size`
  (`AUR0220`), and getter-only `ComputedObserver` target writes spend
  `assign_readonly_readonly_property_from_computed` (`AUR0221`). Keep these on the data-flow edge rather than the
  target-access row because `getObserver(...)` succeeds and the framework throws only when the binding writes.
- `binding-source-value-evaluator.ts` is the value-side companion to TypeChecker data flow. It evaluates Aurelia
  binding-source ASTs against modeled `Scope` slots and the shared static ECMAScript evaluator, including guarded local
  class getter and evaluator-local function reads. Consumers such as router resources can ask for a static source value
  without moving binding lookup or getter execution into router-specific code. Host-dependent values stay open with
  evaluator reasons. `binding-source-evaluation-frame.ts` owns source-to-evaluated-module lookup and per-module
  `StaticEvaluator` reuse for one binding-source reduction, so follow-up property/getter/function reads keep the
  original module policy, runtime host, and evaluator guardrails instead of resetting them at each access.
  Call expressions remain closed only for evaluator-local function values whose arguments reduce or can carry
  binding-scope boundary values; arbitrary host/userland runtime calls stay open with the binding-layer cause.
  Open reductions carry typed reason kinds such as runtime-only source value, missing static scope slot value, missing
  static member value, or unsupported expression shape so downstream consumers can keep their own product seam while
  still exposing the binding-layer cause. Scope-name reads consume `BindingScope.locate(...)` from the configuration
  substrate so bound-controller value handoff and TypeChecker expression lookup stay on one runtime `Scope` traversal
  rule instead of growing observation-local lookup forks.
- `binding-value-channel-materializer.ts` publishes runtime value-channel products, claims, product-level provenance,
  and open seams between target-side products and data flow. Value-channel fields are generated from binding, target,
  observer, and checker facts, so they should not receive same-handle field provenance unless a future source product
  gives an individual field a distinct authored span or contribution.
- `binding-value-channel-drafts.ts` owns the per-binding draft frame for the value shape an observer/accessor or direct
  operation actually transports before publication. `RuntimeBindingValueChannelDraftFrame` caches the binding's lazy
  source-type reader and keeps the source-operation, direct target-operation, closed target-access, rejected
  target-access, and observer-specific handoff branches in one read epoch. The direct-operation, select-observer,
  checked-observer, and shared support modules keep those framework-shaped branches separate:
  `direct-binding-value-channel-drafts.ts` owns target/source operation channels,
  `select-value-observer-channel-drafts.ts` owns `SelectValueObserver` branches,
  `checked-observer-channel-drafts.ts` owns `CheckedObserver` branches, and
  `binding-value-channel-draft-support.ts` owns shared TypeChecker, template-node, value-site, and lazy source-type
  lookup support. Closed observer-specific slices include static
  single-select option domains, such as `select.value` carrying `'ship' | 'pickup'` instead of raw DOM `string`, plain
  checkbox boolean channels, radio element values, checkbox element values bound to array/set membership sources, and
  checkbox element keys bound to `Map<K, boolean>` sources.
  Element values can come from static `value`/`model` attributes or from lowered sibling `model.bind`/`value.bind`
  property bindings. Dynamic element-property and setter accessors may have no declared TypeScript property type, for
  example `model` on options or inputs, while still being valid Aurelia runtime writes; those channels use `unknown` as
  the runtime intake type rather than pretending the missing DOM property is an open observer failure.
- `runtime-binding-observation.ts` owns `RuntimeBindingValueChannel`, `RuntimeBindingDataFlow`, their references, and
  their value/data-flow enums. The framework-shaped binding classes still live in the template runtime model, but the
  products that explain observer/accessor value shape and source/target data flow are materialized, typed, and
  registered through the observation substrate. Data-flow products carry both a display source name and a root source
  name so downstream app-topology joins can connect member chains and single-root interpolations back to their owning
  component members without reparsing expression text. They also preserve the expression evaluator's source open kind
  so diagnostics can distinguish TypeChecker strictness, assignment no-ops, and runtime `astEvaluate` callable errors
  without reparsing or reclassifying the binding expression at the API boundary.
- `product-details.ts` owns observation detail slots for those value-channel and data-flow products.
- `checker-type-helpers.ts` owns shared TypeChecker helpers for string-literal domains, boolean-like lanes, and
  collection/map element projection used by both value-channel and data-flow materializers.
- Class and style bindings are modeled as value channels too. `ClassAttributeAccessor` channels cover `class.bind` and
  class interpolations, `.class` bindings carry their toggled class-token domain, `StyleAttributeAccessor` channels
  cover `style.bind` and style interpolations, and `.style` bindings carry their targeted style-property domain.
  Direct style operations preserve authored CSS property names, including custom properties such as
  `--checkout-accent` and logical properties such as `border-inline-start-width`. Direct target operations keep a
  runtime intake type even when the source expression cannot be typed: Aurelia's attribute/content bindings receive
  `unknown` and then apply class truthiness, style stringification, attribute removal/stringification, or text-content
  stringification. Missing source members should remain source diagnostics, not erase target-side operation semantics.

## Boundaries

This is not full JavaScript framework execution. It deliberately produces static observation facts: selected access
strategy, DOM events, target type, property type, observer value channel, writability, observability, authority, and
open reason. Future deeper runtime execution should plug in below this boundary by providing richer target values or
property descriptors, not by teaching template materializers another private observer switch.

Runtime observation lifecycle and service-activation errors stay outside this substrate until their public product paths
exist. Direct `ObserverLocator.getObserver(null, ...)`, `getExpressionObserver(...)` without `IExpressionParser`,
connectable stack misuse, dirty-checker service/policy failures, and live effect/computed recursion are runtime API or
execution-state failures, not current template binding target-access products. Exact framework codes should be claimed
only after semantic-runtime admits those API/lifecycle products, not because the code exists in `runtime/errors.ts`.

Target observers own the target-to-source edge for from-view/two-way bindings, while accessors own the source-to-target
write edge. Keep those flow products separate from expression parsing so binding direction does not get flattened into
ordinary read-expression semantics. Expression parsing says what was authored; observation data flow says how runtime
binding will spend that expression against target-side products, value channels, and `Scope` lookup.

Select and checked observers are modeled in three layers. `observer-locator.ts` owns the framework-shaped
`SelectValueObserver` and `CheckedObserver` target-access identities, `binding-value-channel-drafts.ts` owns the value
channel they imply, and `binding-value-channel-materializer.ts` publishes the resulting product records. That split
matters because the observers select the accessor branch, but the actual value domain depends on authored option/input
nodes plus TypeChecker-visible source facts. The current value-channel model
closes the single-select option domain from static `option.value`, static `option.model`, or expression-backed
`option.model/value` bindings. Static multi-selects close the selected option element domain for TypeChecker-visible
array sources. Dynamic `multiple.bind` is a distinct `select-dynamic-option-value` channel when the source type is
broad enough to carry both framework branches: single-select scalar updates and multi-select array mutation. This is
common in wrapper components whose public value is intentionally weak or scalar-or-array; it should stay visible as a
dynamic select channel rather than an open seam. It still remains an explicit
`binding-value-channel-dynamic-select-multiple` seam when the bound source type cannot plausibly accept both branches,
because Aurelia's `SelectValueObserver` branches on the live element `multiple` flag at runtime.
The exact `AUR0654` single-select/array-source error is deliberately not published by the value-channel draft: the draft
can prove the single-select channel, but only the later data-flow edge has the TypeChecker source type needed to mirror
`SelectValueObserver.setValue(...)` and `_observeArray(...)`.
Other select-channel failures carry their own typed reasons for unclosed option values, absent option domains, missing
authored select targets, and multi-select source-shape pressure.
`CheckedObserver` closes plain checkbox boolean flow, radio values, checkbox values for array/set membership sources,
and checkbox keyed-boolean writes for `Map<K, boolean>` sources using static attributes or expression-backed
`model/value` bindings. The map channel carries the element model/value as the map key and validates the checked state
against the map value type during data-flow assignability. `matcher.bind` is preserved on checked/select value-channel
rows as `usesCustomMatcher` so diagnostics and authoring can distinguish default runtime equality from an app-supplied
comparison function; the analyzer still does not execute the matcher body or derive equality semantics from it.
Non-literal dynamic element values remain explicit pressure.
The checkbox branch must decide from the bound source shape before demanding an element model/value: boolean-like and
non-collection sources use the checked boolean channel, while collection/map-like sources need the element value channel
for membership semantics.
`fixtures/pressure/checked-select-custom-matcher` intentionally covers the array, set, and map branches so the channel
taxonomy cannot quietly collapse all checked collections into one array-only path.

The template compiler interaction matters here. Aurelia reorders `checked` with `model`/`value`/`matcher` instructions
for order-sensitive inputs, and this substrate consumes the resulting lowered sibling `PropertyBinding` products rather
than rediscovering those expressions from raw attributes. Class/style command syntax is also consumed after lowering:
`.class` and `.style` sites are runtime `AttributeBinding` products with direct target operations, while plain
`class="${...}"` and `style="${...}"` sites are runtime `InterpolationBinding` products with target access.
