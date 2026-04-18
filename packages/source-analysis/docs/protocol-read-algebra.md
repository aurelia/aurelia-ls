# Protocol Read Algebra

This note proposes the safest first operational layer to derive from
[`src/protocol-read-kernel.ts`](C:/projects/aurelia-ls2/packages/source-analysis/src/protocol-read-kernel.ts).

It does not try to freeze feature vocabularies early.
It tries to freeze:

- evaluator stages
- outcome law
- request and result invariants
- continuation law
- retreat and reread law
- the first capability and selector-composition rules

That is the lowest-regret starting point because these rules should survive
changes in substrate, domain vocab, delivery surface, and host shape.

## External Inspirations

These are the main protocol precedents worth borrowing from without copying
their domain models:

- [Language Server Protocol 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
  - capability negotiation
  - partial results
  - position and range addressability
- [Model Context Protocol lifecycle](https://modelcontextprotocol.io/specification/latest/basic/lifecycle)
  - explicit initialization and negotiated capabilities
  - version negotiation
- [GraphQL response format](https://spec.graphql.org/draft/#sec-Response-Format)
  - partial success
  - first-class error payloads alongside data
  - execution errors tied to response paths
- [RFC 7232: Conditional Requests](https://datatracker.ietf.org/doc/html/rfc7232)
  - change-sensitive reread and retreat behavior
  - precondition-style honesty under changing state
- [RFC 9457: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc9457)
  - structured non-happy-path payloads
  - additive extension members

## Safest Starting Point

The safest first freeze is:

1. A read query is evaluated by a total reference algorithm.
2. Every successful protocol interaction returns a `ReadQueryResult`.
3. Non-positive outcomes are part of normal behavior, not exceptional control flow.
4. Every non-trivial result must explain its truth posture through adjudication.
5. Every answer may publish typed continuations describing lawful next reads.

Everything else should derive outward from that.

## Convergence Attempt

This note now has a first concrete convergence target:

- [`src/protocol-read-kernel.ts`](C:/projects/aurelia-ls2/packages/source-analysis/src/protocol-read-kernel.ts)
  now carries stronger typed selector shapes for the highest-value schemes
- [`src/protocol-read-capabilities.ts`](C:/projects/aurelia-ls2/packages/source-analysis/src/protocol-read-capabilities.ts)
  provides the sibling discovery contract for read-kernel support

That convergence surfaced a useful rule:

- the read kernel should carry a few high-value typed selector carriers directly
- the capability sibling should advertise which selector forms and operation burdens are actually supported

This reduced guesswork in validation and capability checking without forcing the
kernel to freeze every future selector scheme early.

## Identity And Anchor Law

The convergence made one distinction much sharper:

- identity answers "what canonical semantic subject is this?"
- anchor answers "how can this subject be reacquired after change?"

Those are different burdens and should not be collapsed.

### Identity

An identity handle is a claim that a subject has been canonically named inside a
declared uniqueness scope.

It is not:

- a source position
- a relocation hint
- a best-effort lookup key

### Anchor

An anchor handle is a typed reacquisition handle.

It is not:

- a canonical semantic name
- a promise that the same bytes still exist
- a guarantee that relocation will always succeed

## Identity Graduation

An authority may emit an `IdentityHandle` only if all of these are true:

1. The subject has been semantically resolved strongly enough for the requested burden.
2. Alias and export indirection have been canonicalized enough for the declared identity scheme.
3. The authority can state the uniqueness scope honestly.
4. The authority can re-issue the same identity deterministically for the same semantic subject within that scope.
5. The authority knows what changes would force the identity claim to retreat.

An authority must not emit a stronger uniqueness scope than it can justify.

In practice:

- if only carrier-local truth is available, emit at most `document`
- if the name is only stable within one analyzed workspace, emit at most `project`
- emit `scheme` or `global` only when the issuing scheme truly guarantees that level

An authority should canonicalize through semantic normalization before issuing an
identity:

- collapse import aliases
- prefer the exported symbol rather than the incidental local alias
- prefer root or merged symbol identity over one incidental declaration view

If that normalization cannot be completed honestly, the authority should prefer:

- `locator`
- `anchor`
- or a weaker `project`-scoped identity

### Initial TypeScript-Flavored Identity Schemes

These look like the safest first concrete schemes:

- `ts-export`
  - for symbols with a verified exported path
  - good candidate for `scheme` uniqueness only if the scheme itself guarantees that exported identity remains canonical
- `ts-local`
  - for declarations whose identity is only supportable within one analyzed authority scope
  - usually no stronger than `project`

The key rule is:

- raw `ts.Symbol` objects are an internal normalization substrate, not a durable wire identity

## Anchor Graduation

An authority may emit an `AnchorHandle` only if all of these are true:

1. The authority knows the carrier in which the anchor lives.
2. The authority knows the last known anchor range.
3. The authority can provide at least one relocation witness beyond bare range when change tolerance is claimed.
4. The authority defines what relocation success and relocation failure mean for that scheme.
5. The authority can say which changes force the anchor to retreat or become ambiguous.

Relocation witnesses may include:

- content fingerprints
- structural paths
- semantic hints used for post-relocation confirmation

An anchor should be treated as stronger when it carries more than one independent
reacquisition witness.

Bare `carrierRef + range` is enough for an extremely weak anchor, but not enough
for a strong relocation promise across edits.

### Initial TypeScript-Flavored Anchor Scheme

The safest first anchor scheme looks like:

- `ts-decl-anchor`
  - carrier ref
  - declaration range
  - one or more content fingerprints
  - optional structural path
  - optional semantic hints such as declaration kind or local name

This is a strong starting point because it does not pretend to be canonical
identity. It only promises reacquisition under declared conditions.

## Identity And Anchor Composition

The clean composition rule is:

- use identity when you need canonical semantic naming
- use anchor when you need change-tolerant reacquisition
- use both when a consumer needs stable naming and reread resilience

That means:

- selectors may ingress through `position`, `range`, `locator`, `identity`, or `anchor`
- resolved candidates should ideally carry `identity` when available
- resolved candidates may also carry `anchor` when reread or retreat pressure matters

## Identity And Anchor Failure Modes

These are the first failure rules worth freezing:

- failed identity canonicalization is not automatically `error`
- if a subject is found but canonical identity cannot be justified, the result may still be `hit` with locator or anchor only
- failed anchor relocation after change should tend toward `open`, `ambiguous`, `no-claim`, or `withdrawn`, depending on burden
- stale identity or stale anchor should not silently persist as if still current

## Reference Evaluator

The reference evaluator should be written as a total staged algorithm:

1. Validate request shape.
2. Normalize request into a canonical internal form.
3. Check capability support for the normalized request.
4. Acquire the best available authority view for the requested world and posture.
5. Perform prerequisite identity closure when the requested operation requires it.
6. Execute the operation-specific evaluator.
7. Adjudicate `preserved`, `claim`, and `spendable`.
8. Classify the outcome.
9. Generate typed continuations.
10. Attach retreat and reread pressure.

If any stage cannot proceed, it must still classify the request into a protocol
result shape. The boundary should not leak raw host exceptions or undefined
states.

## Stage Semantics

### 1. Validate

Validation answers only protocol-shape questions:

- is the request structurally well-formed?
- is the operation name syntactically admissible?
- is the selector syntactically admissible for its declared scheme?
- does the selector payload satisfy the typed carrier for that scheme?

Validation failure is `error`, not `no-claim`.

This mirrors the useful GraphQL split between request errors and execution
errors: malformed requests are not the same thing as honest semantic misses.

### 2. Normalize

Normalization produces a canonical internal request.

Typical normalization work:

- canonicalize selector encodings
- fill default world or posture values
- derive host-local selector detail from portable request shape
- reject contradictory request constraints

With stronger typed selectors, normalization should mostly be about canonical
rewriting of already-typed inputs rather than decoding opaque selector strings.

Normalization must not invent semantic truth.
It may only rewrite the request into a semantically equivalent authority form.

### 3. Capability Check

Capability checking answers:

- does this authority implement this operation family?
- does it support this selector scheme for this subject family?
- does it support this world or posture burden?
- do the operation and selector requirements compose lawfully here?

If the answer is no, the result is `unsupported`.

If the answer is yes in general but not allowed under current spend policy,
budget, or policy gate, the result is `refused`.

This distinction is worth freezing early:

- `unsupported` means the capability is outside the authority contract
- `refused` means the capability exists but is not being spent now

The sibling discovery contract should make this check mostly declarative instead
of probe-driven.

### 4. Acquire Authority View

The authority must capture the actual working context it used:

- observed scope
- observed semantic world
- observed freshness
- observed completeness
- observed regime tags

This is where `requestedPosture` becomes `observedPosture`.

### 5. Prerequisite Identity Closure

Some operations can run directly on a candidate set.
Some require a single resolved subject first.

The safe default is:

- `locate` does not require single identity
- `resolve` exists to close identity
- `inspect`, `trace`, and `evaluate` require enough identity closure to anchor their burden

If the operation requires single identity and closure cannot be achieved:

- zero admissible candidates leads toward `no-claim`
- multiple admissible candidates leads toward `ambiguous`
- an honest frontier leads toward `open`

### 6. Execute Operation

The operation evaluator should produce a domain-local raw observation, not the
final consumer answer.

This stage is allowed to preserve more than it can claim.

That is important. Weak substrate phases often discover useful structure before
they can make a stable claim that another consumer may spend.

### 7. Adjudicate

Adjudication is the semantic authority step.

It must answer:

- what knowledge is preserved?
- what is honestly claimable now?
- what may this consumer safely spend?
- what trust level applies?
- what basis makes that answer honest?
- what issues qualify it?
- what changes would force it to retreat?

This is the semantic center of the protocol.

### 8. Classify Outcome

Outcome classification is a small algebra, not an ad hoc renderer choice.

The classifier should be deterministic over adjudication plus operation burden.

### 9. Generate Continuations

Continuations are not help text.
They are lawful next read requests.

They should be generated from the reason the current burden stopped where it
did:

- ambiguity
- open frontier
- unsupported selector or world
- stale posture
- insufficient evidence

### 10. Attach Retreat And Reread Pressure

The answer should describe when it must be reread or withdrawn.

This is where `retreat` and `changeNotice` become operational rather than
decorative.

## Operation Contracts

The first safe move is to define operation burden in terms of what the caller is
asking the authority to close.

### `locate`

Burden:
- produce a candidate set matching the selector and burden

Positive result:
- a candidate set is returned as the consumer value

Common non-positive outcomes:
- `no-claim`: no admissible candidates
- `open`: search frontier not honestly closed
- `stale`: previously usable candidate set is freshness-qualified
- `unsupported`: selector scheme or search burden unsupported

Important law:
- multiple candidates are not automatically `ambiguous`
- `locate` can return `hit` with many candidates because candidate production is its job

### `resolve`

Burden:
- close identity on exactly one admissible candidate, or report honest ambiguity

Positive result:
- one selected candidate

Common non-positive outcomes:
- `ambiguous`: more than one admissible candidate remains
- `no-claim`: no candidate closed
- `open`: identity closure remains on an honest frontier

Important law:
- `resolve` is the canonical producer of `ResolutionRecord`

### `inspect`

Burden:
- return bounded facts about an addressed subject

Positive result:
- a fact bundle for the requested aspect

Common non-positive outcomes:
- `ambiguous`: inspection needed one subject but more than one remained admissible
- `no-claim`: no subject closed or no claimable facts exist
- `open`: facts depend on unresolved world or boundary conditions

Important law:
- `inspect` should not silently downgrade into search
- if identity closure is missing, the outcome should say so

### `trace`

Burden:
- return a claimable path, witness chain, dependency chain, or other relation

Positive result:
- a closed trace satisfying the requested burden

Common non-positive outcomes:
- `open`: trace reached an honest boundary before closure
- `ambiguous`: multiple trace anchors remained admissible
- `no-claim`: no claimable trace exists

Important law:
- partial traces may be preserved even when the outcome is not `hit`

### `evaluate`

Burden:
- adjudicate posture, analyzability, supportability, completeness, or another bounded semantic judgement

Positive result:
- a judgement record that the consumer may spend

Common non-positive outcomes:
- `no-claim`: the authority cannot honestly assert the judgement
- `open`: the judgement depends on unresolved conditions
- `unsupported`: the judgement family is outside supported capability

Important law:
- `evaluate` should report the burden it actually discharged in `basis` and `observedPosture`

## Outcome Law

The first version of the algebra should make these distinctions normative:

- `hit`
  - the requested burden closed positively enough to produce consumer-facing value
- `no-claim`
  - the authority cannot honestly assert a positive semantic claim for this burden
- `ambiguous`
  - more than one admissible identity or interpretation remains where the burden required narrower closure
- `open`
  - the evaluator reached an honest frontier or boundary before closure
- `stale`
  - the result is materially freshness-qualified and should not be treated as current closure
- `unsupported`
  - the burden is outside supported capability
- `refused`
  - the authority declines to spend this capability now
- `withdrawn`
  - prior closure cannot currently be sustained and has retreated
- `error`
  - the protocol interaction failed to produce a normal semantic classification

The most important early law is:

- `no-claim`, `ambiguous`, `open`, `stale`, `unsupported`, `refused`, and `withdrawn`
  are normal semantic outcomes, not transport failures

## Field Invariants

These are good first conformance rules.

### Envelope Invariants

1. Every result must echo the originating `request`.
2. Every result must contain exactly one `outcome`.
3. Every result must contain exactly one `adjudication`.
4. Every result must contain `continuations`, even if that list is empty.

### Resolution Invariants

1. If `resolution.status = "single"`, then `selected` must be present.
2. If `resolution.status = "ambiguous"`, then `candidates` must contain at least two entries.
3. If `resolution.status = "unresolved"`, then `selected` must not be present.
4. If `outcome.tag = "ambiguous"`, then `resolution.status` should be `"ambiguous"`.

### Outcome Invariants

1. If `outcome.tag = "unsupported"`, then `spendable` should be absent.
2. If `outcome.tag = "refused"`, then `spendable` should be absent.
3. If `outcome.tag = "no-claim"`, then `claim` and `spendable` should be absent.
4. If `outcome.tag = "withdrawn"`, then `retreat` should be present.
5. If `outcome.tag = "stale"`, then freshness qualification should be visible in `observedPosture`, `basis`, `issues`, `retreat`, or some combination of them.
6. If `outcome.tag = "error"`, then at least one `Issue` with severity `error` should be present.

### Adjudication Invariants

1. `trust`, `basis`, `provenance`, and `issues` are always populated, even for non-positive outcomes.
2. `preserved`, `claim`, and `spendable` are semantically ordered:
   - what is spendable must be justified by what is claimable
   - what is claimable must be justified by what is preserved
3. This ordering is semantic, not structural.
4. The protocol should not require one JSON value to be a literal subset of another.

### Continuation Invariants

1. Every continuation must be executable as another read-kernel request.
2. Continuations must stay within read/adjudicate scope.
3. Continuations must not smuggle control-plane or write actions into the read kernel.
4. If a lawful next step exists for `ambiguous`, `open`, `stale`, `unsupported`, or `refused`, the result should include at least one continuation.

### Extensibility Invariants

1. Consumers must tolerate unknown extensible string literals unless safe action depends on understanding them.
2. Consumers must ignore unrecognized `attributes` members.
3. Authorities should add new detail through open vocabularies and extension objects before considering breaking field shape changes.

This is where the protocol should borrow from RFC 9457 and GraphQL:

- preserve a small stable core
- allow structured extension
- require consumers to ignore what they do not recognize

## Response Expectations By Request Kind

This is the first useful expectation table to test.

| Request shape | Expected dominant outcomes |
| --- | --- |
| `locate` by locator | `hit`, `no-claim`, `open`, `stale`, `unsupported`, `refused`, `error` |
| `resolve` by locator | `hit`, `ambiguous`, `no-claim`, `open`, `stale`, `unsupported`, `refused`, `error` |
| `inspect` by exact identity | `hit`, `no-claim`, `open`, `stale`, `unsupported`, `refused`, `error` |
| `inspect` by non-unique locator | `hit` only after internal resolution, otherwise often `ambiguous`, `no-claim`, or `open` |
| `trace` from resolved subject | `hit`, `open`, `no-claim`, `stale`, `unsupported`, `refused`, `error` |
| `evaluate` on posture or analyzability burden | `hit`, `no-claim`, `open`, `stale`, `unsupported`, `refused`, `error` |

The key point is that expected outcomes should be predictable from the burden,
not improvised by each evaluator.

## Continuation Generation

The safest continuation generator is cause-driven:

- if the result is `ambiguous`, offer one or more `narrow` continuations
- if the result is `open`, offer `strengthen-evidence`, `tighten-posture`, or `switch-world`
- if the result is `stale`, offer a reread continuation under stricter freshness
- if the result is `unsupported`, offer `reroute` to a supported selector, aspect, or world when one is known
- if the result is `refused`, offer a continuation that lowers burden or cost when possible

Continuation generation should be deterministic over:

- outcome tag
- resolution state
- observed posture
- basis
- available capability knowledge

## Retreat And Change Law

The read kernel should adopt this rule early:

- any answer that depends on mutable state is only valid until a known retreat trigger reopens it

Operationally:

1. authorities should record the known retreat triggers they depend on
2. reread pressure should be surfaced explicitly in `changeNotice`
3. when prior closure cannot honestly stand, the result should degrade to `stale` or `withdrawn`, not silently persist

This is the most useful thing to borrow from conditional-request thinking:

- state-sensitive answers need explicit reread conditions

## Capability Discovery

The first sibling protocol after the read kernel should probably be capability
discovery.

The read kernel itself should stay about semantic questions and answers.
But many consumers will need a way to learn:

- which operations are implemented
- which selector schemes are supported for which subject families
- which identity and anchor schemes can actually be issued
- which worlds are available
- which posture constraints are meaningful

The important design rule is:

- failure-by-probing should not be the only way clients learn support

LSP and MCP are both good precedents here.
They make initialization and capability negotiation explicit instead of forcing
every client to infer support from errors.

The first concrete sibling for this repo is now
[`src/protocol-read-capabilities.ts`](C:/projects/aurelia-ls2/packages/source-analysis/src/protocol-read-capabilities.ts).
It keeps discovery separate from semantic answers while giving clients a typed
way to ask:

- which operations are supported
- which selector schemes are supported for which subject kinds
- which worlds and posture burdens are meaningful
- whether support is hard, conditional, or absent

## Conformance Suite

The first conformance suite should stay tiny.

It should test:

1. malformed request becomes `error`
2. unsupported request becomes `unsupported`
3. policy-gated request becomes `refused`
4. resolve-one becomes `hit`
5. resolve-many becomes `ambiguous`
6. resolve-none becomes `no-claim`
7. open frontier becomes `open`
8. invalidated prior answer becomes `stale` or `withdrawn`
9. every non-trivial non-positive result emits a lawful continuation when one exists
10. every result remains structurally valid under unknown extension members

## What To Freeze Now

These are the safest things to lock early:

- staged total evaluator
- deterministic outcome classifier
- distinction between `unsupported` and `refused`
- distinction between malformed request and semantic no-claim
- semantic ordering of `preserved`, `claim`, and `spendable`
- a small set of typed selector carriers for the highest-value schemes
- a sibling capability descriptor for read-kernel support
- continuation law
- retreat and reread law

## What Not To Freeze Yet

These should stay open longer:

- exact world vocabularies
- exact aspect vocabularies
- cost-unit taxonomy
- regime-tag taxonomy
- domain-local issue codes
- concrete selector payload structs for every future scheme

## Immediate Follow-On

The next low-regret step after this note is an invariants note or test matrix
that turns the laws above into executable checks over
`ReadQueryResult`.
