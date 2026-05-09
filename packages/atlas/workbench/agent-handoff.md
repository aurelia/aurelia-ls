# Atlas Agent Handoff

This note is the short read after `pnpm --filter @aurelia-ls/atlas orient`.
Keep it compact; move stable ownership detail into package READMEs.

## Fast Local Lanes

```powershell
pnpm --filter @aurelia-ls/atlas orient
pnpm --filter @aurelia-ls/atlas pressure:self
pnpm --filter @aurelia-ls/atlas pressure:framework-resources
pnpm --filter @aurelia-ls/atlas pressure:framework-router
pnpm --filter @aurelia-ls/atlas pressure:plugin-architecture
pnpm --filter @aurelia-ls/atlas pressure:workspace-architecture
pnpm --filter @aurelia-ls/atlas profile:workspace-architecture
pnpm --filter @aurelia-ls/atlas pressure:product-architecture
pnpm --filter @aurelia-ls/atlas profile:product-architecture
pnpm --filter @aurelia-ls/atlas self-check
```

- `orient` is the compact live map. It includes API entrypoints, implemented
  lenses, first moves, capability moves, terrain ownership, source-project
  footing, and the package script rows above, plus compact follow-up docs. Use
  `orient:json` only when a tool needs the full request-shaped payload.
- The session daemon is compatibility-profiled. Normal repo sessions and
  clean-room external-root sessions write separate manifests under
  `.temp/atlas/session/profiles/<compatibility-key>/`, and the client caches the
  compatibility hash per source-admission environment inside one process so
  repeated API calls do not re-stat the source epoch. Idle timeout and manifest
  lease-loss shutdown are both deferred while a request is active, so a long
  query can finish even if another compatible profile is started meanwhile.
- `workspace.architecture` is the broad app/monorepo pressure lane. It reads
  all admitted source packages, including optional clean-room external roots,
  and keeps package admission role separate from inferred Aurelia profile before
  showing conservative source-role counts, Aurelia entrypoint signals, manifest/build
  signals, resources, configuration/registration rows, router usage, and
  template references. Non-app roles such as declarations, tests, examples, and
  tooling config remain visible as source-role pressure but are not deeply walked
  for Aurelia surfaces. Router rows are import-aware and should be treated as
  architecture signals for a deeper router/route-recognizer pass, including
  route decorators, route-config properties, `RouterConfiguration.*`, and
  router-shaped receivers; they are not a complete router emulator. Workspace
  mechanisms are compact call-chain categories rather than raw app call
  expressions. For proprietary roots, keep tracked notes at aggregate count and
  mechanism-category level; do not promote row names, paths, source spans, or
  summaries. The summary rollup includes filter-aware surface-kind, mechanism,
  admission-role, and Aurelia-shape distributions for this. App-entrypoint
  rows are import/receiver-aware for the Aurelia bootstrap API rather than
  generic `.start()` matching; resource/bindable/watch decorators are also
  import/namespace-aware rather than bare-name matches; `resolve`,
  `Registration.*`, and `AppTask.*` rows are rooted in Aurelia package imports
  such as `aurelia`, `@aurelia/kernel`, or `@aurelia/runtime-html`.
  Plain `.register(...)` rows must be rooted in an Aurelia bootstrap receiver or
  a kernel `IContainer` receiver, and surface as `aurelia.register` or
  `container.register` instead of generic method-name evidence.
  Use
  `projection: "surfaces", filters: { kind:
  "source-role" }` to inspect non-app source-role pressure without opening raw
  external code.
  Summary rollups also include package-manager and build-tool-hint
  distributions, which are the preferred durable shape for monorepo/build
  topology observations from proprietary roots. The pressure script also prints
  external/app-shaped aggregate sub-rollups without row names, paths, ranges,
  or summaries, so use those before opening package rows.
  Manifest dependency, resource, configuration, registration, DI resolution,
  router, and template-reference mechanisms each have their own rollups.
  Manifest dependencies split framework-owned dependencies from plugin
  dependencies without printing dependency names. DI resolution distinguishes
  imported kernel `resolve(...)` from grounded container `get`/`getAll`/`has`
  lookups. Configuration mechanisms intentionally collapse
  arbitrary project-specific `*Configuration` factory names to
  `configuration-call` in aggregate output, while keeping framework-shaped
  categories such as `configuration.customize`, `container-configuration.from`,
  and `AppTask.*`. Template references are syntactic only: HTML imports,
  dynamic imports, `require(...)` calls, and `template`/`templateUrl` properties
  count, while arbitrary strings ending in `.html` do not. Router rows include
  route-config object rows in addition to route-config property rows. The
  pressure script also prints non-extractive route-config facets: carrier
  shape, route-object field sets, component value-kind buckets, and child-route
  cardinality buckets. Use those facets as the aggregate signal for authored
  route-tree breadth before semantic-runtime recursive router/rendering
  emulation catches up. Package and surface projections now share one filtered
  row set, so surface filters and facet filters narrow package counts to the
  packages that actually own matching surfaces.
  Use `pressure:workspace-architecture` for a safe aggregate first pass; the
  script intentionally omits row names, paths, source ranges, and summaries.
  Use `profile:workspace-architecture` when the aggregate feels expensive; in
  external-root runs the warm request is currently dominated by source-file
  scanning rather than package manifest/file-inventory, attribution, sorting, or rollup. The
  profile script reports source-scan work in scanned-file units and calls out
  whether a request paid cold startup/analysis overhead or reused a cached
  analysis profile. The source scan intentionally spends on `app-source` files
  only, and the finished analysis is memoized for the source epoch so follow-up
  package/surface/profile reads in the same daemon do not rescan the workspace.
