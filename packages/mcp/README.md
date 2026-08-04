# Aurelia MCP

This package is the local MCP shell for `@aurelia-ls/semantic-runtime`. It should stay a thin transport adapter:
semantic-runtime owns app discovery, query contracts, diagnostics, query claims, cache disposal, and text summaries.
Atlas, Work Router, memory, framework corpus, and other development-only surfaces stay internal.

The current GitHub tarball release is read-only. It helps MCP clients inspect Aurelia workspaces, query app semantics, diagnose
TypeScript/Aurelia/template issues, follow typed continuations, fetch curated Aurelia Patterns examples for
authoring starting points, and search/fetch the bundled Aurelia docs corpus without runtime web requests. App-builder is
legacy/internal substrate unless a later product decision reopens it.

## Release Install

The MCP package is distributed as a GitHub Release tarball until npm publishing is
available. For diagnostics that should agree with project-local `tsc`, install
the tarball as a dev dependency in the Aurelia app being analyzed:

```powershell
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

Then configure your MCP client to run from that project:

```powershell
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Provider-specific config examples are in the
[MCP provider setup guides](./docs/providers/README.md).

For a quick trial:

```powershell
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

Direct URL `npx` is convenient for smoke testing, but the project-local
dev-dependency path is preferred for serious diagnostics. Global or
user-profile installs are fine for convenience, but can resolve a different
TypeScript package than the project being analyzed.

After restarting the MCP client, call `aurelia_app_overview` or
`aurelia_app_query` with `queryKind=typescript-diagnostic-summary`. A good
project-local install reports a TypeScript relation of `same-package`; public
TypeScript diagnostic answers can also report `same-version-different-package`,
`different-version`, or `workspace-not-found`.

Some MCP clients expose separate tool-search/discovery surfaces that can lag
behind the registered server tools. If discovery looks empty after setup,
restart the client and try calling an Aurelia MCP tool directly.

See [RELEASE.md](./RELEASE.md) for the temporary GitHub Release flow and
[mcp-v0.2.0.md](./release-notes/mcp-v0.2.0.md) for the
current release notes.

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
to its packages, but it does not need to be built for the MCP tarball path.

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
once release staging exists:

```powershell
pnpm --filter @aurelia-ls/mcp release:pack
pnpm --filter @aurelia-ls/mcp contract:release
pnpm --filter @aurelia-ls/mcp probe:release-tarball
pnpm --filter @aurelia-ls/mcp probe:project-local-install
```

Large app-world opens can require more than Node's default heap while semantic-runtime performance work is still in
flux. For local MCP client registration, prefer launching with an explicit heap budget:

```powershell
node --max-old-space-size=8192 C:\projects\aurelia-ls2\packages\mcp\out\server.js
```

Invoke the adapter directly without an MCP client restart:

```powershell
pnpm --filter @aurelia-ls/mcp dev:invoke -- workspace-overview --workspaceRoot packages/semantic-runtime/fixtures/pressure/app-pattern-minimal-app
pnpm --filter @aurelia-ls/mcp dev:invoke -- project-configurations --workspaceRoot playground/issue-tracker
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

The MCP exposes read-only semantic-runtime queries:

- `aurelia_workspace_overview`
- `aurelia_project_configurations`
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
- `aurelia_pattern_menu`
- `aurelia_pattern_example`
- `aurelia_docs_search`
- `aurelia_docs_fetch`

It also exposes catalog resources:

- `aurelia://semantic-runtime/app-queries`
- `aurelia://patterns/menu`
- `aurelia://docs/index`

