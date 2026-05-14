# scripts

`scripts` contains package-local maintenance entrypoints.

These scripts should check static coherence rather than trying to prove runtime usefulness. The package is intentionally contract-first, so the early checks should verify things like lens-to-substrate references, required vocabulary shape, active terrain, and answer algebra invariants.

## Current Scripts

- [orient.ts](orient.ts) prints a compact top-level Atlas orientation through the auto-starting session API. Pass
  `--json` through `orient:json` when a tool needs the full request-shaped bundle.
- [atlas-memory.ts](atlas-memory.ts) prints the `atlas.memory` lens: durable JSON memory records joined to live
  source/product-architecture/atlas.self checks, computed status, reuse guidance, and untracked live pressure. Use
  `--projection=guidance`, `--projection=frontiers`, `--projection=next`, `--projection=stale`, `--query=...`,
  `--path=...`, `--domain=...`, `--kind=...`, `--status=...`, `--recordId=...`, `--surfaceRole=...`,
  `--liveCheckKind=...`, `--anchorKind=...`, `--anchorLensId=...`, `--symbolName=...`, `--rows=...`, `--detail`, and
  `--json` when a compact memory summary is not enough or another tool needs the exact answer payload. Detail output
  caps anchors, live checks, and guidance for readability; use `--anchorRows=...`, `--liveCheckRows=...`,
  `--guidanceRows=...`, `--all-anchors`, `--all-live-checks`, or `--all-guidance` only when the current question needs
  the complete human-readable expansion. The script accepts both `--name=value` and `--name value`; `--limit` is a
  `--rows` alias, and repeated `--domain` filters narrow by all listed domains unless `--domainMode=any` is supplied.
  `surfaceRole`
  narrows untracked product-class pressure by the product-architecture role classifier. `memory:next` prints the
  checkpoint-friendly ranked next-action lane computed from live memory state rather than stored as a static task list,
  including shard path/line for record-backed next actions.
- [atlas-memory-write.ts](atlas-memory-write.ts) is the structured write-side helper for durable memory storage. Use
  `memory:write -- --mode=list-shards` to inspect shard targets, `memory:write -- --template ...` to print a record
  draft, `memory:write -- --record=.temp/record.json --shard=atlas --dry-run` to review an upsert, and
  `memory:write -- --mode=remove --id=... --dry-run` to remove stale records intentionally. It preserves `createdAt`,
  refreshes `updatedAt`, and removes duplicate ids from other shards during upsert.
- [self-check.ts](self-check.ts) validates the current inquiry surface map through the auto-starting session API and
  checks a few compact answer invariants, including workspace/router/plugin mechanism compactness, router flow
  self-audit health, spendable framework bundle/catalog visibility, and the presence of
  router-to-rendering/lifecycle/materialization semantic routes.
- [product-architecture-profile.ts](product-architecture-profile.ts) profiles the structure, core, symbol, and full
  `product.architecture` analysis phase costs through the same session API after explicit daemon warmup, so
  startup/status cost is visible separately from warm inquiry cost.
- [product-architecture-pressure.ts](product-architecture-pressure.ts) prints compact current semantic-runtime
  large-module, cross-area import, large-class, zero-method `*Input` envelope, behavioral `*Input` suffix, and
  function-call pressure rows with request timing and source line anchors from `product.architecture`. It also prints
  duplicate top-level helper-name pressure from the `function-duplicates` projection so small repeated helpers can be
  treated as possible split-brain before manual grep without paging every function row into the script. The duplicate
  lane uses an AST body-shape fingerprint that normalizes local bindings and folds simple equivalent control flow such
  as ternaries, `if`/early-return pairs, expression branches, temporary return aliases, and stable
  default-local-then-override returns. Product-record pressure
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
  `--gap=raw-error-authority-gap`, `--gap=intentionally-unclaimed-raw-authority`, `--query=binding`, `--rows=...`, `--detail`, and
  `--json` when the pressure summary is too broad.
