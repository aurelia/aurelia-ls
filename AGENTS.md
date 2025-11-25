# AGENTS

This file defines the architectural rules for `aurelia-ls` and how code should be organized across packages. It is the canonical source of truth for **where things belong** and **what each layer is allowed to do**.

---

## 1. Mandatory process for changes

Before changing code:

1. Read this file.
2. For each package you intend to modify, read its appendix in `docs/agents`:
   - `docs/agents/appendix-domain.md` for `packages/domain`.
   - `docs/agents/appendix-server.md` for `packages/server`.

For any non-trivial task (more than a small local tweak):

1. Identify which package(s) should contain the change using the mapping in section 4.
2. Sketch a short plan grouped by package (files to touch, responsibilities per layer).
3. Implement in small batches, keeping edits confined to the correct layer.
4. Run the relevant tests/commands for each package (via its `package.json` scripts).

---

## 2. Architecture overview

The repo is organized into three main layers:

### 2.1 `packages/domain` - compiler & program

- Pure, in-process Aurelia template compiler + program facade.
- Deterministic, mutation-free phases; no direct IO, no LSP, no VS Code, no TS host.
- Responsibilities:
  - Template IR, spans, identity, provenance, symbols.
  - Phases: 10-lower -> 20-resolve-host -> 30-bind -> 40-typecheck -> 50/60 overlay & SSR.
  - Overlay/SSR products, mappings, diagnostics, and queries (`TemplateQueryFacade`).
  - `DefaultTemplateProgram` + `TemplateLanguageService` + `TemplateBuildService` as a **query-based compiler/program** over templates.

### 2.2 `packages/server` - LSP host & TS integration

- LSP server for Aurelia templates; bridges editors to the compiler/program layer.
- Responsibilities:
  - LSP connection, `TextDocuments`, initialize/shutdown.
  - TypeScript environment: `PathUtils`, `OverlayFs`, `TsService`, `TsServicesAdapter`.
  - Aurelia project semantics: `AureliaProjectIndex`, discovery + scoping (`Semantics` + `ResourceGraph`).
  - `TemplateWorkspace` + `TemplateDocumentStore` + `VmReflectionService` orchestration.
  - LSP features (completion/hover/defs/refs/rename/code actions) delegating to `TemplateLanguageService` with mapping back to template spans.
  - Custom RPCs: `aurelia/getOverlay`, `aurelia/getMapping`, `aurelia/queryAtPosition`, `aurelia/getSsr`, `aurelia/dumpState`.

### 2.3 `packages/client` - VS Code extension

- Thin VS Code host for the language server.
- Responsibilities:
  - Start/stop the LSP client and resolve the server module (`AureliaLanguageClient`).
  - Commands: `aurelia.showOverlay`, `aurelia.showOverlayMapping`, `aurelia.showTemplateInfo`, `aurelia.showSsrPreview`, `aurelia.dumpState`.
  - UI wiring: status bar (`StatusService`), output (`ClientLogger`), virtual docs (`VirtualDocProvider`).

---

## 3. Layering constraints (hard rules)

### 3.1 Dependency direction

- `packages/domain`
  - Must not depend on `packages/server` or `packages/client`.
  - Must not import LSP, VS Code, Node/FS APIs, or concrete TS language service hosts.

- `packages/server`
  - May depend on `packages/domain`.
  - Must not depend on `packages/client` or `vscode`.
  - All TS/FS/LSP IO lives here.

- `packages/client`
  - May depend on `vscode` and the compiled server entrypoint.
  - Must not import directly from `packages/domain` and must not host compiler logic.

### 3.2 Responsibility boundaries

- Template syntax, semantics, IR, scopes, typechecking, overlay/SSR structure -> `packages/domain` only.
- TS config loading, TS LS lifecycle, overlay filesystem, project indexing, workspace orchestration -> `packages/server`.
- Editor UI, commands, status, virtual document presentation -> `packages/client`.

---

## 4. Where changes belong (routing table)

Use this table to decide **which package(s)** should contain a change:

