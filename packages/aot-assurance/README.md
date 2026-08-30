# @aurelia-ls/aot-assurance

Private executable parity harness for the Aurelia AOT program.

Each scenario builds the same source twice with Vite 8, serves both production outputs, runs one ordered Chromium
interaction program per lane, and compares source-derived DOM/live-state outcomes. The AOT lane is supplied by the real
semantic-runtime provider and `aot-vite` preset; there is no pass-through or hidden JIT fallback.

The default package assurance runs three complementary scenarios:

- `g0` is the deeply instrumented compiler/parser/teardown control and owns the runtime no-fallback probes;
- `hello-world` runs the canonical shared IDE fixture without source instrumentation, aligned to the standard decorator
  pipeline required by Vite 8. It covers computed filtering, repeat/if/let, form writeback, child bindables and aliases,
  custom-attribute callbacks, a value converter, SVG foreign content, and selected-item interactions. Its AOT build must
  emit exactly `my-app`, `product-card`, and `stock-badge`.
- `routed-storefront` runs the semantic-runtime/IDE pressure fixture through its real router bootstrap. It covers the
  fulfilled promise branch, debounced search, checkbox and select observation, switch branches, class/style output,
  no-match structure, shared DI state, route-state persistence, and data-bound detail navigation. Its AOT build must
  emit exactly `app-root`, `item-list-route`, `item-detail-route`, and `item-card`.

```powershell
pnpm --filter @aurelia-ls/aot-assurance test
pnpm --filter @aurelia-ls/aot-assurance assure
node packages/aot-assurance/out/cli.js --receipt .temp/aot-assurance-receipt.json
node packages/aot-assurance/out/cli.js --scenario hello-world
node packages/aot-assurance/out/cli.js --scenario routed-storefront
node packages/aot-assurance/out/cli.js --scenario all
```

The default test and `assure` run all scenarios; `test` additionally typechecks all fixtures. Build evidence requires
one semantic analysis per AOT build, compiler-final artifacts, source maps, and `needsCompile: false`. G0 additionally
requires positive JIT probe controls and zero AOT compiler/parser calls. Bundle size, heap, and timing outcomes belong
to the benchmark scorecard; package or implementation names are diagnostic evidence rather than assurance purity gates.

The `--falsifier mutate-instruction`, `--falsifier restore-needs-compile`, and
`--falsifier drop-nested-definition` options mutate emitted artifacts and are expected to make the real assurance run
fail. They remain explicit negative controls rather than a synthetic success-only test mode.

The current G0 fixture intentionally uses standards-valid table structure. Its original foster-parenting pressure
exposed a distinct G4 compiler-accounting blocker and remains tracked rather than being normalized away here.
