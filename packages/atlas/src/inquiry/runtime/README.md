# runtime

`runtime` executes inquiry contracts against an in-memory world.

This is not a compatibility layer for old readers and not the default caller surface. It is the package-local implementation workbench used by the durable session daemon.

## Responsibilities

- [world.ts](world.ts) owns the static in-memory contract world.
- [engine.ts](engine.ts) validates and answers inquiries against that world.
- [api.ts](api.ts) exposes the in-memory inquiry API used inside the daemon.
- [lenses.ts](lenses.ts) contains implemented in-memory lenses over static contracts.
- [self-analysis-contracts.ts](self-analysis-contracts.ts) owns the row contract vocabulary behind `atlas.self`.
  [self-analysis.ts](self-analysis.ts) builds the source-backed substrate behind those rows. It indexes grouped
  string literals, structural row surfaces, relationship-axis surfaces, class/function/top-level-variable declaration surfaces,
  mapper/parallel-axis pressure rows, lens implementation paths, projection branches, continuation objects,
  continuation helper calls, declared framework semantic routes, module dependencies, and substrate surface rows
  through the hot TypeScript Program. [self-enums.ts](self-enums.ts) owns the Atlas-facing enum, value-space, and
  mapping rows projected from the package-scoped TypeScript enum usage index. [self-strings.ts](self-strings.ts) owns
  literal occurrence roles and contract-bearing string classification. [self-phase-profile-lenses.ts](self-phase-profile-lenses.ts)
  exposes the measured phase rows from the same source-analysis build as a queryable `atlas.self:phase-profile`
  projection, so cache/split decisions can be made through Atlas itself instead of profile-script prose. Keep enum and string ontology work in those
  modules unless it needs to join across broader Atlas surfaces.
  Lens reachability follows same-file calls and exact named imports, which keeps fact ownership inspectable without
  fuzzy global name matching.
  `atlas.self` exposes these as compact projections with source continuations; full source-project package details
  stay opt-in so self-maintenance queries do not flood the caller. Projection branch rows are observational: an
  unobserved projection may be handled by a default branch or pre-switch logic, so callers should treat it as a
  follow-up prompt rather than a failure. Contract rows also carry declared parameter ids and coherence facts with
  interpretation space plus next inquiries; use those facts to decide whether a smell is a duplicate axis, a wrong
  layer, or a missing primitive rather than turning every pressure signal into an auto-running check.
  `atlas.self` is not intended to judge architecture for the caller. It should expose exact rows, stable source
  continuations, and small composition aids; strategic decisions still come from reading the surrounding code and
  deciding which primitive should exist.
  Prefer named classes for substantial analyzers, builders, graphs, classifiers, registries, and memos. `atlas.self`
  can now inspect class, function, and top-level variable surfaces directly, including line-count, method-count, and
  property-count pressure filters for class rows, line-count, direct-call-count, and unique-call-target-count pressure
  filters for function rows, plus initializer-kind and initializer-entry-count filters for catalog/table-shaped variable
  rows. Future refactors should leave stable TypeScript shapes that the API can navigate without source-reading
  fallback.
- [ts-lenses.ts](ts-lenses.ts) adapts the hot TypeScript source substrate and LanguageService into `ts.source`,
  `ts.structure`, and `ts.type` answers, including IDE primitives and read-only TypeScript edit plans.
  `ts.type:call-sites` supports exact callee and runtime-argument filters (`argumentText`, `argumentSymbolName`,
  `argumentFullyQualifiedName`) so higher semantic lenses can preserve call precision when they hand off to raw
  TypeScript facts. `ts.type:facts` uses `budget.facts` for target fact rows and `budget.members` for nested
  checker-visible member rows; keep those separate from `budget.rows` and answer evidence limits.
  `ts.structure:document-symbols` supports exact query filtering and its source continuations use the whole symbol
  span, so callers can jump from a method/class row directly to the implementation body without opening files.
- [bridge-lenses.ts](bridge-lenses.ts) adapts product bridge substrates such as `bridge.aulink` into exact inquiry
  answers. `bridge.aulink` reads a source-project-scoped bridge index on demand so exact product-to-framework target
  reads stay cached within the current source epoch without daemon startup warmup.
  [bridge-aulink-lens-support.ts](bridge-aulink-lens-support.ts) owns the common bridge basis, route, and source-hop
  primitives; [bridge-aulink-usage-lenses.ts](bridge-aulink-usage-lenses.ts) owns the `usage-comparison`,
  `member-surface`, `usage-members`, `usage-consumers`, and `usage-sites` answer families. Keep new bridge detail
  families near the substrate they spend, and keep `bridge-lenses.ts` focused on base auLink
  catalog/anchor/target/gap/mirror routing. `usage-comparison` supports pressure-oriented `orderBy` values such as
  `frameworkUsageCount`, `productUsageCount`, `memberDivergence`, `publicMemberDivergence`,
  `publicFrameworkOnlyMemberNameCount`, `publicProductOnlyMemberNameCount`, and `usageImbalance` so broad
  framework/product shape questions can start from
  the largest exact rows instead of alphabetical lookup order; compact comparison rows also report public shared,
  framework-only, product-only, and divergence member counts for that rank signal. `member-surface` rows carry
  declaration-kind and access-kind counts and accept `memberAccess`, side-specific `frameworkMemberAccess` /
  `productMemberAccess`, and `memberDeclarationKind` filters so API shape questions can be separated from private
  implementation churn and data-record fields. Use `frameworkScopeMode: "direct"` when only the directly linked
  framework subject should count, `frameworkScopeMode: "subject"` when inherited shape subjects should count, or the
  default implementation scope when the full implementation-shaped contract is the question.
  `bridge.aulink:mirror` also accepts `hasRoleEvidence`, `hasEmulationObligations`, and pressure-oriented `orderBy`
  values such as `roleEvidence`, `emulationObligation`, and `mirrorPressure`. Use those before reading source when
  you need to distinguish well-grounded framework anchors from auLink placements that still lack semantic evidence.
  auLink decorator placements can carry a product-side `facet` when semantic-runtime intentionally mirrors one
  framework symbol through several product concepts, such as a built-in resource definition plus template-controller
  semantics. The bridge gap lane scopes duplicate-placement checks by facet; multi-facet groups remain visible in the
  rollup, while same-facet duplicate decorators still surface as gaps.
  `bridge.aulink` rows also continue into `atlas.memory` by `auLinkId`. This keeps the framework-shape mirror and the
  durable work/decision index from becoming competing mechanisms: start from either side, then jump to the other when a
  semantic-runtime mirror row has already accumulated guidance or still-live pressure.
