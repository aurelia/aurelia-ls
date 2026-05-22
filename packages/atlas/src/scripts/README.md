# scripts

`scripts` contains package-local maintenance entrypoints.

These scripts should check static coherence rather than trying to prove runtime usefulness. The package is intentionally contract-first, so the early checks should verify things like lens-to-substrate references, required vocabulary shape, active terrain, and answer algebra invariants.
Shared CLI output and argument helpers live in [script-output.ts](script-output.ts). Reuse `scriptArgumentValue`,
`scriptArgumentValues`, `scriptNumberArgumentValue`, `scriptOptionalStringFilter`, `scriptOptionalBooleanFilter`,
`scriptFilterSummary`, and source/row formatting helpers before adding local script parsing or object-spread filter
helpers.

## Current Scripts

- [orient.ts](orient.ts) prints a compact top-level Atlas orientation through the auto-starting session API. Pass
  `--json` through `orient:json` when a tool needs the full request-shaped bundle.
- [atlas-memory.ts](atlas-memory.ts) prints the `atlas.memory` lens: durable JSON memory records joined to live
  source/product-architecture/atlas.self checks, computed status, reuse guidance, and untracked live pressure. Use
  `--projection=guidance`, `--projection=frontiers`, `--projection=next`, `--projection=stale`, `--query=...`,
  `--path=...`, `--domain=...`, `--kind=...`, `--status=...`, `--recordId=...`, `--name=...`, `--surfaceRole=...`,
  `--liveCheckKind=...`, `--anchorKind=...`, `--anchorLensId=...`, `--symbolName=...`, `--rows=...`, `--detail`, and
  `--json` when a compact memory summary is not enough or another tool needs the exact answer payload. Detail output
  caps anchors, live checks, and guidance for readability; use `--anchorRows=...`, `--liveCheckRows=...`,
  `--guidanceRows=...`, `--all-anchors`, `--all-live-checks`, or `--all-guidance` only when the current question needs
  the complete human-readable expansion. The script accepts both `--name=value` and `--name value` as exact record-id
  filters and defaults those reads to `--projection=records`; `--limit` is a `--rows` alias, repeated `--domain` filters
  narrow by all listed domains unless `--domainMode=any` is supplied, and unsupported flags fail fast.
  If a multi-domain query returns no rows, the script prints that widening hint explicitly; keep the default strict mode
  for exact intersections and use `--domainMode=any` for nearby-route-family exploration. `surfaceRole`
  narrows untracked product-class pressure by the product-architecture role classifier. `memory:next` prints the
  checkpoint-friendly ranked next-action lane computed from live memory state rather than stored as a static task list,
  including shard path/line for record-backed next actions. When a filtered `memory:next` read has no computed queue
  rows, Atlas falls back to matching memory records and returns them as consult rows; this lets exact domain, path,
  query, symbol, auLink, or record-id checkpoint reads land on durable guidance without turning those records into
  global next-work. Source/file/auLink existence checks report `present`; they
  keep records grounded without making a pressure frontier live unless paired with a pressure-shaped live check.
- [atlas-memory-write.ts](atlas-memory-write.ts) is the structured write-side helper for durable memory storage. Use
  `memory:write -- --mode=list-shards` to inspect shard targets, `memory:write -- --template ...` to print a record
  draft, `memory:write -- --record=.temp/record.json --shard=atlas --dry-run` to review an upsert, and
  `memory:write -- --mode=remove --id=... --dry-run` to remove stale records intentionally. It preserves `createdAt`,
  refreshes `updatedAt`, and removes duplicate ids from other shards during upsert.
- [atlas-self.ts](atlas-self.ts) is the direct human CLI for `atlas.self` projections. Use
  `self -- --projection=classes`, `self -- --projection=functions`, `self -- --projection=enum-value-occurrences`,
  `self -- --projection=phase-profile`, or another declared self projection when `pressure:self` or `profile:self`
  points at a lane that needs exact row filters. It accepts `--query=...`, exact projection filters such as
  `--className=...`, `--functionName=...`, `--enumName=...`, `--role=...`, `--valueKind=...`, `--contextualOnly=true`,
  `--enumContext=all`, `--enumContext=none`, `--includeSemanticTaxonomyAnalysis=true`, `--includeFunctionBodyAnalysis=true`,
  `--minExclusiveMilliseconds=...`, `--orderBy=...`, `--rows=...` / `--limit=...`, `--detail`, and `--json`. Prefer this
  wrapper over throwaway inquiry scripts when the needed substrate is already exposed by `atlas.self`. Source-surface
  projections skip enum/string taxonomy unless a taxonomy projection or the semantic-taxonomy flag asks for it. Function
  body fingerprints and switch topology are a separate explicit body-analysis lane; use the boolean flag or the
  shape/control-flow projections when those facts are the question.
