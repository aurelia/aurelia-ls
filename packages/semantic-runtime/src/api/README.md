# Semantic Runtime API

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns the in-process API boundary for opening an Aurelia app with the semantic runtime. It is a library
surface, not a daemon, CLI, or snapshot format.

`semanticWorkspaceDescriptorForRuntimeOptions(...)` is the shared, serializable source-world boundary used by IDE,
MCP, and future AOT adapters. It normalizes workspace exclusions and either automatic marker discovery plus host root
hints or a complete explicit-project topology; store namespaces and live input-authority objects are deliberately not
semantic facts. `parseSemanticWorkspaceDescriptor(...)` is the strict untrusted JSON entry point for
`semantic-workspace/1`: it rejects unknown versions/properties, invented source vocabularies, and non-normalized paths
or set-like arrays. `semanticRuntimeOptionsForWorkspaceDescriptor(...)` reconstructs boot options only after that
validation. Ordinary consumers should use shared discovery and select an admitted `projectKey`; explicit projects are
for hosts that own the complete project/source topology, not a shortcut for choosing one app.

The API should stay close to the typed substrate. It may compose boot, evaluation, configuration, DI, resource,
compiler, rendering, and TypeChecker-backed products, but it should not recreate those layers as private summary tables.
When an answer becomes awkward, prefer improving the underlying product records or adding a narrow query projection over
building compatibility glue here.

Keep `runtime.ts` as the boot/app facade. Public query enums, answer envelopes, row interfaces, and result interfaces
belong in `contracts.ts`; row projection helpers that are already specific to one substrate family should live in
focused modules such as `binding-projections.ts`, so expanding the authoring API does not turn the facade into a second
materializer.
Answer envelope/page mechanics live in `answer-helpers.ts`. Route-family answerers live in `app-route-queries.ts`:
that module owns the public query-method shape for router options, route configs, route contexts, recognizer rows,
viewport instructions/agents, route trees/nodes, and component agents, while `runtime.ts` only delegates the route
family. `route-query-registry.ts` owns the shared route query descriptors: `SemanticAppQueryKind`, stable
`routeProductKind`, row reader, and answer label. `route-effect-facts.ts` is the authoring-facing bridge over those
descriptors so API dispatch, verification, and orientation share one registry of router product rows.
Template-family answerers live in `app-template-queries.ts`: that module owns template-compilation rows plus
template completion, cursor-info, references, inlay hints, and diagnostic query handoff, while the runtime facade keeps only app opening,
app-level dispatch, and direct cursor-locus convenience methods.
App-query identity, locus, and invalidation epoch keys live in `app-query-identity.ts`. Keep reuse/invalidation keys
there rather than rebuilding private string keys in the MCP adapter, scripts, or individual answerers.
`unsupportedSemanticAppQuerySelectorFields(...)` is the catalog-owned authority for caller fields that the current query
cannot consume. `answerUnsupportedSemanticAppQuerySelectors(...)` turns those facts into an `unsupported` answer before
app-world construction, while `semanticAppQueryRequestKey(...)` keeps invalid request shapes distinct from the normalized
valid-query identity. `semanticAppQueryCatalogShape(...)` then normalizes the supported envelope before app dispatch,
claim identity, materialization policy, authoring-template opt-in, default inquiry-profile selection, and continuation
target-query shaping. Update these boundaries together when a query option is added so unsupported cursor/source/detail
knobs neither disappear nor contaminate caches, epoch keys, or pre-open policy.
`SemanticApp.answerRoutedQuery(...)` records the shaped semantic answer and neutral continuation rows. Public
`SemanticApp.ask(...)`, routed runtime answers, and batch answers apply `continuationIntents` and continuation-target
`diagnosticProjection` only after their last reusable claim boundary. A diagnostic query that consumes
`diagnosticProjection` still includes it in current-query identity; a source query that does not consume it may use the
same field solely as response-envelope policy for diagnostic continuation targets.
Its non-router dispatch is grouped through `semanticAppQueryCatalogRow(...).group`; keep that as the public app-query
family boundary before adding another branch table or moving a substrate-family answerer back into `runtime.ts`.
`semanticAppQuerySourceFileLocus(...)` owns the cursor-to-source-file bridge used by catalog shaping and continuation
source-locus evidence; do not recreate a local `sourceFile ?? cursor.filePath` helper in query answerers.
Public source-locus DTOs, bounded row source-reference traversal, and per-reference source-facet classification live in
`source-reference.ts`. Use those helpers when an answer policy needs to inspect returned source evidence; do not add
another recursive DTO walker or authored/generated/external ranking in a diagnostic, continuation, hover, or future edit
surface.
`PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS` is intentionally contract-checked against public row DTOs whose nested fields
contain `SemanticSourceReference`, and the contract also synthesizes those DTO paths to prove the runtime collector can
actually reach them. Add a carrier key when a row nests source-bearing objects instead of widening the collector to
arbitrary object recursion or adding depth-based special cases.
Generated addresses may be anchored to either source addresses or semantic identities. Public source descriptions must
follow the shared kernel source-address resolver so identity-backed generated products can still point back to authored
TypeScript or template spans instead of dropping to broad generated carriers.
Continuation source facts follow `SemanticSourceReference.anchor` for authored template/source carriers. A generated
reference retains its `generated` facet alongside the authored/exact facets of its anchor instead of being collapsed to
one representative precision.
`describeStoredAddress(...)` intentionally mirrors the address-kind switch in the kernel source resolver without sharing
its result type: the API layer must preserve visible carriers such as `generated-address` and `template-node-address`,
while `kernel/source-address.ts` collapses those carriers to their nearest authored source for internal source lookup.
Routed app-query defaults and retention choices live in `app-query-policy.ts`: default inquiry profile, source-file
selection, authoring-template opt-in, minimum analysis depth upgrades, materialization-policy overrides, and
`appRetention` disposal decisions are API policy, not transport adapter behavior.
Typed app-query follow-ups live in `app-query-continuations.ts`. That module is the public continuation policy point:
it maps answered query families to compact `targetQuery` shapes plus intent, cost, evidence, epoch dependencies, and blocker
metadata. Keep it catalog-aware and lazy; do not rebuild app facts or adapter-specific ranking there.
Continuation target queries should carry only modifiers the target catalog row can consume. Cursor and source-file loci
are first normalized through the source query's catalog shape so unsupported loci do not leak into follow-ups; detail,
diagnostic projection, and overview/router sample knobs may be inherited only when the target query family can consume
them. The target-shape and public evidence-vocabulary contracts should catch unsupported envelope fields or malformed
continuation evidence.
Continuation cost uses the same query-specific materialization policy as the app-query answer path. For example,
`diagnosticProjection: 'available-products'` removes answer-time TypeChecker projection cost, but it does not pretend an
app-world diagnostic family is project-frame cheap.
Even cheap `next-page` continuations should expose the target query's epoch dependencies, because a cursor over project
or source rows is not stable merely because following it is inexpensive. Keep runtime-session, project-input,
app-world, and source-input dependencies as independent facts: app-world targets depend on both the admitted project
input and the selected app generation, while a cursor, source-file selector, or source-file dependency locus adds the
source-input authority. Do not collapse these into one ranked staleness value.
The app-query catalog also exposes `runtimeBoundary`: `runtime-static`, `project-frame`, `static-evaluation`, or
`app-world`. Keep that boundary honest whenever adding a query kind. It is the public signal that lets MCP/LSP-style
adapters ask cheap static/project/evaluation questions without accidentally paying for full app construction.
`continuationIntents` is a response-envelope filter over those typed rows. It is deliberately not part of app-query or
app-builder query identity, locus, materialization policy, or query-claim invalidation because it does not change the
semantic facts being answered; it only narrows which follow-up moves are returned and inherited by their target query
payloads. Reusable claims retain the unfiltered continuation set; projection happens after the outermost claim read so
one caller's intent cannot poison a later response.
Query cost still belongs to `runtimeBoundary`, `minimumAnalysisDepth`, `materializationPolicy`, `inquiryProfile`,
paging, and query-claim retention. Intent should not become a shadow query policy.

## Shape

`SemanticRuntime` is one resolved source-world snapshot. `createSemanticRuntime(...)` is appropriate for bounded
one-shot and snapshot/AOT work, but its answer receipts are current only relative to that admitted snapshot; they do
not repeatedly rediscover whether the live host now has a different project/source topology. Long-lived IDE, MCP, and
build-daemon consumers must own a `ManagedSemanticWorkspaceSession`. That shared boundary validates source-world
admission at operation ingress and egress, coalesces re-resolution, keeps the warm runtime for an equivalent portable
plan, and atomically replaces the private store/runtime incarnation when the plan changes. Its callback must include
all paging and consumer projection work, and `absorb(...)` must see every semantic answer used by the returned result.
Reconciliation may coalesce or retry before admission, but an admitted callback runs at most once: a stale egress is a
typed operation failure for the protocol/client to reissue, never an implicit replay of consumer mapping or side effects.
Descriptor parity means IDE, MCP, and AOT apply the same semantic rules to the same admitted input snapshot. Independent
MCP disk authority cannot literally share unsaved IDE buffers until a future IDE-session proxy or immutable overlay
handoff supplies that same source snapshot and its revisions.

Use a runtime snapshot to open one project app with `runtime.openApp(...)`. `SemanticApp.ask(...)` accepts a small query
envelope for app facts; direct cursor-locus
convenience methods such as `runtime.templateCompletions(...)`, `runtime.templateCursorInfo(...)`, and
`runtime.templateDiagnostics(...)` live on the runtime facade because they may need to select or reopen an app before
answering.
Default `openApp()` uses `runtime-topology`, the cheapest complete app-world tier. LSP-style template convenience
methods default to `binding-observation` because those answers intentionally need observer/data-flow diagnostics and
weak-member pressure. Generic adapters should read `runtime.appQueryCatalog()` and open the catalog row's
`minimumAnalysisDepth` instead of treating the deepest tier as a default.
An opened `SemanticApp` pins one exact committed app-analysis generation from static evaluation through resources, DI,
templates, observation, state, capability, and router fan-in. Same-runtime replacement or lifetime disposal makes that
app stale; `ask(...)`, profile/cache reads,
and template access fail closed rather than combining current kernel rows with an old object graph. Runtime cache and
cursor-locus admission skip stale apps and rebuild a coherent app epoch on the next request. Template-query objects
also spend that authority on every operation; capturing one before replacement does not preserve access to stale rows.
Generic adapters that only need one answer should prefer `runtime.answerAppQuery(...)` over manual
`openApp(...).ask(...)`. That routed API reads the app-query catalog for default depth, derives an inquiry profile from
the locus when the caller did not supply one, records a runtime-level routed answer claim before returning, and disposes
app epochs for recompute-friendly profiles such as MCP orientation. Disposing the app epoch also retires its reusable
base Program/checker generation. The recompute-friendly default separately clears the process-local TypeScript
dependency SourceFile cache; pass `typeSystemDependencyCacheClearPolicy: 'preserve'` when a session wants to warm the
next Program reconstruction without retaining the complete checker. Long-lived adapters can still force
`appRetention: 'retain-app'` when they intend to reuse the opened app world and checker, or
`appRetention: 'dispose-app'` when a public transport must reclaim even a previously cached compatible app epoch after a
one-off answer.
App-world queries at `detail: 'handles'` automatically retain their owning app generation because those handles are
opaque navigable pointers into that generation. An explicit `appRetention: 'dispose-app'` combination is rejected
instead of returning dead handles. App-world-free handle answers remain independent of app retention.
When a client needs several related app answers, prefer `runtime.answerAppQueries(...)` over issuing several routed
queries from the transport. The batch opens the smallest app-world depth satisfying every child query, compiles the
union of child cursor/file authoring templates by default, records one runtime-level batch claim, and lets each child
answer enter the app-owned query-claim graph with its own materialization policy. That gives MCP/LSP-style orientation
a lazy answer ledger without adding an adapter-local cache or repeatedly opening and disposing the same app epoch.
The batch result keeps app construction profiles and app-owned query-claim profile snapshots opt-in. Low-token MCP/LSP
orientation should leave `includeAppProfile` and `includeAppQueryClaimProfiles` unset, then use
`analysisCacheOverview(...)` for deliberate cache inspection. Profiling scripts should pass those flags when they need
one-off app-open cost after disposal. Batches that include those live profile snapshots bypass retained-answer replay
so the returned profile reflects the current claim graph; ordinary compact batches can still reuse retained values. The
compact profile includes app-level phases, nested
static-evaluation/type-system/resource/template phase summaries, static-evaluation source-host/source-composition
counters, TypeSystem compiler-option shape, Program root/source-file composition, compiler-host cache counters,
aggregate template expression type-cache counters, and opt-in phase memory deltas because those are memory/CPU
attribution facts rather than ordinary app-building guidance.
The batch value owns compact `displayText` too. It lists each child query kind, materialization policy, and child answer
summary, and explicitly reminds callers that profiling fields are opt-in. Public transports should forward that text so
one batch can be both the low-token human orientation and the structured query result.
App-query and app-builder answers may also carry typed `continuations`. A continuation is a followable next move, not a
diagnostic or ranking score: `kind` is the canonical `InquiryContinuationKind` action; app-world targets use
`targetQueryKind` plus a shaped `targetQuery`, while app-builder targets use `targetAppBuilderQueryKind` plus a shaped
`targetAppBuilderQuery`. The applicability metadata declares which next-move intents it serves and what evidence/cost
boundary it crosses. Public target ownership lives in the target query kind and shaped target payload rather than
target-specific continuation kind members.
Pass `continuationIntents` when a caller only wants moves for a
current task such as `diagnose`, `inspect`, or `repair`; leave it unset for the full menu. App-builder continuations are
API-level navigation over the catalog/readiness/detail/source-lowering surfaces; they should not become a recommendation
engine or a replacement for the app-builder ontology.
App-builder detail routes use a selected-detail posture for MCP token economy:
unscoped detail calls return compact base rows, counts, and readiness/state
summaries, while explicit row selectors or family filters activate rich joins by
default. A caller should use catalog/readiness answers to select refs and then
drill into detail; broad detail expansion is still possible, but only through
explicit `include*` flags.
Public answers expose three independent proof axes rather than one overloaded outcome. `result` records whether execution
answered, was unsupported or invalid, or failed; `selection` records exact, absent, ambiguous, rerouted, or
not-applicable locus selection; `coverage` records complete, open, truncated, or not-applicable semantic coverage.
Transport paging is reported only in `page`. Continuation evidence separately declares a source requirement and preserves
per-reference source facts plus independent runtime-session, project-input, app-world, and source-input epoch
dependencies; it does not restate answer coverage or manufacture a confidence score.
When phase-kernel telemetry is enabled, those same phase rows also carry compact kernel deltas and optional product/detail
breakdown rows, so disposed-app answers can explain which template or runtime phase created the answer-local products
that the claim graph later reclaimed.
Static and project-frame app-query answers that do not require app-world construction use a runtime-level
query-claim graph. That keeps small answer reuse behind the same inquiry-profile policy as opened-app answers
without forcing an app epoch into the cache. Routed app-query claims use the same runtime-level graph to retain answer
shape and cost telemetry after `answerAppQuery(...)` has disposed the opened app; the app-owned query graph still owns
nested app-session claims while the app epoch is alive.
Small retained DTO values are bounded twice: profiles choose which materialization policies may retain values, and the
query-claim graph enforces both a per-answer byte limit and a total retained-answer byte budget. When the value budget
is exceeded, claim rows remain available for reuse diagnostics and invalidation, but old public DTO objects are dropped
so a long MCP-style orientation session does not turn the graph into an unbounded answer cache.
Every retained answer value is guarded by an exact executable receipt. Its public `analysisBasis` contains only the
portable semantic-workspace/source-world stamp and value revisions; the process-private lease retains exact input and
semantic-environment reads plus this runtime's answer-lifetime witness. Lease checks never rerun source-world discovery:
that is the managed session's ingress/egress responsibility. Equivalent source-world plans keep the witness, while a
fresh runtime replacement or `clearAnalysisCache()` invalidates old detached capabilities. This distinction lets IDE,
MCP, and AOT compare the same semantic basis without treating store keys, handles, event ordinals, or currentness policy
as portable semantics.
Nested answer materialization uses one optimistic synchronous transaction across runtime and app query-claim graphs.
Fresh child leases are observed into the root builder and may delegate their scan only when that builder exactly subsumes
them; the root receipt validates once before any provisional answer becomes externally committed. Retained reuse first
composes invocation-local planning reads with the historical graph lease. A committed aggregate validates before it may
taint the root; a same-token aggregate is observed before delegation so the current invocation's reads cannot disappear.
The temporary aggregate is released after use and never replaces the historical graph-owned lease.
Project-input, source-world, analysis-receipt, and app-generation validators resample their relevant authority after
fallible/reentrant callbacks. A callback that publishes a relevant input event or revokes a combined generation cannot
return a receipt or cache generation that was current only at the start of validation.
Transport page policy is not semantic query identity, but it is retained-answer response-policy identity. A bounded
caller and an unbounded caller may share semantic materialization while never replaying each other's clamped DTO.
App-world-free app-query answers stay at the runtime boundary. `SourceFiles` can answer from the booted project frame,
and `UnresolvedModules` can answer from read-only Aurelia
static evaluation without emitting kernel records or opening an app epoch. `answerAppQuery(...)` and
all-app-world-free `answerAppQueries(...)` batches therefore avoid TypeSystem construction, template compilation, and
app-epoch disposal. When every child query is runtime-static, or every child refuses during selector preflight, the batch
stays workspace-level too: it does not select a project, and the batch result has `projectKey: null` and
`analysisDepth: null`. Project-frame and static-evaluation
batches still select the owning project because their answers depend on admitted source files or static project
evaluation. All app-world-free batch results mark `appWorldOpened: false` and carry no `appProfile`; that absence is
intentional, not missing telemetry. When a routed app-world-free request includes telemetry options, the answer envelope
may carry an `appWorldFreeProfile` with static-evaluation phase, source-host, and source-composition counters; that is
answer-boundary telemetry, not an opened app profile. Each child row in an app-world-free batch still enters the runtime
query-claim graph as a nested child claim, so row-level reuse and source/project invalidation remain graph-owned without
manufacturing an opened app just to get child claim storage.
One-off routed app disposal is part of the answer boundary, not an afterthought outside the graph. The runtime-level
claim records both the kernel products/details/hot details materialized for the answer and the app/query-claim records
reclaimed after the answer is shaped, so cache overview can show "spent during answer" separately from "retained after
answer." Disposal summaries include handle-character mass, so a one-off answer can show that readable handle strings
were reclaimed even when V8 keeps heap capacity after GC.
If a routed answer is served from a retained small answer value, the same answer-boundary disposal hook still runs.
That keeps explicit `appRetention: 'dispose-app'` meaningful even when the public answer itself no longer needs to
reopen the app world.
Routed calls and batches can also pass `typeSystemDependencyCacheClearPolicy` when the profile default is not the right
CPU/memory trade-off. The default policy is inquiry-shaped: recompute-friendly routed calls that dispose the app epoch
clear all process-local TypeScript dependency SourceFiles, bounded diagnostic calls clear default libraries while
keeping external declarations warm, and warm local sessions preserve them. Any clear runs in the same answer-boundary
hook as app-epoch disposal and is counted on the runtime query claim, so MCP-style calls can explain both
kernel/app-world retention and dependency-cache retention without adding an adapter-local `finally` cleanup.
Conversely, `appRetention: 'retain-app'` disables retained-answer reuse when no compatible app epoch is already cached,
because the caller is asking to warm the app world for follow-up tools, not merely to receive the same DTO again.
Direct static facade answers such as `runtime.appQueryCatalog(...)` are also claim-backed. Public adapters should use
runtime facade methods rather than raw catalog readers when the answer crosses a transport boundary, so retention,
reuse, and cache overview all observe the same query-answer layer. Inside an already-entered claim boundary, use the
focused raw answer builder instead of calling another public facade method; otherwise an implementation detail can
create an unrelated default-profile claim even though only one public answer crossed the API boundary.
The retired legacy recipe-authoring catalog, guidance, and recipe-plan answers have been removed. Public app generation
should return through app-builder once that algebra has a stable API instead of preserving recipe-shaped compatibility
surfaces here.
For component handoff, keep the declared type and the effective TypeChecker shape separate. A nullable object bindable
such as `Product | null` should still surface as an object-shaped input for orientation while preserving the nullable
declared type for assignability, diagnostics, and code actions.
Opened-app convenience answers such as `app.summary()`, `app.openSeams()`, and `app.bindingDataFlows(...)` are
claim-backed too. They re-enter `SemanticApp.ask(...)` when called outside an active answer materialization, so direct
library use and routed transport use share the same answer-boundary claim graph instead of creating a second untracked
projection path.
One runtime instance memoizes opened app-worlds by project-input revision and semantic request shape. Existing admitted
source/config edits should advance the shared `SemanticRuntimeProjectInputAuthority`; the next request captures one
immutable host generation, rejects stale retained facades, and replaces only that project's app generation. Rebuild the
runtime only when project discovery or source-admission membership changes.
Long-lived adapters may attach a `SemanticRuntimeProjectInputCurrentnessPolicy` to that authority. The policy receives
one frozen exact-read descriptor at a time. It may return `PushObserved` only for a request whose every mutation calls
`advance()`, or `SessionSnapshot` with a non-empty immutable snapshot identity. Every unclassified read remains
`PullValidated`, so editor-owned text can avoid same-generation polling without granting that trust to imported
dependencies, directory membership, package data, or MCP filesystem input. Exact values still decide carry across
event generations. Classifier and snapshot-identity transitions must be synchronized with an event advance so no proof
can enter before revocation. Snapshot identity must name immutable input output, not merely a mutable session UUID.
`runtime.summary()` is the cheap project-selection answer: it returns project shape/analysis rollups, the default app
candidate key, app candidates with root directories, and opt-in paged project rows. It defaults to no project rows so
large monorepos stay summary-first. Use it before `openApp(...)` in monorepos so callers can open a specific app project
instead of paying broad app-world construction by accident. It is also claim-backed now, because project-selection
answers are public query outcomes; cache inspection and disposal APIs remain direct control-plane calls so they do not
distort the query graph they are inspecting or pruning. Pass `inquiryProfile` when a long-lived adapter wants that
first project-selection answer counted with the same consumer lane as later routed app answers. Scripts or adapters that
need to iterate project rows must request `projectPage.size`; otherwise they should rely on the rollups and
`appCandidates` only.
Each project row also exposes the boot-owned `admissionOrigins` that explain why that exact frame exists. Marker origins
name their exact source file and, when relevant, the host hint that reopened discovery below a prune/depth boundary.
Consumers should keep this project-topology provenance separate from `shapeKind`, `analysisKind`, and native
configuration diagnostics: admission cause is not evidence that a project is an Aurelia app or that its configuration
is valid.
`runtime.analysisCacheOverview(...)` is the session-retention x-ray for long-lived adapters such as MCP. It reports
runtime-level static and routed-app query claims, cached app epochs, their construction inquiry profile/top phases,
per-consumer query-claim graph telemetry, current process memory, and
optional kernel-density breakdowns. App-world cache identity is semantic shape
(project, project-input revision, depth, and authoring-template scope), not query-retention profile: the same app epoch can answer MCP, LSP,
fixture, AOT, and exploration queries while `SemanticApp.ask(...)` records those answers in separate profile-shaped
query-claim graphs.
Project compiler options are rebuilt once for each captured project-input generation and shared by static evaluation
and TypeSystem construction through the `ProjectBootFrame`. TypeScript dependency `SourceFile` caching remains the
separate process-local CPU/memory trade-off reported by cache telemetry.
Ordinary TypeScript diagnostics exposed through `TypeScriptDiagnostics`, `TypeScriptDiagnosticSummary`, and unified app
diagnostics are Program/tsconfig correctness rows. They intentionally do not include LanguageService suggestion
diagnostics, quick fixes, organize-import actions, or refactor edits; those are a future LSP/code-action surface that
should reuse the same project epoch without changing the meaning of the repair-oriented diagnostic overview.
Query-claim records distinguish the exact answer locus from invalidation epoch keys. For example, a cursor query uses a
cursor-shaped locus for reuse/history but also depends on its source-file epoch; adapters that keep a runtime session
open across edits should call `runtime.disposeQueryClaims({ sourceFilePath })` after a source change when they only need
to clear retained answer storage, or `runtime.clearAnalysisCache()` when the edit makes retained app-world products
stale. The runtime canonicalizes source-file loci to project-relative paths before assigning query keys and epoch keys,
so absolute host paths and project-relative paths converge on the same source-epoch claim. App-local
`disposeQueryClaimsForSourceEpoch(...)` remains available for callers that already own a `SemanticApp`, but transport
adapters should prefer the runtime method so runtime-level routed claims and app-owned claims are invalidated together.
The disposal answer includes per-profile `profileDisposals` rows. Use those rows to confirm whether a source edit or
manual cleanup hit runtime-level routed claims, cached-app claims, or both; the flat disposed counts are only the rollup.
It also echoes the selected `invalidationKind` and `epochKeys`. Treat those as the public trace of the disposal
strategy: `manual` has no epoch filter, `project-epoch` prunes project-scoped outcomes, and `source-epoch` prunes both
the canonical project-relative source epoch and the containing project epoch because project-wide answers can depend on
one changed source. New adapters should extend that strategy layer rather than constructing graph disposal policies
locally.
Use `includeQueryClaimRows` with a small `rowLimit` when aggregate query-claim counters are not enough and a caller
needs the recent retained answer outcomes. Use `includeDetailDensity` with `includeKernelBreakdowns` only for memory
diagnosis; it scans product-detail and hot-detail sidecars to report shallow direct field density instead of guessing
which rich details are retaining mass.
Use `includeTypeSystemDependencyEntries` with a small `rowLimit` when dependency SourceFile cache density says a bucket
is hot but the next decision needs the largest retained TypeScript dependency entries. Keep it off for ordinary adapter
status reads because bucket counts and source-text totals are usually enough.
Treat the workspace `KernelStore` as session-lifetime for boot/source records and workspace support. Reusable base
Program/checker generations are project-locus computations: compatible app replacements may share one, while explicit
app disposal and `runtime.clearAnalysisCache()` retire them. The TypeSystemProject compiler-host dependency `SourceFile`
cache is a separate process-local structure because it trades memory for much cheaper repeated Program construction
over dependency and library declaration files; pass
`typeSystemDependencyCacheClearPolicy: 'all'` to `clearAnalysisCache(...)` when reclaiming that memory is more
important than keeping the next app open warm. For one-off routed public calls, pass the same policy to
`answerAppQuery(...)` or `answerAppQueries(...)` so the clear is part of the answer claim rather than a separate
control-plane cleanup. Use narrower policies such as `default-libraries`, `node-modules`, or
`external-declarations` when cache overview shows one bucket dominating and the next app open can keep other dependency
classes warm. The overview also reports cached source-text character count plus node_modules,
declaration, default-library, external-declaration, canonical-path, and duplicate parse-option entry counts so
long-lived adapters can distinguish warm TypeScript dependency/library retention from app-world kernel or query-claim
retention. It also reports the dominant retained source-text bucket and a suggested dependency-cache clear policy, plus
process-lifetime clear operations, source-text characters reclaimed by cache policy, and the cleared default-library /
external-declaration bucket split. The
host-cache counters split cacheable node_modules/external-declaration reads from fresh-source, project-source, and
external-source bypasses, and include hit/write source-text traffic so warm-session CPU savings can be compared with
newly admitted dependency/library text. Cacheability remains a named policy rather than an accidental filesystem side
effect.
Analysis-cache overview and clear answers own compact `displayText` for public shells: overview text reports retained
app epochs, workspace kernel mass, process memory, TypeScript dependency-cache policy, query-claim retention, and
whether high-cardinality breakdowns were omitted; clear text reports reclaimed app epochs,
query claims, kernel records/details/handles, and dependency-cache buckets. Public adapters may add their own
server-session wrapper text, but they should not reinterpret semantic-runtime cache telemetry locally.
Advance the project-input authority for content/config changes inside the admitted project topology. Restart the runtime
when project discovery or source-admission membership must be rebuilt. Opening a non-compatible analysis-depth or
authoring-template shape atomically replaces the prior generation at that project locus without disturbing other
project generations in the workspace store.

