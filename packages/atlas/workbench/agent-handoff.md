# Atlas Agent Handoff

This note is the short read after `pnpm --filter @aurelia-ls/atlas orient`.
Keep it compact; move stable ownership detail into package READMEs.

## Fast Local Lanes

```powershell
pnpm --filter @aurelia-ls/atlas orient
pnpm --filter @aurelia-ls/atlas memory
pnpm --filter @aurelia-ls/atlas pressure:self
pnpm --filter @aurelia-ls/atlas profile:self
pnpm --filter @aurelia-ls/atlas pressure:bridge-aulink
pnpm --filter @aurelia-ls/atlas pressure:framework-errors
pnpm --filter @aurelia-ls/atlas framework:errors -- --projection=diagnostic-frontiers --packageId=template-compiler --codeNamePrefix=compiler
pnpm --filter @aurelia-ls/atlas framework:errors -- --projection=diagnostic-codes --rows=20
pnpm --filter @aurelia-ls/atlas pressure:framework-corpus
pnpm --filter @aurelia-ls/atlas framework:corpus -- --projection=doc-snippets --concept=forms
pnpm --filter @aurelia-ls/atlas pressure:framework-resources
pnpm --filter @aurelia-ls/atlas framework:capabilities -- --projection=catalog --detail
pnpm --filter @aurelia-ls/atlas pressure:framework-observation
pnpm --filter @aurelia-ls/atlas framework:observation -- --projection=observer-locator-decisions --detail
pnpm --filter @aurelia-ls/atlas framework:observation -- --projection=collection-methods --detail
pnpm --filter @aurelia-ls/atlas framework:observation -- --projection=surface-methods --surfaceKind=proxy-observable --detail
pnpm --filter @aurelia-ls/atlas framework:observation -- --projection=flow-sites --surfaceKind=computed-observer --detail
pnpm --filter @aurelia-ls/atlas framework:observation -- --projection=flow-sites --surfaceKind=controlled-computed-observer --detail
pnpm --filter @aurelia-ls/atlas framework:observation -- --projection=flow-sites --surfaceKind=ast-evaluator --detail
pnpm --filter @aurelia-ls/atlas pressure:framework-router
pnpm --filter @aurelia-ls/atlas pressure:plugin-architecture
pnpm --filter @aurelia-ls/atlas pressure:workspace-architecture
pnpm --filter @aurelia-ls/atlas profile:workspace-architecture
pnpm --filter @aurelia-ls/atlas pressure:product-architecture
pnpm --filter @aurelia-ls/atlas profile:product-architecture
pnpm --filter @aurelia-ls/atlas expression:coverage -- --query=DestructuringAssignment --detail
pnpm --filter @aurelia-ls/atlas expression:coverage -- --projection=collection-methods --flag=modern-array-framework-observation-gap --detail
pnpm --filter @aurelia-ls/atlas self-check
```

- `orient` is the compact live map. It includes API entrypoints, implemented
  lenses, first moves, capability moves, terrain ownership, source-project
  footing, and the package script rows above, plus compact follow-up docs. Use
  `orient:json` only when a tool needs the full request-shaped payload.
- `atlas.memory` is the durable queryable memory lane. It reads
  the `packages/atlas/memory/atlas-memory.json` manifest plus focused
  `packages/atlas/memory/records/*.json` shards, joins records to live
  source/product-architecture/atlas.self checks, and computes `active`, `intentional-live`,
  `reference`, `resolved`, or stale statuses. Use
  `pnpm --filter @aurelia-ls/atlas memory` before relying on older workbench
  prose; use the `guidance` projection for "what should I inspect/reuse?" and
  the `frontiers`/`stale` projections for live or outdated pressure. The
  compact default memory summary includes the first ranked next actions;
  use `pnpm --filter @aurelia-ls/atlas memory:next` when a checkpoint should turn
  into "what do I do next?" with detail rather than a report-back boundary. `next` is
  computed from live storage issues, stale records, pressure-frontiers, reuse
  guides, and untracked product class pressure, so treat it as a canary lane
  rather than a static task list. Active pressure-frontiers can be
  `nextActionPolicy=when-touched`: those are reusable grounding rows for matching
  tasks, not default autonomous work just because their source handles still
  exist. Exact `memory:next -- --recordId=...` lookups still return consult rows
  for queryable reference/when-touched records, so checkpoint recovery can use
  one command without promoting those records into global next-work. The script
  forwards `--query`, `--path`, `--domain`, `--kind`, `--status`,
  `--recordId`, and `--name` filters, plus `--surfaceRole` for untracked product-class pressure,
  `--liveCheckKind` for the mechanism that keeps a durable record honest,
  `--nextActionPolicy` for proactive versus when-touched pressure-frontiers,
  `--anchorKind`, `--anchorLensId`, and `--symbolName` for structural memory
  lookup, and `--rows` to cap detailed checkpoint output. Detail output also
  caps guidance/live-check/anchor expansion by default; pass
  `--guidanceRows=...`, `--liveCheckRows=...`, `--anchorRows=...`, or the
  matching `--all-*` switches only when a checkpoint really needs the full
  printed expansion. `memory:json` / `--json` exposes the exact answer payload, so
  narrow memory before opening large docs. Memory rows, frontier rows, untracked
  frontiers, and next actions rank strict query matches first, then append
  significant adjacent partial matches that cover at least half the query and at
  least two tokens; use that for broad checkpoint phrases. Free-text query
  ignores storage-envelope fields such as shard paths and synthesized
  `atlas.memory:next:*` ids; use exact filters such as
  `domain`, `path`, or `symbolName` once the workstream is known. For example, after a diagnostic pass closes and
  the next loop is clearly authoring/taste work, use
  `pnpm --filter @aurelia-ls/atlas memory:next -- --domain=authoring --rows=8`
  instead of following the global queue through unrelated large-class pressure.
  Use `pnpm --filter @aurelia-ls/atlas memory:write` to list shards, print a
  record template, upsert a draft JSON record, or remove a stale record with
  `--dry-run` first. JSON memory is the queryable handle; README files own stable
  boundaries, workbenches own rolling context, and `.temp` is scratch unless its
  durable essence has been promoted.
