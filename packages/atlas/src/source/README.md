# Source Substrate

The source substrate owns the hot TypeScript world for Atlas, semantic-runtime, and the admitted Aurelia framework
packages. It admits source into a shared LanguageService-backed Program, builds boot-time indexes, keeps the current
TypeChecker available, and gives higher lenses stable source and declaration addresses without importing package
runtime exports.

## Responsibilities

- Admit `packages/atlas`, `packages/semantic-runtime`, and the `aurelia` framework submodule packages through
  their tsconfigs for TypeChecker-first internal and framework analysis.
- Keep a hot TypeScript `Program`, `TypeChecker`, LanguageService, file index, declaration index, and top-level
  declaration index in the daemon process.
- Normalize file, span, declaration, symbol, and package identities into source-level records.
- Resolve exact TypeScript selectors into current-epoch source targets, then project serializable source, structure, and
  checker-fact rows for Atlas lenses.
- Expose IDE-shaped TypeScript LanguageService primitives: document symbols, quick info, signature help, references with
  exact syntactic roles, definitions, implementations, call hierarchy, highlights, diagnostics, rename locations,
  refactor affordances, code fixes, refactor edit plans, organize-import edit plans, and file-rename edit plans.
- Expose exact call-site facts over source ranges, declarations, files, packages, or the workspace: callee expression,
  resolved signature, argument spans, argument text, argument types, primitive literals, object keys, and array counts.
- Prewarm the `auLink` bridge index, framework discovery index, and first framework entity catalogs at daemon
  startup: semantic-runtime overload declarations, exact decorator placements, source-only Aurelia framework target
  declarations, seed-anchor declarations, source-bound flow seeds, precomputed seed call edges, exact framework flow
  call sites, observer-locator, AppTask, router, expression, rendering structure entity rows, and catalog/placement
  gaps are indexed once so bridge and framework discovery queries are cheap.
- Stay semantics-neutral: source declarations are not vocabulary facts, product claims, DI facts, or framework facts.
- Provide a boring base that TypeChecker-driven product, self-analysis, and source navigation lenses can share.

## Non-Responsibilities

- Executing or importing `@aurelia-ls/semantic-runtime`.
- Inferring Aurelia semantics from private pattern tables.
- Owning ECMAScript static evaluation, TypeChecker projection policy, or product materialization.
- Serving as a user-facing lens by itself.

## Pressure

This substrate should remain less clever than the lenses above it. Its job is to pay compiler and indexing cost during
daemon boot, then make source facts addressable cheaply. Internal package semantics should prefer explicit types and
TypeChecker projection. Framework analysis can spend this same source project as basis, but evaluator closure belongs to
the framework-facing evaluation substrate rather than this source map.
