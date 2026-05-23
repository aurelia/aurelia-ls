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
  evaluator/connectable classes rather than concrete observation products. Source-level `IObservation.watch(...)` and
  `IObservation.run(...)` calls now publish `runtime-effect` rows plus effect-owned observed-dependency rows. This mirrors framework
  `Observation._doWatch(...)`: string expressions route through `getExpressionObserver(...)`, function getters route
  through `ObserverLocator.getObserver(obj, function)`, and those dependency rows remain source-effect-owned instead of
  being collapsed into renderer-owned binding or resource-watch products. `Container.get(IObservation)` roots are
  admitted through the shared TypeChecker-backed container API receiver check, not by method-name shape alone.
  Dynamic watch expressions still publish the source effect but keep dependency evaluation open until a static evaluator
  or flow-specific product can prove the string expression.
  `Observation.run(...)` rows mirror `RunEffect`: they execute immediately and collect synchronous `@observable` getter
  reads inside the active connectable window while nested async callbacks stay unclaimed.
- `proxy-observable-escape.ts` and `proxy-observable-escape-materializer.ts` publish direct
  `ProxyObservable.getRaw(...)` and `ProxyObservable.unwrap(...)` source calls as neutral observation facts. These rows
  make explicit places where authored code leaves the proxy wrapper surface, which can later feed diagnostics or
  authoring policy about external-library handoff without treating every raw escape as either required or wrong.
