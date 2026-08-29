# Architecture

Aurelia language tooling has two product surfaces: the VS Code extension and a
local MCP server. Each uses the shared semantic model through its own host.

This document describes the current contributor architecture. Package-specific
READMEs own lower-level implementation details.

## At a glance

```text
                       shared semantic-runtime contracts
                                  and product model
                             ┌──────────┴──────────┐
                             │                     │
                         VS Code host                 MCP host
                             │                           │
                  workspace + synced docs          workspace files
                             │                           │
                 descriptor + managed session  descriptor + session registry
                             │                           │
                  semantic-runtime answers      semantic-runtime answers
                             │                           │
                      Language Server        MCP adapter <── Patterns/docs
                             │                           │
                     VS Code extension                AI client
```

Each workspace-scoped host path creates its own descriptor-keyed
semantic-runtime session. The semantic runtime owns project meaning; adapters
own host lifecycle and presentation.

## Responsibilities

| Component | Owns |
|---|---|
| `@aurelia-ls/semantic-runtime` | The shared project model, semantic answers, and their currentness/lifetimes |
| `@aurelia-ls/language-server` | Document synchronization and LSP request/diagnostic lifecycle |
| `aurelia-2` | Workspace and process lifecycle, native VS Code presentation, and host-specific edit checks |
| `@aurelia-ls/mcp` | AI transport plus MCP-only prompts, resources, Patterns, and bundled docs |
| `@aurelia-ls/aot` | Target admission and realization of detached semantic compiler handoffs as AOT artifacts |
| `@aurelia-ls/aot-vite` | Vite 8 build lifecycle, claimed template modules, maps, and module-graph receipts |
| `@aurelia-ls/aot-assurance` | Batched same-source JIT/AOT production builds and browser-observable parity |
| `@aurelia-ls/patterns` | Curated authoring examples and the packaged Aurelia documentation snapshot |
| `@aurelia-ls/atlas` | Internal repository/framework navigation, queryable architecture memory, and maintenance lenses |

The lane harness is cross-surface assurance infrastructure. AOT is an emerging
consumer of semantic-runtime rather than a parallel semantic authority.

## How semantic rules are grounded

The framework's author-facing behavior is the source of truth. Start with
Aurelia documentation and framework tests. Use compiler and runtime evidence
when a rule needs deeper grounding, then place it with the layer that logically
owns it.

Implementation details and runtime permissiveness do not automatically define
authoring policy. Tooling adopts a stricter rule only when it is well grounded,
actionable, and unlikely to create noise.

This grounding lets the semantic model be more explicit than the runtime. For
example, tooling may need separate records for source identity, edit authority,
provenance, and currentness even when one runtime object participates in all four.

## One source world, several kinds of identity

Long-lived, workspace-scoped adapters normalize their source inputs into a
`semantic-workspace/1` descriptor. It captures the workspace root,
authored-source exclusions, and either discovered project topology with host
root hints or a complete explicit topology. One-shot runtimes can start from
equivalent runtime options, while static MCP tools need no workspace at all.

The descriptor is the shared input boundary, not a complete live editor state.
VS Code also supplies synchronized open-document text through the language
server. MCP normally reads the filesystem. Matching an editor session therefore
requires the first MCP call to receive the same root hints and exclusions. The
client must then carry the returned normalized hints and exclusions on related
workspace/app calls. Live unsaved buffers need a future explicit handoff.

Within the selected roots, semantic-runtime reads exact-root Project
Configuration V1 as project semantic input. `aurelia.project.json` defines
durable source exclusions and finding presentation. Semantic-runtime's schema
and parser own its meaning. VS Code's separate schema provides editing
assistance only.

Several identity questions must stay separate:

| Question | Authority |
|---|---|
| Which logical source belongs to this project? | Semantic project/source admission |
| Which physical file and TypeScript Program provide its types? | Type-system project and resolved package instance |
| Can the source be read or navigated? | Exact source mapping and readable-source authority |
| Can tooling edit it? | Authored-source ownership plus consumer transaction checks |
| Which framework resource does an authored token mean? | Runtime-normalized resource identity plus the exact authored token |

An excluded or external file may remain readable and navigable without becoming
editable. An authored HTML or SVG token may also preserve its spelling while
the browser-normalized name is used for framework identity. These distinctions
prevent path similarity or parser normalization from granting edit authority.

## From source to a semantic answer

Semantic-runtime turns a source world into answers in five broad steps.