- [atlas-memory-*.ts](atlas-memory-contracts.ts) owns the durable memory lens and filesystem-backed record store.
  Memory records are not a second workbench note system; they are queryable, live-checked guidance. Use Atlas-owned
  `atlas-self-*` live checks for Atlas source pressure, including `atlas-self-variable` for route catalogs and other
  top-level table-shaped declarations.
- [atlas-work-router-contracts.ts](atlas-work-router-contracts.ts),
  [atlas-work-router-route-catalog.ts](atlas-work-router-route-catalog.ts), and
  [atlas-work-router-lenses.ts](atlas-work-router-lenses.ts) expose `atlas.work-router`. The contracts file owns the
  schema, the route-catalog file owns the static route ontology, and the lens joins that ontology to live source,
  memory, and corpus pressure. The router maps broad work
  intent to typed route plans over source anchors, Atlas memory, framework corpus seeds, expected effects, scripts,
  docs, and cautions. Prefer exact route/domain/lens/source/symbol/auLink/corpus filters, including `effectKind`,
  `recipeKey`, and `seedUse`, before prose `query`; weak text matches are route-substrate pressure, not a success
  condition. Framework corpus seed rows carry typed classification reasons, so broad or surprising route fixture seeds
  should be inspected through those reasons before being treated as authoring taste. Test fixture seeds are admitted from
  concrete behavior snippets (`it(...)`, `createFixture(...)`, and extracted object cases), while `describe(...)` suite
  wrappers remain available in test-snippet projections but do not become fixture seeds. Route-owned corpus `query`
  anchors are the preferred way to keep a route's seed lane precise when a broad concept/effect pair admits adjacent
  examples.
  `route-plan` returns the full selected plan; when no explicit filter is supplied, it ranks route plans from live
  `atlas.memory:next` pressure and live product/source pressure using exact memory, source, path, and auLink anchor
  overlap before falling back to catalog order. Symbol-qualified source anchors rank named declaration/class/function/
  variable rows rather than broad module/file rows, and Atlas catalog/contract/barrel module shapes are damped so
  static catalog size remains visible without acting like implementation pressure. `next` is the checkpoint-friendly
  alias for that same route-plan family when the caller is asking "what should I do next?", while `next-questions`
  foregrounds the autonomous continuation prompts so agents do not have to rediscover route-specific steering after
  compaction.
  Prose `query` matching still uses route-owned structural vocabulary: a distinctive multi-token route term, symbol,
  source anchor, or canary phrase may be contained inside a larger natural-language query, while single-token fragments
  are not enough by themselves. This keeps checkpoint phrases like `CheckerExpressionTypeEvaluator method breakdown`
  routeable without turning the router into fuzzy search.
  Route-plan memory previews use route memory anchors as the admission gate, then let the active query reorder the
  admitted records and next actions; if an exact pressure phrase routes correctly but previews the wrong frontier,
  improve the durable memory wording instead of widening fuzzy route matching.
  Template overlay integration has its own route because generated TypeScript overlays sit at the join of template
  scopes, binding/data-flow, observer channels, i18n owner surfaces, checker diagnostics, exact source provenance, and
  future edit affordances. Overlay work should start there when the question is completeness, split-brain risk,
  typechecking, diagnostics, rename, MCP, or LSP readiness.
  The `workset` projection joins the current git worktree to route source/doc/path anchors and memory shards
  so autonomous checkpoints can see which typed routes the dirty set actually touches. Workset-matched route rows use
  `workset-structural` authority so their route plans do not look like orientation-only catalog defaults.
  `memory-coverage` reverses that join from live memory-next actions to route candidates. Exact source/path/auLink
  overlap is structural; shared generic lens anchors are not sufficient by themselves because they can connect unrelated
  routes through broad inspection tools such as `product.architecture`.
  `coverage` is the equivalent reverse index for cross-cutting product dimensions that cut across many routes. Use
  `coverageDimension` plus `coverageState` when a route-local topic may be missing a shared inquiry/API capability,
  such as intent-aware continuation threading, authored source-text boundaries, or checker value-access helper reuse,
  even though the route itself is not the substrate owner.
  Add `coverageDepth` when completion quality matters: `wired` means the public shape is connected, `semantic` means
  route-specific products/evidence/framework semantics are reflected, and `verified` means a contract, canary query, or
  source-level proof witnesses that behavior. Coverage filters are row-coherent, so a combined dimension/state/depth
  request cannot be satisfied by different coverage rows on the same route. Do not collapse these levels back into a
  single covered/partial label.
- [product-vocabulary-analysis.ts](product-vocabulary-analysis.ts) and
  [product-vocabulary-lenses.ts](product-vocabulary-lenses.ts) expose `product.vocabulary`. They walk the
  semantic-runtime vocabulary package through the hot TypeScript Program, then return the declared catalog, exact
  definition/key usages, claim predicate signatures, and product-kind adjacency expanded from those signatures. Keep
  this lens algebra-oriented: product-specific pressure belongs in the product model and in maintainer judgment, not in
  hard-coded Atlas cleanup checks.
