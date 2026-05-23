# Semantic Runtime Telemetry

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Telemetry is an inquiry aid, not a product model. It should help future maintainers and agents decide where time,
memory, kernel records, product details, hot details, and query claims are being spent without changing what the
semantic runtime believes about an Aurelia app.

## Current Lanes

`phase.ts` owns optional phase timing, memory, and kernel snapshots. Keep default phase measurement cheap; fine-grained
phase snapshots are for profiling sessions and can heavily perturb CPU when garbage collection and kernel breakdowns
are enabled.
Phase kernel snapshots default to cheap scalar counts even when the surrounding operation asks for full kernel
breakdowns. Opt into `capturePhaseKernelBreakdowns` only when the question is specifically "which product/record kind
grew inside this phase?" rather than "how much did this phase grow?" Phase breakdown rows must be marker/delta-based:
do not add full-store before/after breakdown snapshots to phase measurement, because nested template phases can call
this path hundreds of times on a large app. `capturePhaseDetailDensity` uses the same marker discipline and scans only
product details and hot details admitted during the measured phase.

`kernel-density.ts` owns count-shaped kernel snapshots. Default snapshots are cheap scalar counts. High-cardinality
breakdowns such as product kinds, record kinds, source-span roles, handle-character rows, and detail-kind rows are
behind `includeBreakdowns`. The breakdown lane also reports named sidecar indexes and their entry counts; those rows are
for spotting hidden acceleration structures that still own hot details or TypeChecker carriers after query disposal.

`detail-density.ts` owns the opt-in shallow sidecar scan. It groups product details and hot details by detail kind,
constructor, direct field count, direct array item count, direct string-character count, handle-shaped string count,
non-envelope handle count, envelope-handle echoes, non-handle string mass, local-key string mass, unique direct string
values, and the heaviest direct string or array fields. This lane is
intentionally shallow: it should distinguish source payloads from repeated handle/local-key strings without walking
TypeScript ASTs, checker objects, parent graphs, or full product object trees. Product-detail envelope echoes are a
representation signal: they show detail fields that repeat the owning `MaterializedProduct` handle, identity, address,
or provenance handles rather than new semantic payload. Non-envelope handle rows point at cross-product navigation
fields such as instruction, expression, syntax, declaration, or owner links. Non-handle string rows show actual scalar
payload after handle-shaped strings are removed from the logical count. Unique-string counts help avoid mistaking
repeated logical payload for unique value mass, but they are still not exact heap ownership because a detail field may
reference a handle string that was already created for the materialized-product envelope.
Handle-kind rows split direct handle-shaped strings into `product`, `identity`, `address`, `claim`, and other kernel
handle families. Use that split before changing a detail: address-heavy rows often mean source precision, product-heavy
rows often mean runtime topology, and identity-heavy hot rows often mean declaration/owner identity. The split is a
classification aid, not a command to delete fields.
Product-detail catalog admission normalizes exact envelope-handle echoes into weak-envelope-backed accessors, so a high
post-admission non-envelope handle row is usually real navigation topology rather than a product-local envelope echo.
If envelope echoes reappear in this telemetry, first check whether a detail bypassed `ProductDetailCatalog` or whether
the field is deliberately not the owning envelope.
Hot-detail catalog admission similarly normalizes exact hot-detail handle echoes such as `productHandle`. Hot details
do not have durable materialized-product envelopes, so remaining non-envelope handles should be interpreted as the
semantic owner/declaration/source lane that makes the hot detail useful.

`memory.ts` owns process memory samples for profiling boundaries. Treat memory rows as directional: V8 GC, TypeScript
program state, allocator capacity, and profiling itself can dominate individual deltas. The rows include `rssOther`
and V8 heap statistics so a run can separate live JS heap from process RSS/capacity pressure before assuming a
semantic-runtime product, detail, or query-claim owner is retaining data.
The app telemetry harness forces GC, when available and requested, before routed-mode construction/query memory
boundaries. This keeps one-off public query deltas closer to live retained pressure; `heapTotal` and RSS can still stay
high when V8 keeps allocator capacity after the app epoch and dependency caches were logically disposed.

