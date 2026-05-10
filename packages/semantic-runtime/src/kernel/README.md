# Aurelia Analysis Kernel

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

The analysis kernel is the low-level machine-readable semantic substrate for Aurelia applications. Its primary
shape is a long-lived in-memory analysis store that serves IDE features, Atlas queries, tooling queries, agents, diagnostics,
future compilers, and analysis tools from the same normalized records.

The kernel is intentionally small and record-oriented. It captures observations, semantic claims,
materialized products, provenance, and unresolved seams. Higher-level systems can then build IDE, Atlas, tooling, AI,
diagnostic, and AOT projections from those records without rediscovering the same facts.

## Product Priorities

Folder-level product priorities live in [../README.md](../README.md). The kernel-local consequence is that records
must preserve enough source, identity, provenance, uncertainty, and navigation shape for many consumers to build
their own projections without rewriting the semantic substrate.

False positives are more dangerous than false negatives. Candidates, ambiguity, parser recovery, generated
facts, convention-derived facts, and unresolved seams must remain visible in the graph instead of being
collapsed into ordinary resolved facts.

Correctness and explanation quality matter before latency. TypeScript analysis may initially bias toward completed
programs. Template and expression analysis need better partial-input behavior because autocomplete happens while
users are actively typing.

## Design Rules

The kernel is hot-store first. It is not a snapshot schema, database format, or cross-run persistence contract.
Records are serializable for tests, tooling continuations, inspection, and debugging, but serialization does not imply
that every handle can be recovered after a restart or compared across unrelated analysis stores.

Record graph links use branded store-local handles. A handle is a navigable pointer inside one active analysis
store. It can be readable and stable enough for tooling continuations during that store's lifetime, but it is not
semantic truth. Real semantic identity lives in domain fields such as resource kind/name, DI key shape,
declaration coordinates, template owner/phase, and provenance.

Controlled vocabulary uses stable keys, not store handles. Claim predicates, seam kinds, binding kinds,
instruction kinds, and product kinds use centrally defined vocabulary keys with an
explicit usage slot. New entries should be added as implementation pressure proves they are needed, with
namespace, stable code, slot, and grounded usage comment.

Claim predicates also declare a directional subject/object signature. The signature is intentionally small: it names
which endpoint handle families are accepted and, for product endpoints, which product-kind vocabulary keys are expected.
This lets Atlas, tooling, and inquiry lenses stitch graph paths such as configuration step -> registration admission -> DI
operation -> compiler scope without hard-coding product-specific edge tables.
The definition helpers preserve literal vocabulary keys and claim signatures in their return types so product code,
Atlas or tooling lenses, and future graph checks can follow declared topology instead of widening everything to string-like keys.
Those signatures are product topology, not tooling-only metadata. `KernelStore.commit` validates materialized product
kinds and semantic-claim endpoints against the same vocabulary contract so materializer mistakes fail at the record
boundary, including batches that introduce a product and claim it in the same commit. TypeScript typing keeps normal
product code narrow; store validation keeps dynamic, generated, or future deserialized materializers honest.

Vocabulary is another fast-evolving pressure surface. It is intentionally small while semantics are still being
implemented, but it must not become a dumping ground for near-duplicate relationship names or consumer-specific
answer states. Add vocabulary when a real materializer or query needs a stable classifier, and keep usage-slot
meaning product-owned so Atlas, tooling, and other tools do not rediscover it from constructor positions or naming patterns.
As claims start carrying real semantics, revisit vocabulary continuously. A new claim predicate should normally name
a durable domain relationship, not a temporary materialization step, query state, confidence label, or convenient synonym for
an existing edge.

The key space is still deliberately small, but the TypeScript contracts now distinguish claim predicates, seam
kinds, product kinds, binding kinds, and instruction kinds. These
are not interchangeable even when they share the same underlying stable key format.

Do not hide uncertainty behind `null`, empty arrays, or best-effort guesses. Use explicit open seams and
claim predicates that say what was actually observed or produced. Confidence, ranking, completeness, severity,
and user-specific belief policy belong in query answers or consumer projections, not in first-order kernel facts.

