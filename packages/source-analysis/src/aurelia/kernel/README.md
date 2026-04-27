# Aurelia Analysis Kernel

The analysis kernel is the low-level machine-readable semantic substrate for Aurelia applications. Its primary
shape is a long-lived in-memory analysis store that serves IDE features, MCP queries, agents, diagnostics,
future compilers, and analysis tools from the same normalized records.

The first pressure comes from MCP/AI and IDE features: template autocomplete, go-to-definition from markup,
future rename support, architecture maps, DI tracing, resource availability, and explanations for why a fact
exists.

The kernel is intentionally small and record-oriented. It captures observations, semantic claims, derivation
breadcrumbs, materialized products, and unresolved seams. Higher-level systems can then build IDE, MCP, AI,
diagnostic, and AOT projections from those records without rediscovering the same facts.

## Product Priorities

The first product surface is MCP/AI plus IDE substrate. AOT, snapshots, and refactoring engines matter later, but
the early kernel must not make them native constraints.

The first valuable experiences are:

- Template autocomplete with deep awareness of scope.
- Go-to-definition from markup into resources, bindables and DI-backed concepts.
- AI-readable app maps that explain how an Aurelia app is wired together.
- DI and configuration tracing that can answer "what is available here, why, and through which path?"

False positives are more dangerous than false negatives. Candidates, ambiguity, parser recovery, generated
facts, convention-derived facts, and unresolved seams must remain visible in the data model instead of being
collapsed into ordinary resolved facts.

Correctness and explanation quality matter before latency. The model should support large applications and
long-lived analysis processes, but it can spend more CPU while the architecture is still settling.

TypeScript analysis may initially bias toward completed programs. Template and expression analysis need better
partial-input behavior because autocomplete happens while users are actively typing.

## Design Rules

The kernel is hot-store first. It is not a snapshot schema, database format, or cross-run persistence contract.
Records are serializable for tests, MCP continuations, inspection, and debugging, but serialization does not imply
that every handle can be recovered after a restart or compared across unrelated analysis stores.

Record graph links use branded store-local handles. A handle is a navigable pointer inside one active analysis
store. It can be readable and stable enough for MCP continuations during that store's lifetime, but it is not
semantic truth. Real semantic identity lives in domain fields such as resource kind/name, DI key shape,
declaration coordinates, template owner/phase, and provenance.

Controlled vocabulary uses stable keys, not store handles. Claim predicates, rule kinds, derivation edge roles,
seam kinds, binding kinds, instruction kinds, and product kinds should use centrally defined vocabulary keys. New
entries should be added as implementation pressure proves they are needed, with namespace, stable code, and
grounded usage comment.

Vocabulary is another fast-evolving pressure surface. It is intentionally small while semantics are still being
implemented, but it must not become a dumping ground for near-duplicate relationship names or consumer-specific
answer states. Add vocabulary when a real producer or query needs a stable classifier; split or type vocabulary
slots when misuse becomes plausible enough to affect correctness.

The current unified vocabulary key type is provisional. It intentionally keeps early motion cheap, but it already
mixes different usage slots: claim predicates, seam kinds, derivation rule kinds, edge roles, product kinds,
binding kinds, and instruction kinds. These are not the same semantic contract. Split the key type by usage slot
once producer pressure reveals the taxonomy clearly enough to avoid guesswork.

Do not hide uncertainty behind `null`, empty arrays, or best-effort guesses. Use explicit provenance modes,
derivation states, materialization states, and open seams. Confidence, ranking, and user-specific belief policy
belong in query answers or consumer projections, not in first-order kernel facts.

Evidence and derivation are deliberate pressure surfaces. They are expected to evolve as real producers are
implemented, but they must not become catch-all storage for facts that belong in identities, addresses, claims,
products, open seams, or inquiry answers. Treat them as high-leverage unstable surfaces: useful because they sit
close to source reality and transformation flow, risky because they can quietly absorb policy, confidence,
debugging notes, partial analysis state, and consumer-specific answer semantics.

Semantic graph edges should point at named records by handle. Avoid terminal JSON values, generic payload fields,
and ref wrappers unless a concrete producer proves they are necessary. If a literal matters semantically, first
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

