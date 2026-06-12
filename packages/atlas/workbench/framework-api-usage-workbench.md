# Framework API Usage Workbench

## Aim

Build a shared Atlas substrate for exact Aurelia framework API usage. The substrate should let future agents ask which framework APIs exist, which declarations are the same API subject, which classes implement which public interfaces, which member slots are visible across declaration forms, and where those APIs are used across the repo.

## Design Commitments

- Keep declaration identity and type shape separate. `same-declaration`, `same-symbol`, `same-export`, and explicit value aliases can merge API subjects. `class implements interface` and `interface extends interface` are shape edges, not identity edges.
- Normalize member slots as a named primitive. A framework interface `MethodSignature` and implementation `MethodDeclaration` with the same member name are both a `method` slot; this replaces the au-mcp-style compatibility branch with a TypeScript-visible concept.
- Prefer source declarations over generated declaration files. When a package-level export resolves through `dist/types`, the API substrate maps it back to the corresponding `src` declaration when the source file and declaration name are available.
- Include both package exports and module exports. Public package entrypoints explain user-facing API, while module-exported framework classes such as `Container` are still important for emulation and internal architecture reads.
- Treat high-fanout shape hubs as signal, not noise. `IServiceLocator` appearing under many bindings/watchers is a real framework shape fact; interpretation belongs in implementation-shape views and downstream semantic lenses.

## Standing Shape

- Substrate: `readAureliaApiUsageIndex(sourceProject)` in `packages/atlas/src/framework/api-usage.ts`.
- Shared underlay: `packages/atlas/src/source/semantic-surface` owns exact TypeScript source ranges, symbol identity,
  source declaration mirrors, member slots, usage roles, and AST walking so `framework.api` is no longer the owner of
  those primitives.
- Lens: `framework.api`.
- Projections:
  - `summary`
  - `subjects`
  - `facets`
  - `merge-edges`
  - `shape-edges`
  - `implementation-shapes`
  - `member-slots` (compact orientation rows)
  - `member-declarations` (explicit source declaration detail for a slot)
  - `usages`
  - `usage-consumers` (usage rows grouped by containing declaration / class member)
- Useful first query:
  - `framework.api:implementation-shapes` with `implementationName: "Container"` shows the `Container` class, reachable API subjects such as `IContainer`, merged member slots, and repo usage rollups.
  - `framework.api:usages` with `implementationName: "Container"` and `memberName: "get"` gives bounded source-backed usage rows across the implementation shape.
  - `framework.api:usage-consumers` with `implementationName`, `memberName`, and `role: "member-call"` gives a compact owner map before opening exact source sites.
  - `framework.api:usage-consumers` with `implementationName: "Container"`, `memberName: "get"`, `role: "member-call"`, and `callArgumentSymbolName: "ITemplateCompiler"` localizes the DI/compiler edge to `Rendering.compile`.

## Pressure To Watch

- Shape edges are now exact and deduped by source edge, but interpretation is still shallow. The next useful step is likely to join API implementation shapes to DI/materialization/compiler/rendering relationship rows so a class-centric query can say not just "this API is used" but "this API participates in world formation, compilation, hydration, or TypeChecker handoff here."
- The substrate currently detects usages by TypeChecker-resolved identifiers and member symbols. It does not yet model receiver type flow deeply enough to answer every "which implementation receives this method call?" question. That should be added as exact checker/source evidence, not name ranking.
- `member-slots` now returns compact rows instead of embedding every declaration contributing to a slot. It separates
  unique source declaration count from export/module surface contribution count. Use `member-declarations` when the
  declaration list is the question. This was prompted by overloaded interface slots such as `IContainer.get`, where a
  first-pass member-slot read could otherwise dump a large declaration list before the caller knew whether it needed
  provenance detail.
- `usage-consumers` now gives the same middle grain that `bridge.aulink` uses: exact usage sites grouped by owner
  declaration. This should be the default stop between "show every usage" and "open source" when asking who actually
  consumes a high-salience API member such as `TemplateCompiler.compile` or `IContainer.get`.
- Usage rows now carry compact call-shape facts for call usages. Filters such as `callCalleeName`,
  `callArgumentText`, `callArgumentSymbolName`, and `callArgumentFullyQualifiedName` let DI/compiler questions stay
  exact without opening raw source first. These are source/checker facts only; interpreting `ITemplateCompiler` as a DI
  key still belongs in DI/materialization/evaluator layers.