Query-claim telemetry reports both retention kind and answer-local kernel policy. Read them together: retention kind
describes the lifetime of the answer claim, while answer-local kernel policy explains whether products/details created
inside the answer boundary were disposed after serialization or retained in the owning app/runtime epoch.
The disposed counters are part of the same story: kernel deltas describe work spent to answer, while disposed kernel
and nested-claim counts describe work reclaimed before the answer left the boundary. For one-off routed app queries,
expect both materialization and disposal to be non-zero when the profile is recompute-friendly.
Disposed-kernel telemetry includes handle-character mass as well as record, product-detail, and hot-detail counts.
Use `rootHandleChars`, `disposedHandleChars`, and net handle characters to separate logical disposal from transient
string/handle bulk, especially when an MCP-style answer briefly builds a large app world and then discards it.
The query-claim line also prints `roots=root/child`, `maxDepth`, retained dependency-edge counts, and compact index
cardinalities as `q/l/e/m/o` for query-kind, locus, epoch, materialization-policy, and outcome-key buckets. Those counts
make retained answer storage, nested answer invalidation, and invalidation shape visible without dumping every retained
row. It also prints record-budget and
answer-value budget disposal counts separately: a graph can drop old retained DTO values to stay within the profile's
total answer-byte budget while keeping the claim rows and effect telemetry needed for invalidation.

## Usage Notes

`scripts/app-telemetry.mjs` is the main app-world pressure harness. Use:

```powershell
$env:SEMANTIC_RUNTIME_TELEMETRY_KERNEL_BREAKDOWNS='true'
$env:SEMANTIC_RUNTIME_TELEMETRY_DETAIL_DENSITY='true'
node --expose-gc packages/semantic-runtime/scripts/app-telemetry.mjs
```