- [product-architecture-analysis.ts](product-architecture-analysis.ts) and
  [product-architecture-lenses.ts](product-architecture-lenses.ts) expose `product.architecture`. They walk
  `packages/semantic-runtime/src` through the hot TypeScript Program and return source areas, modules, declarations,
  exact import rows, grouped area-to-area dependency rows, strongly-connected import cycle rows, class surfaces, and
  function/method/constructor/accessor surfaces. It resolves semantic-runtime call/constructor invocations as
  `call-sites` and groups them into `call-dependencies`, then separately resolves identifier usages as
  `symbol-references` and `symbol-dependencies`, with `usageFamily` filters for import/export, type, value, call, or
  runtime-side coupling. Module, declaration, cycle, class, function, call, and symbol dependency rows support
  `orderBy` for size and coupling triage, and class rows support `minMethodCount` / `minPropertyCount` filters for
  large-class pressure. Projection cost is intentionally visible: `summary`, `symbol-references`,
  and `symbol-dependencies` spend the full symbol-backed memo, while row projections such as `functions`,
  `call-sites`, and `call-dependencies` use the lighter core memo and omit rollup counts that would pretend symbol
  rows had been built. `areas`, `modules`, `dependencies`, `area-dependencies`, `declarations`, `cycles`, `classes`,
  `function-duplicates`, and `function-control-flow-shapes` use the no-call-site structure lane;
  `function-duplicates` groups top-level helper names across files with both normalized body fingerprints and
  AST/control-flow body-shape fingerprints, so the duplicate pressure script does not need to page every function row
  and regroup outside the lens. `function-control-flow-shapes` groups functions that share switch-dispatch topology
  across different names/files; treat it as a structural canary for parallel walkers and dispatch surfaces, not as a
  duplicate verdict. `atlas.self:function-shapes` groups repeated canonical function body shapes across different names,
  and `atlas.self:function-control-flow-shapes` applies the same switch-topology canary to Atlas source itself, catching
  split-brain helpers that would be invisible to duplicate-name scans. `atlas.self:function-wrappers` surfaces direct constructor-return and
  simple-call-return helpers with local direct-call, value-reference, and total-usage counts; it is a source-navigation lane for spotting
  possible one-off wrapper soup, not a verdict that a wrapper should be inlined or extracted. `functions`,
  `call-sites`, and `call-dependencies` use compact call-site topology by default; `call-sites` accepts
  `includeCallDetails=true` when a caller needs checker callee type/signature displays. Without a detail `query`, those
  displays are materialized only for the returned page; with a detail `query`, Atlas performs the whole-set exact call
  scan because callee type/signature strings are part of the search surface. Symbol projections use the symbol lane. The
  `profile` projection accepts `includeCallSites`, `includeCallDetails`, `includeSymbols`, and
  `includeKernelRecords` so future profiling can separate topology, product-record flow, and expensive call detail. Use `profile` or
  `pnpm --filter @aurelia-ls/atlas profile:product-architecture` before adding cache, warmup, or split points; the
  current cold pressure tends to sit in exact-call checker detail and checker symbol reference rows. Source-file,
  source-range, symbol-with-file, semantic-runtime package, and semantic-runtime repo-area loci now scope rows the same
  way as an explicit `pathPrefix`, including exact participant-file filtering for `area-dependencies`, so
  continuations and direct file probes do not need to rediscover the path filter. Class rows also accept
  `classNameSuffix` for envelope-shape questions such as zero-method `*Input` classes without mixing suffix matching
  into a broader text query. Class rows expose `auLinkIds` plus `hasAuLink`/`auLinkId` filters so product-model classes
  can be separated from ordinary pass-parameter envelopes. They also expose `auLinkCatalogIdsForName` with
  `hasAuLinkCatalogNameMatch`/`auLinkCatalogIdForName` filters, which finds semantic-runtime classes whose name exactly
  matches a cataloged framework symbol but lacks an anchor. `kernel-records`,
  `kernel-batches`, and `field-provenance` expose exact source-level
  semantic-runtime product record and provenance construction sites. Field
  provenance rows include both direct `new FieldProvenance(...)` construction
  and `fieldProvenanceEntries([...], handle)` helper call sites, including
  literal, conditional, spread, and dynamic field origins. Use them when a
  refactor question is about how the kernel model is being populated rather
  than just which files are large. Class property counts use the shared TypeScript
  member-surface substrate, so constructor parameter properties count as real property surfaces instead of making
  constructor-property records look empty.
  Use this lens when semantic-runtime architecture or refactor pressure would otherwise require source spelunking; it
  is a visibility substrate, not an automated judgment about which dependencies are good or bad.
- [framework-compiler-products.ts](framework-compiler-products.ts) owns compiler relationship atoms derived from
  instruction-producing syntax products, source-backed TemplateCompiler compile-flow/attribute-classification rows, and
  [framework-compiler-contracts.ts](framework-compiler-contracts.ts) exact compiler contract rows. The contract rows
  cover framework concepts such as `BindingCommandDefinition`, `BindingCommandInstance`, `ICommandBuildInfo`,
  `AttributePatternDefinition`, `CompiledPattern`, and bindables-info interfaces when those concepts are mirrored with
  `auLink` but do not emerge from instruction products alone. This keeps actors such as `CompilationContext` and
  `AttrSyntax` visible in the auLink mirror as framework relationships instead of only as derived emulation obligations.
- [framework-expression-relationships.ts](framework-expression-relationships.ts) and
  [framework-structural-relationships.ts](framework-structural-relationships.ts) lift framework catalog entity rows
  into relationship evidence for the auLink mirror and composition graph. They intentionally model definition/catalog
  grounding (`defines-expression`, `defines-observer`, `defines-rendering-structure`, and `defines-router-entity`)
  rather than pretending those entities have DI, hydration, or lifecycle behavior when the lower-level substrates have
  not exposed that behavior yet.
