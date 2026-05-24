# Aurelia MCP

This package is the local MCP shell for the semantic-runtime API. It should stay a thin, boring adapter over
`@aurelia-ls/semantic-runtime`: MCP clients get stable tool names and JSON answers, while the product semantics remain
owned by the semantic-runtime package.

Atlas, Work Router memory, and other development-only substrate must stay internal. If an MCP answer needs better facts,
improve semantic-runtime first and forward the improved API answer here.
App-shaped MCP tools should route through `SemanticRuntime.answerAppQuery(...)` with MCP-oriented retention instead of
opening app epochs manually. That keeps query claims, app-epoch disposal, and TypeSystem cache policy centralized in
semantic-runtime while this package remains a public transport shell.
Static catalog tools and MCP catalog resources should still route through a `SemanticRuntime` session instead of calling
raw catalog readers, because those answers are part of the public API surface and should appear in runtime query-claim
telemetry.

## Local Development

Build the package:

```powershell
pnpm --filter @aurelia-ls/mcp build
```

Run the stdio MCP server:

```powershell
pnpm --filter @aurelia-ls/mcp exec au-mcp
```

Probe the stdio shell after transport-level edits:

```powershell
pnpm --filter @aurelia-ls/mcp probe:stdio
```

Large app-world opens can currently require more than Node's default heap while semantic-runtime performance work is
still in flux. For local MCP client registration, prefer launching with an explicit heap budget:

```powershell
node --max-old-space-size=8192 C:\projects\aurelia-ls2\packages\mcp\out\server.js
```

Invoke the adapter directly without an MCP client restart:

```powershell
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-catalog
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-building-guidance '{"focus":"app-building","recipeLimit":4}'
pnpm --filter @aurelia-ls/mcp dev:invoke -- aurelia_app_building_guidance '{"focus":"app-building","recipeLimit":4}' --text
pnpm --filter @aurelia-ls/mcp dev:invoke -- aurelia_authoring_recipe_plan '{"recipeKey":"searchable-data-table","includeText":false}'
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-catalog --catalogView recipes
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-building-guidance --focus app-building
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-building-guidance --focus app-building --recipeLimit 8
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-building-guidance --focus app-building --detail recipes
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-building-guidance --recipeKey convention-minimal-app
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-building-guidance --recipeKey routed-catalog-storefront
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey state-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey convention-minimal-app --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey localized-validated-state-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey multi-step-state-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey searchable-data-table --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-app-shell --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-searchable-data-table --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-validated-state-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-service-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-service-validated-state-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-localized-validated-state-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-localized-validated-state-backed-form --usage pattern-reference --rootDir . --text
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-catalog-storefront --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-catalog-storefront --rootDir . --recipeSourceFile src/state/catalog-state.ts --recipeSourceFile package.json
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-catalog-storefront --rootDir . --sourceFilePaths "src/app.html,src/state/catalog-state.ts,src/routes/product-detail-route.html"
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-searchable-data-table --rootDir . --sourceTextRequestHintKey implementation-source
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-searchable-data-table --sourceParameterValue detail-route-parameter=accountId --sourceParameterValue list-route-path=accounts --sourceParameterValue list-route-title=Accounts --sourceParameterValue "table-entity=Customer Account" --sourceParameterValue table-collection=accounts --text
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey routed-catalog-storefront --rootDir . --effectDetail contracts
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey state-backed-form --rootDir . --includeText true --effectDetail contracts
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-query-catalog --group router
pnpm --filter @aurelia-ls/mcp dev:invoke -- workspace-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-minimal-app
pnpm --filter @aurelia-ls/mcp dev:invoke -- workspace-overview --workspaceRoot C:\path\to\monorepo --projectPageSize 10
pnpm --filter @aurelia-ls/mcp dev:invoke -- analysis-cache-overview
pnpm --filter @aurelia-ls/mcp dev:invoke -- analysis-cache-overview --includeKernelBreakdowns true --includeDetailDensity true --includeQueryClaimRows true --rowLimit 4
pnpm --filter @aurelia-ls/mcp dev:invoke -- clear-analysis-cache
pnpm --filter @aurelia-ls/mcp dev:invoke -- clear-analysis-cache --typeSystemDependencyCacheClearPolicy all
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form --appRetention retain-app
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form --includeAuthoringOrientation true
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-overview --workspaceRoot C:\path\to\monorepo --projectKey app --projectRootDir packages/app
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-overview --workspaceRoot C:\path\to\monorepo --projectKey app --projectRootDir packages/app --analysisDepth runtime-topology
pnpm --filter @aurelia-ls/mcp dev:invoke -- router-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form
pnpm --filter @aurelia-ls/mcp dev:invoke -- router-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form --rowPageSize 3
pnpm --filter @aurelia-ls/mcp dev:invoke -- open-seam-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form
pnpm --filter @aurelia-ls/mcp dev:invoke -- diagnostic-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form
pnpm --filter @aurelia-ls/mcp dev:invoke -- diagnostic-overview --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-routed-state-backed-form --diagnosticProjection available-products
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-query --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-minimal-app --queryKind summary
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-query-batch --workspaceRoot packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces --input '{"queries":[{"kind":"summary"},{"kind":"app-topology"},{"kind":"app-diagnostic-summary","page":{"size":5},"diagnosticProjection":"available-products"}]}'
pnpm --filter @aurelia-ls/mcp dev:invoke -- template-cursor-info --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-state-backed-form --cursor src/components/state-backed-form.html:2:43
pnpm --filter @aurelia-ls/mcp dev:invoke -- template-diagnostics --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-state-backed-form --sourceFile src/components/state-backed-form.html
pnpm --filter @aurelia-ls/mcp dev:invoke -- template-diagnostics --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-state-backed-form --sourceFile src/components/state-backed-form.html --diagnosticProjection type-projection
pnpm --filter @aurelia-ls/mcp dev:invoke -- template-diagnostics --workspaceRoot packages/semantic-runtime/fixtures/authoring/generated-state-backed-form --includeAuthoringTemplates true --authoringTemplateSourceFile src/components/state-backed-form.html
```