- `atlas.work-router` is the structural route layer over memory, source anchors,
  framework corpus, docs, scripts, and cautions. Use
  `pnpm --filter @aurelia-ls/atlas work:router -- --projection=memory-coverage --detail`
  when `memory:next` seems ahead of the route catalog. Durable memory ownership
  does not come from path anchors or unfiltered generic lens anchors; use source,
  exact memory-domain, auLink, script, doc, or structurally filtered lens anchors.
  Exact domain-set matches win; otherwise at least two non-generic domain
  overlaps are required so generic carriers such as `semantic-runtime`,
  `template`, `memory`, and `inquiry` do not route by themselves. Memory-domain
  anchors support explicit domain filters and memory-coverage joins, not free
  query vocabulary. Use
  `--projection=coverage --coverageDimension=intent-aware-continuations`
  to find route-local query families whose public answer surfaces still need the
  shared intent-aware continuation dimension; `--coverageState=missing` or
  `partial` narrows the list when a broad topic might otherwise hide the gap.
  Combined coverage filters are row-coherent: dimension, state, and depth must
  match one coverage row rather than independent rows on the same route.
  Unfiltered `route-plan --detail` ranks from both memory-next and live product/source
  pressure; `product-structural` matches mean a large module, class, function,
  or named declaration matched a route-owned source anchor. Symbol-qualified
  anchors do not inherit whole-file/module pressure, and Atlas catalog/contract/barrel
  module shapes are damped so static catalog size stays visible without becoming
  implementation pressure. Source-anchor roles weight those live pressure scores,
  so primary/pressure anchors can drive route selection while supporting
  catalog/context anchors stay visible without dominating merely because they
  are large. Projection ids are exact, and the
  CLI now prints supported projection ids plus typed continuations for reroute
  answers instead of throwing a stack trace on unsupported projections. Current route health is green and
  memory coverage is fully routed after adding explicit template HTML parsing,
  binding-scope, and i18n translation-binding routes.
- `framework.capabilities` is the compact Atlas terrain for "what Aurelia can
  do" before app-builder or public capability APIs derive consumer policy. Use
  it before reshaping app-builder lowering axes or MCP guidance; rows separate framework
  concepts, app-author source forms, locality, resource kinds, resource source support, framework effects, typed requirements, consequences,
  framework-local constraints, and evidence. The first curated
  catalog is intentionally reviewable rather than complete. Use `--projection=matrix`
  for concrete resource-kind/source-form cells, `--projection=evidence` for
  cheap evidence descriptors, `--projection=evidence-trace` when Atlas should
  spend on backing lens rows/source anchors, and `--projection=grounding` with
  `--groundingStrength=corpus-backed` before deriving app-builder or MCP policy
  from the terrain. Grounding is factual; it is not a downstream policy decision.
  Semantic-runtime owns app-local authored capability truth through
  `framework.capability-demand` products. Treat Atlas capability rows as
  navigation/coverage memory, then verify concrete app truth through
  semantic-runtime demand, registration admission, manifest/import evidence, and
  template diagnostic contracts. Atlas currently routes the product owner through
  world-construction/app-builder terrain rather than acting as a dedicated
  capability-demand coverage oracle.
  The current release canary is broader than runtime-html shorthand syntax:
  unregistered `@event` / `:property`, i18n/state plugin syntax, router /
  validation-html / ui-virtualization resource tags or attributes, and i18n /
  validation-html / state expression resources should become
  `framework-capability-not-registered` diagnostics when the matching
  capability is not admitted, not generic compiler errors or silent plain
  attributes.
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
  expressions. For external clean-room roots, keep tracked notes at aggregate count and
  mechanism-category level; do not promote row names, paths, source spans, or
  summaries. The summary rollup includes filter-aware surface-kind, mechanism,
  admission-role, and Aurelia-shape distributions for this. App-entrypoint
  rows are import/receiver-aware for the Aurelia bootstrap API rather than
  generic `.start()` or entry-file-name matching; resource/bindable/watch decorators are also
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
  topology observations from external clean-room roots. The pressure script also prints
  external/app-shaped aggregate sub-rollups without row names, paths, ranges,
  or summaries, plus app-entrypoint mechanism counts, so use those before opening package rows.
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
- `pressure:framework-corpus` is the compact corpus lane for public Aurelia
  docs/tests. Use it before promoting a docs pattern into authoring taste or
  before choosing a framework test cluster as behavior-grounding pressure. Docs
  are promoted-pattern pressure and tests are behavior-grounding pressure; none
  of those should be treated as direct semantic truth or MCP API shape.
  Use `framework:corpus -- --projection=doc-snippets --concept=forms --language=html`
  or `framework:corpus -- --projection=test-snippets --concept=forms --generated=false`
  when the next authoring/fixture loop needs concrete docs/test seeds without
  reopening the whole docs or framework test tree. Use
  `framework:corpus -- --projection=expected-effects` to inspect the
  source-backed semantic-runtime expected-effect kind and role contract rows,
  including `effectRole=signature` and `effectRole=discriminator` when fixture
  selection needs the recipe-fit distinction. Effect-kind rows also carry an `effectSeedPolicy` so corpus
  source-pattern effects can be separated from reopen baselines,
  retired app-pattern migration contracts, and closure contracts. Use
  `framework:corpus -- --projection=fixture-seeds --effectKind=binding-data-flow`
  when you need the same corpus narrowed to expected-effect contract and app-pattern
  pressure.
  Combine `effectKind` and `appPatternKey` for structural narrowing, then use
  `query` for source/content concepts; app-pattern labels are deliberately not query
  hits for fixture seeds. Use `seedUse=authoring-taste` or
  `seedUse=behavior-grounding` when choosing whether docs/tests are being used
  as taste pressure or behavior pressure; `authoring-taste` expected effects
  are orientation contracts and should not be expected to produce direct corpus
  fixture rows. Use `expectedEffectFilterField` and
  `expectedEffectFilterValue` for concrete expected-effect facts such as
  `staticArgumentValues=blur` or `targetProperty=value`, especially when a
  fixture needs a seed for one exact binding behavior argument or value channel.
  Listener commands such as `click.trigger` and `submit.trigger` do not count
  as value-channel `targetProperty` filters.
  Use `classificationKind=surface` plus `classificationKey` for exact typed
  reason filters such as `native-value-binding`, `native-checked-binding`,
  `option-model-binding`, or `validation-binding-behavior`. The CLI also accepts
  the printed reason spelling in `classificationKey`, such as
  `surface:option-model-binding`, and normalizes it into the same kind/key
  filter. Surface reason filters intentionally match local doc code fences and
  concrete test behavior snippets (`it(...)`, `createFixture(...)`, and
  extracted object test cases), not parent `describe(...)` suite ranges that
  merely contain nested tests.
  Style/class fixture seeds split stylesheet assets, observer-backed
  class/style value channels, and direct renderer target operations; target
  operations are classified only from HTML-like tag spans so TypeScript
  variables such as `const css = ...` do not masquerade as template writes.
  Whole class/style bindings and per-token/per-property bindings carry
  different value-channel filters: `.class` rows use the class token as the
  value-side `targetProperty`, while `.style` rows use the concrete CSS
  property as the value-side `targetProperty` and `style` as the target-access
  property.
  AuCompose snippets now seed `runtime-composition`, `surface:au-compose`, and
  `appPatternKey=dynamic-composition-surface`; use those structured filters before broad
  `query=au-compose` searches. Narrow AuCompose surface keys also exist for
  component/model/template inputs, scope/flush/tag literals,
  composition/composing outputs, and object-shaped component values.
  Fixture seed rows join their effect hints to the expected-effect contract descriptor when semantic-runtime declares one.
  Effect hints are classified from the exact snippet source range, not the
  compact display preview; keep it that way when adding source-shaped rules. The
  pressure script reports non-corpus expected-effect contracts without direct
  fixture seeds separately from seedable `corpus-pattern` gaps when they exist;
  do not chase reopen-baseline, closure, or migrated app-pattern contracts as
  missing docs snippets.
  Template binding and interpolation snippets now seed `binding-observed-dependency`
  when they expose concrete source expressions, so direct state/domain reads can
  be found through `framework:corpus -- --projection=fixture-seeds --effectKind=binding-observed-dependency`
  instead of only through recipe-local expectations.
  Computed fixture seeds split `computed-observation-definition` from
  getter-side `computed-observer-source`/`computed-observer-observed-dependency`:
  direct `@computed` methods are trackable-method declaration pressure, not
  getter observer source rows, while a plain getter that calls a computed method
  still seeds the getter descriptor path.
  Fixture seed source ranges can be followed through the row-level `ts.source`
  continuation with `projection=text`; docs and framework tests outside the
  TypeScript Program are source-text-backed only, so switch to checker lenses
  only after moving to admitted framework or product source.
