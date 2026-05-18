# atlas

`atlas` is the in-repo Atlas package for this repository.

It is built around a small inquiry kernel whose job is to keep Codex oriented while the repo grows:

- model where a question is rooted with loci;
- model what substrate an answer spent with basis records;
- keep uncertainty, partial closure, open seams, and reroutes first-class;
- produce typed continuations instead of reader-specific next-step folklore;
- let future TypeScript, product-substrate, framework, and Atlas maintenance lenses compose over the same answer algebra.

The package is intentionally contract-first. Lenses declare their supported loci, substrate dependencies, projections, output evidence kinds, and default budgets before implementation code grows around them.

Stable identifiers are represented with commented `const enum` declarations. Exported contracts and data-bearing properties should carry short source comments explaining their grounded use, matching the product kernel's minimum standard.

`src/inquiry/vocabulary.ts` declares a small package-owned self-description vocabulary. It is meant to make Atlas easier to analyze by intent later, without forcing self-analysis lenses to infer design meaning from names or file layout.

`src/inquiry/runtime` is the in-memory execution workbench. It is the implementation substrate used by the durable session daemon.

`src/inquiry/navigation.ts` declares the reusable route grammar that turns answer-local continuations into auditable
source/type/semantic route claims.

`src/session` is the default request surface. `createApi()` auto-starts or reuses the local daemon before every request, giving long-running work a place to keep hot state while still restarting when the compiled build output changes.

`createApi().orient()` is the highest-level entrypoint. It returns daemon status, the surface map, the `atlas.self`
maintenance answer, first continuations, package scripts, and compact follow-up docs through the same auto-starting
session path. The package script `pnpm --filter @aurelia-ls/atlas orient` is the stable Codex-facing activation call and
prints a compact text orientation; `pnpm --filter @aurelia-ls/atlas orient:json` prints the full request-shaped bundle.