The local command aliases remain useful for short terminal work, but the invoker
also accepts public MCP tool names such as `aurelia_app_building_guidance` and
`aurelia_authoring_recipe_plan`. Prefer public names when checking the surface
another MCP client will call. Pass `--text` or `--output text` when the question
is whether the public MCP content is terse enough; JSON remains the default when
the structured payload itself is under review. For recipe-plan adaptation probes,
pass `--sourceParameterValue key=value` repeatedly or `--sourceParameterValues`
with a JSON array or semicolon-separated `key=value` list. Route identity slots
can be source-applicable, and searchable-table `table-entity` / `table-collection`
values can now rewrite the table source model identity. Supported searchable-table
`table-filter-fields` values can rewrite row fields, filters, columns, service
records, table cells, and routed detail rows. When those fields carry select
filters, `table-options` values can rewrite option union types, filter option
lists, labels, and sample values. Product/item catalog recipes mirror that
option lane with `catalog-options` when generated catalog fields include select
domains. Wider domain schema, data, copy, and
presentation slots may remain advisory until the source ontology
can safely rewrite those layers. Check `sourcePlan.pattern.adaptationGroups`
before adapting source text; grouped slots mark sample scenario pieces that need
to move together rather than isolated token replacements. When guidance returns
multiple rows with the same recipe key, use `instanceLabel` as coordination
metadata and still call `aurelia_authoring_recipe_plan` with the ordinary
`recipeKey` plus that row's suggested source parameters. Prefer
`sourceTextRequestHintKeys` such as `implementation-source`,
`state-domain-service`, `templates`, or `project-tooling` when requesting recipe
text by role; use exact `sourceFilePaths` for smaller custom selections after
reading the generated manifest.

Review registered prompt text through the built stdio server without editing the
broad probe script:

```powershell
pnpm --filter @aurelia-ls/mcp dev:prompt -- aurelia_build_app_feature --featureGoal "Add a routed form" --focus forms --includeRouter true
pnpm --filter @aurelia-ls/mcp dev:prompt -- aurelia_plan_authoring_recipe '{"recipeKey":"state-backed-form"}' --json
```

The prompt invoker exists because prompt wording is part of the public app-building
surface. Use it when adjusting low-boilerplate guidance or MCP call choreography;
keep `probe:stdio` for the broader protocol smoke.

## Tool Shape

The first preview intentionally exposes read-only semantic-runtime queries:

- `aurelia_workspace_overview`
- `aurelia_analysis_cache_overview`
- `aurelia_clear_analysis_cache`
- `aurelia_authoring_catalog`
- `aurelia_app_building_guidance`
- `aurelia_authoring_recipe_plan`
- `aurelia_app_query_catalog`
- `aurelia_app_overview`
- `aurelia_router_overview`
- `aurelia_app_query`
- `aurelia_app_query_batch`
- `aurelia_authoring_orientation`
- `aurelia_open_seam_overview`
- `aurelia_diagnostic_overview`
- `aurelia_app_diagnostics`
- `aurelia_template_cursor_info`
- `aurelia_template_completions`
- `aurelia_template_diagnostics`