- `pressure:framework-observation` is the compact observation lane. Use it
  before changing semantic-runtime observer/accessor/value-channel behavior: it
  prints observer entities, binding observer lookups and setup overrides,
  observation flow sites, flow-to-entity links, and relationship axes for
  ObserverLocator, NodeObserverLocator, collection observers, dirty checking,
  connectables, AST expression evaluation, watchers, effects, slot watchers, ComputedObserver, ControlledComputedObserver, and ProxyObservable. Use the
  targeted `framework:observation` CLI when a subsystem needs source-backed rows,
  for example `--projection=observer-locator-decisions`,
  `--projection=surface-methods --surfaceKind=proxy-observable`, or
  `--projection=flow-sites --surfaceKind=proxy-observable`. Use
  `--projection=flow-sites --surfaceKind=computed-observer` for getter/body
  dependency collection, and
  `--projection=flow-sites --surfaceKind=controlled-computed-observer` for
  explicit string/property/function dependency metadata and deep observation. Use
  `--projection=dependency-circuit --detail` when the question is how
  astEvaluate, active connectables, ProxyObservable, watchers/effects, and
  computed-observer lookup sites fit together as one dependency circuit. That
  projection includes the `template-callback-evaluation` row for ArrowFunction
  body evaluation with the captured connectable, so callback/proxy questions no
  longer need a manual `ast.eval.ts` read as the first move. Use
  `--projection=collection-methods --surfaceKind=proxy-observable --detail`
  when comparing semantic-runtime collection policy to framework proxy wrappers;
  shared `keys`/`values`/`entries` helpers expand into array, map/set, and
  `Symbol.iterator` exposure rows.
  Use
  `--projection=flow-sites --surfaceKind=ast-evaluator` before adding fixture
  boilerplate or product semantics around direct `state.member` template reads.
  The ObserverLocator decision projection is the first read for getter/accessor
  category questions: ordinary getter descriptors and function-key observer
  requests create ComputedObserver without requiring `@computed`, while
  TypeScript `readonly` remains a write-policy fact rather than observer
  selection evidence.
- `framework.router` is the router grounding lane. Use it before adding more
  semantic-runtime router/route-recognizer behavior; it maps router and
  route-recognizer source into an ordered route-config/navigation `flow`
  projection plus route-context, route-tree, viewport-agent, navigation, DI,
  resource, lifecycle, and normalized relationship rows with exact source
  continuations. The `recognizer` projection exposes path grammar, state graph,
  endpoint registration/materialization, recognition walk, candidate selection,
  cache, and lookup mechanics for `@aurelia/route-recognizer`; follow
  `framework.router:flow-issues` and `framework.router:recognizer-issues` when
  curated descriptors need to be checked against the live Aurelia source. These
  issue projections now also report source-baseline and descriptor-count drift,
  so a zero-row result is the router map freshness signal rather than only a
  descriptor materialization check. Router URL parsing/stringifying has its own
  `url-parsing` flow stage and `url-parser` relationship mechanism, so hash/path
  mode route semantics should be inspected there before treating route-recognizer
  rows as the full navigation story. Router
  relationship rows now include the route-recognizer mechanic rows and are joined
  by `bridge.aulink`, so mirror reads should be used to check semantic-runtime
  router anchors against framework role evidence before app pressure is trusted.
  Flow relationship targets split slash-delimited multi-target descriptors; `createConfiguredNode` exposes
  `ViewportRequest`, `ViewportAgent`, `RouteContext`, and `RouteNode` separately, so `auLink` anchors can attach to the
  exact router handoff concept instead of only the broad route-tree source span.
  `bridge.aulink` treats decorator facets as product-side modeling roles: the
  same framework symbol may intentionally have a resource-definition placement
  plus a controller/router semantics placement. Those show up as multi-facet
  groups, not gap rows; same-facet duplicates still indicate split-brain.
  `atlas.self:function-shapes` is now available for finding split-brain helpers
  that share canonical AST/control-flow bodies even when their names differ.
  `atlas.self` now separates source-surface analysis from semantic taxonomy
  analysis. Work Router and memory live checks use source surfaces without
  dragging enum/string/contract-string taxonomy through every route plan, while
  summary/taxonomy/enum/string/contract projections still request taxonomy.
  `atlas.self` also no longer computes function body fingerprints and switch
  topology in ordinary summary/function lanes; body facts are an explicit
  `includeFunctionBodyAnalysis` lane requested by shape/control-flow
  projections, fingerprint filters, or pressure scripts that truly need them.
  `atlas.self:function-wrappers` is available for finding shallow helpers that
  directly return a constructor call or simple call. It now separates local
  direct calls from value/callback references and reports total usage; those
  counts are navigation signals, not proof that a helper is dead or wrong. Use
  them to decide what source to inspect before accepting, inlining, or promoting
  a wrapper shape.
  `pressure:self` prints the repeated-shape lane; use it before broad Atlas
  cleanup because it surfaces real small duplications that grep and duplicate-name
  scans miss.
  Recent cleanup promoted repeated ad-hoc route claims, exact boolean/string
  filters, framework paged-answer assembly, call-site argument filters,
  product-architecture source contexts, file-span source ranges, and Aurelia
  container-reference recognition into shared primitives. Treat any reappearing
  rows in those families as a likely ownership regression, not harmless local
  style.
  Flow and relationship rows now carry
  semantic route continuations into resource materialization, rendering
  hydration, child-controller creation, and lifecycle controller-call rows when
  their stage crosses those framework boundaries. Use
  `pressure:framework-router` to check the router rollup, relationship axes,
  flow self-audit, and recognizer substrate self-audit quickly.