- [atlas-work-router.ts](atlas-work-router.ts) prints the `atlas.work-router` lens: typed work routes joined to live
  source anchors, Atlas memory, framework corpus fixture seeds, expected-effect descriptors, scripts, docs, and
  cautions. Prefer exact `--routeId=...` / `--route=...`, `--domain=...`, `--role=...`, `--lensId=...`, `--path=...`, `--symbolName=...`,
  `--auLinkId=...`, `--concept=...`, `--effectKind=...`, `--recipeKey=...`, or `--seedUse=...` before `--query=...`;
  weak text matches are intentionally visible route-substrate pressure. Domain filters are structural over route
  domains and route-owned memory anchor domains. Query matching stays structural: distinctive multi-token route terms,
  source symbols, anchors, and canary phrases may be contained inside larger checkpoint prose, while single-token
  fragments are not enough by themselves. Add exact route terms when a composite canary matters instead of relying on
  broad prose.
  Generic lens anchors are navigation hints, not memory ownership evidence. A route lens anchor only joins memory through
  lens evidence when it carries structural filters that match the memory lens anchor; otherwise source/path/domain/auLink
  anchors should own the route.
  Route-owned corpus anchors may carry their own `query` when concept/effect filters are structurally correct but too
  broad, so the route plan starts from the examples that express the route's actual pressure. They may also carry
  `classificationKind`, `classificationKey`, `expectedEffectFilterField`, and `expectedEffectFilterValue` filters; the
  route-plan seed selection diversifies across the more specific anchors first so one broad concept lane does not hide
  exact fixture canaries such as checked bindings or select option models.
  Use `--projection=next --detail` or `--projection=route-plan --detail` after route selection to print authority lanes, memory-next summaries,
  query-canary counts, cautions, and several next questions. With no explicit filters, route-plan ranks routes from
  live `memory:next` pressure and live product/source pressure through exact route memory/source/path/auLink overlap
  before falling back to catalog orientation. Product pressure is source-anchor structural evidence, not prose search:
  large modules, large class surfaces, and large function bodies can promote the route that owns their source anchors.
  Source-anchor roles weight that evidence, so a large supporting catalog stays route context while a primary or
  pressure anchor can drive the route plan.
  `--rows` controls the answer row budget; compact CLI output may display a smaller section slice, and section headers
  say when they are showing only part of the returned rows.
  Use `--projection=next-questions` when the immediate need
  is only autonomous continuation prompts from the selected route plan. Use `--projection=workset` when a checkpoint needs the
  current git worktree grouped by route-owned source/doc/path anchors, route-owned memory source/doc/fixture/live-check
  anchors, and memory shards. Workset rows are reported as `workset-structural` route matches so a checkpoint can tell
  actual dirty-file evidence apart from catalog orientation. Workset detail output prints changed-file samples without
  route-plan expansion by default; pass `--fileRows=...` to widen each route's sample or `--includePlans` when the
  route authority/corpus/memory plan is worth the extra context.
  Route path anchors are for workset grouping and explicit path filters; they do not by themselves route durable memory
  records or memory-next actions.
  Use `--projection=memory-coverage --detail` when `memory:next` seems ahead of the route catalog; it joins live
  memory next actions back to structural routes and exposes unrouted frontiers as route ontology pressure. Shared
  generic lens anchors are deliberately not enough to route memory pressure; add source, exact memory-domain, auLink,
  script, doc, or route vocabulary when a route should own the action. Route memory-domain anchors need either an exact
  domain-set match or at least two route-specific domain overlaps; generic carriers such as `semantic-runtime`,
  `template`, `memory`, and `inquiry` are not enough by themselves.
  Structural query matching can cover a query across several declared route vocabulary values for the same route; weak
  prose still has to match as prose and cannot borrow this set-coverage path.