Authoring/LSP callers can opt into standalone resource-library templates without changing the default app topology:

```ts
const app = await runtime.openApp({
  sourceFilePath: 'packages/my-package/src/my-element.html',
  includeAuthoringTemplates: true,
});
```

When `projectKey` is omitted, `sourceFilePath` selects the admitted project that owns the file. If
`authoringTemplateSourceFiles` is omitted, the same source file becomes the authoring template selection. Callers that
already know the project can still pass `projectKey` and `authoringTemplateSourceFiles` explicitly.
Retained-app reuse preserves the `includeAuthoringTemplates` admission bit separately from an empty/unbounded source
selection. A project-only app therefore cannot satisfy a later source-locus authoring request merely because both
requests normalize to an empty source-file list and no limit.
`TemplateCompilations` returns a `compilationLane` of `app-runtime` or `authoring` so callers can distinguish hydrated
app templates from source-file-selected authoring templates. Use `authoringTemplateLimit` only as an explicit pressure
budget or fallback when no source file is known.

Cursor-locus callers can skip that manual open step by asking the runtime facade directly:

```ts
const cursorInfo = await runtime.templateCursorInfo({
  cursor: { filePath: 'packages/my-package/src/my-element.html', line: 12, character: 18 },
});
```

Public cursor queries accept line/character as the complete locus contract. An explicit offset is an optimization for
editor clients; completions, cursor info, references, rename, and code actions normalize a missing offset through the
same authored-source resolver before performing containment checks.

`templateCursorInfo(...)` and `templateCompletions(...)` first reuse any already opened app-world whose compiled
template owns the cursor source and whose pinned template generation is still current. That preserves app context for
templates that entered the compiler world through an app dependency or plugin package. If no opened app contains the
cursor source, the facade selects the owning project,
enables authoring-template compilation by default, and opens an authoring world whose default source selection is the
cursor file. App callers can still pass `projectKey`, `includeAuthoringTemplates: false`, explicit authoring source
options, or `authoringTemplateLimit` when they need different scope or budget behavior.

Rows default to compact source labels and counts. Opaque kernel handles are intentionally opt-in through
`SemanticRuntimeDetail.Handles`; they are useful for exact in-process follow-up navigation but too noisy for initial
answers. Paged app rows use opaque cursors bound to normalized query identity, project/app generation, and ordering
version. Cross-query, stale-generation, malformed, and out-of-range cursors return `invalid` answers instead of being
interpreted as raw offsets. Exact follow-up navigation should use answer-local row/owner/cluster keys or handle
projection rather than cursor text. Paging never changes answer coverage: a bounded page can remain
`answered/not-applicable/complete` when the query enumerated its declared semantic basis. `page.nextCursor` alone says
that more transport rows remain. A size-zero page returns rollup/total state without rows and can still provide a
followable continuation.
Paged row tables are bounded by row count and by estimated UTF-8 JSON size for the returned row array. Dense families
such as binding observed-dependency rows can hit the payload budget before they hit the row-count clamp; in that case
the page returns fewer rows, sets `byteClamped: true`, reports `estimatedRowsJsonBytes` and `maxRowsJsonBytes`, and
still provides `nextCursor` when more rows are available. Public adapters should treat this as pagination, not lossy
truncation. Callers that need complete row families should drain `nextCursor`; semantic `coverage` remains independent
from row-count and byte clamping.
`OpenSeamSites` reads the same unpaged seam fact set as `OpenSeams`, then groups repeated derivations by exact authored
root source. One site may therefore retain multiple seam kinds, reason kinds, boundary kinds, and pressure kinds. Use it
before raw seams or kind summaries when a large app reports hundreds of seams: one
authored expression can produce many raw evaluator rows after callback/intrinsic expansion, and the public first read
should say "two authored sites covering six raw rows" rather than making derivation count look like problem count.
`OpenSeamSummary` remains the typed seam-kind/reason-signature cluster view for understanding dominant seam families after the site-level
problem count is clear. Raw seam, site, and summary answers all own compact `displayText`: raw rows report seam-kind
and reason-kind rollups plus a few source-backed samples, site rows report unique authored locations with raw-row and
variant counts, while summary rows report dominant clusters, source-file coverage, and sample locations. `OpenSeams`,
`OpenSeamSites`, and `OpenSeamSummary` accept source, kind, reason, answer-local cluster, and answer-local site selectors
so a large cluster count always has a direct drill-down path. Summary/site queries do not support handle detail and
refuse that selector rather than silently dropping it; raw `OpenSeams` owns handle projection.
`AppOverview` is the compact app-opening answer for MCP and other AI callers. It composes summary, topology counts,
diagnostic clusters, and open-seam clusters without making adapters reconstruct that answer locally. The topology child read uses a compact summary projection instead of
asking the full `AppTopology` row DTO and summarizing afterward. Call `AppTopology` directly when row families or
bindable value type surfaces are needed; those surfaces remain opt-in through `includeTypeSurfaces`, keeping overview
answers from spending answer-local TypeChecker member projections or retaining broad topology DTOs.
The overview result owns a short `displayText` that names app shape, route counts, depth-aware binding projection
availability, pressure status, and the next low-token query family. Public adapters should forward that text instead of
rewriting app-orientation guidance locally. At `runtime-topology` depth, binding text should report runtime binding
presence without presenting zero value-channel/data-flow rows as absence; callers that need those facts should reopen at
`binding-observation`.
`RouterOverview` does the same for route/viewport-oriented hand-tests: it groups route config, route context,
viewport/agent, typed navigation, route tree, recognized route, and router issue rows behind one semantic-runtime
answer while preserving the individual child-query summaries. Because it can sample several independent row families,
`SemanticApp.routerOverview(...)` defaults to `rowPageSize: 0` for summary-first answers and takes `rowPageSize`
instead of a cursor-bearing page when samples are needed. Use the specific route query kinds, such as `Routes` or
`ViewportAgents`, when a caller needs cursor paging for one family. Router overview also owns `displayText` so public
clients can see the route/runtime-tree counts, issue state, and row-sampling policy before opening raw router rows.
`readSemanticAppQueryCatalog()` and `runtime.appQueryCatalog()` expose the supported app query vocabulary with group,
result-role, paging/detail, source-file, cursor, type-surface capability, materialization policy, router-product, and
minimum analysis-depth metadata. `pagingKind`
distinguishes ordinary offset row cursors from router row-sample sizing and cursor-locus
continuations. Public adapters such as MCP should use `minimumAnalysisDepth` for default generic-query opening so first reads can stay at
`runtime-topology` while binding-owned rows still request their required substrate. The catalog accepts `group` and
`queryKind` filters for compact adapter answers. Public adapters should use that catalog for generic query tooling
instead of maintaining their own query-kind list. The catalog result also owns compact `displayText` so public clients
can see query kinds, result roles, depth/boundary costs, and batch/summary-first hints without interpreting rows in the
adapter.
Binding summary answers also own compact `displayText`. `BindingValueChannelSummary`, `BindingDataFlowSummary`, and
`BindingObservedDependencySummary` keep their first text line self-contained with observer-coupling, issue-kind, or
member-source-state rollups so `answerAppQueries(...)` can make `page.size=0` binding-triad batches useful without
opening raw binding rows.

```ts
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
} from '@aurelia-ls/semantic-runtime';

const runtime = await createSemanticRuntime({ workspaceRoot: 'path/to/app' });
const routedOverview = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.AppOverview,
});
const app = await runtime.openApp();

const overview = app.ask({ kind: SemanticAppQueryKind.Summary });
const appOverview = app.ask({ kind: SemanticAppQueryKind.AppOverview });
const unresolvedModules = app.ask({ kind: SemanticAppQueryKind.UnresolvedModules });
const topology = app.ask({ kind: SemanticAppQueryKind.AppTopology });
const openSeamSummary = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSummary,
  page: { size: 20 },
});
const openSeamSites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  page: { size: 20 },
});
const stateStores = app.ask({ kind: SemanticAppQueryKind.StateStores });
const stateIssues = app.ask({ kind: SemanticAppQueryKind.StateIssues });
const validationIssues = app.ask({ kind: SemanticAppQueryKind.ValidationIssues });
const fetchClientIssues = app.ask({ kind: SemanticAppQueryKind.FetchClientIssues });
const dialogIssues = app.ask({ kind: SemanticAppQueryKind.DialogIssues });
const configurationIssues = app.ask({ kind: SemanticAppQueryKind.ConfigurationIssues });
const evaluationIssues = app.ask({ kind: SemanticAppQueryKind.EvaluationIssues });
const observationIssues = app.ask({ kind: SemanticAppQueryKind.ObservationIssues });
const resourceInventory = app.ask({
  kind: SemanticAppQueryKind.ResourceInventory,
  page: { size: 200 },
});
const definitions = app.ask({ kind: SemanticAppQueryKind.ResourceDefinitions });
const resourceIssues = app.ask({ kind: SemanticAppQueryKind.ResourceIssues });
const routerOptions = app.ask({ kind: SemanticAppQueryKind.RouterOptions });
const routerOverview = app.ask({ kind: SemanticAppQueryKind.RouterOverview });
const routes = app.ask({ kind: SemanticAppQueryKind.Routes });
const routeContexts = app.ask({ kind: SemanticAppQueryKind.RouteContexts });
const routePatterns = app.ask({ kind: SemanticAppQueryKind.RoutePatterns });
const routeEndpoints = app.ask({ kind: SemanticAppQueryKind.RouteEndpoints });
const routeRecognizerStates = app.ask({ kind: SemanticAppQueryKind.RouteRecognizerStates });
const routeRecognizerIssues = app.ask({ kind: SemanticAppQueryKind.RouteRecognizerIssues });
const routerIssues = app.ask({ kind: SemanticAppQueryKind.RouterIssues });
const recognizedRoutes = app.ask({ kind: SemanticAppQueryKind.RecognizedRoutes });
const typedNavigationInstructions = app.ask({ kind: SemanticAppQueryKind.TypedNavigationInstructions });
const viewportInstructions = app.ask({ kind: SemanticAppQueryKind.ViewportInstructions });
const viewportInstructionTrees = app.ask({ kind: SemanticAppQueryKind.ViewportInstructionTrees });
const routeTrees = app.ask({ kind: SemanticAppQueryKind.RouteTrees });
const routeNodes = app.ask({ kind: SemanticAppQueryKind.RouteNodes });
const routerViewports = app.ask({ kind: SemanticAppQueryKind.RouterViewports });
const viewportAgents = app.ask({ kind: SemanticAppQueryKind.ViewportAgents });
const componentAgents = app.ask({ kind: SemanticAppQueryKind.ComponentAgents });
const templates = app.ask({
  kind: SemanticAppQueryKind.TemplateCompilations,
  page: { size: 20 },
});
const availableResources = app.ask({
  kind: SemanticAppQueryKind.TemplateResourceAvailability,
  cursor: {
    filePath: 'src/my-element.html',
    line: 12,
    character: 18,
    offset: 340,
  },
});
const exactTemplateRows = app.ask({
  kind: SemanticAppQueryKind.TemplateCompilations,
  page: { size: 5 },
  detail: SemanticRuntimeDetail.Handles,
});
const completions = app.ask({
  kind: SemanticAppQueryKind.TemplateCompletions,
  cursor: {
    filePath: 'src/my-element.html',
    line: 12,
    character: 18,
    offset: 340,
  },
  page: { size: 20 },
});
const cursorInfo = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  cursor: {
    filePath: 'src/my-element.html',
    line: 12,
    character: 18,
    offset: 340,
  },
});
const templateReferences = app.ask({
  kind: SemanticAppQueryKind.TemplateReferences,
  cursor: {
    filePath: 'src/my-element.html',
    line: 12,
    character: 18,
    offset: 340,
  },
  includeDeclaration: true,
  page: { size: 50 },
});
const templateCodeActions = app.ask({
  kind: SemanticAppQueryKind.TemplateCodeActions,
  cursor: {
    filePath: 'src/my-element.html',
    line: 12,
    character: 18,
    offset: 340,
  },
  diagnosticProjection: 'type-projection',
});
const templateInlayHints = app.ask({
  kind: SemanticAppQueryKind.TemplateInlayHints,
  sourceFile: { filePath: 'src/my-element.html' },
  page: { size: 50 },
});
const templateSemanticTokens = app.ask({
  kind: SemanticAppQueryKind.TemplateSemanticTokens,
  sourceFile: { filePath: 'src/my-element.html' },
  page: { size: 200 },
});
const templateDiagnostics = app.ask({
  kind: SemanticAppQueryKind.TemplateDiagnostics,
  sourceFile: { filePath: 'src/my-element.html' },
  page: { size: 50 },
});
const appDiagnostics = app.ask({
  kind: SemanticAppQueryKind.AppDiagnostics,
  sourceFile: { filePath: 'src/my-element.html' },
  page: { size: 50 },
});
const appDiagnosticSummary = app.ask({
  kind: SemanticAppQueryKind.AppDiagnosticSummary,
  page: { size: 20 },
});
const controllerRows = app.ask({
  kind: SemanticAppQueryKind.RuntimeControllers,
  detail: SemanticRuntimeDetail.Handles,
});
const targetAccessRows = app.ask({
  kind: SemanticAppQueryKind.BindingTargetAccesses,
});
const targetOperationRows = app.ask({
  kind: SemanticAppQueryKind.TargetOperations,
});
const sourceOperationRows = app.ask({
  kind: SemanticAppQueryKind.BindingSourceOperations,
});
const bindingBehaviorApplications = app.ask({
  kind: SemanticAppQueryKind.BindingBehaviorApplications,
});
const valueChannelRows = app.ask({
  kind: SemanticAppQueryKind.BindingValueChannels,
});
const valueChannelSummary = app.ask({
  kind: SemanticAppQueryKind.BindingValueChannelSummary,
});
const dataFlowRows = app.ask({
  kind: SemanticAppQueryKind.BindingDataFlows,
});
const dataFlowSummary = app.ask({
  kind: SemanticAppQueryKind.BindingDataFlowSummary,
});
```