`atlas.memory` is the queryable durable-memory lane. Its manifest lives at
`packages/atlas/memory/atlas-memory.json` and focused record shards live under
`packages/atlas/memory/records`, while the lens recomputes status from live
source, `product.architecture`, and `atlas.self` rows. Use it before trusting old
workbench notes: `records` shows all durable records, `guidance` answers
"what should I inspect or reuse for this kind of problem?", `frontiers` joins
active/stale/intentional records with untracked live pressure, and `stale`
shows resolved or stale records that should not masquerade as active work.
`next` ranks computed start-here moves from storage issues, stale memory, live
frontiers, live intentional shapes, reuse guides, and untracked product pressure; active frontiers can opt into
`nextActionPolicy=when-touched` when they should stay queryable as domain guidance without driving unfiltered work.
The compact summary
prints its first rows. The
shortcut script is `pnpm --filter @aurelia-ls/atlas memory`; use
`memory:json` when a tool needs the exact answer payload.
Pass `--query`, `--path`, `--domain`, `--kind`, `--status`, `--recordId`, `--name`, `--surfaceRole`, `--liveCheckKind`, `--nextActionPolicy`, `--anchorKind`, `--anchorLensId`, `--symbolName`, or `--rows` to narrow the memory script without paging the full store.
Memory scripts accept both `--name=value` and `--name value` as exact record-id filters and default those reads to the `records` projection; `--limit` is an alias for `--rows`. Repeating `--domain`
narrows to rows carrying every listed domain unless `--domainMode=any` is supplied.
Query-filtered memory rows and next actions rank ids, exact domains, anchors, and summaries above incidental mentions in guidance prose. They try strict all-token matching first and fall back to partial-token relevance only when a broad checkpoint query would otherwise return no rows, so loose workstream phrases can still find the strongest local handle first.
Use `memory:next` when a fresh session needs a ranked live canary instead of a
new markdown archaeology pass. Once the workstream is known, narrow the next
lane structurally, for example `memory:next -- --domain authoring --rows 8`,
so global large-class pressure does not bury the most relevant local frontier.
Use `work:router -- --projection=workset` when the current dirty worktree itself
is the canary; it groups changed files by typed route source/doc/path anchors
and memory shards before you decide what to inspect next. Workset route rows carry
`workset-structural` match strength, not catalog-default, when dirty files match
route-owned evidence. Use `--fileRows=...` to widen the per-route changed-file
sample, and reserve `--includePlans` for checkpoints that need full route-plan
authority and corpus detail in addition to the dirty-file grouping.
Use `work:router -- --projection=memory-coverage --detail` when `memory:next`
looks ahead of the route catalog. Durable memory ownership does not come from
path anchors or unfiltered generic lens anchors: use source, exact
memory-domain, auLink, script, doc, or structurally filtered lens anchors. Exact
domain-set matches win; otherwise a route needs at least two non-generic domain
overlaps so generic carriers such as `semantic-runtime`, `template`, `memory`,
and `inquiry` do not route by themselves. Memory-domain anchors are for explicit
domain filters and memory coverage joins; route queries should still match
declared route terms, source symbols, query canaries, auLink ids, corpus lanes,
or exact anchors rather than inheriting memory domains as fuzzy vocabulary.
With no explicit filters, `work:router -- --projection=route-plan` ranks from
both live memory-next actions and live product/source pressure. Product-pressure
matches are structural source-anchor matches, so a large module, class, or
function body can promote the route that owns it without relying on fuzzy prose.
Symbol-qualified source anchors rank declaration/class/function/variable rows
rather than inheriting whole-file/module pressure, and Atlas catalog/contract/barrel
module shapes are damped so static catalog size stays visible without becoming
implementation pressure. Source-anchor roles weight that live pressure: primary
and pressure anchors can drive route selection, while supporting catalog/context
anchors stay visible without drowning the owning substrate just because they are
large.
Work Router projection ids are exact (`route-plan`, `next-questions`,
`route-health`, `workset`, `memory-coverage`, and `schema`); unsupported
projection requests print the reroute answer, the supported projection list, and
typed continuations instead of a stack trace.
In detail mode, record-backed next rows print anchors before guidance and the
answer payload includes the backing memory record rows, so the next jump target
is visible without opening raw JSON. The printed backing-record section
summarizes rows already expanded as next actions instead of duplicating their
full guidance blocks. Human detail output is intentionally bounded; use
`--guidanceRows=...`, `--anchorRows=...`, `--liveCheckRows=...`, or the matching
`--all-*` switches when the full printed expansion is worth the context.
Use `memory:write` to list shards, print a record template, upsert a draft
record, or remove a stale record with a dry-run first. Durable JSON memory is
the queryable index; package READMEs remain boundary maps, workbenches remain
rolling context, and `.temp` notes should be promoted before they matter beyond
the current commit boundary.

`createApi().frameworkEmulationSymbolsReport()` returns the deterministic framework emulation Markdown report used as
the current framework-composition eyeball golden. It still uses `StandardConfiguration` as a broad canary, not as the
framework ontology. Re-run it with
`pnpm --filter @aurelia-ls/atlas report:framework-emulation`, which writes
`packages/atlas/workbench/emulation-symbols.md`.

## Fast Agent Lanes

For a compact current handoff, read [workbench/agent-handoff.md](workbench/agent-handoff.md) after `orient`.

- Start broad work with `pnpm --filter @aurelia-ls/atlas orient`; it is the compact live map of lenses, projections,
  terrain, source footing, first moves, shortcut scripts, and compact follow-up docs. Use `orient:json` only when a
  tool needs the full machine-readable orientation payload.
- Use `atlas.memory` before reading large workbenches for prior intent. It is
  the source-backed memory/task lane: durable records are explicit JSON, but
  active/resolved/stale status is computed from the current worktree when
  possible. Its `next` projection is a computed start-here lane, not an
  exhaustive project plan. Use `memory:write` for durable updates instead of
  letting new direction live only in scratch notes.
- Use `product.architecture` before opening semantic-runtime source for structure pressure. `functions`, `classes`,
  `call-sites`, and `call-dependencies` are the usual fast product refactor lanes; `functions --detail` prints bounded
  callee symbol/expression samples so a large method's coordination shape is visible before opening the full call-site
  page. `summary` and symbol projections spend the heavier symbol-backed memo. The shortcut script is
  compact `pnpm --filter @aurelia-ls/atlas pressure:product-architecture`; it prints cheap structure pressure first,
  then the call-site-backed function pressure. Use
  `pnpm --filter @aurelia-ls/atlas pressure:product-architecture:detail` when lower-ranked rows matter.
  The script wrapper accepts exact filter names only; use `--fromFilePath`, `--toFilePath`, `--filePath`, or
  `--pathPrefix` for file-scoped dependency/source questions. Unsupported flags fail fast so a mistyped filter cannot
  silently widen into a global architecture read.
