# DI

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

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
- Answering consumer-specific confidence/ranking questions for IDE or MCP responses.
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
  default resolver, but the tooling model has not yet spent that pressure into slots, claims, derivations, or seams.
- `createChild(...)` and `useResources(...)` require caller-owned factories for child containers and inherited resource
  slots. The runtime creates those rows directly; the product model must mint fresh handles, provenance, and child-owned
  slot products before mutating emulator state.

`Container` is intentionally a live emulator frame, not a durable kernel record. Durable app-map facts still flow
through handles, provenance, materialized products, claims, derivations, and open seams. The mutable maps inside
`Container` let DI world construction behave like the runtime while producers decide which effects become stored
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
  as lookup/activation pressure for now. They should become explicit products or seams when the producer that needs
  them arrives.
- Resource inheritance should not reuse parent slot products as child-owned facts. The DI producer that applies
  inheritance must create child slot products with their own provenance.
- Runtime `deregister(...)` is intentionally not mirrored in the container emulator yet. It primarily serves HMR plugin
  flows, and modeling it now would pull teardown/resource-removal policy into the first DI world-construction pass.