It also exposes catalog resources backed by the same semantic-runtime session as the tools:

- `aurelia://authoring/catalog`
- `aurelia://authoring/guidance`
- `aurelia://authoring/recipes`
- `aurelia://authoring/operations`
- `aurelia://semantic-runtime/app-queries`

And small workflow prompts:

- `aurelia_orient_workspace`
- `aurelia_plan_authoring_recipe`
- `aurelia_build_app_feature`

Tool responses return short human text plus machine-readable `structuredContent` that conforms to the shared MCP output
schema `{ tool, generatedAt, workspaceRoot, value }`. Use the direct invoker when you want the full JSON envelope printed
in a terminal. Authoring tools also return MCP resource links to the related catalog slices so clients can expand stable
context without embedding every slice in the initial tool result.
Use `aurelia_build_app_feature` when a client is about to edit source: it starts with
`aurelia_app_building_guidance`, optionally inspects an existing app, pulls in router or diagnostic tools only when the
feature calls for them, treats `recipePlanSequence` as source choreography instead of treating the returned recipe rows
as a scaffold checklist, reads host-adapted slot summaries before copying reference source, and keeps source edits
outside the read-only MCP shell.
For mixed app goals, `recipePlanSequence` is breadth-aware: the primary row should own the main feature/navigation
surface set, while companion rows add focused patterns such as validation, localization, routing support, or checkout
flow without asking the client to apply multiple complete scaffolds.
When routing and validation are both explicit but localization and service loading are not, guidance should route the
client to `routed-validated-state-backed-form` instead of asking it to merge the plain routed form with a separate
validated form recipe.
The generic app query tool returns a resource link to `aurelia://semantic-runtime/app-queries`, and
`aurelia_app_query_catalog` exposes the same semantic-runtime-owned query catalog directly. Use that catalog to choose
valid `queryKind` values and to see whether a query expects handles detail, a source-file locus, a cursor, or one of the
catalogued `pagingKind` modes. It also exposes `minimumAnalysisDepth`, which the MCP adapter uses for generic app-query
opens when the caller did not choose a depth. Pass `group` or `queryKind` when only one slice of the catalog is needed.
The query catalog text is semantic-runtime-owned and includes the returned query kinds, result roles, depth/boundary
costs, and batch/summary-first hints, so MCP clients do not need local query-selection prose.
Diagnostic tools and the generic app query accept `diagnosticProjection` for query-catalog rows that advertise it:
`available-products` answers from diagnostics already materialized by the opened app-world, while the explicit diagnostic
surface includes ordinary TypeScript project diagnostics from semantic-runtime's Program/tsconfig epoch, including
`tsconfig.json` read/parse/option diagnostics, and may spend answer-time TypeChecker work for weak owner/member analysis.
Focused `typescript-diagnostics` and `typescript-diagnostic-summary` reads are already explicit Program/tsconfig
diagnostic requests, so they do not downshift to `available-products`. Keep orientation-style reads cheap unless the
caller explicitly needs the richer diagnostic surface. After lint or formatter autofixes, rerun
`aurelia_diagnostic_overview`, `aurelia_app_diagnostics`, or `aurelia_app_query` with
`queryKind=typescript-diagnostic-summary` before treating the app as clean. Diagnostic and open-seam overview text is
semantic-runtime-owned too: it reports severity/domain/code or seam-kind/reason-kind clusters before raw rows are paged.
All query tools are annotated as read-only, closed-world MCP tools. `aurelia_clear_analysis_cache` is annotated as a
non-destructive, idempotent cache-management tool because it clears cached app epochs inside retained semantic-runtime
sessions, not source files or project configuration. Use `aurelia_analysis_cache_overview` while hand-testing a
long-lived local MCP server to see which semantic-runtime sessions and app epochs are cached before deciding whether to
clear them. Pass `includeKernelBreakdowns=true`, `includeDetailDensity=true`, `includeQueryClaimRows=true`, and a small
`rowLimit` when you need top product/detail/handle-density rows plus recent retained query outcomes; the overview
reports source-file counts instead of source-file samples so cache inspection stays useful without dumping app-specific
template paths. Pass `typeSystemDependencyCacheClearPolicy=all` to `aurelia_clear_analysis_cache` only when process
memory pressure matters more than keeping dependency and library TypeScript source files warm for the next app open;
use narrower policies such as `default-libraries`, `node-modules`, or `external-declarations` when cache overview
shows one bucket dominating.
Cache overview text is split deliberately: the MCP session registry names retained server sessions and selected
workspace roots, while each nested semantic-runtime answer owns the app epoch, kernel, process-memory, dependency-cache,
and query-claim wording. The generic MCP text extractor forwards both nested and top-level `displayText`, so direct
stdio hand-tests do not need JSON spelunking just to decide whether to retain or clear a session.

