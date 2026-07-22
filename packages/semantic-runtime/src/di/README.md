# DI

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

DI is the world-construction layer that spends configuration and registration products into abstract container state.

Registration products are not container-owned. `Registration.instance(...)`, `Registration.defer(...)`, and an
`IRegistry` value can exist before any container receives them. A container relationship begins when configuration,
`container.register(...)`, `aurelia.register(...)`, registry execution, or default registration policy applies a
registration admission to a modeled container.

## Responsibilities

- Model abstract Aurelia containers, parent/root relationships, and source/app boundaries.
- Model the operation of applying registration admissions to a container.
- Model container-owned resolver, resource, and factory slots before lookup answers consume them.
- Emulate the runtime container's public methods over typed products and execute evaluator-known registry functions only
  when the configuration path proves the call. Do not execute user constructors, callbacks, getters, lifecycle hooks,
  transformers, or unresolved registry bodies.
- Preserve provenance for which source/configuration fact created a container, applied a registration, or produced a
  slot.
- Leave open seams for dynamic registration, unresolved keys, registry bodies that cannot be interpreted, custom default
  resolver bodies, and unsupported container APIs.

## Non-Responsibilities

- Recognizing resource metadata or registration source carriers.
- Executing constructors, callbacks, getters, lifecycle hooks, or arbitrary registry code.
- Answering consumer-specific confidence/ranking questions for IDE or tooling responses.
- Compiling templates or deciding template scope visibility.
- Modeling HMR/teardown behavior. Runtime `deregister(...)` is intentionally omitted until HMR or hot-swap analysis
  becomes an active product surface.

## Runtime Grounding

The runtime `Container` owns three important stores: `_resolvers`, `res`, and `_factories`. It also tracks disposable
resolvers, parent/root relationships, and `ContainerConfiguration`. `register(...)` admits registries, resource
definitions, static `$au` classes, enumerable recursive carriers, and plain classes. `registerResolver(...)` mutates `_resolvers` and
mirrors resource keys into `res`. Factory lookup is shared across the root container tree. Every container constructor
also installs an `IContainer` self resolver that resolves to the requestor.

The tooling model keeps those consequences distinct:

- `Container` names the abstract container itself.
- The runtime `IContainer` interface symbol is emitted as an interface DI key identity. `ContainerSelfResolverSlot` is
  the per-container row that makes that key resolve to the requestor.
- `ContainerConfiguration` names the runtime-shaped configuration policy.
- `ContainerRegistrationOperation` names the act of spending an admission against a container.
- `Resolver` names a runtime-shaped resolver value. Its `resolve(...)`, `register(...)`, and `getFactory(...)` methods
  return product answer records or apply caller-supplied slots; they do not execute callbacks or constructors.
  `ResolverStrategy` mirrors the framework's numeric resolver strategies (`instance`, `singleton`, `transient`,
  `callback`, `array`, and `alias`) rather than the higher-level registration strategy vocabulary. Cached callbacks
  remain callback resolvers with cached state; unsupported strategy values produce exact `invalid_resolver_strategy`
  (`AUR0005`) authority.
- `InstanceProvider` names the contextual resolver Aurelia uses for already-created controller, host, hydration, and
  app-root values. Its `resolve(...)` answer carries `no_instance_provided` authority when the provider is read before
  `prepare(...)` or after `dispose(...)`. Exact `Aurelia` facade construction is its first application-owned producer:
  it publishes the prepared `IAurelia`/`Aurelia` providers and the shared initially-empty `IAppRoot` provider through
  ordinary resolver slots, then each `AppRoot` construction prepares that shared root provider. These products belong
  to the constructor operation and must not be reconstructed during DI world spending.
- `RegistryValue` and `ParameterizedRegistry` name runtime-shaped registry values. Their `register(...)` methods expose
  whether registration would delegate, admit parameters directly, or remain open for evaluator-driven body analysis.
  Candidate-local registry execution uses evaluation-owned `executeStaticFunctionEffects(...)`; DI contributes exact
  registry/container identities and container-call spending, not a separate branch interpreter.
- `ContainerResolverSlot`, `ContainerSelfResolverSlot`, `ContainerResourceSlot`, and `ContainerFactorySlot` name the
  resulting container-owned rows. Resolver slots keep the modeled resolver object when one exists; this mirrors
  Aurelia's resolver map closely enough for `Container.getFactory(...)` to consult resolver state before deciding that a
  non-constructable key has reached `unable_jit_non_constructor`.
  Framework registration effects must preserve this distinction: ValidationHtmlConfiguration registers
  `IValidationController` through `container.registerFactory(...)`, so world construction emits a
  `ContainerFactorySlot` rather than pretending that factory registration is a resolver slot.
