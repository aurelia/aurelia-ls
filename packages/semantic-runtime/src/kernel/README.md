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

Handle readability is a debugging aid, not a persistence guarantee. `KernelHandleFactory` may compact long or recursive
store/local key parts when serializing a handle, while the record itself keeps the semantic fields needed for
navigation and explanation. Store-key parts compact earlier than local parts because the workspace/store label is
repeated on every handle. If a consumer needs a stable name, source coordinate, route key, DI key, or type identity,
model that as a product/identity/address field instead of parsing it back out of a handle string.
The compact readable prefix is deliberately short; the hash is the store-local identity check, while typed records own
the semantic payload. Prefer improving identity/address/product rows over making handle strings more descriptive.
Current compaction thresholds intentionally favor hot-path memory pressure over long handle readability: once a store
or local key becomes broad, the handle keeps only a short sanitized prefix plus a stable hash. If debugging needs more
text, add a product/detail/source field that owns that meaning instead of widening handles globally.

Source lookup follows records, not handle strings. `source-address.ts` is the shared resolver for authored source
anchors: it follows source, template, generated, and identity links, including generated addresses anchored to semantic
identities. Callers that need exact source spans for continuations, diagnostics, hovers, or future edits should reuse
that resolver instead of casting identity handles to address handles or scanning identity fields locally.
This resolver intentionally collapses generated/template carriers to the nearest authored source. Public API display
keeps generated/template carrier identity in `source-reference.ts` and points at the authored source through `anchor`;
do not merge those two switches unless the replacement preserves both internal source lookup and public evidence kind.
`authored-source-text.ts` is the shared raw-file text reader for cases where a source span must be sliced or converted
to a cursor position. Use it instead of local `readFileSync` plus line math; template markup can be decoded or mapped
while authored spans still point at the original HTML or TypeScript host text. Resource convergence, i18n JSON asset
span mapping, template diagnostics, cursor offset conversion, and template overlay expression projection should all
enter through this boundary when they need authored file text.

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

Framework diagnostic authority is source-shaped. Use `frameworkErrorCode(...)` only for mapped Aurelia
`ErrorNames`/`Events` labels, and use `frameworkRawErrorAuthority(...)` for exact public framework raw `Error`
throw sites that have no AUR code. Do not mint fake codes or collapse raw framework behavior into generic product
policy just to make a diagnostic row look framework-grounded.

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
Before changing source-address representation, use telemetry's source-span role, source-file role, and handle-character
breakdowns to distinguish true duplicate spans from unique authored anchors. Exact de-duplication is only useful when
the same file/start/end/role repeats; otherwise the pressure is representation, inquiry depth, or query-local projection.

Every enum member, exported type alias, class, and data-bearing property should carry a short source comment
that explains its grounded use. If a value or property cannot be explained this way, it probably does not belong
in the kernel yet.

## Record Families

`handles.ts` defines branded store-local handles and `KernelHandleFactory`, the scoped minting API for normalized
record links.