When authoring new Aurelia code, use `aurelia_pattern_menu` when a caller needs
a compact list of curated Aurelia examples. Fetch the selected example with
`aurelia_pattern_example` by stable `patternId`, adapt the returned source into
the target app, then run the returned `support.followUp` semantic-runtime hints
that fit the adapted workspace. Pattern responses do not ask callers to provide
domain models, policy axes, target catalogs, input-readiness payloads, or
source-lowering preflight state before returning useful source.
The current guarded catalog includes 49 patterns. Release sentinels cover DOM
template refs, host custom attributes, router active navigation, fetch-client
interceptors, route-context relative navigation, dynamic composition,
fetch-client cache policy, local pagination, server query collections,
virtual-repeat, batch selection, file upload, validation submit,
server validation errors, auth session guards, i18n locale services,
dialog confirm/edit flows, template controllers, and portal overlays through
`template.dom-ref`, `resource.custom-attribute`, `router.active-navigation`,
`service.fetch-interceptor`, `router.relative-context-navigation`, and
`component.dynamic-composition`, `service.fetch-cache-policy`,
`collection.pagination`, `collection.server-query`, `collection.virtual-repeat`,
`collection.batch-selection`, `form.file-upload`, `form.validation-submit`,
`form.server-validation-errors`, `router.auth-session-guard`,
`localization.i18n-locale-service`, `dialog.confirm-edit`,
`resource.template-controller`, and `template.portal-overlay`.

Use `aurelia_docs_search` when a caller needs official Aurelia docs context
behind a pattern, API, template concept, or routing behavior. Fetch a returned
`documentPath` and optional `sectionAnchor` with `aurelia_docs_fetch`. These
answers come from the docs snapshot bundled into the MCP package; public URLs
are navigation references, not runtime fetch requirements.

For persistent project rules, see
[Aurelia AI Authoring Guidance](./docs/ai-authoring.md). It provides a compact
copyable `AGENTS.md`/`CLAUDE.md` style instruction block that teaches the
Patterns/docs/`support.followUp` workflow, semantic-runtime diagnostics, the
DI/state/router canon, and the excluded app-builder/router-direct lanes without
expanding the MCP schema.

And small workflow prompts:

- `aurelia_orient_workspace`
- `aurelia_inspect_app_feature`
- `aurelia_build_app_feature`

Tool responses return short human text plus machine-readable `structuredContent` that conforms to the shared MCP output
schema `{ tool, generatedAt, workspaceRoot, workspaceDescriptor, value }`. `workspaceDescriptor` is the exact normalized
shared source-world input for workspace-scoped calls and is `null` for static/all-session calls. Use the direct invoker when you want the full JSON envelope printed
in a terminal. Pass `--text` or `--output text` when the question is whether public MCP content is terse enough.
Compact text omits the ordinary `answered` / `exact`-or-`not-applicable` / `complete` answer state, but always names
exceptional result, selection, or semantic-coverage states such as `unsupported`, `ambiguous`, `open`, or `truncated`.
Paged row answers are bounded by row count and estimated row JSON size; when `page.byteClamped` is true, pass the
returned `nextCursor` for the next slice rather than treating the shorter page as missing data.

Omit `appRetention` for semantic-runtime's query-profile default. Handle-bearing answers automatically retain the app
generation they need; an explicit `appRetention=dispose-app` remains incompatible with `detail=handles`.

Use `aurelia_workspace_overview` first on monorepos. It returns shape/analysis rollups, `defaultAppProjectKey`, and app
candidates; project rows are opt-in and paged so large workspaces stay reviewable. Pass a selected `projectKey` or
source-file locus to deeper app tools when the workspace has multiple app-like packages. Ordinary MCP tools deliberately
do not expose synthetic explicit-project boot inputs or runtime store namespaces.

`projectRootHints` and `excludedWorkspaceRoots` are the shared semantic workspace-boundary inputs used by IDE, MCP, and
future AOT hosts. Hints add known existing project roots to semantic-runtime's project-marker discovery; exclusions are
hard authored-source boundaries and win over hints. Pass the same normalized boundary inputs on related calls so the
MCP session and editor describe the same source world. The direct invoker exposes them as repeatable
`--projectRootHint` and `--excludedWorkspaceRoot` flags. Each workspace response returns the exact descriptor used;
copy discover-mode `workspaceDescriptor.projectTopology.projectRootHints` and
`workspaceDescriptor.excludedWorkspaceRoots` back to those flat inputs on follow-up calls.

