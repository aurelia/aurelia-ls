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
- `module-loader-invalid-transform-input` captures `aliasedResourcesRegistry(...)` being given a statically closed
  primitive module input. It preserves kernel `ModuleLoader` `invalid_module_transform_input` / `AUR0021` pressure in
  the evaluation issue lane without teaching authoring recipes to generate invalid registry module inputs.
- `computed-decorator-contexts` captures valid getter/method `@computed(...)` usage beside field, setter, and auto-accessor
  call-form targets. It preserves runtime `computed_not_getter` / `AUR0228` as an observation source issue without
  claiming the different bare `@computed` direct-method overload path.
- `weak-owner-repair-planning` captures a repeat local whose iterable owner is unresolved, then reads multiple members
  from that local. It exists to pressure repair planning around the difference between the diagnostic member span and
  the scope slot that actually needs typing.
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
- `observable-decorator-contexts` captures valid field `@observable` carriers next to invalid class, method, getter,
  and auto-accessor decorator forms. It preserves runtime `invalid_observable_decorator_usage` / `AUR0224` pressure in
  the observation source-issue lane without treating `@observable` as resource metadata.
- `ast-track-decorator-contexts` captures a valid method `@astTrack` next to an invalid field decorator form. It
  preserves runtime `ast_track_decorator_not_a_method` / `AUR0117` pressure in the observation source-issue lane without
  teaching authoring recipes to decorate non-method members.
- `router-dynamic-pattern` captures router-resource `href` values produced by view-model methods returning a static
  route prefix with a runtime repeat-local hole, an external-link-like field, and a bare external-module boundary. It
  pressures evaluator string-pattern propagation, router recognition, and runtime-boundary repair planning without
  teaching semantic-runtime to classify arbitrary dynamic external links as internal routes.
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
  write-time framework failure without teaching authoring recipes to create readonly bindable targets.
- `select-multiple-binding-order` mirrors Aurelia runtime-html select observer tests where `multiple.bind="true"` can
  appear before, between, or after other bound attributes. It pressure-tests the value-channel handoff from bound
  `multiple` evidence into single, multiple, and dynamic `SelectValueObserver` modes, including a dynamic source that
  must accept both scalar option values and array-valued selection updates.
- `runtime-html-au-compose-errors` captures static `AuCompose` bindable setter failures for invalid `scope-behavior`
  and `flush-mode` literals. It preserves the controller-owned handoff from compiler-lowered `SetPropertyInstruction`
  rows to exact runtime-html `AUR0805` / `AUR0809` diagnostics while leaving runtime composition/lifecycle errors out
  of this fixture.
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
  template-controller-only context services into ordinary resources.
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
