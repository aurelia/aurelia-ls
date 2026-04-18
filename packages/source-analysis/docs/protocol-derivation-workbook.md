# Protocol Derivation Workbook

This workbook is for first-principles derivation from the read/adjudicate
kernel in
[`src/protocol-read-kernel.ts`](../src/protocol-read-kernel.ts),
the operational laws in
[`protocol-read-algebra.md`](./protocol-read-algebra.md),
and the repo-owned fixture packets under
[`../fixtures/protocol-derivation/`](../fixtures/protocol-derivation/README.md).

The main question is:

- can the same read/adjudicate kernel support a framework-agnostic TypeScript
  semantic authority while auto-detecting and spending Aurelia semantics when
  an Aurelia-shaped fixture is present?

This workbook is meant to answer that by derivation against concrete fixtures,
not by intuition and not by dual-pass thought experiments.

## Why This Exercise

This is useful because it pressures the kernel in the right places:

- request shape
- adjudication shape
- outcome law
- continuation law
- retreat and reread law
- identity and anchor law
- world and lookup-regime discipline

The point is not to fake a separate TypeScript pass and Aurelia pass.
If a fixture is Aurelia-shaped, the authority should detect that and spend
Aurelia semantics automatically.

If we still want to know what the Aurelia layer added, we should see that in:

- auto-detected semantic layers
- consulted world or lookup regime
- basis
- provenance
- continuations

not by pretending the caller manually switched frameworks mid-derivation.

## Current Derivation Substrate

Start from the repo-owned packet set:

- [`../fixtures/protocol-derivation/README.md`](../fixtures/protocol-derivation/README.md)
- [`../fixtures/protocol-derivation/schema.yaml`](../fixtures/protocol-derivation/schema.yaml)
- [`../fixtures/protocol-derivation/manifest.yaml`](../fixtures/protocol-derivation/manifest.yaml)

That packet set now carries:

- tiny concrete fixture workspaces
- machine-legible fixture packets
- machine-legible scenario packets
- mutation-backed fixture states for retreat exercises
- expected answer shape for `hit`, `open`, `withdrawn`, and world-role
  `no-claim` pressure

## How To Use This Workbook

For each derivation:

1. Start from one fixture packet and one scenario packet.
2. Record the fixture state and the semantic layers that should auto-detect.
3. Derive one authority path from request to result.
4. Record what the authority had to spend to stay honest.
5. Record where the kernel felt natural and where it felt strained.

Do not derive the same scenario twice as separate TypeScript and Aurelia
passes in the main workbook.

If you want to isolate what the framework layer contributed, record it under:

- `Auto-detected semantic layers`
- `Minimum substrate`
- `Consulted world / lookup regime`
- `Basis`
- `Provenance`
- `Continuations`

## Derivation Record

Use this record for every scenario.

```md
## Scenario N - <title>

### Given
- Fixture packet:
- Fixture state:
- Source files in play:
- Known subjects in play:

### Query Statement
- Human question:
- Semantic burden:
- Auto-detected semantic layers:

### Request
- Selector:
- Operation:
- Aspect:
- Requested world:
- Requested posture:
- Spend constraint:

### Authority Path
- Minimum substrate:
- Consulted world / lookup regime:
- Preserved:
- Claim:
- Spendable:

- Resolution:
- Outcome:
- Trust:
- Basis:
- Provenance:
- Issues:

- Kernel continuation kinds:
- Follow-up query seeds:
- Retreat triggers:
- Change notice:

- Identity emission:
- Anchor emission:

### Layer Contribution
- What did framework detection add beyond plain TypeScript substrate?
- Did that extra meaning land in `aspect`, `world`, `basis`, `provenance`, or continuations?
- Did any top-level kernel concept still feel missing?

### Kernel Pressure
- Did this scenario require a new top-level kernel concept?
- If yes, why was `selector`, `aspect`, `world`, `basis`, `provenance`, or capability not enough?
- If no, where did the extra semantics fit cleanly?
```

## Evaluation Rules

When filling the record, use these rules:

1. `preserved`, `claim`, and `spendable` must stay separate.
2. Non-positive outcomes are normal protocol behavior.
3. Kernel continuation kinds must stay separate from scenario-local follow-up query seeds.
4. Identity is canonical naming, not a relocation hint.
5. Anchor is reacquisition, not canonical naming.
6. If the burden cannot be supported honestly, do not smooth it into a weaker
   positive answer just to make the exercise look cleaner.
7. `no-claim` is burden-relative.
   It means there is no admissible claim for the addressed semantic burden,
   not that the subject is meaningless in general.

## Current Starter Exercise Order

Use the current packet set in roughly this order:

1. [`resolve-direct-export-custom-element.yaml`](../fixtures/protocol-derivation/scenarios/resolve-direct-export-custom-element.yaml)
   Clean exported resource-definition identity.
2. [`resolve-barrel-export-custom-element.yaml`](../fixtures/protocol-derivation/scenarios/resolve-barrel-export-custom-element.yaml)
   Export topology pressure without mutation or open-world complications.
3. [`inspect-exported-standard-configuration.yaml`](../fixtures/protocol-derivation/scenarios/inspect-exported-standard-configuration.yaml)
   Registry-like export surface.
4. [`resolve-exported-interface-key.yaml`](../fixtures/protocol-derivation/scenarios/resolve-exported-interface-key.yaml)
   DI key-space and interface-symbol pressure.
5. [`evaluate-exported-custom-element-activation-gap.yaml`](../fixtures/protocol-derivation/scenarios/evaluate-exported-custom-element-activation-gap.yaml)
   Identity closure versus current-world open frontier.
6. [`evaluate-exported-custom-element-after-registration-removal.yaml`](../fixtures/protocol-derivation/scenarios/evaluate-exported-custom-element-after-registration-removal.yaml)
   Retreat and withdrawal under mutation-backed state change.
7. [`evaluate-exported-custom-element-no-current-world-claim.yaml`](../fixtures/protocol-derivation/scenarios/evaluate-exported-custom-element-no-current-world-claim.yaml)
   Closed world-role `no-claim` without drifting into open-boundary language.

## Outcome Gauntlet

After the starter sequence, make sure the packet set exercises all of these:

- `hit`
- `ambiguous`
- `open`
- `no-claim`
- `unsupported`
- `refused`
- `stale`
- `withdrawn`

The goal is to see whether the kernel still feels honest without leaning only
on positive examples.

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
- framework-only top-level protocol concepts appearing immediately
- continuations wanting write or control-plane actions
- identity and anchor being used interchangeably
- `world` becoming a dump bucket for unrelated semantics
- `basis` or `provenance` silently carrying what should be an explicit world or
  aspect distinction
- the workbook drifting back toward fake dual-pass derivation instead of one
  authority path over a concrete fixture