- `DiIssue` names source-backed container/world-construction issues. Duplicate source/static `$au` resource-key
  publication models the Aurelia kernel `resource_already_exists` warn/skip path as a warning issue; resolver-backed
  resource-key throws are a separate `registerResolver(...)` path and should not be conflated with this issue product.
  Runtime-html resource-definition duplicates (`element_existed`, `attribute_existed`, `value_converter_existed`, and
  `binding_behavior_existed`) are published as `ResourceIssue` resource-registration warnings instead, because the
  framework source owns those checks in the runtime-html definition registrars. Source-backed ambient `resolve(...)` sites that run during module evaluation or static class
  initialization model the kernel `no_active_container_for_resolve` throw path as error issues. Instance
  field/constructor sites are container-activation contexts; they can spend `null_undefined_key` when an authored
  resolve argument is statically nullish, but ordinary functions/methods remain caller-dependent topology facts.
  Source decorators that call Aurelia's `inject(...)` helper model `invalid_inject_decorator_usage` when the target is
  a method, getter, setter, or accessor rather than a class or field. Decorator target names spend the shared
  `type-system/decorator-target.ts` helper, the same source-target substrate used by observation and plugin decorator
  diagnostics. Direct source calls to an Aurelia `IContainer`
  receiver enter through `DiContainerApiCallSite`; only method-local failures whose framework outcome is independent of
  modeled container state should become issues there, such as `invoke(Array)` and `getFactory(Array)` spending `no_construct_native_fn`,
  key-validating container APIs spending `null_undefined_key`, and direct fresh object keys spending
  `unable_jit_non_constructor` after a guaranteed resolver/factory miss. When the receiver can be traced to
  `DI.createContainer({ defaultResolver: DefaultResolver.none })`, constructable `get(...)` and auto-registering
  `getResolver(...)` calls can also spend `none_resolver_found` because the framework reaches the configured default
  resolver after the earlier JIT key-shape guards have passed. Fresh `DI.createContainer().get(Registry)` calls can
  spend `null_resolver_from_register` (`AUR0011`) only when the key is a statically visible registry and its
  `register(...)` body is source-proven to return `null` or `undefined` instead of registering a resolver.
  Fresh `DI.createContainer().get(newInstanceOf(IFoo))` / `newInstanceForScope(IFoo)` calls can spend
  `invalid_new_instance_on_interface` (`AUR0017`) only when the wrapped key is a statically visible Aurelia interface
  created without a default registration callback.
- `ContainerLookupKey` names the runtime-facing DI key request passed to container lookup/factory/invoke APIs. It keeps
  the durable identity handle separate from the key-shape branch Aurelia uses for JIT registration, native-function
  construction checks, resolver keys, interface symbols, resource/string/symbol keys, and unknown values.
- `DiContainerKeyExpressionIdentityKind` is source-local runtime identity evidence. Stable references can be registered
  elsewhere and are usually container-state dependent; direct object/array literals create fresh identities at the call
  site, so they can prove some miss-then-fail branches without a whole container-state join.
- `ContainerResolverLookup`, `ContainerFactoryLookup`, `ContainerInvocation`, and `ContainerResourceLookup` are answer
  records returned by the emulator methods. They do not create kernel facts by themselves. Keep invoke separate from
  factory lookup: framework `invoke(...)` applies its native-function guard and then directly activates the constructor;
  it does not spend JIT/factory diagnostics for non-function values. Framework `Resolver.resolve(...)` also has a
  `no_factory` guard for custom `IContainer` implementations whose `getFactory(...)` returns null; semantic-runtime's
  modeled stock `Container` returns a factory lookup or an earlier framework failure instead, so that guard is not a
  source diagnostic today.