The generic `aurelia_app_query` tool exists so a local client can hand-test new semantic-runtime query kinds before the
MCP shell receives a more curated tool. Curated tools should be added when the shape is stable enough to explain to app
developers.
App-query answers may carry `continuations`: typed semantic-runtime next moves with a followable `targetQuery`, intent
labels, cost, evidence state, source precision, staleness, and blockers. Pass `continuationIntents` when the caller
already knows the task posture, such as `inspect`, `diagnose`, `repair`, `verify`, or `profile`; semantic-runtime
filters only the response envelope and leaves query materialization identity unchanged. MCP clients should follow those
returned target queries instead of inventing adapter-local related-query heuristics from prose.
Use `aurelia_app_query_batch` when a client needs several related app answers for one orientation move. The adapter
forwards the batch to `runtime.answerAppQueries(...)`, so one app-open boundary can answer several child query claims
and then apply the same app-retention policy as single routed queries. This is preferable to a transport-local cache:
semantic-runtime owns the query-outcome graph, materialization policy, and disposal telemetry. Leave
`includeAppProfile` and `includeAppQueryClaimProfiles` unset for ordinary app-building answers; use
`aurelia_analysis_cache_overview` or opt into those batch fields only when profiling construction cost or retained
query-claim shape is the actual task. Batch text is semantic-runtime-owned and lists each child query kind, materialization
policy, and child answer summary, so the low-token text answer remains useful even when child row pages are intentionally
empty. MCP result text also appends a bounded child-continuation line for batch answers so callers can see representative
followable target queries without opening the structured rows first.
The MCP adapter treats read-only app inquiries as recompute-friendly by default: it forwards them through
`runtime.answerAppQuery(...)` with dispose-app retention, so large hand-tested apps do not leave app-world epochs cached
inside the server process. Pass `appRetention=retain-app` while hand-testing when several tools should reuse one opened
app epoch; use `aurelia_analysis_cache_overview` afterward to inspect the retained epoch and query-claim rows, and
`aurelia_clear_analysis_cache` to reclaim it. The process-local TypeSystem dependency cache is separate and remains
visible through `aurelia_analysis_cache_overview`.

`aurelia_app_overview` is summary-first: app shape, topology counts, diagnostic clusters, and open-seam clusters are
included by default at `runtime-topology` depth, while compact authoring orientation is opt-in with
`includeAuthoringOrientation=true`. Its text is semantic-runtime-owned and names app shape, route counts, binding-row
availability for the selected depth, pressure status, and the next low-token tool family. Runtime-topology overviews
name runtime binding presence but do not imply value-channel or data-flow absence; ask for `binding-observation` when
those rows should guide edits. `aurelia_router_overview`
owns the same kind of text for route/runtime-tree counts and keeps sample rows opt-in through `rowPageSize`.
Compact `aurelia_authoring_orientation` is the low-token code-shape view: it keeps coverage, taste, capability,
applicable recipe-fit, open-reason, and paged repair-cluster counts, but omits operation rows, not-applicable recipe
rows, individual repair rows, repeated ontology prose, and cluster action targets/member hints. Pass `detail=handles`
only for local repair planning or a focused diagnostic investigation that needs editable source loci.
Its semantic-runtime-owned `displayText` highlights taste signals such as direct state/domain template access,
one-hop forwarding accessor pressure, source-backed getter observation, recipe fit, repair pressure, and open reasons
without making the MCP adapter interpret the ontology.