- [self-check.ts](self-check.ts) validates the current inquiry surface map through the auto-starting session API and
  checks a few compact answer invariants, including workspace/router/plugin mechanism compactness, router flow
  self-audit health, spendable framework bundle/catalog visibility, and the presence of
  router-to-rendering/lifecycle/materialization semantic routes.
- [product-architecture-profile.ts](product-architecture-profile.ts) profiles the structure, body+structure, core,
  symbol, and full `product.architecture` analysis phase costs through the same session API after explicit daemon warmup, so
  startup/status cost is visible separately from warm inquiry cost. The default output is compact: use
  `--laneRows=...` to narrow lanes, `--phaseRows=...` or `--rows=...` to widen or narrow phase rows, and
  `profile:product-architecture:detail` when the long tail is the question. Cheap structure/function reads skip
  function-body fingerprints and switch topology unless duplicate/control-flow projections or
  `--includeFunctionBodyAnalysis=true` ask for that body-analysis lane.
- [product-architecture.ts](product-architecture.ts) is the targeted human CLI for `product.architecture` rows when a
  route plan names a lens anchor. Use `product:architecture -- --projection=functions --className=... --orderBy=lineCount
  --detail` for method-level breakdowns; function detail rows include bounded callee symbol/expression samples so large
  coordinator methods can be understood before paging raw call sites. Use `--minDistinctCalleeCount=...` when the
  immediate question is dependency fan-out. Use `--projection=classes` / `--projection=modules` with `--pathPrefix`,
  `--surfaceRole`, `--area`, `--minLineCount`, `--functionName`, and related structural filters when the pressure script
  is too broad. The `summary` projection prints the main row families together and honors `--rows` for each budgeted
  family; row-producing projections print their own row family rather than falling back to classes. `call-sites`
  supports exact `--calleeName`, `--callKind`, `--fromFilePath`, `--toFilePath`, `--targetPackageId`, `--local`,
  `--crossesArea`, and `--includeCallDetails=true` filters when a route needs concrete call edges. The
  `function-duplicates` projection also supports `--pathPrefix` and prints its duplicate groups directly, including
  grouped files and samples in `--detail` mode. `source-templates` and `source-template-duplicates` expose
  sourceText(...) authoring/source-plan templates by static fingerprint, carrier name, source anchor, line/character
  counts, and placeholder names without printing generated source text. Use those projections before adding or widening
  recipes so repeated generated artifacts become visible as recipe-maintenance pressure. Use `--query=...` as an
  additional row-text filter, not as a replacement for exact class, path, role, call-site, or area filters.
- [product-architecture-pressure.ts](product-architecture-pressure.ts) prints compact current semantic-runtime
  large-module, cross-area import, large-class, zero-method `*Input` envelope, behavioral `*Input` suffix, and
  function-call pressure rows with request timing and source line anchors from `product.architecture`. It also prints
  duplicate top-level helper-name pressure from the `function-duplicates` projection so small repeated helpers can be
  treated as possible split-brain before manual grep without paging every function row into the script. The duplicate
  lane uses an AST body-shape fingerprint that normalizes local bindings and folds simple equivalent control flow such
  as ternaries, `if`/early-return pairs, expression branches, temporary return aliases, and stable
  default-local-then-override returns. The pressure script also prints repeated static sourceText(...) template groups
  so source-plan copy/paste can be addressed from source anchors rather than by manual grep. Product-record pressure
  groups KernelStoreRecord construction sites, KernelStoreBatch commit sites, FieldProvenance construction sites, and
  same-handle field-provenance fan-out by record kind, product vocabulary expression, field name, module, and owner so
  kernel/provenance flow can be inspected before opening source.
  Use `pnpm --filter @aurelia-ls/atlas pressure:product-architecture:detail` when the compact rows hide a needed metric
  or lower-ranked row.
- [framework-resources-pressure.ts](framework-resources-pressure.ts) prints resource convergence rollups from
  `framework.resources`, including carrier-kind/source-role counts, exact source-site role counts, and
  definition-vs-declaration provenance counts. Use it when resource convergence needs provenance pressure before
  following individual rows into admission, compiler, rendering, or materialization.
