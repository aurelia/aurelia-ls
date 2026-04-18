# AI Capability Catalog

Use this note when deciding which Aurelia-aware capabilities to prioritize in
`packages/source-analysis` for AI-assisted work on large or growing Aurelia
applications.

This note is derived from Atlas ledger truth and the attractor experience
theses, but it is intentionally re-expressed in local package language.

It mixes two different kinds of claims:

- framework deductions from Aurelia ledger truth
- implementation-priority judgments informed by the experience overlays

Those should not be conflated.
If a claim here does not cash out into an observable distinction in a query
answer, it should be read as product policy or implementation ordering, not as
framework law.

## Grounding Split

### Framework Deductions

- Aurelia meaning is distributed across TypeScript, templates, declaration
  admission, configuration, runtime placement, and lifecycle timing.
- An authority surface therefore cannot stop at symbol lookup, template
  parsing, or exported-name inventory.
- It has to answer which semantic world was consulted, what is merely
  recognized, what is admissible, what is current-world active, what remains
  open, and why.

These deductions survive only if the answer surface can point to observable
answer fields such as:

- consulted world
- lookup regime
- admission path
- template or runtime corridor stage
- open-state
- witness basis

### Product-Policy Overlay

The strongest carry-forward product-policy constraints are:

- false assertion is worse than silence
- stale confidence is worse than explicit uncertainty
- partial action that looks safe is worse than refusal
- the best AI-facing surfaces compress distributed truth into one trustworthy
  lookup or explanation step

## Why Aurelia Is Hard In A Distinctive Way

These are the main reasons Aurelia is costly to analyze under a local static
pass and easy for tools to overclaim about if they are not careful.

### 1. Recognized, admissible, and current-world active are different states

A surface can be:

- recognizable to the authority
- admissible in some consulted regime
- but not current-world active for the specific root, child container, slot,
  branch, or configuration profile under question

Any tool that collapses those states will overclaim.

### 2. DI and resource lookup are not one visibility model

Aurelia has at least three lookup regimes that matter to answers:

- ancestor-walking generic DI
- current-plus-root resource visibility
- own-container-only visibility

That means "can resolve" is not a single question unless the consulted lookup
regime is explicit.

### 3. Configuration is world construction, not mere option decoration

Builtins and plugins can construct semantic worlds by:

- registering resources and services
- generating aliases, attribute patterns, and binding commands
- staging builder history before final registration
- attaching lifecycle-slot work that changes the world later

So configuration cannot be treated as an opaque side channel.

### 4. Template meaning is staged and interleaved

Template meaning passes through several real stages:

- authored surface syntax
- normalized attribute syntax
- classification against receiver and resource world
- lowering into instruction IR
- materialization into runtime operators

This is not one flat "binding syntax" mechanism.

### 5. Runtime meaning depends on evaluation and dependency collection

The dominant runtime corridor is not just "observe properties."
It is:

- scope lookup
- AST evaluation
- dependency collection
- observer/accessor routing
- subscriber and flush consequence

That means runtime-meaning questions are not reducible to declaration presence
alone.

### 6. Honest partial closure is a first-class requirement

Some Aurelia surfaces are not fully closable at the current ceiling but are
still meaningful:

- closable-open
- terminal-open
- opaque-carried

If the tool only returns hit/miss, it will either lie or stay uselessly vague.

## What The Deduced Structure Supports

The same structural facts that create analysis pressure also create bounded
opportunities for a shared authority layer.

### 1. Aurelia has a stable semantic skeleton

Even when plugin membership or configuration changes, the framework still has
stable skeleton families:

- registration-world constructors
- transformation stages
- DI/resource admission corridors
- recognition/admission/current-world distinctions
- open-state categories

This makes it possible to keep the skeleton closed while representing changing
membership over it.

### 2. Aurelia exposes explicit semantic seams

Large codebases can still be explained through explicit seams such as:

- class-oriented resource shapes
- explicit registration and configuration surfaces
- container boundaries
- lifecycle slots
- reusable conventions