`aurelia_app_building_guidance` is the compact public first stop for generated-app design. It is static
semantic-runtime guidance, not MCP-local advice: it selects low-boilerplate principles, recipe rows, taste-value keys,
framework-grounded decision rows, expected-effect counts, source-plan summaries, and follow-up semantic-runtime surfaces for a focus such as
`app-building`, `forms`, `state`, `routing`, `plugins`, `composition`, or `diagnostics`. Pass `recipeKey` when a client
already selected a recipe. Broad `app-building` guidance returns a small breadth-weighted recipe set by default, so the
first answer covers ordinary state-backed forms, searchable table state, route shells, and routed table/detail
structure. Use `featureGoal` to steer larger catalog, plugin-backed route/form, service-boundary, or mixed app surfaces
without broadening the default payload. Pass `recipeLimit` or use
`aurelia_authoring_catalog` when comparing the full recipe set. Feature-goal guidance keeps the first answer tighter
than the broad catalog map: the default compact response highlights up to three recipe rows, three principle rows, and
four decision rows while the structured `recipePlanSequence` carries the actual source choreography. Matched feature
goals filter comparison rows to requested-signal coverage; use `aurelia_authoring_catalog` for the full recipe set.
Compact guidance
also caps structured principle and decision rows to the text-channel highlight count by default; pass `principleLimit`
or `decisionLimit` for a wider
policy slice without expanding recipe details. Focused compact guidance uses semantic-runtime-owned order tables rather
than fuzzy text matching: `focus=routing` leads with route-selected state and active navigation, `focus=forms` leads
with framework value-channel policy, and selected recipes use recipe-specific principle and decision order. Compact
focused recipe rows are still capped; use `detail=recipes` or `recipeLimit` when comparing the wider focused set. Pass
`featureGoal` when a natural-language feature combines several modeled concerns. Semantic-runtime applies explicit
goal-signal rows such as routing, searchable-list, localization, and validation to reorder recipes and keep the relevant
decision keys visible; signal rows also expose planning layers so mixed goals can return a `recipePlanSequence` that
starts from the main feature surface and adds companion recipe plans for remaining framework capabilities. Signal rows
also expose `primaryWeight` so searchable/list, catalog, wizard, and widget surfaces can lead mixed goals before
lower-priority framework capability companions. Sequence rows
distinguish `usage=source-plan-start` from `usage=pattern-reference` so clients merge companion plugin/capability
patterns instead of applying multiple complete app scaffolds. Feature-goal terms are normalized token/phrase matches
or explicit token conjunctions, not substring search, and capability signals should use high-signal phrases such as `validation messages` or
`translated labels` rather than generic nouns like `messages` or `labels`. Form-entry signals require an explicit form,
settings, profile/editor, preferences, onboarding/wizard, address/payment, API-key, or field/control-as-field surface;
bare list/browser controls such as a branch select or filter checkbox stay on the list/filter lane unless a data-entry
surface is named. Service-boundary signals require explicit integration
language such as service-backed/service-layer, API service/client/call, HTTP, repository pattern/class or data-repository, or loading data; customer-service
domain wording, repository-browser domain wording, and settings fields such as API keys stay on the form lane unless service integration is named, and a route-only settings screen stays on the app-shell lane.
Write-oriented integration wording such as API-backed save, backend submit/save, or persist-through-API activates the
service-backed form companion through `service-write-boundary`; a plain API-key field plus save button stays ordinary
form guidance.
Search/list signals use search/filter/sort/table/list/directory or explicit data/user/record/item-grid wording, not bare layout-grid wording.
Catalog-product signals use storefront, cart/checkout, or product catalog/list/table/grid/card/detail wording, not bare product or catalog nouns;
product/admin table plus editable-detail wording stays on the searchable-table/form path unless storefront/catalog/card/cart/checkout/pricing/compare intent is also present.
If ordinary list/detail surfaces start over-selecting the full searchable-data-table recipe, add a framework/docs/test-grounded
simple collection recipe rather than weakening the current table guidance.
Architecture-choice signals such as explicit `@aurelia/state`
requests can lead before ordinary list/form companion patterns. Bare todo/list wording stays on ordinary DI state/list
guidance unless the caller asks for `@aurelia/state`, state-store, or store-backed-state architecture explicitly. Bare
dashboards do not imply dynamic composition unless the goal also names compose/widget concepts. Compact comparison recipe rows require a requested signal match and
filter out unrequested feature specializations unless they are part of the published `recipePlanSequence`; a route-only
dashboard should not compare against catalog, table, form, or widget scaffolds. When no authored signal matches, the text channel says so before
using the focus/default recipe order. Treat those fallback rows as broad orientation context rather than a confident
scaffold choice; the `Next` line should refine the goal or inspect/catalog-compare before recipe source is requested.
Matched feature-goal sequence rows may also carry conservative `sourceParameterValues`: routed table/form recipes can
suggest route identity/title values only when that row owns the navigation-frame signal, and searchable table rows can
suggest table entity/collection values that semantic-runtime applies to source model identity. Explicit filter/search/sort
phrases may also surface as normalized source-applied `table-filter-fields` such as `name, assignee select` rather than
raw prompt phrases; table field suggestions require row-field/filter/sort/column context, so global controls such as a
repository branch selector stay host-adapted and surface chunks such as `searchable table` do not become table fields.
Likewise, `searchable <collection>` phrases establish the collection surface rather than a generated `<collection>
select` field.
Product-tier/pricing-tier wording can select the catalog lane even without the word catalog. Catalog
rows can also apply `catalog-entity`, `catalog-collection`, and supported `catalog-fields` to core product/item/tier-like
storefront identity, item constructor fields, sample records, and routed detail field rows; catalog field suggestions seed `name, description` plus detected field descriptors such as `category select`,
`price number`, or `available toggle`. Type-compatible natural fields such as `name`, `summary`, `price`, and
`inStock` can satisfy the card contract directly, while derived slots such as `badge` and `availability` remain
generated getters. The source plan remains a
scenario reference for selection/action model and presentation rather than a generic collection generator. Standard request-form rows can apply
`request-entity`, `request-selection-id`, and supported `request-fields` to the core request/domain class, scalar ID,
state/service method names, component bindable name, template-local object handoff, field properties, control bindings,
validation targets, and expected effects. Request field generation currently covers text, email, secret, textarea,
number, checkbox, and single-select controls inferred from normalized explicit field/control phrases; generated number
inputs use `value-as-number.bind`. Option labels/values, sample data,
copy, selection/action model, validation-message copy, and presentation values remain advisory until semantic-runtime
owns deeper caller-domain source generation. Editable detail companion forms can reuse source-shaped table field
descriptors when the same goal names table/search filters and editable details; ordinary filter controls still stay off
the form lane unless a data-entry surface is explicit. The MCP adapter forwards the field without interpreting it.
Structured `recipePlanSequence` rows also expose `suggestedSourceParameterContracts` with each suggestion's
`valueShape/applicationPolicy`. The text channel mirrors those rows as `Suggested sourceParameterValue contracts`, so
clients can keep copyable `key=value` inputs separate from the decision about whether a slot is source-applied or
host-adapted. Pass `detail=recipes` only when inline recipe preference rows are worth the extra tokens.
`aurelia_authoring_recipe_plan` accepts the same usage values. Use `usage=pattern-reference` for companion rows so the
text channel reinforces merge intent even though the structured source plan still contains the complete recipe shape.
Decision rows answer common code-economy choices directly, such as where durable state should live, when to bind
templates to state/domain objects directly, when an ID/object component handoff is appropriate, and why ordinary
getter observation does not require `@computed`. They also keep raw-object handoff explicit: use proxy escape guidance
for external libraries, host APIs, workers, or serialization boundaries instead of disabling observation broadly. The
state-store recipe has its own plugin-state decision so an explicit `@aurelia/state` request does not reuse the generic
DI-owned-state recommendation as if those were the same architecture. When a decision points at several app-query
surfaces, `app-query-batch` is listed first so clients can inspect related binding, route, state, or observation facts
through one app-open boundary.
`localized-validated-state-backed-form` is the common plugin-backed form recipe for translated, validated data-entry
flows, `multi-step-state-backed-form` is the wizard/progress form recipe for larger validated forms without forwarding
accessor boilerplate, `routed-app-shell` is the generic routing recipe for RouterConfiguration, static route config,
named `au-viewport`, route params, query values, fragments, and routeable components without importing a form, catalog,
or table domain model, `routed-service-backed-form` combines route-param selected form state with a state-owned service
boundary, `routed-localized-validated-state-backed-form` adds route-param ownership and static navigation around
plugin-backed forms, `searchable-data-table` is the low-boilerplate data-grid recipe for search, filters, sorting,
pagination, selection, native value channels, debounce, and direct state/domain bindings, `routed-searchable-data-table`
adds list/detail routes, row-driven profile navigation, route-context selected state, and shared table state, and
`routed-catalog-storefront` is the larger app-building recipe that combines DI-owned
catalog state, service-backed loading, list/detail routes, route params, root static detail navigation, data-driven
card links, and route expected effects. `state-store-list` is the explicit `@aurelia/state` canary for
StateDefaultConfiguration, default/named stores, `.state`/`.dispatch`, and `& state`; keep it opt-in rather than using it
as the generic state default. For active navigation styling, generated guidance prefers router `activeClass` when CSS is the only consumer;
use `load`'s `active.bind` when application state needs to react to active-route status. The
returned `displayText` is intentionally short enough for MCP text content, while the structured rows preserve the
underlying policy and recipe facts. In compact guidance, expanded choose/avoid, operation-kind, expected-effect kind,
source-role, and taste-value rows are intentionally withheld; use `detail=recipes` for those rows.
`convention-minimal-app` is the public-scaffold-like app-shell canary: it uses the `aurelia` facade entrypoint and
current modeled Aurelia class/file/template conventions instead of a root `customElement` decorator when the convention
pair is provable. Use it for code-economy app shell guidance, and use explicit decorator recipes when the component
needs metadata or dependencies that conventions do not express.