`store.ts` defines the hot in-memory `KernelStore`, batch commit surface, missing-record commit guard, handle expansion,
cheap navigation indexes, and typed detail catalogs. Batches are record-emission units, not durable transactions,
vocabulary mutations, or semantic boundaries. The store also validates controlled vocabulary usage at commit time: product kinds
must be declared as product-kind vocabulary, claim predicates must be declared as claim-predicate vocabulary, and claim
endpoints must match the predicate's directional signature.
`KernelStore.markLifetime()` / `disposeSince(...)` is the app-session reclamation primitive for answer-local work. A
lifetime marker tracks ownership lineage, not append position: replacing a computation publication preserves its
lineage lifetime unless the candidate consumes a younger positive kernel dependency, including a positive row returned
by an unresolved aggregate read. In that case the complete owned record/detail closure advances to the dependency's
lifetime even though aggregate membership remains honestly open. This monotone rule prevents an older publication from
surviving disposal after it has incorporated answer-local truth. `markObservation()` is the
separate mutation cursor for telemetry and phase-density reads, so replacement writes remain measurable without making
them answer-local. Query boundaries such as `QueryClaimGraph` use lifetime markers; telemetry uses observation markers.
The disposal summary includes reclaimed record-handle character mass as well as record/detail counts, because
handle strings are a first-class memory-pressure signal for one-off public answers. Use it when an inquiry profile says
answer-local TypeChecker products should be measured but not retained.
Store-local sidecar indexes register through `KernelStore.registerSidecarIndex(...)`. They are not semantic storage;
they are acceleration structures that mirror kernel/product-detail lifetime and must drop stale references during
`disposeSince(...)`. Telemetry reports their entry counts so hidden projector/cache indexes do not become invisible heap
owners. `contract:type-projection-lifetime` is the current canary: it proves the TypeChecker type-shape index loses
answer-local product-detail references when the kernel marker is disposed, then repopulates from a fresh projection.
`KernelStore.readTelemetrySnapshot(...)` keeps its count lane cheap: record handle-character totals and sidecar sizes are
maintained incrementally, while high-cardinality kind and handle-character breakdowns remain behind the explicit
`includeBreakdowns` option. Do not add full-store scans to the default snapshot path; phase profiling calls it often.
Use `KernelStore.readDensitySince(...)` and `readDetailDensitySince(...)` for phase-local x-rays because those operate
from observation markers and inspect records/details mutated after the marker. Shallow product-detail and hot-detail
density is a second opt-in lane behind `includeDetailDensity` for whole-store snapshots and behind phase-detail
telemetry for phase-local rows. Use it when memory pressure needs to know which sidecar detail kinds and direct fields
carry mass; do not smuggle those scans into ordinary adapter answers.
`KernelTelemetryReadView` carries the same count/marker contract across committed and staged worlds. A staged
publication reports the logical candidate view (prior owned closure removed, current candidate added), while density
markers inspect only writes staged after the marker. Phase telemetry must spend that view instead of sampling the
committed store and reporting an atomic candidate as empty.

