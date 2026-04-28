# Registration

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

Registration is the admission layer for values passed to Aurelia's container registration machinery.

It consumes evaluated source values, resource definitions, and configuration admission records, then emits normalized
registration observations and products. DI world construction later spends those products into container state,
resource lookup tables, resolver slots, and dependency availability.

## Responsibilities

- Recognize `Registration.instance`, `singleton`, `transient`, `callback`, `cachedCallback`, `aliasTo`, and `defer`.
- Recognize direct `container.register(...)` and `aurelia.register(...)` argument shapes.
- Recognize `IRegistry` objects and `register(container, ...params)` methods without executing arbitrary code.
- Recognize resource definition registration, static `$au` resource registration, resource aliases, and plain class
  self-registration.
- Preserve key, registered value, resolver strategy, admission source, and field provenance as kernel-backed facts or
  products.
- Emit open seams for dynamic keys, dynamic registered values, object maps, spreads, callback bodies, and unsupported
  registry shapes.

## Non-Responsibilities

- Building container state or answering lookups.
- Invoking constructors, callbacks, getters, setters, async flows, or lifecycle hooks.
- Performing resource definition convergence.
- Ranking candidate registrations for IDE or MCP answers.

## Runtime Grounding

The kernel `Container.register(...)` accepts a wide admission surface:

- `IRegistry` values delegate to `register(container)`.
- metadata-backed resource definitions delegate to `ResourceDefinition.register`.
- static `$au` resource classes produce resource keys and aliases, plus a singleton self-registration if needed.
- ordinary classes fall back to singleton self-registration.
- object maps are recursively registered by value.

The tooling model should represent those as registration products and seams, not as immediate container mutations.
That keeps registration analyzable before DI world construction exists.

## Watchpoints

- Registration vocabulary uses explicit kernel slots for claim predicates, seam kinds, and product kinds. Resolver
  strategies and admission kinds should stay registration model fields unless a real producer or query needs a stable
  vocabulary key.
- A registration product should distinguish source admission from runtime consequence. `container.register(Foo)` is
  an observation; the later resolver/resource table rows are DI world products.
- Avoid generic value escape hatches. If key or registered-value shape matters, model it as a typed registration field
  with provenance or leave an open seam.

## Current Shape

`registration-observation.ts` is the AST-bearing layer. It records source carriers such as `Registration.*` calls,
`container.register(...)`, static resource admission, object-map entries, and `IRegistry.register(...)` methods.

`registration-reference.ts` is the source-level reference layer. It names target keys, receiving containers, and
registered values without retaining TypeScript nodes in durable records.

`registration-admission.ts` is the product model. A `RegistrationAdmission` is normalized intent before DI world
construction. It can point at a modeled DI key identity, a registered value reference, a container/app boundary, and
field provenance.

DI key identities are split in the kernel by runtime key shape: class, interface symbol, string, symbol, resource,
resolver, or unknown. Producers should use those records rather than hiding key semantics in descriptions.
