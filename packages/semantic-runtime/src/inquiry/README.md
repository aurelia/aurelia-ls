# Inquiry Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Inquiry is the answer algebra above the kernel. It turns selectors and loci into answers without creating a second
semantic store or making transport, presentation, or consumer policy own the core model.

Core inquiry pressure comes from editor, Atlas, tooling, and agent use: a caller often starts from a workspace, project,
file, cursor, range, or known kernel handle and needs a truthful answer plus a navigable follow-up move.

## Responsibilities

- Represent query loci such as workspace, project, source file, source cursor, source range, and kernel record.
- Preserve outcomes such as hit, miss, ambiguous, open, partial, unsupported, and reroute.
- Carry answer basis, projection lanes, expansions, evidence handles, provenance handles, claim handles, open seams,
  page state, and continuations.
- Resolve host selectors into the narrowest currently known inquiry locus.
- Share answer-assembly helpers such as source-file-address narrowing and ordered de-duplication through the inquiry
  helper modules so answer surfaces do not grow private copies of the same selector vocabulary.
- Expand materialized products through typed product-detail slots when a consumer asks for detail rather than handles.
- Answer template/expression completion from already-materialized parser, scope, resource, and definition details.
- Record answer-facing query claims separately from durable kernel facts so inquiry/profile policies can decide whether
  query-local work is discarded, kept for an interactive session, or retained for the app epoch.
- Keep confidence, ranking, actionability, and UI/AI policy above the kernel.

## Non-Responsibilities

- Producing kernel facts.
- Interpreting TypeScript, Aurelia configuration, resources, DI, or templates.
- Hiding uncertainty behind empty result arrays.
- Treating projection shape as semantic authority.
- Treating inquiry relations as durable app graph edges before a real materializer has earned a kernel claim predicate.

## Query Claims

`QueryClaimGraph` is the first explicit storage layer for answer outcomes. It is intentionally not the kernel: kernel
claims/products describe semantic facts produced by materializers, while query claims describe what an API answer did at
the boundary before serialization. `SemanticApp.ask(...)` now enters the graph with an answer-producing closure rather
than computing first and recording afterward. That keeps lazy answer work, query-local type projections, nested query
composition, and disposal at the API boundary instead of promoting every answer artifact into a durable app fact.
Opened-app convenience methods such as `app.summary()` and `app.bindingDataFlows(...)` re-enter `SemanticApp.ask(...)`
when called from outside an active answer materialization, so direct API calls and routed query calls share the same
claim graph. The raw projection bodies only run after the graph has established query identity, locus keys, epoch keys,
profile policy, and answer-local kernel disposal.