`computation-lifecycle.ts` owns technical execution history for same-runtime recomputation. A domain locus reconciles a
stable computation ID; each run stages a complete read set and publication closure; commit revalidates every typed read
before replacing the prior state. `publication.ts` is the required materializer write boundary for immediate and staged
execution. `KernelStore.replacePublication(...)` prevalidates ownership, references, detail envelopes, and unsupported
sidecar participation before one synchronous callback-free replacement. Computation-owned replacement uses
`replaceOwnedPublication(...)`, which admits source/input validation and the owner's fallible producer-index preflight
inside the same store mutation barrier. Every external validation callback, including the final currentness callback,
runs before the store's callback-free normalization and structural-closure recheck and mutation tail. Normalized records,
publication plans, manifests, decisions, and their structural arrays are sealed before any external validator runs. A failed or stale run
leaves the previous records, details, read index, producer index, and manifest intact. Sidecar indexes remain
acceleration structures; replacing a detail they index is rejected until that index registers an explicit lifecycle
participant.
The retained lifecycle read set is transition evidence, not automatically the public serviceability contract of the
result. It may include broad execution, carry, and explanation witnesses whose authority legitimately changes when the
run publishes its own outputs even though the admitted domain result remains usable. Each domain generation therefore
owns the exact smaller root set that decides whether its public result can still be served. A
`ComputationReadValidationScope` may share validation of one logical `(domain, readKey, observedRevision)` across nested
generations inside one synchronous proof. It is not a cache, epoch, read manifest, or publication authority. Every
independent public check and final commit starts a fresh scope.
Manifest authority requires the exact frozen manifest object currently admitted by the store and the same owner that
created its lineage; a copied handle list, an earlier manifest, or an exact lifecycle manifest presented through the
store-owned lane is stale. The manifest's monotone lifetime then proves that every listed record and detail still belongs
to that lineage and cannot outlive a positive dependency it consumed. Successful replacement retires the prior capability, and lifetime disposal enumerates and retires the
final capability even when a store-owned or lifecycle-owned closure is empty. Detail admission captures the exact
foreign catalog entry (including absence) seen during staging and revalidates it at commit. Fallible detail-field
normalization is prepared without mutation, then applied as one reversible descriptor transaction before any live
catalog mutation. Fresh or exactly equivalent candidate details may receive provisional weak-envelope bindings so
final validation sees the post-state graph; rejection restores those bindings and normalized descriptors. Reading a
staged candidate never rebinds an already committed detail to a changed envelope. A reused detail may be read only when
its candidate product envelope is exactly equivalent, otherwise the producer must emit a fresh generation-local
detail. Retained committed bindings refresh only in the callback-free successful-admission tail. A failed staged write
poisons the run so an accepted prefix can never become a commit payload. Rich typed detail payloads remain domain
objects and are not recursively frozen by the kernel. Ordinary republication of the same mutable object conservatively
advances its revision; only explicit exact child carry may preserve object identity. Producers still own the stronger
discipline that semantic fields of an admitted object are immutable between publications. The kernel can detect changed
structural closure and republished mutation, but cannot infer an arbitrary in-place semantic mutation that was never
presented as a candidate.
Committed domain object graphs are admitted once per computation run and domain through the lifecycle registry. Do not
construct a second authority around the same committed publication or let a domain-local cache decide uniqueness.
Exact `ComputationRun` record, product-detail, and hot-detail reads capture the committed catalog revision by
construction. Candidate writes and the hidden prior owned closure never masquerade as inputs; a positive foreign
`IfAbsent` admission is a dependency even when no later lookup expands it. The registry indexes each committed output
through the same exact read key, so producer ownership and reverse readers join without a semantic claim or handle-name
heuristic. Detail dependency keys identify catalog occupancy by handle; the requested/actual detail kinds are revision
facets, because one handle cannot host independent slots. Exact reads whose keys become outputs of the same admitted
generation are removed only after the store has
computed the authoritative publication decisions; borrowed `IfAbsent` rows have no output decision and remain reads.
Replacement and retirement preflight producer ownership before store mutation, then update the index infallibly after
admission. Lifetime disposal clears it with the reclaimed publication.
The next run at a locus reads through a candidate view that hides every record and detail owned by the prior manifest.
Still-current outputs must be restaged as part of the complete next closure; otherwise commit withdraws them. This
prevents a materializer from mistaking its own old output for upstream truth and then publishing a partial replacement.
The staged record/detail maps are both the read-your-writes authority and the final commit payload, so duplicate
`IfAbsent` admission cannot resolve one way during construction and reappear as duplicate rows at commit.

`ComputationRun.withChild(...)` partitions one still-atomic outer candidate into logical read/output manifests. Child
scopes are synchronous preparation scopes: they cannot commit or abort the run, and a thrown or asynchronous callback
poisons the outer candidate. Children are flat within the outer run: entering a child from inside another child changes
the active writer for that scope; it does not create a parent/child hierarchy. Do not use lexical nesting to imply
hierarchical scheduling or lifetime. The staged publication retains the final child writer and a run-local mutation ordinal for
every record, product detail, and hot detail. Exact reads of another child's candidate become child-to-child edges;
reads of candidate absence are also revisioned so a later sibling cannot silently fill them. Repeated reads of the same
candidate-local absence coalesce as one negative dependency; the explicit absence revision and the candidate lookup's
`null` representation are two views of the same state, not conflicting outputs. Positive foreign
`IfAbsent` admissions remain committed reads of the child that attempted them, including mismatched-slot lookups, rather
than dangling edges to a candidate that produced no output. Candidate-local `IfAbsent` admission observes the occupancy
it establishes: an unchanged self-read disappears from the committed manifest, coalesced siblings retain a producer
edge, and a later stronger writer rejects the prepared candidate instead of silently changing what an earlier child
consumed. Publication references and product/hot-detail envelopes register structural dependencies even when a
materializer did not issue an explicit lookup. Those links preserve referential integrity, retention, withdrawal safety,
and child topology; they do not claim that the target value was consumed. A materializer whose result depends on target
semantics must still perform an exact or candidate read through the publication context.