- `computed-observation-recognition.ts` and `computed-observation-materializer.ts` publish valid source-backed
  `@computed` getter and method declarations as observation products. This is decorator/dependency metadata, not the
  baseline getter-observation mechanism: Aurelia observes ordinary getter descriptors through
  `ObserverLocator.createObserver(...)` even when no `@computed` decorator exists, and `ObserverLocator.getObserver`
  also creates a `ComputedObserver` directly when the property key is a function. Getter declarations with
  `@computed(...)` mirror the `ComputedPropertyInfo` path that can tune `ObserverLocator.getComputedObserver`; method
  declarations mirror `ComputedMethodOptions` / `astTrackableMethodMarker` handoff into `astEvaluate`. The product
  records whether the declaration uses explicit property keys, dependency functions, framework ProxyObservable
  auto-tracking, disabled empty dependencies, or an open declaration shape. This lane is deliberately separate from
  binding-owned `binding-observed-dependencies`: computed definitions describe source declarations before a
  watcher/computed execution product exists.
  `computed-dependency-config.ts` owns the shared dependency-envelope primitives used by both getter metadata and
  method trackability, so `@computed` and `@astTrack` do not drift into separate parsers for the same `deps` language.
  The decorator is not a generic switch for "make this observable." Ordinary template reads such as `state.member`
  are already connected by `astEvaluate` and the active connectable. For getters, explicit computed deps feed
  `ControlledComputedObserver`: string deps become expression observers, and direct function deps re-enter
  `ObserverLocator.getObserver(obj, function)` and therefore the function-key `ComputedObserver` branch. A getter with
  no explicit computed deps uses the getter-descriptor `ComputedObserver` body collection path regardless of whether
  it was decorated. Getter dependency functions can be passed directly or through config-object `deps`; both are
  runtime explicit dependencies, not a separate decorator-only feature. For methods, `@computed` and `@astTrack` mark
  the method as trackable when called from an observed expression; omitted deps use proxy execution, while explicit
  string or function deps observe those declarations and then avoid proxy-observing the method body.
  `source-observation-product-publication.ts` owns the common source/evidence/provenance envelope for source-backed
  observation products such as runtime effects, computed observation definitions, computed observer sources, and direct
  proxy escape rows. Keep it scoped to observation source products; binding/rendering-owned products have different
  owners and should stay in their renderer/binding publication lanes.
  Controller-owned runtime watcher products live in the template substrate rather than this folder: `ComputedWatcher`
  and `ExpressionWatcher` are lifecycle/binding products created from resource `definition.watches`, while computed
  observation definitions are source declarations. Expression watchers now publish execution-level observed-dependency
  rows by parsing the accepted string property expression against the string-body source span and reusing the same
  `astEvaluate` connectable dependency collector as binding-owned observed dependencies. Computed watchers now have a first TypeScript-body projection for
  `ProxyObservable` property and collection reads over the wrapped dependency function parameter, including simple local
  aliases/destructuring that keep dependency functions readable. Collection method rows are TypeChecker-discriminated
  when receiver types are available, so string `includes(...)` and plain object `get(...)` keep their property-read rows
  without being promoted to ProxyObservable collection reads; weak or unavailable checker facts stay permissive rather
  than pretending the runtime cannot observe them. Callback value roots mirror the framework wrapper positions: array
  `reduce`/`reduceRight` observes the current item parameter rather than the accumulator, while map/set `forEach` can
  observe both value and key. Array `sort(...)` executes its comparator while the connectable is active, but the
  comparator values are raw rather than wrapped, so only closure roots that are already proxy-observable should be
  collected from that callback. Arbitrary function/arrow arguments are not traversed as if they executed; collection
  wrappers, trackable methods, and future evaluator-proven call sites are the boundaries that may enter callback bodies.
  `for...of` loops over arrays/maps/sets now publish iterator collection rows and treat loop
  variables as wrapped roots, mirroring the framework `Symbol.iterator`/`values`/`entries` handoff. Proxy-wrapped
  collection method results are temporary carriers too: reads such as `map.get(key).name` and chained derived arrays
  such as `items.filter(...).map(...).join(...)` preserve the collection-read rows on the framework wrapper calls and
  the later property/collection reads on the wrapped result, without treating the wrapper method token itself as an
  observed property. Dynamic keyed access is represented as an observed proxy property read with the authored
  `keyExpression`, so `items[selectedIndex].name` and `records[selectedId].tags.includes(...)` keep both the keyed read
  and downstream wrapped-value reads visible. Trackable method calls now share one decorator/dependency recognizer for
  both template `astEvaluate` and `ProxyObservable` execution:
  binding-owned calls are discovered through `BindingScope` and TypeChecker member surfaces, while proxy-observed
  TypeScript bodies discover calls such as `vm.summary()` through the checker symbol at the callee. Omitted or nullish
  deps proxy-observe the method body and wrapped arguments; explicit string/function deps spend those declarations and
  avoid proxy-observing the body. These rows are intentionally execution-owned rather than inert framework mirrors.
  `computed-observer-source.ts` and `computed-observer-source-materializer.ts` publish the getter-side source-observer
  availability/projection lane. Plain configurable getters become `ComputedObserverSource` rows with the `accessor-descriptor`
  trigger, while getter-owned explicit dependencies become `ControlledComputedObserver` rows with the
  `getter-owned-observer` trigger. Their observed-dependency rows are source-observer-owned, not binding-owned or
  watcher-owned; they prove what a framework `ObserverLocator` lookup would collect for that getter, not that a
  particular binding already performed that lookup. Pair them with binding observed-dependency rows or target-access rows
  when a query needs actual template usage. Explicit dependency strings preserve dependency-literal source spans when possible. For
  nullish deps configuration is treated like omitted deps, matching the framework `info?.deps == null` branch. For
  partially readable explicit dependency declarations, the closed string/function portions are still published but the
  source remains `open` and stays on the `ControlledComputedObserver` path: framework `ObserverLocator.getComputedObserver`
  branches on whether `info.deps` is present, not on whether semantic-runtime can statically close every dependency.
  Open explicit deps must not fall back to getter-body proxy observation, because that would imply a different runtime
  observer.
  `source-observed-dependency-publication.ts` owns the shared source-observer-owned dependency publication shape used
  by runtime effects and computed observer sources. It receives the admitted source-file handle from the source site and
  materializes exact dependency spans directly, rather than rediscovering a file from the broader effect/observer carrier
  address. Binding-owned and watcher-owned observed dependencies remain in their binding/template publication lanes
  because their owners are concrete runtime bindings/watchers rather than source observer availability/effect products.
  Binding-owned observed-dependency rows now carry exact per-dependency source spans when the binding carrier can be
  narrowed to an admitted source file, TypeChecker member kind and member declaration source for member reads when the
  owner expression can be closed, and scope-slot/context source for root `AccessScope`/`CallScope` reads. That bridge
  lets consumers join a concrete template read to an accessor getter declaration or DI-state root,
  while keeping `ComputedObserverSource` as source-observer availability/projection rather than treating every getter
  declaration as an observed runtime use. Template collection reads carry the observed collection owner rather than the
  array method token. Runtime `LetBinding` participates in the same connectable/data-flow lane: its direct
  `bindingContext`/`overrideContext` property set is published as a `scope-slot` value channel, so template-local
  adaptation such as `<let product.bind="state.products.readProduct(productId)">` retains both the source expression
  and the produced local slot target instead of only surfacing later `product.*` reads. Template method calls stay
  framework-shaped: undecorated source-method bodies are not proxy-observed by `astEvaluate`, so binding-owned observed
  dependencies should expose the called method and its receiver/argument reads, while only `@computed`/`@astTrack`
  methods add method-declaration dependency rows. Direct collection-read owners such as `items.map(...)` can point back
  to the `items` slot/member, while temporary
  call-result owners such as `items.map(...).join(...)` remain open instead of pretending the temporary array has a
  declaration source. Collection-read rows and callback-body descent intentionally use separate framework sets:
  `autoObserveArrayMethods` drives collection-read rows, so `includes(...)` observes the array collection without
  inventing callback locals; callback-executing array methods drive inline arrow body descent, so `forEach(...)` and
  newer methods such as `findLast(...)` can collect callback-local reads without becoming collection-read rows when
  Aurelia does not list them in `autoObserveArrayMethods`. Both closed decisions are still array-owner gated: a
  non-array object with a method named `map`, `filter`, or `includes` does not borrow the framework's array semantics
  merely by name; arbitrary user method callback invocation remains a runtime-execution question until a lower evaluator
  can prove the callee calls the returned arrow closure. Nested callback collection keeps inherited callback locals as
  locals rather than treating an outer callback parameter as a template-scope property, and callable callback locals such
  as `items.map(fn => fn(label))` do not publish a separate source read for `fn`. Template-expression `sort(...)` stays
  different from ProxyObservable `sort(...)`: `astEvaluate` creates an Aurelia arrow callback whose body evaluates under
  the active connectable, so comparator reads such as `left.id` and `right.id` are binding-observed dependencies even
  though ProxyObservable sort comparator values are raw and should not become proxy roots. Dynamic keyed template reads keep the authored key expression in the source route, for example
  `items[selectedIndex].name` and `records[selectedId].tags.includes(...)`, and source-route the keyed row to the
  observed owner declaration when no static member exists. `expression-source-name.ts` is the shared display/root-name
  primitive for binding data-flow and connectable observed-dependency rows so `AccessKeyed` does not collapse to a
  second anonymous `items[]` dialect in one lane while another lane keeps `items[selectedIndex]`.
  TS-side observation products use the shared `typescriptExpressionSourceRootName(...)` and
  `isNestedExecutionBoundary(...)` helpers from `evaluation/ts-syntax.ts`, while member declaration source projection
  goes through `observed-dependency-member-source.ts`; runtime effects, proxy dependency collection, proxy escape rows,
  and controller activation scans should not grow local copies of those policies.
  For
  `@computed({ deps: [...], deep: true })`, semantic-runtime now adds a first TypeChecker-shaped deep traversal over
  explicit dependency keys: nested property rows use `deep-property-read`, and nested array/map/set rows use
  `deep-collection-read`. This mirrors the framework `ControlledComputedObserver.observeDeep(...)` handoff without
  claiming live per-instance object graph traversal. Remaining frontiers include optional chaining, dynamic keys,
  derived collection aliases, dependency-function deep-return projection, deeper collection element traversal, and
  proxy-trap/control-flow precision.