- [framework-lenses.ts](framework-lenses.ts) is now a compatibility facade. The actual inquiry work is split across
  discovery, compiler, and rendering answerers, entity catalogs, bundle readers, rendering syntax/instruction/binding
  phases, evidence builders, filters, and continuation families. Keep new framework semantics in the narrowest phase
  module that owns them; use facade files only to preserve stable import surfaces. Rendering/binding row projections
  are owned by `framework.rendering`, while `framework.discovery` stays focused on seed/package/resource/bundle/entity
  catalogs.
- [framework-continuation-core.ts](framework-continuation-core.ts) owns the shared continuation primitives for
  framework answers. `FrameworkRouteEndpoint` names the stable lens/projection endpoint,
  `FrameworkSemanticRouteSpec` names the declared semantic route topology, and `FrameworkSemanticRouteBuilder`
  materializes row-local continuations with filters, evidence, and rationale. Use these for repeated framework
  row-to-lens hops so route meaning is declared once instead of rebuilt as inline object literals.
  `projectionContinuation` and `nextPageContinuation` own generic framework projection/page moves; pass basis,
  evidence, priority, and route summary through options rather than cloning local helper functions.
  `sourceRowContinuationsForPage` binds common next-page plus row-source inspection moves at row-family declaration
  time; use it for plain source-backed row families instead of adding one-use wrappers that only fill copy strings.
  `FrameworkRowContinuationBuilder` owns repeated row-local source, type-facts, call-site, and evaluator-effect
  inspection moves. Prefer it over hand-written `TsSource`/`TsType` continuation objects so Atlas can continue to
  inspect those moves through `atlas.self:continuations`.
- [lens-filter-utils.ts](lens-filter-utils.ts) owns generic filter field copying for runtime lens adapters: string
  filters, boolean filters, renamed string fields, and singleton count-record filters. Domain-specific
  `filtersFromRecord` functions still choose their accepted field list, but they should not clone the raw mechanics.
  Subject-level and `filters`-level fragments must be merged through `mergeDefinedFilters`/`readInquiryFilters` so an
  empty filter object cannot erase a precise subject-derived filter such as an exact auLink id.
  Bridge support helpers such as `auLinkModelFilters` should make projection policy differences explicit, for example
  whether a free-text query should be forwarded to the underlying auLink model.
- [framework-route-catalog.ts](framework-route-catalog.ts) declares the current framework semantic endpoints and route
  specs. `atlas.self:semantic-routes` reads this catalog directly; `atlas.self:continuations` reads call sites that
  instantiate these specs. Add new route specs here when a semantic hop repeats across admission, rendering, lifecycle,
  observation, resources, or materialization.
- [framework-composition-lenses.ts](framework-composition-lenses.ts) exposes `framework.composition`. It projects
  auLink anchors and framework relationship rows into the shared `SemanticClaim` answer algebra, so class/interface
  actors such as `Container`, `TemplateCompiler`, or `Controller` can be inspected as induced signed graphs rather than
  as manual hops across bridge, DI, compiler, rendering, lifecycle, observation, and router projections. Structured
  claim filters such as `family`, `relation`, `mechanism`, or `phase` are standalone narrowing filters; only actor or
  query filters opt into text-term matching.
- [framework-emulation-view.ts](framework-emulation-view.ts) derives `framework.composition:emulation` from existing
  framework substrates. It is a semantic-runtime obligation map, not a product implementation model: rows say which
  framework behavior must be covered by ECMAScript evaluation, a semantic-runtime emulator, template-controller
  virtualization, or TypeChecker handoff, then continue back to the exact DI/resource/compiler/rendering projection
  that owns the evidence.
- [framework-emulation-report.ts](framework-emulation-report.ts) renders the deterministic Markdown eyeball golden
  behind `createApi().frameworkEmulationSymbolsReport()` and
  `pnpm --filter @aurelia-ls/atlas report:framework-emulation`. Keep the report as a view over
  `framework.composition:emulation` and `framework.observation:entities` substrates rather than giving it its own
  ontology; changes should make the underlying rows clearer first, then let the report expose the new shape.
- [framework-api-lenses.ts](framework-api-lenses.ts) exposes `framework.api`. It keeps public/module API subjects,
  implementation shapes, member slots, source declarations, raw usage sites, and `usage-consumers` owner groups
  separate. Usage rows also carry compact call-shape facts for call usages, so filters such as `callArgumentSymbolName`
  can localize edges like `Container.get(ITemplateCompiler)` before the caller opens raw source. Use `usage-consumers`
  as the compact owner map before opening large API usage pages; bridge owner rows can jump into this projection for
  framework-side context.
- [framework-di-lenses.ts](framework-di-lenses.ts) exposes the first relationship-atom lens, `framework.di`. It reads
  DI relationship atoms from `framework/di-index.ts` and keeps keys, registrations, provider/alias targets, lookups,
  and materialization mechanics navigable without folding those phases into the discovery catalog.
- [framework-di-graph.ts](framework-di-graph.ts) lifts those atoms plus materialization routes into a typed DI graph.
  The graph layers follow semantic-runtime's DI emulator boundary: admission, container state, lookup, resolution,
  materialization, and dependency. Use `framework.di` projection `graph` for edge navigation and `dag` for the
  SCC-collapsed key dependency view. Do not treat arbitrary lookup arguments as closed DI keys; graph rows preserve
  those as `key-expression` nodes until a source/checker fact closes their identity.
