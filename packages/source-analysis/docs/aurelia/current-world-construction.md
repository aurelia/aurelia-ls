# Current-World Construction

Use this note when building a compiler-facing searched world, a consulted-world
handle, or any framework-aware scan that needs to answer "what is in the
current Aurelia world for this question?"

## Core Product Law

Construct one consulted declaration-world basis per question, not one global
workspace world and not one consumer-local scan per feature.

Different consumers still have different stop thresholds, so the package
should:

- construct one authority-centered searched world
- publish what was searched
- publish what remains open or out-of-boundary
- let later consumers spend different thresholds over the same constructed
  basis

## Smallest Honest World Rule

Start from the smallest boundary that can still change the answer, then widen
only when explicit world-shaping evidence proves the narrower boundary is
insufficient.

This avoids:

- universal workspace crawls
- stale optimistic positives
- dependency-graph bluff
- consumer-local fallback scanning

## The World Frame

The consulted world should be a constructed frame, not an inventory dump.

At minimum it should preserve:

- consulted boundary
- world regime
- consultation role
- world owner or constructor basis
- registration path family
- constructor archetype where applicable
- admission regime
- lookup regime
- materialization timing profile
- naming and alias surfaces consulted

`world_ref` should name that constructed consulted declaration world for the
question seed and boundary plan. It should not mean:

- a runtime-world object
- a graph node id
- a global workspace snapshot
- the full installed dependency graph

## Ordered Scan Passes

Scanning should follow ordered semantic passes:

1. owner-local pass
2. package explicit-and-registry pass
3. module-intake pass
4. configuration-and-constructor pass
5. convention-policy pass
6. workspace-widening pass
7. external-dependency boundary capture

Each pass should widen only when the previous one did not close the answer
honestly.

## Contributor Classes

The scanned world should preserve at least these contributor classes:

- explicit source declarations
- registry carriers
- module-intake carriers
- configuration-emitted members
- convention-policy broadening
- naming and alias convergence

This is important because the package should not reduce framework semantics to
only decorators or export lookup.

## Consultation Role, Regime, Path, Lookup, Timing

When constructing a world for a question, the package should explicitly fix:

1. the narrowest viable boundary
2. the consultation role
3. the governing regime
4. the registration path and constructor basis
5. the lookup and activity basis
6. the materialized world handle

If more than one world is required, keep the composition explicit instead of
flattening everything into a vague "root world".

## Selection Bias

When several candidate worlds are possible, prefer:

1. the narrowest boundary that can still close the answer
2. the strongest honest consultation role reached so far
3. explicit current-world qualification over silent overclosure
4. candidate-intake publication over fake admission

## What Not To Bluff

Do not pretend the whole installed dependency graph is closed just because:

- a package name exists in a manifest
- a workspace exists
- or a known plugin family exists somewhere outside the current searched world

External dependency pressure can still be published, but it should remain
boundary pressure or candidate inventory, not false current-world truth.

## Local Implications For `source-analysis`

- Compiler work should expose a world handle richer than "all resources found".
- Query and proof surfaces should report the searched boundary and world role.
- Configuration, builder history, lifecycle tasks, and convention policy should
  be scanned as world-shaping contributors when they can change the answer.
- Rescan and retreat should be driven by contributor-class changes, not one
  undifferentiated global refresh rule.