The harness spends the app-query catalog's `pagingKind` instead of blindly attaching `page.size` to every query.
`SEMANTIC_RUNTIME_TELEMETRY_QUERY_PAGE_SIZE` applies to cursor/offset-paged row tables, while
`SEMANTIC_RUNTIME_TELEMETRY_ROW_SAMPLE_SIZE` opts router-overview-style row samples into the profile. Keep row samples
at 0 for MCP-orientation payload checks unless the run is specifically testing router-family row samples.
The default output is aggregate-only so autonomous checkpoints can read the pressure without a per-run wall of text.
Set `SEMANTIC_RUNTIME_TELEMETRY_OUTPUT=runs` for detailed run rows, or `both` when a profiling pass needs the detailed
rows and aggregate totals in one command.
Set `SEMANTIC_RUNTIME_TELEMETRY_QUERY_KINDS=summary,app-overview` or another comma-separated app-query list when a
profile preset is too broad for the question. This is the projection-cost lane: it lets a run isolate one public answer
without editing the harness or accidentally treating a profile bundle as the cost of a single query.
Set `SEMANTIC_RUNTIME_TELEMETRY_DEPTHS=query-default` in routed modes when the question is "what does this public
inquiry naturally spend?" rather than "what happens at a forced app-world analysis depth?". In that mode the harness
omits `analysisDepth` and lets the app-query catalog, cursor/source-file shape, and query policy choose the minimum
depth. Use explicit `runtime-topology`, `binding-targets`, or `binding-observation` only when measuring an intentionally
forced consumer posture.
When a selected query kind also appears in the active profile preset, the harness keeps that preset's query options
such as MCP `diagnosticProjection=available-products`. Narrowing the query list should isolate a profile-shaped answer,
not silently change its inquiry-depth policy.
Set `SEMANTIC_RUNTIME_TELEMETRY_REPEAT=2` or higher when the question is warm-session behavior. Repeated runs happen in
one process, so process-local TypeScript dependency cache policy, V8 capacity, and query/session retention become
visible without needing duplicate root entries. Compare repeat runs under profile-default clearing and explicit
`SEMANTIC_RUNTIME_TELEMETRY_TYPE_SYSTEM_CACHE_CLEAR_POLICY=preserve`: if the second run still has compiler-host misses,
the consumer is measuring one-off recomputation; if the second run has cache hits and lower Program/checker timing, the
retained dependency `SourceFile` cache is buying real CPU latency at a visible memory cost.
Set `SEMANTIC_RUNTIME_TELEMETRY_QUERY_REPEAT=2` or higher when the question is claim-graph reuse inside one opened
runtime/app session. Query-repeat labels add `#1`, `#2`, and so on to query timing rows, so cold materialization,
retained-answer hits, answer-side disposal, and app-owned child-claim reuse can be compared without rebuilding the
workspace/runtime between samples. Retained-answer hits are marked on query rows, and retained app profiles are not
counted again as newly spent app-world work.
Aggregate timing rows print total time, sample count, and per-sample average. Use the average to compare repeated
preserve/clear runs; use the cache and memory rows to decide whether the latency win is worth the retained heap.
Query rows still print kernel deltas for `query-type-projection` answers, because those queries are allowed to publish
answer-time TypeChecker products. The warnings lane is reserved for projection-only/static queries that grow or retain
kernel state unexpectedly. Aggregate query rows are keyed by both query kind and materialization policy, so expected
type-projection kernel growth does not get blended into a projection-only total for the same query kind.
When a run includes multiple roots, depths, or profiles, aggregate output also prints grouped timing leaders. Read those
before narrowing a rerun: they show which app/profile/depth group introduced the leading app phase, template phase, or
app-world-free profile cost while keeping the global totals available for whole-run load. TypeSystem inner phases are
included in those aggregate and grouped timing rows, so Program/checker cost can be separated from compiler-host setup
and project-option work without switching back to per-run output.
Consumer profiles may also choose query-policy knobs. For example, the MCP-orientation profile asks diagnostic summary
with `diagnosticProjection=available-products` because orientation should not spend answer-time TypeChecker projection
unless the caller opts into the richer diagnostic surface.
`SEMANTIC_RUNTIME_TELEMETRY_MODE` selects the public-query entry shape. The default `opened-app` mode opens one app
epoch and asks queries against `SemanticApp`, which is useful for fixture/authoring lanes that intentionally inspect a
retained app world. `routed-query` mode calls `SemanticRuntime.answerAppQuery(...)` with `appRetention=dispose-app` for
each sampled query, which is the MCP-style one-off path: final kernel growth should be small or zero, while query-claim
totals still show the app-world work spent and reclaimed for each answer.
`routed-batch` mode calls `SemanticRuntime.answerAppQueries(...)` once for the sampled query set. Use it to compare a
public orientation bundle against repeated one-off routed queries: the runtime-level claim should show one batch answer,
disposed nested app claims when app retention is recompute-friendly, and the payload estimator should prevent broad
batch DTOs from being retained as tiny answers.
The batch answer carries the compact app construction profile captured before app-epoch disposal, so the harness can
still print top app phases for MCP-style `dispose-app` runs without retaining the app world only for profiling.
For routed batches that open an app world, the harness also prints the app-owned query-claim graph captured before
disposal. Read this beside the runtime-level claim: the runtime graph explains public transport retention and app-epoch
cleanup, while the app graph explains child-query composition, retained answer hits, and projection payload shape inside
the disposed app world.
When every child query is app-world-free, such as a batch of `source-files` and `unresolved-modules`, the routed batch
should print no app phases and no app profile because no app-world epoch was opened. If an app-world-free query runs
static evaluation, the answer-envelope telemetry can still print `app-world-free.profile.total` plus static-evaluation
source-host rows; treat those as runtime-boundary cost attribution, not as app construction.
Treat the absence of app phases as successful inquiry-depth routing, not as missing phase telemetry.
The run output prints `app world opened: false` for routed batches that stop below app-world construction. Use that flag
beside phase rows and query-claim kernel deltas before concluding that telemetry is incomplete.
Set `SEMANTIC_RUNTIME_TELEMETRY_APP_RETENTION=retain-app` in either routed mode to compare a warmer MCP session: the
first query or batch should pay app construction, later compatible routed answers should reuse the retained app epoch,
and `analysisCacheOverview`/query-claim totals should show the retained-vs-recomputed trade-off explicitly.

