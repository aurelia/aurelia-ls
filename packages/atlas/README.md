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
- Use `product.architecture` before opening semantic-runtime source for structure pressure. `functions`, `classes`,
  `call-sites`, and `call-dependencies` are the usual fast product refactor lanes; `summary` and symbol projections
  spend the heavier symbol-backed memo. The shortcut script is
  compact `pnpm --filter @aurelia-ls/atlas pressure:product-architecture`; it prints cheap structure pressure first,
  then the call-site-backed function pressure. Use
  `pnpm --filter @aurelia-ls/atlas pressure:product-architecture:detail` when lower-ranked rows matter.
- Use `pnpm --filter @aurelia-ls/atlas profile:product-architecture` when a product architecture query feels slow.
  The script prints structure, compact-call core/full, exact-call core/full, and symbol cold phase timings so cache or
  split decisions start from measured cost instead of vibes.
- Use `pnpm --filter @aurelia-ls/atlas profile:workspace-architecture` when external-root workspace pressure feels
  slow. It prints package manifest/file-inventory, source scan, attribution, profile inference, sorting, and rollup
  phase timings.
- Use `atlas.self:classes` and `atlas.self:functions` before opening Atlas source for Atlas refactors. Class rows
  support `minLineCount`, `minMethodCount`, `minPropertyCount`, and pressure-oriented ordering; function rows support
  `minLineCount`, `minCallCount`, `minUniqueCallTargetCount`, and pressure-oriented ordering. The shortcut script is
  compact `pnpm --filter @aurelia-ls/atlas pressure:self`; use
  `pnpm --filter @aurelia-ls/atlas pressure:self:detail` when a full metric row is needed. It also prints high
  `atlas.self:axis-pressure` rows.
- Use framework lenses for Aurelia grounding rather than pattern-matching from other frameworks. `framework.resources`
  preserves exact definition spans plus typed source-site lanes for backing declarations, bundle admissions, syntax
  products, and materialization sites. `framework.rendering` owns hydration/binding/controller rows,
  `framework.observation` owns observer-locator/reactivity rows, and `framework.composition:emulation` is the compact
  semantic-runtime obligation map. Use `pnpm --filter @aurelia-ls/atlas pressure:framework-resources` when resource
  provenance is the question.
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
  creation, and controller lifecycle rows when their stage crosses those framework boundaries.
- Use `workspace.architecture` when a pressure run admits authored apps or monorepos through the source substrate. It
  separates package admission role from inferred Aurelia shape, exposes source-role pressure for app/test/tooling
  separation, then reports Aurelia entrypoint signals, manifest/build signals, framework imports, resources,
  configuration, registrations, router usage, and template references. For proprietary clean-room runs, keep tracked
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
