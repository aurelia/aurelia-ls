# Registration-World Constructors

Use this note when reasoning about Aurelia configurations, wrappers, builder
surfaces, lifecycle-attached registration, or any framework API that creates
or adapts a registration world above kernel primitives.

## Core Claim

Aurelia has a real layer above kernel registration primitives:
registration-world constructors.

These are registries, wrappers, and builder surfaces that:

- create or adapt a container world
- populate it with resources, services, aliases, or callbacks
- attach work to named lifecycle slots
- sometimes synthesize new syntax or registration entries from options

They are not just convenience APIs. They are part of the framework's
declaration and registration truth, and they are part of the package's static
analysis burden.

## Why This Matters Here

If `source-analysis` models only kernel-level registration calls, it will miss
the framework APIs that actually construct most meaningful registration worlds.

That would undercut both:

- framework API identity work
- build-time DI linkage work

## Constructor Archetypes

The package should be prepared to recognize at least these constructor
families:

- root-wrapper forwarding into container registration
- configuration objects with `register(container)`
- builder surfaces such as `customize`, `init`, `withStore`, and `withChild`
- option-driven emission of syntax, resources, aliases, or settings
- lifecycle-slot injection through `AppTask`
- layered or staged builder history before final state materialization

The exact set can grow. These are the minimum observed framework families, not
the ceiling.

## Registration Timing Regimes

Registration-world construction does not happen at one time. The minimum timing
split should distinguish:

1. eager registration
   During `container.register(...)` or equivalent direct registration.
2. deferred-to-slot registration or effect
   Introduced during registration, but materialized only when a named
   lifecycle slot runs.
3. render-time branching
   Child-container or provider creation that depends on compile output and
   runtime rendering dispatch.

This timing split matters because later analysis may need to know not only that
some configuration exists, but when its effects materialize and what gates
them.

## Static Analysis Consequence

The package should not treat configuration as an opaque side channel.

At minimum it should expose archetypes that later evaluators can spend:

- root-wrapper forwarding
- `register(container)` configurations
- builder surfaces
- option-driven generated vocabulary
- lifecycle-slot injection
- registration timing regimes

Builtins define the minimum analyzability floor here. Plugin and user-authored
patterns may become analyzable too, but they should be added explicitly rather
than assumed to close through the same law automatically.

## Local Implications For `source-analysis`

- Framework API registry work should include constructor surfaces, not just
  leaf exports.
- Compile-time DI work should preserve builder history and timing posture where
  those change the resulting container world.
- Registration-world constructors should have honest open outcomes when the
  shape is still too dynamic to close statically.
- Future Aurelia adapter seams should treat these constructors as first-class
  semantic inputs, not as incidental wrappers around kernel APIs.