- `DiResolveCallSite` names import-aware source calls to Aurelia's ambient `resolve(...)` helper. It records the
  consuming class/member, member kind/staticness, execution context, active-container expectation, admitted source-file
  handle, source span, key
  expression, nullish key arguments, TypeChecker declaration when the key belongs to the opened project, and authored
  import identity when the key comes from framework/plugin packages. It is a source/type recognition surface for authoring and diagnostics;
  turning those sites into resolved container answers still belongs to controller hydration/activation semantics because
  the runtime helper depends on the currently active container.
  Member ownership is still useful before full activation emulation: class fields initialized from direct
  `resolve(ClassKey)` calls can ground later source reads and calls into an evaluator-local injected class when the
  static evaluator is already executing an instance/member frame with `this`. Registered interface keys join through
  `RuntimeBindingSourceActivationContext` when binding-source evaluation also has an active modeled container; wrapper
  keys and unsupported resolver branches still belong to the DI world and activation model, not generic host guesses.
- `DiInjectDecoratorSite` names import-aware `@inject`-family decorator sites that the kernel decorator will reject.
  It currently claims only TC39 decorator contexts whose runtime `context.kind` maps to method/getter/setter/accessor;
  legacy parameter decorators are deliberately not claimed as mapped framework errors.
  Source-backed DI issue scanners must carry boot-admitted source-file handles on their site records and publish spans
  through `sourceSpanAddressForSite(...)`; do not re-resolve spans from filenames when the scanner already owns the
  project source admission.
- `ContainerLookupState.JitRegistration` names the `_jitRegister` boundary: runtime would execute a registry or
  default resolver, but the tooling model has not yet spent that pressure into slots, claims, or seams. Failed lookup
  records carry exact framework error authority for the branches the container itself can decide:
  `unable_jit_non_constructor`, `no_jit_intrinsic_type`, `no_jit_interface`, and `no_construct_native_fn`. Those are
  lookup facts first; they should become `DiIssue` products only when a caller owns a concrete lookup with enough
  container state to know the framework would throw.
  `unable_resolve_key` (`AUR0008`) is intentionally unclaimed for the stock modeled container because Aurelia's
  ordinary `Container.get(...)` loop returns from resolver hits, root misses, and JIT/default-registration paths before
  that trailing defensive throw.
- `createChild(...)` and `useResources(...)` require caller-owned factories for child containers and inherited resource
  slots. The runtime creates those rows directly; the product model must mint fresh handles, provenance, and child-owned
  slot products before mutating emulator state.

`Container` is intentionally a live emulator frame, not a durable kernel record. Durable app-map facts still flow
through handles, provenance, materialized products, claims, and open seams. The mutable maps inside
`Container` let DI world construction behave like the runtime while materializers decide which effects become stored
kernel records.

## DI Key Identity

`DiKeyIdentityEmitter` is the sole publication authority for durable DI key identity. Authored key occurrences retain
their own source addresses and provenance, but aliases and re-exports of the same runtime key converge on one semantic
identity. Interface friendly names are presentation only and must never be used as equality keys.

Identity family and container behavior are separate axes. `DiKeyIdentityKind` records JavaScript/runtime equality
identity such as interface object, constructable declaration, string, primitive, symbol, resource, resolver wrapper, or
unknown object. `ContainerLookupKeyKind` records the branch Aurelia's container would take for lookup/JIT behavior. A
constructable with a static `register(...)` method therefore remains a constructable identity even though lookup treats
it as a registry.

Framework and plugin effects resolve public package exports through `TypeSystemProject` and then use the same
declaration identity authority as authored keys. A support-owned key that is private to a package, or whose declaration
cannot be proven, remains an explicit `UnknownDiKeyIdentity`; do not recover it by friendly name. Framework intrinsics
such as `IContainer` and `ITemplateCompiler` retain their canonical cross-package identities.

## Watchpoints

- Do not put container ownership back onto registration products. Ownership belongs to DI operations and slots.
- Runtime IDs are not durable identities. Container identity must come from source/app boundaries, parent/root
  relationships, or explicit tooling synthesis.
- `IContainer` is both a runtime interface key and a service-locator contract. Keep its key/self-resolver behavior
  explicit; do not flatten it into the generic container model.
- `ParameterizedRegistry` and generic `IRegistry` products should stay container-free until their `register(...)`
  behavior is spent against a specific container.
- Auto-registration, constructor invocation, transformers, and custom default resolvers remain lookup/activation
  pressure. Evaluator-known registry functions may be spent only from path-proven calls; unresolved or arbitrary
  registry/default-resolver bodies remain open. The stock `DefaultResolver.none`/`singleton`/`transient` policies are
  modeled as `ContainerConfiguration` policy.
- Do not cite `unable_jit_non_constructor` from syntax alone. `Container.register(...)` legitimately accepts object maps,
  and stable key expressions remain container-state dependent. Direct fresh object keys are the current exception because
  the source expression proves the runtime identity cannot already be in a resolver/factory map.
