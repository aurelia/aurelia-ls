# Source Substrate

The source substrate owns the hot TypeScript world for Atlas, semantic-runtime, the MCP shell, and the admitted Aurelia
framework packages. It admits source into a shared LanguageService-backed Program, builds source-epoch indexes, keeps the current
TypeChecker available, and gives higher lenses stable source and declaration addresses without importing package
runtime exports.

## Responsibilities

- Admit `packages/atlas`, `packages/semantic-runtime`, `packages/mcp`, the `aurelia` framework submodule packages, and public
  `aurelia2-plugins` workspace packages when that submodule is present through their tsconfigs for TypeChecker-first
  internal, framework, and plugin-pressure analysis.
- Optionally admit external authored source packages through `ATLAS_EXTERNAL_SOURCE_ROOTS`. This is an environment
  hook for clean-room pressure runs, not a checked-in project list: Atlas scans package roots with `package.json` and
  `tsconfig.json`, skips dependency/build directories, and keeps external paths outside durable repo docs.
- Keep source epoch identities non-extractive. `SourceProject.identity()` reports package/admission counts, not package
  ids or external package names, so daemon status and source-host profile logs can stay useful during clean-room runs
  without recording external app structure.
- Keep a hot TypeScript `Program`, `TypeChecker`, LanguageService, file index, declaration index, and top-level
  declaration index in the daemon process. `SourceProject` is an immutable source epoch: it materializes the
  LanguageService `Program` and `TypeChecker` once during construction, then returns those fixed objects from its
  getters. Do not re-ask the LanguageService for a current program unless Atlas grows an explicit source-editing epoch.
- Keep TypeScript host filesystem answers in [project-file-cache.ts](project-file-cache.ts). That cache owns script
  versions, snapshots, host reads, existence checks, directory checks, and realpath answers for the immutable source
  epoch; `SourceProject` should coordinate it, not absorb its implementation details.
- Normalize file, span, declaration, symbol, and package identities into source-level records.
- Treat exported destructuring as multiple declaration rows, not one broad pattern-shaped declaration. For example,
  `export const { value } = ...` should expose `value` as a top-level variable row with a binding-name span so
  framework bridges such as `auLink` can resolve destructured Aurelia exports with exact provenance.
- Treat source identity as a real invariant. Lenses that walk admitted source should use
  `SourceProject.requiredSourceFileIdentity(...)`; call sites that already hold a `SourceFileIdentity` should use
  `SourceProject.requiredSourceFileForIdentity(...)` to recover the source file. Semantic-surface source-range helpers
  delegate to the same project primitives. `SourceProject` issues identities for every current TypeScript Program file;
  files outside an admitted package carry `packageId: null`, so TypeScript LanguageService adapters do not need to
  synthesize source identities from paths when tsserver returns lib or external files. LanguageService edit plans can
  still name transient new-file paths, but those should be explicit edit targets rather than source-file fallbacks.
- Read source text for repository-local non-Program evidence such as Aurelia docs and framework tests through
  `SourceProject.readTextFile(...)`. `ts.source` may inspect those files and exact ranges, but TypeChecker,
  LanguageService, structure, diagnostics, and refactor projections remain Program-only.
- Attribute files to the most-specific admitted package root so nested monorepo packages are not swallowed by a parent
  workspace package.
- Preserve package admission role strongly enough that higher lenses such as `workspace.architecture` can distinguish
  external authored packages from public plugin packages and framework packages before inferring the separate Aurelia
  shape axis (`aurelia-app`, `aurelia-resource-library`, `aurelia-package`, or `non-aurelia`).
- Let workspace-level lenses project conservative source roles over admitted files. Source roles are pressure axes for
  app-source/test/tooling/declaration/generated separation; they are not a substitute for package ownership or Aurelia
  runtime semantics.
