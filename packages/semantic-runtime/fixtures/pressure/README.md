# Pressure Fixtures

This folder is for hand-authored analyzer pressure fixtures that are intentionally not authoring recommendations.

Use these fixtures to preserve shapes that real Aurelia projects may contain, including weak type surfaces, mixed state
ownership, callback bindables, object bindables on non-leaf components, dynamic form controls, and partially inconsistent
template conventions.

Keep ideal, recommendable app output in [../authoring](../authoring). Pressure fixtures can be mixed or intentionally
non-recommendation, but they should
still be realistic app code rather than artificial parser torture cases.

## Fixtures

- `mixed-form-surfaces` captures a form-heavy app surface with mixed ID/object component inputs, callback bindables,
  weak metadata bags, dynamic native controls, a custom two-way picklist, and an authored member access on a known
  primitive owner. It exists to pressure diagnostics, authoring orientation, binding observer inference, missing-member
  policy, and weak-type explanations without teaching the authoring API to generate the same shape.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:template-diagnostics` protects its target-to-source assignment
  strictness diagnostics, including the declaration source used as the future repair/code-action target.
- `module-loader-invalid-transform-input` captures `aliasedResourcesRegistry(...)` being given a statically closed
  primitive module input. It preserves kernel `ModuleLoader` `invalid_module_transform_input` / `AUR0021` pressure in
  the evaluation issue lane without teaching authoring recipes to generate invalid registry module inputs.
- `computed-decorator-contexts` captures valid getter/method `@computed(...)` usage, including direct and config-object
  getter dependency functions plus `deep: true` explicit dependency keys, beside field, setter, and auto-accessor
  call-form targets. It preserves runtime `computed_not_getter` / `AUR0228` as an observation source issue while
  pressure-testing the separate `ComputedObserverSource` source-observer projection lane for plain getter descriptors,
  getter-owned `ControlledComputedObserver`, dependency-literal provenance, and first TypeChecker-shaped deep
  property/collection rows.
- `watcher-proxy-dependencies` captures a valid `@watch` dependency collection function that reads root properties,
  collection methods, local aliases/destructuring, and wrapped callback element properties through Aurelia's
  `ProxyObservable` path. It preserves computed watcher dependency pressure without treating those reads as ordinary
  renderer binding expressions. The fixture also covers array `reduce` current-item wrapping, array
  `every`/`findIndex`/`flatMap`/`slice` collection reads, raw array `sort` comparator values, map `forEach` value/key
  wrapping, map `has`, explicit `keys()`/`values()` iterator paths, and wrapped result chains, which are easy to
  mis-model if callback parameters or collection methods are treated uniformly. It also rejects arbitrary object-method
  callback execution until a framework wrapper or evaluator-proven invocation boundary exists. It also covers
  `@nowrap` class and field escape hatches so external or host-owned objects can leave proxy observation without
  creating fake downstream dependency rows, and TypeScript default-library object brands such as `Date`, `Error`,
  `URL`, and `RegExp` whose owning property reads are observable but whose returned host objects should not become
  downstream proxy carriers.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:proxy-observation` is the focused semantic contract for this
  fixture.
- `source-observation-effects` captures direct `IObservation.watch(...)` source calls: a function getter that enters
  the ObserverLocator function-key `ComputedObserver` branch and a string expression that enters the
  `getExpressionObserver(...)` / astEvaluate branch. It preserves source-level effect ownership separately from
  resource `@watch` metadata and template binding dependency rows, and keeps `Container.get(IObservation)`
  recognition on the shared TypeChecker-backed container API lane. It also covers direct `IObservation.run(...)`
  effects where synchronous `@observable` getter reads are collected through the active `RunEffect` connectable window,
  plus a dynamic string watch expression that should preserve the source effect while leaving dependency evaluation
  open.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:runtime-effect-observation` is the focused semantic contract
  for this fixture.
- `proxy-observable-escapes` captures direct source calls to `ProxyObservable.getRaw(...)` and
  `ProxyObservable.unwrap(...)`. It preserves neutral source-level facts about raw/proxy boundary crossings so later
  authoring or diagnostic policy can reason about external-library handoff and unnecessary escapes without baking that
  judgment into the observation substrate.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:proxy-observable-escapes` is the focused semantic contract for
  this fixture.