Retention policy is inquiry-profile shaped. Cursor, diagnostics, and MCP orientation lanes keep lightweight session
claims for follow-up, with diagnostics deliberately disposing answer-local TypeChecker products because diagnostic
queries may be slower than cursor-time queries. Authoring and fixture lanes can retain claims and query-local products
for the app epoch when pressure work needs to inspect the generated shape. AOT/SSR can discard answer claims after
serialization. Disposal is policy-shaped too: claims can be invalidated for session end, app-epoch disposal,
project-epoch changes, source-epoch changes, or manual cleanup, optionally narrowed by query kind, locus, or
materialization policy. This is
where future lazy API answers should attach their derived outcomes before deciding whether hot details, public answer
values, or query-produced products should be retained, invalidated, or disposed.
Answer-local kernel retention is intentionally one policy knob, not separate product-detail and hot-detail flags:
`KernelStore.mark()` / `disposeSince(...)` rolls records, product details, and hot details back as one coherent slice.
If a future profile needs to retain hot details without durable products, that requires a new kernel-side lifetime
primitive rather than a misleading claim-graph switch.
`QueryClaimGraph` exposes named disposal methods for the common lifecycle boundaries, plus a query-type-projection
cleanup lane for the current TypeChecker-heavy diagnostic/completion pressure. Session profiles also carry explicit
retained-record budgets so long-lived cursor/diagnostic/MCP adapters do not turn answer-shape telemetry into an
unbounded cache. The budget prunes only answered or failed claim nodes; pending lazy claims remain materializable by
the caller that created them.
Discard-after-answer profiles still admit pending claims into the graph while the lazy answer closure is outstanding;
the node is removed only after it resolves or fails. That keeps the graph as the actual storage owner for lazy answer
work even when the profile intentionally retains no records after serialization.
`query-claim-policy.ts` owns the profile-to-policy mapping and disposal vocabulary; `query-claim-graph.ts` owns the
answer-boundary graph, with retained-node storage kept inside `QueryClaimGraphStorage`. Keep new consumer trade-offs in
the policy module so the graph does not become a bag of profile-specific cases.
`QueryClaimGraphStorage` is the retained-node/index owner below `QueryClaimGraph`: it owns outcome, query-kind, locus,
epoch, and materialization-policy buckets plus retention-budget candidate selection. The graph should keep answer
materialization, profile policy, and disposal accounting, while storage should keep indexed outcome history. If a new
transport or adapter wants to scan retained answers, add the needed graph-owned index or disposal policy there instead.
Storage also owns retained-answer byte accounting and cheap retained-shape snapshots, so cache overview and telemetry
can read graph shape without materializing full public claim-row DTOs.
When cache overview needs row detail, ask the graph for recent records instead of materializing every retained node and
then slicing at the API boundary. The storage layer should own answer-history projection shape just as it owns reuse and
invalidation indexes.
An opened `SemanticApp` may own multiple query-claim graphs at once: app-world cache identity is the semantic epoch,
while query retention belongs to the active consumer lane. Nested query composition inherits the active lane unless a
child query explicitly asks for another `inquiryProfile`. This avoids duplicating app-world construction just because
an MCP overview, LSP cursor query, and fixture verification have different answer-retention policies.
The booted `SemanticRuntime` also owns runtime-level claim graphs for static answers and routed app answers. Routed app
claims observe the app-open plus answer boundary through optional app-epoch disposal, but they do not own the app kernel
records. That distinction lets recompute-friendly MCP-style calls dispose opened app worlds while still retaining a
small outcome/cost record for session diagnostics and later invalidation.
`SemanticRuntime.answerAppQueries(...)` is the first multi-answer use of that boundary: a normal app-world batch
becomes one runtime-level query claim, while each child query still becomes an app-level claim inside the opened app
epoch. App-world-free batches, as declared by the app-query catalog's `runtimeBoundary`, stop at the runtime graph:
the batch is a root runtime claim and each child answer is a nested runtime claim with its own query key, locus,
materialization policy, and epoch keys, but no app-owned child claims are created. This is the preferred shape when a
public client needs an orientation bundle, because the claim graph stores the answer outcome and disposal effect without
making the transport layer decide whether to cache, reopen, or scan previous answers.
Routed app disposal now runs inside the answer boundary via `disposeAnswerSideEffects`, so the runtime-level claim can
record both the app-world kernel delta and the records reclaimed by app-cache policy. Keep future one-off transport
cleanup in that boundary rather than in adapter-local `finally` blocks; otherwise telemetry will see materialization
cost without the matching disposal.
The same boundary can record process-local cleanup that is not kernel-owned. TypeScript dependency SourceFile cache
clears should arrive as explicit disposal summaries on the claim graph, not as hidden adapter work after the API answer,
so retention reports can distinguish app-world products from warm compiler-host dependency files.
The clear policy is inquiry-shaped. Recompute-friendly routed answers that dispose the app epoch default to clearing the
dependency SourceFile cache as well; warm sessions can pass `preserve` when they prefer lower CPU on the next Program
construction over immediate heap reclamation.
The graph indexes retained outcomes by materialization policy, query kind, query key, locus key, and epoch key. That
makes reuse and invalidation a graph-owned storage concern instead of a backward scan over answer history. Source-file
invalidations, query-family disposal, and materialization-policy cleanup should enter through those claim-graph indexes
before any API adapter considers holding its own answer cache. Treat the graph as the lazy storage layer immediately
before API serialization: answerers should enter a claim, choose a materialization/disposal policy, then let the graph
decide whether the produced value, query-local products, and observed kernel effects survive the answer. The graph can
also serve retained small answers from that storage when policy allows it. That path is intentionally narrow: answer
objects are retained only when the active profile opts in, the materialization policy is in that profile's retained
answer policy, and the approximate payload is below the per-answer profile budget. Retained answer values also have a
graph-level byte budget: when the budget is exceeded, the graph drops old DTO values but keeps the claim records,
payload shape, nested composition, and disposal telemetry. Larger or semantic-stateful answers should keep their
durable facts in the kernel and use claims for shape/effect telemetry rather than duplicating public DTOs.
Nested query claims are dependency edges, not only trace rows. If a retained child query outcome is disposed by a
source/project epoch, query-kind cleanup, materialization-policy cleanup, or retention budget, the graph also disposes
retained ancestor answers that were composed from that child. This keeps summary, overview, batch, and orientation
answers from outliving a nested answer they depended on while still allowing independent child answers to remain
reusable when only the parent is pruned. Active materialization frames are never removed out from under the answer that
is currently being produced.
The lazy claim handle itself must not become another answer cache. A resolved `QueryAnswerClaim` can be reread only
when the graph retained the answer value under profile policy; otherwise it is a read-once handle over the graph-owned
node. If invalidation or retention-budget disposal removes the node, later reads fail instead of returning a stale DTO
from a wrapper object.
Payload size is estimated by a bounded object walk, not by row count alone. This matters because summary-shaped DTOs can
contain broad nested objects even when they do not expose a top-level `rows` array; retention policy must see that bulk
before deciding whether a small-answer cache hit is honest.
Retained-answer hits still run answer-side disposal hooks. Reuse should avoid recomputation, not bypass explicit
transport policy such as a later `dispose-app` routed query that must reclaim a currently cached app epoch before
returning a previously shaped answer.
The answer boundary can also veto retained-answer reuse when materialization is itself the requested side effect. A
`retain-app` routed query with no compatible cached app must reopen the app world even if a small previous answer DTO is
available in the claim graph.
Locus and invalidation are intentionally separate. A cursor answer may have an exact `cursor:*` locus, but its validity
depends on broader epoch keys such as the containing `source:*` and `project:*` keys. `SemanticApp.ask(...)` assigns
those keys before entering the graph, and long-lived adapters can call `SemanticApp.disposeQueryClaimsForSourceEpoch(...)`
when a source file changes. Source-file invalidation includes the project epoch as well as the source epoch because
project-wide answers and sibling-file answers can depend on a changed resource, route, registration, or type surface.
This keeps file/cursor invalidation policy behind the claim graph instead of making every transport adapter scan
retained answer history or understand public query keys.
Runtime-level routed answers now use the same source-epoch discipline. `SemanticRuntime.answerAppQuery(...)` and
`answerAppQueries(...)` canonicalize source-file loci to project-relative paths before they compute query keys, locus
keys, and epoch keys, then `SemanticRuntime.disposeQueryClaims(...)` can prune both runtime-level routed claims and
cached-app claims for a project or source file. That method intentionally disposes only query outcomes; retained app
products remain an app-epoch concern and should be reclaimed with `clearAnalysisCache()` when source edits require a
new world.
Runtime disposal request handling now goes through a named query-claim disposal strategy before it reaches the graph.
That strategy resolves the public scope, manual/project/source invalidation kind, canonical epoch keys, query-kind
filters, materialization-policy filters, and profile filter in one place. The graph still owns matching and disposal;
the strategy is the adapter-facing policy translation layer that keeps public APIs from rebuilding claim-graph filters
ad hoc.
`QueryClaimGraph.disposeWithSummary(...)` is the policy-shaped invalidation result. It reports the selected graph
profile, retention kind, requested policy filters, candidate/matched/disposed record counts, and the disposed state plus
materialization-policy mix. Public control-plane disposal should surface those summaries rather than flattening
source-edit/session cleanup into one global count; otherwise adapters cannot tell whether they invalidated runtime-level
routed answers, cached-app answers, or the wrong profile.
Graph snapshots also report retained root/child counts, maximum nested answer depth, and the distinct query-kind, locus,
epoch, materialization-policy, and outcome-key buckets held in the graph indexes. Those counts are the cheap x-ray for
long-lived adapters: if source invalidation or projection cleanup looks wrong, first check whether the graph actually
retained the expected epoch/locus/materialization buckets before adding adapter-local caches or scans.
Snapshots also expose retained query/locus/epoch/outcome key character mass. Query keys are API identity, not durable
semantic truth; if a broad orientation or authoring batch starts retaining large key strings, compact the query identity
policy at this layer before adding transport-side caches or suppressing useful claims.