`ComputationRun.tryCarryChild(...)` is the explicit no-work operation for one prior declared singleton child. It is
available only before candidate work starts and only when the prior child has revisioned reads, stable producer
ownership, and no nontrivial SCC. Exact reads must rebase to current authorities; candidate-local semantic dependencies
must still be present from the same producer and preview as `Retain`. Structural dependencies rebase by target presence
and rich-detail slot compatibility, so replacing a target value under the same identity does not by itself invalidate a
consumer that only retains the link. The store-owned preview classifies only the prior child outputs and positive
candidate dependencies whose `Retain` decisions gate carry. Its lazy projection may read an omitted prior entry as the
committed value while resolving that bounded comparison closure; omission in the final plan still means withdrawal.
Every touched prior entry must retain the exact manifest lifetime, and staged records are sealed before a comparator can
observe them. Carry declines before preview when any sibling has already staged one of the prior outputs. Domain
read-rebase callbacks may inspect only the supplied preview context; the owning run rejects reads, writes, child entry,
commit, and abort while a rebaser executes. Carry preflights every read-map merge before it mutates staged publication,
then installs exact prior
entries. Preview and final replacement spend distinct runtime-branded capabilities: arbitrary structural lookalikes and
preview authority cannot authorize commit, and final sealed authority cannot be reused as speculative preview. Final
commit revalidates the rebased reads and currentness guards under the same atomic replacement barrier.
`ComputationRun.domainReadProjection` exposes the same candidate-aware product-detail and materialization-owner values
without registering generic lower-level reads. A domain may use it only while constructing a typed read that accounts
for every consumed value itself. Carry rebase receives the equivalent after-carry preview, allowing that typed read to
compare current domain semantics without weakening exact kernel reads or teaching the kernel domain field vocabulary.
The prospective carry projection indexes its exact output descriptors once, groups carried materializations by owner,
and joins them with the staged publication's owner index. The projection remains live while later children stage: its
opaque identity distinguishes alternative overlays, while its committed and candidate ordinals advance with the shared
base. A domain rebaser gets first refusal for projection-sensitive reads; returning `undefined` permits the lifecycle to
reuse an equal read already acquired by this run, while `null` refuses carry. Final commit still performs an independent
currentness proof.
Both projections expose a `KernelReadProjectionRevision` for memoizing repeated traversal at one unchanged view. This
is a technical cache witness, not a computation read or semantic epoch; the typed domain read still owns its result
revision and final currentness validation.

