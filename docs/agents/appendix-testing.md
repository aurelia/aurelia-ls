# AGENTS Appendix - Testing Pattern (10/20/30)

This appendix documents the current test layout and expectations for compiler phase suites so AI agents can navigate and extend them quickly.

## Layout by phase

- **10-lower**: `packages/domain/test/10-lower/`
  - Vectors split into themed JSON files (`basics.json`, `lets.json`, `controllers.json`, `custom-resources.json`, `spec-sweep.json`) with prefixed numbering (e.g., `LB-01`, `LL-01`, `LC-01`).
  - Single runner `lower.test.mjs` loads all JSONs, normalizes IR into a compact intent, and asserts presence/absence. Wrapped in `describe("Lower (10)")`.

- **20-resolve**: `packages/domain/test/20-resolve/`
  - Vectors split by concern (`props.json`, `attrs.json`, `events.json`, `ctrl.json`, `misc.json`, `diags.json` if needed) with prefixes (`R-P-..`, `R-A-..`, `R-E-..`, `R-C-..`, `R-M-..`).
  - Runner `resolve.test.mjs` loads all JSONs, resolves IR, and compares simplified linked intent (items + diags). Wrapped in `describe("Resolve (20)")`.

- **30-bind**: `packages/domain/test/30-bind/`
  - Vectors already split (e.g., `bind-basic.json`, `bind-diags.json`, `bind-repeat.json`, etc.) with prefixes (`B-..`, `DG-..`, `RPT-..`, etc.).
  - Runner `bind.test.mjs` loads all JSONs and asserts scope mappings/diags. Wrapped in `describe("Bind (30)")`.

- **40-typecheck**: `packages/domain/test/40-typecheck/`
  - Vectors split by concern (`basics.json`, `diags.json`, etc.) with prefixes like `TC-B-..`.
  - Runner `typecheck.test.mjs` loads all JSONs, runs 10/20/30 setup, then compares:
    - `expected`: [{ code, type }]
    - `inferred`: [{ code, type }]
    - diags: AU13xx entries keyed by expr code + expected/actual when present.
  - Default `rootVmType` is `RootVm` unless overridden per vector. Wrapped in `describe("Typecheck (40)")`.

- **50-plan**: `packages/domain/test/50-plan/`
  - Overlay: `overlay/` vectors (e.g., `basics.json`) with prefixes like `PL-B-..`; runner `overlay/overlay-plan.test.mjs` loads all JSONs, runs 10/20/30 setup + plan, then compares frames/lambdas. Uses stub `VmReflection` (default root `RootVm`, synthetic prefix `__AU_TTC_`). Wrapped in `describe("Plan (50)")`.
  - SSR: (add alongside when needed) keep under `ssr/` to mirror stage `50-plan-ssr`.

## Conventions

- One runner per phase; it loads **all** `.json` vector files in its folder (excluding `failures.json` when present).
- Prefix numbering restarts per file; prefixes follow phase tags to keep IDs unique and searchable.
- Use `npm run fmt:vectors` after editing/adding JSON vectors to normalize formatting.
- Scripts:
  - 10-lower: `npm run test:10-lower` / `test:10-lower:cov`
  - 20-resolve: `npm run test:20-resolve` / `test:20-resolve:cov`
  - 30-bind: `npm run test:30-bind` / `test:30-bind:cov`
  - 40-typecheck: `npm run test:40-typecheck` / `test:40-typecheck:cov`
  - 50-plan: `npm run test:50-plan` / `test:50-plan:cov`
  - 60-emit: `npm run test:60-emit`
- Coverage commands target the corresponding phase outputs; `types.js` files and tests are excluded where needed.

## When adding vectors

- Pick the appropriate themed JSON; prefix/renumber within that file.
- Keep expectations compact (intent shapes) rather than full IR/Linked objects.
- For new suites (40/50/60), mirror this pattern: split vectors by concern, single runner, describe-wrapped, prefixed IDs, all JSONs auto-loaded.