- `plugin.architecture` is the clean public-plugin pressure lane. It reads the
  admitted `aurelia2-plugins` packages and summarizes resources, registries, DI
  registrations, AppTasks, router hooks, resolve calls, and template references
  without making those plugins a canonical authoring style. Plugin decorator,
  DI, AppTask, container registration, and router rows are import/receiver-aware;
  arbitrary `.subscribe()` or `.register()` calls should not appear as Aurelia
  pressure unless tied back to framework imports/types. Resource rows include
  explicit decorators and Aurelia convention resources, while pure router import
  clauses stay out of router integration counts. Summary, package, and surface
  reads expose filter-aware rollups, including mechanism maps for bindables,
  resources, router integrations, and template references. Surface filters also
  narrow package counts to packages that own matching public-plugin surfaces. Use
  `pressure:plugin-architecture` for the public aggregate before paging rows;
  it reads those rollups directly instead of spending context on every row.
- `framework.router` is the router grounding lane. Use it before adding more
  semantic-runtime router/route-recognizer behavior; it maps router and
  route-recognizer source into an ordered route-config/navigation `flow`
  projection plus route-context, route-tree, viewport-agent, navigation, DI,
  resource, lifecycle, and normalized relationship rows with exact source
  continuations. The `recognizer` projection exposes path grammar, state graph,
  endpoint registration/materialization, recognition walk, candidate selection,
  cache, and lookup mechanics for `@aurelia/route-recognizer`; follow
  `framework.router:flow-issues` and `framework.router:recognizer-issues` when
  curated descriptors need to be checked against the live Aurelia source. Router
  relationship rows now include the route-recognizer mechanic rows and are joined
  by `bridge.aulink`, so mirror reads should be used to check semantic-runtime
  router anchors against framework role evidence before app pressure is trusted.
  Flow and relationship rows now carry
  semantic route continuations into resource materialization, rendering
  hydration, child-controller creation, and lifecycle controller-call rows when
  their stage crosses those framework boundaries. Use
  `pressure:framework-router` to check the router rollup, relationship axes,
  flow self-audit, and recognizer substrate self-audit quickly.
- `aurelia-source-imports.ts` is the shared import-admission substrate for
  workspace and public-plugin architecture lenses. Router import admission is
  intentionally tied to the public `@aurelia/router` index: `self-check` parses
  the framework index and fails if a public router export is not admitted by the
  shared substrate.
