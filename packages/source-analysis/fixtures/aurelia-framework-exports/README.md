# Aurelia Framework Export Goldens

This fixture family is the first broad-coverage integration pressure test for
`packages/source-analysis` against the in-repo `aurelia` framework submodule.

It is intentionally thin in shape and broad in coverage.

The current purpose is:

- enumerate the full framework export surface
- normalize it into a small, deterministic JSON shape
- deep-compare live results against checked-in goldens
- let the classifier and supporting APIs evolve against real framework
  pressure before richer protocol commitments harden

## Current Shape

The current row shape is intentionally small.

Each export row currently captures only:

- exported name
- original name
- resolved declaration name and file
- face kind and merged face kinds
- type/value posture
- namespace export flag
- export-chain kind summary

This is not the final Aurelia semantic contract.
It is the first stable forcing function.

## Layout

- `manifest.json`
  Suite-level package list and export counts.
- `packages/*.golden.json`
  One normalized golden file per framework package.

## Refresh

1. Build `source-analysis`.
2. Regenerate the goldens.
3. Re-run the focused Node test.

Example:

```text
pnpm --filter @aurelia-ls/source-analysis build
node packages/source-analysis/scripts/generate-aurelia-framework-goldens.mjs
pnpm --filter @aurelia-ls/source-analysis build:tests
node packages/source-analysis/scripts/run-node-tests.mjs test/aurelia-framework-exports.test.ts
```

The generator prefers the in-repo `aurelia` submodule.
If needed, override with `--repo <path>` or `AURELIA_FRAMEWORK_REPO`.
