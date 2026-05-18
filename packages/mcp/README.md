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
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-catalog --catalogView recipes
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey state-backed-form --rootDir .
pnpm --filter @aurelia-ls/mcp dev:invoke -- authoring-recipe-plan --recipeKey state-backed-form --rootDir . --includeText true
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

## Tool Shape

The first preview intentionally exposes read-only semantic-runtime queries:

- `aurelia_workspace_overview`
- `aurelia_analysis_cache_overview`
- `aurelia_clear_analysis_cache`
- `aurelia_authoring_catalog`
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
- `aurelia://authoring/recipes`
- `aurelia://authoring/operations`
- `aurelia://semantic-runtime/app-queries`

And small workflow prompts:

- `aurelia_orient_workspace`
- `aurelia_plan_authoring_recipe`

Tool responses return short human text plus machine-readable `structuredContent` that conforms to the shared MCP output
schema `{ tool, generatedAt, workspaceRoot, value }`. Use the direct invoker when you want the full JSON envelope printed
in a terminal. Authoring tools also return MCP resource links to the related catalog slices so clients can expand stable
context without embedding every slice in the initial tool result.
The generic app query tool returns a resource link to `aurelia://semantic-runtime/app-queries`, and
`aurelia_app_query_catalog` exposes the same semantic-runtime-owned query catalog directly. Use that catalog to choose
valid `queryKind` values and to see whether a query expects handles detail, a source-file locus, a cursor, or one of the
catalogued `pagingKind` modes. It also exposes `minimumAnalysisDepth`, which the MCP adapter uses for generic app-query
opens when the caller did not choose a depth. Pass `group` or `queryKind` when only one slice of the catalog is needed.
Diagnostic tools and the generic app query accept `diagnosticProjection`: `available-products` answers from diagnostics
already materialized by the opened app-world, while `type-projection` may spend answer-time TypeChecker work for weak
owner/member analysis. Keep orientation-style reads cheap unless the caller explicitly needs the richer diagnostic
surface.
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

The generic `aurelia_app_query` tool exists so a local client can hand-test new semantic-runtime query kinds before the
MCP shell receives a more curated tool. Curated tools should be added when the shape is stable enough to explain to app
developers.
Use `aurelia_app_query_batch` when a client needs several related app answers for one orientation move. The adapter
forwards the batch to `runtime.answerAppQueries(...)`, so one app-open boundary can answer several child query claims
and then apply the same app-retention policy as single routed queries. This is preferable to a transport-local cache:
semantic-runtime owns the query-outcome graph, materialization policy, and disposal telemetry.
The MCP adapter treats read-only app inquiries as recompute-friendly by default: it forwards them through
`runtime.answerAppQuery(...)` with dispose-app retention, so large hand-tested apps do not leave app-world epochs cached
inside the server process. Pass `appRetention=retain-app` while hand-testing when several tools should reuse one opened
app epoch; use `aurelia_analysis_cache_overview` afterward to inspect the retained epoch and query-claim rows, and
`aurelia_clear_analysis_cache` to reclaim it. The process-local TypeSystem dependency cache is separate and remains
visible through `aurelia_analysis_cache_overview`.

`aurelia_app_overview` is summary-first: app shape, topology counts, diagnostic clusters, and open-seam clusters are
included by default at `runtime-topology` depth, while compact authoring orientation is opt-in with
`includeAuthoringOrientation=true`.

`aurelia_authoring_recipe_plan` is read-only. It returns the semantic plan and source edit plan for a recipe, with
global expected effects, step-local expected effects, and source edit plans. Concrete file text is included only when
`includeText` is true.
`aurelia_authoring_catalog` forwards semantic-runtime's compact catalog view. Use `catalogView=overview`, `operations`,
or `recipes` for token-budgeted public answers; `full` is only for local debugging or export.

Use `aurelia_workspace_overview` first on monorepos. It returns shape/analysis rollups, `defaultAppProjectKey`, and
`appCandidates`; project rows are opt-in and paged so large workspaces stay reviewable. Pass a selected `projectKey` or
explicit `projects` array to deeper app tools when the workspace has multiple app-like packages.
For large dependency-heavy apps, keep first reads at `analysisDepth=runtime-topology` and opt into `binding-targets` or
`binding-observation` only when binding/type details are needed.
`aurelia_router_overview` summarizes several router row families at once and defaults to no sample rows. Pass
`rowPageSize` when a few sample rows are worth the token cost. Use `aurelia_app_query` with a specific router query kind
when one family needs cursor paging.
The direct invoker supports `--pageSize` and `--pageCursor` for cursor-bearing app queries, and `--projectPageSize` plus
`--projectPageCursor` for workspace project rows.
Template cursor `line` and `character` values are zero-based; an optional fourth `offset` segment can be supplied when a
caller already has the exact source offset.
For MCP-client calls, prefer absolute `workspaceRoot` values because relative paths resolve from the server process
working directory. The direct invoker resolves relative paths from the original shell invocation directory for easier
local probing.