The outer computation remains the sole manifest owner and store transaction. Every admitted output has exactly one
logical child owner, with an explicit remainder child retaining phases that have not earned a narrower boundary.
Commit seals the publication graph before preparation enters the store replacement barrier. Record/detail comparison,
binding preparation, and reversible descriptor normalization finish first; then one frozen decision set reaches the final input, child-read, and producer-
ownership preflight immediately before the callback-free mutation tail. Admitted transitions classify each
prior/current child as executed, carried, or withdrawn so conformance and later schedulers can inspect how the atomic
result was obtained without retaining domain payloads. After every external validation and currentness
callback, the store revalidates normalized descriptors and reprojects structural closures, so a validator cannot mutate
provisional metadata or dependency shape unnoticed. Validators may re-read the frozen candidate through the run during the committing phase, but cannot
observe new dependencies, enter children, publish, or mutate any store or detail-catalog surface. Rejection restores
candidate descriptors and provisional weak bindings. Superseded candidate leases are restored before the store can
admit the final publication, so abandoned cleanup cannot corrupt or throw after durable commit. After external
validation, the store reprojects each rich detail's structural closure and rejects payload mutation rather than
admitting an object whose exact reads, retention, and withdrawal guards describe an older shape. A validator,
projector, or descriptor trap that starts a newer run supersedes the old candidate before admission.
Replacement allocates a store lifetime only after this final preflight, then updates outer and child indexes only after
successful admission. Rejection preserves the incumbent publication and both index layers.
Run currentness guards are admission capabilities, not semantic inputs. They are rechecked at the same preflight and
final mutation boundaries, but never enter the computation state, reverse-reader index, changed-read summary, or
lifetime closure. Use one for a project-input event generation whose revocation means that work may no longer commit;
register the exact source, configuration, profile, and upstream product reads separately as the causal dependency
closure. Conflating those roles makes an event-only generation advance invalidate reusable semantic work and invents a
reader edge that no output actually depends on.
`ComputationChildState.hasOnlyRevisionedReads` means only that no
unresolved aggregate read was recorded; it is not yet a scheduler-ready or cycle-free reuse claim. Whole-store,
source-file-index, and whole-materialization enumeration remain explicit open reads. Materialization consumers that know
the semantic owner use exact owner-membership reads instead: additions and removals change that owner's revision, staged
rows become producer-to-consumer child edges, and the computation's own replacement closure is excluded from commit
validation. Empty child scopes are omitted from committed manifests; an exact negative read or open aggregate read is
real work and therefore keeps its child state.

Lifecycle state snapshots read metadata, aggregate-row evidence, outputs, children, and normalized locus identity into
kernel-owned frozen values before admission. A committed locus intentionally retains only `kind`,
`reconciliationKey`, and `summary`; domain identity belongs in the reconciliation key rather than an `instanceof`
contract or caller-owned payload. Selective lifetime disposal roots the positive exact record/product-detail/hot-detail
inputs and positive committed rows retained by active aggregate reads, in addition to active outputs and structural
references. It may reclaim unrelated young rows, but never the live input closure of a retained computation.

The first production partition is the complete recursive authored-template compiler front door across all app and
authoring cohorts for one stable owner. It owns source snapshots, compiler observations, and compilation/parsing/
lowering products. Project-wide runtime and TypeChecker analysis deliberately remains in the explicit post-template
child because its schedule, expression world, and bound-controller values currently cross family boundaries. Do not promote those
products to family ownership until those aggregate and cross-family edges are explicit.

`KernelStore.publish(...)` remains the immediate first-publication boundary used by eager producers. It is not a
recomputation protocol: it has no prior manifest, cannot withdraw omitted output, and legacy nested producers may emit
references before an outer owner batch exists. Records and typed details nevertheless enter through the same atomic
replacement preflight, so a rejected detail cannot leave an accepted record prefix behind. An immediate publication
that owns nothing does not consume a lifetime; replaceable store and computation generations still own explicit empty
manifests. Do not use immediate publication to approximate replacement with cleanup calls. Migrate a logical owner to
one staged closure when rollback, currentness, or same-runtime replacement becomes part of its contract.

Materializers whose closure proof depends on records staged earlier in the same run consume the narrow candidate-aware
read view they need, not the committed store directly. `KernelRecordCollectionReadView`, `KernelSourceFileReadView`,
and `KernelMaterializationReadView` hide the prior owned manifest and overlay pending records, source-file addresses,
and materializations on unrelated committed facts. Support and closure checks therefore see one candidate generation
without publishing an intermediate world or locally merging side lists. Template-family compilation is the first
recursive consumer: one owner-family child shares authored local definitions across an immutable planned cohort set,
reads only the materialization owners participating in its compiler scopes, and retains cohort-specific compiler
products under the enclosing app publication replacement.
`KernelPublicationContext.readProductDetail(...)` and `readHotDetail(...)` provide the corresponding typed
read-your-writes view for a known handle. They deliberately do not expose staged whole-slot enumeration: combining a
prior manifest's rows with candidate rows would manufacture a mixed generation. Aggregate phases must pass their
complete candidate emissions explicitly, while exact links may follow a staged detail by handle. Whole-store,
whole-slot, source-file-index, and whole-materialization scans still need domain-owned membership/order/closure
revisions; recording only their returned positive handles would make additions and authoritative absence invisible.

