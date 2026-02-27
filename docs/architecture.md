# Architecture

How the Aurelia language server analyzes projects and serves IDE features.

## Overview

The system has four layers. The **compiler** discovers resources and
compiles templates. The **semantic workspace** maintains an incremental
model of the project and dispatches feature queries. The **language
server** translates between LSP and the workspace. The **VS Code
extension** handles editor integration.

```
                    VS Code Extension
                          │
                    Language Server (LSP adapter)
                          │
                    Semantic Workspace
                    ┌─────┴──────┐
              Project Pipeline   Template Pipeline
                    └─────┬──────┘
                       Compiler
```

The key architectural property: the language server doesn't construct
semantic knowledge. The workspace owns all analysis, and the server
just asks questions. This means every feature goes through the same
resolution and confidence path.

## Package Responsibilities

| Package | Role |
|---------|------|
| `@aurelia-ls/compiler` | Resource discovery, template compilation, type system, provenance tracking |
| `@aurelia-ls/semantic-workspace` | Incremental project model, feature dispatch, workspace lifecycle |
| `@aurelia-ls/language-server` | LSP protocol adapter — translates workspace queries into LSP responses |
| `@aurelia-ls/transform` | Build-time AOT transform (injects compiled templates) |
| `@aurelia-ls/vite-plugin` | Vite integration for dev server and production builds |
| `@aurelia-ls/ssr` | Server-side rendering |
| `@aurelia-ls/ssg` | Static site generation |
| `aurelia-2` | VS Code extension |

## Compiler: Dual Pipelines

The compiler runs two cooperating pipelines that converge into a single
semantic model.

### Project Pipeline

Discovers what resources exist in the project and builds a unified
picture of each one.

```
scan → identify → characterize → converge → SemanticModel
```

- **Scan**: Find all TypeScript and HTML files, resolve conventions,
  detect dependencies.
- **Identify**: Extract facts from each file — decorators, class
  metadata, convention matches, `static $au` definitions, `.define()`
  calls.
- **Characterize**: Turn raw facts into observations about resources —
  name, kind, bindables, binding modes, registration intent.
- **Converge**: Merge observations from multiple sources (source
  analysis, third-party packages, builtins, explicit configuration)
  into a single definition per resource, per field, with full
  provenance.

Convergence uses five field-level operators:

| Operator | What it does |
|----------|-------------|
| known-over-unknown | Lower-priority source fills in if higher-priority is absent |
| stable-union | Arrays merge additively (e.g., bindable lists) |
| select | First non-absent value wins |
| locked-identity | Identity fields (name, kind) — conflict is an error |
| patch-object | Object fields merge key-by-key with authority-based resolution |

The output is a `SemanticModel` — a map of `ConvergenceEntry` records
keyed by resource identity, plus a dependency graph, vocabulary
registry, and template map.

### Template Pipeline

Compiles each template against the semantic model.

```
lower → link → bind → typecheck
```

- **Lower** (`10-lower`): Parse HTML into template IR using the frozen
  vocabulary (binding commands, attribute patterns).
- **Link** (`20-link`): Resolve elements, attributes, and template
  controllers against the semantic model. Three-way resolution:
  resolved (found with full definition), stub (found with gaps), or
  absent (not in the model).
- **Bind** (`30-bind`): Build scope chains, resolve expression
  bindings, track variable visibility across template controller
  boundaries.
- **Typecheck** (`40-typecheck`): Validate expression types against
  TypeScript via a generated overlay file.

Each stage records its dependencies into a `DependencyGraph` for
incremental invalidation.

## Provenance and Confidence

Three systems track the quality of the analysis.

### Sourced\<T\> — per-field provenance

Every field on a resource definition is wrapped in `Sourced<T>`,
which records the value, where it came from (source file, package,
config, builtin), and its confidence level. When the project pipeline
converges multiple sources, the winning source's provenance is
preserved.

### Confidence Cascade

Every cursor position gets a confidence assessment from four
independent signals:

| Signal | What it measures |
|--------|-----------------|
| Resource | Was this resource discovered? How was it declared? |
| Type | Does it have TypeScript type annotations? |
| Scope | Was its registration scope fully determined? |
| Expression | Was the expression fully analyzable? |

The effective confidence is the minimum of all four signals. It flows
through to every feature: hover shows confidence indicators, diagnostics
demote severity, completions flag gaps.

### Gap Tracking

When analysis hits a limit — a dynamic registration pattern, an opaque
third-party package, a `processContent` hook — the system records a
structured gap: what couldn't be determined, why, and how to close it.
Gaps propagate through the pipeline. A registration gap becomes a scope
gap, which becomes a template analysis gap, which becomes a confidence
demotion on the diagnostic.

## Semantic Workspace

The workspace (`engine.ts`) sits between the compiler and the language
server. It manages:

- **Project lifecycle**: open, update, close. Watches for file changes.
- **Template lifecycle**: compile templates, maintain a template index,
  track which templates need recompilation when resources change.
- **Incremental invalidation**: three levels — content hashing (skip
  unchanged files), fact fingerprinting (skip files whose facts didn't
  change), and dependency-graph-scoped invalidation (only recompile
  affected templates).
- **Feature dispatch**: routes hover, completions, diagnostics,
  definition, references, rename, and semantic token requests to the
  appropriate handlers.

### CursorEntity Resolution