- `observer-locator.ts` models `ObserverLocator.getAccessor/getObserver`, `NodeObserverLocator`, and binding-owned
  accessor paths for property bindings and interpolations. It is framework-shaped and auLink-backed; the current lookup
  mechanics are TypeChecker-backed static semantics rather than hydrated DOM/JS execution. Direct framework nouns such
  as `PropertyAccessor`, `SetterObserver`, `ComputedObserver`, `ControlledComputedObserver`, `ValueAttributeObserver`,
  `CheckedObserver`, and `SelectValueObserver` are local emulator classes, not anonymous strategy cases, so Atlas can
  keep their runtime mirror pressure visible. Direct
  `AttributeBinding.updateTarget(...)` writes are target-operation products instead of observer-locator lookups.
- Native element targets use framework-grounded node observer configuration first, then the TypeChecker DOM surface to
  attach target/property type facts such as `HTMLInputElement.value: string` or `HTMLInputElement.checked: boolean`.
  `xlink:*`, selected `xml:*`, and `xmlns*` attributes in Aurelia's runtime-html namespace table close through
  `AttributeNSAccessor` before the generic attribute path. `data-*`, `aria-*`, and SVG-standard attributes outside that
  namespace table close through the runtime-shaped `DataAttributeAccessor` lane instead of being treated as ordinary
  element properties. SVG attribute closure uses `svg-analyzer-data.generated.ts`, generated from Aurelia's own
  `runtime-html` `SVGAnalyzer`, and only applies when the authored HTML IR node is in the SVG namespace.
  The `href`/`src`/`role`/`size`/popover-style attr-accessor list is a `NodeObserverLocator.getAccessor(...)` branch:
  observer-forcing bindings such as `.two-way` still follow `getObserver(...)`, where a known native property with dirty
  checking disabled can throw `AUR0652`. Semantic-runtime therefore uses the framework `DataAttributeAccessor` mirror for
  accessor-time attr writes and does not keep a separate invented `AttributeAccessor` strategy.
  Dash-cased tag names are not treated as custom elements here; renderer target selection decides whether a binding
  targets a controller view-model or a host node. Unknown host-node tag names fall back to `HTMLElement`/`SVGElement`
  when the TypeScript tag-name maps cannot provide a narrower DOM type.
- `node-observer-config-reader.ts` owns decoding statically evaluated `NodeObserverLocator` service calls into node
  config, global config, accessor override, and global accessor override entries. Configuration recognition may discover
  AppTask-time service calls, but the observation substrate owns what a node observer config means, including observer
  type constructors, `events`, `readonly`, and optional primitive defaults. Built-in configs keep the framework's exact
  defaults: `input.value`/`textarea.value` default to `''`, `valueAsNumber` defaults to `0`, scroll targets default to
  `0`, content targets default to `''`, while `checked` and `files` do not invent defaults. Node-specific config keys preserve the framework's
  exact `nodeName` lane: built-ins are registered as `INPUT`, `SELECT`, and `TEXTAREA`, and lookup uses the normalized
  runtime node name rather than an authored-tag heuristic. Lowercase app config for an HTML node is therefore not
  treated as equivalent to the built-in uppercase mapping.
  `NodeObserverLocator.useConfig(...)` participates only when the framework path asks the node observer locator for an
  observer. A normal to-view `.bind` on an unknown host node may still close through `getAccessor(...)` and
  `ElementPropertyAccessor`; observer-forcing modes such as `.two-way` / `.from-view`, or app-authored
  `overrideAccessor(...)`, are the paths that spend the custom observer/accessor service state. The
  `node-observer-config-errors` pressure fixture and `contract:node-observer-service-customization` keep that
  distinction visible so service customization does not become a blanket host-node rewrite.
  A closed AppTask assignment to `NodeObserverLocator.allowDirtyCheck` is also carried in this service state. When
  dirty checking is disabled, an observer lookup for an existing native node property with no configured observer
  publishes the exact runtime-html `node_observer_strategy_not_found` (`AUR0652`) framework code on the target-access
  product; unknown TypeChecker input stays an open observer-locator seam instead of spending that code. That framework
  throw is a closed diagnostic, not an unresolved observer-locator seam: target-access rows keep `openReason` for
  genuinely open semantics, carry `diagnosticReason` for the framework rejection, and value-channel materialization
  publishes `rejected-target-access` so binding data-flow does not duplicate the same failure as generic open pressure.
- Controller/view-model targets use TypeChecker-backed resource target types when available. Ordinary accessor lookups
  close through Aurelia's runtime-default `PropertyAccessor`; observer lookups use the same framework fallback shape as
  Aurelia, selecting `ComputedObserver` for configurable accessor descriptors, including setter-only descriptors, and
  function-key observer requests. `SetterObserver` remains the ordinary or missing data-property fallback. TypeScript
  `readonly` fields are write-policy facts for diagnostics, not evidence that runtime would choose a computed observer. Collection-shaped view-model targets also
  preserve Aurelia's special object-observer branches:
  array/tuple `length` uses `CollectionLengthObserver`, map/set `size` uses `CollectionSizeObserver`, and numeric array
  keys use `ArrayIndexObserver`. Lookup results expose whether the selected observer supports controller bindable
  `useCoercer` and `useCallback` hooks, so controller hydration can report `AUR0507`/`AUR0508` without duplicating
  observer-locator rules. TypeChecker facts such as property existence and writability remain attached to the
  target-access row so a later strictness/policy layer can decide whether a framework-valid dynamic write should become
  a diagnostic.
  API-facing bindable type surfaces preserve both declared and effective shape. A nullable object bindable can still
  display as `Product | null`, while its effective non-nullable shape is `class`/`object`/`interface` so authoring
  orientation can distinguish object component handoff from scalar ID handoff without source-name guessing.