- [framework-materialization-lenses.ts](framework-materialization-lenses.ts) spends DI provider atoms and concrete
  configuration DI-world slots into first-pass materialization routes. It closes exact provider expressions and
  constructable/instance/alias seeds, while carrying callback-provider return/value closure as explicit evaluator seams.
  Callback provider routes now also spend evaluator invocation effects into exact container dependency rows for calls
  such as `handler.get(...)` and `handler.has(...)`; DI-world routes carry provider dependency rows from spent
  registrations such as `getAll(IRenderer)` and renderer `container.invoke(...)`. These rows separate "key
  materializes through provider", "key enters runtime existence here", and "key depends on dependency key".
  Materialization route rows also carry `providerIdentity`, which separates concise graph/display names from raw
  provider endpoint text for anonymous callback/class/object expressions. It also exposes resource instantiation rows
  that join resource carriers to runtime/compiler/evaluator
  materialization sites for view-model construction, expression-resource lookup/application, binding-command build,
  resource-kind DI registration/lookup, and singleton runtime renderer registration.
- [framework-resource-lenses.ts](framework-resource-lenses.ts) exposes `framework.resources`. It converges resource
  carriers with public package exports, evaluated bundle admissions, syntax products, and materialization lanes without
  claiming final container/template visibility. Its materialization, admission, and syntax-product route hops use the
  shared framework semantic route primitive. Use it when the question starts from "which resource is this and what
  evidence lanes does Atlas already know?" instead of from DI, admission, rendering, or lifecycle. Convergence evidence
  uses the exact resource definition carrier span as its primary source, such as a static `$au` initializer, resource
  `define` call, decorator, attribute-pattern create call, or renderer helper call. Rows also carry a separate
  declaration-source continuation when the backing class/export header is a different span, plus typed `sourceSites`
  for backing declarations, bundle admissions, syntax products, and materialization sites. Use
  `pressure:framework-resources` when provenance breadth is the pressure rather than a specific resource row. Filtered
  summaries distinguish matching rows from total convergence rows, so a query miss should read as "no matching
  resource row" instead of "the framework resource substrate is empty".
- [framework-router-lenses.ts](framework-router-lenses.ts) exposes `framework.router`. It is the first router grounding
  map: rows stay source-backed and split router package pressure into an ordered route-config/navigation `flow`
  projection, including route-recognizer state population and recognition rows, plus route-context, route-tree,
  route-recognizer, viewport-agent, navigation, DI, resource, lifecycle surfaces, and normalized `relationships`.
  Use it before modeling router semantics in semantic-runtime; if a needed row is missing, improve this Atlas lens
  before inventing router behavior from app examples. The scanner lives in
  [framework-router-analysis.ts](framework-router-analysis.ts), the curated flow/route-recognizer descriptor keys live
  in [framework-router-descriptor-map.ts](framework-router-descriptor-map.ts), and the expected Aurelia checkout
  baseline lives in [framework-router-source-map.ts](framework-router-source-map.ts). The `flow-issues` projection
  compares the curated route-flow descriptors to the materialized source rows and reports stale descriptors,
  duplicate sequences, or ambiguous descriptor keys. Router rows that cross component/materialization boundaries expose declared semantic route
  continuations into `framework.materialization:resource-instantiations`,
  `framework.rendering:hydration-flow`, `framework.rendering:controller-creations`, and
  `framework.lifecycle:controller-calls`, so router modeling can follow the same end-to-end route grammar as compiler
  and rendering corridors.
- `atlas.self:source-files` exposes Atlas source files with module shape (`barrel`, `catalog`, `contract`,
  `implementation`, or `mixed`), line, statement, import, export, declaration, type/value declaration, large-literal,
  area, local incoming edge, local outgoing edge, and cross-area outgoing edge counts. Use it before manually browsing
  for oversized or highly coupled modules; `pressure:self` includes this projection as the first maintenance lane.
- `workspace.architecture:profile` exposes package manifest/file-inventory, source scan, surface attribution, shape
  inference, and rollup timings. Use it before adding caches or warmup to external-root workspace analysis; the phase
  owner should be visible first. The finished workspace analysis is memoized per source epoch so follow-up package,
  surface, summary, and profile reads in one daemon reuse the same scan.
- `plugin.architecture` exposes public-plugin package topology and source-shape surfaces for the admitted
  `aurelia2-plugins` packages. Summary, package, and surface projections return rollups for the filtered row set,
  including surface-kind, surface-mechanism, bindable-mechanism, resource-mechanism, router-mechanism, and template
  reference-mechanism distributions. Package and surface filters share one selected row set, so kind/mechanism filters
  narrow package counts to packages that own matching surfaces. Use these aggregate maps before paging public plugin
  rows; the lens is a pressure lane for framework-shaped patterns, not a declaration that plugin source is canonical app
  style.
- Source-backed architecture analyses should generally memoize their finished products per source epoch. Workspace,
  public-plugin, framework-router, product-architecture, framework resource convergence, and Atlas self-analysis now
  follow that rule so pagination, pressure scripts, and related projections do not repeatedly walk the same hot Program.
