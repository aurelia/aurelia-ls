# @aurelia-ls/aot-assurance

Private executable parity harness for the Aurelia AOT program.

Each scenario builds the same source twice with Vite 8, serves both production outputs, runs one ordered Chromium
interaction program per lane, and compares source-derived DOM/live-state outcomes. The AOT lane is supplied by the real
semantic-runtime provider and `aot-vite` preset; there is no pass-through or hidden JIT fallback.
The AOT lane also requires every spent `StandardConfiguration` occurrence to be replaced. Browser quick-start sources
therefore run through the generated base-runtime facade instead of retaining the ordinary facade defaults.
The routed storefront additionally requires its exact 11-resource/11-renderer plan and an omitted event modifier, so
browser parity exercises the optimized configuration rather than only a compile-free conservative fallback.

The default package assurance runs four complementary scenarios:

- `g0` is the deeply instrumented parser/teardown control and owns the runtime string-parse guard;
- `hello-world` runs the canonical shared IDE fixture without source instrumentation, aligned to the standard decorator
  pipeline required by Vite 8. It covers computed filtering, repeat/if/let, form writeback, child bindables and aliases,
  custom-attribute callbacks, a value converter, SVG foreign content, and selected-item interactions. Its AOT build must
  emit exactly `my-app`, `product-card`, and `stock-badge`.
- `routed-storefront` runs the semantic-runtime/IDE pressure fixture through its real router bootstrap. It covers the
  fulfilled promise branch, debounced search, checkbox and select observation, switch branches, class/style output,
  no-match structure, shared DI state, route-state persistence, and data-bound detail navigation. Its AOT build must
  emit exactly `app-root`, `item-list-route`, `item-detail-route`, and `item-card`.
- `state-backed-form` runs the form value-channel pressure fixture without source instrumentation. It covers captured
  field forwarding, independent computed-submit dependencies, checkbox and radio-model writeback, nullable,
  object-valued, and multiple selects, submission state, and per-request persistence. Its AOT build must emit exactly
  `app-root`, `state-backed-form`, and `field-shell`; custom-matcher identity remains manifest-owned because the
  fixture does not provide an equal-by-id/different-identity runtime value.

```powershell
pnpm --filter @aurelia-ls/aot-assurance test
pnpm --filter @aurelia-ls/aot-assurance assure
node packages/aot-assurance/out/cli.js --receipt .temp/aot-assurance-receipt.json
node packages/aot-assurance/out/cli.js --scenario hello-world
node packages/aot-assurance/out/cli.js --scenario routed-storefront
node packages/aot-assurance/out/cli.js --scenario state-backed-form
node packages/aot-assurance/out/cli.js --scenario all
```

The default test and `assure` run all scenarios; `test` additionally typechecks all fixtures. Build evidence requires
one semantic analysis per AOT build, compiler-final artifacts, source maps, and `needsCompile: false`. G0 additionally
requires a positive JIT parser control and zero AOT string-parser calls. The generated `AotTemplateCompiler` is itself
fail-closed for unplanned markup/spread calls; browser success covers its required null-template bypass without an
app-authored compiler override. Bundle size, heap, and timing outcomes belong to the benchmark scorecard; package or
implementation names are diagnostic evidence rather than assurance purity gates.

The `--falsifier mutate-instruction`, `--falsifier restore-needs-compile`, and
`--falsifier drop-nested-definition` options mutate emitted artifacts and are expected to make the real assurance run
fail. They remain explicit negative controls rather than a synthetic success-only test mode.

The current G0 fixture intentionally uses standards-valid table structure. Its original foster-parenting pressure
exposed a distinct G4 compiler-accounting blocker and remains tracked rather than being normalized away here.