- `binding-data-flow-materializer.ts` consumes target-access or target-operation products plus instruction `Scope`
  applications after template scope construction. The outer materializer owns product/seam publication; the draft
  collaborators own target value type selection, source-expression projection, source write capability, shared
  TypeChecker member access, and source/target assignability. It materializes flow rows for property bindings,
  attribute bindings, and interpolations with direction, source expression lane, source and target property type
  displays, source writability, TypeChecker assignability checks in each active direction, and a row-local open reason
  when the runtime data-flow itself cannot be closed honestly. TypeChecker source-expression gaps, such as a missing
  projected view-model member, stay on the data-flow row as `sourceTypeOpenReason` instead of becoming a binding open
  seam.
  Property-binding directions use the effective binding mode after rendered, resource-visible binding-mode behaviors
  have executed. A default `.bind` with a visible `& fromView` is therefore target-to-source, and `.to-view` with a
  visible `& twoWay` becomes two-way for the same data-flow, value-channel, and source-assignment checks that ordinary
  command modes use. The row may still expose the static source expression type even when source-to-target flow is
  inactive; direction-specific assignability fields say which side actually participates.
  Runtime source evaluation resolves scopes through `RuntimeInstructionScopeLookup`: a binding's render context selects
  the concrete runtime controller that rendered that binding before the lookup falls back to a definition-level
  unambiguous instruction scope. This is important because compiled instruction products are reused across recursive
  custom-element and synthetic-view rendering; data-flow, value-channel, i18n, composition, and bound-controller value
  consumers must not reintroduce a global `instruction -> scope` map that picks the first rendered instance.
  Spread-created dynamic instructions spend the captured hydration instruction and runtime controller claims published
  by `TemplateCompiler.compileSpread(...)`. Scope construction then applies framework `SpreadBinding.bind(...)`
  semantics: inner bindings evaluate against the hydration-context controller scope's parent. If the exact dynamic
  context controller or its parent scope cannot be resolved, the dynamic instruction stays unscoped instead of
  borrowing root scope or a syntax-wide captured-attribute bucket.
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
  member. Target bindable members are projected on demand because resource target type shapes are allowed to stay
  summary-first until a consumer asks for their member surface. Member-expression writes should spend `CheckerTypeShapeAccess` before reporting owner-member pressure: the
  type-system layer resolves projected members, retained checker/apparent properties, and string index-signature
  writeability, while observation only maps that result into Aurelia `astAssign` policy. Only after those fail should
  the row report `owner-member-not-projected`; otherwise app pressure will confuse ordinary indexed/dynamic TypeScript
  surfaces with missing Aurelia runtime semantics.
  The same source-route split matters for weak read diagnostics: source-independent value types such as `any` should not
  gain fake type-shape source addresses, but expression evaluation should keep the slot/member declaration that produced
  the value so repair planning can target that declaration when it exists. Repeater and binding-pattern handoffs must
  carry that route too; otherwise `any[]` repeat locals collapse back to broad expression diagnostics even when the
  iterable owner source is known. Binding observed-dependency rows use the same principle: when a member declaration is
  unavailable because the owner is weak, dynamic, or index-signature-shaped, the row may carry the owner value route as
  its best source without pretending a concrete member declaration was found. API rows expose
  `observedMemberSourceState` so aggregate pressure can separate concrete source routes from honest non-member carriers
  such as temporary collection call results, `$` runtime scope names, and still-open scope roots.
  Ordinary template reads such as `state.member` do not need view-model forwarding getters to become observable:
  Aurelia's expression evaluation connects `AccessScope`, `AccessMember`, and `AccessKeyed` reads through the active
  connectable. Atlas exposes this framework grounding through
  `framework:observation -- --projection=flow-sites --surfaceKind=ast-evaluator --detail`, including the exact
  `astEvaluate` source rows that call `IConnectable.observe`. Authoring recipes should therefore expose DI state
  directly when the getter would only shorten one member hop. Keep getters for real adaptation points such as nullability,
  id lookup, route parameter projection,
  presentation state, or form field read/write policy.
  Access-scope writes follow the same context-type fallback as expression reads: if no explicit Scope slot exists but
  the selected binding context has a TypeChecker-backed view-model type, writeability is resolved through that context
  type. This keeps ordinary getter/setter view-model properties runtime-assignable without eagerly materializing every
  member as a Scope slot. The write-capability row also preserves the declaration source for the member reached through
  that fallback when the TypeChecker can expose it, so binding-assignment diagnostics and later repair planning can
  target the authored accessor/member instead of only the template expression.
  Member writes that resolve through a lazy checker/apparent-property lookup need the same source route as eagerly
  projected `CheckerTypeMember` rows. `CheckerTypeShapeAccess.memberWriteAccess(...)` materializes the member's
  value/declaration source when it finds a checker symbol; observation should consume that access result rather than
  reopening checker symbols locally.
  Keyed writes preserve the evaluated owner route even when the assignment itself is ordinary runtime-writable. That
  lets array, record, and nested dynamic-keyed form bindings keep an app-source `sourceAssignmentTargetSource` for
  future repair planning instead of falling back to the template expression whenever the source is `person[field]` or
  `state.items[index]`.
  Data-flow rows pass rendering-controller `strictBinding` into the TypeChecker evaluator because Aurelia only throws
  nullish member/keyed/call access errors in strict expression-evaluation mode. The evaluator projects `undefined` for
  optional and non-strict nullish reads, preserves open nullish results when strictness is unknown, and lets template
  diagnostics spend `AUR0114`/`AUR0115` or strict call-target runtime codes only when the binding row's strictness is
  known true.
  Source writeability uses the same strict gate for `astAssign`: member/keyed writes through a definitely nullish owner
  report `AUR0116` as runtime-unassignable source-assignment pressure instead of TypeScript assignment strictness.
  Public source-assignment diagnostics stay downstream of these data-flow rows. Template checker overlays may validate
  expression reads, converter call surfaces, and scope replay, but they should not become a second writeback authority
  for `from-view`/`two-way` assignment policy. The shared
  `runtimeAssignmentTargetAstForExpression(...)` helper strips transparent parens, binding behaviors, and value
  converters before write-capability projection, and API diagnostics use the parse-level companion to narrow the
  user-facing source span while preserving the data-flow product as the semantic owner.
  Value converters still affect the value being assigned: target-to-source data-flow spends the converter chain in the
  same outer-to-inner order as Aurelia `astAssign`, projects each `fromView(value, ...args)` return through the
  TypeChecker resource projector, and then compares the converted value against the unwrapped assignment target type.
  Literal converter `withContext = true` inserts the framework caller-context argument before authored converter
  arguments, so overload selection and target-to-source assignability match runtime-html `useConverter(...)`. Missing
  `fromView` methods are identity conversions; a two-way `input value.two-way="state.quantity | numberText"` can
  therefore read as `string` while writing back as `number`, whereas a converter with only `toView` leaves the raw
  observer `string` visible as assignment strictness pressure.
  Source-to-target flow evaluates expressions with a connectable evaluation context, so `++`, `--`, and compound
  assignment report `AUR0113` through the TypeChecker evaluator before the API maps it to a framework diagnostic. Target
  writes that call `astAssign` with no connectable stay out of that lane.
  Select and checked observer source-to-target flow also spends target-side channel facts here. For single-select and
  radio synchronization, the option/model domain describes what can come back from the observer, not every value the
  observer can accept while syncing the UI; null or another non-matching scalar simply leaves options unchecked or
  unselected. A definitely array-valued source flowing into a non-multiple `SelectValueObserver` channel still publishes
  runtime-html `select_observer_array_on_non_multi_select` (`AUR0654`) on the data-flow product. The value channel owns
  whether the select is single, multiple, or dynamic; data flow owns the directional source-type comparison and the
  exact framework-code claim. Static multi-select nullable source pressure is not an `AUR` error, but it is diagnostic
  worthy: `SelectValueObserver.syncValue()` mutates only when the current source value is an Array, so a source type
  such as `T[] | null` should surface as a framework-runtime-behavior warning whose repair points at the source member
  type/initializer rather than at the select syntax alone.
  Target-side observer writes also publish exact runtime observation failures here when ObserverLocator has already
  selected the throwing observer: `CollectionSizeObserver` source-to-target writes spend `assign_readonly_size`
  (`AUR0220`), and getter-only `ComputedObserver` target writes spend
  `assign_readonly_readonly_property_from_computed` (`AUR0221`). Keep these on the data-flow edge rather than the
  target-access row because `getObserver(...)` succeeds and the framework throws only when the binding writes.