- `template-collection-observation` captures binding-expression collection observation for array method calls, nested
  callback locals, dynamic keyed owners, and non-array lookalikes. It keeps template `astEvaluate` array collection
  semantics separate from ProxyObservable collection wrappers: `forEach` / `findLast` callback bodies can be observed
  without becoming collection rows, `includes` becomes a collection row without inventing callback locals, and object
  methods named `map` or `get` do not inherit array/map semantics by name. Template `sort` is intentionally present as
  the mirror-image of the proxy watcher sort case: `astEvaluate` executes the Aurelia arrow callback under the active
  connectable, so comparator member reads are template dependencies even though proxy sort comparator values stay raw.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:template-collection-observation` is the focused semantic
  contract for this fixture.
- `one-hop-forwarding-accessor` captures a component getter that only returns a property chain rooted at a DI-injected
  state class, beside a meaningful presentation getter, an unused getter, and a direct `state.*` template binding. It
  exists to pressure authoring orientation toward low-boilerplate guidance without treating every getter as suspect or
  every source-observer candidate as a template-read observation.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:one-hop-forwarding-accessor` is the focused semantic contract
  for this fixture.
- `component-object-boundary` captures a local typed component boundary where a repeated `Product` instance flows into a
  nullable object-shaped bindable, and the child template reads the object directly. It keeps direct object binding
  visible as valid authoring pressure beside scalar-ID recipes: semantic-runtime must preserve the effective
  non-nullable bindable shape, binding data-flow, binding observed-dependency, and plain getter ComputedObserver rows
  without turning object handoff into either a universal recommendation or a diagnostic.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:component-object-boundary` is the focused semantic contract for
  this fixture.
- `listener-method-reference` captures Aurelia `ListenerBinding` source expressions that either invoke a state method
  directly, evaluate to a method reference that Aurelia invokes with the DOM event, or return a handler function that
  Aurelia then invokes. It preserves the split between authored binding-expression display (`state.submit($event)`),
  event-handler invocation value channels, and AppTopology service-member names (`submit`) so low-boilerplate listener
  guidance does not lose source precision or require forwarding component methods.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:listener-method-reference` is the focused semantic contract for
  this fixture.
- `weak-owner-repair-planning` captures missing repeat-local slot typing, an `any[]` repeat local, an `any`-typed owner
  property/method return, an index-signature-only owner, and a typed owner with a genuinely missing member. It exists to
  pressure repair planning around the difference between the diagnostic member span, the scope slot that needs typing,
  the iterable/source slot that introduced a weak repeat local, the authored TypeScript type annotation or return type
  that should receive a future owner-type repair, and the inspect-owner fallback for non-weak missing members.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:template-diagnostics` is the focused semantic contract for this
  fixture, including the shared repair cluster with member hints.
- `binding-data-flow-issue-rollups` captures compact summary pressure for common existing-app repair classes:
  unresolved source typing in a class-toggle expression, nullish source values bound into required target contracts,
  nullish observer values written into required source members, and unannotated component bindables initialized with
  empty arrays that TypeScript infers as `never[]`. It exists so MCP/LSP clients can route from
  `binding-data-flow-summary` issue rows to source typing, source narrowing, optional receiving-side contracts, or
  target-type repair before opening exact raw binding rows, without teaching authoring recipes to generate those weak
  surfaces.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:binding-data-flow-summary` is the focused semantic contract for
  these issue rollups.
- `di-resource-duplicates` captures two source-registered runtime-html resources with the same custom-element name. It
  preserves the runtime-html definition registrar duplicate warning (`element_existed` / `AUR0153`) as a
  resource-registration issue without teaching authoring recipes to generate colliding resource names. Kernel
  `resource_already_exists` (`AUR0007`) remains the separate static `$au` resource/resolver-publication path.
- `di-resolve-contexts` captures ambient `resolve(...)` calls in module/static contexts that cannot have Aurelia's
  current container, alongside instance activation calls where nullish keys are validated by the active container and
  caller-dependent calls that should not be claimed as exact framework diagnostics. It preserves
  `no_active_container_for_resolve` / `AUR0016` and `null_undefined_key` / `AUR0014` pressure without teaching
  authoring recipes to use module-level service lookup or invalid keys.
- `di-inject-decorator-contexts` captures valid class/field `@inject` metadata carriers next to invalid
  method/getter/setter targets. It preserves `invalid_inject_decorator_usage` / `AUR0022` pressure without teaching
  authoring recipes to put injection decorators on rejected TC39 decorator contexts.
