# Semantic Runtime Workbench

This note keeps recent context close to the code while the package is still settling. It is not a roadmap and it should not become a procedural dossier. If a detail stops being useful for orientation, delete it or promote the durable part into the owning README or source contract.

## Recent Context

The repo has consolidated around two internal surfaces:

- `packages/semantic-runtime` owns the Aurelia semantic product model.
- `packages/atlas` owns live orientation, inquiry contracts, and the hot local session used by Codex-facing work.

The static document packet and snapshot/query shell have been removed. The intent is for product semantics to live in typed substrate, vocabulary, auLink anchors, claims, provenance, materialized products, and open seams, with Atlas reading those surfaces directly instead of relying on parallel summaries.

## Current Shape

The broad horizontal substrate is present but not finished end to end. The active layers are:

- `kernel` for handles, vocabulary, records, claims, provenance, materialization, product details, and auLink.
- `boot` for source admission before semantic interpretation.
- `evaluation` for static module/value evaluation and explicit open seams.
- `resources`, `configuration`, `registration`, and `di` for Aurelia world construction.
- `template` and `expression` for authored template/compiler surfaces and parser-owned recovery.
- `type-system` for TypeChecker-backed projection where runtime emulation should stop.
- `router` for router model anchors that are not yet deeply wired into passes.

This breadth is intentional. The next useful work is not to preserve compatibility with retired readers, but to let real consumers pressure these layers and then refactor horizontally when the boundaries become clearer.

## Working Rules

- Start repo work through `pnpm --filter @aurelia-ls/atlas orient`.
- Build this package with `pnpm --filter @aurelia-ls/semantic-runtime build`.
- Keep `auLink` narrow: framework-symbol anchors only, not product taxonomy.
- Put durable semantics in product records and vocabulary, not in documentation tables.
- Keep uncertainty explicit with open seams instead of flattening partial knowledge into resolved-looking facts.
- Treat package-local READMEs as boundary notes. Keep them short enough that future agents actually read them.

## Near Pressure

Atlas should increasingly learn from this package through typed contracts:

- read terrain and source-surface inventory from `kernel/substrate-contract.ts`;
- follow auLink anchors into the framework checkout;
- report stale, missing, or overlapping substrate declarations;
- expose continuations that move between Atlas self-maintenance, semantic-runtime source, and framework anchors;
- avoid growing private product-specific inference tables when the product model itself can carry the intent.

The expression parser remains useful but provisional. It has grammar, AST, and recovery algebra, yet it predates the current kernel shape. Keep it callable parser machinery above source text until template/compiler ownership proves where its products should land.
