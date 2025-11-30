# Domain Appendix (`packages/domain`)

Pure, in-process template compiler and program layer. Deterministic, mutation-free stages, with host integration through explicit program/services contracts.

---

## 1. Scope

This package owns:

- Template IR, spans, provenance, scopes, diagnostics
- Staged compilation pipeline (analysis + synthesis)
- Overlay and runtime products with mapping back to authored HTML
- `DefaultTemplateProgram` and `TemplateLanguageService` / `TemplateBuildService`

Does **not** own: editors, VS Code, LSP, concrete TS LS hosts, filesystem IO.

---

## 2. Responsibilities

### Primitives & Identity

- Branded IDs: `ExprId`, `NodeId`, `TemplateId`, `SourceFileId`, `NormalizedPath`, `UriString`
- Spans: UTF-16, source files, offset math, line/column mapping
- Hashing: `hashIdentity`, `stableHash`

### Language Semantics & IR

- Attribute syntax/parsing (`AttributeParser`, `AttrSyntax`)
- DOM schema, resource catalogs, naming rules
- Resource scoping (`ResourceGraph`, `materializeResourcesForScope`)
- Template IR (DOM tree, instruction rows, expression table)
- Scope graph (frames, locals, expr-to-frame map)

### Compiler Stages

- Pipeline engine: stage definitions, dependencies, fingerprints, caching
- Analysis: 10-lower, 20-resolve, 30-bind, 40-typecheck
- Synthesis: overlay (plan + emit), runtime (plan + emit-code + emit-manifest)

### Products & Mapping

- Overlay product: TS/JS text, spans, segments, mapping, `TemplateQueryFacade`
- Runtime product: code artifact, manifest artifact, mappings
- Provenance: see `appendix-provenance.md`

### Program & Services

- `DefaultTemplateProgram`: document storage, caches, provenance ingestion
- `TemplateLanguageService`: TS-backed diagnostics, hover, defs/refs, completions, rename
- `TemplateBuildService`: build-oriented operations

---

## 3. Invariants

### Purity

- Stages are pure: no disk reads, no global state, explicit inputs/outputs
- Only allowed long-lived state: pipeline caches, provenance index (owned by program)

### Pipeline

- All cross-stage flows through pipeline engine
- Stages declare dependencies and fingerprints; no ad-hoc reaching
- Fingerprints derived from: stage inputs, dependency hashes, option fingerprints
- Program caches keyed by: content hash + options fingerprint

### Public Surfaces

Expose functionality via:
- Compiler facades (`compileTemplate`, `compileTemplateToRuntime`)
- Program APIs (`DefaultTemplateProgram`)
- Services (`TemplateLanguageService`, `TemplateBuildService`)
- Query surface (`TemplateQueryFacade`)

No side-door entrypoints.

---

## 4. Change Patterns

### New Template Syntax

1. Extend semantics/registry types
2. Adjust phases in order: 10 → 20 → 30 → 40
3. Add diagnostics with proper IDs
4. Expose via `TemplateQueryFacade` if needed

### New Analyses

1. Add new stage with declared deps and fingerprint
2. Thread output to products where needed
3. Keep self-contained; upstream stages don't depend on it

### New Queries

1. Extend `TemplateQueryFacade` or `TemplateLanguageService`
2. Return high-level results, not internal IR shapes

---

## 5. Checklist

Before committing:

- [ ] No imports from vscode, LSP, Node FS, server/client packages
- [ ] Stages are pure, wired through pipeline engine
- [ ] Fingerprints deterministic from inputs/options/deps
- [ ] Behavior exposed via public surfaces
- [ ] Mapping/provenance updated for generated artifacts
- [ ] Tests exist and pass