- `dynamic-keyed-validation` captures `& validate` bindings whose writable source expressions use repeat-local keyed
  access and nested TypeChecker-visible keys, such as `person[field]` and `person[addressField][line1Field]`. It
  preserves framework-test-shaped validation binding pressure without teaching generated authoring recipes to prefer
  dynamic keyed form fields.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:dynamic-keyed-validation` is the focused semantic contract for
  validate binding behavior rows, keyed writable data-flow rows, observed dependencies, and the absence of false
  diagnostics.
- `keyed-form-source-bindings` captures ordinary checked/select form bindings whose source expressions are array-index
  or record-keyed writes, such as `state.flags[0]`, `state.itemNames[0]`, and
  `state.selectedByTagId[tag.id]`. It preserves the handoff between checked/select value channels, keyed source display,
  TypeChecker-backed write capability, and runtime assignability without teaching authoring recipes to prefer indexed
  state over named domain properties.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:keyed-form-source-bindings` is the focused semantic contract for
  this fixture.
- `contextual-call-argument-completion` captures cursor member-owner projection inside callback arguments whose
  parameter type comes from a view-model method signature or a TypeChecker-visible collection method. It preserves
  contextual call-argument typing for completions without teaching authoring recipes to prefer callback-heavy template
  expressions.
- `class-style-interpolation-boundaries` captures class and style attributes with multiple interpolation holes and
  JavaScript template expressions inside those holes. It preserves interpolation boundary, class/style accessor, and
  value-channel pressure without treating the fixture as a recommended styling pattern.
- `i18n-translation-binding-errors` captures invalid rendered i18n translation binding lifecycles: missing translation
  keys, duplicate parameter bindings on one target element, and non-string dynamic key expressions. It preserves
  `AUR4000`, `AUR4001`, and `AUR4002` diagnostic pressure without teaching generated authoring recipes to emit invalid
  translation bindings. Static translation catalogs and positive rendered binding groups are now covered separately by
  the generated localized authoring fixture through `api.I18nTranslationKeys` and `api.I18nTranslationBindings`.
- `implicit-binding-expression-inference` captures empty `.bind`, `.two-way`, and `.from-view` command values where
  Aurelia infers the source expression from the authored target name while target-property mapping remains separate. It
  preserves framework compiler behavior such as `minlength.bind` reading `minlength` even when the DOM target property
  maps to `minLength`.
- `observable-decorator-contexts` captures valid field `@observable` carriers next to invalid class, method, getter,
  and auto-accessor decorator forms. It preserves runtime `invalid_observable_decorator_usage` / `AUR0224` pressure in
  the observation source-issue lane without treating `@observable` as resource metadata.
- `ast-track-decorator-contexts` captures a valid method `@astTrack` next to an invalid field decorator form. It
  preserves runtime `ast_track_decorator_not_a_method` / `AUR0117` pressure in the observation source-issue lane without
  teaching authoring recipes to decorate non-method members.
- `checked-select-custom-matcher` captures `matcher.bind` on checked and select observers with object-valued
  `model.bind` options. It preserves the observer comparison handoff as value-channel facts and authoring
  `custom-matcher-comparison` taste across the exhaustive checked/select matrix. Generated authoring forms carry one
  deliberate object-select matcher example; this pressure fixture still owns the broader behavior-grounding surface. It
  is also part of `contract:select-checked-value-channels`, which protects checked array/set membership, map keyed-boolean
  membership, radio object values, select object values, and boolean checkbox matcher non-use from collapsing into
  boolean or string-only channels. The fixture also keeps readonly collection sources asymmetric: source-to-target
  observer synchronization can read `ReadonlySet`, `ReadonlyMap`, and readonly arrays, while target-to-source flow
  rejects mutation.
- `router-dynamic-pattern` captures router-resource `href` values produced by view-model methods returning a static
  route prefix with a runtime repeat-local hole, an external-link-like field, and a bare external-module boundary. It
  pressures evaluator string-pattern propagation, router recognition, and runtime-boundary repair planning without
  teaching semantic-runtime to classify arbitrary dynamic external links as internal routes.
  `pnpm --filter @aurelia-ls/semantic-runtime contract:router-dynamic-pattern` protects both sides of that split: the
  internal string-pattern link must materialize recognized route facts, while the bare external-module link must remain
  an explicit router open seam instead of being guessed as internal or reported as a router issue.
