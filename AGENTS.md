# AGENTS.md

## Source Analysis

`packages/source-analysis/` gives you structured, queryable facts about the codebase — module dependencies, package exports, type declarations and references. It's built on the TypeScript Compiler API and emits deterministic JSON snapshots under `.source-analysis/snapshots/<target>/`. Queries read snapshots, so they're fast and stay useful even when emit is partially broken.

### Quick Start

```
pnpm --filter @aurelia-ls/source-analysis build
pnpm source-analysis refresh all
pnpm source-analysis deps summary
pnpm source-analysis deps packages
pnpm source-analysis typerefs hubs
pnpm source-analysis exports package @aurelia-ls/source-analysis
```

Build when tool source changes. Refresh when the codebase under analysis changes. Query anytime. `--repo <path>` targets another checkout; default is the current working directory.

### Programmatic API

```ts
import { loadCurrentSourceAnalysisSnapshots } from '@aurelia-ls/source-analysis';
const { deps, exports, typeRefs } = loadCurrentSourceAnalysisSnapshots();
```

Prototype new queries in user-space against loaded snapshots before promoting them to CLI subcommands.

### Direction

The tool targets itself — its own structure is queryable through the same surface any other TypeScript project gets. Where it's headed:

- Result algebra over exceptions: every query returns a tagged result (`hit`, `miss-unknown-shape`, `ambiguous`, `reroute`) with hints and suggested continuations, so misses teach the caller what to ask next.
- Self-healing, self-documenting surface: validators run upfront; errors are first-class AI-consumable output, not stack traces.
- Graceful degradation: a parse-only tier should answer most deps/exports questions even when the project under analysis doesn't fully typecheck.
- Snapshots as the contract: JSON is the stable interface; CLI and programmatic API are both just readers.

## Commit Style

- Draft an imperative single-line message such as `Add X`, `Fix X`, `Remove X`, or `Refactor X`.
- Prefer naming the concrete capability or behavior that changed.
- Do not overcompress the subject just to keep it short. If the you land several coequal changes and there is no single honest unifying capability, name more than one of them in the subject. Commas and `and` are fine.
- Mention the package name only when it actually helps disambiguate the change; do not let every commit default to `Add <package name> ...` just because the package is the active surface.
- No commit bodies beyond the first line.
