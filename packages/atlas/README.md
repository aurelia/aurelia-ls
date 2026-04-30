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

`src/session` is the default request surface. `createAtlasApi()` auto-starts or reuses the local daemon before every request, giving long-running work a place to keep hot state while still restarting when the compiled build output changes.

`createAtlasApi().orient()` is the highest-level entrypoint. It returns daemon status, the surface map, the `atlas.self` maintenance answer, and first continuations through the same auto-starting session path. The package script `pnpm --filter @aurelia-ls/atlas orient` is the stable Codex-facing activation call.

## Map

- [src](src/README.md) is the implementation root.
- [src/inquiry](src/inquiry/README.md) owns the inquiry, answer, lens, substrate, terrain, vocabulary, and runtime contracts.
- [src/session](src/session/README.md) owns the local daemon, filesystem manifest, and restart lifecycle.
- [src/scripts](src/scripts/README.md) owns static coherence checks and maintenance entrypoints.