`aurelia_authoring_recipe_plan` is read-only. It returns the semantic plan and source edit plan for a recipe, with
semantic-runtime-owned `displayText`, preference counts, taste-value keys, expected-effect counts, kind summaries, and
compact `expectedEffectHighlights` by default. The highlights name the few semantic promises most useful before source
text is requested, such as direct state/domain reads, `LetBinding` scope-slot handoff, ordinary getter observation,
service handoffs, value-channel observer couplings, and route topology. Compact mode keeps those highlights at the plan
level instead of repeating them inside every operation step. Pass
`effectDetail=contracts` only when row-level preference and verification contracts are needed; the compact default keeps
MCP app-building calls small even for larger recipes. Concrete file text is included when `includeText` is true or when
`sourceFilePaths` selects specific files; pass `includeText=false` only when a caller wants the selection recorded
without text. Use selected source paths when a client needs a few files while preserving the complete source-plan
manifest. `sourcePlan.textSelection` reports normalized requested, matched, unmatched, and included paths so clients can
recover from a stale file pick without asking for every generated artifact.
`sourcePlan.textRequestHints` groups source paths into `implementation-source`, `entry-shell`, `templates`,
`state-domain-service`, `presentation`, and `project-tooling` request clusters. Prefer `implementation-source` when a
client needs app source without reference CSS, pair it with `project-tooling` for a new project, and use narrower
state/domain or template hints when editing file-by-file. Presentation paths are reference CSS/copy unless the caller
explicitly wants them.
Table and catalog recipe source plans keep reference CSS/presentation and pattern declarations in dedicated authoring
modules, so clients should treat `presentation` as optional example styling rather than part of the reusable data-state
or routing pattern. Shared list/detail route identity slots are also modeled once and reused by routed recipes, so
clients can treat `detail-route-parameter`, `list-route-path`, and `list-route-title` as one route-identity group before
adapting catalog, table, or form-specific domain code. Routed catalog plans derive omitted route path/title/detail-ID
defaults from applied catalog entity/collection values, so a caller-supplied domain does not accidentally keep the
reference `products` route unless that value is requested explicitly.
`sourcePlan.pattern` distinguishes domain-neutral app-shell patterns from reference instantiations. When
`domainModelPolicy=reference-instantiation`, concrete class names, fields, sample data, copy, and CSS are example
material for fixture verification and source-shape study; clients should adapt them to the caller domain while keeping
the semantic architecture and expected effects. `sourcePlan.pattern.usePolicy` is the primary client action:
`apply-as-source-start` can scaffold directly, `adapt-before-emitting` must be caller-domain adapted,
`merge-selectively` is companion pattern material, and `analysis-pressure-only` should not become app output.
`sourcePlan.pattern.parameters` names the main adaptation slots, such as domain entities, field schemas, collections,
selection IDs, route parameters, sample data, and presentation defaults, so a client can rewrite the reference instantiation
deliberately instead of treating sample nouns as recipe ontology. Parameters also carry `valueShape`, so the client can
tell whether a value is expected to be a domain title, source member name, route path, route parameter name, route
title, field-schema list, collection/action summary, sample-data summary, or presentation summary. Parameters with `applicationPolicy=source-text-input`
can be supplied back to `aurelia_authoring_recipe_plan` through
`sourceParameterValues` and will be applied to generated source. Searchable table `table-entity` and `table-collection`
currently apply to file/class/service/state names, route/list/detail source for routed tables, and related expected
effect identities. Catalog `catalog-entity` and `catalog-collection` similarly apply to core product/item-like
item/collection identity; supported `catalog-fields` apply to item fields while preserving natural contract members when
their inferred type matches the card/list contract. Searchable table `table-filter-fields` apply to row fields, filter state, sortable columns,
service records, table cells, routed detail rows, and value-channel effect coverage; `table-options` applies source-backed option domains for generated select filters. Standard request-form `request-entity`, `request-selection-id`, and supported
`request-fields` apply to request/domain class names, selected-ID properties and bindables, state/service
read/load/submit method names, service class/property names, the template-local object used by direct field bindings,
field properties, control bindings, validation targets, expected effects, and the source-pattern module set. Option
domains, sample records, copy, action models, validation-message copy, and presentation remain host/AI adaptation work
until the pattern-module source generator owns them. Compact MCP text forwards semantic-runtime's host-adapted slot
summaries so unresolved option/schema/data/presentation work stays visible even when the client only reads display text.
`sourcePlan.pattern.modules` summarizes the reusable architecture first, such as router admission, route-context
selection, route parameter reads, route-link navigation, DI state, service-backed loading/submission, native
text/checked/select/matcher value channels, captured field-shell attributes, collection search/sort/page/selection
controls, list rendering, class/style channels, plugin integration, dynamic composition, or state-store semantics. Use
modules to decide which shape to keep before adapting or discarding scenario nouns.
Reference-instantiation source files also report
`textAuthority=semantic-runtime-reference-instantiation`; domain-neutral shell files keep
`semantic-runtime-recipe`.
`aurelia_authoring_catalog` forwards semantic-runtime's compact catalog view. Use `catalogView=overview` for the default
low-token map, `operations` when operation rows matter, and `recipes` when comparing recipe contracts. The overview view
keeps recipe summaries and scalar counts while omitting expanded operation, lineage, taste, expected-effect, and
source-plan arrays; `full` is only for local debugging or export.
Catalog text is semantic-runtime-owned too: MCP forwards the compact `displayText` so callers can see recipe keys,
source/effect counts, and the recommended next tool without opening full JSON.