The graph also measures answer-boundary side effects when the caller supplies a cheap kernel snapshot reader. Kernel
deltas on records are inclusive because composed answers can call nested queries, so graph snapshots separate root
query deltas from all-claim deltas. Use the root totals for broad cost accounting and all-claim totals for spotting
nested composition pressure. When the caller also supplies a kernel mark/dispose boundary, the graph can discard
answer-local kernel records and sidecar details after the public answer is shaped if the active inquiry profile does
not retain materialized products. The claim snapshot still records the work and the discarded counts, so telemetry sees
the CPU/product cost without forcing every cursor/MCP answer to become session-lifetime kernel state. If a query only
needs answer-local TypeChecker facts, this is the pressure surface that should decide whether those facts stay
query-local, become hot retained details, or graduate into durable kernel products.
Kernel disposal summaries include discarded handle-character mass as well as record/detail counts. Handle strings are
one suspected memory carrier in large one-off answers, so retained-memory reports should compare root handle deltas,
disposed handle characters, and net handle characters before assuming product/detail counts tell the whole story.

Diagnostic answers now expose one concrete inquiry-algebra lever: `diagnosticProjection`. Overview-style queries use
`available-products` when they need summary signal without answer-time TypeChecker projection, while explicit diagnostic
queries can use `type-projection` to run weak owner/member analysis. The graph now measures those answer-time TypeChecker
products and disposes them for the `lsp-diagnostics` profile, while fixture/authoring profiles may retain them when the
pressure run needs to inspect the products. The deeper remaining frontier is to make more of those diagnostic type
projections answer-local from the start instead of briefly publishing durable kernel products just to dispose them at
the boundary.