- Let architecture lenses recognize source-surface signals from explicit framework shapes before falling back to broad
  text shapes. For example, router surfaces should come from `@aurelia/router` imports, route decorators, static route
  config fields and nested child route objects on route-bearing classes, `getRouteConfig` hooks, or receiver bindings
  proven from router imports, type annotations, or `resolve(IRouter)`-style calls rather than a generic `.load(...)`
  method name.
- Treat `SourceProject` as a source epoch: script versions, script snapshots, TypeScript host `readFile`/`fileExists`/
  `directoryExists`/`realpath` answers, and normalized file keys are cached for that epoch so TypeScript up-to-date
  checks, module resolution, and Atlas indexes do not repeatedly hit filesystem stat/path work. Set
  `ATLAS_PROFILE_SOURCE_HOST=1` to print per-epoch host cache counters when the daemon shuts down.
- Keep both "owned files" and "owned implementation files" available by package. Generated declaration files remain
  useful for public checker surfaces, but framework/resource/bundle scans that need bodies should use implementation
  files so declaration output does not steal source spans or erase method bodies.
- Use [memo.ts](memo.ts) for source-epoch memoization. `SourceProjectMemo` owns one derived value per source epoch;
  `SourceProjectKeyedMemo` owns keyed derived rows per source epoch. Keep this as hot in-memory memoization near the
  owning reader, not persisted cache policy.
- Resolve exact TypeScript selectors into current-epoch source targets, then project serializable source, structure, and
  checker-fact rows for Atlas lenses.
- Keep the source-read contract in [typescript-contracts.ts](typescript-contracts.ts). That file is the public selector,
  target, row, and option vocabulary; [typescript.ts](typescript.ts) should stay focused on resolving those contracts
  against the current TypeScript Program epoch.
- Expose IDE-shaped TypeScript LanguageService primitives: document symbols, quick info, signature help, references with
  exact syntactic roles, definitions, implementations, call hierarchy, highlights, diagnostics, rename locations,
  refactor affordances, code fixes, refactor edit plans, organize-import edit plans, and file-rename edit plans.
- Expose exact call-site facts over source ranges, declarations, files, packages, or the workspace: callee expression,
  resolved signature, argument spans, argument text, argument types, primitive literals, object keys, and array counts.
- Expose the [TypeScript semantic surface](semantic-surface/README.md): exact source ranges, symbol identity, source
  declaration mirrors, exported declaration surfaces, normalized member slots, usage roles, usage-owner declarations,
  and AST walking primitives that multiple higher lenses can share without inventing local compatibility layers.
- Expose package-scoped enum usage indexes: enum/member declarations, exact `Enum.Member` reference sites, raw literal
  value-space overlap, and exact enum-to-enum translation edges. This is source substrate, not `atlas.self`
  diagnostics; higher lenses decide what the value-space pressure means. Exact unambiguous `Enum.Member` text is a
  fast-path because the index already admits that syntactic fallback; aliases, ambiguous members, and raw enum-like
  literals stay TypeChecker-backed. In `profile:self`, the remaining enum pressure should usually be read as
  raw-literal contextual narrowing (`call-argument`, `comparison`, `object-value`, etc.), not member-reference symbol
  resolution.
- Build source-index bases such as `auLink` anchors and framework discovery seeds on demand within the current
  source-project epoch. auLink framework target rows preserve raw candidate lists and also expose type/value
  composition (`interface-class-pair`, `interface-variable-pair`, `function-overload-set`, etc.) plus preferred
  type/value candidates. Declaration merges with one type side and one value side, and same-symbol function overload
  sets, are treated as conceptually resolved targets, so callers can distinguish honest TypeScript merges and overloads
  from unresolved bridge ambiguity without losing the underlying declarations. Framework
  projection rows should fill on demand unless profiling proves their owning substrate cannot be made cheap.
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
TypeChecker projection. Framework and public plugin analysis can spend this same source project as basis, but evaluator
closure belongs to the framework-facing evaluation substrate rather than this source map.