- `framework.discovery:bundles` is the configuration/bundle grounding lane.
  It now reports spendable `configuration`, `registration-catalog`, and
  `registry` rows separately. Use it before assuming
  `StandardConfiguration` is the only composition root: decomposed catalogs
  such as `runtime-html:DefaultComponents`, `DefaultResources`,
  `DefaultRenderers`, router catalogs, and plugin-style configurations can be
  followed into `framework.di:world` with `configurationPackageId` and
  `configurationExportName`. `InterfaceSymbol` registry objects belong in
  `di-interfaces`/`registry-exports`, not the spendable bundle catalog.
- `pressure:self` is for Atlas maintenance. Its default output is compact:
  large source files, large classes, dense functions, duplicate helper names,
  and calibrated high enum/axis pressure with source line anchors before raw
  source browsing. Use `pressure:self:detail` when the compact source-file rows
  hide a metric you need. The high mapper lane now focuses on multi-axis
  framework-semantic mappers instead of one-axis endpoint/fact constructors.
- `pressure:product-architecture` is for semantic-runtime cleanup planning. Its
  default output is compact: cheap structure pressure first (large modules,
  cross-area imports, large classes, zero-method `*Input` envelope classes, and
  auLink-backed or behavioral `*Input` suffix classes), then the expensive
  call-backed function pressure. Use
  `pressure:product-architecture:detail` when lower-ranked rows matter. Class
  rows carry auLink ids, so product-model classes such as framework mirrors do
  not get lumped into ordinary parameter-envelope pressure.
- `profile:product-architecture` is for cost decisions. It prints structure,
  compact-call core/full, exact-call core/full, and symbol lanes so
  cache/warmup/split work starts from measured cost.
- `profile:workspace-architecture` and `profile:product-architecture` warm the
  daemon before measuring profile requests. Treat the startup/status line as
  session envelope cost and the request line as warm inquiry cost; otherwise
  first-request daemon startup can masquerade as lens analysis cost.
- `pressure:framework-resources` is for resource convergence provenance. It
  prints resource-kind, convergence-lane, and exact source-site-role rollups so
  broad carrier spans do not hide whether the row is grounded by a definition
  carrier, backing declaration, bundle admission, syntax product, or
  materialization site. Resource convergence rows are memoized per source epoch,
  so repeated resource/admission/composition reads in one daemon should not
  repeatedly rebuild the convergence product.

## Current Product Architecture Shape

`product.architecture` is the source-architecture lens for
`packages/semantic-runtime/src`.

- Structure lane: `areas`, `modules`, `dependencies`, `area-dependencies`,
  `declarations`, `cycles`, and `classes`. This lane skips checker call-site
  and symbol-reference rows.
- Core lane: `functions`, `call-sites`, and `call-dependencies`. This lane pays
  for checker call-site rows and enriches function bodies with call pressure.
  `functions` and `call-dependencies` use compact call rows; exact `call-sites`
  adds checker type/signature displays.
- Symbol lane: `symbol-references` and `symbol-dependencies`. This lane pays
  for checker-backed identifier references without needing call-site rows.
- Full lane: `summary` and explicit full profiles. This lane pays both checker
  call-site and symbol-reference costs. Summary uses compact call rows because
  it needs topology and pressure, not every callee type/signature string.

Latest local profile after compact/exact call-site splitting: structure was about 120ms analysis, compact-call core
about 960ms, exact-call core about 5.9s, symbol about 1.0s, compact-call full about 1.2s, and exact-call full about
3.4s after some checker work was warm. The expensive exact-call phase is TypeScript callee type/signature display; keep
that available for `call-sites`, but do not force it onto summary, function pressure, or call dependency rows.

Source-file, source-range, symbol-with-file, semantic-runtime package, and
semantic-runtime repo-area loci now scope `product.architecture` rows like an
explicit `pathPrefix`, including exact participant-file filtering for
`area-dependencies`, so use loci directly when following continuations.
Class rows include `auLinkIds` plus `hasAuLink`/`auLinkId` filters. Use those
before deciding whether a zero-method `*Input` class is merely a request
envelope or an intentionally modeled framework/product concept.

## Mapping Policy

Atlas is the mapping and inquiry authority for this repo. Do not revive au-mcp
or snapshot/query CLI layers as parallel maps. Historical MCP notes are
packaging/integration pressure only.