## Design Pressure

Inquiry is where answer shape is separated from produced facts. Kernel records can preserve that a materializer was
partial or blocked; an inquiry answer can expose the seams, continuations, source context, and graph handles needed by later
presentation or policy layers without changing what the kernel facts mean.

Compiler and editor pressure comes from integrating HTML parsing, attribute classification, expression parsing, and
instruction lowering. Those flows need to serve batch-like compiler questions and live IDE questions from the same
semantic substrate. Cursor and range loci, recovery frontiers, candidate sets, explanation paths, and pagination should
be modeled here or in answer envelopes, not smuggled into kernel claims or compiler products.

Projection lanes are intentionally consumer-neutral. A transport or presentation adapter can map LSP, Atlas, tooling, a visual
workbench, diagnostics, AOT, or agent-facing APIs onto compact, detail, explanation, source-context, or graph
projections outside the intent taxonomy. Those are projections over the same substrate, not separate meanings of the
substrate.

Inquiry does not carry a parallel intent ontology. Query shape, locus, projection, basis, and continuation kind should
be enough for callers to understand what an answer attempted. If a relation starts carrying real app meaning across
materializers, promote it into kernel vocabulary and signed claim predicates rather than only naming it in answer
metadata.

This layer should not encode ranking, actionability, UI copy, transport defaults, or consumer personas. Materializers
should preserve what they observed, what they could derive, and which seams remained open. Inquiry answers expose
enough typed shape for later policy layers to decide how much to show, how to rank it, which continuation is useful
next, and whether a caller can act on it.

`template-completion.ts` is the concrete completion answer surface. It deliberately assumes cursor-to-template-site
classification already happened: the query supplies a site kind and optional product handles for binding scope,
resource scope, selected resource definition, expression parse, active value site, and optionally a checker-projected
member owner type. The answer spends those typed details and reports missing inputs rather than re-scanning templates
or inventing candidates. Member completion after `foo.` can derive the member-owner type from the parser's closed owner
subtree or, when the cursor is inside a larger expression, from an offset-aware evaluator walk that preserves lexical
arrow scopes. Listener expressions get their `$event` slot from the runtime binding scope, so `$event.detail` and
listener callback parameters are TypeChecker projections over Aurelia's listener semantics rather than answer-local
string handling. Expression-member queries also carry the active value-site product, so bindable target types can
contextualize arrow parameters when the target surface exposes a callable type. That is an answer-local type
projection over the same shared type-shape access path used by repeat destructuring, not runtime execution and not
completion ranking. Static
attribute-value completion stays honest about ownership: plain static platform values are classified from HTML/syntax
products without durable value-site publication, while platform attributes that actually enter interpolation publish
`plain-attribute-interpolation` sites whose expression holes use the normal expression completion path, finite checker-backed bindable domains can offer literal `attribute-value`
candidates, open-ended checker-backed scalar bindables are expected-empty completion sites, inline multi-binding
custom-attribute values can offer bindable segment-name candidates from the resource definition, and router `load`
and `href` primary values can offer `router-route` candidates from the app's modeled `RouteConfig` products while
remaining open-ended because framework `href` can also represent external URLs. Static i18n `t` values can offer
`i18n-translation-key` candidates from `I18nTranslationKey` products materialized out of closed
`I18nConfiguration.initOptions.resources` data. Custom-attribute
segment values that resolve to a bindable report bindable-domain pressure rather than blaming the whole custom
attribute. Built-in template-controller primary values use `template-controller-semantics.ts` to distinguish open
framework domains such as `case="..."` from secondary bindables such as `fall-through`; open primary values are
expected-empty completion sites rather than missing finite domains. Remaining custom-attribute primary-value and
custom template-controller grammars still report bucketed value-domain gaps until their domain has a real candidate
lane.

