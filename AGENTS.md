# AGENTS.md

## Atlas First

For work in this repo, start by orienting through Atlas:

```powershell
pnpm --filter @aurelia-ls/atlas orient
```

Atlas is the live self-description layer for the repo and should be treated as the first read before broad product or architecture work.

## Semantic Runtime

`packages/semantic-runtime/` is the Aurelia semantic substrate. It owns the product model: kernel records, vocabulary, auLink anchors, static evaluation, resources, configuration, DI, templates, expressions, TypeChecker-backed projection, and inquiry contracts.

Build it with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime build
```

Prefer strengthening `semantic-runtime` and Atlas over reintroducing snapshot/query CLI layers.

## External Checkouts

Do not edit the external submodules `aurelia` or `aurelia2-plugins` unless the user explicitly asks.

## Commit Style

- Draft an imperative single-line message such as `Add X`, `Fix X`, `Remove X`, or `Refactor X`.
- Prefer naming the concrete capability or behavior that changed.
- Do not overcompress the subject just to keep it short. If you land several coequal changes and there is no single honest unifying capability, name more than one of them in the subject. Commas and `and` are fine.
- Mention the package name only when it actually helps disambiguate the change; do not let every commit default to `Add <package name> ...` just because the package is the active surface.
- No commit bodies beyond the first line.
