# Compile-Time DI Container-State

Use this note when modeling Aurelia registration-side semantics, DI linkages,
container-state transitions, or build-time closure over framework registration
patterns.

## Why This Exists

The package needs a framework-specific semantic carrier above owner-surface
grounding, but still below evaluator publication and product-facing answer
routing.

That carrier is not "Aurelia semantics" in general. It is the qualified
compile-time DI/container-state layer.

## Core Thesis

The compile-time DI model should be represented as a qualified container-state
carrier.

For one registration-side operation, that carrier should be able to answer:

- which container world or child-world it affects
- which key or key family it targets
- which resolver strategy or read modifier it introduces
- which normalized registration or builder transition produced it
- which lookup regime and topology rules qualify later reads
- which analyzability band and open residuals attach
- which witness and completeness hooks later license stronger claims

This carrier is:

- above exact owner-surface grounding
- above declaration-world entry and admission coordinates
- below evaluator publication
- below product claim routing

## Stable State Axes

At minimum the carrier should preserve these first-class axes:

- container-world anchor
- key family and key constructor basis
- resolver strategy
- value-form basis
- helper/read modifier posture
- registration-cascade stage
- higher-order transition class
- lookup regime
- materialization timing
- current-world sensitivity
- analyzability band
- named honest-open residual class
- witness basis
- completeness posture
- topology/runtime qualification hook
- extension/interoperability qualification hook

Later consumers may narrow spend by regime. They must not strengthen truth by
flattening or silently upgrading these axes.

## Registration Cascade Stages

The current minimum stage vocabulary should distinguish:

- `explicit-iregistry-register`: direct explicit registry registration
- `resource-definition-register`: registration through recovered resource
  metadata
- `registrable-metadata-register`: registration through registrable metadata
  keys
- `legacy-static-au-register`: legacy static `$au` recovery and registration

## Higher-Order Transition Classes

The current minimum transition vocabulary should distinguish:

- `key-space-addition`: adds a new keyed state entry
- `key-space-overlay`: sharpens or widens an existing keyed entry
- `alias-linkage`: links one key identity to another
- `multi-registration-aggregation`: accumulates several resolvers on one key
  space
- `builder-history-accumulation`: carries staged builder or layered
  configuration history
- `lifecycle-slot-attachment`: introduces state gated by a lifecycle slot
- `child-world-fork`: branches state into a child or owner-local world
- `generated-syntax-or-settings-emission`: emits syntax, aliases, renderers,
  or settings-world artifacts as registration-side consequence

## Boundary Law

Keep these neighboring slices distinct:

- declaration-world owns consulted-world identity, entry, admission, and
  current-world basis
- framework ingress owns exact owner-package/export/member grounding
- evaluators own publication of answers about world, absence, completeness, and
  interoperability
- product or host layers own analyzability-tier normalization, blocker
  exposure, spend-boundary posture, rescan, and retreat scheduling

This carrier must not become:

- a runtime DI simulator
- an evaluator result packet
- a claim-home map
- a product-local helper schema

## Local Implications For `source-analysis`

- Registration-side framework analysis should model state transitions, not just
  symbol matches.
- DI linkage work should preserve analyzability band and honest-open residuals
  as part of the carrier, while leaving consumer-facing tier classification to
  higher layers.
- The first machine-readable surfaces should stay thin: stable state sections,
  vocabulary, qualification axes, residual classes, and stronger-claim hooks.
- A positive registration hit is not enough. The result should still carry
  world, stage, transition, and qualification posture.
