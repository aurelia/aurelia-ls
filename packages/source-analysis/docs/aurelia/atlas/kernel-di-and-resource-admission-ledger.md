# Kernel DI and Resource Admission Ledger

Local port of the Atlas ledger with the same name.
Only the sections currently spent by the export semantic surface ledger are
included here.

## Key World

Kernel keys are not only resource names.

The key surface includes:

- property keys
- objects
- constructables
- interface symbols
- resolvers themselves
- resource keys (`au:resource:*`)

Important facts:

- `DI.createInterface(...)` creates interface-symbol keys with optional default
  registrations
- resource keys are string-encoded and semantically distinct from generic
  constructable or symbol keys

## Resolver Strategies and Helper Layer

Kernel defines a small set of registration/resolution strategies:

- instance
- singleton
- transient
- callback
- alias
- array aggregation when multiple resolvers land on the same key

Important facts:

- this is the real base registration vocabulary for later subject modeling
- it is more structural than the user-facing decorator sugar layered on top
- `cachedCallback` is callback registration with memoization, not a separate
  primitive strategy

Kernel also exposes a helper layer that changes consumer-side resolution
behavior without introducing new base resolver strategies.

Representative helper surfaces include:

- `all`
- `lazy`
- `optional`
- `factory`
- `own`
- `resource`
- `optionalResource`
- `allResources`
- `newInstanceForScope`
- `newInstanceOf`

These helpers matter because they shape visibility topology and later resource
or service consumption law.

## Container Topology

### Generic DI Lookup

Generic `get` / `getResolver` walk the ancestor chain until root.

### Resource Visibility

`find(kind, name)` / `find(key)`:

- check the current container resource table first
- then check root
- skip intermediate ancestors

This distinction is load-bearing.

### Own-Only Visibility

Kernel also exposes an own-container-only regime through helper surfaces such
as `own(...)`.

The clean-room model should preserve at least three lookup regimes:

- ancestor-walking generic DI
- current-plus-root resource visibility
- own-container-only visibility

### Child Containers

`createChild(...)` creates a new container world.

Important current pressure:

- `inheritParentResources: true` copies parent resource resolvers into the new
  child current world
- otherwise resource visibility still relies on current + root

## Module and Registry Bridge

`module-loader.ts` contributes a declaration-adjacent bridge:

- analyze a module export world
- identify registry-like and resource-like exports
- expose analyzed module items
- support aliasing registries over module exports

Important fact:

- module analysis is still admission/declaration-adjacent authority
- it is not runtime meaning and not field-schema work
- deferred and parameterized registries are part of this bridge, not an
  orthogonal mechanism
