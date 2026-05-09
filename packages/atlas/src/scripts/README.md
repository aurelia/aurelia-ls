# scripts

`scripts` contains package-local maintenance entrypoints.

These scripts should check static coherence rather than trying to prove runtime usefulness. The package is intentionally contract-first, so the early checks should verify things like lens-to-substrate references, required vocabulary shape, active terrain, and answer algebra invariants.

## Current Scripts

- [orient.ts](orient.ts) prints a compact top-level Atlas orientation through the auto-starting session API. Pass
  `--json` through `orient:json` when a tool needs the full request-shaped bundle.
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
  duplicate top-level helper-name pressure so small repeated helpers can be treated as possible split-brain before
  manual grep. Use `pnpm --filter @aurelia-ls/atlas pressure:product-architecture:detail` when the compact rows hide a
  needed metric or lower-ranked row.
- [framework-resources-pressure.ts](framework-resources-pressure.ts) prints resource convergence rollups from
  `framework.resources`, including carrier-kind/source-role counts, exact source-site role counts, and
  definition-vs-declaration provenance counts. Use it when resource convergence needs provenance pressure before
  following individual rows into admission, compiler, rendering, or materialization.
- [framework-router-pressure.ts](framework-router-pressure.ts) prints the framework router rollup, curated route-flow
  spine health, relationship axis distributions, and flow self-audit rows from `framework.router`.
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
  function density, duplicate top-level helper-name pressure, and high multi-axis pressure rows plus request timing and
  source line anchors from `atlas.self` so Atlas refactors can start from source-backed pressure rather than raw file
  browsing. Use `pnpm --filter @aurelia-ls/atlas pressure:self:detail` when the compact rows hide a needed metric.
- [framework-emulation-symbols-report.ts](framework-emulation-symbols-report.ts) writes the deterministic framework
  emulation Markdown golden by calling the named session report endpoint. The report currently uses
  `StandardConfiguration` as a broad canary, not as the only configuration shape Atlas can reason about.
- [inquiry-playground.ts](inquiry-playground.ts) runs the auto-starting session API and prints compact answer summaries.
- [inquiry-session-ensure.ts](inquiry-session-ensure.ts) starts or reuses the local inquiry daemon and leaves it available until its idle timeout.
- [inquiry-session-playground.ts](inquiry-session-playground.ts) exercises idempotent daemon startup, protocol calls, self-check, continuation following, and polite shutdown.
- [inquiry-session-shutdown.ts](inquiry-session-shutdown.ts) stops an existing local inquiry daemon without starting a new one.
- [script-output.ts](script-output.ts) owns shared pressure-script formatting helpers such as answer assertions, value
  extraction, sorted count maps, empty row markers, source labels, count labels, duplicate function-name grouping, and
  row counting. Keep lane selection in the individual scripts, and put only repeated terminal output mechanics here.

## Dependency Rule

Scripts may depend on [../inquiry](../inquiry/README.md) and [../session](../session/README.md). They should avoid becoming hidden production code paths.