All features share a single cursor resolution path. Given a cursor
position in a template, `resolveCursorEntity()` produces a
`CursorEntity` — a tagged union of 22 entity kinds (element tag,
attribute name, bindable, binding command, expression identifier,
value converter, template controller variable, etc.) with per-position
confidence signals.

Features don't implement their own resolution. They receive a
`CursorEntity` that already carries the semantic model's answer and
project what they need from it.

### Referential Index

Cross-domain reference tracking. Maps between template-domain
references (tag names, attribute names, expression identifiers,
pipe operators) and script-domain references (decorator properties,
class names, import paths). Used by find-references and rename to
locate all usages of a resource across both HTML and TypeScript.

### ResourceView Projection

The query boundary between internal analysis (which uses `Sourced<T>`
with full provenance wrappers) and feature consumers (which receive
`Resolved<T>` values). The projection replaces gapped `Sourced<T>`
fields with `Stub<T>` — a value that carries a fallback for continued
processing plus metadata about what's missing and why.

## Language Server

A thin LSP adapter. Each handler:

1. Receives an LSP request (position, document URI)
2. Translates it into a workspace query
3. Receives a `FeatureResponse<T>` — either a result, a degradation
   explanation, or not-applicable
4. Translates back into an LSP response

The server also handles:

- Diagnostic taxonomy bridging (compiler diagnostic codes → VS Code
  diagnostic data records)
- Workspace change notifications for live updates
- TypeScript rename interception (TS-side renames propagate to
  templates)

## VS Code Extension

Feature-based architecture with per-feature modules:

| Module | What it does |
|--------|-------------|
| `diagnostics-feature` | Bridges LSP diagnostics to VS Code problems panel, manages taxonomy |
| `views-feature` | Resource Explorer sidebar, Find Resource picker |
| `inlay-hints-feature` | Binding mode hints (shows `.bind` resolution) |
| `code-lens-feature` | Bindable and usage counts on resource classes |
| `inline-feature` | Gap indicators in the editor |
| `status-feature` | Status bar with analysis state and resource counts |
| `ts-rename-feature` | Intercepts TypeScript renames to propagate to templates |
| `commands` | User commands (Find Resource, Inspect at Cursor, etc.) and debug commands |
| `observability-feature` | Compiled template viewer, overlay mapping, server state dump |

### TypeScript Integration

The compiler generates a TypeScript overlay file for each template.
The overlay maps template expressions to TypeScript declarations,
giving the TS language service visibility into template bindings. This
is what enables type checking, go-to-definition across HTML/TS, and
expression completions.

The overlay is a virtual `.d.ts` file managed by the workspace's
`OverlayFS` — it's never written to disk.

## Semantic Authority Host

A persistent runtime for interactive querying outside VS Code
(`pnpm host:start` / `pnpm host:query`). Used during development to
run pressure sweeps against real corpora, replay and verify analysis
results, and test features without the VS Code/LSP overhead.

## Incremental Invalidation

Three levels minimize recomputation:

1. **Content hash**: File unchanged → skip extraction entirely.
2. **Fact fingerprint**: File changed, but extracted facts are
   structurally identical → skip characterize/converge.
3. **Dependency graph**: Facts changed → `getAffected()` returns which
   resources and templates are impacted. Only those recompile.

The dependency graph tracks 10 node kinds (file, observation,
convergence entry, scope, vocabulary, template, overlay, etc.) and
their relationships.

## Key Invariants

- **Provenance-first**: Every value carries its origin. Use `Sourced<T>`
  and `SourceSpan`, not raw values.
- **Deterministic analysis**: Same inputs → same outputs. Pipeline
  stages are pure and cache-friendly.
- **Configuration-driven syntax**: Binding commands, attribute patterns,
  and template controller behavior come from configuration, not
  hard-coded names.
- **Confidence as first-class**: Every analysis result carries its
  confidence level. Consumers decide what to do with low-confidence
  results.
- **Gaps over guesses**: When analysis can't determine something, it
  records a structured gap. It never fabricates an answer.

## Directory Map

```
packages/
  compiler/
    src/
      schema/         — types, model, confidence, cursor entity,
                        dependency graph, referential index, resource
                        views, provenance (Sourced<T>)
      project-semantics/ — project pipeline (scan → converge)
      pipeline/       — template pipeline stages (lower → typecheck)
      program/        — template program, overlay spans, completions
      model/          — IR types, source spans, diagnostics
      parsing/        — expression parser, attribute parser
      synthesis/      — AOT and overlay code generation
      diagnostics/    — diagnostic types, emitter, report
      shared/         — utilities, module resolver, tracing
  semantic-workspace/
    src/
      engine.ts       — workspace lifecycle + feature dispatch
      hover.ts        — hover card generation
      definition.ts   — go-to-definition
      completions-engine.ts — completions with predictive DFA
      semantic-tokens.ts — semantic token generation
      typescript/     — TS service, overlay FS, project index
      host/           — semantic authority host runtime
  language-server/
    src/
      handlers/       — LSP request handlers (features, lifecycle,
                        code lens, inlay hints, semantic tokens)
      mapping/        — LSP type conversions
      feature-response.ts — FeatureResponse → LSP translation
  vscode/
    src/
      features/       — per-feature modules (diagnostics, views,
                        inlay hints, code lens, rename, status,
                        inline, observability, commands)
      core/           — config, capabilities, service registry,
                        query client, feature graph
```

## Related Docs

- [Getting Started](./getting-started.md) — setup and usage
- [VS Code Extension README](../packages/vscode/README.md) — feature list