- [framework-errors-pressure.ts](framework-errors-pressure.ts) prints the framework `ErrorNames`/`Events` code topology
  from `framework.errors`: package/code/message counts, usage mechanisms, throw/warning effects, code-range buckets,
  code-name prefix families, raw Error syntax, symbol-resolved mapped-error wrapper calls, symbol-resolved raw Error factory calls,
  mapped-error-factory implementation rows, raw authority gaps, intentionally unclaimed raw authority rows, hard-coded raw AUR labels, duplicate AUR-label counts
  across packages, diagnostic frontiers that join code families to semantic-runtime exact AUR-link coverage,
  code-level diagnostic intake dispositions for modeled/unmodeled/dormant framework authority,
  semantic-runtime AUR-label links back to exact framework package/enum/code members, semantic-runtime raw Error
  links back to exact public framework usage rows, and a query
  canary for binding-related code rows. Use it before promoting semantic-runtime diagnostics from authoring guidance
  into framework-grounded errors.
- [framework-errors.ts](framework-errors.ts) prints the queryable `framework.errors` lens for targeted diagnostic
  grounding. Use `--projection=codes`, `--projection=usages`, `--projection=families`,
  `--projection=diagnostic-frontiers`, `--projection=diagnostic-codes`, `--projection=semantic-references`, or
  `--projection=semantic-raw-references` with `--packageId=template-compiler`,
  `--codeNamePrefix=compiler`, `--disposition=unmodeled-used-framework-authority`,
  `--gap=actionable-uncovered`, `--gap=future-substrate`, `--gap=runtime-product-boundary`,
  `--gap=dormant-framework-authority`, `--gap=raw-error-authority-gap`,
  `--gap=intentionally-unclaimed-raw-authority`, `--query=binding`, `--rows=...`, `--detail`, and
  `--json` when the pressure summary is too broad. The diagnostic gap filters are row-level filters on the
  `diagnostic-frontiers` and `diagnostic-codes` projections; the raw/code/message gap filters apply to the source rows.
- [framework-resources.ts](framework-resources.ts) prints the queryable `framework.resources` lens for targeted
  resource convergence grounding. Use `--projection=convergence` or `--projection=definitions` with
  `--resourceKind=custom-element`, `--resourceKind=custom-attribute`, `--lane=runtime-materialization`,
  `--bundleExportName=StandardConfiguration`, `--targetName=...`, `--resourceName=...`, `--producerKind=...`,
  `--productKind=...`, `--instantiationKind=...`, `--materializationSiteKind=...`, `--query=...`, `--rows=...`,
  `--detail`, and `--json` when resource convergence needs exact definition, backing declaration, bundle admission,
  syntax product, or materialization-site source rows instead of the broad pressure rollup.
- [framework-corpus-pressure.ts](framework-corpus-pressure.ts) prints compact public Aurelia docs/test corpus counts and
  old-package replacement inventory. Use it as Atlas-local pressure before treating docs as authoring pattern seeds,
  choosing test clusters for behavior grounding, or mapping legacy package surfaces onto semantic-runtime APIs. It also
  prints the semantic-runtime expected-effect contract rows that fixture seed hints are joined against. It is
  intentionally not an MCP surface.