The harness also promotes nested resource-recognition phase totals (`source-file-selection`, `evaluated-source`,
`open-source`, `named-recognition`, `syntax-recognition`, `kernel-emission`, and `definition-convergence`) beside the
static-evaluation, type-system, template, and template-runtime lanes. Use those rows when the outer
`resource-recognition` app phase is hot; they are a visibility lane before behavioral refactors.
The type-system lane reports both per-open compiler-host hit/miss/write counters and source-text traffic, plus
process-local dependency cache density from `analysisCacheOverview()`. Use host-cache traffic to understand CPU warmup
versus newly admitted dependency/library text, and use cache density to understand retained dependency and library
`SourceFile` memory. Dependency cache density reports both entry counts and source-text characters for
node_modules, declarations, default libraries, and external declarations so memory triage can stay non-extractive while
still showing which cache class is carrying the mass. Program root/source-file rows also print overlapping source-text
bucket mass, so a run can tell whether a large Program is mostly app roots, framework/dependency declarations, or
default-library text before changing source admission or dependency-cache policy. It also reports duplicate parse-option sets so repeated
canonical paths can be attributed to systematic TypeScript parse-option families without printing dependency paths. Set
`SEMANTIC_RUNTIME_TELEMETRY_TYPE_SYSTEM_CACHE_CLEAR_POLICY=default-libraries`, `node-modules`,
`external-declarations`, or `all` when a run should record before/after dependency-cache density and clear totals at
the end of each profile run. Routed query-claim output also prints the clear bucket split for default libraries and
external declarations, so profile-default one-off runs can show what was reclaimed even when the cache is empty by the
time `analysisCacheOverview()` reads it. Leave the policy unset for the public API's profile-shaped default; set it to
`preserve` when the run is measuring warm repeated Program construction. For disposed-app routed diagnostics, the
profile-shaped default clears default libraries only; this is the bounded-retention middle path between MCP-style
full recomputation and cursor-style warm local state.
The retained heap cost of cached TypeScript `SourceFile` objects can be far larger than their raw source text. Treat
source-text density as attribution, not as heap-size accounting: the AST/object graph is the reason one-off MCP-style
routed calls may need to clear dependency SourceFiles even when retained text looks modest.
The project compiler-options cache row is a different, much smaller lane. It shows whether static evaluation and
TypeSystem construction are reusing the same root-level tsconfig/path-mapping shape inside a process; hits there remove
repeated filesystem/source-root discovery but do not imply that TypeScript Program objects or app-world products are
being retained.
Routed-batch telemetry keeps compact nested construction phases even when the app epoch is disposed after answering.
Use those rows when MCP-style calls need to explain TypeSystem, static-evaluation, resource-recognition, template, or
template-runtime cost without retaining the app world just to inspect it. The TypeSystem lane also prints the compact
compiler-options profile so default-library breadth can be distinguished from project source admission or dependency
cache retention.
Aggregate telemetry also keeps bounded phase-memory rows for app phases, template phases, and template-runtime phases.
Those rows are for peak-pressure triage: when final kernel and query-claim retention return to zero but heap spikes
during construction, the aggregate phase-memory rows show which phase family should be profiled next.
Aggregate phase-kernel rows sit beside phase memory rows. They show which phase families produced records/products
inside the app epoch before disposal, so memory spikes can be compared with semantic product volume instead of only
process heap deltas.
The same compact app profile carries the aggregate template expression type-cache counters from the runtime-analysis
resources. This keeps CheckerExpressionTypeWorld pressure visible for `dispose-app` routed answers without reopening
or retaining the app epoch just to read per-resource profiles.
Routed-batch app profiles also retain the static-evaluation source-host counters and source composition. Use the
module-resolution, path-probe, external-boundary, package-policy, and source-read/parse rows before changing evaluator
package admission; they often show whether static evaluation is spending time on app sources, plugin package source
mapping, TypeScript resolution, or filesystem probes.
Static-evaluation host rows also print specifier-shape counters (`query`, `asset`, `extensionless`, `emittedJs`) and
split unresolved module results into relative/bare counts. This is the first check when a large app shows many module
resolution calls: framework and package boundaries may be intentional null results, while relative openings or
post-TypeScript path-probe hits point at actual source/asset admission behavior. Probe time is printed as total plus
before/after-TypeScript splits so completeness fallback cost can be separated from known asset/query resolution. The
`postTsProbe` counter shows how many profiled source-host instances had the post-TypeScript fallback enabled; this is a
policy visibility hook, not a success metric.
When `SEMANTIC_RUNTIME_TELEMETRY_PHASE_MEMORY=true`, routed-batch app profiles carry optional phase memory deltas
through disposal as well. Treat those rows as directional because GC and profiling perturb them, but use them to decide
whether a memory frontier belongs to TypeSystem Program construction, template compilation/runtime analysis, resource
publication, or a lower app-world phase before changing retention policy.
Set `SEMANTIC_RUNTIME_TELEMETRY_TYPE_SYSTEM_CACHE_ENTRIES=true` only when a run needs largest-entry evidence behind a
hot dependency-cache bucket. The terminal output prints bucket, basename, parse-option key, and size rather than full
source paths so fixture and external-root runs stay suitable for durable generalized notes while still distinguishing
repeated default-library or declaration parses. Aggregate output keeps only a bounded path-free top entry summary for
the same reason; use per-run output only when you need to correlate the largest entries with a single sample.