- Known framework registration effects may feed adjacent product layers without DI executing arbitrary framework code.
  Attribute-pattern parser inputs and binding-command executables consume the same configured syntax catalogs for
  compiler-world purposes. Runtime stores them through different mechanisms for performance, but the product model
  treats framework syntax as effectively app-global and frozen after configuration. Framework resource headers are
  still spent into `ContainerResourceSlot` products for ordinary resource lookup.
- Framework DI effect packages own their modeled resolver/factory/task rows and residual **DI** coverage only. Resource,
  syntax, renderer, compiler-world, and app-task materializers own closure for their own product families. In particular,
  closed StandardConfiguration catalogs do not imply complete DI provider or coercion-configuration replay. Logger sink
  selection and Validation-I18n customization remain explicitly open because those authored options can change DI rows;
  Style's known creating task is closed. Publication consumes the shared DI effect result rather than maintaining a
  second per-kind openness switch.
- Resource inheritance should not reuse parent slot products as child-owned facts. The DI constructor that applies
  inheritance must create child slot products with their own provenance.
- Runtime `deregister(...)` is intentionally not mirrored in the container emulator yet. It primarily serves HMR plugin
  flows, and modeling it now would pull teardown/resource-removal policy into app-world construction.

## Implementation Shape

`world-constructor.ts` is the app-world spending pass. It consumes the typed products emitted by configuration
recognition, reads each modeled container's constructor-owned `IContainer` self resolver, mutates the live container
emulator frames, and decides which configuration-owned registration admissions are spent against which container.
Root and child container materializers both publish that self resolver when they create the container; world
construction must not recreate it as a backup path.

`world-publication.ts` owns the shared DI publication primitives used during that spending: source/provenance/open-seam
records, resolver products and resolver slots, resource slots, source-backed DI issue products,
registry/parameterized-registry products, framework-created AppTask products, and `IContainer` self-resolver slots.
`DiKeyIdentityEmitter` owns key identity emission used by that layer and by authored registration paths. Keep these
product/source/claim envelopes and the key authority shared instead of rebuilding them inside the world-construction
traversal.

When DI spends a registration admission that is already open, the operation materialization retains the admission's
exact open-seam handle. DI publishes another seam only when it discovers a new DI-owned blocker such as an unknown
receiving container or an otherwise closed admission that cannot produce a slot. Do not translate registration reasons
into parallel generic DI reasons.

Capability admission spends that same materialization path before treating a seam as a blocker. A residual tied only
to known framework admissions can block the capabilities those admissions carry; it cannot make unrelated plugin
capabilities unknown merely because they share a container. Open or user-authored admissions remain conservatively
unconstrained because they may still publish any DI key.

Plugin, builder, registry-body, and standalone container-registration sequences can exist without being attached to an
app root. A registration is spent only when its exact receiving container is known. Source-created standalone containers
therefore own their own operations and providers, while an unmapped receiver preserves
`di.open-registration-spending` / `di-registration-container-open` pressure. Neither case is silently reassigned to a
nearby app root or promoted into a world-global provider.

Recursive registry-body spending is owned by `DiRegistrationSpendingCascade`. The cascade is a construction-time
traversal object that owns the active-admission stack and admission lookup while each per-admission
`DiRegistrationSpendingCascadeFrame` gathers the direct registration operation, any recursively spent registry-body
operations, their emitted resolvers/registries/slots/tasks, and open seams before handing the aggregate back to the
world construction frame. Each cascade entry receives the exact evaluator value admitted at that occurrence. Registry
execution then supplies occurrence-local nested values and preserves execution order through monotonically ordered
`ContainerRegistrationOperation` products. This keeps recursive spending as one DI-owned traversal instead of
scattering local accumulator arrays or reconstructing arguments from final module state through the materializer.
Re-entering the same admission inside the same cascade models Aurelia's registration-depth guard and publishes
`unable_auto_register` (`AUR0006`) instead of silently dropping the recursive branch.

The current spending path is intentionally narrow but end-to-end:

- resolver-producing admissions with closed admitted keys become runtime-shaped `Resolver` products and
  `ContainerResolverSlot` products;
  constructable factory values such as `Registration.singleton(IFoo, Foo)` retain the implementation declaration
  identity so later activation reads can map the resolver value back to an evaluator-local class;