Use [external-pressure-intake.md](external-pressure-intake.md) when proprietary
external apps are used as pressure input. Keep raw observations in ignored
`.temp/` scratch, and promote only abstract, clean-room pressure into durable
docs or code. Manual source reads and targeted local inquiries against
proprietary roots are allowed as transient testing surfaces; do not persist app
paths, source excerpts, route literals, component names, domain names, or
business-specific facts in tracked files.

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
- Treat evaluator and low-level substrate gaps as recursive pressure: improve
  the substrate, revisit ontology when needed, then improve Atlas visibility,
  performance, inquiry algebra, or continuations if that new work exposes the
  next bottleneck.

Inferred maintenance heuristics:

- A small complete table is appropriate when it names framework policy that was
  previously hidden in repeated conditionals.
- `pressure:self` is a source-navigation signal, not an architectural verdict.
- Observation classifiers are contextual framework semantics; inspect Aurelia
  behavior before flattening them into tables.

## Current Pressure Pointers

- Atlas self pressure currently has no high multi-axis rows at the calibrated
  threshold; it still prints large framework/API/evaluator builders as ordinary
  navigation pressure and now includes source-file size pressure. Prefer
  concept-aligned type tightening or grammar use over suppressing rows if high
  pressure returns.
- Enum pressure is checker-contextual: broad raw value overlap remains visible
  in enum value-space rows, while high enum pressure only counts raw literals
  whose contextual type names a matching enum.
- Relationship row factories with setup plus a final object/array/call return
  are recognized as direct factories, so `pressure:self` should highlight true
  branching axis mappers rather than coherent row materializers.
- Router flow rows use `flowRelation` for human flow verbs; reserve `relation`
  for framework/navigation relationship axes.
- Answer-level `SemanticClaim` axes are intentionally generic composition axes,
  not framework row enums. Type-position enum member references are counted by
  the enum substrate, so type-only contracts should no longer appear as
  unreferenced enum values.
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
- Resource convergence rows distinguish exact definition source from declaration
  source and typed source-site lanes. `pressure:framework-resources` prints
  carrier-kind/source-role counts plus definition-vs-declaration counts; current
  framework rows all have a separate exact definition source and backing
  declaration; `declarationSource` is now an invariant on resource carriers, not
  a nullable fallback. Treat that as intentional modeling; if a row only points
  at a broad carrier, improve the lane provenance rather than widening the
  source continuation.
- Source identity now has hard Program-file primitives on `SourceProject`.
  Owned-source walks should use `requiredSourceFileIdentity(...)`; call sites
  that already hold a `SourceFileIdentity` should use
  `requiredSourceFileForIdentity(...)` instead of retrying repo/absolute paths.
  `SourceProject` now issues identities for every current TypeScript Program
  file, with `packageId: null` for lib/external files, so TypeScript lenses
  should not synthesize program-file identities locally. Empty `filePath`
  handles and invented `1:1` source witnesses are a bug, not a compactness
  trick.
- Clean-room semantic-runtime app probes should stay aggregate-only. The useful generalized signal so far is that
  imported bindable config objects and framework `BindingMode` values can close through shared project evaluation when
  their source is reachable; remaining app-open seams should be grouped by product seam kind before reading proprietary
  source. Regex literal, `Function.prototype.call(...)`, and `typeof` pressure were substrate, not Aurelia-specific,
  and now belong to the generic evaluator. The semantic-runtime app pressure lane also prints app-world phase timings so
  future work can distinguish static-evaluation, TypeChecker, resource-recognition, app-world-composition, and
  template-compilation cost. Treat external-root output as transient inspection material; manually generalize useful
  open-reason patterns before writing durable notes. Binding data-flow rows now include parser state/result-kind, and
  the pressure lane aggregates those values; if an open data-flow reason says no evaluable AST, first check whether the
  parse was a deliberate companion/degraded publication before treating it as a lost product. The pressure lane also
  splits app-root projects from resource-library/non-app packages; prefer that split before chasing evaluator seams in
  utility packages. Source-shipped plugin packages may now be admitted by mapping declaration entrypoints back to
  authored `src/*` files, while `aurelia` and `@aurelia/*` packages stay on the framework-emulation path.