- `pressure:bridge-aulink` is the compact product-to-framework bridge pressure
  lane. It prints catalog/placement coverage, role-evidence gaps, links that
  have framework role evidence but no emulation obligations, and usage
  divergence. Use it when app/LSP sampling stabilizes and the next question is
  whether semantic-runtime is missing auLink anchors, Atlas is missing framework
  topology, or the obligation classifier needs to learn a modeled framework
  concept. Current catalog/placement coverage is healthy, but bridge role/obligation
  pressure still has four deliberate follow-up rows: `kernel:AnalyzedModule`,
  `kernel:ModuleItem`, `validation-html:ValidationContainerCustomElement`, and
  `validation-html:ValidationController`. Treat those as module-loader and
  validation topology pressure rather than as generic auLink placement gaps.
  Exact bridge subjects such as an auLink id should be asked directly; Atlas now
  preserves subject-derived filters when callers also pass an empty `filters`
  object. The obligation classifier now admits
  expression-parser, router, structural rendering/observer/router definitions,
  DI/materialization relationships, compiler relationships, lifecycle
  relationships, and rendering dispatch/binding relationships into the
  framework-emulation worklist. Relationship-derived obligations live in
  `framework-emulation-relationship-obligations.ts` so
  `framework-emulation-view.ts` stays focused on composition and non-relationship
  substrates. Treat new no-obligation rows as fresh topology or product-model
  pressure, not expected background noise. The pressure script prints
  per-projection timings; use them before assuming bridge slowness comes from
  catalog coverage rather than mirror role evidence or usage-comparison reads.
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
  repeated function body shapes, shallow function wrappers, optional
  object-spread construction pressure, magic/contract string pressure, and
  calibrated high enum/axis pressure with source line anchors before raw source browsing. Use
  `pressure:self:detail` when the compact source-file rows
  hide a metric you need. Duplicate helper-name rows carry both normalized
  body fingerprints and AST/control-flow body-shape fingerprints, so simple
  equivalent shapes such as ternary returns, if/else returns, early returns,
  temporary return aliases, and stable default-local override returns are visible
  without depending on raw text equality. Follow exact repeats with the
  `bodyFingerprint` filter and shape repeats with the `bodyShapeFingerprint`
  filter. At this checkpoint Atlas self-pressure and semantic-runtime product
  pressure both have a clean default duplicate-helper lane; new rows should be
  treated as fresh ownership pressure rather than known noise.
  The shallow wrapper lane exists because hiding a large function behind
  one-off constructor/call wrappers can make Atlas pressure look calmer while
  leaving the code less intentional. Treat wrapper rows as source-navigation
  evidence: accepting a longer cohesive function is often better than creating
  single-use wrappers just to make a metric disappear.
  The optional object-spread lane catches `...(cond ? {} : { prop })` object
  construction, including isolated low-pressure envelopes. The current cleanup
  passes resolved the concentrated review-note rows and several bridge/graph/page
  payload rows, then left scattered helper construction visible for deliberate
  follow-up. Prefer direct optional properties when own-property presence is not
  part of the semantics, but keep using the pressure lane as the source of truth
  instead of broad style-only churn. As of the current checkpoint, the next
  compact page is clustered around framework evidence-row helpers; that likely
  wants a shared evidence-construction pass rather than more one-off envelope
  edits. The magic-string lane shows values with at least one non-import/non-enum
  occurrence so latent ontology drift is visible in the normal maintenance loop;
  the role counts still include all occurrences so enum/module overlap remains
  visible before deciding whether to promote a value space.
  The old `answerTsType`/`answerTsStructure` self-pressure rows have been
  resolved by giving TypeScript IDE projections small dispatchers plus the
  shared `createPagedTypeScriptAnswer`, `evidenceRows`, and `pageInfoForRead`
  helpers. Future `ts.type` and `ts.structure` projections should plug into
  that answer-building shape instead of growing another repeated `createAnswer`
  block. Current compact self-pressure has moved to framework answerers, bundle
  association analysis, and bridge/DI answerers.
- `pressure:app-api` now prints expression type cache counts from
  semantic-runtime template runtime analysis. Use those counts when binding
  observation feels expensive: a low hit rate can indicate local-key drift or a
  materializer bypassing the shared `CheckerExpressionTypeEvaluationCache`,
  while stable hits with high phase time points farther down into TypeChecker,
  observer/value-channel, or record-publication work.
  Default output is aggregate because the discovered app-pattern and
  pressure fixture set is broad and the usual next move depends on combined
  product pressure shape rather than per-root detail; set
  `SEMANTIC_RUNTIME_PRESSURE_OUTPUT=inputs` when narrowing a single odd root.
  It also prints first-pass diagnostics-to-action rows when repair pressure is present.
  Ideal fixtures should normally show zero repairs; stress fixtures or external pressure
  should classify repair kinds, evidence, support state, and action targets
  without carrying source details into tracked notes.
