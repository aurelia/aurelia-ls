# Aurelia MCP

`@aurelia-ls/mcp` is a local stdio MCP server for Aurelia projects. It exposes
semantic-runtime workspace and app analysis, curated Aurelia Patterns, and a
bundled Aurelia documentation snapshot to MCP clients.

The server makes no project-file writes. Ordinary workspace calls reconcile
source and configuration changes; source edits are applied by the MCP client or
coding agent.

## Release Status

| Surface | Version | Status |
|---|---:|---|
| [GitHub tarball](https://github.com/aurelia/aurelia-ls/releases/tag/mcp-v0.3.1) | 0.3.1 | Latest published release |
| [Protocol reference](./docs/reference-v0.3.0.md) | 0.3.0 | Current protocol |

The [0.3.1 release notes](./release-notes/mcp-v0.3.1.md) cover the current fix.
The [0.3.0 notes](./release-notes/mcp-v0.3.0.md) describe the client migration
from 0.2.0.

## Install The Published Release

For diagnostics that should agree with project-local `tsc`, install the
tarball as a dev dependency in the Aurelia app:

```powershell
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.1/aurelia-ls-mcp-0.3.1.tgz
```

Configure the MCP client to launch the app-local package:

```powershell
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Provider-specific configuration is available for
[Codex, Claude Code, Claude Desktop, Cursor, and VS Code](./docs/providers/README.md).

For a quick trial:

```powershell
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.1/aurelia-ls-mcp-0.3.1.tgz
```

Direct URL `npx` runs in a temporary package-manager context. A project-local
install lets the analyzer use the workspace's TypeScript package. Then call
`aurelia_app_query` with `queryKind=typescript-diagnostic-summary` and prefer
`relation=same-package`.

## Tool Surface

The 0.3.1 server registers 19 tools:

| Area | Tools |
|---|---|
| Workspace and configuration | `aurelia_workspace_overview`, `aurelia_project_configurations` |
| Managed analysis state | `aurelia_analysis_cache_overview`, `aurelia_clear_analysis_cache` |
| App discovery and summaries | `aurelia_app_query_catalog`, `aurelia_app_overview`, `aurelia_router_overview`, `aurelia_open_seam_overview`, `aurelia_diagnostic_overview` |
| App queries | `aurelia_app_query`, `aurelia_app_query_batch`, `aurelia_app_diagnostics` |
| Template queries | `aurelia_template_cursor_info`, `aurelia_template_completions`, `aurelia_template_diagnostics` |
| Patterns and bundled docs | `aurelia_pattern_menu`, `aurelia_pattern_example`, `aurelia_docs_search`, `aurelia_docs_fetch` |

The server also publishes orientation, app-query catalog, Patterns menu, and
docs-index resources, plus prompts for workspace orientation, feature
inspection, and feature authoring.

## Calling Essentials

- Use an absolute `workspaceRoot` for MCP calls. Pass host-known
  `projectRootHints` and hard `excludedWorkspaceRoots` when discovery needs the
  same boundaries as an editor or another consumer.
- Workspace responses include the normalized `workspaceDescriptor` used for
  analysis. Preserve its hints and exclusions on related calls.
- `aurelia_app_query_catalog` is workspace-independent and defines each query
  kind's analysis depth, inputs, paging, batching, and continuations.
- Semantic answers keep `result`, `selection`, and `coverage` independent.
  Exceptional states include unsupported/invalid/failed results,
  absent/ambiguous/rerouted selections, and open/truncated coverage.
- Paged answers return opaque cursors. Follow `nextCursor` when a row or byte
  limit stops the current page.
- Managed sessions reconcile source and configuration changes on ordinary
  calls. Cache tools accept an optional nested `workspace` selector; omitting it
  addresses all retained sessions. TypeScript dependency-cache policy is
  process-wide. The cache-clear tool reclaims in-memory analyzer and session
  retention.

See the [0.3.0 protocol reference](./docs/reference-v0.3.0.md) for the exact
transport contract and the 18 new app-query kinds.

## Patterns, Docs, And Agent Guidance

Use `aurelia_pattern_menu` to select a curated authoring starting point and
`aurelia_pattern_example` to fetch it by stable `patternId`. Adapt the returned
source, then run relevant `support.followUp` semantic-runtime checks.

Use `aurelia_docs_search` and `aurelia_docs_fetch` for framework context from
the docs snapshot bundled with the package. These tools require no runtime web
requests. Persistent project-rule text lives in
[Aurelia AI Authoring Guidance](./docs/ai-authoring.md).

## Develop From Source

Requires Node >=22.13 <25 and a clone with the `aurelia/` submodule initialized:

```powershell
pnpm install
pnpm bootstrap:aurelia
pnpm --filter @aurelia-ls/semantic-runtime build
pnpm --filter @aurelia-ls/mcp build
pnpm --filter @aurelia-ls/mcp test
```

Run the built server or invoke focused tools without restarting an MCP client:

```powershell
pnpm --filter @aurelia-ls/mcp exec au-mcp
pnpm --filter @aurelia-ls/mcp dev:invoke -- workspace-overview --workspaceRoot C:\absolute\path\to\app
pnpm --filter @aurelia-ls/mcp dev:invoke -- app-query-catalog --group template
```

Release packaging and verification are documented in [RELEASE.md](./RELEASE.md).
