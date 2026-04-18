# Resource-System Common Denominators Ledger

Local port of the Atlas ledger with the same name.
Only the sections currently spent by the export semantic surface ledger are
included here.

## Resource-Definition Carrier Family

The following kinds currently sit inside the shared `ResourceDefinition`
carrier family:

- custom element
- custom attribute
- template controller
- value converter
- binding behavior
- binding command

Common properties of this family:

- each kind has a definition class implementing `ResourceDefinition`
- each kind has a kind API with `keyFrom(...)`
- each kind has `define(...)` and `getDefinition(...)` admission/retrieval
  surfaces
- each kind defines metadata on `Type` using the resource base name
- each kind supports alias registration
- each kind can be found again through container/resource lookup

This is the main declaration/admission common denominator the product should
preserve.

## Compiler-Root-Only Distinction

Compiler-facing kinds must not be collapsed into general runtime resource
availability just because some of them share the `ResourceDefinition` carrier.

### Binding commands

Binding commands do use the resource-definition carrier family, but they are
still intended as compiler/root-only resources in the product semantic model.

The product should encode:

- carrier family: `resource-definition`
- domain policy: `compiler-root-only`

### Attribute patterns

Attribute patterns are the crucial non-collapse case.

They are not `ResourceDefinition` carriers.

Their admission shape is:

- pattern definitions
- pattern handler `Type`
- `AttributePattern.create(...)` returning an `IRegistry`
- `Symbol.metadata[registrableMetadataKey]` as the key admission hook
- registration into `IAttributeParser`
- singleton registration of `IAttributePattern`

The product should encode:

- carrier family: `registrable-metadata registry`
- domain policy: `compiler-root-only`

This is the main reason AP and BC should not be conflated merely because both
serve compiler syntax.
