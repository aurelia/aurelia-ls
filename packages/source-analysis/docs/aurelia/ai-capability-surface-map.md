# AI Capability Surface Map

Use this note when the goal is a neutral map of Aurelia capability regions
that an AI-facing authority surface may eventually need to cover.

This note is not an implementation-priority list.
It is a coverage map derived from Atlas ledger truth, re-expressed in local
package language.

## Scope

This map currently includes native Aurelia 2 framework regions that showed up
as load-bearing across the Atlas ledger sweep.

This map currently excludes:

- v1 compat and deprecation overlays
- SSR and hydration-specific runtime regimes

Those may deserve their own notes later, but they are intentionally out of
scope here.

## Why This Exists

The existing [ai-capability-catalog.md](./ai-capability-catalog.md) is useful
as a prioritization note, but it is not a neutral inventory.

This map exists to keep two questions apart:

- what semantic regions exist in Aurelia
- which capability families should land first in `source-analysis`

## Neutral Capability Regions

### 1. Consulted Declaration World Construction

This region covers the question:

- what declaration world was actually consulted for this answer

Atlas pressure sources:

- declaration admission
- registration-world constructors
- extension configuration and admission
- configuration-world variability
- recognition, admission, and current-world activity

Load-bearing distinctions:

- recognized vs admissible vs current-world active
- root, child, slot, and branch-local worlds
- eager, lifecycle-gated, and render-time world construction
- generic constructor archetypes vs builtin payload families

Capability surfaces likely needed here:

- consulted-world construction and adjudication
- world diffing across app roots or configuration profiles
- current-world-sensitive status reporting
- world contributor and constructor-path tracing

### 2. Naming, Resource Identity, And Admission Surfaces

This region covers the question:

- what kind of declaration-bearing surface this is and how its name landed

Atlas pressure sources:

- kernel DI and resource admission
- resource-system common denominators
- alias registration convergence
- module export analysis

Load-bearing distinctions:

- resource-definition carriers vs parser/registry carriers
- resource keys vs generic DI keys
- export key vs canonical name vs builtin aliases vs caller-supplied overlays
- runtime resource families vs compiler-root-only surfaces

Capability surfaces likely needed here:

- resource-kind and carrier-family explanation
- alias and naming-surface tracing
- declaration-surface witness reporting
- module-intake to admission bridge explanation

### 3. Expression And Transformation Corridors

This region covers the question:

- how authored template or route input becomes a structured semantic carrier

Atlas pressure sources:

- template syntax flow
- expression and accessor DSL
- expression parser entry families
- route-expression DSL
- route-path recognition
- receiver admissibility
- extension injection

Load-bearing distinctions:

- authored syntax vs normalized syntax vs classification vs lowering vs IR
- expression DSL entry family vs subordinate parse context
- route-expression DSL vs route-path recognition DSL
- command identity vs receiver admissibility
- stable transformation layers vs injected extension membership

Capability surfaces likely needed here:

- template-to-runtime corridor tracing
- parser-entry and DSL-family explanation
- route expression and path recognition explanation
- receiver-admissibility reporting
- transformation-layer injection-point reporting

### 4. Runtime Evaluation, Observation, And Flush

This region covers the question:

- how runtime reads, dependencies, observation strategy, and delivery policy
  are determined

Atlas pressure sources:

- runtime evaluation and dependency collection
- observer and accessor routing
- host and node observation adapter
- notification and flush synthesis

Load-bearing distinctions:

- dependency collection vs observer routing
- accessor vs observer
- ordinary property observation vs collection observation
- generic core routing vs node-adapter routing
- invalidation production vs delivery channel vs scheduling policy vs ownership
  layer

Capability surfaces likely needed here:

- runtime dependency explanation
- observer/accessor strategy explanation
- node-adapter policy explanation
- notification and flush regime explanation

### 5. Lifecycle And Root Orchestration

This region covers the question:

- where a component or root is in its real runtime machine, not just which API
  was called locally

Atlas pressure sources:

- controller lifecycle state machine
- root lifecycle orchestration

Load-bearing distinctions:

- pre-activation hydration vs activation vs deactivation vs release/dispose
- owner-coordinated detach/unbind settlement
- root orchestration above controller activation
- app-task sequencing as runtime orchestration rather than mere registration

Capability surfaces likely needed here:

- controller lifecycle-state explanation
- root orchestration and task-slot explanation
- lifecycle transition witness reporting
- running-root and teardown consequence explanation

### 6. Structural Runtime Machines

This region covers the question:

- which higher-order structural machine is in play and how it manages scope,
  views, and runtime state

Atlas pressure sources:

- branching template controllers
- with scope rebinding
- repeat view reconciliation
- projection and slot orchestration
- au-compose dynamic composition
- router viewport navigation

Load-bearing distinctions:

- owner/satellite branch machines vs generic controller behavior
- scope rebinding vs view recreation
- scope reuse identity vs DOM reorder
- projection carriers vs slot consumption vs slot runtime law
- au-compose as a versioned composition engine with several runtime worlds
- route tree / viewport agent / component agent runtime topology

Capability surfaces likely needed here:

- structural-machine identification and tracing
- scope-identity and reuse explanation
- projection and slot runtime explanation
- dynamic composition explanation
- router runtime topology and navigation explanation

### 7. Configuration, Plugin, And Interaction Profiles

This region covers the question:

- how plugin or configuration membership changes the consulted world without
  breaking the underlying semantic skeleton

Atlas pressure sources:

- extension configuration and admission
- configuration-world variability
- plugin drift and extension membership
- extension injection
- cross-plugin interaction

Load-bearing distinctions:

- configuration profile vs builder history vs admission outputs
- stable layer/skeleton vs changing membership
- injected attribute patterns, binding commands, instruction families, and
  renderers
- additive coexistence vs layered overlay vs corridor-sharing extension

Capability surfaces likely needed here:

- configuration-profile explanation
- builder-history and admission-output tracing
- plugin-injection and drift reporting
- interaction-profile reporting over consulted worlds

### 8. Witness, Closure, And Open-State

This region cuts across every earlier one and covers the question:

- what exactly is closed, what remains open, and what evidence supports the
  answer

Atlas pressure sources:

- declaration-surface and support-bundle witness
- open-state and closure-status

Load-bearing distinctions:

- declaration witness vs support-bundle witness
- closed vs closable-open vs terminal-open vs opaque-carried
- in-bounds incompleteness vs absence

Capability surfaces likely needed here:

- closure-status reporting
- witness-basis reporting
- openness localization
- next-step continuation guidance

## Organizational Consequence

The sweep suggests that one document should not try to do both jobs:

- neutral coverage map
- prioritized implementation catalog

The cleaner local organization is:

1. [ai-capability-surface-map.md](./ai-capability-surface-map.md)
   Neutral capability-region inventory.
2. [ai-capability-catalog.md](./ai-capability-catalog.md)
   Implementation-order and product-policy note layered on top of the map.

If the surface map grows much further, the next split should be by region
rather than by priority tier.
The most natural future bundle would be:

- declaration-worlds and naming
- transformation corridors
- runtime machines and orchestration
- variability, interaction, and closure

## Immediate Gaps In The Current Catalog

Compared with this surface map, the current catalog is still under-covering:

- naming-surface convergence and resource-carrier distinction
- expression and route DSL families
- observer/accessor and flush-regime explanation
- lifecycle and root orchestration
- structural runtime machines like repeat, projection, branching, and
  au-compose
- plugin interaction profiles beyond simple world construction

Those do not all need to become Tier 1 work, but they do belong in the neutral
coverage picture.