- Interpolation parser pressure was narrowed by separating boundary extraction
  from `InterpolationPublicationFrame`, which owns active-hole selection,
  suppressed-hole promotion, and strict missing-close publication. Parser span
  rebasing now uses non-null `absoluteTextSpan(...)` when both relative and base
  spans are known; nullable absolute-span fallbacks in parser code should be
  treated as a lost provenance handoff, not ordinary defensive programming.
  The expression scanner's punctuation/operator branch is likewise split by
  token family; future lexical expansion should extend the relevant family
  method instead of regrowing one giant scanner switch.
  The high mapper lane now focuses on multi-axis framework-semantic mappers
  instead of one-axis endpoint/fact constructors.
- `pressure:product-architecture` is for semantic-runtime cleanup planning. Its
  default output is compact: cheap structure pressure first (large modules,
  cross-area imports, large classes, zero-method `*Input` envelope classes, and
  auLink-backed or behavioral `*Input` suffix classes), then the expensive
  call-backed function pressure. It also prints duplicate top-level helper-name
  pressure through the `function-duplicates` projection, filtered to repeated
  body-shape/body fingerprints by default so same-name/different-body helpers do
  not masquerade as implementation duplication. This keeps duplicate helper
  grouping inside `product.architecture` instead of paging every function row
  into the script. It now also prints product-record construction
  pressure: source-level KernelStoreRecord constructor sites grouped by record
  discriminator, visible product-vocabulary expression, module hot spots, owner
  hot spots, KernelStoreBatch commit labels/owners, and FieldProvenance creation
  sites grouped by field, module, and owner. Use
  `pressure:product-architecture:detail` when exact row samples matter. Class
  rows carry auLink ids, so product-model classes such as framework mirrors do
  not get lumped into ordinary parameter-envelope pressure. At this checkpoint
  the default duplicate-helper and compact function-pressure lanes are clear;
  new rows should be treated as fresh ownership pressure rather than known
  background noise.
- `profile:product-architecture` is for cost decisions. It prints structure,
  body+structure, compact-call core/full, exact-call core/full, and symbol lanes
  so cache/warmup/split work starts from measured cost. Product architecture now
  treats function body fingerprints and switch topology as explicit
  body-analysis facts: duplicate/control-flow projections ask for them, while
  cheap module/class/function structure reads do not.
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
  repeatedly rebuild the convergence product. The resource recognizer admits
  framework static `$au.type` constants by source-level constant name when the
  value is imported, including i18n's `valueConverterTypeName`; missing
  formatter/resource anchors in `bridge.aulink` should be checked against this
  lane before assuming semantic-runtime forgot an auLink.
