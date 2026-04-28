# Registration

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
- Preserve key, payload, resolver strategy, admission source, and field provenance as kernel-backed facts or products.
- Emit open seams for dynamic keys, dynamic payloads, object maps, spreads, callback bodies, and unsupported registry
  shapes.

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

- Registration vocabulary will pressure the kernel vocabulary split. Predicate keys, seam kinds, rule kinds, product
  kinds, and resolver strategy names are different contracts.
- A registration product should distinguish source admission from runtime consequence. `container.register(Foo)` is
  an observation; the later resolver/resource table rows are DI world products.
- Avoid generic payload escape hatches. If key or payload shape matters, model it as a typed registration field with
  provenance or leave an open seam.