- `binding-source-value-evaluator.ts` is the value-side companion to TypeChecker data flow. It evaluates Aurelia
  binding-source ASTs against modeled `Scope` slots and the shared static ECMAScript evaluator, including `$this`,
  `$parent`, and boundary `this` member reads through the same `BindingScope.locateThis(...)` / boundary traversal that
  framework `astEvaluate` uses. Guarded local class getter and evaluator-local function reads stay on this path too.
  Consumers such as router resources can ask for a static source value without moving binding lookup or getter
  execution into router-specific code. Host-dependent values stay open with evaluator reasons.
  `binding-source-evaluation-frame.ts` owns source-to-evaluated-module lookup and per-module
  `StaticEvaluator` reuse for one binding-source reduction, so follow-up property/getter/function reads keep the
  original module policy, runtime host, and evaluator guardrails instead of resetting them at each access.
  Because the reused host carries Aurelia intrinsics, method-body reads can now reduce direct `resolve(ClassKey)` state
  fields during activation-like instance evaluation instead of degrading the helper import to an external-module
  boundary. `binding-source-activation-context.ts` is the DI-world join for registered/interface keys: when a
  binding-source read has both `this` and an active modeled container, it can match resolver slots in the container
  ancestry and activate source-visible singleton/transient class values through the evaluator. Unsupported resolver
  branches remain open activation facts rather than feature-local guesses.
  `AccessKeyed` now participates in the same value-side reduction: exact array/object reads such as
  `routeInstructions[featuredInstructionIndex]` can close to their element/property value, exact object misses reduce
  to `undefined`, and unknown array membership/order stays open instead of guessing a value.
  Array and object literals authored directly in Aurelia binding expressions are also binding-source values now:
  literal element/property traversal stays in `RuntimeBindingSourceValueEvaluator`, with binding-scope holes preserved
  as boundary values when the shape itself is static. Feature code such as router instruction materialization should
  consume the closed value shape instead of growing local array/object expression evaluators.
  Primitive binary operators that do not need binding scope state reuse `evaluation/operators.ts`, while binding-source
  `+` still has a local first step for string-pattern concatenation over runtime boundary holes. Conditional expressions
  with unknown truthiness may use the shared representative-value substrate to summarize both branches when their values
  can be safely merged; that keeps conditional route strings, state-backed labels, and object-shaped binding values on
  the binding-source value path without adding feature-local branch evaluators.
  Optional call forms (`name?.()`, `owner?.method()`, `owner.method?.()`, and equivalent call-function forms) follow the
  same runtime shape: once the callee or optional owner closes to `null`/`undefined`, binding-source value evaluation
  returns `undefined` so higher expressions such as `??` can select a static fallback.
  `CallMember` passes the evaluated owner as the callee receiver, matching framework `astEvaluate`'s
  `fn.apply(instance, ...)`; this matters for object-literal methods and state-service methods that read `this`.
  `New` expressions now close when the constructor reduces to an evaluator-local class. Constructor arguments are read
  from `NewExpression.args`; if a future parser path starts carrying them on the constructor target again, fix the
  expression parser rather than teaching this evaluator a second `new` dialect. Tagged templates close through
  evaluator-local tag functions with a cooked string-array argument plus evaluated expression holes; host/global tags
  and tags that need unavailable runtime state stay open on the binding-source lane.
  Binary `+` string concatenation preserves `BindingScope` boundary holes as `EvaluationStringPatternValue` when the
  other side is string-shaped, so consumers such as router resources can close authored static prefixes like
  `'/products/' + product.id` without inventing router-local expression evaluation.
  Call expressions remain closed only for evaluator-local function values whose arguments reduce or can carry
  binding-scope boundary values; arbitrary host/userland runtime calls stay open with the binding-layer cause.
  Open reductions carry typed reason kinds such as runtime-only source value, missing static scope slot value, missing
  static member value, or unsupported expression shape so downstream consumers can keep their own product seam while
  still exposing the binding-layer cause. Scope-name reads consume `BindingScope.locate(...)` from the configuration
  substrate so bound-controller value handoff and TypeChecker expression lookup stay on one runtime `Scope` traversal
  rule instead of growing observation-local lookup forks.
  Binding data-flow open seams also map TypeChecker expression-open kinds into reason kinds. Missing converters,
  binding behaviors, state stores, duplicate binding behaviors, and open converter calls surface as
  `binding-source-resource-open`; missing scope/context slots, member/type gaps, unsupported expression forms, and
  nullish/open checker results stay grouped under source-slot/member/expression/type reason kinds. That keeps repair
  planning structured without parsing the human `openReason` summary.
  `runtime-bound-controller-value.ts` owns the parent-to-child controller value table used by this evaluator and by
  router instruction materialization. Keep the value table separate from evaluator execution: the table is the
  binding/rendering handoff for values assigned to child controller view-model properties, while the evaluator decides
  how to reduce a specific binding-source expression in a specific scope. Template scope construction also spends this
  table when a child custom-element resource is analyzed after a parent has supplied an unambiguous bindable value. In
  that lane the value becomes an explicit child root `BindingContext` slot so TypeChecker overlays and ordinary scope
  lookup can agree with runtime hydration instead of reading only the child class's default bindable initializer.
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
  lookup support. Closed observer-specific slices include static single-select option domains, such as `select.value`
  carrying `'ship' | 'pickup'` instead of raw DOM `string`, plain checkbox boolean channels, radio element values,
  checkbox element values bound to array/set membership sources, and checkbox element keys bound to `Map<K, boolean>`
  sources. String `valueDomain` is intentionally not the whole story: `model.bind="null"`, boolean radio/select
  options, and numeric option models carry a `primitiveValueDomain` alongside the existing string display domain so
  API consumers and data-flow assignability can see Aurelia's actual runtime comparison values.
  `runtime-binding-primitive-value.ts` is the shared primitive-value substrate for expression literal extraction,
  DOM `value` coercion, public row display, TypeScript-style literal display, uniqueness, and checker assignability;
  value-channel drafts, select/checked observer branches, data-flow assignability, and API projections should not
  grow local primitive switch walkers.
  Element values can come from static `value`/`model` attributes or from lowered sibling `model.bind`/`value.bind`
  property bindings. Dynamic `model.bind` on options and inputs is the `element-model-value` channel: select observers
  read option models as their value domain, and checked observers can subscribe to input model/value changes. It should
  not be reported as an unknown native DOM property assignment.
