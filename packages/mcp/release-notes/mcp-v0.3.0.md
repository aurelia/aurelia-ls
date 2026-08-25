# Aurelia MCP 0.3.0

Aurelia MCP 0.3.0 adds native project-configuration inspection and 18 app-query
kinds. It also defines shared workspace descriptors and explicit contracts for
answers, paging, currentness, and cache ownership.

The server makes no project-file writes.

## Install

After the `mcp-v0.3.0` GitHub release is published, install the tarball inside
the Aurelia app so the analyzer can use the project's TypeScript package:

```sh
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.0/aurelia-ls-mcp-0.3.0.tgz
```

Then configure the MCP client to run:

```sh
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

See the [provider setup guides](https://github.com/aurelia/aurelia-ls/blob/mcp-v0.3.0/packages/mcp/docs/providers/README.md)
and the [0.3.0 protocol reference](https://github.com/aurelia/aurelia-ls/blob/mcp-v0.3.0/packages/mcp/docs/reference-v0.3.0.md).

## Required Client Migration

Version 0.3 requires these client changes when moving from 0.2.0:

- Workspace-scoped tools accept `workspaceRoot`, `projectRootHints`, and
  `excludedWorkspaceRoots`. Remove `storeKey`, explicit `projects`, and
  `projectDiscovery` from MCP requests.
- Aurelia structured response envelopes now include `workspaceDescriptor`.
  Preserve its normalized project-root hints and exclusions on related calls so
  they use the same semantic source world.
- `aurelia_analysis_cache_overview` and `aurelia_clear_analysis_cache` take an
  optional nested `workspace` selector. Omit `workspace` to address every
  retained session.
- `aurelia_app_query_catalog` is static vocabulary. Call it with optional
  `group` or `queryKind`; remove `workspaceRoot` from catalog requests.
- Remove `page` from `aurelia_template_cursor_info` requests and `detail` from
  `aurelia_open_seam_overview` requests. Template completions own cursor-locus
  paging; generic open-seam queries own catalog-supported detail.
- Replace 0.2 `outcome` handling with independent `result`, `selection`, and
  `coverage` fields. A successful `result=answered` does not imply exact
  selection or complete coverage.
- Pass opaque paging cursors back unchanged. A page can stop at the transport
  byte target before its requested row count and report `byteClamped=true` with
  a `nextCursor`.

Example cache selector:

```json
{
  "workspace": {
    "workspaceRoot": "C:/projects/my-app",
    "projectRootHints": ["C:/projects/my-app"],
    "excludedWorkspaceRoots": []
  }
}
```

## Tools And Query Coverage

The release adds `aurelia_project_configurations`, bringing the named tool
surface to 19. It reads existing `aurelia.project.json` files without opening
an app world and returns either configuration/application rows or exact
configuration diagnostics with source spans.

The generic app-query surface grows from 73 to 91 query kinds. The 18 additions
are:

- analysis and ownership: `analysis-limitations`,
  `template-document-ownership`;
- resources: `resource-inventory`, `template-resource-availability`;
- explanations: `framework-capability-explanation`,
  `binding-uncertainty-explanation`, `resource-availability-explanation`,
  `attribute-interpretation-explanation`;
- IDE projections: `template-references`, `template-rename`,
  `template-rename-from-typescript`, `template-code-actions`,
  `template-semantic-tokens`, `template-folding-ranges`,
  `template-inlay-hints`;
- deeper semantic products: `template-content-projections`,
  `value-converter-applications`, `runtime-expression-access-uses`.

Use `aurelia_app_query_catalog` as the runtime authority for valid query kinds,
minimum analysis depth, selectors, paging, detail, batching, and continuation
affordances.

## Workspace, Currentness, And Cache Behavior

Workspace calls are backed by managed semantic sessions keyed by normalized
workspace descriptors. Descriptor-distinct roots, hints, and exclusions keep
their retained analysis isolated. Ordinary calls reconcile source membership,
project configuration, and analysis-basis changes before returning an answer.

Handle-bearing answers retain the app generation that owns those handles.
Other calls use query-profile retention unless the client selects
`appRetention=retain-app` or `dispose-app`.

Cache overviews separate session-owned retention from the process-wide
TypeScript dependency `SourceFile` cache. A non-`preserve`
`typeSystemDependencyCacheClearPolicy` applies once at process scope, including
when the request selects one workspace session.

Cache clearing is retention control, not a required after-edit correctness step.

## Diagnostics, Explanations, Paging, And Continuations

Diagnostics use coherent semantic-runtime generations and include ordinary
TypeScript project diagnostics alongside modeled Aurelia and template
diagnostics. Project Configuration V1 controls authored-source exclusions and
finding presentation across MCP and the editor.

Resource inventory and template availability preserve resource identity,
provenance, aliases, bindables, selection, and semantic coverage. Explanation
queries expose source-backed causes for framework capability diagnostics,
uncertain bindings, resource availability, and authored attribute
interpretation.

Open-seam overview now groups derivations by unique authored source site while
retaining raw derivation counts and causal facets. Typed continuations carry
followable target queries, source requirements, epoch dependencies, blockers,
and optional intent filtering.

Handler and runtime failures return structured MCP error content. Currentness
failures identify changed source-world facts and advertise
`retryAction=reissue-tool` when the request can be retried safely. Strict input
validation uses the standard MCP invalid-params error.

## Requirements And Boundaries

- Node >=22.13 <25
- TypeScript >=5.9 <7
- Filesystem-backed Aurelia workspaces
- Project-local installation recommended for `relation=same-package`

Analysis covers static, source-resolvable behavior. Live navigation and guards,
arbitrary plugin or state-store execution, scheduling, and bundler callbacks are
outside this release's model.

The tarball includes Aurelia Patterns, bundled docs search/fetch, and workflow
prompts. The repository also provides persistent
[AI authoring guidance](https://github.com/aurelia/aurelia-ls/blob/mcp-v0.3.0/packages/mcp/docs/ai-authoring.md).
The historical [0.2.0 release](https://github.com/aurelia/aurelia-ls/releases/tag/mcp-v0.2.0)
describes the previous published contract.