Template diagnostics include framework-code rows from product-owned issue lanes. Runtime controller issues cover
renderer/controller-owned template failures such as missing resources, AuCompose static inputs, switch/case link hooks,
and portal static activation errors. Portal diagnostics come from the template-controller attribute's inline
multi-binding props, matching Aurelia's custom-attribute grammar; sibling HTML attributes such as `position="..."` are
not treated as portal bindables. Runtime binding diagnostics also include i18n `TranslationBinding` lifecycle products:
missing `t`/`t.bind` keys (`AUR4000`), duplicate `t-params.bind` on the same translated element (`AUR4001`), and
dynamic key expressions whose checker type is definitely not string-compatible (`AUR4002`).
Unmet framework capability demands surface as `framework-capability-not-registered` rows rather than generic
`template-compiler-error` rows. A separately closed `framework-capability-configured-out` row means that the owning
plugin/configuration is admitted but an exact option value excludes the requested alias, resource, or syntax surface.
The producer covers runtime-html shorthand syntax, i18n/state plugin syntax, router/validation-html/ui-virtualization
built-in resources, and expression-owned value-converter/binding-behavior resources. Authored sites remain inert or
unresolved when their capability is unavailable; diagnostics retain exact registration-admission sources,
configured-out option sources, and manifest/import availability evidence as three distinct planes.
When no local manifest/import evidence exists, registration guidance says so instead of implying the package is already
available. Diagnostic-action classification treats missing registration as app-source capability-registration pressure.
`TemplateCodeActions` can promote supported rows to exact source operations when local package/import evidence exists and
the owning template world can be routed back to an app-root `.app(...)` chain. Configured-out rows remain guidance unless
a source planner can prove the intended configuration replacement; the current implementation deliberately invents no
such edit.
`FrameworkCapabilityDemands` exposes the underlying authored demand rows directly, including admission state,
registration-admission sources, configured-out option sources, package/import availability evidence, source-file
scoping, related issue lanes, and compact actionability posture. Use it to inspect admitted, configured-out, missing,
unknown, and chain-unproven capability demand facts without changing which rows become diagnostics.
Each template demand also exposes its compiler analysis-context handle. The same component definition can be compiled
under more than one app-root world, so consumers must join by definition plus analysis context rather than collapsing
rows by source or resource spelling. Built-in ownership follows the resolver-selected resource catalog member; a known
plugin spelling is consulted only when no resource resolved.
Host-dependent plugin options are projected as unknown demands with blocking open-seam handles even when compilation
uses a conservative default-shaped catalog for recovery. Template diagnostics intentionally emit only for
`not-admitted` and `configured-out`; an open option is inspection pressure, not evidence for either accusation.
Weak-member template diagnostics reuse the cursor-info member-owner path and therefore must use each resource's
runtime-analysis expression world. This keeps diagnostic rows aligned with completion/cursor answers for binding
behavior lifecycle cases such as i18n `t.bind` evaluate-only keys versus `t-params.bind` source-scope projection.
App diagnostics also include source-backed fetch-client configuration products. The `FetchClientIssues` query owns
static `HttpClient.configure(...)` and `RetryInterceptor` rows for `AUR5001`, `AUR5002`, `AUR5003`, `AUR5004`,
`AUR5005`, `AUR5007`, and `AUR5008`; host/global fetch availability (`AUR5000`) and live interceptor-chain return
validation (`AUR5006`) stay outside this lane until semantic-runtime admits those runtime products.
`DialogIssues` owns source-backed dialog rows for bare `DialogConfiguration` registration (`AUR0904`), static
`DialogService.open(...)` settings with neither `component` nor `template` (`AUR0903`), and static child resolver keys
with no visible `withChild(...)` registration (`AUR0910`). Dialog lifecycle and renderer failures remain outside the
lane until semantic-runtime admits those runtime products.