- `runtime-binding-observation.ts` owns `RuntimeBindingValueChannel`, `RuntimeBindingDataFlow`, their references, and
  their value/data-flow enums. The framework-shaped binding classes still live in the template runtime model, but the
  products that explain observer/accessor value shape and source/target data flow are materialized, typed, and
  registered through the observation substrate. Data-flow products carry both a display source name and a root source
  name so downstream app-topology joins can connect member chains and single-root interpolations back to their owning
  component members without reparsing expression text. The display source name preserves dynamic keyed source routes
  and call arguments such as `$event` through the same helper used by observed-dependency rows, while `sourceRootName`
  keeps the owner join key stable. They also preserve the expression evaluator's source open kind so diagnostics can
  distinguish TypeChecker strictness,
  assignment no-ops, and runtime `astEvaluate` callable errors without reparsing or reclassifying the binding
  expression at the API boundary.
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
- Built-in template-controller value bindings are modeled as value channels without rewriting the framework target
  surface. Raw controller properties such as `If.value`, `Switch.value`, `Case.value`, and fulfilled/rejected promise
  branch `value` stay `unknown`, while `PromiseTemplateController.value` stays `Promise<unknown>` because that is what
  the framework class exposes. The transported runtime value is a separate `runtimeValueType`/data-flow
  `targetValueType`: truthiness channels keep the source expression type, switch owner channels keep the switched enum
  or scalar type, promise owner channels keep the promise type, and fulfilled branch channels unwrap the owning
  `promise.bind` value through the TypeChecker. Repeat owner bindings use the `template-controller-iteration` channel
  and shared repeat-source compatibility instead of comparing authored sources to the framework's generic `Repeat.items`
  property type. This lookup uses Controller.bind target-access rows because runtime stores bindings with the owner that
  performs binding, not necessarily on the target template-controller frame.

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
`option.model`/`option.value` bindings. `model.bind` mirrors Aurelia's framework-owned arbitrary-value slot and
preserves primitive or object identity; `value.bind` mirrors the DOM value property path and therefore transports
strings after platform/nullish-default coercion. Primitive option/input models such as `null`, `true`, `false`, and
numeric literals are stored as primitive value-domain entries rather than coerced into the string domain; numeric or
boolean `value.bind` literals become string primitive entries such as `"1"` or `"false"`. The string `valueDomain`
remains for actual static string values and presentation token domains. Non-literal DOM `value.bind` expressions use a
checker-backed `string` projection when the expression can be evaluated through the TypeChecker; mixed option domains
then form checker-owned unions such as `string | null` instead of falling back to the bound source type. Static
multi-selects close the selected option element domain for TypeChecker-visible array sources only when the source is
definitely array-shaped at runtime. `SelectValueObserver.syncValue(...)` does not assign a fresh selected-values array
when `select.multiple` is true and the current source value is not an Array; it returns a change notification with the
existing value instead. A static multiple select whose source type also admits non-array values, such as `T[] | null`,
therefore publishes `select-dynamic-array-source-shape` coupling and remains open instead of pretending every runtime
state mutates the collection. Dynamic `multiple.bind` is a distinct `select-dynamic-option-value`
channel when the source type is
broad enough to carry both framework branches: single-select scalar updates and multi-select array mutation. This is
common in wrapper components whose public value is intentionally weak or scalar-or-array; it should stay visible as a
dynamic select channel rather than an open seam. It still remains an explicit
  `binding-value-channel-dynamic-select-multiple` seam when the bound source type cannot plausibly accept both branches,
  because Aurelia's `SelectValueObserver` branches on the live element `multiple` flag at runtime.