A projector or expression world backed by a `ComputationRun` is a candidate-generation capability, not a retained
query cache. It may be shared by every materializer in that generation and by follow-up work that runs before commit,
but the run is closed after commit. A committed emission rebinds its retained expression world to a store-backed
publication guarded by the exact committed generation authority; replacement or disposal revokes reads as well as
lazy writes. Inquiry-local work that is not retained by a generation starts a fresh evaluator/cache over that same
generation-bound store publication; "fresh" does not mean a new semantic generation or an unguarded store writer.

There is one `ComputationLifecycleRegistry` per `KernelStore`. The store enforces that ownership boundary and notifies the
registry when lifetime disposal reclaims a complete publication, so a later run cannot reuse a stale manifest or steal
handles republished by another owner. `ComputationRecordReadView` adapts existing normalized-record traversals into exact
positive and negative computation reads by spending the store's record revision. Use it when a source-address or other
kernel graph contributes to an output; observing only the final file text leaves the graph route itself staleable.

`record-comparison.ts` exhaustively compares normalized kernel record kinds and keeps semantic replacement distinct from
source/provenance witness refresh. Rich details use slot-specific comparators where one has been earned; the exact
executable slot object owns that policy, while its inert descriptor and `detailKind` name catalog occupancy and
cross-domain references. A distinct same-kind slot is a different executable contract and therefore replaces rather
than comparing or satisfying a typed read. Structural-reference closure remains the exact lifetime and dependency
authority. When that closure changes, the slot comparator may classify the fresh payload and closure as
`RefreshWitness`, but it may not retain the incumbent object and its old closure; a comparator-reported `Retain` is
escalated to `Replace`. An unsupported detail comparison conservatively replaces.
`project-input.ts` owns coherent, revocable source/configuration generations and their captured host reads. The event
generation is a currentness guard; it is not itself a computation read. A boot frame's semantic revision therefore
describes structural project admissions and compiler options rather than the event sequence that happened to capture
them. `source-text-snapshot.ts` validates exact per-file source values within one such generation when a computation
needs a source-specific witness. These technical lifecycle products do not replace semantic claims, materialization
records, evidence, or provenance.

