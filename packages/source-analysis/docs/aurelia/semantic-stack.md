# Semantic Stack

Use this note when deciding where new Aurelia-aware logic should land inside
`source-analysis`.

## The Stack To Preserve

For the first framework-aware passes, keep these six layers distinct:

1. live exact owner-surface truth
2. declaration-world and current-world construction
3. qualified compile-time DI/container-state consequence
4. shared framework interpretation substrate
5. admissibility closure
6. corridor-local semantic consequence

The package does not need to implement every layer immediately, but it should
not flatten them while it grows.

## What `source-analysis` Should Own First

The immediate local burden is mostly in layers 1, 2, and 3:

- framework owner/package/export/member/face identity
- declaration-world and current-world construction over resource families,
  registration paths, lookup regimes, and timing profiles
- registration-side DI/container-state consequence
- proof shapes that keep positive closure, negative lookalikes, and honest-open
  outcomes separate

This package may also start preparing shared evaluator scaffolding around those
layers.

## What Should Stay Later

Do not prematurely harden this package around:

- full shared framework interpretation substrate
- generic admissibility closure for every framework family
- corridor-local configuration meaning
- route-world or template-world consequence

Those layers may grow here later, but the first implementation passes should
not pretend they are already closed.

## Boundary Rules

- Keep owner grounding separate from DI consequence.
- Keep declaration-world construction separate from later runtime-world
  formation.
- Keep DI consequence separate from interpreted framework meaning.
- Keep admissibility separate from grounding.
- Keep corridor-local meaning separate from reusable shared substrate.
- Do not flatten close neighbors such as `DI.singleton` and
  `Registration.singleton`, or `Container` and `IContainer`, just because they
  live in the same framework neighborhood.

## Local Direction

If this package starts a framework API registry, that registry should begin as
an owner-surface and face-identity surface at layer 1, then join onto
declaration-world/resource-family placement at layer 2.

If it starts build-time DI linkage, that work should spend the layer-1 and
layer-2 results and produce layer-3 carrier state. It should not jump straight
to later interpretation or application-level meaning.
