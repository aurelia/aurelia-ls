# Aurelia MCP 0.3.0 Protocol Reference

This document describes the public MCP transport exposed by source version
0.3.0. The schemas registered by the running server and the static
`aurelia_app_query_catalog` tool/resource are the machine-readable authorities.

For the change from 0.2.0, see the
[0.3.0 release notes](../release-notes/mcp-v0.3.0.md).

## Requirements

- Node >=22.13 <25
- TypeScript >=5.9 <7
- An absolute `workspaceRoot` for workspace-scoped MCP calls

Install the release inside the Aurelia app when TypeScript diagnostics should
agree with its local `tsc`. The `typescript-diagnostic-summary` answer reports
the package relationship:

| Relation | Meaning |
|---|---|
| `same-package` | Analyzer and workspace use the same TypeScript package. |
| `same-version-different-package` | Versions match, but package instances differ. |
| `different-version` | TypeScript versions differ. |
| `workspace-not-found` | The workspace TypeScript installation is unavailable. |

## Tool Index

The 0.3.0 server registers 19 strict-schema tools.

| Area | Tools |
|---|---|
| Workspace and configuration | `aurelia_workspace_overview`, `aurelia_project_configurations` |
| Managed analysis state | `aurelia_analysis_cache_overview`, `aurelia_clear_analysis_cache` |
| App query discovery and summaries | `aurelia_app_query_catalog`, `aurelia_app_overview`, `aurelia_router_overview`, `aurelia_open_seam_overview`, `aurelia_diagnostic_overview` |
| App queries | `aurelia_app_query`, `aurelia_app_query_batch`, `aurelia_app_diagnostics` |
| Template queries | `aurelia_template_cursor_info`, `aurelia_template_completions`, `aurelia_template_diagnostics` |
| Authoring and framework grounding | `aurelia_pattern_menu`, `aurelia_pattern_example`, `aurelia_docs_search`, `aurelia_docs_fetch` |

The server also registers four resources:

- `aurelia://semantic-runtime/orientation`
- `aurelia://semantic-runtime/app-queries`
- `aurelia://patterns/menu`
- `aurelia://docs/index`

It also registers three workflow prompts:

- `aurelia_orient_workspace`
- `aurelia_inspect_app_feature`
- `aurelia_build_app_feature`

## Shared Workspace Input

Workspace-scoped tools share this boundary:

```ts
{
  workspaceRoot: string;
  projectRootHints?: string[] | null;
  excludedWorkspaceRoots?: string[] | null;
}
```

`projectRootHints` adds existing project roots known by the caller to
semantic-runtime's project-marker discovery. `excludedWorkspaceRoots` defines
hard authored-source boundaries and takes precedence over hints.

Each workspace response returns the normalized descriptor actually used. For a
discover-mode descriptor, pass
`workspaceDescriptor.projectTopology.projectRootHints` and
`workspaceDescriptor.excludedWorkspaceRoots` back as the flat inputs on related
calls. Descriptor reuse gives MCP-to-MCP source-world continuity. Matching a
live editor also requires the first MCP call to receive the editor host's root
hints and exclusions.

Managed sessions own their store namespace and project-input authority. The
transport therefore has no caller-owned `storeKey`, explicit `projects`, or
`projectDiscovery` inputs.

## Response Envelope

Successful tool calls return short text plus `structuredContent` with this
shared envelope:

```ts
{
  tool: string;
  generatedAt: string;
  workspaceRoot: string | null;
  workspaceDescriptor: SemanticWorkspaceDescriptor | null;
  value: unknown;
}
```

`workspaceDescriptor` is `null` for static tools and all-session cache calls.
Workspace-scoped responses carry the exact normalized source-world input.

Many semantic values use three independent answer axes. They replace the 0.2
`outcome` discriminator:

| Axis | Values | Meaning |
|---|---|---|
| `result` | `answered`, `unsupported`, `invalid`, `failed` | Whether the query ran and produced its declared answer shape |
| `selection` | `not-applicable`, `exact`, `absent`, `ambiguous`, `rerouted` | What semantic locus the query selected |
| `coverage` | `complete`, `open`, `truncated`, `not-applicable` | Whether the requested semantic basis was fully covered |

Clients must evaluate all applicable axes. For example,
`result=answered`, `selection=exact`, and `coverage=open` is an exact selected
locus with unresolved semantic evidence.

Compact text omits the ordinary
`answered`/`exact`-or-`not-applicable`/`complete` state and names exceptional
states. The complete machine contract stays in `structuredContent`.

## Project Configuration

`aurelia_project_configurations` reads native `aurelia.project.json` state
without opening an app world.

```ts
{
  workspaceRoot: string;
  projectRootHints?: string[] | null;
  excludedWorkspaceRoots?: string[] | null;
  view?: "configurations" | "diagnostics" | null;
  projectKey?: string | null;
  sourceFilePaths?: string[] | null;
  page?: { size?: number; cursor?: string | null } | null;
}
```