- [framework-corpus.ts](framework-corpus.ts) prints the queryable `framework.corpus` lens for targeted fixture and
  authoring navigation. Use `--projection=docs`, `--projection=doc-snippets`, `--projection=tests`,
  `--projection=test-snippets`, `--projection=expected-effects`, `--projection=fixture-seeds`, or
  `--projection=legacy` with `--query=...`, `--queryMode=partial`, `--concept=forms`, `--group=router`, `--path=...`, `--language=html`,
  `--snippetKind=it-call`, `--generated=false`, `--seedUse=authoring-taste`,
  `--effectKind=binding-data-flow`,
  `--expectedEffectFilterField=targetProperty`, `--expectedEffectFilterValue=value`,
  `--expectedEffectFilterField=channelKind`, `--expectedEffectFilterValue=style-property-value`,
  `--classificationKind=surface`, `--classificationKey=native-value-binding`,
  `--classificationKey=surface:au-compose`, `--classificationKey=surface:au-compose-flush-mode`,
  `--classificationKey=surface:au-compose-object-component`, `--classificationKey=surface:searchable-data-table`,
  `--recipeKey=searchable-data-table`, `--recipeKey=routed-searchable-data-table`, `--recipeKey=composed-dashboard`,
  `--rows=...`, `--detail`, and `--json` when the pressure summary is too broad.
  For `fixture-seeds`, prefer `effectKind` and `recipeKey` for structural narrowing and `query` for source/content
  concepts. Composite `recipeKey` filters intentionally match the direct recipe lane plus declared ingredient seed lanes
  such as routed recipe plus feature-surface recipe, because public docs/tests often ground those semantics in separate
  snippets. Use the default all-token `query` mode for exact-ish narrowing; use `--queryMode=partial` only for
  exploratory multi-term sweeps where adjacent corpus examples are more useful than a zero-row answer. Use
  `seedUse=authoring-taste` or `seedUse=behavior-grounding` when choosing whether docs/tests are being
  used for taste pressure or framework behavior pressure; framework testing and error-message docs are
  behavior-grounding even though they are documentation snippets. `authoring-taste` expected effects themselves are
  orientation contracts and should not be expected to have direct corpus seeds. Use expected-effect field/value filters when the seed must prove a
  concrete fact such as a validate trigger argument, a specific binding target property, or a class/style value-channel
  kind. AuCompose fixture seeds carry `runtime-composition` effect hints, `composed-dashboard` recipe hints, and
  narrow surface keys for component/model/template inputs, scope/flush/tag literals, composition/composing outputs, and
  object-shaped component values.
  Searchable data-table and catalog storefront fixture seeds are keyed by explicit local syntax surfaces such as table/list
  management controls, search/filter/sort/pagination/selection vocabulary, product/catalog/cart/checkout vocabulary, and
  the matching structured recipe keys; use those recipe and surface filters before falling back to broad text queries.
  Router fixture seeds require
  concrete router authoring/runtime syntax such as `@aurelia/router`, `@route`, route config objects, or `au-viewport`;
  broad route/router prose remains corpus navigation pressure only. Use classification filters for exact reason lanes
  such as `surface:native-value-binding`, `surface:native-select-binding`, `surface:native-checked-binding`, `surface:option-model-binding`, and
  `surface:validation-binding-behavior`; surface reasons are local to docs fences and test `createFixture(...)` calls,
  while parent `describe`/`it` ranges remain carrier pressure. In
  `--detail` mode, fixture seeds print typed classification reasons so a row explains which concept, surface, effect,
  recipe, or contrastive pressure admitted it. Interpolation and bare `else` classification is context-aware, so
  TypeScript template strings and JavaScript control flow do not masquerade as Aurelia template pressure.
  `--concept=expression` is the TypeChecker-expression lane for interpolation, expression-bearing binding commands,
  parser/evaluator terms, value converters, binding behaviors, and AST expression examples; `--concept=template`
  normalizes to the stored `templates` concept, and `--concept=state-store` normalizes to the stored `state`
  concept for @aurelia/state store pressure.
- [framework-observation-pressure.ts](framework-observation-pressure.ts) prints framework observation topology from
  `framework.observation`: observer entities, binding observer lookup and setup rows, observation flow sites,
  flow-to-entity links, and relationship axis distributions. Use it before changing semantic-runtime observer,
  accessor, binding value-channel, dirty-check, watcher, effect, or collection-observer semantics so the work starts
  from Aurelia's actual observation subsystem rather than local product guesses.