Detail density requires kernel breakdowns and is off by default. Use it when memory pressure needs an explanation of
which hot sidecar families and direct fields are retaining mass. Do not enable it for ordinary adapter requests.
For `scripts/app-telemetry.mjs`, `SEMANTIC_RUNTIME_TELEMETRY_KERNEL_BREAKDOWNS=true` controls the open/query/final
x-ray, while `SEMANTIC_RUNTIME_TELEMETRY_PHASE_KERNEL_BREAKDOWNS=true` separately opts phase boundaries into full
breakdowns. Keep the latter off for large-app canaries unless phase-owned product-kind deltas are the actual target.
`SEMANTIC_RUNTIME_TELEMETRY_PHASE_DETAIL_DENSITY=true` adds compact phase-local detail-density rows to that same
phase-breakdown lane. It is intentionally implemented from store markers rather than full snapshot diffs, so disposed
routed app worlds can explain peak detail shape without retaining the app world and without recounting the whole store
at every phase boundary.
Routed disposed-app answers keep compact phase kernel summaries in the app profile when phase-kernel telemetry is
enabled, including phase record/product counts and, when phase breakdowns are on, top product/detail/source-span rows.
This is the template/runtime analogue of query-claim dependency-cache attribution: the answer can dispose products at
the boundary while still explaining which phase created them.

`SemanticRuntime.analysisCacheOverview({ includeKernelBreakdowns: true, includeDetailDensity: true })` exposes the same
shallow density lane through the public in-process API. This is useful for long-lived MCP/LSP adapter diagnosis because
it keeps the x-ray at the semantic-runtime boundary instead of growing adapter-local heap inspections.
App telemetry prints heap-used, heap-total, RSS, RSS-other, external, array-buffer, and selected V8 heap-stat deltas
separately. Interpret RSS, RSS-other, and heap-total as process-capacity pressure unless query claims, kernel deltas,
dependency-cache counters, or heap-used growth show retained semantic state. This distinction matters for one-off
routed calls where V8 may keep heap capacity after the app-world kernel and dependency SourceFile cache have been
reclaimed.

## Design Rules

Add telemetry when it prevents blind refactors or makes a real trade-off visible. Do not add telemetry just to satisfy
a pressure row.

Keep telemetry opt-in when it scans high-cardinality stores, expands sidecars, or risks retaining rich objects longer
than the analysis already would.

When telemetry shows repeated handle strings or product details, first ask whether the semantic product is actually
needed at the current inquiry depth. Compression is useful only after product lifetime and query policy are understood.
Use non-envelope handle fields before refactoring a detail class: envelope echoes may be derivable from the product
entry, while non-envelope handles usually represent real semantic navigation that needs another owner if it is removed.

When telemetry shows a sidecar index growing, check whether it mirrors an app epoch, a query claim, or a product-detail
lifetime. Index cleanup should usually hang off `KernelStore.registerSidecarIndex(...)` instead of being hidden in an API
adapter or answer serializer.