1. **Admit projects and sources.** Boot discovers or receives project roots,
   applies host hints and exclusions where relevant, reads compiler options,
   and establishes project/source ownership.
2. **Model framework construction.** Static evaluation records configuration and
   registration effects. DI, resources, routing, plugins, and other framework
   domains consume those facts through their owning models.
3. **Analyze templates.** Compiler-world and template materializers parse HTML
   and Aurelia expressions, build scopes, lower bindings, and use the owning
   TypeScript project where type projection is needed.
4. **Publish one app generation.** The kernel keeps separate record families for
   materialized products and, where available, their identity, source address,
   provenance, evidence, claims, and open seams. Publication is atomic:
   consumers see the previous generation or the new generation, never a partial
   mixture.
5. **Answer a query.** The API selects an exact locus when possible, projects
   only the requested product shape, applies paging, and returns typed next moves
   where another query can continue the investigation.

The kernel is a normalized in-process record store, not a transport database.
Opaque handles are valid only for the generation that owns them. Portable
answers use serializable source references and semantic fields instead.

`auLink` is narrower still. It links local model declarations to specific
Aurelia framework symbols or facets; it does not replace product vocabulary or
prove whole-class parity. Atlas reads these links and the surrounding source as
maintainer navigation evidence.

## Managed sessions and currentness

A bare `SemanticRuntime` represents one resolved source-world snapshot. That is
useful for bounded scripts, contracts, and future build consumers. Long-lived
hosts use `ManagedSemanticWorkspaceSession` so each operation is checked against
the current source world.

An ordinary managed query/read operation follows this lifecycle:

1. Resolve and pin the current source world.
2. Borrow a runtime facade for one callback.
3. Compose every semantic query and exact source read into one analysis receipt.
4. Finish transport or presentation mapping inside that callback.
5. Re-check the source world and analysis basis before publishing the result.

If the proof is stale, the operation fails with a typed currentness error. The
session does not replay a callback whose mapping or side effects may already
have run. The client may reissue the complete request.

Analysis-cache clear is a separate exclusive transition. It is applied once,
then reports `current` or `reconciliation-pending` if topology changed while the
operation drained. It is never replayed or stale-rejected after the mutation has
succeeded.

Applications are also generation-bound. A `SemanticApp` pins one complete app
analysis, and replacement or disposal invalidates its handles and query objects.
This is how the system avoids combining fresh kernel rows with an old object
graph.

Cache ownership follows lifetime ownership:

| Scope | Examples |
|---|---|
| App generation | App products, handle-bearing details, app-owned query claims |
| Managed workspace session | Runtime snapshots, app epochs, TypeScript projects, session query retention |
| Process | Shared TypeScript dependency `SourceFile` cache |
| Language-server session | Synchronized document snapshots and receipt-backed diagnostic results |
| MCP process | Descriptor-to-session registry; semantic retention stays in the selected sessions and process cache |

Disjoint admitted workspace roots do not share session-local state. Several
project roots may live inside one descriptor and managed session; their project
identities and app caches remain qualified within that source world. Two
descriptors for the same filesystem root are also distinct when their hints or
exclusions describe different source worlds.

## Answers preserve uncertainty

A semantic answer separates three independent questions:

| Axis | Question |
|---|---|
| `result` | Did the query run and produce its declared shape? |
| `selection` | Was one exact semantic locus selected, none found, or more than one plausible? |
| `coverage` | Did analysis cover the requested semantic basis completely? |

Paging is a transport fact and currentness is an analysis-basis fact; neither is
folded into those axes. Resource publication also has its own freshness and
failure state. Resource inventory and availability to one selected template are
different questions.

Typed facts represent uncertainty through open coverage, missing inputs, causal
open seams, ambiguous selection, and stale currentness. Downstream features use
those facts directly.

Diagnostics follow the same rule. Semantic-runtime retains the raw diagnostic
facts and builds an answer-local presentation with a primary finding,
contextual evidence, and explicitly withheld rows. The language server maps that
presentation into LSP. VS Code owns the native Problems and Quick Fix UI.
Ordinary project TypeScript/JavaScript diagnostics remain under their native
authority.

Explanations and continuations project the same facts. Consumers follow their
typed source references and target queries.

## VS Code and language-server flow

VS Code first decides which filesystem roots are candidates for Aurelia tooling.
`auto` uses project evidence and semantic confirmation; `on` explicitly enables
a root; `off` excludes a complete subtree. Every admitted root gets an
independent language client and semantic session.