- Workspace architecture keeps source-role pressure separate from semantic surface pressure and keeps package admission
  role separate from Aurelia project shape. Origin stays on `admissionRole`, while `aureliaShape` is one of
  `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, or `non-aurelia`; use the shape filter for app-like
  scope selection, not as a replacement for resource-library or general package pressure. Declarations, tests,
  examples, generated files, and tooling config are counted by role, but only `app-source` files are deeply walked for
  Aurelia imports, resources, configuration, DI, router, and template-reference surfaces.
- Workspace route-config pressure exposes non-extractive facets in addition to mechanism counts. Facets include
  carrier shape (`route` decorator, static `routes`, `getRouteConfig`, or static route property), route-object field
  sets, field value-kind buckets such as identifier or dynamic import, and child-route array cardinality buckets. Do
  not promote route literals, component names, or app route maps into durable docs; use these aggregate facets before
  paging router rows from external clean-room roots. When a facet count deserves source inspection, `workspace.architecture`
  surface filters accept exact `facet` and `facetPrefix` values so callers can page only rows matching a clean-room
  category such as `route-config.component.value-kind:dynamic-import-call`. Filtered package and surface projections
  carry a filtered rollup for one selected row set, while the row payload itself remains paged. Surface filters narrow
  package counts to packages that own matching surfaces, and free-text query matching crosses the package and surface
  sides so a surface-only term does not erase the owning package rollup.
- [aurelia-source-imports.ts](aurelia-source-imports.ts) centralizes source-file-local Aurelia package binding
  admission for workspace and public-plugin architecture lenses. It covers ES imports plus literal CommonJS
  `require(...)` destructuring/property/namespace bindings. Keep package/export import sets there when `aurelia`,
  `@aurelia/kernel`, `@aurelia/runtime-html`, `@aurelia/runtime`, or `@aurelia/router` entrypoints grow new relevant
  source-shape APIs. Router receiver type/initializer/value recognition also lives there because workspace and
  public-plugin architecture share the same router import semantics. `self-check` parses the framework router public
  index and fails if a public `@aurelia/router` export is not admitted here, so router export drift should be fixed in
  the shared substrate rather than separately in workspace/plugin lenses.
- [aurelia-bindable-carriers.ts](aurelia-bindable-carriers.ts) centralizes framework-shaped bindable metadata carriers
  shared by workspace and public-plugin architecture lenses: `@bindable` decorator target/argument shape, static
  `bindables`, and resource definition-object `bindables`.
- [aurelia-template-references.ts](aurelia-template-references.ts) classifies HTML template references for architecture
  lenses. It distinguishes HTML imports, dynamic imports, literal `require(...)`, and `template`/`templateUrl`
  properties. Do not count arbitrary strings that merely end in `.html`; those are often URLs, glob patterns, extension
  constants, or unrelated product data rather than framework template-loading evidence.
- [aurelia-resource-conventions.ts](aurelia-resource-conventions.ts) mirrors the framework/plugin-conventions
  class-name and companion-template resource naming rules for Atlas architecture lenses. Keep it aligned with the
  semantic-runtime convention recognizer when resource pressure shows convention resources, and use it before treating
  bindable-heavy public plugin packages as resource-empty.
- [framework-compiler-lenses.ts](framework-compiler-lenses.ts) exposes `framework.compiler`. It projects
  binding-command `build(...)` and instruction-factory instruction production into compiler relationship atoms, then
  continues into rendering dispatch and controller creation rows for the produced instruction by instruction name so
  template-compiler producers can cross into runtime-html renderers.
  [framework-compiler-products.ts](framework-compiler-products.ts) owns the compiler product/relationship substrate
  used by both the compiler lens and cross-phase flow corridors; keep instruction-production facts there rather than
  coupling graph composition to the answerer.
- [framework-rendering-syntax.ts](framework-rendering-syntax.ts) owns the shared source syntax-product scan, but public
  lenses split the result by semantic phase. Compiler instruction production (`builds-instruction` and
  `emits-instruction`) feeds `framework.compiler`; rendering syntax products (`handles-instruction` and
  `creates-binding`) feed `framework.rendering:syntax-products`. Resource convergence routes binding-command resources
  to compiler products and renderer resources to rendering syntax products, avoiding a single `syntax-products`
  projection that means both "compiled instruction producer" and "runtime renderer product."
- [framework-rendering-controllers.ts](framework-rendering-controllers.ts) indexes renderer hydration rows that
  construct resource view models, create child controllers with `Controller.$el` / `Controller.$attr`, recursively
  dispatch child property instructions, invoke template-controller link hooks, and admit children back to the parent
  controller. This is the source-backed bridge from resource construction into controller lifecycle without flattening
  recursive rendering into fake closure. Public `controller-creations` rows expose an ordered `hydrationSteps` trace so
  semantic-runtime controller/view-factory/synthetic-view modeling can be compared to the actual framework handoff
  sequence before opening raw `renderer.ts` source.
- [framework-rendering-hydration-flow.ts](framework-rendering-hydration-flow.ts) owns the compact resolved-runtime
  hydration corridor. It is not a second rendering graph; it is a source-backed entry map from `AppRoot` and
  `Controller` through `Rendering.compile`, `Rendering.render`, renderer-table materialization, renderer-side
  `find`/`invoke`/controller creation, binding admission, lifecycle hooks, and observation setup. The broad
  `framework.rendering:hydration-flow` answer should remain small and navigable, then continue into detailed
  `controller-creations`, `instruction-dispatches`, `binding-admissions`, compiler, lifecycle, DI, resource, and
  observation projections when the caller asks for more. The compiler hand-off is route-backed in both directions:
  hydration rows can localize the `Rendering.compile` / `TemplateCompiler.compile` source of a compiled definition,
  and compile-flow rows that produce definitions or instruction rows can return to hydration-flow by target kind.
  The default answer is an overview; it reports total corridor rows separately so callers can see that detail rows are
  available through filters such as `operation`, `targetKind`, `ownerName`, or `methodName`. Binding-admission rows in
  hydration-flow are projected from `binding-admissions`, so filtered binding reads are complete even though the default
  overview only keeps a small bridge row.
- [framework-rendering-consequences.ts](framework-rendering-consequences.ts) owns the compact renderer consequence
  view behind hydration. It derives from normalized rendering relationship atoms rather than scanning source again, and
  names the runtime consequences of dispatch as `instruction-dispatch`, `controller-creation`,
  `child-controller-admission`, `binding-production`, `binding-admission`, `observer-lookup`,
  `observation-setup`, and binding/lifecycle effect rows. The default answer is an overview with per-kind quotas and
  total counts; filtered reads open the full consequence set and row-local continuations jump into the heavy detail
  families only when needed. Emulation rows should lift `consequenceKind` into their domain `targetKind`; do not leak
  relationship endpoint kinds such as `symbol`, `method`, or `expression` into the semantic-runtime worklist.
  Render-consequence rows expose those source-level categories as `actorEndpointKind` and `targetEndpointKind`.
- [framework-rendering-public-rows.ts](framework-rendering-public-rows.ts) owns compact public answer rows for
  historically heavy rendering detail projections. `syntax-products`, `instruction-slots`, `instruction-dispatches`,
  `controller-creations`, `binding-products`, and `binding-admissions` still use the full internal index rows for
  continuations, evidence source ranges, and relationship derivation, but their public value/evidence payload is now a
  stable summary shape. Keep this split: the public projection should be a token-cheap jump surface, while
  source/type/detail continuations provide the expensive nested checker facts only when a caller asks for them.
- [framework-rendering-relationships.ts](framework-rendering-relationships.ts) derives normalized rendering
  relationship rows from the existing rendering catalogs, including controller creation rows. It is intentionally a
  relationship projection over catalog atoms, not a second scanner. The small `BindableDefinition` contract row is an
  exception because runtime-html bindable metadata is a definition record that semantic-runtime mirrors directly and it
  otherwise has no rendering role row. Continuations from those rows should prefer semantic hops first and only use
  source/type inspection when the next useful lens is not known yet.
- [framework-lifecycle-lenses.ts](framework-lifecycle-lenses.ts) exposes `framework.lifecycle`. It joins controller
  lifecycle method/call sites, binding lifecycle effects, and resource materialization phases into a separate lifecycle
  view instead of pushing controller activation or expression-resource behavior into the rendering lens. Controller
  call rows keep self-lifecycle, child-controller, binding-list, state-gate, and teardown lanes separate. AppTask rows
  keep AppRoot slot invocation, `IAppTask` collection lookup, slot filtering, and `task.run()` execution separate from
  configuration-time AppTask admission. Hook dispatch rows keep direct view-model hook calls, registered hook collection
  dispatch, and registered hook helper callback invocation separate. Child-controller activation rows continue back to
  renderer controller-creation and child-admission rows through shared semantic route facts, using shared lifecycle lane
  axes from the framework substrate.
- [framework-observation-lenses.ts](framework-observation-lenses.ts) exposes `framework.observation`. It joins the
  observer/reactivity entity catalog with binding observer/accessor lookup rows, binding observation setup overrides,
  observation subsystem surface/flow rows, compact dependency-circuit roles, collection method inventory,
  compact ObserverLocator decision rows,
  flow-to-entity links, and normalized
  observation relationships derived from rendering plus observer-locator internals. Binding lookup and flow-to-entity semantic hops are emitted through
  declared semantic route specs with explicit source/checker basis. Narrow page projections intentionally compute only their
  own row family; use `summary` when the full observation rollup is worth paying for. The `binding-lookups` projection
  names binding classes that call observer/accessor APIs; use `flow-sites` or `observer-locator-decisions` when the
  question is about concrete runtime-html observer classes such as `CheckedObserver` or `SelectValueObserver`. The dependency-circuit projection
  keeps ordinary `astEvaluate` access reads, array collection reads, arrow callback body evaluation with the captured
  connectable, ProxyObservable traps, watcher/effect boundaries, and ObserverLocator decisions in one routeable view.
  Prefer that before manually reading framework observation source for callback/proxy/getter category questions.
  The collection-methods projection keeps `astEvaluate`'s array auto-observe list beside `ProxyObservable`'s
  array/map/set wrappers, including which wrappers collect the collection, invoke callbacks inside the active
  connectable turn, and wrap callback/result values. Shared proxy iterator helpers are expanded into the receiver
  paths that expose them, so array `keys`/`values`/`entries`, map/set `keys`/`values`/`entries`, and the array/map/set
  `Symbol.iterator` handoff stay visible rather than collapsing into one generic helper row. Prefer it before changing
  semantic-runtime collection method sets.
- [framework-observation-internals.ts](framework-observation-internals.ts) indexes source-backed observation machinery:
  `ObserverLocator`, `NodeObserverLocator`, dirty-checking, collection helper functions, observer cache access, and
  connectable subscribe/unsubscribe mechanics. It also records the `ComputedObserver` auto-dependency path and
  `ControlledComputedObserver` explicit-dependency handoff: string dependencies use expression observers, direct symbol
  or function dependencies re-enter `IObserverLocator.getObserver`, and deep observation creates a function-key observer
  over a recursive connectable walk. It also records watcher/effect surfaces around `@watch`,
  the `Watch` registry, CE/CA resource watch metadata merges, `createWatchers`, `ComputedWatcher`,
  `ExpressionWatcher`, `Observation`, private effect runners, and slot watchers, including parser/access-scope branches
  and dependency-collection entry/exit points. It can associate internal flow-site targets with public `runtime` and
  `runtime-html` observer entity rows through explicit match bases. It is an internal relationship producer, not a
  replacement for the public observer entity catalog.
- [framework-admission-lenses.ts](framework-admission-lenses.ts) turns evaluator-derived bundle/configuration
  associations into first-class `framework.admission` relationship rows. It keeps the admission relation, mechanism,
  phase, original association kind, evaluator certainty, source bundle, and admitted target separate on the shared
  framework relationship axes so callers can jump from configuration into DI keys, resources, registry exports,
  catalogs, factories, and AppTasks without expanding raw evaluator output. The `materializations` projection bridges
  admitted DI keys and resources to visible DI/resource runtime-existence rows while preserving admission source,
  materialization source, match basis, and closure separately. The `world-formation` projection then joins those
  materialization links and AppTask lifecycle execution rows while preserving registry, catalog, factory, argument,
  and unknown admissions as explicit admission-only or open boundaries. Its broad summary intentionally returns a
  cheap orientation and asks for `packageId` or `exportName` before paying the cold all-package bundle cost.
- [framework-admission-flow.ts](framework-admission-flow.ts) composes one configuration or bundle root through
  admission relationships, catalog expansion, registry body expansion, DI materialization routes, and resource
  convergence roles. Use `framework.admission` projection `flow` when the question is "what world does this
  configuration form?" rather than "show me one row family." `flow` is a cheap graph rollup; follow `flow-edges`,
  `flow-nodes`, or explicit `flow-edge-details` continuations when the rollup proves the detailed rows are worth the
  token cost. Compact edge pages should route to `flow-edge-details` before offering per-edge source inspection, so
  source continuations do not dominate first-pass graph browsing. The graph is derived from exact admission, bundle,
  materialization, and resource substrates; it should expose gaps as missing or open edges rather than hand-ranking
  framework importance. Flow uses `packageId` and
  `exportName` as root-admission scope, then follows admitted values into DI keys, provider dependency reads, and
  recursively materialized dependency providers before applying graph filters such as `targetName`, `key`, `nodeKind`,
  `edgeKind`, `role`, `resourceKind`, and `query`. Dependency edges are provider-to-key facts with `ownerKey` metadata
  so multi-provider roles like `IRenderer` stay analyzable without pretending the DI key itself owns every constructor
  dependency.
  Flow also accepts `corridor: "jit-compiler"` for the compiler-only slice of a configuration world. That corridor
  keeps compiler-relevant resource-definition roles, TemplateCompiler/binding-command materialization and dependency
  edges, and source-backed compiler instruction-production edges. It intentionally does not pull renderer dispatch or
  controller hydration into the same view; `framework.rendering:hydration-flow` owns that resolved-runtime corridor.
  The JIT corridor distinguishes compile-time `find`/definition lookup from `get`/`invoke` materialization pressure:
  custom elements, custom attributes, and template controllers stay visible as compiler definition lookups, while their
  view-model construction and hydration dependencies are outside this corridor.
- `framework.discovery:bundles` is the broad bundle/configuration catalog. It intentionally separates
  `configuration`, `registration-catalog`, and `registry` rows so `StandardConfiguration` stays a useful canary without
  hiding decomposed runtime arrays such as `DefaultComponents`, `DefaultResources`, `DefaultRenderers`, or router
  catalogs. Plain `InterfaceSymbol` registry objects remain in `di-interfaces`/`registry-exports`; they do not count
  as spendable bundle rows. Bundle continuations can spend the exact selected `packageId`/`exportName` through
  `framework.di:world` by passing `configurationPackageId` and `configurationExportName`.
  Bundle discovery uses a syntactic candidate pass over implementation files before spending evaluator/effect-trace
  work, so large external source roots do not force every public export through static evaluation. Keep this split:
  candidate discovery answers shape (`configuration`, `registration-catalog`, `registry`), while admission/effect
  tracing answers what the selected shape actually spends. Configuration factory members such as `init(...)` may return
  an `IRegistry` object; bundle associations should inspect that returned registry body and local const/function
  factories before falling back to helper-name classification.
- Framework resource classification joins source-level `*.define(...)` carriers back to their target implementation
  declarations by package/name. This covers patterns such as `BindingBehavior.define('x', X)` that live outside the
  class body, without forcing every implementation class to look resource-shaped by convention.
- `framework.di:dependencies` separates exact DI dependency edges from variable-carried key/type reads. Exact rows have
  a stable `dependencyKey` such as an `InterfaceSymbol` or module-level class; variable rows preserve
  `FrameworkDiVariableKeyRef` (`handlerInfo.type`, `comp`, `def.Type`, etc.) with checker type and source. Lenses and
  reports should keep this split visible so variable carrier names do not masquerade as DI keys or drive recursive DI
  closure.
- `framework.composition:emulation` marks TypeChecker handoff rows with
  `interpretationStatus: "provisional-typechecker-handoff"`. These rows are source-backed boundaries into future
  semantic-runtime binding/reactivity work, not a complete behavior graph. Avoid filling missing renderer peer rows by
  hand unless a first-class binding/reactivity handoff substrate exists to own that taxonomy. Handoff interpretation is
  also depth-sensitive: root/controller-owned binding materialization may be deterministic, while bindings under
  template-controller synthetic views can remain speculative because the owning controller realization is speculative.
- [framework-jit-compiler-corridor.ts](framework-jit-compiler-corridor.ts) names the current StandardConfiguration /
  TemplateCompiler corridor affordance shared by admission-flow and compiler continuations. This is a focused canary
  corridor over the default runtime-html composition, not a claim that `StandardConfiguration` is the only admissible
  bundle root. The route catalog declares
  both directions: JIT flow rollups can jump to TemplateCompiler instruction products, and compiler summaries or
  TemplateCompiler rows can jump back to the focused JIT flow slice. Rendering instruction dispatch/syntax rows can
  also navigate back to compiler instruction products, closing the compiler-to-rendering path without merging rendering
  into the JIT corridor.
- [framework-compiler-flow.ts](framework-compiler-flow.ts) keeps TemplateCompiler compile-flow separate from
  `_classifyAttributes` detail. `framework.compiler:compile-flow` is the high-level compiler stage map across
  `compile(...)`, `compileSpread(...)`, node/element compilation, local elements, projections, attribute reordering,
  custom-attribute bindables, multi-bindings, and instruction assembly; it should answer "where am I in compilation?"
  without expanding every attribute branch. Broad flow uses overview rows, while `methodName` and `compileStage`
  filters expose method-local detail. `framework.compiler:attribute-classification` owns the detailed branch taxonomy,
  including find/get/build/emit/error roles plus instruction-product and resource-convergence continuations. The
  compiler summary should remain a rollup and point into these projections instead of embedding row samples.

Runtime lenses answer through the same inquiry and answer contracts whether they spend static contract rows, TypeScript
facts, product vocabulary, bridge anchors, or framework substrates. Runtime continuations may carry route claims from
the inquiry navigation grammar so repeated local moves can be promoted into named substrate indexes instead of staying
hidden in lens implementation code. Route claims can also carry `basisTransition` metadata when a concrete continuation
has source-backed reason to change epistemic footing; static product or framework handoff catalogs do not belong here.