The store indexes normalized kernel records first. A `MaterializedProduct` is an envelope that names kind, identity,
address, and provenance. Claims are indexed by subject/object handles in the store instead of being duplicated on the
product envelope. Rich domain objects can hydrate that envelope through `product-details.ts`, where typed descriptors
name the admitted occupancy and executable slots attach its structural-reference projector. Keep descriptors in inert
domain catalogs: cross-domain projectors import those identities, never another domain's executable slot graph. This
prevents dependency topology from becoming JavaScript module-initialization topology while preserving one typed contract
for reads and publication. Product details are for hot inquiry and materializer handoff; they are not kernel records,
generic payloads, JSON storage, or a persistence schema. If a detail starts needing durable graph semantics, promote that
semantics into named records, claims, identities, or addresses rather than widening the detail sidecar.
`ProductDetailCatalog` also binds each detail object to its owning `MaterializedProduct` envelope through a weak
association. Detail classes may expose `productHandle`, `identityHandle`, `sourceAddressHandle`, `addressHandle`, or
`provenanceHandle` for ergonomic product-local navigation. Domain-specific aliases such as `hostAddressHandle` are
also envelope-backed when they exactly equal the product address. Catalog admission normalizes own fields that exactly
echo the envelope into non-enumerable shared getters. That keeps retained hot details from storing duplicate handle
strings while preserving the public in-process shape. Cross-product handles such as instruction, syntax, declaration,
or binding links remain explicit detail payload and should not be hidden as envelope facts. Every executable slot
projects those links into a frozen structural closure at publication. Record references, product-detail occupancies, and
hot-detail occupancies are distinct surfaces: an envelope handle is not evidence that a particular sidecar exists or has
the same revision. Validation, child-edge derivation, retention, and withdrawal safety all consume the same closure.
`FieldProvenance` remains epistemic lineage for fields; it does not replace structural dependency edges. Likewise,
compact logical references may be projected as exact occupancy only when their producer contract guarantees that
sidecar is published in the same atomic plan.
`ProductDetailCatalog` and `HotDetailCatalog` share one composed storage/lifetime core; their wrappers retain the
different semantic admission contracts. `HotDetailCatalog` requires an explicit owning `MaterializedProduct` whose
kind matches the slot, while the child keeps a branded `HotDetailHandle` rather than masquerading as a product. An
exact `handle` or `detailHandle` echo becomes a getter. Declaration/source handles remain explicit unless another
durable record owns that relation.

Detail publication lifetime is closed over its product owner. A publication that attaches a product detail or hot
child to a product from another publication inherits that product record's lifetime. Selective answer-local disposal
roots every active manifest, its detail-owner products, and the transitive normalized-record references needed by
those products. It must never retain a sidecar while reclaiming the owner's identity, address, or provenance records.

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

`source-address.ts` is the shared narrowing layer from arbitrary kernel addresses back to authored source. Keep source
file and source span recovery on the same traversal so template/generated anchors do not drift between hover,
diagnostic, open-seam, and repair surfaces.

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
- `fieldProvenanceWhenDistinct` is the default helper when a materializer has an owning product/source provenance and
  optional field-specific witnesses. If a field repeats the owner provenance, rely on the product/source record instead
  of storing a field-level echo.
- Evidence and provenance explain witness lineage after a change. Scheduling dependencies come from registered
  computation reads; treating witness links as execution reads loses negative lookups and service/policy dependencies.

`claim.ts` records typed assertions:

- A subject address, semantic identity, or product handle.
- A predicate vocabulary key and an object address, semantic identity, or product handle.
- A provenance handle for expansion.

`open-seam.ts` records first-class unresolved pressure:

- A controlled seam-kind key.
- A compact summary.
- Optional source address and direct evidence handles.
- Optional reason-source rows when one coherent seam has reason kinds contributed by adjacent source sites.
- Open seams answer "what remained unresolved and where can I inspect it?" not "how should an IDE, agent,
  diagnostic, or compiler rank the answer?"

`source-open-seam.ts` is the shared publication primitive for source-backed open seams. Use it when a materializer has a
source-file address plus an exact node/span and needs the standard source-span, evidence, optional provenance, and
open-seam record bundle. Evaluation, resource recognition, and registration seams should share this path instead of
locally minting parallel address/evidence/provenance/open-seam envelopes. When the unresolved boundary has a
machine-readable reason, pass it through the shared primitive as `reasonKinds`; source precision and repair intent
should travel together. If only one reason inside a multi-reason seam has a distinct source site, such as router href
target-open pressure from a neighboring `target` attribute, attach a `reasonSources` row instead of splitting the seam.
Use `recordsForSourceOpenMaterialization(s)` only when the source span represents an attempted semantic product that
failed before producing a product. It adds an empty-product materialization owned by that exact span. Raw evaluator
boundaries remain source-backed evidence until a domain materializer spends them; wrapping every evaluator seam in a
materialization would erase the distinction between analysis coverage and product pressure.
Kernel reason sources carry address/evidence handles, not authored line tables. API projections should derive
`sourceRange` query-time from those handles when a public answer needs line/column locations.