- callback and cached-callback resolver admissions are closed at registration time. Their callback bodies are not
  executed while constructing the container world; a later activation/dependency inquiry should inspect those bodies if
  it needs service-locator reads or produced-value flow.
- known framework resource catalog admissions become `ContainerResourceSlot` products keyed by
  `au:resource:<type>:<name>`, including alias keys such as `hide` for `show`;
- i18n framework effects spend into resource headers, translation syntax/renderers, resolver slots for
  `I18nInitOptions`, `II18nextWrapper`, and `I18N`, plus the activating AppTask that observes `I18N.initPromise`;
- router framework effects spend into concrete resolver slots for `IBaseHref`, `IRouterOptions`, `RouterOptions`, and
  `IRouter`, plus deferred AppTask products for the creating/hydrated/activated/deactivated lifecycle hooks exposed by
  `RouterConfiguration`;
- state framework effects spend into the `state` resource/syntax/renderer catalogs, an `IStoreRegistry` resolver slot,
  and the creating AppTask that receives `IContainer`; the default `Store`/`IStore` instance registration stays inside
  that deferred task callback rather than being pre-installed into the configuration-time container world. The
  `state` package materialization layer separately publishes `StateDefaultConfiguration` store-configuration products
  from builder contributions so plugin-backed state is queryable before the deferred task executes;
- every spent admission produces a `ContainerRegistrationOperation` product and a `di.accepts-registration` claim;
- AppTask admissions additionally retain `RegisteredAppTask` evidence only when spent. Source-created tasks preserve
  the exact evaluator slot/key/callback value and receiving container for that occurrence; framework-minted tasks remain
  explicit definitions without fabricated source evaluation. Neither form executes the lifecycle callback during world
  construction;
- registration operations point at their emitted resolver, registry, AppTask, and slot products through `di.produces-product`
  claims;
- resolver products, resolver slots, and resource slots produce `di.provides-key` claims;
- `container-chain.ts` is the read-only chain helper for consumers that need provider visibility. It projects the typed
  `Container` frames and their resolver/resource slots from the exact `DiWorldConstructionEmission`, then extends that
  immutable projection with runtime child containers as later phases create them. It must not reconstruct those facts by
  scanning generic identity, claim, or materialization records;
- duplicate source/static `$au` resource-key publication produces a `DiIssue` product and skips the incoming slot,
  matching the framework's kernel warning path for `AUR0007`; duplicate runtime-html definition registration produces
  `ResourceIssue` warnings (`AUR0153`-`AUR0156`) instead;
- ambient `resolve(...)` calls in module/static evaluation contexts produce `DiIssue` products for `AUR0016`; instance
  activation calls with statically nullish key arguments produce `AUR0014`; caller-dependent contexts stay visible in
  `DiResolveCallSite` / app topology rows without spending exact framework error authority;
- source-visible singleton activation cycles reached from a concrete `container.get(...)` entry point produce
  `cyclic_dependency` (`AUR0003`) when the DI graph is closed through interface singleton providers and instance-time
  `resolve(...)` dependencies. `Resolver.resolve(...)` itself is a pure abstract lookup answer and does not carry a
  mutable resolving flag or cached factory: those fields would make speculative reads order-dependent without actually
  executing activation. Cycle authority stays in `DiDependencyCycleIssueMaterializer`, which owns the provider and
  activation graph needed to prove re-entry;
- resolver-wrapper calls such as `newInstanceOf(...)` are recognized as resolver keys. Exact `AUR0017` is currently
  claimed only for fresh stock container API entries; ambient `resolve(newInstanceOf(...))` remains activation/container
  state dependent until controller activation can join the active container with interface registration state.
- `@inject`-family decorators on methods, getters, setters, and accessors produce `AUR0022`; class and field
  decorators remain valid injection metadata carriers, and legacy parameter decorators are not claimed by this lane;
- `Registration.defer(...)` and generic `IRegistry` admissions become runtime-shaped registry products. Path-proven
  evaluator-known bodies spend recursively against the receiving container; unresolved bodies retain open seams.
- open registration admissions produce only the container operation and an open DI seam. They are preserved as
  registration pressure rather than being treated as resolver rows. Each seam also retains its exact admission and
  receiving-container locus so later capability admission can distinguish chain-local uncertainty from world-wide
  uncertainty without reconstructing publication topology.

`world-constructor.ts` remains the typed emission envelope for callers that need the live container emulator frames,
operation products, produced slots, resolver products, and open seams before inquiry projections exist.