- Use `pnpm --filter @aurelia-ls/atlas profile:product-architecture` when a product architecture query feels slow.
  The script prints structure, body+structure, compact-call core/full, exact-call core/full, and symbol cold phase
  timings so cache or split decisions start from measured cost instead of vibes. Function body fingerprints and switch
  topology are opt-in body-analysis facts; cheap structure reads intentionally skip them unless duplicate/control-flow
  projections or `--includeFunctionBodyAnalysis=true` ask for that lane.
- Use `pnpm --filter @aurelia-ls/atlas profile:workspace-architecture` when external-root workspace pressure feels
  slow. It prints package manifest/file-inventory, source scan, attribution, profile inference, sorting, and rollup
  phase timings.
- Use `atlas.self:classes` and `atlas.self:functions` before opening Atlas source for Atlas refactors. Class rows
  support `minLineCount`, `minMethodCount`, `minPropertyCount`, and pressure-oriented ordering; function rows support
  `minLineCount`, `minCallCount`, `minUniqueCallTargetCount`, and pressure-oriented ordering. Use
  `pnpm --filter @aurelia-ls/atlas self -- --projection=...` when a specific `atlas.self` row family needs exact
  filters, paging, detail output, or JSON payloads. The pressure shortcut is
  compact `pnpm --filter @aurelia-ls/atlas pressure:self`; use
  `pnpm --filter @aurelia-ls/atlas pressure:self:detail` when a full metric row is needed. It also prints high
  `atlas.self:axis-pressure` rows. Use
  `pnpm --filter @aurelia-ls/atlas profile:self` when the question is projection cost rather than source shape; the
  default output is compact and its enum hotspot summary splits string/number candidate rows; `profile:self:detail`,
  `--phaseRows=...`, or `--enumRoleRows=...` widens the tail.
  Use `self -- --projection=phase-profile` when a measured cost lane needs to be narrowed, paged, or joined through
  ordinary inquiry continuations instead of re-running the profile script output by hand. Standard `atlas.self` skips
  expensive call-argument enum contextual refinement unless a targeted call-argument occurrence inquiry or
  `--enumContext=all` asks for the full lane; `--enumContext=none` keeps enum declaration/reference/raw-overlap rows
  without checker-backed raw-value narrowing when the current question is baseline inventory cost. Comparison raw-value
  narrowing has a syntax-skipped profiler row for counterparts that cannot carry enum value types, so inspect
  `enum-usage.checker.getTypeAtLocation.comparison-counterpart` and its `.syntax-skipped` sibling together. It also
  separates source-surface reads from semantic taxonomy reads:
  ordinary `classes`, `functions`, `source-files`, variables, wrapper, and Work Router source-pressure reads skip
  enum/string/contract-string taxonomy unless `--includeSemanticTaxonomyAnalysis=true` or a taxonomy projection asks for
  it. Function body fingerprints and switch topology are a second explicit body-analysis lane: ordinary
  `classes`/`functions`/summary reads skip it, while `function-shapes`, `function-control-flow-shapes`, fingerprint
  filters, switch-topology filters, or `--includeFunctionBodyAnalysis=true` request it deliberately.
- Use framework lenses for Aurelia grounding rather than pattern-matching from other frameworks. `framework.resources`
  preserves exact definition spans plus typed source-site lanes for backing declarations, bundle admissions, syntax
  products, and materialization sites. `framework.rendering` owns hydration/binding/controller rows,
  `framework.observation` owns observer-locator/reactivity rows, and `framework.composition:emulation` is the compact
  semantic-runtime obligation map. Use `pnpm --filter @aurelia-ls/atlas pressure:framework-resources` when resource
  provenance is the question, and use `pnpm --filter @aurelia-ls/atlas framework:resources -- --projection=convergence`
  when a resource route needs exact convergence rows.
