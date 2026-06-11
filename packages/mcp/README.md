# Aurelia MCP

This package is the local MCP shell for `@aurelia-ls/semantic-runtime`. It should stay a thin transport adapter:
semantic-runtime owns app discovery, query contracts, diagnostics, query claims, cache disposal, and text summaries.
Atlas, Work Router, memory, framework corpus, and other development-only surfaces stay internal.

The current preview is read-only. It helps MCP clients inspect Aurelia workspaces, query app semantics, diagnose
TypeScript/Aurelia/template issues, and follow typed continuations. Public app generation belongs to the future
app-builder API, not to the retired legacy authoring recipe surface.

## Local Development

Fresh clone setup:

```powershell
git clone --recurse-submodules https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls
pnpm install
pnpm --filter @aurelia-ls/semantic-runtime build
pnpm --filter @aurelia-ls/mcp build
```

The `aurelia/` submodule must be initialized because workspace overrides link
to its packages, but it does not need to be built for the MCP preview path.

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

Smoke the source checkout after clone/install changes:

```powershell
pnpm --filter @aurelia-ls/mcp smoke:postinstall
```

This source-checkout smoke launches the built server entry directly. The GitHub
Release tarball smoke should additionally exercise the packaged `au-mcp` bin
once release staging exists.

Large app-world opens can require more than Node's default heap while semantic-runtime performance work is still in
flux. For local MCP client registration, prefer launching with an explicit heap budget:

```powershell
node --max-old-space-size=8192 C:\projects\aurelia-ls2\packages\mcp\out\server.js
```

Invoke the adapter directly without an MCP client restart:

```powershell
pnpm --filter @aurelia-ls/mcp dev:invoke -- workspace-overview --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-minimal-app
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-query-catalog --group router
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-overview --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-routed-state-backed-form --analysisDepth runtime-topology
pnpm --filter @aurelia-ls/mcp dev:invoke -- router-overview --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-routed-state-backed-form --rowPageSize 3
pnpm --filter @aurelia-ls/mcp dev:invoke -- diagnostic-overview --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form --diagnosticProjection available-products
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-query --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form --queryKind typescript-diagnostic-summary
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-query-batch --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form --analysisDepth binding-observation --input '{"queries":[{"kind":"binding-value-channel-summary","page":{"size":0}},{"kind":"binding-data-flow-summary","page":{"size":0}},{"kind":"binding-observed-dependency-summary","page":{"size":0}}]}'
pnpm --filter @aurelia-ls/mcp dev:invoke -- template-cursor-info --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form --cursor src/components/state-backed-form.html:2:43
pnpm --filter @aurelia-ls/mcp dev:invoke -- template-diagnostics --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form --sourceFile src/components/state-backed-form.html --diagnosticProjection type-projection
pnpm --filter @aurelia-ls/mcp dev:invoke -- analysis-cache-overview --includeKernelBreakdowns true --includeDetailDensity true --includeQueryClaimRows true --rowLimit 4
pnpm --filter @aurelia-ls/mcp dev:invoke -- clear-analysis-cache --typeSystemDependencyCacheClearPolicy all
```

Review registered prompt text through the built stdio server:

```powershell
pnpm --filter @aurelia-ls/mcp dev:prompt -- aurelia_orient_workspace --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-routed-state-backed-form --includeRouter true
pnpm --filter @aurelia-ls/mcp dev:prompt -- aurelia_inspect_app_feature --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form --featureGoal "Fix form diagnostics" --includeDiagnostics true
pnpm --filter @aurelia-ls/mcp dev:prompt -- aurelia_build_app_feature --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form --featureGoal "Add a state-backed settings form" --includeDiagnostics true
```

## Tool Shape

The preview exposes read-only semantic-runtime queries:

- `aurelia_workspace_overview`
- `aurelia_analysis_cache_overview`
- `aurelia_clear_analysis_cache`
- `aurelia_app_query_catalog`
- `aurelia_app_overview`
- `aurelia_router_overview`
- `aurelia_app_query`
- `aurelia_app_query_batch`
- `aurelia_open_seam_overview`
- `aurelia_diagnostic_overview`
- `aurelia_app_diagnostics`
- `aurelia_template_cursor_info`
- `aurelia_template_completions`
- `aurelia_template_diagnostics`
- `aurelia_app_builder_catalog`
- `aurelia_app_builder_query`

It also exposes catalog resources:

- `aurelia://semantic-runtime/app-queries`
- `aurelia://semantic-runtime/app-builder`

Use `aurelia_app_builder_query` with `queryKind=recommendation-policy` when a
caller needs recommendation/defaulting posture, applicability lanes, evidence
lanes, or contextual executable rows that require explicit policy/defaulting
review before source lowering should be trusted. It returns compact counts by
default; pass `recommendationPolicy.includeRows=true` for the detailed row
table after the counts point at a policy area worth inspecting.
Use `queryKind=source-lowering-preflight` after selecting targets and supplied
inputs. Contextual executable targets reached only through a broad/default
target set report policy satisfaction as missing and do not report
`canRequestSourceLowering=true`; exact target selection is the current
first-ring satisfaction source.

And small workflow prompts:

- `aurelia_orient_workspace`
- `aurelia_inspect_app_feature`
- `aurelia_build_app_feature`

Tool responses return short human text plus machine-readable `structuredContent` that conforms to the shared MCP output
schema `{ tool, generatedAt, workspaceRoot, value }`. Use the direct invoker when you want the full JSON envelope printed
in a terminal. Pass `--text` or `--output text` when the question is whether public MCP content is terse enough.
Paged row answers are bounded by row count and estimated row JSON size; when `page.byteClamped` is true, pass the
returned `nextCursor` for the next slice rather than treating the shorter page as missing data.

Use `aurelia_workspace_overview` first on monorepos. It returns shape/analysis rollups, `defaultAppProjectKey`, and app
candidates; project rows are opt-in and paged so large workspaces stay reviewable. Pass a selected `projectKey` or
explicit `projects` array to deeper app tools when the workspace has multiple app-like packages.

For large dependency-heavy apps, keep first reads at `analysisDepth=runtime-topology` and opt into `binding-targets` or
`binding-observation` only when binding/type details are needed. Use `aurelia_app_query_catalog` before
`aurelia_app_query` when the needed query kind is not obvious. The catalog names valid `queryKind` values, result roles,
minimum depth, paging expectations, and batch/summary-first hints.

Diagnostic tools and the generic app query accept `diagnosticProjection` for query-catalog rows that advertise it.
Explicit diagnostics include ordinary TypeScript project diagnostics from semantic-runtime's Program/tsconfig epoch as
well as modeled Aurelia/template diagnostics. After lint or formatter autofixes, rerun `aurelia_diagnostic_overview`,
`aurelia_app_diagnostics`, or `aurelia_app_query` with `queryKind=typescript-diagnostic-summary` before treating the app
as clean.

App-query answers may carry `continuations`: typed semantic-runtime next moves with a followable `targetQuery`, intent
labels, cost, evidence state, source precision, staleness, and blockers. Pass `continuationIntents` when the caller
already knows the task posture, such as `inspect`, `diagnose`, `repair`, `verify`, or `profile`; semantic-runtime
filters only the response envelope and leaves query materialization identity unchanged.

Use `aurelia_app_query_batch` when a client needs several related app answers for one orientation move. Leave
`includeAppProfile` and `includeAppQueryClaimProfiles` unset for ordinary app-building answers; use
`aurelia_analysis_cache_overview` or opt into those batch fields only when profiling construction cost or retained
query-claim shape is the actual task.

For compact form/control explanation, prefer one batch containing:

- `binding-value-channel-summary`
- `binding-data-flow-summary`
- `binding-observed-dependency-summary`

Use `page.size=0` for summary queries that have useful rollups and page raw rows only after the summary shows which
flow family or source state needs exact source spans.

`aurelia_router_overview` summarizes several router row families at once and defaults to no sample rows. Pass
`rowPageSize` when a few sample rows are worth the token cost. Use `aurelia_app_query` with a specific router query kind
when one family needs cursor paging.

The direct invoker supports `--pageSize`/`--page.size` and `--pageCursor`/`--page.cursor` for cursor-bearing app queries,
and `--projectPageSize`/`--projectPage.size` plus `--projectPageCursor`/`--projectPage.cursor` for workspace project
rows. Template cursor `line` and `character` values are zero-based; an optional fourth `offset` segment can be supplied
when a caller already has the exact source offset.

For MCP-client calls, prefer absolute `workspaceRoot` values because relative paths resolve from the server process
working directory. The direct invoker resolves relative paths from the original shell invocation directory for easier
local probing.