`TemplateCompletions` reselects the owning compiled template from the supplied source cursor before delegating to the
inquiry answer. Do not assume the template-source carrier is always the cursor-owning span: external template files,
inline template references, generated template addresses, and HTML node/value products can put exact cursor ownership on
different authored spans. The API selection path therefore matches the source file and offset against the resource's
authored HTML span set and prefers the narrowest matching span. The pressure script compares this public API answer with
the lower-level inquiry answer so wrapper/source-selection drift is visible without printing app source details.
Cursor dispatch can also select a narrower evaluator-derived lexical scope than the durable parent binding-scope handle,
for example inside arrow callbacks. Completion answering must spend that selected scope directly; re-reading only the
parent product loses callback locals and shadowing identity. The public page cursor is transport state. Adapters that need
a complete candidate family drain it without changing semantic coverage, while LSP `isIncomplete` remains reserved for a
client requery against a list that is intentionally narrowed as typing changes.
The API also threads the app emission's modeled `RouteConfig` product handles and router-instruction parameter endpoint
plans into the completion inquiry. This lets `load="|"` answer from router facts as `router-route` candidates and lets
`params.bind="{ | }"` answer from selected endpoints as `router-route-parameter` candidates without re-scanning source
or re-evaluating the route expression.
The cursor adapter likewise preserves narrower authoring domains that broad HTML site kinds cannot express by
themselves. Ref-target candidates are host-sensitive and come from the same-node hydration products used by runtime ref
validation; listener events come from the active TypeScript DOM event-map projections; listener modifiers come from
the framework-default modifier model; and local-template bindable modes come from the exact declaration product and
mode source address. The candidate kind records that semantic role while `siteKind` remains the compatible broad
attribute-name or attribute-value surface expected by IDE clients. Once selected, an exact authoring domain owns the
candidate list; generic attribute or value collectors do not add unrelated candidates to that syntax position.
The public result preserves this narrower `domainKind`. Framework-default modifier candidates carry open answer coverage
until the app-effective `IKeyMapping` and `IModifiedEventHandlerCreator` registrations can be projected; custom handler
implementations do not expose an enumerable modifier vocabulary and must never be presented as a closed list.
Completion answers own compact `displayText` with site kind, candidate count, template lane/path, frontier/missing-input
state, and a small candidate preview. Public clients should forward that instead of turning candidate rows into prose in
the adapter.
Cursor-derived and inquiry-derived missing inputs share one honesty boundary: if either remains, a completion is
`answered/exact/open`. Do not merge missing inputs into the value after computing complete coverage; that produces a
self-contradictory public answer.
`TemplateCursorInfo` uses the same cursor-to-template selection and value-site classification path, but returns the
semantic site under the cursor rather than completion candidates: site kind, HTML node/attribute, active value site,
selected definition, selected bindable, selected expression member, member-owner type, parser frontier, and template
lane. It is the shared footing for hover, definition, diagnostics, and explanation APIs. Bindable selection exposes its
metadata source fields separately from `propertySource` and `callbackTargetSource`; definition can therefore target the
implementation while references and rename retain all authored metadata declarations. Expression-member selection
keeps the owner type available for completion and diagnostics, and distinguishes the source that introduced a scope slot
from the TypeScript `declarationSource` reached by its identity. The owner type row likewise exposes both the template/expression projection source and the TypeScript
declaration source. Hover/explanation can point at the projection source when answering "why this type here?", while
definition and owner-type repair planning should prefer the declaration source when the checker can name one.
A cursor on router navigation syntax can additionally expose one `selectedRouteTarget`. Plain `load`/`href` route
expressions resolve through the recognized route to an exact authored RouteConfig path, while eager `route:` forms
resolve through their endpoint plan to the exact authored RouteConfig id. Query and fragment text, open navigation
values, and multiple distinct endpoint targets do not produce a selected target. Definition adapters must spend this
cursor-owned fact instead of scanning RouteNodes or matching broad instruction spans.
A resolved scope slot proves a root symbol independently; member-owner projection is optional enrichment in that case,
so an unavailable owner context must not turn otherwise complete scope completions into an open answer.
Cursor answers also expose `activeSource` as the narrowest authored token locus proven by the owning parser or
materialized HTML product. HTML elements preserve separate opening- and closing-tag name addresses, while attributes
preserve name and value addresses; those durable lexical fields carry source-observation evidence and field provenance
in addition to their broader node/attribute carrier. Expression tokens remain parser-owned spans projected directly to
`SemanticSourceReference`: allocating one hot kernel address per expression token would reverse the kernel-compression
boundary without adding a more durable product fact. IDE adapters should consume these loci and refuse invalid offsets,
not rescan document text or clamp stale spans into apparently valid ranges.
File diagnostics use the parser's canonical scope-access inventory for missing roots and unsupported host globals;
they do not infer roots from observed-dependency rows. Listener and dispatch sources are intentionally untracked, but
their names still require diagnostics, navigation, and repair. Scope slots and checker-projected members decide whether
one of those structural roots is proven. Parser frontier subtrees remain available for completion and recovery, while
root-absence diagnostics wait for a canonical AST so one syntax error does not cascade into false missing-member rows.
When a parser token narrows a broader expression carrier, source projection retains that carrier's workspace, file-role,
and authored anchor metadata instead of trading provenance for token precision.
Those member declarations may come from app source, source-shipped packages, or Program-only declaration files. The API
should surface the source reference when the TypeChecker can name the declaration. If the cursor is on a member of an
index-signature-only owner, cursor-info may report that selected member as an index-signature access with the indexed
value type and no source reference; completions should still treat that owner as non-enumerable weak-type pressure rather
than inventing candidate names.
Index-signature selected members are only synthesized for string-capable indexed access. Number-only indexed access,
such as primitive or array-like keyed reads, must not make arbitrary dot members look real. When a member token is
authored on a known owner type but the owner does not project that member, cursor-info reports
`missing-expression-member` with an inspect or declare-member action target instead of hiding the mismatch behind a
successful completion list.
Cursor-info answers also own `displayText` for MCP/LSP-style hover or explanation surfaces: selected HTML/value site,
resource/bindable/member/owner facts, cursor diagnostics, missing inputs, and the next focused tool family.
`TemplateReferences` and `TemplateRename` share one canonical binding-resolution target and authored-occurrence closure.
The parse owns exact tokens, the rendered binding owns target interpretation, and a runtime access use is attached only
when Aurelia actually has an operation that spends that resolution. This keeps a `fromView`-only attribute source
navigable and renameable without falsely reporting a source read or data-flow edge. Returned
`template-usage` rows use the exact authored member token as their primary `source`; declaration rows can include both
the TypeScript property and distinct bindable metadata names, with `bindableDeclarationKind` preserving the authored
form. Default-derived attribute spellings join through the bindable's property target, explicit aliases remain a
separate public-name surface, and conventional `${name}Changed` propagation spends the converged callback target rather
than reconstructing a class AST locally. TypeScript member closure is projected from the Program-owned related-symbol
adapter, so interfaces and implementations, base members and overrides, accessor pairs, overload declarations,
contextual object properties, and destructuring sites remain one family without an API-local symbol scan. Related
declarations are all retained when `includeDeclaration` is true. References may include external or standard-library
declarations; rename first asks TypeScript for eligibility and then requires every related source to be editable.
TypeScript denial or one non-editable source refuses both prepare and execution, including conventional bindable
callback propagation, rather than returning a partial `WorkspaceEdit`.
Lexical and member references join parse-owned occurrences through the binding-context resolution and materialized
`BindingScope`; they do not require a runtime use or observed-dependency row. That distinction keeps listener, dispatch,
one-time, non-evaluated, blocked, and other intentionally untracked syntax navigable. When runtime uses and observed
dependencies exist for a resolution, the same reference row carries every richer lineage handle; it neither chooses a
representative operation nor emits a second occurrence. An occurrence equal to its slot's authored declaration locus is
not emitted again as a usage.
Resource reference contexts do not require a mappable authored declaration in order to return authored usages.
Framework/catalog resources anchor the query at the active usage and omit the nonexistent declaration row; their
definition product remains the matching authority. Rename stays unavailable with
`resource-name-has-no-authored-source`, which distinguishes a real selected resource with no workspace-owned name token
from a cursor that selected no source-backed semantic surface at all.
Named `PART.ref` targets join that same resource closure through the controller already resolved during controller bind.
Their usage/edit kind is `ref-target`; language targets such as `element`, `controller`, `component`, and `view` are
excluded. Semantic tokens spend the same relation and exact pattern-part loci: resolved custom elements, custom
attributes, and template controllers use their Aurelia resource token roles, listener event names use `aureliaEvent`,
and listener modifiers use `aureliaModifier`. Deprecated authored `view-model.ref` remains visible as a deprecated
keyword even though lowering executes `component.ref` semantics.
`TemplateCodeActions` is the conservative edit-planning projection for runtime-owned template diagnostics at a cursor.
It reads the same diagnostic rows as `TemplateDiagnostics`, but only turns a suggestion into an edit when semantic-runtime
can prove the authored target and exact insertion span. Supported edit families include `declare-view-model-member`
for missing root-scope members, and `register-framework-capability` for closed framework capability demands whose
owning compiler world resolves to an app-root `.app(...)` chain with local package/import evidence. Framework
registration edits are planned through `source-plan`: imports are updated with TypeScript AST spans, and
`.register(...)` is inserted before the proven app-root call. Other diagnostic suggestions remain structured repair
intent until a future planner can prove their source operation; clients should not treat every suggestion row as an
automatic fix. Code-action rows retain a non-empty set of source diagnostics, carry the same diagnostic-stage `repair`
affordance, and prove plan availability with a non-empty tuple of exact edits. Every edit carries a non-null authored
source and `oldText`; insertion plans use the empty string so delayed hosts can validate them under the same
all-or-nothing rule as replacements. Equivalent-plan deduplication merges the
source diagnostic evidence instead of choosing one representative diagnostic. The split is intentional: a diagnostic
may be guided or `source-edit-policy-open` while one returned quick fix carries a concrete multi-edit plan, because the
source planner has crossed the stricter authored-operation boundary for that app context.
`configure-framework-capability` is a distinct structured suggestion for a surface excluded by closed plugin options.
It does not become a code action merely because the option source is known: the intended new value, alias policy, or
subscriber template is product intent and must be proven by a dedicated planner before an edit is safe.
`TemplateInlayHints` is the IDE-shaped template hint projection. Rows are source-file filterable and currently expose
implicit binding-mode resolution: authored default `.bind` command intent, the resolved runtime binding mode, a
display-friendly mode label, and exact authored insertion source. The row's primary `source` is the attribute-name span
where an LSP client should place the hint; broader attribute and runtime binding spans remain available as
`attributeSource` and `bindingSource` for explanation or lower-level follow-up. Explicit mode commands such as
`.to-view` and `.two-way` should not produce rows because their intent is already visible in source.
`TemplateSemanticTokens` is the shared IDE token-coloring projection. Rows are source-file filterable and use the
stable LSP-facing token legend exported from the public contract. Tokens are conservative, source-linked facts derived
from compiled templates and parsed expressions: resolved Aurelia elements, bindables, commands, template controllers,
custom attributes, `<let>` declarations, interpolation/value-expression identifiers, value converters, and binding
behaviors. Element rows use the exact materialized opening and closing tag-name addresses rather than rediscovering names
inside the broader element carrier. Token rows are presentation evidence only; edit, rename, and repair features should use cursor-info,
references, diagnostics, and future edit-policy answers rather than inferring authority from coloring.
`TemplateFoldingRanges` is the shared IDE folding projection. Rows are source-file filterable and carry exact authored
element spans derived from compiled HTML structure, with tag name, definition name, child count, and self-closing state
for consumers that want explanation or secondary grouping. The query intentionally returns only multiline authored
regions and requires only runtime-topology facts; LSP clients should translate the row `source` spans to native folding
ranges rather than reparsing template text.
Authoring orientation exposes both individual `repairs` and grouped `repairClusters`. Individual rows preserve the
cursor/file evidence needed for later edits; clusters are the first large-data view for apps with many repeated weak
typing diagnostics, grouping by repair kind, diagnostic/open-seam class, suggestion action, target kind, missing input
signature, and concrete repair target source. That last split is intentional: an app with many `any` owners should
produce one source-owner-type-strengthening cluster per actionable owner surface, not one giant bucket that erases where
future edits would land. Clusters also carry action-target rows, site/value-site families, source target coverage,
distinct target member names, and member-level hints with evidence counts plus owner/value type coverage. Value-type
hints also carry their source: `selected-member` when the TypeChecker already projected the
member, `assignment-target` when a binding assignment target supplies the value type, or `binding-target` when a
value-site target type can honestly be inferred. Missing coverage is still useful signal; do not fill it from text
interpolation or a weak/null target observer just to make an edit plan look complete. Pressure scripts must summarize
those dimensions without printing app-specific member names or paths, but the API keeps them available for future
code-action planning, such as proposing an interface shape from repeated weak-owner member reads or deciding which
member hints still need value-type inference. Keep repair/edit planning outside diagnostic row projection: diagnostics
should expose structured targets and evidence, while a future edit-planning surface decides which target becomes a safe
source operation.
Repair rows and action-target rows also carry source roles, following `SemanticSourceReference.anchor` when a diagnostic
points at a generated/template-node carrier and reading `SemanticSourceReference.sourceFileRole` when a checker or
dependency source address owns the file role directly. Keep these roles separate from `SemanticSourceReference.role`,
which is a span role such as `type` or `binding-source-assignment`; source roles answer whether the edit target is app
source, template, tooling config, declaration, external dependency source, or another admitted file class. Compact repair
clusters retain action-target source-role counts even when exact action-target rows are elided, so MCP callers can route
"fix this" requests without reopening a path-heavy detail answer first.
Cluster `key` values are compact fingerprints over that structural grouping input. Consumers should use
`actionTargets`, `memberHints`, and source references for explanations or edits instead of parsing source spans back out
of the key. `contract:template-diagnostics` includes a non-effect guard for this because key token economy is part of
the public API shape even though the editable source loci live in structured rows.
Clusters also publish a planning classification: `planKind`, likely `changeDomain`, and `planReadiness`. These are still
semantic repair intents, not edits. A weak owner cluster can now say "strengthen this app-source owner type" and carry
the observed member/type surface, while a router or evaluator seam can stay in the runtime-policy or substrate lane. The
readiness value keeps source edit policy, missing target source, runtime intent, and substrate work distinct so a future
code-action layer does not mistake a high-count cluster for an immediately safe edit plan.
Source-bearing open seams publish a `runtime-boundary` action target when the owning seam has an authored address. That
does not mean the edit is known; it means the future planner has a precise source locus for collecting user/product
intent, such as deciding whether a dynamic router `href` is deliberately external, should become a static navigation
target, or should stay runtime-dependent.
The cursor pressure script derives hover targets, navigation targets, diagnostic signals, and compact LSP envelopes
from this same result so feature pressure stays on the shared cursor-info substrate instead of becoming separate source
scans. It labels index-signature selected members as synthetic so those rows do not look like lost TypeChecker
declaration provenance.
Like app API pressure, cursor-locus pressure accepts explicit `--fixture` and `--root` selectors for focused canary
runs. Prefer those selectors over env-only root overrides when comparing cursor-info behavior across overlay, router,
and form pressure fixtures; the printed aggregate still omits source text and raw paths.
Completion pressure classes prefer cursor-diagnostic-backed labels when the LSP envelope already explains an absent or
open answer, but the script still prints the underlying `missingInputs` counters separately. It also reports result,
selection, and coverage independently so an answered-but-open completion is not flattened into execution failure. That keeps actionable
repair surfaces such as missing scope-slot types visible without making them look like unexplained autocomplete gaps.
It also seeds a bounded `diagnostic-probe` lane from file/app diagnostic source ranges before generic expression
sampling. The reader may inspect more diagnostic rows than it samples and then chooses loci by diagnostic pressure class,
so rare diagnostics such as binding assignment strictness are not hidden behind a dominant weak-owner class. That keeps
cursor-locus pressure aligned with the diagnostic sites discovered by broader file/app loci, especially weak owner
surfaces that a first-N expression walk may miss.
In multi-project pressure runs, the script passes the current `projectKey` into the public cursor APIs before comparing
them with the lower-level inquiry answer. That keeps wrapper-drift pressure separate from legitimate app-context
ambiguity when the same template source is visible through more than one opened app-world.
Cursor-info carries first-pass diagnostic rows from two sources: completion-context weak expression-member owner
surfaces or missing selected members, and binding data-flow assignment diagnostics whose source span contains the
cursor. Binding data-flow can also carry exact framework diagnostics when the observation product has already matched a
runtime error path, such as `SelectValueObserver` single-select array updates (`AUR0654`). These rows are not text edits
yet; they expose a typed diagnostic kind, diagnostic authority, optional framework
error code, selected member, owner/value type displays, owner type projection origin, source, a suggestion kind such as
`declare-explicit-member` or `inspect-owner-type`, and an action target envelope. The action target is the
semantic thing a future code action should operate on: an `owner-type` with source for explicit member or owner-type
repairs, a `scope-slot` source when the write/read pressure has not resolved to a TypeChecker owner, an `expression`
source for runtime-noop assignment rewrites, or a `template-syntax` source for template-compiler syntax failures. This
gives future code actions a typed foothold without making autocomplete invent names from `Record<string, any>` or
`any`. When the owner type cannot be materialized because the template scope
slot itself has no TypeChecker-backed type, the diagnostic uses `expression-member-owner-type:missing-slot-type` with a
`declare-scope-slot-type` suggestion instead of pretending a member lookup happened on a known owner. The suggestion
target comes from the evaluator's open subject, so an expression such as `item.label` can report the member span as the
diagnostic source while grouping repair planning on the `item` scope slot and keeping `label` as member evidence.
When a weak owner is known but the type product itself is source-independent, such as a projected `any` scalar, the
cursor path first asks the expression evaluator for the value-producing source route. If that route came from an
authored slot or member with an explicit type annotation or return type, the suggestion targets that type span even
though the reusable `any` type shape has no source. If no value-type span is available, the suggestion can still target
the member declaration/name route when that is the best actionable source. Only when no narrower route exists does the
suggestion fall back to the authored expression source. This keeps repair planning actionable without pretending the
semantic-runtime can edit a declaration it cannot locate.
Repeat locals use the same policy. If `item` is weak because `items` is `any[]`, the cursor row should preserve the
iterable/source-slot route that introduced `item`; if `item` is weak because the repeat source itself cannot be typed,
the row stays in `declare-scope-slot-type` territory instead of inventing an owner type.
An `unknown` repeat source is different: the TypeChecker can represent the slot as `unknown`, so cursor diagnostics
should report an explicit weak owner with `expression-member-owner-type:no-members` rather than
`expression-member-owner-type:missing-slot-type`. That keeps the public API aligned with overlay TS18046 rows while
preserving `missing-slot-type` for genuinely unmaterialized scope slots.
When `TemplateCursorInfo` is requested with `diagnosticProjection: "type-projection"`, the cursor answer also consults
the same template overlay diagnostic lane used by template diagnostics and keeps only overlay TypeScript diagnostics
whose mapped authored span contains the active cursor. Missing-member overlay rows stay suppressed when the semantic
template diagnostic lane already owns that span, so cursor hover/explanation surfaces can show TS2345/TS2554/nullish
checker evidence without turning overlay diagnostics into a second public diagnostic system.
Diagnostic rows keep `missingInput` as the primary compact reason and also expose `missingInputs` for the full reason
set. Binding assignment strictness can legitimately carry multiple TypeScript-policy reasons for one authored source
span, so consumers should aggregate `missingInputs` when they need pressure counts or code-action routing.
Binding data-flow rows expose `sourceAssignmentOccurrenceSource` for the exact authored token receiving a
target-to-source write and `sourceAssignmentTargetSource` for the declaration/context slot reached by Aurelia scope
lookup. Template references and rename join those two facts so pure writes remain navigable without masquerading as
observed reads. Template diagnostics use the target address for their suggestion action target,
which lets a future code action jump from `value.bind="priority"` or a custom two-way bindable directly to the
authored getter/setter/member that receives the observer value.
Binding data-flow summary rows preserve compact source-type open counts and issue rollups so MCP/LSP callers can explain
the likely root cause before paging raw rows. Summary set fields are representative samples with sibling `*Count`
fields when a large app has more roots, types, properties, or definitions than the compact budget can print. Pass
`page.size: 0` when the caller only needs the issue rollup before choosing a follow-up row page. `source-type-unresolved`
marks expressions whose TypeChecker-backed source did not close, `source-nullish-to-required-target` marks the exact
case where TypeScript rejects the source only because it may be `null`/`undefined`,
`target-nullish-to-required-source` marks the same nullish mismatch in the observer-to-source write direction, and
`target-empty-array-inferred` marks the common TypeScript `never[]` target surface from unannotated empty-array component
properties. These are authoring/repair signals layered on top of the lower-level assignability rows, not separate binding
products.
Weak owner diagnostics also separate TypeScript declaration provenance from an editable authoring target. If a projected
owner is backed by a default-library or dependency utility declaration such as `Record<K, V>`, the diagnostic should
target the app expression/member source that introduced that owner rather than telling a repair planner to edit the
external declaration. Local declarations remain valid action targets when they are the actual type surface the app owns.
Assignment strictness summaries are value-channel aware: select and radio mismatches explain `model.bind` versus DOM
`value` strings, collection/map checked channels explain element/key alignment, and raw native value channels call out
that controls commonly write strings even when their visual domain looks numeric.
Runtime-unassignable target-to-source bindings are separate from TypeScript strictness. Aurelia's `astAssign` falls
through without updating unsupported expression targets, so semantic-runtime reports those as
`binding-source-assignment-runtime-noop` with `use-assignable-expression` guidance rather than as framework errors.
Framework-managed scope state is a third class. Repeat contextuals are readable authoring surfaces but are updated by
the framework, so attempted writeback reports `binding-source-assignment-framework-managed` under
`semantic-authoring-policy`. This remains true for `$index` and `$length` even though `Repeat` mutates their runtime
properties internally; runtime representation does not grant template-author assignment authority.
Source-assignment diagnostics are published from binding data-flow rather than template checker overlays, because
data-flow already knows the binding direction, target observer/value channel, source write capability, and Aurelia
`astAssign` policy. When a parse AST is available, the public diagnostic source narrows through
`runtimeAssignmentTargetAstForParse(...)` to the authored assignment expression target (`binding-source-assignment`)
instead of the whole binding attribute; repair action targets still use the TypeChecker member/declaration source.
The opposite direction is owned by the same product. A proven `sourceToTargetAssignable: false` publishes
`binding-target-assignment-strictness` on the authored source expression, distinguishing general incompatibility from
nullable-source-to-required-target pressure. This must not be delegated to generated overlays: only binding data-flow
knows the effective mode, converter result, child bindable target type, and runtime value channel together.
The reserved `$host` access scope is the exception on both read and write paths. A missing `$host` runtime context maps
to `ast_$host_not_found` (`AUR0105`) during source evaluation, and framework `astAssign` throws
`ast_no_assign_$host` (`AUR0106`) before ordinary scope lookup during writeback. Binding data-flow therefore reports
both exact runtime AST codes instead of treating `$host` as a synthetic `$` writeback local.
Unsupported callable expression reads are a different lane because Aurelia's runtime evaluator throws exact
`astEvaluate` errors when a call target, tagged-template tag, or named member call is not callable. Binding data-flow
rows now carry `sourceTypeOpenKind` from the TypeChecker expression evaluator, and diagnostics map supported callable
open kinds to exact runtime codes (`AUR0107`, `AUR0110`, `AUR0111`) through `RuntimeAstFrameworkErrorCode`.
Binding data-flow also carries the rendering controller's `strictBinding` state into TypeChecker expression evaluation.
Optional and non-strict nullish member/keyed/call reads project `undefined`; unknown strictness remains open; and strict
definitely-nullish member/keyed owners map to `AUR0114`/`AUR0115` only when that state is explicitly `true`. Strict
nullish call targets spend the matching callable runtime code (`AUR0107` or `AUR0111`) through the same framework
authority lane instead of being reported for non-strict bindings.
The write side uses the same gate: strict member/keyed assignment through a definitely nullish owner maps to
`ast_nullish_assignment` (`AUR0116`) as a binding source-assignment diagnostic, while non-strict or unknown strictness
keeps the row out of framework-error authority.
Source-to-target binding evaluation also asks the TypeChecker evaluator in connectable mode. Increment operators and
compound assignment then surface `ast_increment_infinite_loop` (`AUR0113`), matching Aurelia's guard against mutating a
binding source while dependency collection is active. Event-handler-style evaluations should remain non-connectable and
must not spend that code.
Value-converter and binding-behavior resource lookup diagnostics spend the runtime-html binding-utils authority instead
of the runtime evaluator authority: missing value converters map to `ast_converter_not_found` (`AUR0103`), missing
binding behaviors map to `ast_behavior_not_found` (`AUR0101`), and duplicate authored behavior names map to
`ast_behavior_duplicated` (`AUR0102`) through `RuntimeHtmlAstFrameworkErrorCode`. The repair guidance for those rows
should route to resource registration or expression rewrite, not callable-expression repair.
Repeat destructuring is owned by scope construction instead: `RuntimeBindingScopeIssue` products spend checker-backed
binding-pattern projection and map non-object or non-Array-rest item shapes to `AUR0112`. Keep this partial: the Atlas
runtime `ast*` frontier is broader than these call/destructuring diagnostics, and unmodeled runtime AST failures should
stay unclaimed until the matching expression, assignment, or scope-effect substrate exists.
Repeat source compatibility is also scope-owned, but its authority comes from runtime-html `RepeatableHandlerResolver`
rather than runtime AST: scope construction now maps sources outside the built-in repeat categories to
`repeat_non_iterable` (`AUR0777`) through `RuntimeHtmlControllerFrameworkErrorCode`. The modeled default
categories are arrays, sets, maps, numbers, and nullish. Scope construction also spends the exact
`all(IRepeatableHandler)` lookup from the active render container. Framework `ArrayLikeHandler` admits object values
with numeric length, while app-owned handlers reuse their DI resolver state, evaluated class declaration, and
checker-visible `iterate(value, callback)` contract. A source outside a closed handler value domain remains rejected;
an admitted custom source stays open when its item contract is unknown. Do not broaden this with generic TypeScript
iterable heuristics or with registration-presence-only guesses.
The same scope-issue product family reports `template-controller-null-binding-context` for a built-in `with` value that
can reach `null`. This row has `framework-runtime-behavior` authority rather than a framework error code: runtime-html
passes `null` into the child `Scope`, and ordinary scope lookup later throws a JavaScript error while applying `in` to
that binding context. `undefined` is intentionally excluded because `with` replaces it with `{}`. The diagnostic source
is the exact value expression, and the retained source type drives definite-versus-possible severity.
`unsupported-repeat-declaration` uses the same authority boundary for object binding patterns. The current framework
parser admits the pattern, but `Repeat` does not recognize that AST kind as destructuring and therefore creates no
declared locals at runtime. The row intentionally has no framework error code, targets the exact declaration span, and
recommends rewriting to one repeated local plus property access. Recovery symbols may remain queryable so IDE
navigation can help perform that rewrite.
Repeat option diagnostics are controller-owned. Runtime rendering now publishes `RuntimeControllerIssue` products for
the `Repeat` constructor failures that inspect iterator tail `MultiAttrInstruction`s: invalid `key` commands
(`AUR0775`), extraneous option targets (`AUR0776`), and invalid `contextual` commands (`AUR0821`). Template diagnostics
surface these as `runtime-controller-framework-error` rows with template-syntax repair guidance. Renderer resource
lookup failures use the same issue lane for named-resource instructions that cannot resolve from the rendering
container: custom elements (`AUR0752`), custom attributes (`AUR0753`), and template controllers (`AUR0754`). Controller
bindable observer setup is in the same product lane: when TypeChecker-backed observer selection can prove that the framework
would receive a collection observer without `useCoercer` or `useCallback`, `controller_property_not_coercible`
(`AUR0507`) and `controller_property_no_change_handler` (`AUR0508`) surface through `RuntimeControllerIssue` rather
than resource or API-local diagnostics. Built-in `AuCompose` static input diagnostics also use
`RuntimeControllerIssue`: literal invalid `scope-behavior` values map to `AUR0805`, literal invalid `flush-mode` values
map to `AUR0809`, and static string `component` / `view-model` lookup misses map to `AUR0806` by probing the parent
hydration-context controller container after controller-local dependency resources have been registered. Runtime-only
run/deactivate failures stay unclaimed until composition lifecycle state is
modeled. Built-in branch link-hook diagnostics use the same lane: orphan `else` maps to `AUR0810`, orphan `case` /
`default-case` controllers map to `AUR0815`, and duplicate `default-case` controllers under one switch map to `AUR0816`. Promise-result link-hook
diagnostics are also controller-owned: orphan `pending`, `then`, and `catch` controllers map to `AUR0813` when they are
not rendered inside the synthetic view created by a parent `promise.resolve`.
Controller activation diagnostics can also be source-backed when the framework failure is caused by a view-model DI
request rather than a template attribute value. Ordinary custom elements and custom attributes that resolve
`IViewFactory` during instance activation map to `AUR0755`; template controllers are exempt because the renderer passes
a prepared view factory provider for their nested view.
Runtime binding diagnostics are owned by `RuntimeBindingIssue` when the failure belongs to a concrete runtime binding
rather than to behavior application or scope-effect spending. `SpreadBinding` uses that lane for captured-attribute
transfer failures: missing hydration context maps to `AUR9999`, and template-controller child admission maps to
`AUR9998`. Template diagnostics surface those as `runtime-binding-framework-error` rows. `AUR0770`
`no_composition_root` is still unclaimed because it belongs to `Aurelia.start(...)` lifecycle/app-root state.
Runtime renderer diagnostics are owned by `RuntimeRendererIssue` when the failure belongs to renderer dispatch before a
binding/controller product exists. `RefBindingRenderer` maps `view.ref` to `AUR0750` because runtime-html rejects that
ref target during `getRefTarget(...)`, maps missing named ref targets to `AUR0751` only after a custom-element host
exists, and maps `AUR0762`/`AUR0763` for the framework `findElementControllerFor(...)` host checks that happen before
controller/component or named custom-element fallback can resolve on ordinary DOM elements. Ref renderer rows use the
exact authored target part and the `template-syntax` diagnostic subject; transformed or missing targets must not fall
back to the whole attribute carrier. `SpreadValueRenderer` maps
invalid spread targets to `AUR0820` when `.spread` lowering produces a `SpreadValueBindingInstruction` target other than
`$bindables`. Diagnostics surface these as `runtime-renderer-framework-error` rows.
Runtime binding-behavior diagnostics are owned below the API by `RuntimeBindingBehaviorIssue`. Built-in bind-time
behavior issues now map `& self` non-listener usage to `AUR0801`, `& updateTrigger` argument/mode/observer-config
failures to `AUR0802`, `AUR0803`, and `AUR9992`, `& signal` invalid binding/no-signal cases to `AUR0817` and
`AUR0818`, `& attr` on non-property bindings to `AUR9994`, and double throttle/debounce rate limiting to `AUR9996`.
Custom binding-behavior bind methods can contribute direct `PropertyBinding.useTargetSubscriber(...)` effects through
the compiler resource scope; conflicting target-subscriber effects surface as `AUR9995`.
The sibling `AUR9993` service replacement failure is intentionally unclaimed until semantic-runtime models non-default
`INodeObserverLocator` configuration.
`BindingBehaviorApplications` exposes the application side of that same materializer: each authored `& behavior`
attempt reports its behavior name, owning binding kind,
bind-time phase, argument count, statically known scalar/template literal argument values, target kind/property, source
address, nullable resolved resource, and optional product handles. A null resource retains the attempted application
that owns AUR0101 instead of deleting the authored use before diagnostics. Use this query when authoring needs to verify that a generated template
materialized a behavior such as validation-html `& validate:'blur'`; keep it distinct from diagnostics, which only
surface rejected or conflicting applications.
Runtime value-converter diagnostics are owned below the API by `RuntimeValueConverterIssue`. Missing converter lookup
is a bind-phase AUR0103 issue attached to an application whose resource is null. Built-in `sanitize`
invocation now spends runtime-html `method_not_implemented` (`AUR0099`) only when the converter resource is visible and
the active container tree has no modeled `ISanitizer` resolver; app-provided sanitizer registrations suppress the
diagnostic. Template diagnostics surface that row as `runtime-value-converter-framework-error` with service-registration
repair guidance.
Current weak-owner diagnostics use `diagnosticAuthority: "semantic-authoring-policy"` because they represent repair
guidance for weak or incomplete app types. Assignment strictness diagnostics use
`diagnosticAuthority: "semantic-runtime-product"` because binding data-flow has already combined observer/value-channel
semantics, value-converter writeback, source write capability, TypeChecker assignability, and `astAssign` policy into a
product-level static fact. Runtime-noop assignment rows usually use `diagnosticAuthority:
"framework-runtime-behavior"` with `frameworkErrorCode: null`; exact assignment failures such as `$host` assignment can
use `diagnosticAuthority: "framework-error-code"` on the same diagnostic kind.
Rows with `diagnosticAuthority: "framework-error-code"` should only be introduced after checking Aurelia source through
Atlas `framework.errors` and should carry the exact framework code. The expression parser now has a low-level
`ExpressionFrameworkErrorCode` bridge for exact parser counterparts such as `parse_left_hand_side_not_assignable`.
That bridge records the intended framework package/enum/member as well as the AUR label because labels can collide
across framework packages. Template diagnostics should read those codes and messages from parser products, including
companion/frontier publications, not infer them from diagnostic wording later.
Template compiler failures should surface through compiler issue products, not API-local wording checks. Attribute
classification currently publishes exact framework authority for reserved spread syntax
(`compiler_no_reserved_spread_syntax` / `AUR0720`) and reserved `$bindables` syntax outside custom-element declarations
(`compiler_no_reserved_$bindable` / `AUR0721`). Binding-command lowering publishes the same issue-product shape for
custom-attribute inline segments that bind to non-bindables (`compiler_binding_to_non_bindable` / `AUR0707`) and
modeled command build failures such as `ClassBindingCommand` invalid comma-separated class targets
(`compiler_invalid_class_binding_syntax` / `AUR0723`). Compiled-template assembly publishes it for root `<template>`
surrogate attributes rejected by the framework (`compiler_invalid_surrogate_attr` / `AUR0702`), surrogate template
controllers (`compiler_no_tc_on_surrogate` / `AUR0703`), `[au-slot]` projection under a non-custom element
(`compiler_au_slot_on_non_element` / `AUR0706`), `<slot>` without shadow DOM
(`compiler_slot_without_shadowdom` / `AUR0717`), and `<let>` commands the framework rejects
(`compiler_invalid_let_command` / `AUR0704`). It also publishes the framework local-template failures for root
local-element templates (`AUR0701`), only-local-template content (`AUR0708`), local templates outside the root
(`AUR0709`), local bindables outside the local template root (`AUR0710`), missing local bindable names (`AUR0711`),
duplicate local bindable property/attribute pairs (`AUR0712`), empty local-template names (`AUR0715`), and duplicate
local-template names (`AUR0716`). File/cursor diagnostics read those issue products and turn them into
`template-compiler-error` rows with `template-syntax` repair targets.
Non-template framework errors should surface the same way: through product-owned issue records in the substrate that
models the framework behavior. `ResourceIssues` currently exposes resource metadata/controller watcher failures from
bindable decorator convergence (`AUR0227`, `AUR0228`, `AUR0229`), process-content hook convergence (`AUR0766`), watch
convergence (`watch_null_config` / `AUR0772`, `watch_invalid_change_handler` / `AUR0773`,
`watch_non_method_decorator_usage` / `AUR0774`), `@children(...)` invalid query convergence (`AUR9989`),
non-field `@slotted(...)` decorator usage (`AUR9990`), controller watcher lookup (`AUR0506`), and containerless shadow/slot
conflicts (`AUR0501`). Keep those rows owned by resource convergence; the API may project and page them, but should not
manufacture their authority. Resource-registration duplicates from the runtime-html definition registrars are also
`ResourceIssues`: duplicate custom elements (`AUR0153`), custom attributes (`AUR0154`), value converters (`AUR0155`),
and binding behaviors (`AUR0156`). Resource API calls that can be proven invalid from TypeScript source also publish
`ResourceIssues`: `CustomElementDefinition.create(...)` with only a string name (`AUR0761`) and project-local
`getDefinition(...)` misses for custom elements (`AUR0760`), custom attributes (`AUR0759`), value converters
(`AUR0152`), and binding behaviors (`AUR0151`). `DiIssues` exposes container/world-construction failures in the DI lane; the first
modeled case is duplicate source/static `$au` resource-key publication, which follows the Aurelia kernel
`resource_already_exists` / `AUR0007` warn-and-skip path rather than the separate `registerResolver(...)` throw path.
It also exposes ambient `resolve(...)` calls that are definitely evaluated without Aurelia's current container
(`no_active_container_for_resolve` / `AUR0016`) and activation-time `resolve(null)` / `resolve(undefined)` key
validation (`null_undefined_key` / `AUR0014`), while leaving caller-dependent function/member calls as topology facts
rather than exact diagnostics.
`AppDiagnostics` is an aggregation query over ordinary TypeScript diagnostics plus configuration, DI, evaluation,
observation, template, resource, router, and route-recognizer diagnostic products. TypeScript rows come from the same
TypeSystemProject checker epoch as the rest of semantic-runtime, but diagnostic eligibility is tsconfig-shaped rather
than identical to every semantic checker root. The Program may include evaluated project-local Aurelia resources so
observation and template analysis can ask the checker about Program-owned nodes, while ordinary TypeScript diagnostics
only iterate the parsed tsconfig diagnostic source set when one exists. Semantic-runtime overlay sources are also
checker roots, but their diagnostics stay hidden until a query can map a synthetic span back to authored Aurelia source.
Config read/parse/option diagnostics are kept on the same surface, so public adapters do not need to shell out to `tsc`
or build a second Program. This aggregation is a normalized index, not a replacement owner record. Every app diagnostic
preserves the common facts available from its owning row: phase, raw framework authority, missing inputs, structured
subject kind/name/source, related information, repair suggestion, and source role use explicit nullable or empty values
rather than disappearing by domain. Evaluation and DI subjects preserve their existing domain enums, resource subjects
reuse the existing resource taxonomy, and template/observation subjects use the normalized member/expression vocabulary;
adapters must not widen these back to `string` or drop `subjectName`. Phase and diagnostic kind are closed unions of the
owning domain ontologies and must be interpreted with `diagnosticDomain`. TypeScript diagnostic kinds remain extensible
only through the explicit `TS${number}` namespace; aggregation must not widen any of these fields to an ungoverned
string. At `detail: "handles"`, the
normalized handle carrier preserves the owning issue product/identity/source route plus any modeled owner,
related-source, template-source, or resource-definition routes;
compact rows omit the handle carrier. Domain-specific payload remains on the owning query. `diagnosticDomain`
and `relatedQueryKind` identify that query family so callers do not have to treat app diagnostics as a separate semantic
layer or reverse-engineer ownership from wording. The owning diagnostic rows are collected before the app-level page is
applied; do not page a child query and then aggregate it, or pressure summaries will hide high-volume diagnostic classes.
`AppDiagnosticSummary` reads that same unpaged diagnostic row set, then clusters by diagnostic domain, kind, authority,
framework code, severity, and owning query. Use it before raw rows when a large app needs dominant diagnostic classes
rather than the first source-ordered page. App diagnostic row and summary answers also own compact `displayText` with
severity/domain/code rollups and top samples or clusters, so MCP/LSP callers can pick the owning query family before
opening raw rows.
`TypeScriptDiagnostics` and `TypeScriptDiagnosticSummary` are explicit drill-down queries for ordinary TypeScript
errors, warnings, and messages when the unified app diagnostic rows point at `diagnosticDomain: "typescript"`.
Rows keep TypeScript's optional diagnostic `source` label separate from semantic-runtime's boot-admitted
`sourceRole`. The latter is threaded from source discovery/admission, so public adapters can distinguish app-source,
test-source, tooling-config, declaration, and other project roles without guessing from file names or shelling out to
another checker process. Source roles are still discovery/admission hints, not reachability proof: a nested folder such
as `src/tools` may remain `app-source` if the project can import it at runtime. Summary rows retain source-role counts
for the same reason: a repair assistant can prioritize app-source errors while still reporting test/config pressure
honestly.
Unified app diagnostics also preserve source-file ownership for non-ordinary diagnostic lanes. `SemanticSourceReference`
rows expose `sourceWorkspaceKey` and `sourceFileRole`; if a template overlay maps back to a source owned by another
project or by a dependency path such as `node_modules`, the unified row reports `external-source` instead of treating
that file as the opened app's editable source.
`diagnosticProjection` is honored by the diagnostic families that advertise it in the query catalog:
`AppDiagnostics`, `AppDiagnosticSummary`, and `TemplateDiagnostics`. `available-products` limits those answers to
diagnostics backed by the opened app-world and deliberately omits ordinary TypeScript Program diagnostics; leaving the
projection unset or using `type-projection` includes TypeScript diagnostics and may run answer-time TypeChecker
owner/member projection for weak-member diagnostics. The focused TypeScript diagnostic queries are already an explicit
request for Program/tsconfig diagnostics, so they do not downshift to `available-products`.
`TemplateDiagnostics` also uses `type-projection` for generated template checker overlays. These rows have
`diagnosticKind: "template-expression-typescript-diagnostic"` and `diagnosticAuthority: "typescript"`, but they are not
ordinary `.ts` diagnostics: they come from a virtual TypeScript source that replays authored template expressions inside
materialized binding-scope ancestry, then maps admitted checker diagnostics back to the authored template span. Keep the
public admission policy narrow. Syntax/name-resolution/implicit-any complaints from generated overlay code are
substrate pressure unless the overlay can prove a specific authored cause; public rows currently admit semantic
missing-member, nullish access, type/argument mismatch, overload rejection, non-callable values, and
readonly-assignment-style codes and carry
`missingInput: "typescript:TS####"` plus a structured action target. Nullish overlay diagnostics use
`guard-nullish-expression` because the authored repair is usually a guard, optional chain, or earlier narrowing step;
other admitted checker rows stay on `inspect-owner-type` until the diagnostic policy can prove a more specific repair.
Raw template and app diagnostic tables retain admitted checker rows even when a semantic-runtime diagnostic owns the
same authored relationship. Detailed rows preserve the overlay lifecycle phase, semantic product, identity and source
address, origin key, generated file, and mapped segment label. `AppDiagnostics.presentation` is the answer-local user-facing
join: exact missing-member or assignment agreement keeps the Aurelia-aware semantic row primary and attaches the
TypeScript row as contextual `checker-evidence`. This avoids duplicate editor diagnostics without deleting independent
facts needed by MCP, AOT, explanation, or future policy consumers. TypeScript-native rows such as argument mismatch,
arity mismatch, nullish access, and unknown-owner access remain primary. Template overlay rows share the same TypeScript
diagnostic severity mapping as ordinary TypeScript diagnostic rows so unified diagnostic answers do not drift by lane.
Raw diagnostic rows can also carry product-grounded `diagnosticRelations` independently from this presentation policy.
Adapters must spend those answer-local identities before detaching rows. Standard LSP `Diagnostic.data` and unresolved
`CodeAction.data` outlive one semantic answer, so they retain stable diagnostic/source facts but not kernel handles or
answer-local relation identities; custom inspection responses may retain the identities only while carrying the whole
answer and its related rows together. Published diagnostic batches should include the document version.
Repeat source rejection spends the retained iterator effect, runtime binding, child-Scope creator, and introduced local
slot to relate its later facts to the owning `AUR0777` row. Assignment strictness is parallel semantic evidence about
that same runtime operation; checker and weak-owner diagnostics rooted in the rejected local are derived analysis
consequences. The owning diagnostic identity and relation target remain present in compact rows so paging and LSP
reassembly never fall back to source/code coincidence. Presentation may group those rows, but aggregation and paging
must preserve every raw fact. Do not infer these edges from source proximity or message text.
`AppOverview` uses `available-products` for its nested diagnostic summary so a compact first read does not publish
query-time type products or full Program diagnostics. Explicit `AppDiagnostics`, `AppDiagnosticSummary`,
`TypeScriptDiagnostics`, `TypeScriptDiagnosticSummary`, and `TemplateDiagnostics` calls still default to the repair
surface because those are deliberate diagnostic reads.
Public transport adapters should expose this projection as a caller choice instead of hiding it behind local defaults:
summary/orientation flows can request `available-products`, while deeper repair, verification, or IDE-like flows can
request `type-projection` and accept the measured CPU/memory cost.
The policy for turning weak owner and binding assignment pressure into cursor/file diagnostic rows lives in
`template-diagnostic-policy.ts`. Keep that boundary honest: cursor/template readers should locate source and semantic
context, while the policy module owns severity, suggestion kind, action target, and product-policy wording.
The legacy recipe-authoring catalog, guidance, orientation, and recipe-plan answers have been removed from this API.
Do not add compatibility wrappers for them in `runtime.ts`, MCP, or query catalog rows. The preserved source artifacts
now live as neutral fixture pressure and source-plan/app-builder substrate. Public app-generation answers grow through
`SemanticRuntime.appBuilderQueryCatalog(...)` and `SemanticRuntime.answerAppBuilderQuery(...)`, a static/generation
workflow facade kept separate from app-world query kinds. The app-builder facade includes read-only
`ontology-catalog` terrain, selectable `target-catalog` rows, recommendation-policy review, source-lowering preflight, input readiness, input contract detail, affordance
detail, application pattern detail, collection concept detail, control pattern detail, effect contract detail, policy
axis detail, style detail, menu discovery,
app-builder source-lowering invocation, app-builder source-lowering composition, source-lowering preview, concrete `part-source-invocation`
callbacks, catalog integrity, and SourcePlan generation;
MCP should forward those runtime-facade answers rather than reconstructing app-builder policy locally. The lower-level
`answerSemanticRuntimeAppBuilderQuery(...)` and `answerSemanticRuntimeAppBuilderQueryCatalog(...)` helpers are pure
deterministic answerers for contracts, generated fixture materialization, and registry checks; they do not attach
query-claim wrapping or typed continuations unless a caller explicitly uses the shared continuation projector.
Diagnostics-to-action and
future edit planning should grow from diagnostic/open-seam rows rather than from the old recipe/orientation shape.
The app-builder query catalog and answerer registry are one checked API surface:
adding a query kind must add enum value, catalog row, and answerer together so a
transport cannot advertise an uncallable app-builder query.
`ontology-catalog` is summary-first for public/MCP reads: it reports domain
summaries, total row counts, source-lowering-implemented counts, relation counts,
and display flags by default. Full ontology row families require
`includeRows: true`, and relation graph rows require `includeRelations: true`
or an explicit relation-kind filter, so broad orientation does not ship the
entire app-builder graph unless the caller asks for detail.
Input readiness accepts contract-wide markers, facet-scoped markers, and facet payloads; facet payloads validate
against `input-contract-detail` schemas where modeled, so public callers can prove concrete supplied facts before
source lowering without making the MCP invent missing app intent.
Target catalog source-lowering availability is reverse canary coverage from current source-lowering surfaces to ontology
rows; it is not a source-lowering support flag.
No-argument target catalog answers return a 25-row first page in actionable-first order so the broad MCP/menu read stays
compact while still exposing a cursor. Explicit filters, exact target selections, and caller-supplied page requests use
the shared public paging behavior.
Target catalog rows also carry compact policy handles: whether the row is a local defaulting candidate, the optional
defaulting policy scope/rationale, and whether a contextual executable row requires policy satisfaction. Full
applicability/evidence rows remain in `recommendation-policy`, and satisfaction state remains in preflight where a
source-producing selection is being evaluated.
Source-lowering preflight is the read-only bridge that reports whether selected ontology rows have executable source
lowerers, only source-lowering availability, or no source path, and whether supplied input payloads pass the input gate.
It also carries policy satisfaction for contextual executable targets: broad/default target sets may list those rows,
but exact target selection is required before they report `canRequestSourceLowering=true`.
Target catalog and preflight rows carry associated `effectContractIds` through the shared app-builder ontology graph,
so callers can inspect SourcePlan/reopen/control-use witness contracts before generating fragments. Target catalog,
preflight, and SourcePlan answers carry `sourceLoweringRequestFieldSummary` by default; target catalog and preflight
compact summaries keep counts only, while full `sourceLoweringRequestFields` rows and surface-scoped request property
names are explicit detail-mode opt-ins through `includeSourceLoweringRequestFields`.
Source-lowering invocation is the generated-fragment bridge for one selected ontology target; current source-lowering-implemented
support covers scalar native control patterns, native choice controls, native button event controls, form-message
fragments, and inline field-group composition. It delegates reusable Aurelia syntax to part-source callbacks where
applicable, spends accessibility help/error payloads for messages and field described-by relationships, and reports
field/action/message/inner-control selection, button type, binding/handler/message/label provenance, value-domain, and
part-lowering issues. Invocation-local accessibility fields are folded into explicit caller supplied
input facets before preflight so request-shape shortcuts do not create a separate source gate. Direct delegated
fragments keep part-source origins; composed app-builder fragments such as buttons, form messages, and field-group wrappers
carry app-builder source-lowering origins for SourcePlan contribution inspection. Invocation answers also expose
`sourceLoweringTargetRefs` and associated `effectContractIds` for typed continuation drilldowns.
Source-lowering composition is the generated-fragment bridge for one selected ontology target that needs member
invocations. The first supported composition is Native Submit Form: it spends explicit domain fields/actions, explicit
field order, submit button text, field-group member invocations, and the event-listener part callback to produce one
form fragment plus contribution fragments. It exposes top-level/member `sourceLoweringTargetRefs` and associated
`effectContractIds`, and it is still not a host write or full SourcePlan generator.
Source-lowering SourcePlan answers are compact by default: they include generated file text, project tooling, file-level
contribution counts, witness counts, control-use counts, expected-effect counts/kinds, request-field summaries, and typed
issues. Full `SourcePlan.files[].contributions`, `sourcePlanWitnessRows`, `controlUseInventoryRows`,
`sourceLoweringRequestFields`, `expectedEffects`, and decision-bundle expansion rows are explicit provenance or
verification detail opt-ins; compact witness rows remain the preferred row-level evidence channel when detail is needed.
Effect contract detail is an inverse read model over promised effects: it tells a caller which app-building moves
promise an effect and what input/pattern context surrounds those moves, but it does not execute verification or source
lowering.
Fixture manifests can still carry neutral expected effects. Verification belongs to
`fixture-verification`, not to the public app-query API: callers reopen a fixture, read the row-backed projections needed
by the manifest, and compare facts such as project tooling, topology, route products, binding flows, validation/i18n
products, and composition rows without treating any old recipe identity as public generation policy.
`project-tooling` expected effects are backed by project source-role rows, so fixture checks can verify package
manifests, TypeScript config files, and local module declarations without comparing file text.
`runtime-composition` expected effects are backed by `RuntimeCompositions` rows, so generated recipe checks can verify
dynamic `AuCompose` component resolution, compiled-template closure, static or bound model presence, aggregate
composed-child controller handoff for closed branches, and activation model handoff without treating a composition host
as sufficient by itself. Rows also expose AuCompose context inputs that do not all arrive through the
same lane: dynamic property bindings such as `component.bind`, `model.bind`, `composition.bind`, and `composing.bind`
come from controller binding, while static `scope-behavior`, `tag`, and `flush-mode` come from literal
`SetPropertyInstruction`s on the hydrate instruction. Component/template/model inputs also carry direct/promise/absent/open
fulfillment fields so API callers can tell when a framework-supported promise-valued composition input was statically
unwrapped. TypeChecker-backed component rows separately expose candidate coverage: `complete` means every member of a
finite exact named-class basis resolved to a custom-element definition, `partial` retains useful candidates when that
basis or its resource mapping is not exhaustive, and `open` means no useful resource identity survived. A broad
construct signature can therefore contribute a candidate through its return type without claiming complete coverage.
Candidate coverage does not claim the runtime-selected component value is known and never authorizes materializing one
concrete child from a multi-candidate set. Plain object
and non-resource constructable components report
`componentResolutionKind=object-view-model`; they can still contribute activation handoff rows, but they do not claim
compiled-template or candidate resource-analysis coverage because no custom-element definition exists.
Rows also carry `renderingContextKind` so callers can separate a resource's definition-local template analysis from
recursive resource instances created while rendering a parent. That distinction matters for public components with
consumer-supplied bindables: the definition row can remain open while concrete app use-sites close through
parent-to-child value flow.
`pressure:app-api` prints compact runtime-composition scope, flush, tag, component/template input presence, static
component-name presence, input fulfillment, rendering context, template-binding, composition-binding, composing-binding,
and composed child-controller buckets so these context lanes stay visible during fixture sweeps without exposing
concrete component names.
This lets fixture expansion ask "what does this app already satisfy?" before running a separate verifier pass.
Closed-loop fixture callers should build verifier input with `readFixtureVerificationSnapshot(app)`. The helper paginates the
row-backed projections used by filtered effects instead of relying on each smoke or host to remember that behavior
applications, runtime watcher rows, watcher observed-dependency rows, runtime composition rows, target-access rows,
value-channel rows, and data-flow rows must travel together with summary, topology, source files, and open seams.
Unsupported row-backed projections fail at snapshot construction time, so callers do not mistake a too-shallow analysis
depth for absence of the expected semantic facts.
The helper uses the `fixture` inquiry profile for every constituent query. A snapshot is one batch operation over one app
epoch, so its answer-local products remain available across the related query set instead of being reconstructed after
every row family. A harness that creates a fresh cold runtime for comparison should retire that runtime after reading the
snapshot; this keeps batch-local reuse distinct from cross-fixture retention.
`runtime-watcher`, `runtime-watcher-observed-dependency`, `binding-observed-dependency`,
`computed-observer-source`, and `computed-observer-observed-dependency` expected effects form the first route-scoped
semantic-contract lane for observation pressure. Focused fixtures assert controller-owned watcher admission, proxy
dependency rows, TypeChecker-gated template collection reads, and getter source-observer rows without snapshotting the
public API response.
`template-diagnostic` expected effects are backed by `TemplateDiagnostics` rows. Use them when a route-scoped fixture
needs to prove repair pressure such as weak owner typing, missing scope-slot type guidance, or diagnostic action-target
selection without turning the whole diagnostics DTO into a snapshot.
`TemplateDiagnostics` lifts those same weak-owner facts from a cursor answer into a file/app-locus answer. It scans the
opened app's compiled template basis, or the requested `sourceFile` when supplied, through parser-owned member-name
spans and returns exact source ranges for diagnostic rows. Keep this as an aggregation over the same cursor-info
substrate until diagnostics grow their own materializer: cursor remains the sharpest probe, while file/app loci are the
batch surfaces that editors, CI, and agents need.
Template diagnostic answers own `displayText` with returned/total row counts, returned-page severity and diagnostic-kind
rollups, and framework-code previews. Use that text as the low-token MCP lane; page rows only after the cluster points
at a source locus.
Weak-owner/member diagnostics are currently a `binding-observation` depth lane. Shallower app worlds still return
parser, compiler, runtime, router, and available binding diagnostics, but they do not run the retained TypeChecker
member-owner scan just because an overview or diagnostic summary was requested.
Batch diagnostic scans read authored template text through the admitted source-file address, whose path is workspace-
relative. Do not resolve those addresses relative to the selected app project: nested app packages and source-shipped
dependency packages can both contribute compiled templates to one app-world.
Host paths are only for reading file contents; API diagnostic source rows should keep the admitted source-address path
so file/app diagnostics, cursor-info, and binding data-flow rows share one provenance identity.
The scan caches source text together with line-start offsets. Keep offset-to-line conversion indexed rather than
prefix-splitting per diagnostic span; file/app loci intentionally walk many expression member spans.
The scan also carries one `CheckerExpressionTypeWorld` through its repeated cursor probes. That keeps TypeChecker
expression projection, resource-scope evaluator selection, and cache lifetime aligned with runtime analysis while
leaving the public completion query as a durable product-handle contract.
Template completion and cursor-info answers preserve `missingInputs` from the inquiry substrate. For expression-member
sites, weak owner shapes such as `any`, index-signature-only records, or owner types with no projected members are still
reported there so callers can explain the absence of candidates. They are not, by themselves, proof of a missing
semantic-runtime rule; pressure scripts classify them as weak-type pressure unless a concrete typed member was lost
between scope construction and the answer.
Cursor inquiry also spends framework capability-demand products at the exact authored site. A recovered resource or
scope can still provide useful candidates, locals, and types when its capability is not admitted, but the required
capability remains in `missingInputs` and answer coverage stays open. The diagnostic projection may present the same
fact as an actionable error; it is not the source of the cursor answer's epistemic state.