- `router-active-link-state` captures the two active navigation surfaces from the router docs: `RouterConfiguration`
  `activeClass` for low-boilerplate class-only styling, and `load`'s `active.bind` from-view handoff when application
  state genuinely needs active-route status. `pnpm --filter @aurelia-ls/semantic-runtime
  contract:router-active-link-state` protects router-options `activeClass`, `LoadCustomAttribute.active` target access,
  raw-property value-channel/data-flow rows, and ordinary `active.class` class-toggle rows.
- `router-eager-path-generation-errors` captures an object navigation instruction whose routeable component resolves to
  a child route with a missing required parameter. It preserves `RouteConfigContext._generateViewportInstruction`
  `rcEagerPathGenerationFailed` / `AUR3166` pressure without teaching authoring recipes to omit route params.
- `router-invalid-paths` captures route config paths that the framework route recognizer rejects during registration:
  reserved `$$residue` parameter usage and an invalid dynamic-parameter regex constraint. It preserves issue-product
  pressure without teaching the authoring API to generate those paths.
- `router-redirect-expression-errors` captures a redirect route whose `redirectTo` uses a sibling RouteExpression.
  Aurelia's route tree redirect-parameter migration rejects non-segment/non-scoped-segment expression nodes
  (`exprUnexpectedKind` / `AUR3502`), so this fixture preserves router issue-product pressure without teaching
  authoring recipes to generate ambiguous redirect expressions.
- `router-route-config-validation-errors` captures route config inputs that Aurelia's router validation rejects before
  route-context or route-recognizer materialization: a non-string `path` value and a null decorator config. It preserves
  `rtInvalidConfigProperty` / `AUR3554` and `rtInvalidConfig` / `AUR3555` pressure without teaching authoring recipes
  to generate invalid route metadata.
- `router-routeable-alias` captures a child route whose string routeable resolves through a side-effect-imported custom
  element and class-level `@alias(...)` metadata. It preserves evaluator side-effect import execution, resource alias
  convergence, and router string routeable lookup without teaching authoring recipes to prefer implicit side-effect
  registration over explicit routeable class references.
- `router-contextual-string-routeable` captures a parent route component whose `dependencies` array disambiguates a
  string child routeable when multiple custom elements share the same resource name. It preserves Aurelia's
  `resolveCustomElementDefinition(...)` dependency-scope lookup before root-container fallback without teaching
  authoring recipes to create duplicate custom-element names.
- `router-route-parameter-aggregation` captures nested routed components where parent and child route configs both use
  the same `:id` parameter name. It preserves `IRouteContext.getRouteParameters()` child-first/parent-first aggregation
  pressure, append/by-route strategy projection, recursive residual-route recognition, nested `RouteNode` /
  `ComponentAgent` projection, closed static query parameter inclusion with duplicate query keys, fragment propagation,
  and active route-node parameter value projection without teaching generated authoring recipes to prefer ambiguous
  repeated parameter names.
- `repeat-keyed-iterables` captures nested `repeat.for` locals whose iterable comes from nullable arrays and finite
  keyed records such as `Record<'one' | 'two', Item[]>`. It preserves the TypeChecker handoff needed for public plugin
  and app templates where a repeat local indexes a mapped record before a deeper child repeat reads item members.
- `runtime-ast-errors` captures call expressions whose TypeChecker-visible targets are not callable, missing `$host`
  context plus `$host` writeback rejected by Aurelia runtime, source-to-target increment mutation rejected by connectable
  `astEvaluate`, strict-mode nullish member/keyed access and assignment, missing value-converter and
  binding-behavior resources, duplicate binding-behavior application, repeat destructuring over non-object and
  non-Array item shapes, a string repeat source rejected by runtime-html's default repeat source categories, and repeat
  option syntax rejected by the `Repeat` constructor. It preserves the handoff from checker
  expression projection, compiler resource scope, repeat local/source projection, and runtime controller construction to
  exact Aurelia runtime `astEvaluate`/`astAssign`, runtime-html binding-utils, and runtime-html repeat diagnostics
  without teaching authoring recipes to generate those expressions.
- `runtime-observer-write-errors` captures target-side observer writes that Aurelia rejects after ObserverLocator has
  already selected a framework observer: source-to-target binding into a getter-only computed target (`AUR0221`) and a
  Map/Set `size` observer (`AUR0220`). It preserves the data-flow distinction between target observer selection and
  write-time framework failure without teaching authoring recipes to create readonly bindable targets. The same fixture
  now includes a setter-only target to prove that only getter descriptors enter the computed-observer branch; setter-only
  accessors remain runtime `SetterObserver` targets. It also carries a small SVG namespace-attribute target-access case:
  Aurelia's `xlink:*`/selected `xml:*` namespace table must route through `AttributeNSAccessor`, while SVG XML attributes
  outside that table remain generic SVG/data attributes. The plain `href.bind` case proves the accessor-time attr lane
  uses the framework `DataAttributeAccessor` mirror rather than an invented attribute-accessor strategy.