- `pressure:framework-errors` is the framework diagnostic grounding lane. It
  reports Aurelia error/event code definitions, mapped messages, usage
  mechanisms, raw Error syntax, symbol-resolved raw Error factory calls,
  symbol-resolved mapped-error wrapper calls, mapped-error-factory
  implementation rows, hard-coded raw AUR labels, duplicate AUR-label counts
  across packages, semantic-runtime AUR-label links back to exact framework
  package/enum/member identity, diagnostic frontiers that join code families to
  semantic-runtime exact-link coverage, code-level diagnostic intake
  dispositions, and throw/warning effects.
  Use it before attaching `framework-error-code`
  diagnostics in semantic-runtime; weak app typings, TypeScript strictness, and
  authoring suggestions remain product policy unless this lane shows an
  equivalent framework error path. Prefer `gap=raw-error-authority-gap` over
  broad raw syntax when looking for unmapped framework diagnostic authority:
  `rawErrorKind=mapped-error-factory-implementation` is the implementation of
  normal `ErrorNames` / `Events` authority, not a bypass.
  AUR labels collide across framework packages, so semantic-runtime references
  should be `framework-code-link` rows with an exact package/enum/member target;
  use the `semantic-references` projection and
  `gap=unresolved-semantic-runtime-reference` before trusting a newly-added
  diagnostic label.
  The `codeNamePrefix` filter groups enum member families such as `parse`,
  `ast`, `compiler`, `router`, or lifecycle hook prefixes so future diagnostics
  work can start from a semantic subsystem rather than raw numeric ranges.
  Use `framework:errors -- --projection=diagnostic-frontiers`,
  `--projection=diagnostic-codes`, `--projection=codes`, `--projection=usages`, or
  `--projection=semantic-references` with `--packageId`, `--codeNamePrefix`,
  `--gap`, `--query`, `--rows`, `--detail`, or `--json` when the pressure
  summary is too broad and you need exact rows for one diagnostic subsystem.
  Use the `diagnostic-frontiers` projection when choosing the next diagnostics
  substrate: it highlights exact semantic-runtime coverage (`none` / `partial`
  / `dormant-closed` / `complete`), prints dormant and actionable uncovered
  counts, and keeps raw authority pressure visible without pretending every AUR
  label is already a static diagnostic. Its recommendation text also carries coarse likely-owner
  hints for common Aurelia families, such as runtime-html controller, watch,
  repeat, node/observer, binding/resource, router, DI/kernel, i18n, validation,
  and package-specific dialog/fetch-client frontiers. Treat those owner hints as
  navigation, not authority: inspect the framework usage row and owning
  semantic-runtime substrate before adding a code link.
  Use the `diagnostic-codes` projection after a family has been chosen or when a
  specific code appears in external-app pressure: it classifies each source
  definition as `modeled-exact`, `unmodeled-used-framework-authority`,
  `intentionally-unclaimed-framework-authority`, `dormant-framework-authority`,
  `declared-unspent`, `broken-exact-link`, or `raw-authority-gap`, then carries
  exact usage/link counts and source continuations.
  The projection accepts `--disposition=...`, which is the fastest way to check
  whether a cleanup actually closed one lane without paging every code row. As
  of the current checkpoint, mapped used framework authority has no unmodeled
  diagnostic-code rows, no declared-unspent constants, and no broken exact
  links. Raw framework throws now have their own
  `semantic-raw-references` projection: exact `frameworkRawErrorAuthority(...)`
  links can close individual raw Error rows without inventing fake AUR codes.
  Route-recognizer duplicate-path, reserved-`$$residue`, ambiguous-endpoint,
  @aurelia/state builder/decorator/store-registry issue products, and
  `Metadata.define(...)` without a key now spend exact raw references.
  @aurelia/state is closed for raw gaps: withStore after registration, reserved
  default store names, duplicate stores, missing named-store lookups, and invalid
  @fromState(...) target contexts are StateIssue products, while the three
  DevTools rows stay intentionally unclaimed live host/lifecycle errors. Raw
  framework throws also now have an `intentionally-unclaimed-raw-authority` lane
  for internal framework guards, live scheduler/platform/DOM state, SSR manifest
  translation guards, validation-message DSL guards, and helper bodies that are
  not current semantic-runtime product surfaces. The raw Error authority gap lane
  is currently closed; use the intentional lane before reopening a row as product
  work.
  Router's four raw Error rows are intentionally unclaimed:
  they guard live controller mount state, unresolved imperative navigation
  context, missing active/current viewport-agent nodes, and canUnload transition
  state, while semantic-runtime currently owns the pre-activation topology and
  handoff products.
  Intentional unclaimed codes and raw rows are now first-class in the pressure output rather
  than buried in workbench prose. For example, expression-parser `parse*` is
  closed as 26 exact semantic-runtime links plus intentional
  `parse_invalid_empty` because that code belongs to framework entry-family
  behavior not exposed by semantic-runtime today. Kernel `no_factory` is likewise
  intentional for the stock container model: framework `Container.getFactory`
  returns a factory or throws its own getFactory/JIT error before
  `Resolver.resolve` can observe a null factory, so that code belongs to custom
  `IContainer` handlers unless semantic-runtime admits those as products.
  As of 2026-05-14 the mapped diagnostic-code gap lane is closed: there are no
  `unmodeled-used-framework-authority`, `declared-unspent`, or
  `broken-exact-link` rows. Several high-volume families now show
  `coverage=dormant-closed`, meaning their remaining uncovered labels are
  unused framework definitions and/or intentional product-surface gates, not
  active static-diagnostic work. Runtime `ast*` spends exact links for the
  modeled `$host`, callable, destructuring, increment, nullish access, nullish
  assignment, and `@astTrack` paths; unknown operator guards stay intentionally
  unclaimed for malformed external AST objects, and the old behavior/converter
  names are dormant definitions. Runtime-html `ast*` claims only the live
  binding-utils resource lookup codes (`AUR0101`-`AUR0103`); the sibling AST
  names are dormant in the framework source. Runtime-html repeat claims
  `repeat_non_iterable` plus constructor option errors; `repeat_mismatch_length`
  stays live collection consistency, and `repeat_non_countable` is dormant.
  Runtime-html `node*`, `controller*`, `au*`, `invalid*`, `binding*`, and
  `update*` families are closed under the current product surfaces; reopening
  them requires admitting the corresponding live host/controller/lifecycle or
  custom service-replacement semantics rather than adding label constants.
  The pressure script also samples a text query for binding-related code rows;
  if that goes empty, check query/package filtering before assuming the
  framework lacks a code family.
  Semantic-runtime now has non-template diagnostic aggregation lanes:
  configuration service-customization errors are product-owned
  `ConfigurationIssue` rows, source/static `$au` duplicate-resource, ambient `resolve(...)`, and
  invalid `@inject`-family decorator errors are product-owned `DiIssue` rows (`AUR0007`, `AUR0014`, `AUR0016`, and `AUR0022`),
  runtime-html resource-definition registrar duplicates are product-owned `ResourceIssue` rows (`AUR0153`-`AUR0156`),
  direct runtime-html resource API definition failures are product-owned `ResourceIssue` rows (`AUR0151`, `AUR0152`, `AUR0759`, `AUR0760`, `AUR0761`),
  resource bindable/process-content/watch/controller watcher errors plus
  containerless shadow/slot conflicts are product-owned `ResourceIssue` rows,
  and `AppDiagnostics` aggregates configuration/DI/template/resource/route-recognizer
  rows while preserving the owning domain. Runtime-html `watch*`, `controller*`,
  `au*`, `invalid*`, renderer-dispatch, spread, portal, promise-result,
  switch/case, else, binding-behavior, value-converter, and view-factory
  diagnostics are now product-owned where semantic-runtime models the exact
  framework branch. The remaining unclaimed rows are deliberately tied to live
  activation/deactivation state, mutable DOM/controller caches, custom service
  replacement, platform host state, SSR manifest hydration, validation package
  DSL/runtime products, dialog/fetch-client package substrates, or other product
  surfaces that semantic-runtime has not admitted yet.

## Current Product Architecture Shape

`product.architecture` is the source-architecture lens for
`packages/semantic-runtime/src`.

- Structure lane: `areas`, `modules`, `dependencies`, `area-dependencies`,
  `declarations`, `cycles`, `classes`, and `function-duplicates`. This lane
  skips checker call-site and symbol-reference rows. Duplicate helper groups are
  direct lens rows backed by normalized body fingerprints and AST/control-flow
  body-shape fingerprints, so pressure scripts can read the maintenance signal
  without re-materializing every function row.
- Core lane: `functions`, `call-sites`, and `call-dependencies`. This lane pays
  for checker call-site rows and enriches function bodies with call pressure.
  These projections use compact call rows by default; `call-sites` accepts
  `includeCallDetails=true` when a caller needs checker type/signature displays.
  Without a `query` filter, those details are materialized only for the returned
  page. With `query`, Atlas does the honest whole-set exact scan so the query can
  match signatures and callee type strings. Function rows carry normalized
  `bodyFingerprint` and `bodyShapeFingerprint` values so duplicate-body and
  duplicate-shape pressure can be followed through direct function-row filters
  instead of by source browsing.
- Symbol lane: `symbol-references` and `symbol-dependencies`. This lane pays
  for checker-backed identifier references without needing call-site rows.
- Product record lane: `kernel-records` derives the KernelStoreRecord class set
  from the semantic-runtime `KernelStoreRecord` type alias, then reports exact
  `new`/object-literal construction sites with owner class/function, record
  discriminator, source range, and visible product/predicate/seam/evidence
  vocabulary expressions. The pressure script groups these rows by module and
  owner so high-volume emitters can be found before opening source. Use it
  before refactoring world construction, materialization passes, or product
  vocabulary flow.
- Product commit lane: `kernel-batches` reports `KernelStoreBatch` construction
  and direct `KernelStore.commit(...)` handoffs with records expression, label
  expression/literal, receiver, owner, and source range. The pressure script
  groups these by module/owner as the pass-boundary view. Use it to connect
  materializer pass boundaries to the record-construction lane.
