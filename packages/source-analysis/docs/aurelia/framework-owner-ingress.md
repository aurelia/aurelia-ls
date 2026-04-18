# Framework Owner Ingress

Use this note when adding the first Aurelia-specific identity surfaces, a
framework API registry, or any query that needs to decide whether a symbol,
export, member, or face is really part of a framework-owned surface.

## Why This Exists

Framework-aware work will drift immediately if the package does not keep one
explicit floor for owner-surface grounding.

Without that floor, the package tends to blur together:

- package and export identity
- API-shape checking
- wrapper semantics
- registration-side DI consequence
- later corridor-local meaning

Those are different burdens.

## Core Thesis

Framework-sensitive owner truth should enter the system through one shared
ingress layer.

That ingress layer answers only:

1. is this really a framework-owned surface?
2. which package, module surface, export, member, and face does it resolve to?
3. did that grounding close directly, through alias or re-export, through a
   bounded assignment chain, or not at all?
4. which downstream semantic lane is now allowed to interpret it?

The honest progression is:

1. owner-surface grounding
2. API-shape or admissibility checking where needed
3. corridor-local semantic consequence
4. later cross-corridor recomposition

This note owns only the first step directly and the handoff law to the second.

## Current Honest Grounding Classes

These grounding classes license framework-sensitive spend when a downstream
consumer does not require stronger conditions:

- direct owner-export grounding
- alias-grounded owner-export identity
- re-export-grounded owner-export identity
- bounded-assignment-grounded owner-export identity

These do not license framework-specific closure by themselves:

- wrong owner-surface grounding
- unresolved owner-surface grounding
- type-shape-only similarity
- name-shape-only similarity

Wrapper-mediated grounding is not part of the default closed floor here. It
only becomes honest when some later surface explicitly makes that wrapper class
analyzable.

## Non-Goals

This ingress layer must not own:

- qualified container-state consequence
- generic API-shape admissibility
- wrapper closure
- configuration-root interpretation
- corridor-local semantic meaning

## Local Implications For `source-analysis`

- A framework API registry should close on exact owner/package/export/member/
  face identity first.
- The registry should preserve how grounding closed, not just that it closed.
- Framework-aware no-claim results should distinguish wrong owner,
  unresolved, type-shape-only, and name-shape-only outcomes.
- Query and evaluator surfaces should consume this ingress rather than
  rediscovering owner truth from raw source rereads or local name folklore.
- Build-time DI work should spend this ingress as input. It should not replace
  it.

## Minimal Output Vocabulary

If this package grows an explicit framework-ingress result family, it should be
able to distinguish at least:

- grounded-direct
- grounded-alias
- grounded-reexport
- grounded-bounded-assignment
- wrong-owner-surface
- unresolved-owner-surface
- type-shape-only
- name-shape-only

The exact enum names can differ. The separation cannot.
