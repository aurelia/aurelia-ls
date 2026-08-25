# AGENTS.md

## Atlas By Scope

For broad product or architecture work, or when resuming without a current domain packet, start by orienting through Atlas:

```powershell
pnpm --filter @aurelia-ls/atlas orient
```

Atlas is the live self-description layer for the repo and should be treated as the first read before broad product or architecture work.
The default orientation output is compact; use `pnpm --filter @aurelia-ls/atlas orient:json` only when a tool needs the full request-shaped payload.

For a focused task with a current tracker, domain note, or explicit entry files, do not expand context through broad orientation. Use targeted Atlas memory, framework corpus, flow, or pressure query when a concrete semantic question needs grounding. Atlas is navigation and queryable memory, not a substitute for reading the owning code, framework evidence, and current contracts.

Useful Atlas follow-up commands:

```powershell
pnpm --filter @aurelia-ls/atlas pressure:self
pnpm --filter @aurelia-ls/atlas pressure:product-architecture
pnpm --filter @aurelia-ls/atlas profile:product-architecture
```

Use compact `pressure:self` before Atlas maintenance refactors, compact `pressure:product-architecture` before semantic-runtime cleanup passes, and `profile:product-architecture` before adding cache, warmup, or split points to semantic-runtime architecture queries. Run `pnpm --filter @aurelia-ls/atlas pressure:self:detail` or `pnpm --filter @aurelia-ls/atlas pressure:product-architecture:detail` when compact rows hide a needed metric. The pressure commands print source line anchors when available; `pressure:self` focuses its high mapper lane on multi-axis framework-semantic pressure, and the profile command prints structure, core, symbol, and full lanes.

## Semantic Runtime

`packages/semantic-runtime/` is the Aurelia semantic substrate. It owns the product model: kernel records, vocabulary, auLink anchors, static evaluation, resources, configuration, DI, templates, expressions, TypeChecker-backed projection, and inquiry contracts.

Ground author-facing Aurelia semantics by triangulating framework documentation, framework tests, compiler lowering, runtime behavior, and logical ownership. Do not infer public policy solely from optimized implementation shape, private mutability, fallback behavior, or compatibility tolerance. Tooling may be stricter than incidental runtime permissiveness only when the rule is well-grounded, low-noise, and actionable.

Build it with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime build
```

Before adding carriers, helpers, or backup paths, search for existing products, provenance, vocabulary, and inquiry surfaces. Prefer restoring dropped data, reconnecting isolated implementations, and deleting duplicate derivations. Prefer strengthening `semantic-runtime` and Atlas over reintroducing snapshot/query CLI layers.

## External Checkouts

Do not edit the external submodules `aurelia` or `aurelia2-plugins` unless the user explicitly asks.

## Commit Style

- Draft an imperative single-line message such as `Add X`, `Fix X`, `Remove X`, or `Refactor X`.
- Prefer naming the concrete capability or behavior that changed.
- Do not overcompress the subject just to keep it short. If you land several coequal changes and there is no single honest unifying capability, name more than one of them in the subject. Commas and `and` are fine.
- Mention the package name only when it actually helps disambiguate the change; do not let every commit default to `Add <package name> ...` just because the package is the active surface.
- No commit bodies beyond the first line.