Worker transport is the desktop default. IPC is a debug/fallback path. The
extension owns start, stop, restart, replacement, and root transitions; the
language server owns requests after the transport is established.

For one editor request:

1. The language server snapshots the synchronized document and request epoch.
2. A managed semantic operation answers the query and reads any additional
   source through the pinned document/filesystem authority.
3. The language server drains transport pages when the LSP feature needs one
   complete result, then maps exact source references into URIs and ranges.
4. The managed egress check authenticates the mapped response.
5. VS Code presents the native feature and rejects stale UI context where the
   product needs an additional host check.

Document-structure features follow the same ownership. Semantic-runtime
supplies source-backed tokens, symbols, highlights, ranges, and hints; the
language server maps them, and VS Code selects and presents the native provider.

Rename has the strongest host-specific boundary. Semantic-runtime produces one
whole-operation plan or refuses it. The language server maps that plan and
reports unresolved candidates. VS Code F2 additionally validates document
version, content digest, URI identity, and real path before applying one
`WorkspaceEdit`, which gives the user one undo unit. Generic LSP clients do not
automatically receive those VS Code transaction guarantees.

Quick Fixes likewise re-plan from the current document before returning an edit.
Native diagnostic suppression is a VS Code presentation choice: exactly owned
templates may move to `aurelia-html`, which also suppresses legitimate embedded
CSS/JavaScript diagnostics.

## MCP flow

MCP is a thin transport adapter over semantic-runtime plus two MCP-only content
surfaces: Aurelia Patterns and bundled Aurelia docs.

For a workspace-scoped tool call:

1. Strict MCP input schemas validate the request.
2. The adapter normalizes the workspace inputs and selects a managed session by
   descriptor identity.
3. The tool runs inside one managed operation and receives a semantic answer.
4. MCP detaches process-private capabilities, returns structured JSON, and
   renders compact text for clients that prefer it.
5. Handler/runtime failures are serialized with their available currentness and
   retry facts; SDK input failures remain ordinary MCP invalid-params errors.

Static tools and resources such as the app-query catalog, Pattern menu, and docs
index do not open a workspace session. Cache tools can mutate analyzer retention
but never write project files. Source edits are made by the AI client or another
host.

MCP and the language server share semantic rules, not a live process or hidden
cache. Descriptor reuse provides MCP-to-MCP continuity. Exact editor parity
requires the same source-world inputs and, for unsaved content, an explicit
editor handoff that does not exist today.

## Static-analysis boundary

Semantic-runtime models behavior that can be resolved from source and bounded
framework construction. It does not run the application.

The current model stops before live navigation and guards, arbitrary plugin or
state-store execution, promise and viewport scheduling, bundler callbacks, and
general browser/runtime emulation. When those facts matter, the answer records
the missing evidence and stays open.

This boundary is product behavior. An open answer can still contain useful exact
identity, source, or type facts; consumers should preserve those facts while
showing the specific limitation.

## Retired predecessor packages

The earlier compiler, semantic-workspace, transform, Vite, SSR, SSG, and
integration-harness packages were removed rather than used as the foundation of
the greenfield AOT line. Their history remains available for requirement mining,
but their models, wire formats, snapshots, and build adapters are not current
authority.

App-builder is legacy/internal semantic-runtime substrate for research,
source-lowering experiments, and fixture pressure. The public MCP authoring path
is Aurelia Patterns followed by semantic verification of the adapted project.
See the [app-builder README](../packages/semantic-runtime/src/app-builder/README.md)
for the internal boundary.

Future AOT informs the architecture as a prospective consumer. No AOT adapter
ships in this release. Semantic-runtime is an internal substrate, with no
separately supported public core API in this release.

## Working with the architecture

Before adding a carrier, cache, helper, or adapter-specific fallback, find the
semantic product that should own the fact. First restore lost provenance or
reconnect an existing implementation. Add a new derivation only when the model
needs one.

Use the folder-level [semantic-runtime source map](../packages/semantic-runtime/src/README.md)
for local ownership and Atlas for queryable repository/framework navigation.
Keep release chronology in changelogs and recent implementation context in
workbench notes; this document owns the present-tense system shape.

## Related documentation

- [Getting Started](./getting-started.md)
- [Project Configuration V1](./project-configuration.md)
- [VS Code extension reference](../packages/vscode/README.md)
- [MCP package and protocol reference](../packages/mcp/README.md)
- [Semantic-runtime source map](../packages/semantic-runtime/src/README.md)
- [Semantic-runtime API](../packages/semantic-runtime/src/api/README.md)
