# Domain Appendix (`packages/domain`)

`packages/domain` is the Aurelia template compiler and program layer. It is a **pure, in-process library**: deterministic, mutation-free phases, with host integration going through explicit program/services contracts.

---

## 1. Scope

This package owns:

- Template IR, spans, provenance, scopes, and diagnostics.
- The staged compilation pipeline (10-60) for Aurelia templates.
- Overlay and SSR products, including mapping back to authored HTML.
- The long-lived `DefaultTemplateProgram` and the `TemplateLanguageService` / `TemplateBuildService` that host TypeScript-backed tooling over overlays and provenance.

It does **not** talk to editors, VS Code APIs, LSP, or concrete TS language service hosts.

---

## 2. Responsibilities

### 2.1 Responsible for

**Primitives & identity**

- Branded IDs and identity helpers:
  - `ExprId`, `NodeId`, `TemplateId`, `SourceFileId`, `NormalizedPath`, `UriString`, deterministic hashing (`hashIdentity`, `stableHash`).
- Span and source modeling:
  - UTF-16 spans, source files, offset math, line/column mapping.

**Language semantics & IR**

- Attribute syntax and parsing (`AttributeParser`, `AttrSyntax`, `DEFAULT_SYNTAX`).
- DOM schema, resource catalogs, naming rules, event schema, two-way defaults.
- Resource scoping model (`ResourceGraph`, scopes, `materializeResourcesForScope`).
- Template IR (DOM tree, instruction rows, expression table) and scope graph (frames, locals, overlay frames, expr-to-frame map).

**Compiler phases**

- Staged pipeline and caching:
  - Stage definitions, dependencies, fingerprints, `PipelineSession`, `FileStageCache`.
- Phase graph:
  - 10-lower (parse HTML -> IR),
  - 20-resolve-host (semantics/resources),
  - 30-bind (scopes),
  - 40-typecheck,
  - 50/60 overlay planning & emit,
  - 50/60 SSR planning & emit.

**Products, mapping, query**

- Overlay product:
  - Overlay TS/JS text, expression spans, per-member segments, mapping from overlay spans back to template spans, `TemplateQueryFacade`.
- SSR product:
  - SSR HTML + manifest, hydration/mapping data, `SsrMappingArtifact`.
- Mapping & provenance:
  - `TemplateMappingArtifact`, `SsrMappingArtifact`, provenance traces, and utilities to build span indices and mapping edges.
  - Provenance is the canonical source-map layer; see `docs/agents/appendix-provenance.md` for projection rules and API expectations.

**Program & services**

- `DefaultTemplateProgram`:
  - Document storage (`SourceStore`), per-document caches (core/overlay/SSR) keyed by content hash + options fingerprint, provenance ingestion, path derivation.
- `TemplateLanguageService`:
  - TS-backed diagnostics, quick info, definitions/references, completions, rename, code actions, projected to template space via provenance.
- `TemplateBuildService`:
  - Build-oriented operations over SSR artifacts and mappings.

### 2.2 Not responsible for

- LSP protocol types, VS Code concepts, or editor UI.
- TypeScript LS hosting (project setup, tsconfig, module resolution).
- Real filesystem or network IO.
- Project-level Aurelia resource discovery/scoping from TS sources (decorators, conventions, DI registries) - that is owned by `AureliaProjectIndex` in `packages/server`.

---

## 3. Architectural invariants

This package should be treated as a **query-based compiler/program** over templates: a long-running, incremental computation over immutable IR and semantics, driven by pure queries and explicit fingerprints.

### 3.1 Purity & isolation

- Phases and stages are **pure**:
  - No reading from disk or environment.
  - No writes to global state.
  - Inputs and outputs are explicit data structures.
- The only allowed "long-lived" state is:
  - Pipeline caches inside `DefaultTemplateProgram`.
  - Provenance index instances owned by the program/services.

### 3.2 Pipeline & caching

- All cross-phase flows go through the pipeline engine:
  - Stages declare dependencies and fingerprint functions; they do not reach into each other ad hoc.
- Fingerprints must be stable and derived only from:
  - Stage inputs,
  - Dependency artifact hashes,
  - Option fingerprints.
- Program-level caches are keyed by:
  - Document content hash,
  - Options fingerprint (including Semantics/ResourceGraph + VM reflection hints as relevant).

### 3.3 Public surfaces

New functionality must be exposed via one of:

- **Compiler facades**:
  - `compileTemplate(...)` (overlay + mapping/query + diagnostics/meta).
  - `compileTemplateToSSR(...)` (SSR + core stage outputs).
- **Program layer**:
  - `DefaultTemplateProgram` APIs for updating sources and retrieving overlay/SSR/mapping/provenance.
- **Services**:
  - `TemplateLanguageService`, `TemplateBuildService`.
- **Query surface**:
  - `TemplateQueryFacade` for structural/semantic queries over a single template.

Avoid adding ad-hoc "side door" entrypoints that bypass these.

---

## 4. Change patterns

### 4.1 New template syntax or semantics

When introducing new Aurelia template constructs (syntax, directives, resource semantics):

1. **Semantics / registry**
   - Extend semantics/registry types and resource graphs:
     - `registry.ts` and `resource-graph.ts` for new DOM/resource concepts.
2. **Phases**
   - Adjust phases in order:
     - 10-lower: parsing and IR representation.
     - 20-resolve-host: linking to semantics/resources.
     - 30-bind: scoping / locals / overlay frames.
     - 40-typecheck: expected/inferred types, diagnostics.
3. **Diagnostics**
   - Add or update diagnostics with proper IDs and provenance.

If other layers need to "see" the new concept, expose it via `TemplateQueryFacade` or services, not by direct IR access.

### 4.2 New analyses or phase outputs

If a new analysis is needed (for example, flow info or additional metadata):

1. Add a **new stage** or extend an existing one:
   - Declare inputs and dependencies,
   - Define a pure fingerprint and run function.
2. Thread its output into products only where required:
   - Overlay/SSR planners, mapping builders, query facade.
3. Keep the stage output self-contained; upstream stages must not depend on it.

### 4.3 New queries

When tooling needs new information at a template offset:

1. Prefer extending:
   - `TemplateQueryFacade` (for IR/semantic data),
   - or `TemplateLanguageService` (for TS-backed data).
2. Return opaque, high-level results (bindables, controllers, types, spans) rather than leaking internal IR shapes.

---

## 5. Program layer guidelines

`DefaultTemplateProgram` is the gateway from hosts (LSP server, tests, tools) into the compiler. It should stay small and predictable.

Key rules:

- All document state flows through `SourceStore`:
  - Add/remove/update documents via program APIs; do not manage separate side tables.
- Caching is **per document**:
  - Keys: `(content hash, options fingerprint)`.
  - Seeds: reuse prior stage artifacts only when hashes match.
- Mapping and provenance:
  - Every overlay/SSR product must be ingested into `InMemoryProvenanceIndex` (or a compatible index).
  - Provenance is the only supported path for mapping generated spans back to templates.

---

## 6. Testing

Changes in `packages/domain` should be validated with **fast, pure tests**:

- **Phase-level tests**
  - Given HTML + semantics, assert on IR, scopes, and typecheck outputs, including diagnostics.
- **Product tests**
  - Given HTML + VM reflection hints, assert on:
    - Overlay text,
    - SSR HTML/manifest,
    - Mappings and query results.
- **Program tests**
  - Use `DefaultTemplateProgram` + in-memory `SourceStore` to simulate document updates and verify:
    - Cache hits/misses and seeding,
    - Correct mapping/provenance behavior.

Tests here should not spin up a TS LS or LSP server; that belongs to `packages/server`.

---

## 7. Checklist for domain changes

Before committing changes in `packages/domain`, check:

1. **Layering**
   - [ ] No imports from `vscode`, LSP packages, Node/FS APIs, or concrete TS LS hosts.
   - [ ] No dependencies on `packages/server` or `packages/client`.

2. **Purity & pipeline**
   - [ ] New/changed stages are pure and wired through the pipeline engine.
   - [ ] Fingerprints are deterministic and derived only from inputs/options and dependency artifacts.
   - [ ] No hidden mutable global state was introduced.

3. **Public surfaces**
   - [ ] New behavior is reachable through existing public surfaces (facades, program APIs, services, query facade) or a consciously added new one.
   - [ ] Mapping/provenance is updated so generated artifacts can still be projected back to templates.

4. **Tests**
   - [ ] Tests covering the new or changed behavior exist and pass.
   - [ ] Existing tests still reflect the intended semantics.

If any item cannot be satisfied, adjust the design or explicitly document the limitation along with a follow-up task.