Evidence is a deliberate pressure surface. It is expected to evolve as real materializers are
implemented, but it must not become catch-all storage for facts that belong in identities, addresses, claims,
products, open seams, or inquiry answers. Treat it as a high-leverage unstable surface: useful because it sits
close to source reality, risky because it can quietly absorb policy, confidence, debugging notes,
partial analysis state, and consumer-specific answer semantics.

Provenance is currently produced before many consumers exist. That is intentional, because rename support,
go-to-definition, explanations, invalidation, and tooling traces need source lineage later. Until those consumers put
harder pressure on the model, keep provenance boring: field lineage and direct evidence links only.
Do not use provenance as a generic completion marker, mode classifier, payload channel, ranking hint, or place to hide
missing domain fields.

Semantic graph edges should point at named records by handle. Avoid terminal JSON values, generic payload fields,
and ref wrappers unless a concrete materializer proves they are necessary. If a literal matters semantically, first
look for the named address, identity, product, field, or domain record it should belong to.

Source coordinates are current-world addresses. The active store can keep them useful by recomputing, remapping,
or invalidating through provenance. Snapshot-grade source epochs, content hashes, or migration rules belong in a
separate persistence layer if they become necessary.

Every enum member, exported type alias, class, and data-bearing property should carry a short source comment
that explains its grounded use. If a value or property cannot be explained this way, it probably does not belong
in the kernel yet.

## Record Families

`handles.ts` defines branded store-local handles and `KernelHandleFactory`, the scoped minting API for normalized
record links.

`store.ts` defines the hot in-memory `KernelStore`, batch commit surface, handle expansion, cheap navigation indexes,
and typed product-detail sidecar. Batches are record-emission units, not durable transactions, vocabulary
mutations, or semantic boundaries. The store also validates controlled vocabulary usage at commit time: product kinds
must be declared as product-kind vocabulary, claim predicates must be declared as claim-predicate vocabulary, and claim
endpoints must match the predicate's directional signature.

The store indexes normalized kernel records first. A `MaterializedProduct` is an envelope that names kind, identity,
address, and provenance. Claims are indexed by subject/object handles in the store instead of being duplicated on the
product envelope. Rich domain objects can hydrate that envelope through `product-details.ts`, where
typed slots validate the product kind before attaching current-run detail objects. Product details are for hot inquiry
and materializer handoff; they are not kernel records, generic payloads, JSON storage, or a persistence schema. If a detail
starts needing durable graph semantics, promote that semantics into named records, claims, identities, or addresses
rather than widening the detail sidecar.

`vocabulary.ts` is the public barrel for the controlled vocabulary mechanism used by claims, seams, binding
kinds, instruction kinds, and product kinds. The implementation is split by dependency direction and slot:
`vocabulary/core.ts` owns keys, slots, definition registration, and claim-signature algebra; `vocabulary/product-kinds.ts`
owns product-kind definitions; `vocabulary/open-seam-kinds.ts`, `vocabulary/binding-kinds.ts`, and
`vocabulary/instruction-kinds.ts` own non-claim slot vocabularies; and `vocabulary/claim-predicates.ts` owns signed
claim predicates. Claim signatures reference product-kind definitions directly, so TypeScript and Atlas can follow the
topology through symbols instead of stringly namespace/name tuples.

The folder-wide Atlas and auLink rule lives in [../README.md](../README.md). The kernel-local rule is narrower:
source-inventory aids should not become a parallel taxonomy. Domain semantics must stay in the real model and record
types, with Atlas reading those typed surfaces directly.

`address.ts` describes where something can be observed:

- Source files and source spans.
- Template units and template nodes.
- Generated compiler locations.
- External locations such as package metadata or host-provided catalogs.

`identity.ts` describes what semantic thing we believe something is:

- TypeScript declarations without retaining checker-owned symbols.
- Aurelia resources.
- DI keys, split by runtime key shape rather than carried by display descriptions.
- DI products produced while configuration and registration are spent into an abstract container world.
- Registration admission identities that name a key plus the admission/strategy family before container-state spending.
- Templates, template nodes, bindings, and instructions.
- Type-system projections for checker-backed type and member surfaces. These are handles over the current TypeScript
  program/checker epoch, not long-lived declaration identities by themselves.
Generated artifacts should earn concrete addresses, products, claims, and source maps instead of flowing through a
generic generated identity bucket.

`evidence.ts` describes direct witnesses:

