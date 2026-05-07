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
session path. The package script `pnpm --filter @aurelia-ls/atlas orient` is the stable Codex-facing activation call.

`createApi().frameworkEmulationSymbolsReport()` returns the deterministic framework emulation Markdown report used as
the StandardConfiguration/composition eyeball golden. Re-run it with
`pnpm --filter @aurelia-ls/atlas report:framework-emulation`, which writes
`packages/atlas/workbench/emulation-symbols.md`.

## Fast Agent Lanes

For a compact current handoff, read [workbench/agent-handoff.md](workbench/agent-handoff.md) after `orient`.

- Start broad work with `pnpm --filter @aurelia-ls/atlas orient`; it is the compact live map of lenses, projections,
  terrain, source roots, first continuations, shortcut scripts, and compact follow-up docs.
- Use `product.architecture` before opening semantic-runtime source for structure pressure. `functions`, `classes`,
  `call-sites`, and `call-dependencies` are the usual fast product refactor lanes; `summary` and symbol projections
  spend the heavier symbol-backed memo. The shortcut script is
  `pnpm --filter @aurelia-ls/atlas pressure:product-architecture`; it prints cheap structure pressure first, then the
  call-site-backed function pressure.
- Use `pnpm --filter @aurelia-ls/atlas profile:product-architecture` when a product architecture query feels slow.
  The script prints structure, core, symbol, and full cold phase timings so cache or split decisions start from
  measured cost instead of vibes.
- Use `atlas.self:classes` and `atlas.self:functions` before opening Atlas source for Atlas refactors. Class rows
  support `minLineCount`, `minMethodCount`, `minPropertyCount`, and pressure-oriented ordering; function rows support
  `minLineCount`, `minCallCount`, `minUniqueCallTargetCount`, and pressure-oriented ordering. The shortcut script is
  `pnpm --filter @aurelia-ls/atlas pressure:self`; it also prints high `atlas.self:axis-pressure` rows.
- Use framework lenses for Aurelia grounding rather than pattern-matching from other frameworks. `framework.resources`
  preserves exact carrier spans plus declaration spans, `framework.rendering` owns hydration/binding/controller rows,
  `framework.observation` owns observer-locator/reactivity rows, and `framework.composition:emulation` is the compact
  semantic-runtime obligation map.

## Map

- [src](src/README.md) is the implementation root.
- [src/framework](src/framework/README.md) owns Aurelia-specific framework substrates over source, evaluator, DI,
  admission, resources, compiler, rendering, lifecycle, observation, API usage, and bridge pressure.
- [src/inquiry](src/inquiry/README.md) owns the inquiry, answer, lens, substrate, terrain, vocabulary, and runtime contracts.
- [src/session](src/session/README.md) owns the local daemon, filesystem manifest, and restart lifecycle.
- [src/scripts](src/scripts/README.md) owns static coherence checks and maintenance entrypoints.