- Product provenance lane: `field-provenance` reports source-level
  `FieldProvenance` construction sites with field-name and provenance-handle
  expressions. Use it to review whether provenance belongs on authored source
  surfaces, catalog-level framework products, or lower-level admission records
  before adding more field-level provenance by habit. The pressure script also
  prints a same-handle fan-out section; at the current checkpoint that section is
  clear by default. Treat a new fan-out row as likely false edit/rename precision
  unless the fields genuinely have distinct authored spans, symbols, or
  contribution provenance.
- Full lane: `summary` and explicit full profiles. This lane pays both checker
  call-site and symbol-reference costs. Summary uses compact call rows because
  it needs topology and pressure, not every callee type/signature string.

Latest local profile after page-scoped call-site detail materialization: structure was about 315ms analysis,
structure+kernel-records about 383ms, compact-call core about 752ms, whole-set exact-call core about 4.1s, symbol about
1.6s, compact-call full about 1.9s, and whole-set exact-call full about 4.7s after warmup. The expensive exact-call phase
is TypeScript callee type/signature display; keep it explicitly available for detail search, but ordinary exact
`call-sites` pages should reuse compact topology and enrich only the returned rows.

Source-file, source-range, symbol-with-file, semantic-runtime package, and
semantic-runtime repo-area loci now scope `product.architecture` rows like an
explicit `pathPrefix`, including exact participant-file filtering for
`area-dependencies`, so use loci directly when following continuations.
Class rows include `auLinkIds` plus `hasAuLink`/`auLinkId` filters. They also
include exact `auLinkCatalogIdsForName` plus `hasAuLinkCatalogNameMatch` /
`auLinkCatalogIdForName` filters for finding product classes whose names match
cataloged framework symbols without anchors. Use those before deciding whether
a zero-method `*Input` class is merely a request envelope or an intentionally
modeled framework/product concept.
Class rows also carry `surfaceRole` and `surfaceRoleReason` as a coarse
navigation classifier for product owners, publishers, work frames, data
carriers, service surfaces, epoch contexts, semantic models, and unknowns. Use
the role to prioritize source reading and memory seeding; do not treat it as an
architectural verdict.

## Mapping Policy

Atlas is the mapping and inquiry authority for this repo. Do not revive au-mcp
or snapshot/query CLI layers as parallel maps. Historical MCP notes are
packaging/integration pressure only.

Use [external-pressure-intake.md](external-pressure-intake.md) when external
external apps are used as pressure input. Keep raw observations in ignored
`.temp/` scratch, and promote only abstract, clean-room pressure into durable
docs or code. Manual source reads and targeted local inquiries against
external clean-room roots are allowed as transient testing surfaces; do not persist app
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
- Treat Atlas pressure and self checks as source-navigation aids rather than a
  lint scoreboard. Do not refactor code merely to make a row disappear; shallow
  wrappers, extracted constructor calls, and other metric-hiding moves need a
  real ownership or readability reason.
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
- `profile:self` times the major `atlas.self` projections through the daemon.
  Use it when line count or context cost suggests a split, cache, or phase-boundary
  decision; it is a cost lane, while `pressure:self` is a source-navigation lane.
  The default terminal output shows the highest exclusive-cost phase rows and a
  compact enum hotspot summary split by string/number value kind; use `profile:self:detail`, `--phaseRows=...`,
  `--enumRoleRows=...`, or `--skipEnumHotspots` when the tail or a narrower
  read matters.
  Parent phases now print exclusive and inclusive timings when they contain nested
  profiler rows, so treat `excl` as the root-cost signal and `total` as the
  containing-scope signal.
  The profile output now includes cold self-analysis phase timings; at the
  current checkpoint the expensive phase is the Atlas enum usage index, while
  hot filtered projections remain cheap after the summary read warms the analysis.
  The enum usage index also emits nested phase/checker-call timings through the
  shared `PhaseProfiler`; the first cleanup cut cold self-analysis by avoiding
  contextual type lookups for non-raw-value literal roles and caching root
  enum-name extraction for contextual types. The standard self-analysis path now
  treats call-argument raw enum contextual refinement as an opt-in lane: use
  `self -- --projection=enum-value-occurrences --role=call-argument ...` or
  `--enumContext=all` when that exact lane matters. Remaining standard pressure
  is mostly the enum usage pass plus comparison/object contextual type lookups.
  Use `pnpm --filter @aurelia-ls/atlas self -- --projection=...` when a specific
  `atlas.self` row family needs exact filters, paging, detail output, or JSON.
  Use `self -- --projection=phase-profile` when measured phase rows need to be
  queried by exact phase id, `minMilliseconds`, `minExclusiveMilliseconds`, or
  text query instead of read from terminal profile output.
- Relationship row factories with setup plus a final object/array/call return
  are recognized as direct factories, so `pressure:self` should highlight true
  branching axis mappers rather than coherent row materializers.
- Router flow rows use `flowRelation` for human flow verbs; reserve `relation`
  for framework/navigation relationship axes.
- Answer-level `SemanticClaim` axes are intentionally generic composition axes,
  not framework row enums. Type-position enum member references are counted by
  the enum substrate, so type-only contracts should no longer appear as
  unreferenced enum values. The composition contract now keeps claim axes,
  entity kinds, and source lenses as controlled vocabularies; add explicit
  extension values when a new answer family needs them rather than widening the
  actor/claim surface back to plain strings. `atlas.self` string and
  contract-string projections now accept `declarationKind=enum`,
  `declarationKind=const-object`, or `declarationKind=undeclared`; use the
  const-object pressure lane before assuming an as-const vocabulary is invisible
  or merely a magic string.
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
- In semantic-runtime, framework resolver effects and source resolver admissions
  now share a DI resolver-publication path. Framework registration effect tables
  live in `di/framework-registration-effects.ts`, and future capability-keyed
  framework effects should be added there rather than inlining more manifest
  data into `DiWorldConstructor`.
- Binding data-flow source writeability is direction-gated: one-way
  source-to-target flows should not project assignment/write policy. If large
  app binding-observation cost rises, inspect whether owner/member writeability
  checks are being requested without a target-to-source flow.
- App-world project construction now uses a construction frame with named phase
  methods; keep phase expansion there instead of rebuilding a monolithic
  `constructAndEmit` chain.
