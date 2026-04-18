# Protocol Derivation Workbook

This workbook is for first-principles derivation from the read/adjudicate
kernel in
[`src/protocol-read-kernel.ts`](C:/projects/aurelia-ls2/packages/source-analysis/src/protocol-read-kernel.ts)
and the operational laws in
[`docs/protocol-read-algebra.md`](C:/projects/aurelia-ls2/packages/source-analysis/docs/protocol-read-algebra.md).

The main question is:

- can the same protocol kernel support both a framework-agnostic, LLM-friendly
  API over the TypeScript checker and an Aurelia semantic authority layered on
  top?

This workbook is meant to answer that by derivation, not intuition.

## Why This Exercise

This is useful because it pressures the kernel in the right places:

- request shape
- adjudication shape
- outcome law
- continuation law
- retreat and reread law
- identity and anchor law

If the same kernel works for both a TypeScript-flavored authority and an
Aurelia-flavored authority, that is strong evidence that the kernel is actually
shared.

If the Aurelia pass keeps demanding new top-level protocol concepts, that is a
signal to inspect whether those concepts really belong in:

- `aspect`
- `world`
- `basis`
- `provenance`
- `capabilities`

instead of in the kernel itself.

## How To Use This Workbook

For each scenario:

1. Derive it as a TypeScript-flavored authority first.
2. Derive the same semantic burden again as an Aurelia-flavored authority.
3. Compare the two results field by field.
4. Record where the kernel felt natural and where it felt strained.

Do not skip the TypeScript pass even for Aurelia-heavy scenarios.
The point is to see what the overlay is actually adding.

## Derivation Record

Use this record for every scenario.

```md
## Scenario N - <title>

### Query Statement
- Human intent:
- Semantic burden:

### Pass A - TypeScript Authority
- Selector:
- Operation:
- Aspect:
- World:
- Requested posture:
- Spend constraint:

- Minimum substrate:
- Preserved:
- Claim:
- Spendable:

- Resolution:
- Outcome:
- Trust:
- Basis:
- Provenance:
- Issues:

- Continuations:
- Retreat triggers:
- Change notice:

- Identity emission:
- Anchor emission:

### Pass B - Aurelia Authority
- Selector:
- Operation:
- Aspect:
- World:
- Requested posture:
- Spend constraint:

- Minimum substrate:
- Preserved:
- Claim:
- Spendable:

- Resolution:
- Outcome:
- Trust:
- Basis:
- Provenance:
- Issues:

- Continuations:
- Retreat triggers:
- Change notice:

- Identity emission:
- Anchor emission:

### Comparison
- What stayed identical?
- What changed only in `aspect`?
- What changed only in `world`?
- What changed only in `basis` or `provenance`?
- Did the outcome law still feel the same?
- Did continuations still feel lawful?

### Kernel Pressure
- Did this scenario require a new top-level kernel concept?
- If yes, why was `selector`, `aspect`, `world`, `basis`, `provenance`, or `capability` not enough?
- If no, where did the extra semantics fit cleanly?
```

## Evaluation Rules

When filling the record, use these rules:

1. `preserved`, `claim`, and `spendable` must stay separate.
2. Non-positive outcomes are normal protocol behavior.
3. Continuations must stay inside the read/adjudicate scope.
4. Identity is canonical naming, not a relocation hint.
5. Anchor is reacquisition, not canonical naming.
6. If the burden cannot be supported honestly, do not smooth it into a weaker
   positive answer just to make the exercise look cleaner.

## Phase 1: Cross-Layer Parity Set

These are the most important exercises.
The same semantic burden should be derivable both ways.

### Scenario 1 - Resolve Subject

Query statement:

- Resolve the subject selected by a portable locator.

TypeScript-flavored examples:

- resolve an exported class from a module export locator
- resolve a type alias from a package export

Aurelia-flavored examples:

- resolve an exported class that may also be an Aurelia resource owner
- resolve the class behind a known custom-element export surface

What this tests:

- `resolve`
- resolution law
- `ambiguous` versus `no-claim`
- when identity may be emitted

### Scenario 2 - Inspect Bounded Facts

Query statement:

- Inspect bounded facts about a resolved subject.

TypeScript-flavored examples:

- inspect declaration facts for a class
- inspect export surface facts for a module member

Aurelia-flavored examples:

- inspect resource-kind facts for a class
- inspect framework-owner facts for a known resource carrier

What this tests:

