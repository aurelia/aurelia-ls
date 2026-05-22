# Semantic Runtime API

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns the in-process API boundary for opening an Aurelia app with the semantic runtime. It is a library
surface, not a daemon, CLI, or snapshot format.

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
template completion, cursor-info, and diagnostic query handoff, while the runtime facade keeps only app opening,
app-level dispatch, and direct cursor-locus convenience methods.
App-query identity, locus, and invalidation epoch keys live in `app-query-identity.ts`. Keep reuse/invalidation keys
there rather than rebuilding private string keys in the MCP adapter, scripts, or individual answerers.
Routed app-query defaults and retention choices live in `app-query-policy.ts`: default inquiry profile, source-file
selection, authoring-template opt-in, minimum analysis depth upgrades, materialization-policy overrides, and
`appRetention` disposal decisions are API policy, not transport adapter behavior.
The app-query catalog also exposes `runtimeBoundary`: `runtime-static`, `project-frame`, `static-evaluation`, or
`app-world`. Keep that boundary honest whenever adding a query kind. It is the public signal that lets MCP/LSP-style
adapters ask cheap static/project/evaluation questions without accidentally paying for full app construction.

## Shape

Use `createSemanticRuntime(...)` to boot a workspace, then `runtime.openApp(...)` to materialize the current app-world
view for one project. `SemanticApp.ask(...)` accepts a small query envelope for app facts; direct cursor-locus
convenience methods such as `runtime.templateCompletions(...)`, `runtime.templateCursorInfo(...)`, and
`runtime.templateDiagnostics(...)` live on the runtime facade because they may need to select or reopen an app before
answering.
Default `openApp()` uses `runtime-topology`, the cheapest complete app-world tier. LSP-style template convenience
methods default to `binding-observation` because those answers intentionally need observer/data-flow diagnostics and
weak-member pressure. Generic adapters should read `runtime.appQueryCatalog()` and open the catalog row's
`minimumAnalysisDepth` instead of treating the deepest tier as a default.
Generic adapters that only need one answer should prefer `runtime.answerAppQuery(...)` over manual
`openApp(...).ask(...)`. That routed API reads the app-query catalog for default depth, derives an inquiry profile from
the locus when the caller did not supply one, records a runtime-level routed answer claim before returning, and disposes
app epochs for recompute-friendly profiles such as MCP orientation. When that recompute-friendly default disposes the
app epoch, it also clears the process-local TypeScript dependency SourceFile cache; pass
`typeSystemDependencyCacheClearPolicy: 'preserve'` when a session intentionally wants to keep the next TypeChecker
Program warm. Long-lived adapters can still force `appRetention: 'retain-app'` when they intend to reuse the opened app
world, or `appRetention: 'dispose-app'` when a public transport must reclaim even a previously cached compatible app
epoch after a one-off answer.
When a client needs several related app answers, prefer `runtime.answerAppQueries(...)` over issuing several routed
queries from the transport. The batch opens the smallest app-world depth satisfying every child query, compiles the
union of child cursor/file authoring templates by default, records one runtime-level batch claim, and lets each child
answer enter the app-owned query-claim graph with its own materialization policy. That gives MCP/LSP-style orientation
a lazy answer ledger without adding an adapter-local cache or repeatedly opening and disposing the same app epoch.
The batch result keeps app construction profiles and app-owned query-claim profile snapshots opt-in. Low-token MCP/LSP
orientation should leave `includeAppProfile` and `includeAppQueryClaimProfiles` unset, then use
`analysisCacheOverview(...)` for deliberate cache inspection. Profiling scripts should pass those flags when they need
one-off app-open cost after disposal: the compact profile includes app-level phases, nested
static-evaluation/type-system/resource/template phase summaries, static-evaluation source-host/source-composition
counters, TypeSystem compiler-option shape, Program root/source-file composition, compiler-host cache counters,
aggregate template expression type-cache counters, and opt-in phase memory deltas because those are memory/CPU
attribution facts rather than ordinary app-building guidance.
The batch value owns compact `displayText` too. It lists each child query kind, materialization policy, and child answer
summary, and explicitly reminds callers that profiling fields are opt-in. Public transports should forward that text so
one batch can be both the low-token human orientation and the structured query result.
When phase-kernel telemetry is enabled, those same phase rows also carry compact kernel deltas and optional product/detail
breakdown rows, so disposed-app answers can explain which template or runtime phase created the answer-local products
that the claim graph later reclaimed.
Static app-query answers that do not require app-world construction, such as `AuthoringCatalog`, use a runtime-level
query-claim graph. That keeps small answer reuse behind the same inquiry-profile policy as opened-app answers
without forcing an app epoch into the cache. Routed app-query claims use the same runtime-level graph to retain answer
shape and cost telemetry after `answerAppQuery(...)` has disposed the opened app; the app-owned query graph still owns
nested app-session claims while the app epoch is alive.
Small retained DTO values are bounded twice: profiles choose which materialization policies may retain values, and the
query-claim graph enforces both a per-answer byte limit and a total retained-answer byte budget. When the value budget
is exceeded, claim rows remain available for reuse diagnostics and invalidation, but old public DTO objects are dropped
so a long MCP-style orientation session does not turn the graph into an unbounded answer cache.
App-world-free app-query answers stay at the runtime boundary. `SourceFiles` can answer from the booted project frame,
`AuthoringCatalog` can answer from static catalog data, and `UnresolvedModules` can answer from read-only Aurelia
static evaluation without emitting kernel records or opening an app epoch. `answerAppQuery(...)` and
all-app-world-free `answerAppQueries(...)` batches therefore avoid TypeSystem construction, template compilation, and
app-epoch disposal. When every child query is runtime-static, the batch stays workspace-level too: it does not select a
project, and the batch result has `projectKey: null` and `analysisDepth: null`. Project-frame and static-evaluation
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
Direct static facade answers such as `runtime.authoringCatalogView(...)`, `runtime.authoringGuidance(...)`,
`runtime.authoringRecipePlan(...)`, and `runtime.appQueryCatalog(...)` are also claim-backed. Public adapters should use those runtime methods rather than the
raw `readSemantic*` catalog functions when the answer crosses a transport boundary, so retention, reuse, and cache
overview all observe the same query-outcome layer. Inside an already-entered claim boundary, use the focused raw answer
builder instead of calling another public facade method; otherwise an implementation detail can create an unrelated
default-profile claim even though only one public answer crossed the API boundary.
`AuthoringGuidance` is the public app-building bridge over the authoring catalog. Its compact result includes
bounded principle rows, bounded decision rows, focused recipe rows, and follow-up semantic-runtime surfaces, so MCP-style callers can answer
common code-economy questions without exposing Atlas memory or re-reading recipe plans. Feature-goal matching and
recipe choreography live in `authoring-guidance-feature-goals.ts`; keep matching/ranking policy there instead of growing
the main guidance reader. Decision rows should stay
framework-grounded and taste-keyed: use them for choices such as DI state versus service ownership, direct
state/domain template access versus view-model adaptation, ID versus object component handoff, ordinary getter
observation versus `@computed` metadata, form value-channel ownership, route-selected state, and router `activeClass`
versus `load.active` state handoff. External-library, host-object, worker, and serialization boundaries belong in the
same guidance layer: keep app state inside Aurelia observation by default, then use `ProxyObservable` escape facts only
for explicit raw-object handoff boundaries. Decision follow-up surfaces are normalized so `app-query-batch` appears
before app-query-kind rows such as binding summaries, route-context rows, or state rows; public adapters should batch
those related reads instead of issuing transport-local one-off query chains. Compact answers default to the same principle/decision row counts used by
the text channel; pass `principleLimit` or `decisionLimit` when a caller needs more rows without switching to
`detail: "recipes"`. Compact rows keep code-shape summaries, stable keys, counts, and follow-up surfaces, while recipe
membership arrays, expanded operation families, expected-effect kind arrays, source-role arrays, and preference rows stay
behind `detail: "recipes"` or `AuthoringRecipePlan`.
`AuthoringCatalog` has separate public-cost tiers. `catalogView: "overview"` is the default map: it keeps recipe
titles, summaries, support state, specificity, and scalar counts, but omits operation-kind arrays, lineage arrays,
taste-value keys, expected-effect kind arrays, and source-plan summaries. `catalogView: "recipes"` is the recipe
comparison surface and expands those recipe contract fields while still omitting row-level preference and expected-effect
contracts. `catalogView: "full"` is for local export/debugging, not a default public MCP answer.
The compact catalog views also own `displayText`, so public adapters can show recipe keys, file/effect counts, and the
right next tool without reconstructing authoring policy outside semantic-runtime.
`AuthoringRecipePlan` keeps concrete source text and row-level expected-effect contracts opt-in, but compact answers
still expose `expectedEffectHighlights` at plan and step level. Those highlights are the small semantic promises an MCP
client can use before asking for full contracts, such as plain getter observation, direct state reads, state-method
lookup observation, service handoffs, form value-channel/matcher facts, and route topology. Highlight selection should preserve breadth across effect
kinds, so routed recipes include a route promise in compact text instead of being dominated by binding or getter rows.
For component handoff, keep the declared type and the effective TypeChecker shape separate. A nullable object bindable
such as `Product | null` should still surface as an object-shaped input for orientation while preserving the nullable
declared type for assignability, diagnostics, and code actions.
Opened-app convenience answers such as `app.summary()`, `app.openSeams()`, and `app.bindingDataFlows(...)` are
claim-backed too. They re-enter `SemanticApp.ask(...)` when called outside an active answer materialization, so direct
library use and routed transport use share the same answer-boundary claim graph instead of creating a second untracked
projection path.
One runtime instance memoizes opened app-worlds by project key; create a fresh runtime for an edit/reopen cycle that
needs new source admission.
`runtime.summary()` is the cheap project-selection answer: it returns project shape/analysis rollups, the default app
candidate key, app candidates with root directories, and opt-in paged project rows. It defaults to no project rows so
large monorepos stay summary-first. Use it before `openApp(...)` in monorepos so callers can open a specific app project
instead of paying broad app-world construction by accident. It is also claim-backed now, because project-selection
answers are public query outcomes; cache inspection and disposal APIs remain direct control-plane calls so they do not
distort the query graph they are inspecting or pruning. Pass `inquiryProfile` when a long-lived adapter wants that
first project-selection answer counted with the same consumer lane as later routed app answers. Scripts or adapters that
need to iterate project rows must request `projectPage.size`; otherwise they should rely on the rollups and
`appCandidates` only.
`runtime.analysisCacheOverview(...)` is the session-retention x-ray for long-lived adapters such as MCP. It reports
runtime-level static and routed-app query claims, cached app epochs, their construction inquiry profile/top phases, per-consumer
query-claim graph telemetry, the small process-local project compiler-options cache, current process memory, and
optional kernel-density breakdowns. App-world cache identity is semantic shape
(project, depth, and authoring-template scope), not query-retention profile: the same app epoch can answer MCP, LSP,
fixture, AOT, and exploration queries while `SemanticApp.ask(...)` records those answers in separate profile-shaped
query-claim graphs.
The compiler-options cache is reported separately from TypeSystem dependency SourceFile caching because it retains only
tsconfig/path-mapping/root-file shape and config diagnostics by project root, then returns cloned options, root filenames,
and diagnostic rows to TypeScript consumers. Treat it as boot/input read amplification visibility, not as app-world
semantic retention.
Ordinary TypeScript diagnostics exposed through `TypeScriptDiagnostics`, `TypeScriptDiagnosticSummary`, and unified app
diagnostics are Program/tsconfig correctness rows. They intentionally do not include LanguageService suggestion
diagnostics, quick fixes, organize-import actions, or refactor edits; those are a future LSP/code-action surface that
should reuse the same project epoch without changing the meaning of the repair-oriented diagnostic overview.
Query-claim records distinguish the exact answer locus from invalidation epoch keys. For example, a cursor query uses a
cursor-shaped locus for reuse/history but also depends on its source-file epoch; adapters that keep a runtime session
open across edits should call `runtime.disposeQueryClaims({ sourceFilePath })` after a source change when they only need
to clear answer-outcome storage, or `runtime.clearAnalysisCache()` when the edit makes retained app-world products
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
Treat the workspace
`KernelStore` as session-lifetime for boot/source records and dependency declaration cache state. App-world products now
have an explicit reclaim boundary: `runtime.clearAnalysisCache()` drops cached app epochs and disposes kernel records,
product details, hot details, and their record-handle character mass back to the first app-construction marker while
leaving the booted workspace available for reuse. The TypeSystemProject compiler-host source-file cache is
process-local because it trades memory for much
cheaper repeated Program construction over dependency and library declaration files; pass
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
app epochs, workspace kernel mass, process memory, TypeScript dependency-cache policy, compiler-options cache counters,
query-claim retention, and whether high-cardinality breakdowns were omitted; clear text reports reclaimed app epochs,
query claims, kernel records/details/handles, and dependency-cache buckets. Public adapters may add their own
server-session wrapper text, but they should not reinterpret semantic-runtime cache telemetry locally.
Restart the runtime session when
source admission, dependency declarations, or project
discovery must be rebuilt from disk. Until app-world handles are salted by request shape, opening a non-compatible app
epoch for a project
that already has cached app records clears cached app epochs before rebuilding; this prevents shallow-to-deep upgrades
from duplicating kernel handles in one workspace store.

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
`TemplateCompilations` returns a `compilationLane` of `app-runtime` or `authoring` so callers can distinguish hydrated
app templates from source-file-selected authoring templates. Use `authoringTemplateLimit` only as an explicit pressure
budget or fallback when no source file is known.