| Change type                                                                 | Package(s)                     |
|----------------------------------------------------------------------------|--------------------------------|
| New Aurelia template syntax / binding rule / directive semantics           | `packages/domain`             |
| New template typechecking rule / diagnostics                               | `packages/domain`             |
| Changes to overlay TS output shape or mapping                              | `packages/domain`             |
| Changes to SSR output or SSR mapping                                       | `packages/domain`             |
| New resource type or discovery strategy (decorator, convention, DI)        | `packages/server` (`AureliaProjectIndex` + scoping) |
| Changes to how templates are wired to TS overlays / VM types               | `packages/server` (`TemplateWorkspace`, `VmReflectionService`, `TsService`) + domain contracts as needed |
| New template-aware LSP feature (hover/completion/defs/refs/rename/actions) | `packages/domain` (query/service) + `packages/server` (LSP handler) |
| New Aurelia-specific RPC (overlay, mapping, SSR, template query)           | `packages/server`             |
| New VS Code command or UI behaviour                                        | `packages/client`             |

If a change seems to span multiple layers, split it into separate steps per package rather than cross-cutting edits.

---

## 5. Domain layer: key invariants

`packages/domain` should be understood as a **query-based compiler** over templates: a long-running, incremental computation over an immutable graph of templates + semantics, with cached queries.

Invariants:

- Phases (10-60) are pure functions over in-memory data; no IO, no global mutable state.
- Stage dependencies are explicit and go through the pipeline engine (`PipelineSession`); stages may not implicitly reach into later stages.
- Public surface is through:
  - `compileTemplate`, `compileTemplateToSSR`,
  - `DefaultTemplateProgram`,
  - `TemplateLanguageService`, `TemplateBuildService`, `TemplateQueryFacade`, and contract types.
- All generated artifacts (overlay/SSR) must have complete mappings back to authored templates (no unmapped spans for user-visible constructs).

When adding language features:

- Extend semantics/registry and the phase graph in order; do not add ad-hoc code paths that bypass phases.
- Expose new information to other layers by extending query/program/service contracts instead of reaching into internal modules.

---

## 6. Server layer: key invariants

`packages/server` turns the domain compiler/program into an LSP service on top of a TS project. Treat it as an incremental "world" manager: TS config + project files + Aurelia resources + open documents -> snapshot -> queries.

Invariants:

- TypeScript integration goes through `TsService` + `TsServicesAdapter` + `OverlayFs`; no direct `ts.LanguageService` use outside this path.
- Aurelia resource discovery/scoping goes through `AureliaProjectIndex` + scoping planner; do not special-case resources in LSP handlers.
- `TemplateWorkspace`:
  - Is the only place that configures `DefaultTemplateProgram` and `TemplateLanguageService` for the current TS/semantics configuration.
  - Uses fingerprints (TS options + Semantics/ResourceGraph) to decide when to reconfigure while preserving document snapshots.
- LSP handlers:
  - Always ensure overlays are materialized and synced before asking TS for anything.
  - Call into `TemplateLanguageService` for template-aware features, mapping through provenance to/from template spans.

Document open/change must keep to this pipeline:

1. Update project index / fingerprints as needed.
2. Mirror document into `TemplateDocumentStore` / program `SourceStore`.
3. Compile overlay via program.
4. Inject overlay text into `TsService` (`OverlayFs`).
5. Collect template + TS diagnostics.
6. Send `aurelia/overlayReady`.

---

## 7. Client layer: key invariants

`packages/client` is a VS Code extension only.

Invariants:

- All language intelligence flows through LSP; no direct parsing or TS analysis in the client.
- Commands only:
  - Call server RPCs.
  - Render results (virtual docs, markdown summaries, status bar).
- No Aurelia semantics or compiler logic here; if the client needs new data, add/extend an RPC in `packages/server` and/or query in `packages/domain`.

---

## 8. Final checklist for any change

Before accepting a change, verify:

1. **Layering**
   - No new forbidden imports (domain -> server/client, server -> client, or VS Code/Node into domain).

2. **Responsibility**
   - Language/semantics/typechecking logic lives in `packages/domain`.
   - TS/FS/LSP logic lives in `packages/server`.
   - UI/commands live in `packages/client`.

3. **Incremental model**
   - Domain still behaves as a query-based compiler with explicit stages and stable caching.
   - Server continues to treat TS+Semantics+documents as fingerprints/snapshots, not ad-hoc mutable global state.

4. **Tests**
   - From the repo root, run at least:
     - `npm run lint`
     - `npm run test:spec`
   - For any package with its own scripts, run the relevant `npm run ...` commands from that package as well.
   - Update or add tests where needed to cover new behavior.

If any of these fail, adjust the design or split the change until the architecture remains consistent.