The exact `AUR0654` single-select/array-source error is deliberately not published by the value-channel draft: the draft
can prove the single-select channel, but only the later data-flow edge has the TypeChecker source type needed to mirror
`SelectValueObserver.setValue(...)` and `_observeArray(...)`. Directional assignability is intentionally asymmetric for
single-select and radio channels. Target-to-source checks use the option/model domain because that is what user events
write back. Source-to-target checks model framework synchronization: null or a non-matching scalar is accepted and just
does not match an option/input, while a definite array into a non-multiple select remains the framework error above.
Other select-channel failures carry their own typed reasons for unclosed option values, absent option domains, missing
authored select targets, and multi-select source-shape pressure.
`CheckedObserver` closes plain checkbox boolean flow, radio values, checkbox values for array/set membership sources,
and checkbox keyed-boolean writes for `Map<K, boolean>` sources using static attributes or expression-backed
`model/value` bindings. The map channel carries the element model/value as the map key and validates the checked state
against the map value type during data-flow assignability. Radio source-to-target assignability uses primitive domains
when present, so a source typed `boolean | null` can correctly drive individual `model.bind="true"`, `false`, and
`null` radios. Primitive radio/checkbox model domains also synthesize their runtime value type directly from the
primitive domain before falling back to string-token domains, so a closed `null`/boolean/number model is not dependent
on a successful checker projection merely to avoid becoming an open channel. `matcher.bind` is preserved both as its
own `custom-matcher-function` binding channel and as `usesCustomMatcher` on the checked/select value-channel rows that
consume comparison, so diagnostics and authoring can distinguish the authored function slot from default runtime
equality. The analyzer still does not execute the matcher body or derive equality semantics from it.
The boolean checkbox branch is the intentional exception: `CheckedObserver` ignores matcher comparison when the bound
source is boolean-like or otherwise falls through to plain checked-state writes, so those rows do not report
`usesCustomMatcher` or the custom-matcher observer coupling even if a `matcher.bind` sibling is authored.
Checkbox source unions that can be both collection-like and scalar/nullish are their own dynamic channel. The framework
branches on the live current value: arrays/sets/maps mutate membership, while scalar/nullish values write the checked
boolean back through `astAssign`. `checked-dynamic-model-value` therefore requires both the membership branch and the
boolean assignment branch to be valid before target-to-source assignability closes; `Item[] | boolean` can close while
`Item[] | null` remains a useful repair signal.
Rows also carry `observerCouplings` so public consumers can see the observer mechanisms behind the channel without
reverse-engineering them from the channel name: select option domains, select option-list mutation observation, select
array observation/mutation, select dynamic array-source branching, checked element `model`/`value` observation, checked collection observation, checked
collection/map mutations, checked dynamic source-shape branching, and custom matcher comparison are explicit tags.
Those tags are intentionally framework-mechanism facts; data-flow rows still own directional assignability and exact
source write diagnostics.
Non-literal dynamic element values remain explicit pressure.
The checkbox branch must decide from the bound source shape before demanding an element model/value: boolean-like and
non-collection sources use the checked boolean channel, while collection/map-like sources need the element value channel
for membership semantics.
`fixtures/pressure/checked-select-custom-matcher` intentionally covers the array, set, map, and dynamic union branches
so the channel taxonomy cannot quietly collapse all checked collections into one array-only path. Collection channels
split observer readability from source mutation. `ReadonlyArray`, `ReadonlySet`, and `ReadonlyMap` can still feed
source-to-target checked/select synchronization, but target-to-source flow is rejected because Aurelia's event handlers
mutate arrays, sets, and maps through `push`/`splice`, `add`/`delete`, and `set`.

The template compiler interaction matters here. Aurelia reorders `checked` with `model`/`value`/`matcher` instructions
for order-sensitive inputs, and this substrate consumes the resulting lowered sibling `PropertyBinding` products rather
than rediscovering those expressions from raw attributes. Class/style command syntax is also consumed after lowering:
`.class` and `.style` sites are runtime `AttributeBinding` products with direct target operations, while plain
`class="${...}"` and `style="${...}"` sites are runtime `InterpolationBinding` products with target access.
Option `model/value` bindings on the repeated option element itself are now consumed through the recursive rendering
emission: the parent select owns the authored option node, while the child synthetic view supplies the option binding
and its child scope. That closes the common `option repeat.for="..." value.bind="product.id"` DOM stringification case
without scanning source text. Deeper cases where a nested template controller produces descendant option nodes not
owned by the parent select's authored children remain recursive rendering topology pressure.