- `inspect`
- aspect discipline
- preserved versus claimable fact bundles

### Scenario 3 - Trace Relation

Query statement:

- Trace how one subject connects to another.

TypeScript-flavored examples:

- trace import to declaration
- trace export chain from package entry to defining file

Aurelia-flavored examples:

- trace registration evidence from owner to resource availability
- trace template owner to consumed resource

What this tests:

- `trace`
- route and boundary basis
- open-front handling

### Scenario 4 - Evaluate Supportability

Query statement:

- Evaluate whether a semantic burden can be supported honestly under current conditions.

TypeScript-flavored examples:

- evaluate analyzability of a file under partial checker degradation
- evaluate whether a symbol can be resolved under current posture

Aurelia-flavored examples:

- evaluate whether current-world construction is supportable
- evaluate whether a resource claim is sustainable under current product conditions

What this tests:

- `evaluate`
- posture law
- `unsupported`, `refused`, `open`, and `stale`

### Scenario 5 - Reacquire After Change

Query statement:

- Reacquire the subject after source change.

TypeScript-flavored examples:

- reacquire a declaration using an anchor after nearby edits

Aurelia-flavored examples:

- reacquire a resource owner after edits in or around the carrier file

What this tests:

- anchor law
- retreat and reread law
- when `withdrawn` is more honest than `stale`

## Phase 2: Layered Aurelia Set

These are not symmetry exercises in the same sense.
For each one, still derive the TypeScript substrate first, then add the Aurelia
overlay.

### Scenario 6 - Resolve Resource Ownership

Query statement:

- Determine whether a resolved class owns or carries an Aurelia semantic role.

What this tests:

- whether Aurelia semantics fit mostly into `aspect` and `world`
- whether new subject kinds are actually needed

### Scenario 7 - Trace Registration Evidence

Query statement:

- Trace the registration evidence that makes a resource available.

What this tests:

- evidence subjects
- basis richness
- continuation design when evidence is incomplete

### Scenario 8 - Evaluate Current-World Availability

Query statement:

- Evaluate whether a resource is available in the current world.

What this tests:

- semantic world modeling
- open versus no-claim
- retreat under registration or dependency change

### Scenario 9 - Trace Template Consumption

Query statement:

- Trace the relationship between a template site and the resource it consumes.

What this tests:

- range or position ingress
- resolution plus trace composition
- anchor usefulness for template-side reread

### Scenario 10 - Evaluate DI Carrier Or Resolution Path

Query statement:

- Evaluate the semantic path by which a dependency would be satisfied.

What this tests:

- whether DI semantics fit as `trace` plus `evaluate`
- whether the kernel needs more than world/aspect/basis/provenance here

## Non-Positive Outcome Gauntlet

After the parity set, repeat at least three scenarios and force all of these
cases:

- `no-claim`
- `ambiguous`
- `open`
- `unsupported`
- `refused`
- `stale`
- `withdrawn`

The goal is to see whether the kernel still feels honest without relying on
positive examples.

## Identity And Anchor Drill

For each scenario, ask these two questions separately:

### Identity

- Can the authority emit canonical identity here?
- If yes, at what uniqueness scope?
- If no, what burden is missing?

### Anchor

- Can the authority emit a reacquisition anchor here?
- If yes, what witnesses justify that anchor?
- If no, what carrier or relocation law is missing?

This is important because identity and anchor are easy to blur together under
pressure.

## Convergence Notes

After every 2-3 scenarios, write a short convergence note:

- Which fields felt most stable?
- Which parts still felt provisional?
- Did capability discovery remove probe-by-failure pressure?
- Did typed selectors reduce normalization ambiguity?
- Did any new concept truly belong in the kernel rather than a sibling protocol
  or domain vocabulary?

## Useful Outcomes

This workbook is succeeding if it produces one or more of these:

- a confirmed low-regret kernel
- a tighter capability descriptor
- clearer identity graduation rules
- clearer anchor relocation rules
- evidence that Aurelia semantics can mostly live in `aspect`, `world`, and
  adjudication detail
- evidence that some concept is genuinely missing from the kernel

## Red Flags

Stop and inspect carefully if you see any of these:

- outcome tags drifting by consumer instead of by burden
- Aurelia-only top-level protocol concepts appearing immediately
- continuations wanting write or control-plane actions
- identity and anchor being used interchangeably
- `world` becoming a dump bucket for unrelated semantics
- `basis` or `provenance` silently carrying what should be an explicit world or
  aspect distinction