`view=configurations` is the default. Rows include the accepted configuration
version, application state, normalized exclusions, effective finding policy,
policy authority, and diagnostic count. `view=diagnostics` returns the
runtime-owned diagnostic kind, message, severity, and exact source span.

Omit `sourceFilePaths` to select every existing configuration, pass an empty
array to select none, or pass exact workspace-relative/absolute paths. Projects
using defaults without a native file have no inventory row.

Project Configuration V1 is documented in
[`docs/project-configuration.md`](../../../docs/project-configuration.md).

## App Queries

`aurelia_app_query_catalog` is static, workspace-independent vocabulary. It
accepts optional `group` and `queryKind` filters and reports all 91 query kinds,
minimum analysis depth, runtime boundary, selector support, paging, detail,
batching, and continuation affordances. It does not accept `workspaceRoot` or
create a managed session.

The 18 query kinds added in 0.3.0 are:

- `analysis-limitations`
- `template-document-ownership`
- `resource-inventory`
- `template-resource-availability`
- `framework-capability-explanation`
- `binding-uncertainty-explanation`
- `resource-availability-explanation`
- `attribute-interpretation-explanation`
- `template-references`
- `template-rename`
- `template-rename-from-typescript`
- `template-code-actions`
- `template-semantic-tokens`
- `template-folding-ranges`
- `template-inlay-hints`
- `template-content-projections`
- `value-converter-applications`
- `runtime-expression-access-uses`

Use the catalog before constructing generic `aurelia_app_query` or batch
requests. It defines each query's selectors and other inputs. Unsupported
selectors return `result=unsupported` with the accepted affordance.

`aurelia_app_query_batch` opens one app/query-claim boundary for several
related queries. `includeAppProfile` and `includeAppQueryClaimProfiles` are
profiling fields and are normally omitted.

## Paging And Continuations

Paged queries accept:

```ts
page?: {
  size?: number;
  cursor?: string | null;
} | null
```

`size=0` requests a rollup without raw rows where the query family provides a
summary. Large sizes clamp to the MCP row limit. A page can also stop at the
estimated row-JSON byte target; `page.byteClamped=true` and `nextCursor` identify
that case. Cursors are opaque and must be passed back unchanged.

Workspace project rows use `projectPage`. Router overview uses `rowPageSize`
for samples from each router-owned collection. Template cursor info is a single
locus answer and has no `page` input; template completions are paged.

Semantic answers can carry typed `continuations`. A continuation includes a
followable `targetQuery`, intent labels, cost, source requirements, epoch
dependencies, and blockers. `continuationIntents` filters the response envelope
for postures such as `inspect`, `diagnose`, `repair`, `verify`, or `profile`;
it does not change query materialization identity.

Open-seam overview groups derivations by unique authored source site while
preserving raw row counts and causal facets. It supports site paging and
filters, and has no `detail` input. Generic `open-seam-summary`,
`open-seam-sites`, and `open-seams` queries provide the catalog-owned summary,
authored-site, raw-row, and catalog-supported detail views.

## Managed Sessions And Cache Control

Workspace calls use managed semantic sessions keyed by normalized descriptors.
The session reconciles source membership, native project configuration, and
analysis-basis changes before ordinary operations. Descriptor-distinct sessions
retain and dispose their app generations independently.

App calls use query-profile retention by default. `retain-app` keeps an app
generation for related calls; handle-bearing answers retain their owning
generation automatically. `dispose-app` is incompatible with `detail=handles`.

Cache tools use a nested selector:

```ts
workspace?: {
  workspaceRoot: string;
  projectRootHints?: string[] | null;
  excludedWorkspaceRoots?: string[] | null;
} | null
```

Omit `workspace` to inspect or clear all retained sessions. The selector scopes
session-local retained analysis. The TypeScript dependency `SourceFile` cache is
process-owned: a non-`preserve`
`typeSystemDependencyCacheClearPolicy` applies once to that process-wide cache.

`aurelia_clear_analysis_cache` is retention control, not a required
after-edit correctness step. It mutates analyzer caches and session-local
analysis retention, and never writes project files.

## Errors And Currentness

Handler and runtime failures use MCP `isError=true` and return an
`aurelia_mcp_error` structured envelope whose `value.error` includes `name` and
`message` plus available codes and currentness facts. Input-schema validation
is owned by the MCP SDK and returns the standard `-32602` invalid-params error
without the Aurelia structured envelope.

Stale-operation and analysis-currentness failures can include changed read
keys, facets, semantic fact keys, source-world revisions, and analysis-basis
revision. Retryable currentness errors set:

```json
{
  "retryable": true,
  "retryAction": "reissue-tool"
}
```

Disposed-session and reentrant-operation errors are non-retryable. Other errors
carry the structured facts available from their owning error type.

## Project-Write And Analysis Boundary

The server reads project sources and returns analysis, Patterns, docs, prompts,
and structured next moves. It makes no project-file writes; MCP clients or
coding agents apply edits.

The semantic model covers static, source-resolvable behavior. Live navigation
and guards, arbitrary plugin or state-store execution, scheduling, bundler
callbacks, and general application runtime behavior are outside its boundary.
