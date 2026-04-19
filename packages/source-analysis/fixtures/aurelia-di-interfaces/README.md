# Aurelia DI Interface Goldens

This fixture family is the first focused pressure test for the Aurelia DI
interface lens in `packages/source-analysis`.

It is intentionally small in shape and focused on one semantic slice:

- exported values that ultimately come from `createInterface(...)`
- interface-symbol aliasing
- helper aliases such as `tcCreateInterface`
- the first default registration shape when the interface bakes one in

This is not a full DI claim graph.
It is the first stable forcing function for one pervasive Aurelia programming
ontology.

## Current Shape

Each row currently captures:

- exported name
- export location
- interface name
- interface declaration location
- export alias path
- `createInterface` factory alias path
- registration kind and expression text

This is enough to expose:

- how many interface symbols the framework really exports
- where aliasing occurs
- which interfaces carry built-in DI defaults

## Layout

- `golden.json`
  One normalized suite file for the whole DI-interface lens.

## Refresh

1. Build `source-analysis`.
2. Regenerate the goldens.
3. Re-run the focused Node test.

Example:

```text
pnpm --filter @aurelia-ls/source-analysis build
node packages/source-analysis/scripts/generate-aurelia-di-interface-goldens.mjs
pnpm --filter @aurelia-ls/source-analysis build:tests
node packages/source-analysis/scripts/run-node-tests.mjs out-test/test/aurelia-di-interface-goldens.test.js
```

The generator prefers the in-repo `aurelia` submodule.
If needed, override with `--repo <path>` or `AURELIA_FRAMEWORK_REPO`.