That means large-app behavior can often be explained by tracing those seams
instead of inferring everything from diffuse runtime state.

### 3. Support bundles are real and explainable

Positive claims often depend on a bounded support bundle rather than an
unattributed positive.
That makes provenance-carrying explanation possible here.

## Capability Tiers

The implementation-order judgment in this note is:

1. close the must-have read and adjudication capabilities first
2. add explanation and diff surfaces that compose over the same kernel
3. only then attempt transform or automation surfaces that spend those answers

## Tier 1: Must-Have Capability Families

These are the first capability families worth implementing for AI-assisted
work on larger Aurelia applications.

### 1. Consulted World Adjudication

The tool should answer:

- which world was consulted for this question
- which boundary, lookup regime, timing regime, and configuration profile were
  spent
- whether the surface is recognized, admissible, or current-world active in
  that consulted world

This is necessary because the same surface can be recognized, admissible, or
current-world active depending on consulted world construction:

- "is this resource actually in play here?"
- "why is this syntax available in one app root but not another?"
- "why does this child container see something different?"

Kernel fit:

- `resolve` to identify the subject and consulted world
- `evaluate` to adjudicate activity and openness
- `trace` to show the world-construction path

Minimum answer law:

- consulted world handle
- consulted lookup regime
- activity state
- open-state when not closed
- governing contributors
- continuations that widen or narrow the world honestly

### 2. Declaration And Admission Provenance

The tool should answer:

- how a resource, command, alias, or convention-derived declaration became
  visible
- whether it came from explicit definition, module intake, configuration,
  convention policy, or plugin-emitted admission
- what path turned a candidate declaration into an admitted one

This is necessary because a resolved name does not reveal which admission path,
alias surface, or convention policy made it visible.

Kernel fit:

- `resolve` to find candidate declarations
- `trace` to walk admission and alias paths
- `inspect` to show the landed declaration/support bundle

Minimum answer law:

- declaration witness
- admission path family
- alias and naming basis
- support-bundle presence
- open-state if the path stops before active admission

### 3. DI Keyspace And Visibility Explanation

The tool should answer:

- what key is actually being requested
- whether the key lives in generic DI space or resource-key space
- which visibility regime applies
- where resolution succeeds, fails, or stays open across parent, root, or own
  container worlds

This is necessary because DI resolution depends on both keyspace and lookup
regime, so local identifier shape alone does not determine resolution truth.

Kernel fit:

- `resolve` for key identity
- `evaluate` for lookup posture and current-world visibility
- `trace` for container-topology and resolver chain explanation

Minimum answer law:

- key kind
- consulted container/world
- lookup regime
- winning carrier or failure boundary
- reason a nearby candidate did not qualify

### 4. Template-To-Runtime Corridor Tracing

The tool should answer:

- how an authored template surface normalized
- how it classified against the receiver and active resource world
- what lowering or structural path it took
- what instruction family and runtime operator resulted

This is necessary because template-local syntax does not determine runtime
meaning by itself.

Kernel fit:

- `inspect` for stage-local facts
- `trace` for the corridor through normalization, classification, lowering,
  IR, and materialization
- `evaluate` for receiver admissibility and current-world-sensitive branches

Minimum answer law:

- stage-by-stage explanation
- active resource world assumptions
- receiver class and admissibility
- structural or resource-hydration branches
- sharp-edge notes when the syntax has non-obvious semantics

### 5. Open-State And Witness Reporting

The tool should answer:

- whether a question is closed, closable-open, terminal-open, opaque-carried,
  or still only placeholder-shaped
- what declaration witness exists
- what positive support bundle exists
- what remains intentionally unflattened

This is necessary because it distinguishes in-bounds incompleteness from
absence and keeps closure claims honest.

Kernel fit:

- `evaluate` for closure status
- `inspect` for witness basis
- `trace` for the nearest in-bounds closure path

Minimum answer law:

- closure category
- witness basis actually spent
- origin site of uncertainty
- honest next-step continuation

## Tier 2: Composed Capability Families

These compose naturally over Tier 1 once the earlier answer law exists.

### 6. Configuration And Plugin World Diffing

The tool should answer:

- what changes between two consulted configuration profiles
- which names, aliases, commands, renderers, tasks, or child worlds appear or
  disappear
- whether a surface is absent, admitted-but-not-yet-active, or active only in
  a branch-local world

This is useful when the same repo contains more than one consulted
configuration profile, app root, or builder history.

### 7. Runtime Dependency And Connectability Explanation

The tool should answer:

- what an evaluation depends on
- whether the dependency is property, expression, collection, or subscribable
  shaped
- where ambient connectability enters the corridor
- what downstream runtime family spends that dependency

This is useful when the question is about runtime dependency consequence
rather than declaration presence.

### 8. Convention And Alias Policy Explanation

The tool should answer:

- which declaration came from explicit code versus policy-derived convention
- which compat or deprecation widening is in play
- which alias won when several naming surfaces competed

This is useful because a landed name or syntax does not reveal whether its
origin was explicit declaration, alias convergence, or convention policy.

### 9. Architectural Discovery For Large Apps

The tool should answer:

- where registration worlds are constructed
- which feature modules or package seams own major resources
- where child worlds are introduced
- which lifecycle slots or configuration layers materially shape the app

This is useful because the world-shaping seams are spread across configuration,
registration, module intake, and lifecycle surfaces rather than one local
source site.

## Tier 3: Later Capability Families

These should be built only after the earlier answer law is sufficiently closed.

### 10. Safe Change Preflight And Impact Surfaces

The tool should answer:

- whether a rename, move, admission change, or configuration change is safe
  enough to spend
- which current worlds would change
- which template, DI, or plugin surfaces would become open or drift

This is useful because local edits can change consulted worlds, lookup regimes,
and registration outcomes without an obvious local syntax boundary.

### 11. Drift, Staleness, And Coverage Surfaces

The tool should answer:

- which declarations or worlds are no longer active
- where current-world assumptions differ across roots or branches
- which analyzable framework patterns remain outside the current authority

This is useful because current-world meaning can diverge across roots,
configuration profiles, and child-world branches.

## Cross-Cutting Design Requirements

No matter which capability family is implemented, the tool should keep these
rules.

### 1. Do not collapse world states

Never flatten:

- recognized
- admissible
- current-world active

into one generic positive.

### 2. Do not collapse lookup regimes

Never answer DI/resource questions without naming the governing lookup regime.

### 3. Do not hide analyzability gaps behind empty success

If the burden stops at configuration callbacks, opaque predicates, runtime
branches, or unsupported registry shapes, the answer should say so explicitly.

### 4. Carry provenance and next steps

The answer surface is not just "what."
It is:

- what evidence closed this
- what world made it true
- what remains open
- what next question would narrow the uncertainty

### 5. Prefer scalable explanation over raw detail

The AI-facing win is not maximal dump size.
It is compressing distributed semantic truth into a bounded, provenance-aware,
next-step-oriented answer.

## Prioritization Summary

If implementation must start small, the recommended initial catalog slice is:

1. consulted world adjudication
2. declaration and admission provenance
3. DI keyspace and visibility explanation
4. template-to-runtime corridor tracing
5. open-state and witness reporting

That slice addresses the main Aurelia-side uncertainty and risk:

- uncertainty about which world, corridor, or lookup regime governs the answer
- uncertainty about whether something is actually registered and
  current-world active
- missing explanation of which admission path, alias surface, or convention
  policy made a surface land
- risk of false negatives, stale positives, or transforms that cross an
  unreported open boundary

It also matches the machine-consumer reward family named by the experience
overlay:

- bounded semantic compression
- trustworthy closure and uncertainty framing
- provenance-carrying explanation
- localized analyzability-gap explanation
- next-step orientation without whole-project reread
