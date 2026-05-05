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
- Emulate the runtime container's public methods over typed products without executing user constructors, callbacks,
  transformers, or registry bodies.
- Preserve provenance for which source/configuration fact created a container, applied a registration, or produced a
  slot.
- Leave open seams for dynamic registration, unresolved keys, registry bodies that cannot be interpreted, default
  resolver policy, and unsupported container APIs.

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
definitions, static `$au` classes, object maps, and plain classes. `registerResolver(...)` mutates `_resolvers` and
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
- `RegistryValue` and `ParameterizedRegistry` name runtime-shaped registry values. Their `register(...)` methods expose
  whether registration would delegate, admit parameters directly, or remain open for evaluator-driven body analysis.
- `ContainerResolverSlot`, `ContainerSelfResolverSlot`, `ContainerResourceSlot`, and `ContainerFactorySlot` name the
  resulting container-owned rows.
- `ContainerResolverLookup`, `ContainerFactoryLookup`, and `ContainerResourceLookup` are answer records returned by
  the emulator methods. They do not create kernel facts by themselves.
- `ContainerLookupState.JitRegistration` names the `_jitRegister` boundary: runtime would execute a registry or
  default resolver, but the tooling model has not yet spent that pressure into slots, claims, or seams.
- `createChild(...)` and `useResources(...)` require caller-owned factories for child containers and inherited resource
  slots. The runtime creates those rows directly; the product model must mint fresh handles, provenance, and child-owned
  slot products before mutating emulator state.

`Container` is intentionally a live emulator frame, not a durable kernel record. Durable app-map facts still flow
through handles, provenance, materialized products, claims, and open seams. The mutable maps inside
`Container` let DI world construction behave like the runtime while materializers decide which effects become stored
kernel records.

## Watchpoints

- Do not put container ownership back onto registration products. Ownership belongs to DI operations and slots.
- Runtime IDs are not durable identities. Container identity must come from source/app boundaries, parent/root
  relationships, or explicit tooling synthesis.
- `IContainer` is both a runtime interface key and a service-locator contract. Keep its key/self-resolver behavior
  explicit; do not flatten it into the generic container model.
- `ParameterizedRegistry` and generic `IRegistry` products should stay container-free until their `register(...)`
  behavior is spent against a specific container.
- Auto-registration, constructor invocation, transformers, custom default resolvers, and registry bodies are surfaced
  as lookup/activation pressure for now. They should become explicit products or seams when the materializer that needs
  them arrives.
- Known framework registration effects may feed adjacent product layers without DI executing arbitrary framework code.
  Attribute-pattern parser inputs and binding-command executables consume the same configured syntax catalogs for
  compiler-world purposes. Runtime stores them through different mechanisms for performance, but the product model
  treats framework syntax as effectively app-global and frozen after configuration. Framework resource headers are
  still spent into `ContainerResourceSlot` products for ordinary resource lookup.
- Resource inheritance should not reuse parent slot products as child-owned facts. The DI constructor that applies
  inheritance must create child slot products with their own provenance.
- Runtime `deregister(...)` is intentionally not mirrored in the container emulator yet. It primarily serves HMR plugin
  flows, and modeling it now would pull teardown/resource-removal policy into app-world construction.

## Implementation Shape

`world-constructor.ts` is the app-world spending pass. It consumes the typed products emitted by
configuration recognition, installs each modeled container's built-in `IContainer` self resolver, then spends
configuration-owned registration admissions against the sequence's root container.

The current spending path is intentionally narrow but end-to-end:

- resolver-producing admissions with closed admitted keys become runtime-shaped `Resolver` products and
  `ContainerResolverSlot` products;
- known framework resource catalog admissions become `ContainerResourceSlot` products keyed by
  `au:resource:<type>:<name>`, including alias keys such as `hide` for `show`;
- every spent admission produces a `ContainerRegistrationOperation` product and a `di.accepts-registration` claim;
- registration operations point at their emitted resolver, registry, and slot products through `di.produces-product`
  claims;
- resolver products, resolver slots, and resource slots produce `di.provides-key` claims;
- `Registration.defer(...)` and generic `IRegistry` admissions become runtime-shaped registry products plus open seams
  until registry-body interpretation and recursive parameter spending are modeled.
- open registration admissions produce only the container operation and an open DI seam. They are preserved as
  registration pressure rather than being treated as resolver rows.

`world-construction.ts` is the typed emission envelope for callers that need the live container emulator frames,
operation products, produced slots, resolver products, and open seams before inquiry projections exist.