`templateCompletionQueryForCursor` is the cursor adapter over the horizontal compiler/runtime path. It consumes a
materialized `TemplateResourceRuntimeAnalysisEmission`, picks the smallest HTML/value/scope products around the cursor,
classifies the site, returns the same product-handle `TemplateCompletionQuery` used by the answer, and carries the
selected bindable, selected expression-member name, and expression frontier for cursor-inspection APIs that should not
pay completion candidate collection cost. Closed member tokens and member frontiers deliberately share the same owner
type derivation path: completions need the owner surface, while hover/definition can resolve the exact authored member
token from that same owner type without rescanning template source. Empty
start-tag attribute positions, such as `<my-element |>` before an authored attribute product exists, are still
classified from the materialized element and template-source span rather than by rescanning project source. That keeps
cursor-sensitive editor/tooling entry points above the compiler products without creating a second completion path.

Interpolation completion adds one extra answer-local projection over the same value-site product: when a text value
contains multiple incomplete `${...}` holes, the cursor adapter reparses that product with an active offset so the
parser publishes the hole under the cursor. The compiler's batch interpolation product remains unchanged; inquiry only
selects the active frontier needed for the current answer. The value-site product itself does not make the whole text
or attribute value an expression-completion site: cursor classification only enters expression inquiry when the cursor
is inside an interpolation hole, command-owned expression, or expression/member frontier span. Plain text and plain
attribute values remain non-expression sites even though the compiler may have materialized interpolation parse
products for the surrounding authored value. A plain attribute value with no value-site product is an expected empty
completion site, not an `attribute-value-site` missing-input row; a dangling value-site handle without details remains
pressure. Completed value-converter and binding-behavior names are also classified
by their authored name spans, not only by parser frontiers, so existing tail names can use the same resource-candidate
lanes as incomplete `|` and `&` continuations.
An interpolation frontier that only expects the final interpolation-hole close is not a completion blocker: Aurelia's
runtime parser can consume that final EOF-style hole, so expression-scope completion should still read binding scope
while cursor-info can expose the strict authoring diagnostic signal.

