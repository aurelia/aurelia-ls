# Atlas Agent Handoff

This note is the short read after `pnpm --filter @aurelia-ls/atlas orient`.
Keep it compact; move stable ownership detail into package READMEs.

## Fast Local Lanes

```powershell
pnpm --filter @aurelia-ls/atlas orient
pnpm --filter @aurelia-ls/atlas pressure:self
pnpm --filter @aurelia-ls/atlas pressure:product-architecture
pnpm --filter @aurelia-ls/atlas profile:product-architecture
pnpm --filter @aurelia-ls/atlas self-check
```

- `orient` is the live map. It now includes API entrypoints, implemented lenses,
  first moves, capability moves, terrain ownership, source-project footing, and
  the package script rows above, plus compact follow-up docs.
- `pressure:self` is for Atlas maintenance. It prints large classes, dense
  functions, and calibrated high enum/axis pressure with source line anchors
  before raw source browsing. The high mapper lane now focuses on multi-axis
  framework-semantic mappers instead of one-axis endpoint/fact constructors.
- `pressure:product-architecture` is for semantic-runtime cleanup planning. It
  prints cheap structure pressure first (large modules, cross-area imports, and
  large classes), then the expensive call-backed function pressure. Class and
  function rows include source line anchors when the lane has exact spans.
- `profile:product-architecture` is for cost decisions. It prints structure,
  core, symbol, and full lanes so cache/warmup/split work starts from measured
  cost.

## Current Product Architecture Shape

`product.architecture` is the source-architecture lens for
`packages/semantic-runtime/src`.

- Structure lane: `areas`, `modules`, `dependencies`, `area-dependencies`,
  `declarations`, `cycles`, and `classes`. This lane skips checker call-site
  and symbol-reference rows.
- Core lane: `functions`, `call-sites`, and `call-dependencies`. This lane pays
  for checker call-site rows and enriches function bodies with call pressure.
- Symbol lane: `symbol-references` and `symbol-dependencies`. This lane pays
  for checker-backed identifier references without needing call-site rows.
- Full lane: `summary` and explicit full profiles. This lane pays both checker
  call-site and symbol-reference costs.

Latest local profile after the lane split: structure was about 105ms analysis, core
about 11.3s, symbol about 13.2s, and full about 24.0s. The expensive phases are
still overwhelmingly checker call-site rows and checker symbol-reference rows;
the structure lane is already cheap enough that further perf work should not
start there.

Source-file, source-range, symbol-with-file, semantic-runtime package, and
semantic-runtime repo-area loci now scope `product.architecture` rows like an
explicit `pathPrefix`, including exact participant-file filtering for
`area-dependencies`, so use loci directly when following continuations.

## Mapping Policy

Atlas is the mapping and inquiry authority for this repo. Do not revive au-mcp
or snapshot/query CLI layers as parallel maps. Historical MCP notes are
packaging/integration pressure only.

Do not edit the external `aurelia` or `aurelia2-plugins` checkouts unless the
user explicitly asks.

## Decision Provenance

User-directed constraints:

- Atlas replaces au-mcp for repo mapping and orientation.
- Prefer bold/breaking cleanup over compatibility shims while the products have
  no external consumers.
- Keep Atlas as a large-data, multi-resolution context system, not an auditing
  theatre layer.
- Keep durable orientation in normal handoff docs; delete scratch notes once
  their useful intent has been promoted.

Inferred maintenance heuristics:

- A small complete table is appropriate when it names framework policy that was
  previously hidden in repeated conditionals.
- `pressure:self` is a source-navigation signal, not an architectural verdict.
- Observation classifiers are contextual framework semantics; inspect Aurelia
  behavior before flattening them into tables.

## Current Pressure Pointers

- Atlas self pressure still points at large framework/API/evaluator builders and
  several high multi-axis classifiers. Prefer small concept-aligned extractions over
  compatibility shims.
- The DI admission-materialization bridge was split enough that
  `diLinkForInstantiation` dropped out of high multi-axis pressure.
- Bundle registration traversal now centralizes recurring argument-expression
  rewrites behind helpers; keep that direction if expanding it further.
- Admission relationship rows and admission flow rows now share
  `framework-admission-endpoints.ts` for admitted endpoint construction. Use
  that file when checking whether evaluator admission is classifying app tasks,
  factories, catalogs, DI keys, resources, registry exports, or unknown
  arguments consistently.
- DI provider atom constructors and resource instantiation closure now keep
  fixed relationship axes in named tables/constants. Prefer that pattern when a
  pressure row is really framework policy rather than local control flow.
- Several framework compiler/rendering/lifecycle/admission/materialization
  axis mappers have been converted into complete tables. If
  `pressure:self` advances to another obvious enum-to-relationship-axis switch,
  table it and verify the owning live lens; if it points into observation, read
  the framework semantics first because those classifiers are more contextual.
- Resource convergence rows distinguish exact carrier source from declaration
  source. Treat that as intentional modeling, not a fallback bug.