`AppTopology` is the first app-building projection. It composes already-materialized configuration, resource, compiler,
template, authored router facts, and source CSS imports into app roots, components, route configs, bindables,
component dependencies, external template assets, component/global style asset rows, component-role rows, roleful source
files, class-level service/state/model rows, and source-level DI injection rows for Aurelia `resolve(...)` calls.
Bindable rows include names, attributes, binding modes, and source by default; TypeChecker value surfaces are opt-in via
`includeTypeSurfaces: true` because resource target type shapes are member-lazy during app construction and the richer
surface should spend query-claim budget only when an answer needs it.
Style rows keep plain CSS imports and inline Aurelia `cssModules(...)`/`shadowCSS(...)` registry arguments separate, so
`style-resource-ownership` can distinguish global stylesheets, component stylesheets, CSS modules, and Shadow DOM
styles without reading raw source. Authoring verification can also target those rows directly with the `style-resource`
expected effect when a plan needs a fact-level style asset check. Component roles are derived joins over app roots,
route config/component-agent facts, runtime controller creation, built-in template-controller flow, listener target
operations, native form value flows, and captured-attribute forwarding; they are query evidence for authoring
negotiation, not a separate naming heuristic. Conventional state, service, and model support files are surfaced as source roles
so app-building plans can verify the shape they asked for without treating those files as Aurelia resources. Only
class-bearing support files become `services` rows; a folder named `state` is not by itself a DI-owned state class.
`injections` rows preserve the consuming source/class, exact resolve-call span, key declaration when it belongs to the
opened project, and authored import identity when the key comes from a framework/plugin package such as
`@aurelia/state` or `@aurelia/i18n`. They also expose execution context and active-container expectation so module/static
`resolve(...)` can be diagnosed separately from instance activation and caller-dependent lookups; nullish key-argument
facts are preserved so the DI lane can distinguish `AUR0014` from `AUR0016`. `stateCompositions` rows are narrower: they report public state-class properties
whose TypeChecker value is a project-local class instance, such as a root state object owning smaller composed state
objects. Plugin-backed state, such as `@aurelia/state`/`IStore`, should appear as a separate authoring taste signal
rather than being folded into custom state-class topology. Keep the projection verification-oriented: if a future
authoring plan cannot be checked by this projection or another narrow semantic answer, improve the substrate before
adding source-generation convenience.

