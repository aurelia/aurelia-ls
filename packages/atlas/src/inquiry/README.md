# inquiry

`inquiry` is the contract spine for `atlas`.

It defines the nouns that later TypeScript, product, framework, bridge, and Atlas maintenance lenses should share. This layer should stay transport-neutral and readable enough that future Codex sessions can infer the intended architecture before opening implementations.

## Contract Groups

- [answer.ts](answer.ts) defines answer outcomes, answer envelopes, and the shared answer constructor.
- [inquiry.ts](inquiry.ts) defines the shared question envelope, caller intent, subject, and context.
- [locus.ts](locus.ts) defines where an inquiry is rooted.
- [basis.ts](basis.ts) defines what substrate authority an answer spent.
- [evidence.ts](evidence.ts) defines witnesses and open seams.
- [continuation.ts](continuation.ts) defines semantic next-question moves.
- [budget.ts](budget.ts) defines shared budget and pagination lanes.
- [handle.ts](handle.ts) defines navigable handles used by loci, evidence, and continuations.
- [terrain.ts](terrain.ts) defines active, deferred, and external repository terrain.
- [substrate.ts](substrate.ts) defines static substrate contracts and trust.
- [lens.ts](lens.ts) defines lens contracts and the lens catalog.
- [vocabulary.ts](vocabulary.ts) defines package-owned self-description vocabulary.
- [surface-map.ts](surface-map.ts) projects the current contract set as a single answer payload.
- [runtime](runtime/README.md) executes the contracts against an in-memory world and exposes the transport-neutral API.

## Boundary

This folder should not grow transport concerns, transport SDK calls, command-line parsing, or old-reader compatibility shims. Its job is to make the Atlas model precise enough that implementations can be large and direct without smuggling policy through ad hoc parameters.

## Commenting Standard

Every enum member, exported type alias, class/interface, and data-bearing property should carry a short source comment explaining its grounded use. If a contract member cannot be explained that way, it probably has not earned a place here yet.
