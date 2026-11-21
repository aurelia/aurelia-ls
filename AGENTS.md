# AGENTS.md

## Working in this repository

Start with the package that owns the change and the caller or test that observes it. The [architecture overview](docs/architecture.md) describes the package boundaries. [Atlas](packages/atlas/README.md) can look up a past decision, trace a TypeScript declaration across explicitly selected packages, or check an interpretation against Aurelia framework evidence.

## Semantic Runtime

Ground author-facing rules in Aurelia documentation, tests, compiler lowering and runtime behavior. Implementation fallbacks alone cannot establish a public rule. Before introducing a new representation, trace the existing semantic product and its provenance through to its consumer. A missing connection can often be repaired at its owner. See the [semantic-runtime README](packages/semantic-runtime/README.md).

## External Checkouts

Do not edit the external submodules `aurelia` or `aurelia2-plugins` unless the user explicitly asks.

## Commit Style

- Draft an imperative single-line message such as `Add X`, `Fix X`, `Remove X`, or `Refactor X`.
- Prefer naming the concrete capability or behavior that changed.
- Do not overcompress the subject just to keep it short. If you land several coequal changes and there is no single honest unifying capability, name more than one of them in the subject. Commas and `and` are fine.
- Mention the package name only when it actually helps disambiguate the change; do not let every commit default to `Add <package name> ...` just because the package is the active surface.
- No commit bodies beyond the first line.