- `node-observer-strategy-errors` captures observer-forcing host-node bindings with `NodeObserverLocator.allowDirtyCheck`
  disabled. Known native node properties such as `id.two-way` and `href.two-way` should report the exact runtime-html
  `AUR0652` target-access diagnostic instead of reusing the accessor-only attr path.
- `node-observer-config-errors` captures AppTask-time `NodeObserverLocator` service customization, including duplicate
  built-in/global mappings (`AUR0653`) and a valid custom host-node observer configuration. The valid mapping is consumed
  by an observer-forcing binding mode so the fixture preserves the framework split between `getAccessor(...)` and
  `getObserver(...)` instead of pretending `useConfig(...)` rewrites every host-node property accessor.
- `select-multiple-binding-order` mirrors Aurelia runtime-html select observer tests where `multiple.bind="true"` can
  appear before, between, or after other bound attributes. It pressure-tests the value-channel handoff from bound
  `multiple` evidence into single, multiple, and dynamic `SelectValueObserver` modes, including a dynamic source that
  must accept both scalar option values and array-valued selection updates. It is covered by
  `contract:select-checked-value-channels` so the static/dynamic split remains explicit.
- `select-model-primitives` mirrors Aurelia forms docs/tests where `option model.bind="null"`, boolean option models,
  object-valued option models, and nullable radio `model.bind` values are framework-valid. It preserves primitive
  `model.bind` value-domain pressure so semantic-runtime does not flatten null/boolean/number model values into the
  string-only `valueDomain` lane. Its contract coverage also preserves the directional distinction between
  source-to-target synchronization acceptance and target-to-source option/model writeback domains.
- `runtime-html-au-compose-errors` captures static `AuCompose` bindable setter failures for invalid `scope-behavior`
  and `flush-mode` literals. It preserves the controller-owned handoff from compiler-lowered `SetPropertyInstruction`
  rows to exact runtime-html `AUR0805` / `AUR0809` diagnostics while leaving runtime composition/lifecycle errors out
  of this fixture.
- `au-compose-dynamic-composition` captures docs-shaped dynamic composition: a repeat-local model carries a custom
  element constructor into `<au-compose component.bind>` and the same local into `model.bind`, a static component name
  resolves through the parent container, promise-valued component/template inputs preserve the evaluator promise
  fulfillment lane, while sibling template-only compositions use a plain object view-model component and a non-resource
  class component. It pressures Aurelia's runtime-html composition controller semantics, candidate template analysis
  coverage, child-container handoff, object/class view-model composition, static component name resolution, and
  `activate(model)` boundary without claiming live recursive composed-child hydration. The fixture also includes a
  child custom element that receives a broad `Constructable`-typed widget kit through bindables and resolves a concrete
  component with `Array.find(...)` plus an instance method predicate. That preserves the substrate pressure where
  recursive rendering needs parent-to-child bound controller values, the static evaluator needs method-call `this`
  binding, and exact object literals should return `undefined` for absent properties instead of widening into unknown
  object shape.
- `runtime-html-spread-renderer-errors` captures a valid custom-element bindable spread beside `$element.spread` on the
  same custom element. It preserves the `SpreadValueRenderer` dispatch failure for `spreading_invalid_target` /
  `AUR0820` without making invalid spread targets part of generated authoring recipes.
- `runtime-html-ref-renderer-errors` captures valid `element.ref`, same-node custom-attribute ref, and same-node
  custom-element ref targets beside unsupported `view.ref`, controller ref on an ordinary element, named ref on an
  ordinary element, and a missing named target on a custom-element host. It preserves `RefBindingRenderer` target
  resolution for `not_supported_view_ref_api` / `AUR0750`, `ref_not_found` / `AUR0751`,
  `node_is_not_a_host` / `AUR0762`, and `node_is_not_a_host2` / `AUR0763` as renderer-owned failures before
  runtime-html creates a `RefBinding`.