Proxy observation is part of the same observation circuit as the ordinary binding lane above. Framework
`ProxyObservable` wraps plain objects, arrays, maps, and sets so watcher/computed/trackable-method evaluation and nested
collection reads can keep feeding dependency reads into the active connectable. Its object, array, and collection proxy
handlers collect through that connectable and unwrap before returning values to the caller, while `astEvaluate` supplies
the ordinary `AccessScope`/`AccessMember`/`AccessKeyed` read handoffs. Atlas exposes both sides of the circuit through
`framework:observation`: use `--surfaceKind=ast-evaluator` for expression-evaluation handoffs and
`--surfaceKind=proxy-observable` for proxy wrapping/cache/collection handoffs. The product model spends the normal
template connectable and observer-locator paths for renderer-created bindings, and watcher-owned products now spend the
first computed watcher `ProxyObservable` lane for property and collection dependency reads. Richer ProxyObservable-style
dependency products remain a substrate frontier for vanilla class domain modeling, especially when fixture recipes start
relying more heavily on composed state classes instead of view-model forwarding.

Binding data-flow now publishes a binding-owned observed-dependency lane for source-to-target evaluation. Ordinary
`AccessScope`, `AccessMember`, and `AccessKeyed` reads become `binding-observed-dependencies` rows. Collection method
calls such as `map(...)` become collection-read rows only when TypeChecker receiver facts can still be a runtime array,
mirroring the framework `isArray(instance)` branch while staying open/permissive for weakly typed receivers. The
decision is made from the `CallMember` owner site through the expression member-owner projector, so contextual argument
types and arrow callback-local scopes are preserved: `items.map(item => item.name.includes(filter))` observes the outer
array `map(...)` collection read without promoting the callback-local string `includes(...)` call to a collection read.
Arrow callback reads such as `items.map(item => item.name)` surface ordinary expression-read rows for the callback-local
member and collection-read rows for the array call. Nested callback expressions inherit outer callback locals, so
`items.map(item => item.tags.map(tag => item.name + tag.length))` does not add a bogus bare `item` scope dependency,
while still observing `item.tags`, `item.name`, and `tag.length`. This is intentionally attached to
`RuntimeBindingDataFlowMaterializer`, not a parallel framework mirror: the row exists only when a real runtime binding
has target/value-channel/scope context and a source-to-target expression that a connectable would evaluate.
Dynamic keyed reads such as `items[selectedIndex]` preserve both `keyExpression` and the keyed source display;
downstream reads below the keyed value keep their full route, and the keyed row can point to the owner source when
there is no static member declaration to point at.
`RuntimeBindingExpressionScopeProjector` projects binding-behavior bind-time scope handoffs before collecting those
rows. In particular, `& state` changes the binding's later source-evaluation scope through `binding.useScope(...)`, so
observed dependencies and source writeability must route through the store-backed scope. This applies to interpolation
holes too: runtime-html binds each part as an `InterpolationPartBinding`, and each part calls `astBind(...)` on its own
expression before evaluation. Binding-behavior arguments are not collected as observed dependencies because Aurelia
evaluates them from `astBind(...)` with no active connectable; value-converter arguments still participate because
`astEvaluate(...)` evaluates them during source reads.
`RuntimeWatcherObservedDependency` is the sibling execution-product boundary for watcher reads: expression watchers reuse
this connectable collector, while computed watchers use the first `ProxyObservable.collectObservedDependencyDrafts` pass over
wrapped dependency function bodies, local aliases, and object destructuring. That proxy pass uses TypeChecker receiver
facts to accept array/map/set collection methods and reject ordinary string/object method false positives when the type
surface is visible, while staying open/permissive for weak runtime-shaped values. Callback parameters, loop variables,
destructured values, and local aliases become proxy roots only when the projected value can pass framework
`ProxyObservable.canWrap(...)`; primitive strings/numbers/booleans and function values still spend their owner collection
or property read without becoming downstream proxy carriers. `for...of` loops over arrays/maps/sets now publish iterator
collection rows and treat proxy-wrappable loop variables as wrapped roots; explicit `keys()`, `values()`, and
`entries()` iterator calls remain distinct from the bare `Symbol.iterator` path. Wrapped result chains are modeled for
framework-wrapped calls such as `find`, `filter`, `flatMap`, `slice`, `map.get`, `set`, and `add`, so later reads like
`items.slice().map(...).join(...)` still spend the intermediate collection reads. Non-mutating collection methods such
as `every`, `findIndex`, `has`, `flatMap`, and `slice` are covered by the proxy contract; mutating methods that the
framework does not observe as collection reads should not be added just to make the method list look complete.
The object proxy handler is a separate branch from those collection handlers: ordinary object method calls observe the
method property before invocation and, when invoked with the proxied receiver, their body reads can continue through the
same proxy collector. Intercepted array/map/set methods spend wrapper semantics instead of a method-property read.
Trackable method calls inside proxy dependency functions add that same object-handler method-property read plus either
method-body proxy reads or explicit dependency rows, matching `ProxyObservable.trackableMethod`. The same chain model
now spends Aurelia's `@nowrap` escape hatch: class-level nowrap observes the owning proxied property but stops
downstream reads under the raw returned value, while field-level nowrap suppresses observation of the field itself and
returns a raw value for any later reads. This is intentionally grounded in framework `ProxyObservable.canWrap(...)` /
`doNotCollect(...)`, not in a generic "external object" heuristic. The static `canWrap` approximation also rejects
TypeScript default-library non-plain object brands such as `Date`, `Error`, `URL`, and `RegExp`: the owning proxied
property can still be observed, but method/property reads below the returned host object leave the proxy chain. User and
library class instances remain proxy-wrappable unless the framework `@nowrap` escape hatch or function/primitive
classification says otherwise. Dynamic key semantics, derived collection aliases, destructuring reads without a named
wrapped root, and deeper TypeChecker-backed proxy control flow remain open.

Observed-dependency products are semantic dependency rows rather than raw read-event counters. Framework
`BindingObserverRecord` dedupes subscriptions by observer identity inside a connectable run; semantic-runtime mirrors the
same intent by deduping drafts through `runtime-observed-dependency-draft.ts` on dependency identity instead of parser
span. A row can still carry a source span as evidence for the first read that introduced the dependency, and call/trackable
rows can remain visible when they explain authoring guidance, but repeated reads of the same `this.state` property should
not multiply just because they appeared at several locations in one getter or expression.
