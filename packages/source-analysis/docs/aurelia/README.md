# Aurelia Grounding

These notes are the local directional grounding for framework-aware work in
`packages/source-analysis`.

They are intentionally distilled for this package instead of importing Atlas's
full concern stack or relying on older compiler-local semantics. The goal is
to keep the next implementation passes grounded without dragging Atlas's
packets, product decomposition, or naming pressure into this package whole.

Read these notes before:

- defining Aurelia-specific semantic surfaces
- building a framework API registry
- modeling the Aurelia resource world
- modeling compile-time DI state or registration-side consequence
- deciding build-time DI linkage closure
- adding framework-aware inquiry answers or proofs

## Reading Order

1. [framework-owner-ingress.md](./framework-owner-ingress.md)
2. [declaration-world-and-resource-families.md](./declaration-world-and-resource-families.md)
3. [registration-world-constructors.md](./registration-world-constructors.md)
4. [current-world-construction.md](./current-world-construction.md)
5. [compile-time-di-container-state.md](./compile-time-di-container-state.md)
6. [proof-basis.md](./proof-basis.md)
7. [semantic-stack.md](./semantic-stack.md)

## Local Rules

- Keep framework ingress identity-focused.
- Keep qualified DI consequence separate from owner-surface grounding.
- Treat registration-world constructors as real framework truth, not just
  convenience wrappers.
- Keep grounding, admissibility, and corridor-local meaning separate.
- Keep wrong-surface, wrong-member, unresolved, open, and runtime-only outcomes
  explicit.
- Do not harden around today's helper names, file layout, or Atlas packet
  names.

## Use With

- [../shared-semantic-authority.md](../shared-semantic-authority.md)
- [../semantic-analysis.md](../semantic-analysis.md)
- [../roadmap.md](../roadmap.md)

## What These Notes Do Not Try To Own

- the full product-side semantic-runtime design
- general evaluator routing or answer-carrier law
- final public API names for framework-aware queries
- scanner-local helper decomposition

They exist to keep the package honest about the first two Aurelia burdens:

1. exact framework owner-surface identity
2. qualified compile-time DI container-state consequence

and about the declaration/current-world substrate those burdens spend.