- Source syntax such as decorators, static definitions, call expressions, and markup attributes.
- Semantic observations from the checker or analysis passes.
- Configuration flow, conventions, recovery, generated output, and external catalogs.
- Witness roles such as declaration, usage, registration, scope, transform input/output, or diagnostics.
- Evidence does not rank strength; confidence is a consumer/query policy decision.
- Evidence should answer "what was observed?" not "what should a consumer believe or do?"

`provenance.ts` explains why a field, claim, or product exists:

- Direct evidence for compact explanations.
- Field-level provenance for records whose properties come from different witnesses.
- Invalidation can walk from changed source to evidence/provenance to dependent claims and products.

`claim.ts` records typed assertions:

- A subject address, semantic identity, or product handle.
- A predicate vocabulary key and an object address, semantic identity, or product handle.
- A provenance handle for expansion.

`open-seam.ts` records first-class unresolved pressure:

- A controlled seam-kind key.
- A compact summary.
- Optional source address and direct evidence handles.
- Open seams answer "what remained unresolved and where can I inspect it?" not "how should an IDE, agent,
  diagnostic, or compiler rank the answer?"

`source-open-seam.ts` is the shared publication primitive for source-backed open seams. Use it when a materializer has a
source-file address plus an exact node/span and needs the standard source-span, evidence, optional provenance, and
open-seam record bundle. Evaluation, resource recognition, and registration seams should share this path instead of
locally minting parallel address/evidence/provenance/open-seam envelopes.

`materialization.ts` records products emitted around one owner:

- Products such as resource definitions, DI associations, binding records, or instructions.
- Product handles, claim handles, and open seam handles produced alongside those products.
- Completeness and outcome policy are derived by consumers from products, claims, provenance, and open seams.
- Materialized product envelopes should stay boring. If a consumer needs to expand a product into resource metadata,
  instruction details, parser publication state, or DI slot shape, use typed product detail slots or domain-specific
  records, not `unknown`, JSON, or payload storage.

`product-details.ts` is the current hot hydration sidecar:

- Detail slots are typed and tied to exactly one product-kind vocabulary key.
- Details may be rich in-memory objects and may retain current-run machinery when materializers need it, including
  TypeScript checker objects in the type-system substrate.
- The catalog validates that a product was committed and that its product kind matches the slot before accepting a
  detail.
- Details support inquiry and tooling expansion, but they are not a shortcut around kernel vocabulary, claims, or
  provenance when a relationship needs to become semantic.

## Query And Answer Pressure

The kernel should not sit as inert vocabulary. It becomes useful through a loop:

`source/evaluation -> claims/materializations -> queries -> answers -> continuations`

The query and answer layer should stay small, but it needs enough algebra to preserve uncertainty and
help AI agents choose an appropriate follow-up question. Expected answer outcomes include hit, miss, ambiguous, open,
partial, unsupported, and reroute. Answers should be able to carry products, claims, evidence, provenance, open
seams, policy-specific confidence/state, and suggested continuations.

Do not back-port answer semantics into materialization records, evidence, or open seams. A materialization records
emitted products and seams. The consumer-facing meaning of those records belongs in
the inquiry/answer layer. Autocomplete ranking, rename safety, diagnostic severity, AI usefulness, and AOT actionability are
query policy decisions layered over the kernel.

Store observations, claims, materializations, and provenance in the hot analysis world. Build
consumer-specific projections at query time: autocomplete candidates, app-map summaries, go-to-definition
payloads, explanation paths, and eventually refactor impact views.

## Evaluation Pressure

The product's value comes from flow: imports, exports, configuration functions, registration APIs, decorators,
static definitions, object literals, resolver helpers, and DI lookup machinery. The kernel should be used by an
evaluator substrate that performs explicit abstract interpretation over those shapes and records open seams.

The evaluator should prefer explicit open seams over pretending a path was understood. A useful partial result
with clear seams is better than a confident false positive.

The active vertical path connects TypeScript/module evaluation to DI, configuration, resource, and compiler questions:

- What keys, resources, and registrations are available here?
- Which source shapes produced them?
- Which claims and provenance records connected the pieces?
- Which parts are ambiguous, convention-derived, recovered, or still open?

That path should keep emitting kernel records so the vocabulary is pressure-tested by real materializers and real
queries instead of by static taxonomy design alone.