- [framework-observation.ts](framework-observation.ts) is the targeted human CLI for `framework.observation` rows. Use
  `framework:observation -- --projection=observer-locator-decisions --detail` before changing getter/accessor
  selection semantics, `--projection=surface-methods --surfaceKind=proxy-observable --detail` before changing
  ProxyObservable-adjacent behavior, `--projection=flow-sites --surfaceKind=ast-evaluator --detail` before changing
  direct expression-read dependency semantics, `--projection=flow-sites --surfaceKind=computed-observer --detail`
  before changing auto getter/body dependency collection, or
  `--projection=flow-sites --surfaceKind=controlled-computed-observer --detail` before changing explicit dependency
  metadata semantics. `--projection=surface-methods --surfaceKind=attribute-ns-accessor --detail` exposes the
  runtime-html namespace attribute accessor surface that sits beside the generic data/SVG attribute accessor. Use
  `--projection=flow-sites` with `--siteKind=...` when observation flow needs a narrower
  source-backed read than the pressure rollup. Use `--projection=dependency-circuit --detail` to see the compact roles
  that stitch astEvaluate, connectable boundaries, ProxyObservable identity/escape paths, computed-observer dependency
  lookup, watcher/effect dependencies, and observer-location sites into one derived observation circuit. Use
  `--projection=collection-methods --detail` before changing collection-read modeling so the astEvaluate
  `autoObserveArrayMethods` list and ProxyObservable array/map/set wrappers are compared in one source-backed table.
- [framework-router-pressure.ts](framework-router-pressure.ts) prints the framework router rollup, curated route-flow
  spine health, relationship axis distributions, and flow self-audit rows from `framework.router`.
- [framework-router.ts](framework-router.ts) prints the queryable `framework.router` lens for targeted router,
  route-recognizer, viewport-agent, and relationship grounding. Use `--projection=surfaces`, `--projection=flow`,
  `--projection=recognizer`, `--projection=relationships`, `--query=ViewportAgent`, `--stage=route-tree-compilation`,
  `--product=endpoint`, `--rows=...`, `--detail`, and `--json` when the pressure summary is too broad.
- [framework-evaluator.ts](framework-evaluator.ts) prints the queryable `framework.evaluator` lens for targeted static
  evaluator effects, open seams, and module-value summaries. Use `--projection=effects`,
  `--projection=open-seams`, `--projection=value`, `--path=...`, `--packageId=...`, `--query=...`,
  `--memberName=register`, `--calleeName=...`, `--receiverName=...`, `--rows=...`, `--detail`, and `--json`
  before expanding semantic-runtime evaluator/world-construction support. `effects` prints a pointer when open seams are
  present; `open-seams` prints full seam-kind rollups and paged seam rows without also dumping effect rows. Prefer
  `--memberName=...` when checking one method's closure, because `--calleeName=...` filters returned effects but leaves
  root-level open seams scoped to the selected source roots.
- [bridge-aulink.ts](bridge-aulink.ts) prints the queryable `bridge.aulink` lens for targeted product-to-framework
  bridge grounding. Use `--projection=mirror`, `--projection=role-evidence`, `--projection=obligations`,
  `--projection=usage-comparison`, `--projection=member-surface`, `--projection=usage-sites`, `--packageId=router`,
  `--sourceLens=framework.router`, `--linkId=router:ViewportAgent`, `--query=ViewportAgent`, `--rows=...`, `--detail`,
  and `--json` when the broad bridge pressure summary is too expensive or too general.
- [bridge-aulink-pressure.ts](bridge-aulink-pressure.ts) prints auLink catalog/placement coverage, mirror role-evidence
  gaps, mirror rows with role evidence but no emulation obligations, and usage divergence rollups. Use it after
  product or LSP pressure flattens out to decide whether the next work is missing product links, missing framework
  topology, or missing obligation classification. The script prints per-projection timings because usage comparison and
  mirror filters can be much heavier than catalog gap checks.
- [plugin-architecture-pressure.ts](plugin-architecture-pressure.ts) prints public plugin package topology and
  source-surface mechanism rollups from the filter-aware `plugin.architecture` summary projection, including
  bindable carrier mechanisms. It intentionally reads aggregate rollup maps instead of paging every plugin surface.
- [workspace-architecture-pressure.ts](workspace-architecture-pressure.ts) prints clean-room aggregate workspace topology
  and Aurelia surface pressure from `workspace.architecture`, including manifest dependency, resource, configuration,
  registration, DI resolution, bindable, router, and template mechanism rollups plus external/app-shaped aggregate
  sub-rollups. It also prints bindable and router subsets plus route-config mechanism and facet subsets: carrier
  shape, route-object field sets, component value-kind buckets, and child-route cardinality buckets. Those keep
  resource metadata and route-tree shape pressure visible without paging row payloads. It intentionally omits row
  names, source paths, source ranges, and summaries so external-root runs can remain directional rather than
  extractive.
