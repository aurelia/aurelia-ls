# Module Export Analysis Ledger

Local port of the Atlas ledger with the same name.
Only the sections currently spent by the export semantic surface ledger are
included here.

## Analyzed Export Carriers

The module bridge materializes two stable carriers:

| Carrier | Meaning |
| --- | --- |
| `AnalyzedModule` | the raw module object plus analyzed item inventory |
| `ModuleItem` / typed module-item variants | one export entry with classification fields |

Each module item carries:

- `key`
- `value`
- `isRegistry`
- `isConstructable`
- `definition`

These are the load-bearing axes for later admission work.

## Export Classification Law

The module analyzer does not classify exports by name.
It classifies them by value shape.

### Object exports

- `isRegistry` is true when the value exposes a callable `register`
- `isConstructable` is false
- `definition` is null

### Function exports

- `isRegistry` is true when the function also exposes `register`
- `isConstructable` is true when the function has a prototype
- `definition` is recovered from `resourceBaseName` metadata when present

### Other exports

Primitive-like values are ignored by the analyzed item inventory.

Modeling consequence:

- export analysis is a structural classification pass over module items
- it is not yet admission into the active semantic world

## Consumer-Specific Selection

The framework already proves that analyzed modules can feed different selection
policies.

### Alias/admission registries

`aliasedResourcesRegistry(...)` spends the analyzed module as a registration
bridge rather than as a direct consumer selection.

### Lazy route component selection

`RouteConfigContext._resolveLazy(...)` spends `ModuleLoader.load(promise, transform)`
to choose a custom-element definition from a lazy module export world.

Important facts:

- it can accept a raw constructable custom element
- otherwise it scans analyzed module items for custom-element definitions
- if no definition is found but the raw module resembles a partial
  custom-element definition, it creates and defines one
- it prefers the first non-default custom-element export over the default one

This is not a general admission rule.
It is a consumer-specific selection policy over the analyzed export world.

Modeling consequence:

- `AnalyzedModule` is the durable bridge
- consumer transforms remain a separate layer above it