- Router identity/materialized-product/materialization-record emission is shared
  through `router/router-product-records.ts` for route instruction and route
  tree products. A repeated router product-record helper should be treated as a
  missed ownership primitive.
- Duplicate-helper pressure is deliberately more than a raw text/hash pass.
  `bodyShapeFingerprint` normalizes local parameter/variable bindings and folds
  conservative equivalent control flow such as ternary returns, `if`/early
  returns, expression branches, negated branch order, and temporary return
  aliases. Treat a repeated body-shape row as a stronger split-brain signal
  than an exact grep match, but still inspect semantics before refactoring.
- Several framework compiler/rendering/lifecycle/admission/materialization
  axis mappers have been converted into complete tables. If
  `pressure:self` advances to another obvious enum-to-relationship-axis switch,
  table it and verify the owning live lens; if it points into observation, read
  the framework semantics first because those classifiers are more contextual.
- `framework.errors` is now a source-backed Atlas lens over Aurelia
  `ErrorNames`/`Events` definitions, mapped messages, and usage sites. Use
  `pnpm --filter @aurelia-ls/atlas pressure:framework-errors` before deciding
  that a semantic-runtime template diagnostic is framework-grounded. Rows can
  be filtered by package, enum name, mechanism, effect, or query and followed
  into exact framework source.
- Observation runtime-effect lifecycle now claims runtime
  `stopping_a_stopped_effect` / `AUR0225` through `RuntimeEffect`; runtime
  `method_not_implemented` / `AUR0099` in AST evaluator mixins and connectable
  defaults is intentionally unclaimed until semantic-runtime admits
  user-extensible evaluator/connectable classes.
- Runtime `Scope` API nullish-argument diagnostics are configuration-owned
  source/API issues: direct `Scope.fromParent(...)`/`Scope.getContext(...)`
  calls spend `null_scope` / `AUR0203`, while direct `Scope.create(...)` calls
  spend `create_scope_with_null_context` / `AUR0204`. Rendered binding lookup
  should continue to consume non-null `BindingScope` products.
- Kernel `DefaultResolver.none` is now a modeled DI/container policy. Container
  lookup failure rows can carry `none_resolver_found` / `AUR0002`, and direct
  source calls to a statically visible `DI.createContainer({ defaultResolver:
  DefaultResolver.none })` receiver publish `DiIssue` diagnostics for
  constructable `get(...)` and auto-registering `getResolver(...)` calls.
- Kernel DI framework-error pressure now has exact claims for resolver
  `invalid_resolver_strategy` (`AUR0005`), singleton `cyclic_dependency`
  (`AUR0003`), recursive registry `unable_auto_register` (`AUR0006`), and fresh
  registry `null_resolver_from_register` (`AUR0011`). Fresh
  `newInstanceOf`/`newInstanceForScope` resolver keys wrapping a no-default
  Aurelia interface claim `invalid_new_instance_on_interface` (`AUR0017`) only
  when the receiver is a fresh stock container. `unable_resolve_key` (`AUR0008`)
  is intentionally unclaimed for the stock modeled container because the
  ordinary framework `Container.get(...)` branches return before that defensive
  trailing throw.
- Source API diagnostics for `EventAggregator.publish/subscribe` falsy
  channel/type inputs (`AUR0018`/`AUR0019`), `firstDefined(...)` with no
  defined argument (`AUR0020`), and `Metadata.define(...)` with no key live in
  the evaluation framework API issue pass, not DI. The kernel framework-error
  package now has no used unmodeled mapped-error codes; remaining rows are
  dormant or intentionally unclaimed.
- I18n `TranslationBinding` diagnostics are modeled after runtime rendering and
  scope construction, not inside generic binding flow: `t-params.bind` groups
  with the same target element's translation key binding to mirror
  `TranslationBinding.useParameter(...)`, and `AUR4000`/`AUR4001`/`AUR4002`
  surface through shared `RuntimeBindingIssue` template/app diagnostics.
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
  their source is reachable; remaining app-open seams should be grouped by product seam kind before reading external
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
- The follow-up no-role mirror cleanup added exact framework-role rows for many mirrored DI/compiler/router definition
  concepts. DI now grounds `ContainerConfiguration`, `ParameterizedRegistry`, and `IRegistry.register`; compiler
  contracts ground binding-command definitions/instances, command build info, attribute patterns, compiled patterns, and
  bindables-info interfaces; rendering grounds `BindableDefinition` plus the private AuCompose composition actors
  `CompositionContext`, `CompositionController`, and `ICompositionController`. A fresh `bridge.aulink` mirror read with
  `hasRoleEvidence: false` should currently be interpreted through the four known module-loader/validation rows above
  before assuming a semantic-runtime `auLink` target is merely floating.
- Product-architecture `call-sites includeCallDetails=true` is page-scoped when there is no detail `query`: Atlas builds
  compact topology rows and enriches only the returned page with TypeChecker callee type/signature strings. A detail
  `query` still performs the honest whole-set exact scan because those strings are part of the searchable surface.
- Semantic-runtime project-shape pressure scripts accept exact `SemanticProjectShapeKind` values, not shorthand aliases:
  use `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, and `non-aurelia`.
- Source-backed open seams should use `kernel/source-open-seam.ts` when the materializer has a source-file address plus
  exact span. Evaluation, resource recognition, and registration now share that path instead of minting parallel
  span/evidence/provenance/open-seam bundles.
- `SelectValueObserver` multiple-mode closure is deliberately framework-shaped: static `multiple` attributes, literal
  `multiple.bind`, and single boolean-literal TypeChecker projections close as static modes. Ordinary boolean-valued
  `multiple.bind` becomes a `select-dynamic-option-value` channel when the value source can carry both scalar and array
  runtime branches; it remains an open value-channel seam only when the source type cannot plausibly support both
  branches.
- Proxy observation and template `astEvaluate` belong to one connectable observation circuit. Ordinary accessor getters
  do not require `@computed`; `ObserverLocator` reaches `ComputedObserver` through function-key requests and configurable
  accessor descriptors, while `@computed` adds declaration metadata, explicit deps, or trackable method markers. Future
  authoring/fixture work should keep direct `state.member` template binding, object binding, and ID-first boundaries as
  contextual modeling choices rather than adding one-hop view-model forwarding getters to make observation visible.