`pnpm --filter @aurelia-ls/semantic-runtime pressure:cursor-loci` is the current batch pressure view for this layer. It
samples bounded template cursor loci, answers completion through the same cursor adapter, compares that substrate answer
with the public `SemanticApp.ask({ kind: TemplateCompletions })` path, compares cursor site/value-site classification
with `SemanticApp.ask({ kind: TemplateCursorInfo })`, and prints aggregate site kinds, outcomes, completion pressure
classes, value-site kinds, candidate lanes, public-API mismatches, cursor-info source coverage, hover/navigation
targets, diagnostic signals, LSP envelopes, value-domain gaps, and bucketed missing-input reasons without paths, source
text, or candidate names. Use it for LSP-shaped pressure before assuming a gap belongs to parsing, scope construction,
resource lookup, API wrapping, or domain-specific value completion. `SEMANTIC_RUNTIME_CURSOR_PRESSURE_ROOTS` accepts a
path-delimited list of absolute or workspace-relative roots, so a single fixture or transient external checkout can be
sampled without changing the script. The known `fixtures/authoring` and `fixtures/pressure` collection roots expand to
their child fixture projects; `SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_DISCOVERY` mirrors
`SEMANTIC_RUNTIME_PRESSURE_PROJECT_DISCOVERY` for monorepo/package-tsconfig roots. The script requests paged runtime
summary rows explicitly, because `runtime.summary()` defaults to no project rows for large workspaces. Use
`SEMANTIC_RUNTIME_CURSOR_PRESSURE_OUTPUT=aggregate` for broad collection pressure and
`SEMANTIC_RUNTIME_CURSOR_PRESSURE_INPUT_LIMIT` for a cheap first canary. Diagnostic probes are scoped back to the
compiled resource's own source spans before comparing direct substrate answers with the public API, so same-file
multi-template diagnostics do not create false template-resource mismatches. `SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_SHAPES`
can scope that sampling to app-shaped, resource-library, Aurelia-package, or non-Aurelia project frames; if omitted,
the cursor script uses `SEMANTIC_RUNTIME_PROJECT_SHAPES` when present and otherwise samples all booted projects. Both
env vars accept exact runtime shape tokens: `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, and
`non-aurelia`. The
public API comparison passes the sampled app's project key on purpose, so candidate mismatches point at cursor/API
wrapping drift rather than at the direct runtime facade choosing a different cached app-world that also owns the source.
Plain static HTML attribute values with no value-site product are classified as
`expected-empty:plain-html-attribute-value` in that pressure view; if those rows appear as unexplained misses, the cursor
classifier has drifted rather than the completion domain being incomplete.
The
command opts into the authoring-template lane by selecting admitted template
source files per project, with the older per-project template cap only as a fallback when no template source file can be
selected. Hydrated app/runtime templates remain the default app-topology surface; standalone resource-library templates
are compiled only when an authoring/LSP inquiry asks for those files. This keeps app facts honest and prevents broad
monorepo sampling from turning "all possible component templates" into an accidental app-world hydration claim.
Cursor pressure deliberately separates missing semantic-runtime substrate from weak application typings. Completion
answers still carry `expression-member-owner-type:any`, `index-signature-only`, and `no-members` as missing inputs so
hover/completion callers can explain why member candidates are absent, but the pressure script classifies those rows as
`weak-type:*` when the expression-member site has no candidates. Treat that as typing or value-shape pressure in the app
or plugin surface unless a lower-level projection lost a concrete TypeChecker member.
The public cursor-info API now turns those weak owner surfaces into diagnostic rows with coarse suggestion kinds. This
keeps completion honest while giving future diagnostics/code actions enough structure to recommend stronger owner types
or explicit properties. The diagnostic row carries the owner type projection origin and an action-target envelope, so
pressure can distinguish TypeChecker/app-typing weakness from synthetic template-semantics weakness while also seeing
whether a future code action should target an owner type, a scope slot, or the authored expression. Missing owner-type
rows such as `missing-slot-type` should remain diagnostic pressure: they say the template scope did not provide enough
TypeChecker footing for the owner expression, not that completion should invent members.
Cursor-info also reports `missing-expression-member` when the selected member token is absent on a known owner type.
This is distinct from weak-owner completion pressure: the owner was found, but the authored member does not belong to
that projected surface. String index signatures can still produce synthetic selected members, but number-only indexed
access cannot. That distinction keeps primitive and array-like owners from looking like broad records during hover,
diagnostics, and future code-action planning.
Diagnostics are not cursor-only. Cursor loci remain the highest-pressure way to force template/resource/value-site
selection to be exact, but file/app loci now aggregate the same cursor-info diagnostic substrate through
`SemanticAppQueryKind.TemplateDiagnostics`. Use that batch answer when the product question is editor diagnostics, CI,
or agent review over a whole template file; use cursor pressure when the question is whether a specific source offset
selects the right semantic site.
Cursor-info also carries template compiler diagnostics at the active cursor offset. Some malformed or recovery-heavy
source positions are not completion sites and may still classify as `unknown`, but they should surface the exact
framework-code diagnostic and syntax-rewrite suggestion instead of becoming a silent completion miss.
Cursor-info also honors diagnostic projection as an inquiry cost switch. With `type-projection`, it can surface
TypeScript overlay diagnostics whose mapped authored source contains the cursor, using the same public overlay
diagnostic policy as file/app `TemplateDiagnostics`; with `available-products`, it stays on already materialized
semantic rows. Keep this as one cursor-info diagnostic lane so hovers, MCP explanations, and LSP diagnostics agree on
which authored span owns the issue.
For app/file diagnostics, source text should be loaded from the admitted source-file address using workspace-root
semantics. The selected app project may be nested below the workspace, while compiled template resources can also come
from source-shipped package dependencies; resolving every address relative to the app project silently hides those
member-token diagnostics.
Resource-library pressure should use the same authoring-template lane for file/app loci that cursor pressure uses for
cursor loci. Selecting admitted template source files keeps diagnostics and value-channel seams visible for standalone
components without reclassifying a library package as an app runtime entrypoint.