- `runtime-html-view-factory-provider-errors` captures an ordinary custom attribute that resolves `IViewFactory`
  beside a template controller that resolves the same key legitimately. It preserves the runtime-html
  `ViewFactoryProvider.resolve()` not-ready branch (`AUR0755`) without teaching authoring recipes to inject
  template-controller-only context services into ordinary resources. The ordinary attribute also contains a nested
  class expression that resolves `IViewFactory`; that nested class is not activation-time execution and must not create
  a second provider-not-ready diagnostic.
- `synthetic-writeback-local` captures a two-way custom-attribute bindable that writes into a `$`-prefixed local such
  as `display-data.bind: $displayData`, then uses that local in later template scope. It preserves Aurelia's runtime
  writeback-local behavior without telling users to declare the synthetic local on their view-model.
- `template-compiler-errors` captures malformed classification, root `<template>` surrogate failures,
  projection/shadow-DOM slot failures, local-template shape failures, custom-attribute multi-binding, `<let>`, and
  command-owned template syntax that maps to exact Aurelia template-compiler `ErrorNames` authority. It preserves
  framework-error-code diagnostic and repair pressure without teaching authoring recipes to generate malformed syntax.
- `update-trigger-binding-behavior` captures valid and invalid built-in binding-behavior bind-time usage. It preserves
  runtime-html errors for `& updateTrigger`, `& signal`, `& self`, `& attr`, and double throttle/debounce rate limiting
  without teaching authoring recipes to generate those mistakes. It deliberately does not claim the custom
  `INodeObserverLocator` service-replacement failure.
- `target-subscriber-binding-behavior` captures two visible custom binding behaviors whose bind methods directly call
  `PropertyBinding.useTargetSubscriber(...)` on the same binding. It preserves the runtime-html
  `binding_already_has_target_subscriber` / `AUR9995` path without teaching authoring recipes to write custom target
  subscriber behaviors.
- `validation-rule-source-errors` captures source-authored validation rule mistakes: a `PropertyRule` modifier before
  any rule has been added, an accessor function that `parsePropertyName` cannot reduce, a group rule result that names
  a property outside the group, and default model-based rules with an unsupported rule key and an empty property name.
  It preserves validation `AUR4101`, `AUR4102`, `AUR4105`, `AUR4106`, and `AUR4108` pressure without teaching authoring
  recipes to generate invalid validation DSL inputs.
- `fetch-client-config-errors` captures closed @aurelia/fetch-client configuration mistakes: invalid
  `HttpClient.configure(...)` input and callback returns, `Headers` defaults, duplicate or non-tail retry interceptors,
  and invalid retry strategies/intervals. It preserves fetch-client `AUR5001`, `AUR5002`, `AUR5003`, `AUR5004`,
  `AUR5005`, `AUR5007`, and `AUR5008` pressure without teaching authoring recipes to generate invalid HTTP client
  configuration.
- `dialog-source-errors` captures source-visible @aurelia/dialog mistakes: registering bare `DialogConfiguration`
  without a renderer-providing customization, and opening a dialog with settings that provide neither `component` nor
  `template`, and resolving a child dialog service key that has no visible `withChild(...)` settings registration. It
  preserves dialog `AUR0904`, `AUR0903`, and `AUR0910` pressure without teaching authoring recipes to generate invalid
  dialog configuration or service calls.
- `sanitize-value-converter-default` captures the built-in `sanitize` value converter used without an app-provided
  `ISanitizer` resolver. It preserves the runtime-html default sanitizer `method_not_implemented` / `AUR0099` path
  without teaching authoring recipes to rely on the throwing default sanitizer.
- `sanitize-value-converter-custom` captures the same built-in converter with an app-provided `ISanitizer` resolver.
  It preserves the DI suppression side of the sanitize diagnostic so semantic-runtime does not report the default
  sanitizer error after a modeled interface registration.
- `resource-metadata-errors` captures source-proved resource and controller-hydration failures, including bindable
  decorator misuse, process-content hook misuse, watch metadata errors, containerless shadow/slot conflicts, and
  bindable observer setup against collection observer branches. It preserves exact runtime-html controller/resource
  framework-code pressure without making those shapes authoring ideals.
- `resource-definition-api-errors` captures direct runtime-html resource API calls that the framework rejects:
  `CustomElementDefinition.create(...)` with only a string name, and `getDefinition(...)` calls against a project-local
  non-resource class. It preserves the resource API issue lane for `AUR0151`, `AUR0152`, `AUR0759`, `AUR0760`, and
  `AUR0761` without recommending direct definition API usage.