`store.ts` defines the hot in-memory `KernelStore`, batch commit surface, handle expansion, and cheap navigation
indexes. Batches are producer record-emission units, not durable transactions, vocabulary mutations, or semantic
boundaries.

`vocabulary.ts` defines the controlled vocabulary mechanism used by claims, rules, edge roles, seams, binding
kinds, instruction kinds, and product kinds.

`address.ts` describes where something can be observed:

- Source files and source spans.
- Template units and template nodes.
- Generated compiler locations.
- External locations such as package metadata or host-provided catalogs.

`identity.ts` describes what semantic thing we believe something is:

- TypeScript declarations without retaining checker-owned symbols.
- Aurelia resources.
- DI keys.
- Registrations.
- Templates, template nodes, bindings, instructions, and generated identities.

`evidence.ts` describes direct witnesses:

- Source syntax such as decorators, static definitions, call expressions, and markup attributes.
- Semantic observations from the checker or analysis passes.
- Configuration flow, conventions, recovery, generated output, external catalogs, absence, and open questions.
- Witness roles such as declaration, usage, registration, scope, transform input/output, or diagnostics.
- Evidence does not rank strength; confidence is a consumer/query policy decision.
- Evidence should answer "what was observed?" not "what should a consumer believe or do?"

`provenance.ts` explains why a field, claim, or product exists:

- Direct evidence for compact explanations.
- Derivation links for expandable explanations.
- Field-level provenance for records whose properties come from different witnesses.
- Invalidation can walk from changed source to evidence/provenance to dependent claims and products.

`claim.ts` records typed assertions:

- A subject address, semantic identity, or product handle.
- A predicate vocabulary key and an object address, semantic identity, or product handle.
- A provenance handle for expansion.

`derivation.ts` records rule applications:

- Discovery, normalization, resolution, lowering, materialization, and projection phases.
- Input and output edge handles, optional controlled edge-role keys, direct evidence handles, state, and open seam handles.
- Derivation dependencies between claims belong here rather than in claim-to-claim object links.
- Derivation should answer "which rule ran over which inputs and produced which outputs?" not "how should an IDE,
  agent, diagnostic, or compiler rank the answer?"

`materialization.ts` records phase products:

- Products such as resource definitions, DI associations, binding records, or instructions.
- Product handles, claim handles, derivation handles, and open seam handles produced alongside those products.
- Completeness/outcome state only; generated or convention-derived origin belongs in provenance/evidence.

`note.ts` contains small non-semantic notes for diagnostics and explanation hints.

## Query And Answer Pressure

The kernel should not sit as inert vocabulary. It becomes useful through a loop:

`source/evaluation -> claims/materializations -> queries -> answers -> continuations`

The query and answer layer should be minimal at first, but it needs enough algebra to preserve uncertainty and
help AI agents choose the next useful question. Expected answer outcomes include hit, miss, ambiguous, open,
partial, unsupported, and reroute. Answers should be able to carry products, claims, evidence, provenance, open
seams, policy-specific confidence/state, and suggested continuations.

Do not back-port answer semantics into derivation records. A derivation may record partial, blocked, speculative,
or failed production; the consumer-facing meaning of that result belongs in the inquiry/answer layer. Autocomplete
ranking, rename safety, diagnostic severity beyond concrete open seams, AI usefulness, and AOT actionability are
query policy decisions layered over the kernel.

Store observations, claims, derivations, materializations, and provenance in the hot analysis world. Build
consumer-specific projections at query time: autocomplete candidates, app-map summaries, go-to-definition
payloads, explanation paths, and eventually refactor impact views.

## Evaluation Pressure

The product's value comes from flow: imports, exports, configuration functions, registration APIs, decorators,
static definitions, object literals, resolver helpers, and DI lookup machinery. The kernel should be used by an
evaluator substrate that performs conservative abstract interpretation over those shapes.

The evaluator should prefer explicit open seams over pretending a path was understood. A useful partial result
with clear seams is better than a confident false positive.

The first strong vertical slice should connect TypeScript/module evaluation to DI and configuration questions:

- What keys, resources, and registrations are available here?
- Which source shapes produced them?
- Which derivation rules connected the pieces?
- Which parts are ambiguous, convention-derived, recovered, or still open?

That slice should emit kernel records from the start so the vocabulary is pressure-tested by real producers and
real queries.