Use `aurelia_workspace_overview` first on monorepos. It returns shape/analysis rollups, `defaultAppProjectKey`, and
`appCandidates`; project rows are opt-in and paged so large workspaces stay reviewable. Pass a selected `projectKey` or
explicit `projects` array to deeper app tools when the workspace has multiple app-like packages.
For large dependency-heavy apps, keep first reads at `analysisDepth=runtime-topology` and opt into `binding-targets` or
`binding-observation` only when binding/type details are needed. For existing-app authoring, code-shape/taste questions
such as direct state/domain template access, form value channels, source-backed getter observation, or forwarding
accessor pressure need `aurelia_authoring_orientation` at `analysisDepth=binding-observation`; the cheaper topology
read is intentionally not enough for those rows.
For compact form/control explanation, prefer `aurelia_app_query` with
`queryKind=binding-value-channel-summary` before paging raw `binding-value-channels` rows. The summary keeps MCP answers
small while preserving observer-coupling mechanisms such as select option-list mutation observation, select array
mutation, checked collection/map mutation, and custom matcher comparison. Use `page.size=0` for a coupling-rollup-only
first pass; summary sets are capped and include sibling count fields when a large app has more definitions, properties,
or value types than the compact budget prints. The semantic-runtime-owned text line still names observer-coupling counts
when the row page is intentionally empty.
Use `queryKind=binding-data-flow-summary` beside it when the caller needs the compact source/target story: direction,
value-channel family, assignability/writeback counts, issue rollups, source-type open counts, source roots, and
framework error codes. Page raw `binding-data-flows` rows only after the summary shows which flow family needs exact
source spans. Issue rollups distinguish unresolved source typing, nullish source/target write-direction mismatches, and
TypeScript empty-array `never[]` targets so an MCP client can suggest source narrowing, optional contracts, or type
annotation repair without reading every binding row first. Use `page.size=0` for an issue-rollup-only first pass;
summary set fields are capped and include sibling count fields when a large app has more roots, properties, types, or
definitions than the compact budget prints. Batch text forwards the issue-kind counts so clients can choose the repair
lane before asking for raw rows.
Use `queryKind=binding-observed-dependency-summary` when the caller needs to explain why direct `state.member`, domain
object, repeat-local, collection callback, or trackable method reads are observable through Aurelia's connectable
circuit. It groups by source root, member names, dependency kinds, and `observedMemberSourceState` before raw
`binding-observed-dependencies` rows, so clients can distinguish source-backed member reads from runtime `$` names,
temporary collection values, and genuinely open scopes without spending tokens on every dependency row. Its text line
keeps those member-source-state counts visible in `app-query-batch` answers with `page.size=0`.
`aurelia_router_overview` summarizes several router row families at once and defaults to no sample rows. Pass
`rowPageSize` when a few sample rows are worth the token cost. Use `aurelia_app_query` with a specific router query kind
when one family needs cursor paging.
The direct invoker supports `--pageSize`/`--page.size` and `--pageCursor`/`--page.cursor` for cursor-bearing app
queries, and `--projectPageSize`/`--projectPage.size` plus `--projectPageCursor`/`--projectPage.cursor` for workspace
project rows. `--page.size 0` is valid for summary queries that have useful non-paged rollups, such as binding data-flow
issue summaries.
Template cursor `line` and `character` values are zero-based; an optional fourth `offset` segment can be supplied when a
caller already has the exact source offset.
Template cursor, completion, and diagnostic tools forward semantic-runtime-owned text. Cursor info names the HTML/value
site and selected semantic facts, completions preview candidate names and frontier state, and diagnostics summarize
returned-page severity/kind/code pressure before raw rows are paged.
For MCP-client calls, prefer absolute `workspaceRoot` values because relative paths resolve from the server process
working directory. The direct invoker resolves relative paths from the original shell invocation directory for easier
local probing.