- Use `framework.corpus` when official Aurelia docs or framework tests should seed fixture/authoring pressure. The
  shortcut `pnpm --filter @aurelia-ls/atlas framework:corpus -- --projection=doc-snippets --concept=forms` returns
  classified, paged rows from docs/tests/legacy replacement inventory without turning those corpora into MCP or direct
  semantic truth. Its `expected-effects` projection derives source-backed rows from semantic-runtime's
  expected-effect kind and role contracts, including a seed policy that separates corpus-pattern effects from reopen
  baselines such as project shape, app root, and project tooling, orientation contracts, and closure contracts.
  `fixture-seeds` joins docs/test snippets to those
  expected-effect descriptors plus recipe hints so fixture expansion can start from a semantic pressure target instead
  of raw examples. Seed classifiers read the exact source range behind each snippet rather than the compact preview.
  Fixture seed rows also carry typed classification reasons (`concept:*`, `effect:*`, `surface:*`, `recipe:*`,
  `contrast:*`) so a row can explain why it was admitted or downgraded without reopening the source immediately. Use
  `classificationKind=surface` and `classificationKey` for exact reason filters such as `native-value-binding`,
  `native-checked-binding`, `option-model-binding`, or `validation-binding-behavior`; the CLI also accepts the printed
  reason spelling in `classificationKey`, such as `surface:option-model-binding`. Surface reasons are local to doc code
  fences and test `createFixture(...)` call snippets; broader `describe`/`it` carrier rows can still carry effect,
  recipe, or contrast pressure, but they should not satisfy exact surface filters.
  Interpolation and bare `else` classification is context-aware: markup snippets can count Aurelia template syntax,
  while ordinary TypeScript template strings and JavaScript branches should not.
  Use `effectKind`, `effectRole`, `effectSeedPolicy`, and `recipeKey` as structural filters and `query` for
  source/content concepts; recipe names are not allowed to make every row match a content query such as `forms`.
  Use `seedUse=authoring-taste` or `seedUse=behavior-grounding` when choosing whether the corpus snippets are being
  used as taste pressure or framework behavior pressure; documentation under testing guides is behavior-grounding
  rather than app-authoring taste. `authoring-taste` expected effects are orientation contracts, so they are not
  expected to have direct fixture seed rows of their own.
  Fixture seed expected-effect filters can also be narrowed structurally with `expectedEffectFilterField` and
  `expectedEffectFilterValue`, for example `staticArgumentValues=blur` or `targetProperty=value`.
  Router fixture seeds require concrete router authoring/runtime syntax such as `@aurelia/router`, `@route`, route
  config objects, or `au-viewport`; broad route/router prose remains visible as corpus navigation pressure without
  creating routed authoring recipe pressure by itself.
- Use `framework.discovery:bundles` when composition roots are the question. It separates spendable framework
  `configuration`, `registration-catalog`, and `registry` rows, so `StandardConfiguration` is a canary rather than the
  only visible composition shape. Follow bundle rows into `framework.di:world` with `configurationPackageId` and
  `configurationExportName` to inspect a selected configuration or decomposed catalog.
- Use `framework.router` before deep router or route-recognizer modeling. It maps the framework router packages into
  an ordered route-config/navigation flow plus route context, route tree, route-recognizer, viewport-agent, navigation,
  DI, resource, lifecycle, and normalized router relationship rows so semantic-runtime work starts from framework-owned shapes instead of
  app-pressure heuristics. Its `recognizer` projection splits route-recognizer internals into path grammar, state graph,
  endpoint registration/materialization, recognition walks, candidate selection, cache, and lookup mechanics. Its
  `flow-issues` and `recognizer-issues` projections self-audit curated descriptor maps against the live framework source,
  so stale or ambiguous route-flow landmarks are visible instead of silently disappearing. Router
  flow rows also expose semantic route continuations into resource materialization, rendering hydration, child-controller
  creation, and controller lifecycle rows when their stage crosses those framework boundaries. Use
  `pnpm --filter @aurelia-ls/atlas framework:router -- --projection=relationships --query=ViewportAgent --detail`
  when the compact `pressure:framework-router` summary needs row-level grounding.