`StateStores` is the first plugin-state query. It projects `StateDefaultConfiguration.init(...)` and `.withStore(...)`
builder calls into store-configuration rows before the framework's creating `AppTask` constructs a runtime `Store`,
registers it with `IStoreRegistry`, and aliases the default store to `IStore`. This keeps plugin-backed state visible
as its own product surface instead of pretending an app has a custom DI-owned state class. Rows expose default/named
store shape, initial-state value kind, options-versus-action-handler form, action-handler count, and optional handles
for exact follow-up. `StateIssues` carries the framework-runtime raw Error lane for the same substrate: `.withStore('default', ...)`
is rejected at the builder boundary, and duplicate store names are reported at the store-registry registration phase.
Those rows use `frameworkRawErrorAuthority` instead of synthetic AUR codes because `@aurelia/state` throws raw
`Error` instances at those sites.

`I18nTranslationKeys` projects static translation resources admitted through `I18nConfiguration` init resources. Rows
carry project key, locale, namespace, key, source kind, source address, and optional handles. The app summary count uses
the same materialized products, and authoring verification consumes the rows through `i18n-translation-key` expected
effects so generated plugin-registration recipes can prove their translation catalog without source snapshots. Dynamic
backend loaders and runtime language switching remain outside this query until semantic-runtime admits framework-owned
products for those lifetimes.

`I18nTranslationBindings` projects rendered i18n `TranslationBinding` target groups after template rendering joins
`t`/`t.bind` keys and `t-params.bind` parameters on the same target element. Rows carry binding counts, key/parameter
counts, rendered element tag name, static or dynamic key shape, static key-expression data, normalized target
properties/kinds from Aurelia's `[title]key;key` i18n syntax, parameter presence, lifecycle issue count, framework
error codes, source address, and optional handles. Plain `t="key"` rows default to `textContent` (or `src` for `img`)
the same way the framework's `TranslationBinding` does. This row family is the positive counterpart to the shared
template diagnostic lane for `AUR4000`/`AUR4001`/`AUR4002`, and authoring verification consumes it through
`i18n-translation-binding` expected effects.

`ValidationIssues` exposes the first validation package source-diagnostic lane. It is deliberately separate from
validation-html binding behavior diagnostics: validation-html owns template `& validate` bind-time behavior, while this
query owns source-authored `@aurelia/validation` rule construction and model-rule hydration. The current exact rows
cover `AUR4101`, `AUR4102`, `AUR4105`, `AUR4106`, and `AUR4108` only when the framework branch is statically closed;
serialized validation payloads and live custom-rule execution remain unclaimed until semantic-runtime admits those
product surfaces.