`issue-publication.ts` is the shared publication primitive for source-backed diagnostics that are themselves modeled as
semantic products. Use it when a domain issue needs the standard evidence, provenance, identity, materialized-product,
and optional materialization records, while keeping the domain-specific issue object and identity class in the owning
package. Do not wrap those results in one-off publication classes unless the publication object has behavior or a real
lifetime.

`materialization.ts` records products emitted around one owner:

- Products such as resource definitions, DI associations, binding records, or instructions.
- Product handles, claim handles, and open seam handles produced alongside those products.
- A failed attempt may produce no product and retain only its seam handles; a partial product attaches its seams to the
  existing product materialization instead of publishing an unrelated failure row.
- Completeness and outcome policy are derived by consumers from products, claims, provenance, and open seams.
- Materialized product envelopes should stay boring. If a consumer needs to expand a product into resource metadata,
  instruction details, parser publication state, or DI slot shape, use typed product detail slots or domain-specific
  records, not `unknown`, JSON, or payload storage.

`product-details.ts` is the current hot hydration sidecar:

- Detail slots are typed and tied to exactly one product-kind vocabulary key.
- Detail entries carry the owning `MaterializedProduct` envelope, not just the product handle. That keeps envelope facts
  derivable at the catalog boundary and gives future representation work one place to remove detail-side echoes without
  losing navigation.
- Details may be rich in-memory objects and may retain current-run machinery when materializers need it, including
  TypeScript checker objects in the type-system substrate.
- The catalog validates that a product was committed and that its product kind matches the slot before accepting a
  detail.
- Use `ProductDetailCatalog.addAll(...)` / `addAllIfAbsent(...)` when a materializer attaches a homogeneous emission
  row family whose members carry product handles. Keep one-off conditional details explicit, especially when a product
  handle can be absent or a different slot owns the fallback.
- Product details participate in kernel mark/dispose so answer-local product details can be reclaimed with their
  kernel envelopes. Do not use that as a substitute for modeling app-world epochs when durable materializer products
  need invalidation.
- Details support inquiry and tooling expansion, but they are not a shortcut around kernel vocabulary, claims, or
  provenance when a relationship needs to become semantic.

`hot-details.ts` is the lower-cost sidecar for child details that do not need their own durable `MaterializedProduct`
envelope, such as TypeChecker member surfaces owned by one projected type shape. Each hot slot names its owner product
kind and each publication names the exact owner envelope. Replacement therefore refreshes retained children with a new
owner witness and refuses to withdraw or replace a product while a foreign publication still owns one of its hot
children. Hot details also participate in mark/dispose so query-local member projections can be reclaimed with their
owning publication.

Sidecar indexes, such as the TypeChecker type-shape projector index, are allowed when repeated lookup would otherwise
re-materialize expensive current-epoch objects. Keep them named, registered on the `KernelStore`, and disposable. A
sidecar index that cannot explain what kernel/product-detail lifetime it mirrors is probably a cache policy or inquiry
algebra problem rather than a kernel primitive.

Telemetry may show that detail-side string mass is dominated by handle-valued fields such as product, identity, source,
or declaration handles. Detail density also reports product-envelope echoes: handle fields in a detail that duplicate
the owning `MaterializedProduct` handle, identity, address, or provenance handles. Treat those rows as representation
and inquiry-depth pressure, not as permission to parse or drop handles casually. The handles are navigable links;
whether they should be compressed, interned, made numeric behind a transport layer, derived from the envelope, or
avoided at a shallower query depth is a product/runtime decision.
Read the density rows by lane: envelope echoes are candidates for deriving from the product-detail entry or envelope,
non-envelope handles are usually cross-product navigation, and non-handle string mass is the remaining scalar payload.
This keeps representation work grounded in actual ownership instead of a broad "string count is high" reaction.

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