Descriptor reuse guarantees MCP-to-MCP continuity; it does not discover live VS Code-only workspace-folder or
`activationMode=off` inputs. Exact editor parity currently requires seeding the first MCP call with those same host
facts. Durable `aurelia.project.json` authored-source exclusions are shared automatically because semantic-runtime reads
them for every consumer; a live IDE-to-MCP descriptor handoff remains an explicit integration seam.

Cache-control tools use an explicit two-state selector. Omit `workspace` to inspect or clear every cached session; pass
`workspace: { workspaceRoot, projectRootHints?, excludedWorkspaceRoots? }` to select one exact shared semantic workspace
descriptor. Boundary fields without `workspaceRoot` are rejected, and descriptor-distinct sessions never cross-clear.
Session rows project that shared descriptor and do not expose runtime store namespaces or synthetic project inputs.

Use `aurelia_project_configurations` when native `aurelia.project.json` state or applied authored-source exclusions
matter. It returns exact, paged semantic-runtime rows without opening an app world; omit `sourceFilePaths` for all
existing configurations, pass an empty list for none, or pass exact absolute/workspace-relative paths to select them.
The default `view=configurations` returns inventory/applied exclusions; `view=diagnostics` returns the runtime-owned
diagnostic kind, message, severity, and exact source span. The diagnostic view remains available in config-only or
malformed workspaces where no app world can open, matching the IDE diagnostic authority rather than exposing only a
count.

For large dependency-heavy apps, keep first reads at `analysisDepth=runtime-topology` and opt into `binding-targets` or
`binding-observation` only when binding/type details are needed. Use `aurelia_app_query_catalog` before
`aurelia_app_query` when the needed query kind is not obvious. The catalog names valid `queryKind` values, result roles,
minimum depth, paging expectations, and batch/summary-first hints.
The catalog is static semantic-runtime vocabulary: it does not accept a workspace root or create an MCP runtime session.

Diagnostic tools and the generic app query accept `diagnosticProjection` for query-catalog rows that advertise it.
Explicit diagnostics include ordinary TypeScript project diagnostics from semantic-runtime's Program/tsconfig epoch as
well as modeled Aurelia/template diagnostics. Template diagnostics include removed Aurelia 1 `.delegate` and `.call`
binding commands as `AUR0713` unknown binding-command issues. After lint or formatter autofixes, rerun `aurelia_diagnostic_overview`,
`aurelia_app_diagnostics`, or `aurelia_app_query` with `queryKind=typescript-diagnostic-summary` before treating the app
as clean.

App-query answers may carry `continuations`: typed semantic-runtime next moves with a followable `targetQuery`, intent
labels, cost, source requirements, per-reference source facts, epoch dependencies, and blockers. Epoch dependencies
preserve runtime-session, project-input, app-world, and source-input invalidation authorities independently rather than
ranking them as one staleness value. Pass `continuationIntents` when the caller already knows the task posture, such as
`inspect`, `diagnose`, `repair`, `verify`, or `profile`; semantic-runtime filters only the response envelope and leaves
query materialization identity unchanged.

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

`aurelia_open_seam_overview` is authored-site-first: it groups derivations at unique source sites while preserving raw
row counts and causal facets. It supports site paging and filters, but not `detail`; use generic `open-seam-summary` or
`open-seams` app queries for causal clusters, raw rows, and catalog-supported detail. `aurelia_template_cursor_info`
returns one cursor-locus answer and therefore does not accept `page`; `aurelia_template_completions` remains paged.

The direct invoker supports `--pageSize`/`--page.size` and `--pageCursor`/`--page.cursor` for cursor-bearing app queries,
and `--projectPageSize`/`--projectPage.size` plus `--projectPageCursor`/`--projectPage.cursor` for workspace project
rows. Template cursor `line` and `character` values are zero-based; an optional fourth `offset` segment can be supplied
when a caller already has the exact source offset.

For MCP-client calls, prefer absolute `workspaceRoot` values because relative paths resolve from the server process
working directory. The direct invoker resolves relative paths from the original shell invocation directory for easier
local probing.