When `createSemanticRuntime` is opened without explicit projects, boot discovers the union of package, tsconfig,
jsconfig, and native Aurelia configuration marker roots for monorepo-shaped workspaces. Hosts with additional workspace
topology knowledge can supply `projectRootHints`; semantic-runtime merges those boundaries into the same discovery and
configuration authority. Default `openApp()` chooses an `aurelia-app` project from import/receiver-grounded bootstrap
signals without constructing and
emitting rejected candidates into the shared kernel store; callers with a known app package should still pass
`projectKey` explicitly. If no app-shaped project exists, `openApp()` now fails closed instead of treating an arbitrary
app-source or resource-library project as a runtime app; authoring/LSP callers should pass `projectKey` or a
`sourceFilePath` so the intended resource-library/project frame is selected explicitly.
`SemanticRuntimeSummary.projects` exposes both `shapeKind` and `analysisKind`. The shape records what was discovered
from package/source signals; the analysis kind is the current app-opening policy: app worlds, resource-library authoring
worlds, Aurelia package inspection, or outside-Aurelia. Pressure scripts use that policy by default so monorepo utility
packages are still visible in summary counts but are not opened as fake app worlds unless a caller explicitly filters
for their shape.
Repeated authoring queries may open the same runtime with different cursor or file loci. Source-file admission is
idempotent for the same project/path handles, and the direct cursor/file APIs first reuse an already-opened app whose
compiled template owns the requested source file. This keeps app-context queries from forking duplicate kernel records
when a caller alternates between app-scope and LSP-scope answers.
Cursor/file APIs accept absolute host paths, app-project-relative paths, and workspace-relative paths at the boundary;
once a source file is admitted, source-address paths are the workspace-relative authority.
Each opened app-world emission carries a compact phase profile for diagnostic lanes. The public queries still expose
semantic products rather than profiler rows, but pressure scripts can attribute `openApp` cost to static evaluation,
TypeChecker project construction, resource recognition, app-world composition, and template compilation without
persisting project names or source paths.
The app pressure script also separates projects with app roots from resource-only/library packages. In monorepos, a
library package can carry many Aurelia resources and even open seams without being an app entrypoint; keep that
distinction visible before treating every seam as an app-startup failure. The script reports opened app-world emissions
instead of "apps" because the same `openApp()` substrate is used for real app projects and standalone library authoring
worlds.
`SemanticRuntimeSummary` also owns `displayText` for workspace-level orientation. It names shape/analysis counts,
default app selection, app candidates, project-row paging, and the next app-opening tool so MCP or LSP shells do not
need workspace-selection prose.
When the selected shape is `aurelia-resource-library`, the script asks for a bounded set of admitted template source
files through the authoring-template lane. That keeps resource-library pressure close to editor/LSP usage: app-runtime
template counts remain honest, while standalone component templates still exercise diagnostics, value channels, and
open seams.
Cursor/LSP pressure has the same project-shape scoping via
`SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_SHAPES`, so app-only cursor sampling and standalone resource-library cursor
sampling can be compared without changing the underlying API. Use exact `SemanticProjectShapeKind` values in both
shape env vars: `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, and `non-aurelia`.

`UnresolvedModules` expands the summary's `unresolvedModuleEdges` count into module-key, module-specifier, and source
rows. Use it for project/source-root footing pressure before treating a missing import as an evaluator or Aurelia
semantic gap.

`OpenSeams` is app-emission scoped, not a raw dump of the shared workspace kernel store. In a monorepo runtime session,
opening another project should not make seam rows bleed into the first app answer. The projection includes source-
addressed seams owned by the app's admitted/evaluated sources plus emission-local DI, template, runtime rendering,
observer, value-channel, and data-flow seams that may not have a precise authored address yet.
`OpenSeamSites` is the default public trust surface for these rows. It keeps raw seam rows available for detail but
groups them by exact root source path/span, then reports every seam kind, `rawRowCount`, `variantCount`, boundary kinds,
pressure kinds, reason kinds, materialization/product impact, and the best source range that can be calculated at query time. This grouping is
answer-local and does not add durable kernel records; it exists because kernel records intentionally preserve
derivation-level detail while MCP/IDE first reads need authored-site counts.
`OpenSeamSummary` remains the family-cluster view, but its samples should be just as actionable as site rows: keep
`sampleSources` for source-reference identity and use `sampleSourceSites` when text or UI needs authored
`path:line:column` locations. Summary rows also carry `uniqueSiteCount`, so cluster displays can distinguish raw
derivation amplification from the number of authored sites that need inspection.
Raw rows expose human `summary` text, typed `reasonKinds`, and optional `reasonSources` for reason-level source/evidence
when one coherent seam has adjacent contributing source sites. Pressure scripts should aggregate the typed reason kinds
when present, reserving summary text for human inspection and raw-detail debugging. For example, a router resource whose
instruction value depends on host environment state remains a router open seam, but carries both
`router-instruction-needs-static-value` and `host-environment-value` as stable machine-readable pressure.
When the same router seam is blocked by a binding expression, router materialization should preserve its own
`router-instruction-needs-static-value` reason and attach the lower-level binding-source reason, such as a runtime scope
slot without a static value carrier. This keeps ownership honest: router owns the product seam; observation owns the
source-value explanation.
Open-seam pressure is causal rather than cloned prose. `evidence-only` means a seam is queryable at its authored root but
does not block a published product; `product-pressure` means a `MaterializationOpenSeamRelation` links the same root seam
to one or more materialization owners and affected products. Public raw rows preserve structured owner/product impacts,
site rows conserve their aggregate cardinality, and cluster rows group only by typed seam kind plus reason signature.
Never infer causality from source containment or manufacture a downstream seam with rewritten summary text.
Transforming consumers spend that relation locally. Evidence-only seams and pressure on unrelated products do not block
an operation. Pressure whose `impactKey` matches the exact requested materialization selects a semantics-preserving
runtime fallback when the product contract provides one and blocks only that transformation when it does not. There is
no global seam severity from which IDE, MCP, or future AOT consumers may infer whole-app failure.
Boundary kinds are derived only from typed reason facts. `cause-unresolved` means the producer proved that the result is
open but did not prove one narrower causal family; do not replace it with a more specific boundary inferred from prose or
code location. Split the producer reason when stronger evidence exists. Source identity, authored-site grouping, and
source-file counts include workspace and file-role identity in addition to path/span so equal-looking monorepo paths do
not collapse across projects.
Dynamic `href` router-resource seams can also carry `router-href-externality-open`. That reason means the framework
would decide at runtime whether the value is an external URL before creating viewport instructions; semantic-runtime has
not proven either the external lane or a static internal route string. Click-interception facts are separate:
`router-href-click-interception-disabled` is for proven disabled gates such as `useHref=false`, non-anchor hosts, or a
co-located `load` custom attribute, while `router-href-click-interception-target-open` is for anchor `target` values
that must be compared with the runtime window name. In both cases, `HrefCustomAttribute.valueChanged(...)` still needs
the runtime value to decide whether to write the raw URL or generate an internal router URL. Dynamic href seams keep the
href value as the primary seam source, while `reasonSources` can point the target-open reason at the authored `target`
attribute. Public reason-source rows should carry `sourceRange` when the reason source resolves to authored text, so
repair, hover, and MCP drill-down consumers do not have to retranslate byte offsets or conflate the reason site with the
primary seam site.
Authoring orientation lifts that into runtime boundary and intent rows on repair clusters. The important distinction is
whether the boundary is router href classification, static route instruction closure, or binding-source runtime value,
and whether the next operation needs href ownership intent, an explicit external-href declaration, a static navigation
target, or a stronger binding source. When the seam has source provenance, that cluster should carry a
`runtime-boundary:source` action target so future repair planning starts from the authored value span instead of a
source-less app-level bucket.
Observation-owned seams can also carry typed reasons. For example, `SelectValueObserver` channels distinguish unclosed
option values, empty option domains, missing authored select targets, dynamic `multiple.bind` whose source cannot carry
both runtime branches, and multi-select source-shape pressure; any data-flow row blocked by that channel preserves the
same reason instead of flattening the pressure into an untyped binding seam. Public template diagnostics project the
static multi-select source-shape case as a framework-runtime-behavior warning, not as a framework error: if the source
type permits non-array values such as `T[] | null`, Aurelia may no-op the writeback until the runtime value is already
an array. The repair target should be the source member/type, with guidance to initialize the selected-value collection
as an array or split nullable loading state away from the bound collection.

`EvaluationIssues` exposes product-owned diagnostics from the static evaluation layer and framework-shaped evaluator
handoffs. `ModuleLoader` transform-input validation reports `aliasedResourcesRegistry(...)` and
`IModuleLoader.load(...)` inputs that statically close to invalid direct values as
`invalid_module_transform_input` / `AUR0021` with the rejected evaluator value kind and exact input-expression source.
The framework API issue pass also reports source-local framework utility guards such as EventAggregator falsy
channel/type inputs, `firstDefined(...)` with no defined argument, and `Metadata.define(...)` with no metadata key. Raw
framework utility guards use `frameworkRawErrorAuthority` instead of synthetic AUR codes. `AppDiagnostics` reports these
rows under the `evaluation` domain and links back to `evaluation-issues`.

`ResourceInventory` is the product-facing resource-discovery answer for one explicitly selected app project. It folds
project definitions, configured framework catalogs, compiler-visible resources, and compiler-local
`<template as-custom-element>` definitions into one deterministic five-kind inventory: custom elements, custom
attributes, template controllers, value converters, and binding behaviors. Binding commands and attribute patterns
remain compiler-syntax products and are counted as excluded syntax rather than masquerading as runtime resources.

Inventory `identityKey` values are opaque semantic projections, never kernel handles. Framework resources derive
identity and package origin from their modeled catalog. TypeScript-authored resources use retained module/export/local
declaration identity plus registration kind, so ordinary edits that move a declaration do not replace its product identity.
Compiler-local templates use their template-family owner, taxonomy kind, public name, and same-owner duplicate ordinal.
Only a row with no semantic declaration owner falls back to an exact source locus. Aliases and bindables receive child
identities under the owning resource. The promise is stability across app generations while the semantic owner is unchanged,
not persistence across arbitrary declaration moves or ambiguous duplicate reordering. `origin` reports project,
framework/package, external, or unknown ownership without guessing package names from paths.

Inventory source roles remain distinct: `sources.publicName` is the exact authored public-name token,
`sources.declaration` is the full declaration/carrier, and `sources.implementation` is the exact implementation target.
Navigation should prefer the public-name source, then the implementation source when conventions leave no authored
public-name token. Pathless framework/catalog rows remain visible and explicitly non-navigable. Declaration provenance
does not absorb admission provenance: a framework row can retain an external catalog declaration while a template
availability row points at the authored registration that admitted it.

Inventory bindable identity, mode, setter/nullability policy, and source roles are part of the compact default answer.
Checker-backed value-type surfaces are enrichment: pass `includeTypeSurfaces: true` when a consumer needs them and
inspect `typeSurfacesIncluded` to distinguish an intentionally compact answer from unavailable type facts. Compact rows
preserve the type-surface fields as `null`, so adapters do not need a second DTO. Resource evidence is converged before
projection and each final definition is projected once; repeated configured/compiler/visibility occurrences must not
multiply checker work or select a different definition by visitation order. `TemplateResourceAvailability` follows the
same selector contract while retaining its cursor-selected scope semantics.

`TemplateResourceAvailability` is the cursor-scoped companion. It selects the narrowest compiled template occurrence
and returns exactly that compiler world's effective runtime-resource scope. Equally specific occurrences from different
app roots return `selection: ambiguous` with candidate template/scope identities and no unioned rows. A caller must
choose a project before opening the app and must choose a candidate scope before treating availability as exact. Pass
the chosen `scopeIdentityKey` back as `templateResourceScopeIdentityKey`; a stale or unrelated key returns
`selection: absent` with the current candidates rather than selecting another scope.

`ResourceDefinitions` exposes converged Aurelia resource definitions recognized from explicit decorators, runtime
definition objects, static fields, metadata, and project conventions before app-world/compiler visibility is known.
This is the right query for plugin-library and monorepo package pressure where a package can define resources without
booting an app root. Rows include resource kind, declaration modes, name/key/aliases, target name/source, bindables,
dependencies, template shape, watch metadata, attribute-pattern entries, custom-element/custom-attribute flags, and
optional kernel handles. Declaration modes preserve the convergence carrier mechanism, so public analysis and future
generation policy can distinguish decorator, static, definition-object/factory, and current convention resource styles
without re-reading source. Its bindable type surface is part of that full definition contract rather than an optional
selector, so the query is always classified as `query-type-projection`; callers wanting the compact app-facing catalog
should use `ResourceInventory` instead.
Resource source loci are intentionally not interchangeable: `source` is the metadata carrier that produced the
definition, `targetSource` is the exact target token used for navigation and edits, and `targetDeclarationSource` is
the full class or variable declaration used by hierarchy/outline consumers. Imported define-call targets retain the
target module's source ownership for both target loci; consumers must not re-anchor target offsets to the module that
contains the resource definition call.
Public `resourceKind` fields are author-facing taxonomy; consumers that need framework registration-key joins should
derive registration identity with `registrationResourceKindFor(...)`.
Watch rows expose the metadata shape that resource convergence can statically close: expression kind/property key,
callback kind/property key, flush mode, and source references for the expression/callback carriers when known.
`ResourceIssues` exposes known framework failures in that same resource metadata lane. It is for closed static errors,
not open seams: if Aurelia would throw for malformed bindable metadata, a malformed `@processContent(...)` hook, a
malformed `@watch(...)`, or a static/definition-object watcher, resource convergence should publish a resource issue
with exact framework code authority; if the metadata is runtime-dependent, the convergence path should keep a typed open
seam instead. It also owns runtime-html duplicate resource-definition registration warnings (`AUR0153`-`AUR0156`) when
DI registration spending can prove the duplicate named resource slot, plus direct runtime-html resource API failures
(`AUR0151`, `AUR0152`, `AUR0759`, `AUR0760`, `AUR0761`) when TypeChecker-resolved call sites and recognized resource
definitions prove the same framework path.
`ResourceVisibility` stays lower-level: it enumerates every compiler world's raw visibility rows after configuration,
DI, and resource-scope composition have materialized. Handle detail includes the retained resource identity for exact
in-process joins, but handles are store-local and must never become presentation identity. Product consumers that need
one template's effective resources should use `TemplateResourceAvailability` rather than joining or unioning these rows.

`ConfigurationIssues` exposes known framework failures discovered while reading source-backed configuration products.
It currently includes direct runtime `Scope` API nullish-argument failures (`null_scope` / `AUR0203` and
`create_scope_with_null_context` / `AUR0204`), `NodeObserverLocator` duplicate mapping failures
(`node_observer_mapping_existed` / `AUR0653`), and `AttrMapper` duplicate mapping failures
(`compiler_attr_mapper_duplicate_mapping` / `AUR0719`). `DiIssues` exposes source-backed
DI world-construction issues. It currently includes duplicate source/static `$au` resource keys
(`resource_already_exists` / `AUR0007`) as warning rows with container/resource handles when requested, ambient
`resolve(...)` context/key failures
(`no_active_container_for_resolve` / `AUR0016`, `null_undefined_key` / `AUR0014`), and invalid `@inject`-family
decorator targets (`invalid_inject_decorator_usage` / `AUR0022`). Observation issues expose source-backed runtime
observation diagnostics such as invalid `@astTrack` non-method targets (`ast_track_decorator_not_a_method` / `AUR0117`)
and invalid `@observable` decorator contexts (`invalid_observable_decorator_usage` / `AUR0224`) that are not resource
metadata. `AppDiagnostics` aggregates configuration, DI, observation,
evaluation, template, resource, router, and route-recognizer diagnostics by reading each owning diagnostic row set first, then applying the
app-level page; do not page one diagnostic domain before aggregation or app-level counts will drift.

`RouterOptions` exposes effective option products materialized from concrete `RouterConfiguration` DI registration
uses. Each row is owned by one `AppRoot` and reports the root/component, receiving container, exact registration use,
configuration-value definition source, and framework-defaulted booleans and strings used by static topology,
especially `useHref`, `useUrlFragmentHash`, and `useEagerLoading`. An unregistered customized value produces no row;
one value reused by several roots produces one row per registration use. These rows are the authoring/API view of
root-owned router option convergence; they are not a navigation runtime state snapshot.

`Routes` is a source-backed authoring view built as a contribution/effective join. It emits one row per authored
`@route(...)`, `Route.configure(...)`, static metadata, or child-route contribution; `originKind`, `valueKind`, execution
state, effect kind, and source describe that contribution, while stage, closure, normalized fields, field states, and
open fields come from its associated definition or per-use applied `RouteConfig`. `effectiveUseCount`,
`effectiveVariantCount`, and `effectiveFieldsStable` disclose when one authored contribution participates in several
effective uses instead of duplicating the authoring row or selecting a use silently. Rows also retain routeable component
and fallback resolution plus optional handles. `idSource` identifies the exact authored id token, or the path token from
which Aurelia derived the id; `pathSources` retains one exact token per normalized path. These addresses are distinct
from the broad contribution carrier and are the declaration loci used by route completions and navigation. Dynamic
`import(...)` route components stay in the promise routeable lane even when their fulfilled custom-element definition
is already known.

`RoutePatterns` is the next lower route-recognizer layer. It parses closed route-config paths into
`ConfigurableRoute`-shaped rows with `Parameter`, `StaticSegment`, `DynamicSegment`, and `StarSegment` facts,
case-sensitivity, route-config-context ownership, recognizer handles, optional parent path, recognizer path, and exact
path-source handles when available. In eager-loading mode, child contexts reuse the root recognizer and publish
parent-prefixed recognizer paths while keeping the local authored route path separate.
Rows also expose `parameterNames`, `requiredParameterNames`, `optionalParameterNames`, and `starParameterNames` so
authoring verification can assert the static parameter contract without reparsing route strings.
`RouteEndpoints` exposes the next `RouteRecognizer.add(..., true)` product: primary endpoints plus the framework's
residual catch-all endpoints for routes that do not already end in a star parameter. Endpoint rows carry the same
parameter-name groups as the owning configurable route, including the residual `$$residue` star parameter on residual
endpoints.
`RouteRecognizerStates` exposes those state graph nodes directly: state kind, value, segment name/pattern presence,
forward `nextStates` cardinality, previous state label, endpoint closure, dynamic/optional/constrained flags, source, and
optional handles. This is the route-recognizer x-ray layer needed before candidate matching can be trusted without
guessing from route config rows.
`RouteRecognizerIssues` exposes source-backed route-recognizer conditions where Aurelia would throw while registering
the graph, currently duplicate path registration and ambiguous endpoint assignment. These rows are not open seams: they
are known framework failure semantics carried as product facts so diagnostics can cite the recognizer, endpoint/state
references, message, source, optional `frameworkRawErrorAuthority`, and optional handles while the rest of the static
app graph remains inspectable. Raw authority keys are used only for exact public framework raw Error sites; mapped
router `Events` still flow through `frameworkErrorCode`.
`RouterIssues` exposes source-backed router runtime conditions outside the lower-level recognizer graph. Route config
validation publishes `invalid-route-config-property` / `AUR3554` and `invalid-route-config` / `AUR3555` rows before
downstream router materializers consume normalized route facts; rows carry the framework property path, expected
surface, actual closed value, route-config reference, source, and optional handles. RouteTree redirect-parameter
migration publishes `redirect-unexpected-expression-kind` with exact router `exprUnexpectedKind` / `AUR3502` authority
when redirect `path` or `redirectTo` RouteExpression trees contain grouped or sibling expressions.
RouteConfigContext eager path generation publishes `eager-path-generation-failed` with exact
`rcEagerPathGenerationFailed` / `AUR3166` authority when object navigation instructions close to a routeable component
whose endpoint path cannot be generated from the provided params. Rows preserve route-config and recognized-route
references when available, the component/path/redirect fields relevant to the owning router algorithm, source, and
optional handles.
Definitely executed duplicate `RouterConfiguration` registrations in one modeled app root publish
`duplicate-router-configuration` with `rcHasRootContext` / `AUR3168` authority. The second registration is primary, the
first is related, and no arbitrary RouterOptions/topology winner is produced. App diagnostic presentation keeps the
same-source duplicate built-in resource rows as contextual runtime consequences so the IDE reports one causal error
without deleting raw resource evidence.
Router issues may also carry related information when one source fact has several concrete router contexts. The
`shared-base-route-context-parameter-read` warning is a `semantic-authoring-policy` row rather than a framework error:
it points at the inherited base call and relates every routed descendant without selecting one owner or merging their
route parameter domains.
Template diagnostics also project router issue rows whose authored source belongs to the selected template. Those rows
use `router-framework-error` so file-level and cursor-locus APIs can surface `load`/`href` expression parser,
instruction creation, recognition, viewport-resolution, and eager path-generation failures without moving issue
ownership out of the router domain. `AppDiagnostics` still reads the owning router issue lane and filters those
template-projected copies to avoid double-counting. The shared router diagnostic policy attaches `missingInput` and
`fix-router-instruction` repair intent to the owning `RouterIssues` row only when its source proves a template-authored
instruction failure; `AppDiagnostics` preserves that repair facet. TypeScript route-config, redirect, and recognizer
issues do not acquire template-expression guidance merely because they share the router issue product. Cursor-info uses
the same projection path and should prefer the exact expression/value span from parser or HTML value provenance over
the broader attribute carrier when a router issue originates in a template value.
`RecognizedRoutes` exposes the next layer for closed static router-resource instruction paths. Rows carry the recognized
path, residue presence, fulfilled parameter count, parameter-name groups, decoded parameter values, recognizer
reference, causing `ViewportInstruction` / `ViewportInstructionTree`, route-context closure, redirect depth,
redirect source route config, endpoint
path/residual closure, source, and optional handles. The
recognizer walk mirrors Aurelia's `RouteRecognizer.recognize(...)` candidate chain, including the handler-based endpoint
grouping that keeps multi-path and residual endpoints attached to the same route config. Closed static redirects publish
additional recognized-route rows for their re-recognized target paths with `redirectDepth > 0` and
`redirectSourceRouteConfig` pointing at the redirect route config that produced the target. These rows are still
pre-transition facts: the original `ViewportInstruction` rows remain the instruction-tree creation products, while
recognized-route rows are the handoff into route-tree compilation. Residual parent-route matches can also produce
recursive child recognized-route rows when the residual `ViewportInstruction` segment closes against the routed
component's child `RouteConfigContext`; the child row carries the routed child context, while the parent row preserves
the residual parameter value that the framework keeps as the parent route-node residue handoff.

Resolved routeable components also seed template compilation. Routeable rows preserve authored `name` separately from
the resolved custom-element `resolvedName`; route-context paths, viewport `usedBy` matching, and planned route nodes
spend the resolved name while source navigation retains the authored carrier. An unresolved routeable keeps
`resolvedName: null` and cannot cross into a planned node by borrowing its authored label. That recursive rendering bridge lets routed component
templates and nested `au-viewport` / `ViewportAgent` topology show up before a future route-tree/navigation emulator
exists. App roots seed the route-context topology when they are known; resource-only package analysis can still fall
back to graph roots. Treat this as static route/component topology, not as proof that viewport activation or guard
lifecycles ran.
The app summary also distinguishes configured-route contexts from potential route contexts: `routeConfigContexts` counts
the `RouteConfigContext`/recognizer topology, while `routeContexts` counts the static `RouteContext` products that join
those config contexts to parent/root context, modeled child containers, and hosting viewport-agent candidates.
`routerViewports` and `viewportAgents` are potential products owned by those contexts, not by the config-context layer.
Rows carry `realizationStage: potential`; no current public row claims live router state. The
`RouteContexts`, `RouteContextParameterReads`, `RouterViewports`, and `ViewportAgents` queries expand those counts into
compact rows with labels, source references, container/host-controller closure, and optional handles. Viewport rows
also expose `single`/`optional`/`many`/`open` presence, per-field closure, and exact `name`/`usedBy`/`default`/`fallback`
sources. Open bound values remain null plus structured field state and open seams; they are never rewritten as absent
framework defaults.
`RouteContextParameterReads` specifically reports source-backed `RouteContext.getRouteParameters(...)` calls, the
declared parameter keys on the TypeScript call, the route-config paths for the owning routed component, the recognized
path parameter names, and whether declared non-path keys are only query/open parameters. Ownership joins through the
module-local custom-element target identity carried by effective route configs; `componentClassName` is display data,
not a semantic key. Inherited calls publish one row per known routed descendant instead of unioning their parameter
domains; `ownershipKind` distinguishes direct, inherited, and unmatched rows, while `knownOwnerCount` preserves the
one-to-many cardinality. Multiple inherited owners also produce a policy-owned RouterIssue at the base call with exact
related route sources; one inherited owner does not produce that warning.
`RouteTrees` and `RouteNodes` expose the route-tree layers that are currently closed. Synthetic root tree/node rows use
`realizationStage: potential`; context-relative transition rows use `realizationStage: planned` and are compiled from closed static
`ViewportInstructionTree` products when their recognized routes point at non-redirect route configs. Rows carry
instruction-tree closure, root context/config/component labels, node counts, effective options closure, query/fragment
shape, instruction/original-instruction references, recognized-route references, decoded params, child-first and
parent-first parameter aggregates over the materialized route-node parent chain, query/fragment facts, viewport/residue
shape, path/final-path, child counts, source references, and optional handles. Query-param rows preserve repeated keys,
and the combined parameter/query aggregates expose the flat child-first and parent-first
`IRouteContext.getRouteParameters({ includeQueryParams: true })` shape, including array-valued query entries when a
single query key appears multiple times. Append and by-route rows expose the remaining static merge strategies for both
path-only parameters and include-query parameters; include-query append/by-route rows intentionally include repeated
query values across route contexts because Aurelia copies the active instruction-tree query params onto every active
route node before aggregation. Treat these rows as pre-activation
route-tree compilation facts; the runtime still does not claim to have run guards, scheduled viewport updates,
activated component agents, or exhausted every redirect edge case. Planned route nodes retain a
`viewportAgentCandidate` and `viewportCandidateResolution: sole`; the candidate has not passed the framework's live
availability gate. Multiple or runtime-dependent candidates produce open seams and no partial plan. Redirect routes that reach transition
compilation without a modeled redirect target still surface an explicit router open-seam reason instead of silently
disappearing from the transition tree. Closed static redirect targets are consumed through their
`redirectSourceRouteConfig` edge, and framework-rejected redirect targets or expression shapes surface as
`RouterIssues` / `AppDiagnostics` instead of generic open seams.
`TypedNavigationInstructions`, `ViewportInstructions`, and `ViewportInstructionTrees` expose the handoff products that
router resources create before route-recognizer matching and route-node transition compilation. Rows keep the
RouteExpression-backed typed instruction kind/value lane, viewport wrapper shape, child cardinality, parameter count,
grouping open/close markers, route-context closure, absolute/query/fragment flags, and optional handles visible without
claiming that navigation or viewport activation has run. Static string values and interpolation/template strings with a
static route prefix can both materialize this layer; dynamic holes become opaque segment/query values so the recognizer
can still reason about route shape. Getter/field-backed string values may also close through binding-source value
evaluation. Fully dynamic or host-dependent values remain open with the lower-level binding/evaluator reason preserved
as typed open-seam reason kinds. Object-form router resource values first run through the eager path-generation
substrate; successful generation re-enters this RouteExpression-backed lane, while framework-shaped failures surface in
`RouterIssues` and `AppDiagnostics`.

`ComponentAgents` exposes the first planned `RouteContext._createComponentAgent(...)` handoff for recognized transition
nodes. Rows connect the route context, route node, sole viewport-agent candidate, resolved routeable component, and routed
controller product. The candidate is not called selected because live availability and scheduling have not run. The
corresponding `RuntimeControllers` rows use the `routed-custom-element` creation kind and
`created` readiness: the controller and child container exist as framework-shaped pre-activation facts, but guards,
viewport scheduling, and component activation are still outside the current runtime claim.

Summary and template-compilation rows now distinguish configuration DI containers from renderer-created runtime child
containers. `appTasks` counts both source-observed AppTask products and framework-owned AppTasks surfaced while spending
known framework registrations. Use `runtimeChildContainers` and `runtimeChildContextResolverSlots` as the compact
pressure signal for whether component/template-controller rendering has closed enough container shape for deeper DI
answers.
`runtimeBindingDataFlowSourceTypeGaps` is the compact count of closed binding data-flow rows whose source expression
could not be typed through the current TypeChecker-backed scope. These are strictness/type-projection pressures, not
runtime binding open seams. Spread value bindings use the same lane when the spread object type does not expose one of
the target component's bindable keys: runtime can still read `undefined`, while the TypeChecker gap remains visible on
the row.
Reverse-write strictness is similarly product-owned. Binding data-flow rows expose both the human
`sourceAssignmentReason` and typed `sourceAssignmentReasonKinds`, so pressure scripts and future policy layers can
aggregate readonly members, owner-member projection gaps, TypeChecker target-to-source mismatches, and runtime
unassignable expression shapes without parsing prose. The compact summary uses
`runtimeBindingDataFlowSourceAssignmentPressures` rather than "gaps" because runtime assignability and TypeScript
strictness are separate axes: a two-way binding can be honest Aurelia runtime flow while still carrying policy pressure
for diagnostics or authoring guidance. Pressure output prints assignment-kind/reason-kind cross-products so runtime
unassignable rows stay distinct from runtime-assignable-with-strictness rows.
Framework `astAssign` only throws exact runtime codes for reserved `$host` assignment (`AUR0106`), strict nullish
member/keyed assignment (`AUR0116`), and destructuring source failures (`AUR0112`); non-assignable expression kinds
such as calls or tagged templates are framework-runtime no-ops and should stay code-less diagnostics unless a future
framework usage path changes that authority.
Open binding data-flow seams carry typed `OpenSeamReasonKind` values for source-expression pressure as well as
value-channel pressure. Missing value converters, binding behaviors, state stores, duplicate binding behaviors, and
open converter call surfaces group as `binding-source-resource-open`; unresolved checker/type surfaces group as
`binding-source-type-open`; unsupported expression forms, missing slots, and missing members use the existing
binding-source expression/slot/member reason families. Public adapters should use these reason kinds for repair routing
instead of parsing the prose `summary`.
It also prints generalized reason-by-source-type, reason-by-assignment-target-type, reason-by-target-type, and
reason-by-writeability cross-tabs. Use those before opening raw app rows: they reveal whether a pressure class is a
real unsupported assignment, a readonly TypeChecker surface, an `unknown`/`any` target value channel, or a
value-converter/repeat local that lost element specificity. For member writes whose full expression type is open,
`sourceAssignmentTargetType` can still carry the owner type that diagnostic suggestions should navigate to.
Public binding projections use the same combined template basis as diagnostics: app-runtime resources plus any
source-selected authoring resources opened for resource-library/package pressure. Keep those bases aligned; otherwise
diagnostic rows and binding data-flow rows count different template worlds in monorepo/resource-library pressure.

`RuntimeControllers` exposes controller frames created or reached during runtime `Rendering`, including the resource
definition, creating instruction, parent/child counts, binding count, scope presence, template-controller flow/cardinality
semantics, a compact controller readiness value, a compressed lifecycle timeline, and the recursive hydration handoff
that is currently modeled. Lifecycle timeline rows are consecutive-step aggregates over the framework-shaped events the
semantic runtime can currently see: controller creation, child-container setup, `Controller.addChild`,
`Controller.addBinding`, `IViewFactory` creation, synthetic-view creation, `Rendering.render`, Scope attachment, and
`Controller.bind`. Custom-element controllers report
`compiled-template` when the controller has a first-class `ControllerUsesCompiledTemplate` claim. Template-controller
controllers report `instruction-sequence` when their hydration instruction owns a nested child sequence and expose the
modeled `IViewFactory` association. The factory carries a generated embedded custom-element definition product, creates
an aggregate `synthetic-view` controller row for the `IViewFactory.create(...) -> Controller.$view(...) ->
_hydrateSynthetic() -> Rendering.render(...)` pass, and publishes both definition and instruction-sequence claims.
Aggregate rows are intentionally cardinality-aware rather than instance-precise: `repeat` still reports `many`, while
`if` and promise branches report their optional/single branch shape. Template-controller branch rows also expose
`templateControllerLinkKind` and `linkedTemplateControllerName` when Aurelia's `link(...)` hook connects them to a
controlling template controller, such as `else -> if` or `then/catch -> promise`.

`RuntimeCompositions` exposes dynamic `AuCompose` input consumption and settlement independently from component
candidate coverage and child materialization. Only component/template inputs are await-thenable; direct model/control
inputs preserve Promise values rather than being silently unwrapped. Closed component values may materialize one
composition-owned child controller/container, while complete TypeChecker candidate sets remain alternatives rather than
inventing one selected runtime child.

`TemplateContentProjections` exposes compiler provider sequences, runtime AuSlot selected/fallback/empty views, native
Shadow DOM slot outlets, declaring/receiving controllers, hydration contexts, AuSlotsInfo, closure, and exact source
loci. These rows project the shared runtime rendering and contextual-DI products; adapters must not reselect providers
or reconstruct projection ownership from tag/source containment.

`BindingTargetAccesses` exposes target-side accessor/observer lookup selected during `Controller.bind` for runtime
property bindings and interpolations: accessor versus observer lookup, target kind, target property, selected built-in
strategy, DOM events, target/property type displays, target type source, writability, observability, authority, source
address, and optional handles. This is the compact authoring pressure signal for form controls, class/style property access, and later
TS-backed source/target flow through ObserverLocator-shaped semantics. Standards-shaped attribute access such as
`xlink:href` or `xml:lang` reports `attribute-ns-accessor` when Aurelia's `NodeObserverLocator` routes through
`AttributeNSAccessor`; `data-*`, `aria-*`, and generated SVG-analyzer attributes outside that namespace table report the
`data-attribute-accessor` strategy. The same `data-attribute-accessor` lane covers accessor-time attr writes such as
`href.bind`; observer-forcing modes such as `href.two-way` follow `NodeObserverLocator.getObserver(...)` instead of that
accessor-only branch. Native node target types also distinguish exact DOM tag-map resolution from broad
`HTMLElement`/`SVGElement` fallback, so unknown custom-host or web-component tags remain visible without tag-name
heuristics. Target access rows can also carry exact framework error-code authority when the observer lookup
itself would throw. The current modeled case is runtime-html `node_observer_strategy_not_found` (`AUR0652`) when
`NodeObserverLocator.allowDirtyCheck` is disabled and an existing native node property has no configured observer
strategy; the row uses `diagnosticReason` for that closed framework rejection while `openReason` remains reserved for
unresolved observer-locator semantics. `TemplateDiagnostics` and `AppDiagnostics` surface the closed rejection as
`binding-target-access-framework-error` with a `configure-node-observer` suggestion that points at the observer-config
boundary, and the value-channel row reports `rejected-target-access` rather than opening data-flow again.
When node observer configuration participates, the row carries one nested config with observer kind/constructor,
events, readonly policy, primitive default, and independent field states. `absent`, `closed`, and `open` distinguish an
omitted field from a proved value and from a retained candidate that a later dynamic object write may replace. The
target-access authority also identifies renderer or binding-behavior overrides so clients do not infer precedence from
the selected strategy alone.

`TargetOperations` exposes direct target updates that do not ask `ObserverLocator`. Rows include an owner lane:
renderer-owned operations from `SetPropertyRenderer`, `SetAttributeRenderer`, `SetClassAttributeRenderer`, and
`SetStyleAttributeRenderer`, plus binding-owned operations from `AttributeBinding.updateTarget(...)` for `.class`,
`.style`, ordinary attribute writes, `ContentBinding.updateTarget(...)` for text content writes, and
`ListenerBinding.bind(...)` for event listener subscription. Rows report owner kind, binding/renderer kind, target
attribute, target property/token/key, static value when one exists, operation kind, affected names, authority, source
address, optional handles, and row-local open pressure. Listener subscription rows join their retained binding product
to expose trigger/capture strategy, modifier text, the exact event-name source, and any exact modifier source separately
from the enclosing binding. `BindingTargetOperations` remains as a compatibility entrypoint
for the same projection while callers migrate to the broader name.

`BindingSourceOperations` exposes source-side binding behavior that should not be squeezed into DOM target updates.
`RefBinding.updateSource(...)` publishes a `ref-assign-target` operation after resolving Aurelia's ref target lane:
`element` returns the authored node, `component`/named custom elements return a controller view-model, custom attribute
names return the custom attribute view-model, `controller` returns the controller product, and unsupported `view.ref`
stays open. These rows are consumed by value-channel and data-flow projections as `ref-target` target-to-source flow.

`BindingBehaviorApplications` exposes each authored runtime binding-behavior application in its `bind` and `unbind`
phases after the shared expression-resource plan and controller target facts have had their say. Rows retain the
behavior name, owning binding kind, exact arguments and sources, interpolation-hole `chainIndex`, authored and effective
runtime chain depths, bind and phase reachability/order, target kind/property, exact behavior-name source, nullable
resolved resource, and optional handles. The two depth fields stay distinct because reached behaviors such as i18n can
project additional runtime resource wrappers that have no authored depth. A null resource is the retained cause of
AUR0101; blocked rows remain structural facts while `phaseReachability` says whether framework execution reaches them.
Controller activation reachability is independent from that structural plan. When activation is open, known resource
identity, chain order, effective mode, and conditional lifecycle effects remain available with open reachability;
reached-only framework issues wait until execution is proved. Do not erase those facts merely because the owning
controller may not activate, and do not upgrade their conditional effects to reached execution.
`lifecycleEffects` reports phase-local closed or open behavior effects such as binding-mode replacement/restoration,
target-observer or subscriber installation, signal listeners, debounce/throttle state, listener self filtering,
validation/state connections, and expression projection. Exact signal arguments and rate-limit values keep their own
sources and framework defaults. It does not duplicate ordinary source observation: connectable source reads and target
subscriptions remain owned by binding data-flow and target-access products.

`ValueConverterApplications` mirrors that execution lane for both authored `| converter` expressions and converters
inserted by structurally admitted binding behaviors. Rows distinguish `bind`, `to-view`, `from-view`, and `unbind`, retain application
origin plus authored/runtime depths, and use the same bind/phase reachability vocabulary as behaviors. `to-view` phase
order runs inner-to-outer; `from-view` runs outer-to-inner. Phase order records the static order of a bind-reachable,
resolved application, not a promise that an app converter cannot throw before a later step. Bind and unbind lifecycle
effects retain value-converter signal subscriptions: built-ins spend auLink-backed exact signal constants, while
app-owned converter instances use the shared static source-value evaluator and preserve the `signals` property source,
each known array-element source, and honest open-array pressure. Conversion rows do not duplicate those lifecycle
effects. A null resource preserves the attempted application whose issue product owns bind-phase AUR0103. Use this query
when IDE/LSP, MCP, or future build/AOT consumers need execution facts rather than token-coloring or diagnostic inference.
Ref bindings legitimately publish both conversion phases: bind and cleanup assign the resolved ref target through
`astAssign`/`fromView`, while unbind evaluates the wrapped source through `toView` before deciding whether to clear it.
Treating every non-property binding as to-view-only loses real ref writeback and breaks stage/application provenance.

`BindingValueChannels` exposes the observer/accessor or direct-operation value shape that runtime data flow should use
instead of blindly treating the raw DOM property as the transported value. Use `BindingValueChannelSummary` first when
an MCP/LSP caller needs a low-token explanation of which value-channel and observer-coupling mechanisms are present
before drilling into exact authored rows. The summary groups by channel kind, target kind/property, and
realization plus `observerCouplings`, and also returns coupling-count rows so form/control answers can say, for example,
that the app is using select option-list mutation observation, select array mutation, checked collection mutation, or
custom matcher comparison without listing every binding. Summary set fields are capped and paired with `*Count` fields where large apps
can have more definitions, target properties, or value types than the compact first read should print; `page.size: 0`
returns only the non-paged coupling rollup. Detailed rows also carry `usesCustomMatcher` so checked/select channels can
report that Aurelia runtime comparison is delegated to an app-provided matcher even though the matcher function body
remains outside static execution. The `observerCouplings` array exposes the framework mechanisms that made the channel
meaningful, such as select option domains, select option-list mutation observation, select array observation/mutation,
checked element `model`/`value` observation, checked collection observation, checked collection/map mutation, and custom
matcher comparison. Boolean checkbox rows intentionally omit custom matcher coupling because Aurelia ignores matcher
comparison for plain checked-state writes. Static single-select options now surface a literal value domain such as
`'ship' | 'pickup'`, and expression-backed `model.bind`/`value.bind` can supply option, radio, and checkbox element
values through the lowered sibling binding products. `checked.bind` surfaces boolean, radio-value, checkbox
array/set-membership, and checkbox map keyed-boolean branches. Static multi-selects expose selected option element
domains for array sources. Dynamic `multiple.bind` surfaces as `select-dynamic-option-value` when the source type can
accept both
single-select scalar updates and multi-select array updates; otherwise it remains channel pressure. Non-literal dynamic
element values should stay visible as channel pressure until their observer semantics are closed. Select-channel open
rows carry typed reason kinds such as
`binding-value-channel-dynamic-select-multiple`,
`binding-value-channel-select-option-value-open`, `binding-value-channel-select-option-domain-open`, and
`binding-value-channel-select-multiple-source-open` on both the value-channel row and any dependent open data-flow seam,
so scripts can aggregate the framework concept without parsing the human summary.
`multiple.bind` closes as static only for literal `true`/`false` expressions or single boolean-literal TypeChecker
projections. A normal `boolean` source remains runtime-dependent, but that dependency is represented by the dynamic
channel when the value source is broad enough rather than by an open seam.
Rows now keep string `valueDomain` and typed `primitiveValueDomain` separate. `valueDomain` is for string/token domains,
while `primitiveValueDomain`, `primitiveValueDomainKinds`, and `primitiveValueDomainDisplays` expose runtime model
values such as `null`, booleans, and numbers from `model.bind` without string coercion. This matters for nullable
select placeholders and radio groups because Aurelia compares model values directly; API consumers should use the
primitive domain when explaining or repairing form value flow.
Rows and summary groups also report `targetMutationKind`. This separates a normal target write, a readonly observer that
suppresses target writes, a source-only operation, and unresolved mutation policy from the channel's value domain.
Generic value-attribute channels additionally expose the nullish default plus its field state; consumers may explain or
check nullish source transport only when that default is closed.
Class/style value channels report `class.bind` and class interpolation token channels, `.class` toggle channels with
their toggled class names, `style.bind` and style interpolation rule channels, and `.style` property channels with the
targeted CSS property. Text interpolation through `ContentBinding` reports `text-content` channels backed by
`text-content-set` target operations. `SpreadValueBinding` reports the target/value shape of its per-bindable inner
`PropertyBinding` fan-out when the target component's bindable keys are statically known, instead of pretending that
`...$bindables` is a static DOM property. Its target-access rows remain the potential candidate set. A value-channel row
exists only for a key that can pass Aurelia's runtime object/property-presence guards; `realization` distinguishes
guaranteed, conditional, and open admission, while `admittedSourceValueType` is the member type on the successful guard
branch. `admittedSourceMemberKind` and `admittedSourceMemberSource` preserve an exact declaration only when every
admitted lane agrees. Provably impossible keys do not masquerade as inner bindings; a checker-missing property on a
structural object type remains open because extra runtime properties are valid TypeScript values.
`SpreadBinding`-owned inner bindings created from captured `...$attrs` are
reported through the same target-access, target-operation, value-channel, and data-flow projections as ordinary
bindings, while their ownership remains a binding-to-binding runtime claim under the hood.
Binding-family public rows are resource-local by authored instruction ownership, not by whichever recursive aggregate
render pass materialized them first. Aggregate child custom-element rendering remains visible for controller topology,
but API projections join each binding to its exact compiled instruction. Runtime-created spread instructions spend
their normalized captured-`AttrSyntax` origin claim. Captured `...$attrs` are the main canary: a forwarded inner input
binding can render inside a wrapper component while its instruction still belongs to the parent usage template that
authored the captured attribute. Conversely, compiler-local templates can share a source file with their owner while
retaining distinct compiled instruction sets. Render/source controllers describe execution and lookup environments, not
authored resource ownership; source-span containment is reserved for rows with no binding/instruction product.
Project-level producers consume the same
`runtime-resource-ownership` projection before publishing source-owned diagnostics; otherwise a child binding visible
in both parent aggregate rendering and child analysis would produce duplicate semantic facts before the API is reached.
Expression references, completions, semantic tokens, capability demands, and overlay diagnostics follow the same
authored-resource rule for dynamic expression parses, value sites, and instructions. They must not enumerate a recursive
aggregate render directly; runtime instruction/scope selection may inspect that aggregate only after the source-owned
expression has been selected.
`repeat.for` owner bindings use the `template-controller-iteration` value channel and Aurelia repeat-source
compatibility rather than raw `Repeat.items` TypeScript assignability. Dynamic `model.bind` on `<option>` or `<input>`
uses the `element-model-value` channel, because Aurelia's select and checked observers read the element's model value as
runtime value-domain metadata instead of treating `model` as an ordinary native DOM property.

`BindingDataFlows` exposes the source/target edge after scopes plus target access or target operation are materialized.
Use `BindingDataFlowSummary` first when a client needs a compact explanation of flow direction, value-channel families,
assignability/writeback pressure, framework error codes, issue rollups, and the source roots involved. Pass
`page.size: 0` for an issue-rollup-only first read, then page summary or raw data-flow rows after the issue kind,
target/value-channel family, or source root is known. Detailed rows report binding
direction, source-evaluation lifecycle, parser publication state/result kind, value-site kind, source expression lane/name/root/type, raw target
property type, observer/direct-operation runtime value type, TypeChecker source-type pressure, source writability for
target-to-source flows, target mutation policy, TypeChecker assignability checks in the active directions, optional framework error code, source
address, exact `expressionSource`, optional handles, and row-local runtime data-flow open pressure. Flow direction records
value transport; `sourceEvaluationKind` separately records whether Aurelia evaluates with a connectable, without one,
or treats the source as an assignment target. `sourceEvaluationReachability` independently records whether the rendered
binding's complete expression-resource bind chain reached that source operation. Blocked rows retain prospective
TypeChecker/assignment evidence and the lifecycle cause; they do not claim that the runtime performed the read. A
suppressed target write does not erase source evaluation or the remaining target-to-source edge; these axes stay
independent. This is the compact pressure signal for
two-way form controls, setter-backed state, class/style presentation bindings, template-controller value bindings, and
future validation/write diagnostics. Direct spread value bindings appear here as source-to-target flow from each spread
object property admitted by its value channel into the corresponding target bindable, such as
`featuredCardBindings.productId -> productId`. Their `realization` field preserves whether the runtime inner binding is
guaranteed, conditional, or open. A targetless `source-read` flow is always present for the authored outer expression;
member flows represent only the generated inner bindings that can pass the runtime object and `key in source` guards.
Observed-dependency answers use the same outer/member split. Generated member rows may carry a checker declaration
route, but their template source remains the authored outer spread expression because no generated inner member token
exists. Structurally open generated reads remain source-open rather than borrowing a declaration from one possible lane.
For target-to-source edges, `targetToSourceValueType` is the final observer value after Aurelia's outer-to-inner
`fromView` chain. `valueConverterWritebackStages` retains each target-specific checker input/output and its projection
state, then links it to the existing runtime converter application for origin, phase order/reachability, exact
converter-token source, and optional product handles. A `type` projection does not imply runtime execution: blocked
applications keep their runtime reachability, and stages after an open conversion remain `input-open`. Source-independent
primitive type products may legitimately have no type source; the converter token remains the exact authored locus.
Captured `...$attrs` flows appear as the concrete inner binding that `TemplateCompiler.compileSpread(...)` produced,
for example a forwarded `disabled.bind="false"` reporting boolean-to-boolean flow on the inner input element. Captured
parent expressions can also surface here: the storefront `field-shell` wrapper reports forwarded `value.bind="email"`
as an inner input value flow typed against the checkout-form parent scope.
Current product-owned framework-code rows include runtime-html `select_observer_array_on_non_multi_select` (`AUR0654`)
for array sources flowing into single-select channels, runtime `assign_readonly_size` (`AUR0220`) for source-to-target
writes through `CollectionSizeObserver`, and runtime `assign_readonly_readonly_property_from_computed` (`AUR0221`) for
source-to-target writes through getter-only `ComputedObserver` targets. Template and app diagnostics surface those as
`runtime-binding-framework-error` rows with `binding-data-flow:<code>` as the compact missing input.
`sourceName` preserves the display expression summary, while `sourceRootName` records the component scope member that
owns the flow when it can be determined. API joins should use the root when they need to connect a member chain or
single-root interpolation back to the component getter/setter that implements the behavior.
When that root is itself a DI-injected app support member, `AppTopology.serviceInteractionBindings` reports the direct
template-to-state/service handoff as read/write interaction rows. This lets idiomatic templates bind to
`state.member` without adding boilerplate view-model forwarding just to make topology visible. The join is scope-backed:
the API reads the binding row's materialized `BindingScope`, locates the root slot, and requires that slot's source to
match the injected member source before publishing a direct support-member handoff.

`RuntimeExpressionAccessUses` exposes the lossless owner-qualified operation uses beneath binding, watcher,
source-effect, and computed-observer execution. It deliberately does not enumerate authored template tokens that no
runtime operation spends; template references and rename consume the binding-resolution layer for that authoring
closure. Each row retains its exact operation slot, origin, access form and role,
runtime phase, tracking mode, realization and reachability, control-flow qualifiers, execution multiplicity, semantic
coverage, target closure, exact access/token source, and optional substrate handles. This is the query for questions
about what Aurelia will read, call, or assign even when the operation is untracked, blocked, generated, or still open.
It is not a subscription list. Observation rows below include the same access-use execution summary and require a
lineage handle to the owning access fact, so MCP, IDE, and future AOT consumers must not reconstruct operation semantics
from dependency display names.
`scopeLookupAncestor`, `authoredScopeAncestor`, and `callbackScopeDepth` are separate facts. Unqualified names can have
lookup ancestor zero inside a callback because Aurelia scope lookup falls through by name; explicit `$this`/`$parent`
lowering can include callback escape depth. `lexicalLocal` and exact declaration target links distinguish callback
parameters, including same-name nested parameters, without a consumer-local lexical graph.
Binding-owned method-body rows retain their TypeScript source while inheriting the invoking binding's template-resource
ownership. A source-file mismatch across that handoff is not evidence that the row belongs to a different resource.
The query belongs to the observation catalog group rather than the binding group because it spans binding, watcher,
source-effect, and computed-observer owners. Its typed continuations lead to each owner-specific effect family plus
observation issues. Nested `executionQualifiers`, `targetLinks`, and owner-specific `accessUse` projections are
registered source-reference carriers, so continuation evidence and other public source-precision policies see every
nested authored or declaration locus instead of only the row's top-level source.

`BindingObservedDependencies` exposes the concrete source-side reads that a source-to-target binding evaluation would
collect through Aurelia's template connectable circuit. Every row has an answer-local `rowKey`, a structured `owner`
reference, and one shared `occurrence` shape used by binding, watcher, source-effect, and computed-observer families.
The occurrence preserves expression kind, source/root/member/key names, method name for calls, parser-local spans,
source reference, and required access-use lineage; optional row handles lead back to the runtime binding, data-flow edge,
expression parse, and binding scope. Member reads also carry TypeChecker
member kind and declaration source when the binding scope can close the owner expression. Repeated authored occurrences
remain separate rows even when Aurelia would coalesce their live observer subscription. The
occurrence's `observedMemberSourceState` field distinguishes
closed source routes from honest non-member carriers such as temporary collection call results, `$` runtime scope names,
and genuinely open scope roots, so aggregate pressure does not treat every null declaration source as provenance loss.
`occurrence.memberTokenSource` names the value carrier whose observer is requested; for a derived call such as
`items.filter().map()`, that can be `filter`. The linked access use names the `map` operation occurrence. Do not flatten
those two loci into one source field. Owner keys and row keys are opaque within the current answer epoch and must not
expose or be reconstructed from kernel handle strings.
Rows are published only when `sourceEvaluationKind` is connectable-read and
`sourceEvaluationReachability` is reached. A blocked binding remains visible in `BindingDataFlows` for diagnostics and
explanation, while this query stays an honest runtime-effect projection.
Use `BindingObservedDependencySummary` first when a client needs low-token observation evidence. It groups dependency
kind, binding kind, source root, member source state, observed member kind, sampled source/member/method/key names, and
definition counts, and it also publishes member-source-state rollups. Grouping by source root keeps direct `state`
reads, repeat locals, and option locals explainable without reopening raw rows. Pass `page.size: 0` when the first question is
only whether the app has source-backed reads versus runtime-scope, temporary-value, or open-scope pressure.
Root scope reads such as `state`, `request`, or repeat
locals preserve the slot/context source when available, so inquiries can distinguish a template read of an accessor
getter from a plain property and can still explain the scope root without treating the source-observer projection as
concrete usage by itself. Use this query when authoring or diagnostics need to explain why `state.member`, nested collection callbacks, or direct
object reads are observable without requiring view-model forwarding getters. It also carries the binding-owned
execution rows for observed `@computed`/`@astTrack` method calls: explicit deps become declared dependency rows, while
omitted deps use the framework proxy execution path for that method call. It is a binding-owned companion to
`BindingDataFlows`, not a full watcher/computed getter executor.
Authoring expected effects can filter `binding-observed-dependency` rows to prove direct state-member observation in
generated fixtures without adding broad snapshots.

`ComputedObservationDefinitions` exposes valid source-backed `@computed` getter and trackable-method declarations.
Rows preserve member kind/name, explicit property keys, dependency-function count, proxy-auto-track/function/open
dependency mode, flush/deep options, source reference, and optional handles. Use this query when authoring wants to
distinguish ordinary template connectable reads from explicit computed/watch/trackable dependency declarations. Invalid
decorator targets remain in
`ObservationIssues`; this row family is for framework-accepted declarations that will later feed computed/watcher
execution semantics. `@computed` is not a generic switch for making ordinary template reads observable, and it is not
required for an ordinary accessor getter to be observed. Accessor descriptors and function-key observer requests enter
`ComputedObserver` through `ObserverLocator`; `@computed` only contributes explicit computed metadata for getters or
writes the same trackable-method marker consumed by `@astTrack` for methods.

`ComputedObserverSources` exposes the getter source-observer side of that model. Plain getter descriptors publish
`ComputedObserver` rows with proxy-auto dependency collection; decorated getters with explicit deps publish
`ControlledComputedObserver` rows. `ComputedObserverObservedDependencies` is the source-observer companion row family:
plain getter bodies and dependency functions publish proxy property/collection reads, explicit dependency strings
publish one authored access row per path segment at the dependency literal span, and explicit dependency keys with
`deep: true` additionally publish generated TypeChecker-shaped `deep-property-read` / `deep-collection-read` rows for
nested observable value shapes. The authored rows retain exact declaration targets; generated deep candidates retain
their synthetic origin and coverage instead of masquerading as extra source tokens.
These rows are source-backed getter capability/projection rows. A direct `ObserverLocator.getObserver(obj, fn)`
function-key request is still a runtime `ComputedObserver` branch, but it is a concrete observer lookup call site and
should be modeled by a call-site product, not folded into getter availability rows. Pair computed observer source rows
with binding observed dependencies, runtime-effect rows, watcher rows, or target-access rows when the question is
whether a concrete runtime lookup is actually used by a template, source API call, or watcher.

`RuntimeEffects` exposes immutable construction-site plans for direct source-level `Observation.watch(...)` /
`IObservation.watch(...)` and `Observation.run(...)` / `IObservation.run(...)` calls. These rows do not claim live
`IEffect` identity, subscription state, or stop lifecycle. They preserve the effect kind, the framework
dependency-evaluation handoff, the static `immediate` option when closed, observed dependency count, source reference,
and optional product handles. `RuntimeEffectObservedDependencies` is the source API companion row family: string watch
expressions use the `ast-evaluate` path that mirrors `getExpressionObserver(...)`, function getters use the
`observer-locator-function-key` path that mirrors `ObserverLocator.getObserver(obj, getter)`, and run closures use the
`connectable-run` path for synchronous `@observable` getter reads inside the active `RunEffect` connectable window. These
rows are intentionally effect-owned. Do not read them as resource `@watch` metadata, renderer-created bindings, or getter
source-observer availability. Dynamic watch expressions publish an `open` source effect with no observed-dependency rows
instead of disappearing. Async nested callbacks inside `Observation.run(...)` remain outside the synchronous connectable
window.

`ProxyObservableEscapes` exposes direct source-level `ProxyObservable.getRaw(...)` and `ProxyObservable.unwrap(...)`
calls with the escape kind, argument source text, argument root, source reference, and optional handles. This is a
neutral fact row for code that leaves Aurelia's proxy wrapper surface, not a diagnostic by itself. Pair it with observed
dependency rows, type surfaces, and future policy when deciding whether an escape is appropriate for an external library,
host object, serialization boundary, or unnecessary boilerplate.

`RuntimeWatchers` exposes controller-owned `ComputedWatcher` and `ExpressionWatcher` products created from accepted
resource watch metadata during controller hydration. Rows preserve the owning rendering/controller, source resource,
watch index, expression/callback shape, flush mode, source reference, and optional product/identity handles. Computed
watchers use Aurelia's `ProxyObservable` dependency collection path; expression watchers use the ordinary
`astEvaluate`/connectable path. This query is intentionally separate from renderer-created `RuntimeBindings`: both are
admitted through `Controller.addBinding(...)` in the framework, but watchers are set up from `definition.watches`
before ordinary rendered bindings and need their own source/resource metadata handle.
`RuntimeWatcherObservedDependencies` is the execution-detail companion for watcher reads that semantic-runtime can close
today. Expression watchers parse the accepted string property key with Aurelia property-expression semantics and reuse
the same access-use and connectable policies as binding data flow, so rows can explain `AccessScope`, `AccessMember`,
`AccessKeyed`, and collection-call dependencies without reclassifying the watcher as an ordinary renderer binding.
Each authored path segment retains its own source token and target declaration through the shared source-root checker
resolver.
Computed watchers use a first `ProxyObservable` function-body projection to explain property and collection reads rooted
in the wrapped dependency function parameter, including nested collection callback values and simple local aliases or
object destructuring. Collection-call rows are TypeChecker-discriminated when receiver types are visible, so ordinary
string/object methods can keep their property-read rows without being misreported as array/map/set proxy collection
reads. This remains a conservative execution-detail lane: optional chaining, dynamic keys, derived aliases, computed
getter observer execution rows, and deeper proxy/control-flow precision are still substrate frontiers rather than API
wording policy.

## Fixture Pressure

Pressure fixtures live under `../../fixtures/pressure`. They include hand-authored analyzer pressure and migrated
app-pattern fixtures whose source remains useful for reopening and verification even though the legacy recipe APIs are
gone. App-builder pressure fixtures live under `../../fixtures/pressure/app-builder-*` and should be generated from the
current app-builder source-lowering path as that surface matures.

Avoid brittle snapshot fixtures around either kind of fixture; the valuable signal is whether the API can expose precise,
navigable open seams and compact high-level answers after the app is reopened.