Cursor-locus callers can skip that manual open step by asking the runtime facade directly:

```ts
const cursorInfo = await runtime.templateCursorInfo({
  cursor: { filePath: 'packages/my-package/src/my-element.html', line: 12, character: 18, offset: 340 },
});
```

`templateCursorInfo(...)` and `templateCompletions(...)` first reuse any already opened app-world whose compiled
template owns the cursor source. That preserves app context for templates that entered the compiler world through an
app dependency or plugin package. If no opened app contains the cursor source, the facade selects the owning project,
enables authoring-template compilation by default, and opens an authoring world whose default source selection is the
cursor file. App callers can still pass `projectKey`, `includeAuthoringTemplates: false`, explicit authoring source
options, or `authoringTemplateLimit` when they need different scope or budget behavior.

Rows default to compact source labels and counts. Opaque kernel handles are intentionally opt-in through
`SemanticRuntimeDetail.Handles`; they are useful for exact in-process follow-up navigation but too noisy for initial
answers. Paged app rows use offset cursors for this in-process facade. Earlier semantic-string cursors looked nicer but
quietly assumed every row projection had a unique display key, which is false for repeated controller and binding
shapes; exact follow-up navigation should use handles instead of cursor text. A paged query returns `partial` only
when the returned page has a `nextCursor`; a caller that drains all pages should see a final `hit`, even when the last
page is smaller than the total row count. Cursor-scoped template completion answers may carry an opaque continuation
cursor from the completion inquiry because the candidate set is not a durable row table.
`OpenSeamSummary` reads the same unpaged seam row set as `OpenSeams`, then clusters by seam kind and reason-kind
signature. Use it before raw seams when repeated runtime-dependent facts would otherwise make the first page look like
many unrelated issues. Both raw seam and summary answers own compact `displayText`: raw rows report seam-kind and
reason-kind rollups plus a few samples, while summary rows report dominant clusters and source-file coverage. Public
adapters should forward that text before asking for handle detail.
`AppOverview` is the compact app-opening answer for MCP and other AI callers. It composes summary, topology counts,
diagnostic clusters, and open-seam clusters without making adapters reconstruct that answer locally. Compact
authoring-orientation fit is available through `includeAuthoringOrientation: true`, but it is opt-in because real apps
can have many repair clusters and capability rows. The topology child read uses a compact summary projection instead of
asking the full `AppTopology` row DTO and summarizing afterward. Call `AppTopology` directly when row families or
bindable value type surfaces are needed; those surfaces remain opt-in through `includeTypeSurfaces`, keeping overview
answers from spending answer-local TypeChecker member projections or retaining broad topology DTOs.
The overview result owns a short `displayText` that names app shape, route counts, depth-aware binding projection
availability, pressure status, and the next low-token query family. Public adapters should forward that text instead of
rewriting app-orientation guidance locally. At `runtime-topology` depth, binding text should report runtime binding
presence without presenting zero value-channel/data-flow rows as absence; callers that need those facts should reopen at
`binding-observation`.
When authoring orientation is included, overview repair clusters preserve planning readiness, action-target source
coverage, and runtime boundary/intent kind buckets. That keeps first-read AI adapters from flattening router/evaluator
runtime-policy seams into ordinary app-source fixes.
`RouterOverview` does the same for route/viewport-oriented hand-tests: it groups route config, route context,
viewport/agent, typed navigation, route tree, recognized route, and router issue rows behind one semantic-runtime
answer while preserving the individual child-query summaries. Because it can sample several independent row families,
`SemanticApp.routerOverview(...)` defaults to `rowPageSize: 0` for summary-first answers and takes `rowPageSize`
instead of a cursor-bearing page when samples are needed. Use the specific route query kinds, such as `Routes` or
`ViewportAgents`, when a caller needs cursor paging for one family. Router overview also owns `displayText` so public
clients can see the route/runtime-tree counts, issue state, and row-sampling policy before opening raw router rows.
`readSemanticAppQueryCatalog()` and `runtime.appQueryCatalog()` expose the supported app query vocabulary with group,
result-role, paging/detail, source-file, cursor, router-product, and minimum analysis-depth metadata. `pagingKind`
distinguishes ordinary offset row cursors from router row-sample sizing and cursor-locus continuations. Public adapters
such as MCP should use `minimumAnalysisDepth` for default generic-query opening so first reads can stay at
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
const authoringCatalog = runtime.authoringCatalog();
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
const stateStores = app.ask({ kind: SemanticAppQueryKind.StateStores });
const stateIssues = app.ask({ kind: SemanticAppQueryKind.StateIssues });
const validationIssues = app.ask({ kind: SemanticAppQueryKind.ValidationIssues });
const fetchClientIssues = app.ask({ kind: SemanticAppQueryKind.FetchClientIssues });
const dialogIssues = app.ask({ kind: SemanticAppQueryKind.DialogIssues });
const configurationIssues = app.ask({ kind: SemanticAppQueryKind.ConfigurationIssues });
const evaluationIssues = app.ask({ kind: SemanticAppQueryKind.EvaluationIssues });
const observationIssues = app.ask({ kind: SemanticAppQueryKind.ObservationIssues });
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
const authoringOrientation = app.ask({
  kind: SemanticAppQueryKind.AuthoringOrientation,
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
The API also threads the app emission's modeled `RouteConfig` product handles into the completion inquiry. This lets
`load="|"` answer from router facts as `router-route` candidates instead of treating the value as an open string or
re-scanning source for route-like names.
Completion answers own compact `displayText` with site kind, candidate count, template lane/path, frontier/missing-input
state, and a small candidate preview. Public clients should forward that instead of turning candidate rows into prose in
the adapter.
`TemplateCursorInfo` uses the same cursor-to-template selection and value-site classification path, but returns the
semantic site under the cursor rather than completion candidates: site kind, HTML node/attribute, active value site,
selected definition, selected bindable, selected expression member, member-owner type, parser frontier, and template
lane. It is the shared footing for future hover, definition, diagnostic, and explanation APIs. Bindable selection is
source-bearing when the resource definition has authored bindable metadata, so go-to-definition can later target the
bindable declaration instead of stopping at the owning custom element or custom attribute. Expression-member selection
keeps the owner type available for completion and diagnostics, but also resolves the exact authored member token when
the cursor is on a closed member name; hover/definition can then target the member declaration rather than only the
owner type. The owner type row deliberately exposes both the template/expression projection source and the TypeScript
declaration source. Hover/explanation can point at the projection source when answering "why this type here?", while
definition and owner-type repair planning should prefer the declaration source when the checker can name one.
Those member declarations may come from app source, source-shipped packages, or Program-only declaration files. The API
should surface the source reference when the TypeChecker can name the declaration. If the cursor is on a member of an
index-signature-only owner, cursor-info may report that selected member as an index-signature access with the indexed
value type and no source reference; completions should still treat that owner as non-enumerable weak-type pressure rather
than inventing candidate names.
Index-signature selected members are only synthesized for string-capable indexed access. Number-only indexed access,
such as primitive or array-like keyed reads, must not make arbitrary dot members look real. When a member token is
authored on a known owner type but the owner does not project that member, cursor-info reports
`missing-expression-member` with an inspect or declare-member action target instead of hiding the mismatch behind a
completion hit.
Cursor-info answers also own `displayText` for MCP/LSP-style hover or explanation surfaces: selected HTML/value site,
resource/bindable/member/owner facts, cursor diagnostics, missing inputs, and the next focused tool family.
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
interpolation or a weak/null target observer just to make an autofix look complete. Pressure scripts must summarize
those dimensions without printing app-specific member names or paths, but the API keeps them available for future
code-action planning, such as proposing an interface shape from repeated weak-owner member reads or deciding which
member hints still need value-type inference. Compact authoring orientation keeps app-specific coverage, taste,
capability, applicable recipe-fit, open-reason, and paged repair-cluster classifications, but omits operation rows,
not-applicable recipe rows, repeated ontology prose, individual repair rows, action targets, member hints, and
type-display arrays; request `detail: "handles"` when a repair planner or local diagnostic investigation needs those
editable loci.
Cluster `key` values are compact fingerprints over that structural grouping input. Consumers should use
`actionTargets`, `memberHints`, and source references for explanations or edits instead of parsing source spans back out
of the key. `contract:template-diagnostics` includes a non-effect guard for this because key token economy is part of
the public API shape even though the editable source loci live in structured rows.
Clusters also publish a planning classification: `planKind`, likely `changeDomain`, and `planReadiness`. These are still
semantic repair intents, not edits. A weak owner cluster can now say "strengthen this app-source owner type" and carry
the observed member/type surface, while a router or evaluator seam can stay in the runtime-policy or substrate lane. The
readiness value keeps source edit policy, missing target source, runtime intent, and substrate work distinct so a future
code-action layer does not mistake a high-count cluster for an immediately safe autofix.
Source-bearing open seams publish a `runtime-boundary` action target when the owning seam has an authored address. That
does not mean the edit is known; it means the future planner has a precise source locus for collecting user/product
intent, such as deciding whether a dynamic router `href` is deliberately external, should become a static navigation
target, or should stay runtime-dependent.
The cursor pressure script derives hover targets, navigation targets, diagnostic signals, and compact LSP envelopes
from this same result so feature pressure stays on the shared cursor-info substrate instead of becoming separate source
scans. It labels index-signature selected members as synthetic so those rows do not look like lost TypeChecker
declaration provenance.
Completion pressure classes prefer cursor-diagnostic-backed labels when the LSP envelope already explains a miss or
partial answer, but the script still prints the underlying `missingInputs` counters separately. That keeps actionable
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
Diagnostic rows keep `missingInput` as the primary compact reason and also expose `missingInputs` for the full reason
set. Binding assignment strictness can legitimately carry multiple TypeScript-policy reasons for one authored source
span, so consumers should aggregate `missingInputs` when they need pressure counts or code-action routing.
Binding data-flow rows expose `sourceAssignmentTargetSource` when source writeability was resolved through a
TypeChecker-backed scope/context member. Template diagnostics use the same address for their suggestion action target,
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
categories are arrays, sets, maps, numbers, and nullish. App-registered `IRepeatableHandler`s are future DI/configuration
pressure, so do not broaden this with generic TypeScript iterable or array-like heuristics before that substrate exists.
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
controller/component or named custom-element fallback can resolve on ordinary DOM elements. `SpreadValueRenderer` maps
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
`BindingBehaviorApplications` exposes the positive side of that same materializer: each authored `& behavior`
application that survives resource lookup and bind-time modeling reports its behavior name, owning binding kind,
bind-time phase, argument count, statically known scalar/template literal argument values, target kind/property, source
address, and optional product handles. Use this query when authoring needs to verify that a generated template
materialized a behavior such as validation-html `& validate:'blur'`; keep it distinct from diagnostics, which only
surface rejected or conflicting applications.
Runtime value-converter diagnostics are owned below the API by `RuntimeValueConverterIssue`. Built-in `sanitize`
invocation now spends runtime-html `method_not_implemented` (`AUR0099`) only when the converter resource is visible and
the active container tree has no modeled `ISanitizer` resolver; app-provided sanitizer registrations suppress the
diagnostic. Template diagnostics surface that row as `runtime-value-converter-framework-error` with service-registration
repair guidance.
Current weak-owner and strictness diagnostics use `diagnosticAuthority: "semantic-authoring-policy"`;
runtime-noop assignment rows usually use `diagnosticAuthority: "framework-runtime-behavior"` with
`frameworkErrorCode: null`; exact assignment failures such as `$host` assignment can use
`diagnosticAuthority: "framework-error-code"` on the same diagnostic kind.
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
only iterate the parsed tsconfig diagnostic source set when one exists. Config read/parse/option diagnostics are kept on
the same surface, so public adapters do not need to shell out to `tsc` or build a second Program. It preserves
`diagnosticDomain` and `relatedQueryKind` so callers can drill back into the owning query instead of treating app
diagnostics as a separate semantic layer. The owning diagnostic rows are collected before the app-level page is applied;
do not page a child query and then aggregate it, or pressure summaries will hide high-volume diagnostic classes.
`AppDiagnosticSummary` reads that same unpaged diagnostic row set, then clusters by diagnostic domain, kind, authority,
framework code, severity, and owning query. Use it before raw rows when a large app needs dominant diagnostic classes
rather than the first source-ordered page. App diagnostic row and summary answers also own compact `displayText` with
severity/domain/code rollups and top samples or clusters, so MCP/LSP callers can pick the owning query family before
opening raw rows.
`TypeScriptDiagnostics` and `TypeScriptDiagnosticSummary` are explicit drill-down queries for ordinary TypeScript
errors, warnings, and messages when the unified app diagnostic rows point at `diagnosticDomain: "typescript"`.
`diagnosticProjection` is honored by the diagnostic families that advertise it in the query catalog:
`AppDiagnostics`, `AppDiagnosticSummary`, and `TemplateDiagnostics`. `available-products` limits those answers to
diagnostics backed by the opened app-world and deliberately omits ordinary TypeScript Program diagnostics; leaving the
projection unset or using `type-projection` includes TypeScript diagnostics and may run answer-time TypeChecker
owner/member projection for weak-member diagnostics. The focused TypeScript diagnostic queries are already an explicit
request for Program/tsconfig diagnostics, so they do not downshift to `available-products`.
`AppOverview` uses `available-products` for its nested diagnostic summary so a compact first read does not publish
query-time type products or full Program diagnostics. Explicit `AppDiagnostics`, `AppDiagnosticSummary`,
`TypeScriptDiagnostics`, `TypeScriptDiagnosticSummary`, and `TemplateDiagnostics` calls still default to the repair
surface because those are deliberate diagnostic reads.
Public transport adapters should expose this projection as a caller choice instead of hiding it behind local defaults:
summary/orientation flows can request `available-products`, while deeper repair or authoring flows can request
`type-projection` and accept the measured CPU/memory cost.
The policy for turning weak owner and binding assignment pressure into cursor/file diagnostic rows lives in
`template-diagnostic-policy.ts`. Keep that boundary honest: cursor/template readers should locate source and semantic
context, while the policy module owns severity, suggestion kind, action target, and product-policy wording.
`SemanticRuntime.authoringCatalog()` and the equivalent `AuthoringCatalog` app query expose the static authoring
vocabulary and recipe contract projection. They return operation families, taste axes and values, profiles,
capabilities, operation descriptors, and recipe expected-effect contracts before those contracts are mixed with an
opened app. Use this when the question is "what authoring vocabulary exists?" or "what does this recipe expect?", then
use `AuthoringOrientation` when the question is "what does this opened app currently satisfy?". Catalog taste-axis rows
also split their common values by `primitive-policy`, `observed-shape`, and `derived-reading`, so callers can see
whether an axis has policy-bearing values or only source/framework observations without reopening `ontology.ts`.
`SemanticRuntime.authoringCatalogView({ view })` is the compact public view used by the MCP shell and other
token-budgeted callers. `overview` keeps counts, operation families, compact taste axes, capabilities, and recipe
summaries; `operations` adds operation summaries; `recipes` adds recipe preference counts and taste-value keys while
keeping expected-effect detail to counts and kind sets; `full` returns the complete catalog including row-level recipe
preferences and expected-effect contracts. Keep that projection here rather than reconstructing catalog slices in
adapters.
Capability catalog rows also expose product-level open reasons that are true before app inspection, and operation
catalog rows inherit those reasons from their required capabilities. Use those fields to separate global product gaps
such as package-tooling/source-edit policy from app-specific evidence gaps reported by `AuthoringOrientation`.
Profile rows carry explicit taste preferences for profiles that have a policy-bearing shape, rather than leaving
decorator/convention/registration choices only in prose.
`SemanticRuntime.authoringGuidance({ focus, featureGoal, recipeKey, detail })` is the public app-building bridge for MCP-like callers that
need compact code-shape guidance before generating source. It is still a static authoring answer: it selects principles,
recipe rows, taste-value keys, expected-effect counts, source-plan summaries, and follow-up semantic-runtime surfaces
from the same catalog contracts instead of letting a transport adapter compose product advice or rebuild recipe plans.
`displayText` is the short text channel for MCP clients; it includes principle summaries, concrete prefer cues, and the
first code-shape line for returned recipes so a caller can start with low-boilerplate Aurelia structure before asking
for file text. The structured rows keep the underlying recipe and taste facts available for agents that need more
precision. Use this before `authoringRecipePlan(...)` when the caller asks broadly how to build a clean Aurelia app;
use `recipeKey` when the caller has already selected a concrete recipe. Broad `app-building` guidance defaults to a
small breadth-weighted first-screen recipe set that covers ordinary state-backed forms, searchable table state, route
shells, and routed table/detail structure, then reports candidate/returned recipe counts. Use `featureGoal` to steer
larger catalog, plugin-backed route/form, service-boundary, or mixed app surfaces without broadening the default payload. Pass
`recipeLimit` when a caller needs to compare more recipe rows without jumping to the catalog. Compact answers also
report candidate/returned principle and decision counts; when `featureGoal` matches authored signals, the default
compact budget is intentionally tighter than broad catalog browsing: up to three recipe rows, three principle rows, and
four decision rows, with `recipePlanSequence` carrying source-plan choreography. Matched feature goals filter recipe
comparison rows to requested-signal coverage; call the catalog when comparing the full recipe set. Pass `principleLimit`
or `decisionLimit` for wider guidance
rows without opting into expanded recipe details. Focused compact answers use semantic-runtime-owned principle and
decision order tables rather than fuzzy text matching, so a tiny `focus: "routing"` answer spends its budget on
route-selected state and active-navigation policy before generic app-shape advice, `focus: "forms"` leads with
framework value-channel policy, and selected recipes can preserve their own code-shape priorities. Compact focused
recipe rows are capped too; use `detail: "recipes"` or `recipeLimit` for wider comparison. The default
selected-recipe policy rows are filtered from the selected recipe's explicit principle/decision order tables; row-level
`recipeKeys` remain focus-matching evidence and should not be treated as the selected recipe authority.
`featureGoal` path uses a small explicit signal table over authored words such as route/routes/routed, searchable, translated, and
validation to reorder recipe, principle, and decision rows; terms are matched as normalized token/phrase sequences or
explicit token conjunctions, not substrings, so this remains deterministic recipe policy rather than fuzzy search. Keep capability terms high-signal:
`validation messages` and `translated labels` are useful, while bare `messages` or `labels` are too domain-generic for
recipe selection. Ordinary form/data-entry words such as `form`, native control terms such as `select`, `checkbox`,
`radio`, `toggle`, and `switch`, editable settings, API key fields, profile editor/fields, account settings,
signup/password, and address/payment phrases are feature-surface signals, so a profile form, settings form,
checkout-adjacent address/payment surface, or onboarding flow can start from the form lane without treating read-only
profile/details wording, a route-only settings screen, or generic `labels` as localization pressure.
Composition signals should require compose/widget language; a bare dashboard can be an ordinary routed or state-backed
surface and should not imply `au-compose` or the composed-dashboard recipe.
Search/list signals should use search/filter/sort/table/list/directory or explicit data/user/record/item-grid wording;
bare layout-grid wording should not imply a data-table recipe. Catalog-product signals should use storefront,
cart/checkout, or product catalog/list/table/grid/card/detail wording rather than bare product or catalog nouns, so product setup
forms can remain forms/wizards until storefront intent is named. Product/admin table and editable-detail wording should
stay on the searchable-table/form path unless the caller also names storefront/catalog/card/cart/checkout/pricing/compare
intent. If ordinary list/detail surfaces start over-selecting the full searchable-data-table recipe, add a
framework/docs/test-grounded simple collection recipe rather than weakening the current table guidance.
Service-boundary signals should require explicit integration language such as service-backed/service-layer, API
service/client/call, HTTP, repository pattern/class or data-repository, or loading data. A bare submit button,
customer-service domain wording, repository-browser domain wording, or an `API keys` settings field belongs to ordinary
form/value-channel guidance unless the caller names a service boundary.
When searchable/list management and edit-form language are both present, the searchable-list surface should lead and
the form recipe should be a companion pattern unless a more specific routed/form recipe covers both.
When a caller supplies a `featureGoal` and no authored signal matches, the display text says `none matched` before using
the focus/default recipe order, so public clients do not confuse fallback ordering with specific semantic confidence.
Those fallback rows are broad orientation context, not a confident scaffold choice; the next action should refine the
feature goal, inspect an existing app, or compare catalog rows before requesting source text.
Signal rows also carry a planning layer such as architecture-choice, feature-surface, navigation-frame,
framework-capability, or integration-boundary, plus a `primaryWeight` that makes the main surface explicit when several
feature surfaces match. Architecture-choice signals such as explicit `@aurelia/state` requests can lead the source path
before ordinary list/form companions, because the plugin choice changes the app state model rather than merely adding a
capability.
Bare todo/list wording stays on ordinary DI state/list guidance unless the caller asks for `@aurelia/state`,
state-store, or store-backed-state architecture explicitly. When the caller does ask for plugin-backed state,
`state-store-list` can now suggest and apply `store-item`/`store-collection` source parameters for a caller-named
store-list item and collection identity while leaving reducer action details, sample data, and presentation as explicit
host-adapted slots.
Mixed goals use those rows to publish a compact `recipePlanSequence`: start with the recipe that owns the main surface
set, then add companion recipe plans for remaining capabilities such as validation or localization. Ranking uses
covered feature-surface breadth and feature-surface weight before navigation and summed capability weight, so a
routed catalog/search/cart goal can start from the routed catalog recipe and borrow checkout/wizard patterns instead of
letting one `checkout flow` phrase overtake the larger app surface.
When a goal contains multiple instances of the same surface, such as a teams list and an audit-log table, sequence rows
can carry `instanceLabel` so repeated recipe applications stay visible without inventing a new recipe key.
For searchable table source parameters, the collection surface owns the table entity when it is explicit, which keeps
nearby detail/copy phrases such as `profile detail` or `cart summary` from renaming the generated list model.
When a mixed plugin/list prompt gives the collection in a `for ...` clause and later names field filters, such as
`for project tasks with status filters`, the for-clause domain owns the table entity while the filter phrase stays in
`table-filter-fields`. Surface/context words such as `admin` or field-control words such as `status` can yield early
domain candidates, but a valid for-clause should override only those lightweight candidates instead of replacing an
already explicit entity phrase.
Sequence rows can carry deterministic `suggestedSourceParameterValues`. These are reviewable hints, not authority:
route identity/title parameters for routed table/form recipes may be source-applicable only when the row newly owns the
navigation-frame signal. Searchable table recipe rows can also apply `table-entity` and `table-collection` to source
model identity when those suggestions match the caller domain, can apply supported `table-filter-fields` as
normalized field descriptors such as `name, assignee select` instead of raw prompt phrases such as `assignee filters`,
and can apply `table-options` option domains when generated select filters need caller-owned values and labels.
Table field-schema suggestions require row-field/filter/sort/column context; controls such as a repository `branch select`
or surfaces such as `searchable file list` stay outside row-field generation, and surface chunks such as `searchable table`
do not become fake table fields. Those descriptors generate row fields,
filters, columns, service records, table cells, and routed detail rows. Catalog
recipes can apply `catalog-entity`, `catalog-collection`, and supported `catalog-fields` to core product/item/tier-like
storefront identity, item constructor fields, sample records, and routed detail field rows. Catalog field suggestions
seed the stable card contract with `name, description` plus detected `select`, `number`, `date`, or `toggle`
descriptors such as `category select`, `price number`, or `available toggle`. Type-compatible natural fields such as
`name`, `summary`, `price`, and `inStock` can own the stable contract member directly; derived contract slots such as
`badge` and `availability` stay behind generated getters so fallback values and card semantics remain explicit. Catalog
recipes also accept `catalog-options` for select-domain values, so prompts such as `category select for Basic, Premium`
can rewrite option union types, labels, and sample records instead of leaking synthetic `category-one` values.
suggestions stay conservative because the source remains a scenario reference around card/list state, selection, and presentation; action models,
broader copy, and presentation remain host-adapted. Standard request-form rows can
apply `request-entity`, `request-selection-id`, and supported `request-fields` to the core request/domain class, scalar
ID, state/service method names, component bindable name, template-local object handoff, field properties, control
bindings, validation targets, and expected effects. Request field generation currently covers text, email, secret,
textarea, number, checkbox, and single-select controls inferred from normalized explicit field/control wording. Number
inputs use Aurelia's `value-as-number.bind` convention rather than a string-valued `value.bind`. Option-domain labels and
values, sample-data, copy, action-model, validation-message, and presentation parameters can remain advisory until the
domain-schema source generator owns that layer. When an explicit editable-detail goal also owns a searchable/table
schema, the companion form may reuse the table field descriptors so a prompt that says `status filters`, `category
select`, and `editable product details` can produce both table filters and editable detail fields without treating every
filter UI as a form.
The structured `recipePlanSequence` rows also expose `suggestedSourceParameterContracts` with
`valueShape/applicationPolicy` for each suggestion. The compact text mirrors those rows by keeping copyable
`sourceParameterValues` as plain `key=value`, then adding a separate contract line. Public clients should use the
structured contract rows first, and the display line as a human-readable echo, to distinguish source-applied
route/entity/member/table-form/catalog field schema from advisory action-model or presentation hints before requesting
recipe source text.
The sequence distinguishes `usage: "source-plan-start"` from `usage: "pattern-reference"` so clients do not apply two
complete app scaffolds when a companion recipe is only needed for plugin/capability structure.
`routed-app-shell` is the generic routing companion for that sequence: it covers RouterConfiguration, static route
config, named `au-viewport`, route params/query/fragment handoff, and routeable components without pulling in a
form/catalog/table model. Mixed feature goals such as a routed dashboard should start from the feature recipe and use
`routed-app-shell` as a `pattern-reference`; route-owned list/detail or form features should use the richer routed
recipes directly.
Route-owned recipes should not win a non-routing feature goal merely because they cover the same domain surface as their
non-routed sibling. For example, a product list with card/detail components should start from `catalog-storefront` unless
the caller asks for routing, navigation-owned selection, route params, links, or viewports; the routed catalog recipe
becomes the source-plan start only when a navigation-frame signal is present.
Catalog-specific surfaces such as storefront/product/card/detail/compare/pricing tiers keep catalog recipes in the
product domain instead of treating the same words as a generic searchable table. Product-tier wording is an exact
catalog signal even without the word catalog, so `pricing page with product tiers` can select the catalog lane and
suggest `Product Tier`/`productTiers` source parameters. Non-contiguous product/item/tier catalog wording does the same
for routed catalog prompts. Board/detail wording is also part of domain extraction for task/workspace-like goals, so filter
phrases such as `assignee filters` can become `assignee select` field-schema suggestions rather than accidentally
becoming the entity name.
Browser/tree/viewer surfaces help list-like developer tooling goals infer the actual listed entity, such as `File` from
a repository browser with a file tree and code viewer. Control words such as select/dropdown/checkbox/radio/toggle/switch
are domain boundaries for this extractor, so `branch select, file tree` does not become a `Select File` domain.
The same specialization guard applies to wider form recipes. A validated profile form should start from
`validated-state-backed-form`; `multi-step-state-backed-form` should become the source-plan start only when the caller
asks for wizard/stepper/multi-step/onboarding form structure, and localized recipes should not win unless localization is requested.
When a mixed route/form goal asks for validation but not localization, the sequence should start from the routed form
source plan and borrow validation as a companion pattern rather than using the translated validated route recipe as the
baseline.
Bare native-control words are intentionally not enough to activate form-entry, because list/table/browser features often
use select, checked, and toggle channels for filters. Form-entry should come from explicit form/settings/editor/profile,
preferences, onboarding/wizard, address/payment, API-key, or field-as-field wording; once a form lane is selected,
control phrases may still become advisory field-schema suggestions.
Service integration wording is split between read/load and write/submit intent. Generic API/service loading language may
activate `service-boundary`, while `API-backed save`, backend submit/save, or persist-through-API phrasing activates the
write-oriented service companion. A form that merely has an API-key field and a save button should remain plain
form-entry guidance unless integration wording is explicit.
Compact recipe candidate comparison first requires at least one authored signal match, then treats unrequested
specialization as more costly than extra feature breadth. Returned comparison rows should be the source path plus
relevant unspecialized comparisons, not unrelated generic recipes or larger source shapes merely because a specialized
recipe happens to cover adjacent capabilities. Matched feature-goal answers keep a tighter compact budget by default
so the source choreography stays visible without turning the first response into a catalog dump.
`detail: "compact"` leaves inline `tasteValues`, expanded choose/avoid lists, operation-kind arrays, and expected-effect
kind arrays empty while keeping stable keys, counts, code-shape summaries, and the first prefer cue where it helps the
text channel. Pass `detail: "recipes"` only when expanded recipe and guidance rows are needed inside the same answer.
`SemanticRuntime.authoringRecipePlan({ recipeKey, usage })` defaults to compact expected-effect and intent detail: callers
receive a short `displayText`, preference counts, taste-value keys, expected-effect counts, and kind sets on the plan
and each step, while row-level preference rows, per-step highlights, and expected-effect contracts are empty. Top-level
effect highlights carry the compact public semantic promises. The display text is owned here rather than in MCP so
transport clients can show recipe intent, top operation steps, source-file plan, and text/contract opt-ins without
rephrasing product policy. Public effect highlights prioritize source-backed observation, route identity, and
form value-channel/data-flow specifics such as custom matchers, select option coupling, nullable model values, and
checked collection mutation before lower-signal style/class facts. Pass `usage: "pattern-reference"` when a recipe came
from a companion `recipePlanSequence`
row; the plan still exposes the full source shape, but its text tells clients to borrow relevant steps and semantic
promises instead of applying a second complete scaffold. In pattern-reference usage, the file preview says "Pattern file
shapes" and labels entrypoints/components/state files as patterns, while the structured `sourcePlan` remains complete for
agents that need exact paths or selected source text. Pass `effectDetail: "contracts"` when a verification, repair,
or fixture workflow needs the exact contract rows. Keep that opt-in boundary intact for MCP and other public app-building
callers, where the concrete recipe source plan is more important than transporting every semantic verification row by
default.
Pass `includeText: true` only when all concrete file contents are needed; `sourceFilePaths` and
`sourceTextRequestHintKeys` include selected file text by default while preserving the complete source-plan manifest.
Pass `includeText: false` with either selector only when a caller wants to record the selection without returning text.
That gives MCP clients a low-token way to request one file at a time or a role-driven file cluster without losing the
recipe's total source-plan shape. `sourcePlan.textSelection` reports the normalized requested, matched, unmatched, and
included hint keys and paths so stale client-side picks are visible without expanding the whole recipe source tree.
`sourcePlan.textRequestHints` groups generated artifact paths into role-driven request clusters such as
`implementation-source`, `entry-shell`, `templates`, `state-domain-service`, `presentation`, and `project-tooling`.
Public clients should prefer `sourceTextRequestHintKeys` over guessing at paths from fixture names: request
`implementation-source` when emitting or adapting app source without reference CSS, pair it with `project-tooling` for a
new project, request `state-domain-service` when adapting data/state shape, request `templates` when adapting binding
structure, and request `presentation` only when the caller wants the reference CSS or visual shell. Exact
`sourceFilePaths` remain useful for custom smaller selections after a caller has inspected the manifest.
The generated table and catalog recipes keep reference presentation/source-pattern declarations in dedicated authoring
modules so architecture/source-shape files stay focused on state, routing, and binding semantics while `presentation`
remains an opt-in reference asset. Shared list/detail route identity slots live in one routed source-pattern helper so
`detail-route-parameter`, `list-route-path`, and `list-route-title` stay a coherent adaptation group across routed
recipes instead of becoming recipe-local token replacement rules. Routed catalog plans derive omitted route path/title
and default detail navigation identity from the applied catalog entity/collection values, while explicit route-identity
parameters still override those defaults as one group.
`sourcePlan.pattern` is the compact boundary between a reusable recipe shape and a concrete reference instantiation.
Domain-neutral app shells and caller-applied starts can be read as direct source plans when `usePolicy` is
`apply-as-source-start`. Reference instantiations include sample names, records, copy, and CSS so generated fixtures can
be reopened and verified; public clients should adapt those details before emitting caller-specific code. Pattern
`role`, `dataPolicy`, and `codeEconomyPolicy` make that boundary structured: `recommendable-recipe` rows are app-start
candidates, `caller-applied` domain rows already reflect source parameters, `starter-sample-data` marks small runnable
seed records, and `scenario-reference` rows with synthetic data and reference-complete source are transfer/verification
examples rather than a mandate to copy their nouns or verbosity.
The current low-boilerplate direct-start canaries are compact searchable table/list rows and compact catalog rows:
they use `caller-applied` + `starter-sample-data` + `production-terse`, keep text authority on semantic-runtime recipe
source, and omit reference CSS, selection state, and richer value channels unless the requested feature profile asks
for them. Richer table/catalog and routed catalog plans remain scenario references so analyzer pressure can still
exercise selection, routing, class/style, checked/select, and presentation semantics.
`sourcePlan.pattern.usePolicy` is the primary public-client action: `apply-as-source-start` can be emitted as the
starting scaffold, `adapt-before-emitting` must be translated into the caller domain before code is written,
`merge-selectively` should be borrowed into another source plan, and `analysis-pressure-only` should stay out of public
app output.
`sourcePlan.pattern.parameters` names the main adaptation slots, including domain
entities, field schemas, collections, scalar selection IDs, route identities, sample data, feature copy, and presentation defaults.
Each parameter also carries an `applicationPolicy`: `source-text-input` means a caller may pass
`sourceParameterValues` to `authoringRecipePlan(...)` and semantic-runtime will apply that value to generated source;
`advisory-only` means the value is a clean adaptation marker for the host or AI, but concrete source rewriting is not
implemented there yet. Each parameter also carries a `valueShape` so callers can distinguish title-like domain nouns,
source-member names, route paths, route parameter names, route titles, route-section lists, workflow-step lists,
workflow-section field-schema lists, field-schema lists, option-schema lists, collection/action summaries, sample-data summaries, and presentation summaries
without deriving syntax from fixture nouns. `sourcePlan.sourceParameterApplications` reports which requested values were applied, advisory,
not applied despite being source-applicable, or unknown, so public clients do not have to guess whether a
reference-instantiation noun was actually rewritten. `applied-to-source-plan` requires the requested value to appear in
the built pattern parameter row and generated source/tooling text; a `not-applied-to-source-plan` row is
recipe-mapping/product pressure, not a value the host should silently trust. Compact guidance and recipe-plan display
text also names host-adapted slots so public clients can see unresolved sample-data, copy, action-model,
validation-message, or presentation work without diffing source text.
Source-parameter application checks are `valueShape` aware: domain titles are searched through title, lower-title,
Pascal, camel, kebab, and snake forms, while route/member shapes preserve their identifier/text expectations. This keeps
`applied-to-source-plan` from depending on a lucky raw substring when a recipe derives several source identifiers from a
single caller-domain value.
`sourcePlan.pattern.adaptationGroups` names parameter clusters that should move together. This keeps partial rewriting
visible: a route-identity group may be fully source-applicable, while the searchable table domain-schema group is mixed
because table entity/collection identity and supported table field schema can be source-applied but sample records, copy,
and presentation still need caller-domain adaptation. Catalog domain-schema groups are also mixed for product/item-like storefronts:
core item/collection identity and supported catalog field schema can be source-applied, while selection/action model,
broader copy, and presentation still need caller-domain adaptation. Request-form domain groups are mixed too: request entity/selection
identity and the supported `request-fields` schema can be source-applied across class names, selected-ID properties,
state/service read/load/submit methods, component bindables, template-local object names, domain fields, control
bindings, and validation targets, while options, sample records, copy, validation-message copy, and presentation still
need caller-domain adaptation. Wizard forms, dashboards, and state-store examples also
publish grouped slots so clients can preserve coherent value-channel, validation, composition, or plugin-store contracts
when adapting sample source. Wizard `workflow-step-list` values are source-applicable for step ids, progress labels, and
conditional section wrappers. Wizard `workflow-section-field-schema-list` values such as
`shipping: shipping address; payment: payment method select` are source-applicable for named section fields, raw
controls, validation error rows, and option-domain source when paired with `wizard-options`.
State-store `store-item` and `store-collection` values are source-applicable for the generated store item interface,
state interface, collection property, repeat source, action type names, reducer helper names, and small copy/CSS class
identity, while `store-actions`, sample data, and presentation stay host-adapted until broader reducer-shape generation
exists.
Source patterns also expose `modules`: compact reusable architecture capabilities such as app shell, router admission,
route-context selection, route parameter selection, route-link navigation, DI state, service loading/submission, native
text/checked/select/matcher value channels, capture-based field shells, collection search/filter/sort/page/selection
controls, list rendering, template-controller flow, class/style channels, plugin integration, dynamic composition, and
state store. MCP clients should use modules to understand the recipe shape before looking at fixture nouns in generated
source text.
Recipe catalog rows carry the same preference row shape from their seed plans, so callers can compare recipe policy,
profile policy, and opened-app taste observations without reading recipe source. They also expose the recipe source-plan
contract without file text: conflict, formatting, package-tooling policy, file roles, languages, edit kinds, and text
authority. Domain entity/value-object files should use the `domain-model` source file role rather than falling through to
`other`, so model source can be adapted separately from state and service boundaries. Source-plan rows now carry a
project-tooling subrow for package dependencies, scripts, package/config file
kinds, and build-tool policy without exposing file text. Use that shape to decide whether a recipe is genuinely editable
or whether a host/generator policy is still missing; current recipes provide package/typecheck baselines while leaving
build-tool profile selection open. Recipe preference rows also carry `build-tool-profile:host-selected-build-tool`, so
callers can see that open policy without interpreting `buildToolPolicy: not-modeled` as an accidental omission.
Recipe catalog and orientation rows also expose direct base recipes, transitive lineage, and `specificityRank`; use
those fields when several recipes are satisfied, because richer recipes intentionally contain the app-shell and
state-backed shapes they build on.
Generated recipe expected effects also verify the observed `build-tool-profile:typecheck-only-tooling` taste after
reopen, and `AuthoringOrientation` reports `package-tooling` as partial or observable rather than fully open while
package-manager/build execution remains an explicit product-open reason.
`AuthoringOrientation` also owns a compact `displayText` for public transports. That text highlights the project shape,
the most app-building-relevant taste axes, current recipe fit, repair pressure, and open-reason keys without asking MCP
or another adapter to interpret ontology rows locally. Recipe-fit text prioritizes satisfied recipe identities and
summarizes partial cross-family candidates instead of presenting them as coequal app identity. Keep the structured taste,
recipe, repair, and open-reason rows as the precise source of truth; the display text is only the low-token first read.
`AuthoringOrientation` lifts the same diagnostic/open-seam pressure into `repairs` rows. Those rows are semantic repair
intents, not edits: they classify whether the next move is to declare a member, strengthen an owner type, rewrite a
binding source, resolve a runtime boundary, inspect an open seam, or improve semantic-runtime substrate. Concrete edit
application and formatting policy stay outside this API until the source-edit boundary is designed.
Taste rows in the same orientation answer keep durable vocabulary separate from the opened app reading:
`ontologySummary` explains the stable taste value, while `summary` / `observedSummary` explain the current evidence
that made the value appear. Recipes should check value-level layer, confidence, and evidence before turning taste into
an edit preference. Axis rows report primitive-policy, observed-shape, and derived-reading value counts; `policyState`
is inferred only when at least one primitive-policy value is present, so observed framework/source facts can satisfy a
recipe signature without pretending a user or product policy was declared.
Keep the axis key itself narrow. Template source ownership, template rendering boundaries, form value channels,
validation ownership, form type-surface trust, stylesheet/resource ownership, and dynamic style binding are separate
orientation axes because they come from different semantic substrates and often fail independently. Dynamic style
binding rows are read from observer value-channel semantics, so class tokens, per-class toggles, whole style rules, and
per-property style bindings remain visible as distinct observed shapes.
Validation ownership is read from validation-html `& validate` binding-behavior applications, validation package
configuration admissions, validation service resolve sites, and source-rule validation issue rows. Keep those positive
ownership signals separate from `ValidationIssues`, which remains the source-backed diagnostic lane for invalid
validation rule construction or hydration. The `binding-behavior-applications` query is the fact-level API surface for
the `& validate` part of that reading; the authoring taste row is the interpreted ownership summary.
Recipe rows expose `expectedEffectKinds`, `expectedEffectCount`, and compact `expectedEffects` rows from their concrete
plan builders after compressing duplicate semantic targets across step-local and final verification effects. The same
compression is exported as `expectedSemanticEffectsForPlan(plan)` for concrete fixture and repair verification. The row
form preserves a compact `semanticTargetKey`, effect kind, scope, cardinality, count, filter fields, capability/taste
targets, filter values, role, taste value layer/ontology summary, and summary, then evaluates each effect against the currently
opened app with the same observation primitive used by closed-loop verification. `baseline` effects are general app-health checks; `signature` effects are the facts that make
a recipe recognizable in an existing app; `discriminator` effects are required recipe-identifying facts that keep a
router- or service-specific recipe from looking applicable only because a generic form/app shell matched. Each
expected-effect row reports `currentObservedCount` and `currentOutcome`; each recipe row summarizes all effects,
signature-like effects, and discriminators separately, then derives `currentFitState`. A recipe with no satisfied
signature-like effects, or with an unsatisfied discriminator, is `not-applicable` rather than a failed verification.
When multiple recipe rows are `satisfied`, prefer the highest `specificityRank` before treating the app as a generic
base recipe match.
`project-tooling` expected effects are backed by project source-role rows, so generated recipe checks can verify package
manifests, TypeScript config files, local module declarations, and the typecheck-only tooling taste without comparing
file text.
`runtime-composition` expected effects are backed by `RuntimeCompositions` rows, so generated recipe checks can verify
dynamic `AuCompose` component resolution, compiled-template closure, static or bound model presence, aggregate
composed-child controller handoff for closed branches, and activation model handoff without treating a composition host
as sufficient by itself. Rows also expose AuCompose context inputs that do not all arrive through the
same lane: dynamic property bindings such as `component.bind`, `model.bind`, `composition.bind`, and `composing.bind`
come from controller binding, while static `scope-behavior`, `tag`, and `flush-mode` come from literal
`SetPropertyInstruction`s on the hydrate instruction. Component/template/model inputs also carry direct/promise/absent/open
fulfillment fields so API callers can tell when a framework-supported promise-valued composition input was statically
unwrapped. Plain object and non-resource constructable components report
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
This lets fixture expansion ask "what does this app already satisfy?" before opening recipe source files or running a
separate verifier pass.
Closed-loop callers should derive expected effects with `expectedSemanticEffectsForPlan(plan)` and build verifier input
with `readAuthoringVerificationSnapshot(app)`. The helper paginates the
row-backed projections used by filtered effects instead of relying on each smoke or host to remember that behavior
applications, runtime watcher rows, watcher observed-dependency rows, runtime composition rows, target-access rows,
value-channel rows, and data-flow rows must travel together with summary, topology, orientation, and open seams.
Unsupported row-backed projections fail at snapshot construction time, so callers do not mistake a too-shallow analysis
depth for absence of the expected semantic facts.
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

When `createSemanticRuntime` is opened without explicit projects, boot discovers package/tsconfig project frames for
monorepo-shaped workspaces. Default `openApp()` chooses an `aurelia-app` project from import/receiver-grounded bootstrap
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
Rows expose both human `summary` text and typed `reasonKinds`. Pressure scripts should aggregate the typed reason kinds
when present, reserving summary text for human inspection and raw-detail debugging. For example, a router resource whose
instruction value depends on host environment state remains a router open seam, but carries both
`router-instruction-needs-static-value` and `host-environment-value` as stable machine-readable pressure.
When the same router seam is blocked by a binding expression, router materialization should preserve its own
`router-instruction-needs-static-value` reason and attach the lower-level binding-source reason, such as a runtime scope
slot without a static value carrier. This keeps ownership honest: router owns the product seam; observation owns the
source-value explanation.
Dynamic `href` router-resource seams can also carry `router-href-externality-open`. That reason means the framework
would decide at runtime whether the value is an external URL before creating viewport instructions; semantic-runtime has
not proven either the external lane or a static internal route string. Click-interception facts are separate:
`router-href-click-interception-disabled` is for proven disabled gates such as `useHref=false`, non-anchor hosts, or a
co-located `load` custom attribute, while `router-href-click-interception-target-open` is for anchor `target` values
that must be compared with the runtime window name. In both cases, `HrefCustomAttribute.valueChanged(...)` still needs
the runtime value to decide whether to write the raw URL or generate an internal router URL.
Authoring orientation lifts that into runtime boundary and intent rows on repair clusters. The important distinction is
whether the boundary is router href classification, static route instruction closure, or binding-source runtime value,
and whether the next operation needs href ownership intent, an explicit external-href declaration, a static navigation
target, or a stronger binding source. When the seam has source provenance, that cluster should carry a
`runtime-boundary:source` action target so future repair planning starts from the authored value span instead of a
source-less app-level bucket.
Observation-owned seams can also carry typed reasons. For example, `SelectValueObserver` channels distinguish unclosed
option values, empty option domains, missing authored select targets, dynamic `multiple.bind` whose source cannot carry
both runtime branches, and multi-select source-shape pressure; any data-flow row blocked by that channel preserves the
same reason instead of flattening the pressure into an untyped binding seam.

`EvaluationIssues` exposes product-owned diagnostics from the static evaluation layer and framework-shaped evaluator
handoffs. `ModuleLoader` transform-input validation reports `aliasedResourcesRegistry(...)` and
`IModuleLoader.load(...)` inputs that statically close to invalid direct values as
`invalid_module_transform_input` / `AUR0021` with the rejected evaluator value kind and exact input-expression source.
The framework API issue pass also reports source-local framework utility guards such as EventAggregator falsy
channel/type inputs, `firstDefined(...)` with no defined argument, and `Metadata.define(...)` with no metadata key. Raw
framework utility guards use `frameworkRawErrorAuthority` instead of synthetic AUR codes. `AppDiagnostics` reports these
rows under the `evaluation` domain and links back to `evaluation-issues`.

`ResourceDefinitions` exposes converged Aurelia resource definitions recognized from explicit decorators, runtime
definition objects, static fields, metadata, and project conventions before app-world/compiler visibility is known.
This is the right query for plugin-library and monorepo package pressure where a package can define resources without
booting an app root. Rows include resource kind, declaration modes, name/key/aliases, target name/source, bindables,
dependencies, template shape, watch metadata, attribute-pattern entries, custom-element/custom-attribute flags, and
optional kernel handles. Declaration modes preserve the convergence carrier mechanism, so authoring orientation can
distinguish decorator, static, definition-object/factory, and current convention resource styles without re-reading
source.
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
`ResourceVisibility` stays narrower: it answers which definitions are visible to a particular compiler world after
configuration, DI, and resource-scope composition have materialized.

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

`RouterOptions` exposes effective option products materialized from `RouterConfiguration` admissions and
owner-tagged `customize(...)` option contributions. Rows include the framework-defaulted booleans and strings that are
already used by static topology, especially `useHref`, `useUrlFragmentHash`, and `useEagerLoading`. These rows are the
authoring/API view of router option convergence; they are not a navigation runtime state snapshot.

`Routes` exposes source-backed authored router route configs recognized from `@route(...)`, `Route.configure(...)`, and
Aurelia's static route metadata path used by `Route.getConfig(...)`. Rows preserve route kind, paths,
origin kind, value kind, id/title/redirect/viewport/data/nav/fallback presence, child-route cardinality, routeable component reference kind,
whether that routeable has resolved to a concrete resource definition, source, and optional handles. Dynamic
`import(...)` route components are reported through the promise routeable lane even when their fulfilled custom element
definition is already known.

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
Template diagnostics also project router issue rows whose authored source belongs to the selected template. Those rows
use `router-framework-error` so file-level and cursor-locus APIs can surface `load`/`href` expression parser,
instruction creation, recognition, viewport-resolution, and eager path-generation failures without moving issue
ownership out of the router domain. `AppDiagnostics` still reads the owning router issue lane and filters those
template-projected copies to avoid double-counting. Cursor-info uses the same projection path and should prefer the
exact expression/value span from parser or HTML value provenance over the broader attribute carrier when a router issue
originates in a template value.
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

Resolved routeable components also seed template compilation. That recursive rendering bridge lets routed component
templates and nested `au-viewport` / `ViewportAgent` topology show up before a future route-tree/navigation emulator
exists. App roots seed the route-context topology when they are known; resource-only package analysis can still fall
back to graph roots. Treat this as static route/component topology, not as proof that viewport activation or guard
lifecycles ran.
The app summary also distinguishes configured-route contexts from runtime route contexts: `routeConfigContexts` counts
the `RouteConfigContext`/recognizer topology, while `routeContexts` counts the static `RouteContext` products that join
those config contexts to parent/root context, modeled child containers, and hosting viewport agents. `routerViewports`
and `viewportAgents` are owned by those runtime route contexts, not by the config-context layer. The
`RouteContexts`, `RouteContextParameterReads`, `RouterViewports`, and `ViewportAgents` queries expand those counts into
compact rows with labels, source references, container/host-controller closure, and optional handles.
`RouteContextParameterReads` specifically reports source-backed `RouteContext.getRouteParameters(...)` calls, the
declared parameter keys on the TypeScript call, the route-config paths for the owning routed component, the recognized
path parameter names, and whether declared non-path keys are only query/open parameters.
`RouteTrees` and `RouteNodes` expose the route-tree layers that are currently closed: the synthetic root tree/node that
`Router.routeTree` creates before navigation, and context-relative transition trees compiled from closed static
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
activated component agents, or exhausted every redirect edge case. Redirect routes that reach transition
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

`ComponentAgents` exposes the first static `RouteContext._createComponentAgent(...)` handoff for recognized transition
nodes. Rows connect the route context, route node, selected viewport agent, resolved routeable component, and routed
controller product. The corresponding `RuntimeControllers` rows use the `routed-custom-element` creation kind and
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
It also prints generalized reason-by-source-type, reason-by-assignment-target-type, reason-by-target-type, and
reason-by-writeability cross-tabs. Use those before opening raw app rows: they reveal whether a pressure class is a
real unsupported assignment, a readonly TypeChecker surface, an `unknown`/`any` target value channel, or a
value-converter/repeat local that lost element specificity. For member writes whose full expression type is open,
`sourceAssignmentTargetType` can still carry the owner type that diagnostic suggestions should navigate to.
Public binding projections use the same combined template basis as diagnostics: app-runtime resources plus any
source-selected authoring resources opened for resource-library/package pressure. Keep those bases aligned; otherwise
diagnostic rows and binding data-flow rows count different template worlds in monorepo/resource-library pressure.

Authoring guidance keeps plugin-backed recipe selection compact for MCP callers. `localized-validated-state-backed-form`
is the combined i18n plus validation form lane: it proves static translation resources, rendered translation bindings,
validation-html setup, validate binding behavior rows, validation-errors handoff, and standard form data flow over the
same DI-owned request model while leaving localized-only and validated-only recipes available for narrower features.
`multi-step-state-backed-form` is the wizard/progress form lane: DI-owned state owns the profile object and step
progress, repeat/if template-controller rows render the wizard, templates bind directly to `state.profile.*`, and
expected effects prove validation-html, native value/checked/select channels, checked collection membership, class/style
progress presentation, state-composition, and getter observation.
`routed-localized-validated-state-backed-form` adds router admission, route-param selected state, static route
navigation/query/fragment rows, route-node aggregation, and component-agent handoff to that plugin form without changing
the direct state-backed form binding policy.
`routed-validated-state-backed-form` is the narrower routed validation lane for edit/create forms that need router-owned
identity plus validation-html, but not i18n or service loading. Feature-goal choreography should prefer it over the plain
routed form when validation is an explicit signal, and over the localized routed form when no localization signal is
present.
`routed-app-shell` is the generic route-shell lane: RouterConfiguration, decorator route config, static load links,
named `au-viewport`, route params/query/fragment handoff, route recognizer products, RouteContext topology, route-node
aggregation, and routeable component handoff without a form, catalog, or table domain model. Use it as the companion
recipe for routed features whose primary surface belongs to another non-routed recipe.
`routed-service-backed-form` is the route-owned service-boundary form lane: it keeps route-param selected state and
direct template-local request binding while proving background state loading, state-to-service calls, template-to-state
read interactions, router products, and standard form channels.
`routed-searchable-data-table` is the route-owned list/detail management lane: it keeps the low-boilerplate data-table
state and value-channel shape while proving list/detail routes, static and row-driven profile navigation, route-context
parameter/query adaptation, viewport/component-agent products, and shared DI-owned state across list and detail routes.

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

`TargetOperations` exposes direct target updates that do not ask `ObserverLocator`. Rows include an owner lane:
renderer-owned operations from `SetPropertyRenderer`, `SetAttributeRenderer`, `SetClassAttributeRenderer`, and
`SetStyleAttributeRenderer`, plus binding-owned operations from `AttributeBinding.updateTarget(...)` for `.class`,
`.style`, ordinary attribute writes, `ContentBinding.updateTarget(...)` for text content writes, and
`ListenerBinding.bind(...)` for event listener subscription. Rows report owner kind, binding/renderer kind, target
attribute, target property/token/key, static value when one exists, operation kind, affected names, authority, source
address, optional handles, and row-local open pressure. `BindingTargetOperations` remains as a compatibility entrypoint
for the same projection while callers migrate to the broader name.

`BindingSourceOperations` exposes source-side binding behavior that should not be squeezed into DOM target updates.
`RefBinding.updateSource(...)` publishes a `ref-assign-target` operation after resolving Aurelia's ref target lane:
`element` returns the authored node, `component`/named custom elements return a controller view-model, custom attribute
names return the custom attribute view-model, `controller` returns the controller product, and unsupported `view.ref`
stays open. These rows are consumed by value-channel and data-flow projections as `ref-target` target-to-source flow.

`BindingBehaviorApplications` exposes successfully materialized runtime binding-behavior applications after the
compiler resource scope, rendered binding product, controller bind phase, and binding-behavior materializer have all had
their say. Rows intentionally describe positive applications rather than errors: behavior name, owning binding kind,
phase, argument count, static scalar/template literal argument values, target kind/property, source address, and
optional handles. Source addresses prefer the exact binding-behavior name span, including names inside interpolation
holes, and only fall back to the broader binding carrier when no source file can be recovered. Authoring
verification uses this lane for fact-level effects such as "the generated validated form actually produced `& validate`
applications" before deriving higher-level validation ownership taste.

`BindingValueChannels` exposes the observer/accessor or direct-operation value shape that runtime data flow should use
instead of blindly treating the raw DOM property as the transported value. Use `BindingValueChannelSummary` first when
an MCP/LSP caller needs a low-token explanation of which value-channel and observer-coupling mechanisms are present
before drilling into exact authored rows. The summary groups by channel kind, target kind/property, and
`observerCouplings`, and also returns coupling-count rows so form/control answers can say, for example, that the app is
using select option-list mutation observation, select array mutation, checked collection mutation, or custom matcher
comparison without listing every binding. Summary set fields are capped and paired with `*Count` fields where large apps
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
Class/style value channels report `class.bind` and class interpolation token channels, `.class` toggle channels with
their toggled class names, `style.bind` and style interpolation rule channels, and `.style` property channels with the
targeted CSS property. Text interpolation through `ContentBinding` reports `text-content` channels backed by
`text-content-set` target operations. `SpreadValueBinding` reports the target/value shape of its per-bindable inner
`PropertyBinding` fan-out when the target component's bindable keys are statically known, instead of pretending that
`...$bindables` is a static DOM property. `SpreadBinding`-owned inner bindings created from captured `...$attrs` are
reported through the same target-access, target-operation, value-channel, and data-flow projections as ordinary
bindings, while their ownership remains a binding-to-binding runtime claim under the hood.
Binding-family public rows are resource-local by authored source ownership, not by whichever recursive aggregate render
pass materialized them first. Aggregate child custom-element rendering remains visible for controller topology, but API
projections filter binding-backed rows to the resource whose template contains the binding source span. Captured
`...$attrs` are the main canary: a forwarded inner input binding can render inside a wrapper component while its source
expression still belongs to the parent usage template that authored the captured attribute. Render-controller ownership
is only a fallback for rows that genuinely lack exact source spans.
`repeat.for` owner bindings use the `template-controller-iteration` value channel and Aurelia repeat-source
compatibility rather than raw `Repeat.items` TypeScript assignability. Dynamic `model.bind` on `<option>` or `<input>`
uses the `element-model-value` channel, because Aurelia's select and checked observers read the element's model value as
runtime value-domain metadata instead of treating `model` as an ordinary native DOM property.

`BindingDataFlows` exposes the source/target edge after scopes plus target access or target operation are materialized.
Use `BindingDataFlowSummary` first when a client needs a compact explanation of flow direction, value-channel families,
assignability/writeback pressure, framework error codes, issue rollups, and the source roots involved. Pass
`page.size: 0` for an issue-rollup-only first read, then page summary or raw data-flow rows after the issue kind,
target/value-channel family, or source root is known. Detailed rows report binding
direction, parser publication state/result kind, value-site kind, source expression lane/name/root/type, raw target
property type, observer/direct-operation runtime value type, TypeChecker source-type pressure, source writability for
target-to-source flows, TypeChecker assignability checks in the active directions, optional framework error code, source
address, optional handles, and row-local runtime data-flow open pressure. This is the compact pressure signal for
two-way form controls, setter-backed state, class/style presentation bindings, template-controller value bindings, and
future validation/write diagnostics. Direct spread value bindings appear here as source-to-target flow from each spread
object property into the corresponding target bindable, such as `featuredCardBindings.productId -> productId`.
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

`BindingObservedDependencies` exposes the concrete source-side reads that a source-to-target binding evaluation would
collect through Aurelia's template connectable circuit. Rows preserve expression kind, source/root/member/key
names, method name for calls, parser-local spans, source reference, and optional handles back to the runtime binding,
data-flow edge, expression parse, and binding scope. Member reads also carry TypeChecker member kind and declaration
source when the binding scope can close the owner expression. The `observedMemberSourceState` field distinguishes
closed source routes from honest non-member carriers such as temporary collection call results, `$` runtime scope names,
and genuinely open scope roots, so aggregate pressure does not treat every null declaration source as provenance loss.
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
publish expression-observer reads at the dependency literal span, and explicit dependency keys with `deep: true` publish
the first TypeChecker-shaped `deep-property-read` / `deep-collection-read` rows for nested observable value shapes.
These rows are source-backed getter capability/projection rows. A direct `ObserverLocator.getObserver(obj, fn)`
function-key request is still a runtime `ComputedObserver` branch, but it is a concrete observer lookup call site and
should be modeled by a call-site product, not folded into getter availability rows. Pair computed observer source rows
with binding observed dependencies, runtime-effect rows, watcher rows, or target-access rows when the question is
whether a concrete runtime lookup is actually used by a template, source API call, or watcher.

`RuntimeEffects` exposes direct source-level `Observation.watch(...)` / `IObservation.watch(...)` and
`Observation.run(...)` / `IObservation.run(...)` effects. Rows preserve the effect kind, the framework
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
the same connectable dependency collector as binding data-flow, so rows can explain `AccessScope`, `AccessMember`,
`AccessKeyed`, and collection-call dependencies without reclassifying the watcher as an ordinary renderer binding.
Computed watchers use a first `ProxyObservable` function-body projection to explain property and collection reads rooted
in the wrapped dependency function parameter, including nested collection callback values and simple local aliases or
object destructuring. Collection-call rows are TypeChecker-discriminated when receiver types are visible, so ordinary
string/object methods can keep their property-read rows without being misreported as array/map/set proxy collection
reads. This remains a conservative execution-detail lane: optional chaining, dynamic keys, derived aliases, computed
getter observer execution rows, and deeper proxy/control-flow precision are still substrate frontiers rather than API
wording policy.

## Fixture Pressure

Authoring fixtures live under `../../fixtures/authoring`. They should look like code we would be comfortable
recommending to Aurelia users, even when that makes the semantic runtime work harder. See
[../authoring/README.md](../authoring/README.md) and [../application/README.md](../application/README.md) for the
authoring/topology boundaries behind those fixtures.

Analyzer stress fixtures should be separate from authoring fixtures. Avoid adding brittle golden snapshots around either
kind of fixture; the valuable signal is whether the API can expose precise, navigable open seams and compact high-level
answers after the app is reopened.