- [workspace-architecture-profile.ts](workspace-architecture-profile.ts) prints workspace architecture phase timings,
  especially useful when external roots make package/source scanning feel expensive. It warms the daemon before
  measuring, separates measured analysis time from warm request overhead, calls out hot daemon reads that reuse a
  cached analysis profile, and reports the source-scan phase in scanned-file units rather than cumulative surface rows.
- [atlas-self-pressure.ts](atlas-self-pressure.ts) prints compact source-file shape/size/coupling, class density,
  function density, large top-level variable initializer pressure, duplicate top-level helper-name pressure, repeated function body-shape pressure, shallow
  constructor/call wrapper pressure, optional object-spread construction pressure, magic/contract string pressure,
  const-object contract vocabulary pressure, and high multi-axis pressure rows plus request timing and source line anchors
  from `atlas.self` so Atlas refactors can start from source-backed pressure rather than raw file browsing. Its helper
  lanes use the same AST body-shape fingerprint as product pressure, including a projection that catches helpers with
  different names but equivalent canonical control flow; the compact script filters out very small grouped declarations
  so coincidental key-builder shapes do not crowd out mergeable helpers. Duplicate helper-name pressure explicitly
  opts into `atlas.self` function body analysis so exact body/body-shape counts stay available without taxing ordinary
  function rows. The wrapper lane shows helpers that directly
  return a constructor or simple call and includes local direct-call, value-reference, and total-usage counts; use it to inspect whether a
  wrapper has real lifetime/ownership, not as a cleanup score to game. The object-spread lane catches `...(cond ? {} : { prop })` style
  construction, including isolated low-pressure envelopes, so those rows can be simplified intentionally instead of found by grep. The string lanes surface
  values with non-import/non-enum reuse plus contract-bearing schema/lens/continuation values, and the const-object lane uses `declarationKind=const-object` before paging so answer-level vocabularies are not hidden by compact row limits. Use
  `pnpm --filter @aurelia-ls/atlas pressure:self:detail` when the compact rows hide a needed metric.
- [atlas-self-profile.ts](atlas-self-profile.ts) times the major `atlas.self` projections through the daemon with
  representative filters and prints the cold self-analysis phase profile from the summary read. Use
  `pnpm --filter @aurelia-ls/atlas profile:self` before splitting Atlas core analysis files so the decision starts
  from measured build phases and hot request cost, not only line count. The default profile output prints the highest
  exclusive-cost phase rows plus compact enum hotspot summaries; use
  `pnpm --filter @aurelia-ls/atlas profile:self:detail`, `--phaseRows=...`, `--enumRoleRows=...`,
  `--enumHotspotRows=...`, `--laneRows=...`, `--enumContext=none`, or `--skipEnumHotspots` when the current question
  needs a wider tail, a checker-context-free enum baseline, or a narrower terminal read.
  Parent phases print `excl / total` when they contain nested profiler measurements, so broad walkers do not hide the
  concrete child phase that actually costs.
- [framework-emulation-symbols-report.ts](framework-emulation-symbols-report.ts) writes the deterministic framework
  emulation Markdown golden by calling the named session report endpoint. The report currently uses
  `StandardConfiguration` as a broad canary, not as the only configuration shape Atlas can reason about.
- [inquiry-playground.ts](inquiry-playground.ts) runs the auto-starting session API and prints compact answer summaries.
- [inquiry-session-ensure.ts](inquiry-session-ensure.ts) starts or reuses the local inquiry daemon and leaves it available until its idle timeout.
- [inquiry-session-playground.ts](inquiry-session-playground.ts) exercises idempotent daemon startup, protocol calls, self-check, continuation following, and polite shutdown.
- [inquiry-session-shutdown.ts](inquiry-session-shutdown.ts) stops an existing local inquiry daemon without starting a new one.
- [script-output.ts](script-output.ts) owns shared pressure-script formatting helpers such as answer assertions, value
  extraction, sorted count maps, empty row markers, source labels, count labels, self-pressure duplicate function-name
  grouping, and row counting. Keep lane selection in the individual scripts, and put only repeated terminal output
  mechanics here.

## Dependency Rule

Scripts may depend on [../inquiry](../inquiry/README.md) and [../session](../session/README.md). They should avoid becoming hidden production code paths.