- [framework-corpus-pressure.ts](framework-corpus-pressure.ts) prints compact public Aurelia docs/test corpus counts and
  old-package replacement inventory. Use it as Atlas-local pressure before treating docs as authoring pattern seeds,
  choosing test clusters for behavior grounding, or mapping legacy package surfaces onto semantic-runtime APIs. It also
  prints the semantic-runtime expected-effect contract rows that fixture seed hints are joined against. It is
  intentionally not an MCP surface.
- [framework-corpus.ts](framework-corpus.ts) prints the queryable `framework.corpus` lens for targeted fixture and
  authoring navigation. Use `--projection=docs`, `--projection=doc-snippets`, `--projection=tests`,
  `--projection=test-snippets`, `--projection=expected-effects`, `--projection=fixture-seeds`, or
  `--projection=legacy` with `--query=...`, `--concept=forms`, `--group=router`, `--path=...`, `--language=html`,
  `--snippetKind=it-call`, `--generated=false`, `--seedUse=authoring-taste`,
  `--effectKind=binding-data-flow`,
  `--expectedEffectFilterField=targetProperty`, `--expectedEffectFilterValue=value`,
  `--recipeKey=service-backed-form`, `--rows=...`, `--detail`, and `--json` when the pressure summary is too broad.
  For `fixture-seeds`, prefer `effectKind` and `recipeKey` for structural narrowing and `query` for source/content
  concepts. Use `seedUse=authoring-taste` or `seedUse=behavior-grounding` when choosing whether docs/tests are being
  used for taste pressure or framework behavior pressure; `authoring-taste` expected effects themselves are orientation
  contracts and should not be expected to have direct corpus seeds. Use expected-effect field/value filters when the
  seed must prove a concrete fact such as a validate trigger argument or a specific binding target property.
- [framework-observation-pressure.ts](framework-observation-pressure.ts) prints framework observation topology from
  `framework.observation`: observer entities, binding observer lookup and setup rows, observation flow sites,
  flow-to-entity links, and relationship axis distributions. Use it before changing semantic-runtime observer,
  accessor, binding value-channel, dirty-check, watcher, effect, or collection-observer semantics so the work starts
  from Aurelia's actual observation subsystem rather than local product guesses.
- [framework-router-pressure.ts](framework-router-pressure.ts) prints the framework router rollup, curated route-flow
  spine health, relationship axis distributions, and flow self-audit rows from `framework.router`.
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
  function density, duplicate top-level helper-name pressure, repeated function body-shape pressure, shallow
  constructor/call wrapper pressure, optional object-spread construction pressure, magic/contract string pressure,
  const-object contract vocabulary pressure, and high multi-axis pressure rows plus request timing and source line anchors
  from `atlas.self` so Atlas refactors can start from source-backed pressure rather than raw file browsing. Its helper
  lanes use the same AST body-shape fingerprint as product pressure, including a projection that catches helpers with
  different names but equivalent canonical control flow; the compact script filters out very small grouped declarations
  so coincidental key-builder shapes do not crowd out mergeable helpers. The wrapper lane shows helpers that directly
  return a constructor or simple call and includes local direct-call, value-reference, and total-usage counts; use it to inspect whether a
  wrapper has real lifetime/ownership, not as a cleanup score to game. The object-spread lane catches `...(cond ? {} : { prop })` style
  construction, including isolated low-pressure envelopes, so those rows can be simplified intentionally instead of found by grep. The string lanes surface
  values with non-import/non-enum reuse plus contract-bearing schema/lens/continuation values, and the const-object lane uses `declarationKind=const-object` before paging so answer-level vocabularies are not hidden by compact row limits. Use
  `pnpm --filter @aurelia-ls/atlas pressure:self:detail` when the compact rows hide a needed metric.
- [atlas-self-profile.ts](atlas-self-profile.ts) times the major `atlas.self` projections through the daemon with
  representative filters and prints the cold self-analysis phase profile from the summary read. Use
  `pnpm --filter @aurelia-ls/atlas profile:self` before splitting Atlas core analysis files so the decision starts
  from measured build phases and hot request cost, not only line count.
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