- Use `bridge.aulink` after framework router rows when the question is whether a framework-owned router concept has a
  product mirror, role evidence, emulation obligation, or divergent usage. The targeted shortcut is
  `pnpm --filter @aurelia-ls/atlas bridge:aulink -- --projection=mirror --packageId=router --detail`; use
  `--sourceLens=framework.router` or `--linkId=router:ViewportAgent` when the route/viewport question is already known.
- Use `workspace.architecture` when a pressure run admits authored apps or monorepos through the source substrate. It
  separates package admission role from inferred Aurelia shape, exposes source-role pressure for app/test/tooling
  separation, then reports Aurelia entrypoint signals, manifest/build signals, framework imports, resources,
  configuration, registrations, router usage, and template references. For external clean-room runs, keep tracked
  notes to aggregate counts and mechanism categories rather than row names, paths, or exact source spans; the summary
  rollup includes filter-aware surface-kind, mechanism, admission-role, Aurelia-shape, package-manager, and build-tool
  distributions for that purpose. `pressure:workspace-architecture` adds external/app-shaped aggregate sub-rollups and
  per-kind mechanism distributions for resources, configuration, registration, DI resolution, router, and template
  references without printing row payloads.
  Non-app source roles stay visible as source-role pressure, while only `app-source` files are deeply walked for
  Aurelia semantic surfaces.
  App-entrypoint rows are Aurelia-bootstrap-aware: `app`, `enhance`, and `start` calls must be rooted in an imported
  `Aurelia` constructor/facade or a receiver proven from one, not an arbitrary `.start()` method.
  Resource, bindable, and watch decorator rows likewise require Aurelia decorator imports or namespaces rather than
  matching bare decorator names globally.
  DI `resolve`, `Registration.*`, and `AppTask.*` rows are rooted in Aurelia package imports or namespaces such as
  `aurelia`, `@aurelia/kernel`, or `@aurelia/runtime-html`.
  Registration rows for `.register(...)` are rooted in an Aurelia bootstrap receiver or a kernel `IContainer` receiver,
  and surface as `aurelia.register` or `container.register` rather than a generic method-name hit.
  Router rows are import-aware architecture signals: they come from `@aurelia/router` imports, route decorators,
  route-config object properties, static route config fields and nested child route objects on route-bearing classes,
  `getRouteConfig` hooks, `RouterConfiguration.*`, or receiver bindings proven from router imports/types/`resolve(...)`
  calls rather than generic method-name matching. Workspace call mechanisms are normalized into compact categories and
  call-chain shapes instead of storing full app call expressions.
  DI resolution rows distinguish imported kernel `resolve(...)` from grounded container `get`/`getAll`/`has` lookups.
  Configuration call mechanisms intentionally collapse project-specific `*Configuration` factory names to
  `configuration-call` in aggregate output.
  Template-reference rows are syntactic carriers only: HTML imports, dynamic imports, `require(...)`, and
  `template`/`templateUrl` fields count, while arbitrary string literals ending in `.html` do not.
- Use `plugin.architecture` when public `aurelia2-plugins` package surfaces are the pressure input. It reads admitted
  plugin source packages and reports resources, registries, DI registrations, AppTasks, router hooks, resolve calls,
  and template references without treating those plugins as canonical app idiom. Decorator, DI, AppTask, container, and
  router rows are import/receiver-aware so public plugin pressure does not reintroduce generic name-shape heuristics.
  `pressure:plugin-architecture` prints the public aggregate before row paging.

## Map

- [src](src/README.md) is the implementation root.
- [src/framework](src/framework/README.md) owns Aurelia-specific framework substrates over source, evaluator, DI,
  admission, resources, compiler, rendering, lifecycle, observation, API usage, and bridge pressure.
- [src/inquiry](src/inquiry/README.md) owns the inquiry, answer, lens, substrate, terrain, vocabulary, and runtime contracts.
- [src/session](src/session/README.md) owns the local daemon, compatibility-profiled filesystem manifests, and restart lifecycle.
- [src/scripts](src/scripts/README.md) owns static coherence checks and maintenance entrypoints.
