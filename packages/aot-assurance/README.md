# @aurelia-ls/aot-assurance

Private executable parity harness for the Aurelia AOT program.

Each scenario builds the same source twice with Vite 8, serves both production outputs, runs one ordered Chromium
interaction program per lane, and compares source-derived DOM/live-state outcomes. The AOT lane is supplied by the real
semantic-runtime provider and `aot-vite` preset; there is no pass-through or hidden JIT fallback.
The AOT lane also requires every spent `StandardConfiguration` occurrence to be replaced. Browser quick-start sources
therefore run through the generated base-runtime facade instead of retaining the ordinary facade defaults.
The routed storefront additionally requires its exact 11-resource/11-renderer plan and an omitted event modifier, so
browser parity exercises the optimized configuration rather than only a compile-free conservative fallback.

The default package assurance runs nine complementary scenarios:

- `g0` is the deeply instrumented parser/teardown control and owns the runtime string-parse guard;
- `hello-world` runs the canonical shared IDE fixture without source instrumentation, aligned to the standard decorator
  pipeline required by Vite 8. It covers computed filtering, repeat/if/let, form writeback, child bindables and aliases,
  custom-attribute callbacks, a value converter, SVG foreign content, and selected-item interactions. Its AOT build must
  emit exactly `my-app`, `product-card`, and `stock-badge`.
- `local-templates` is the G6 scoped-Type golden. It uses locals before declaration, preserves owner and sibling
  visibility, recursively nests a local cohort, and exercises repeated/conditional use sites through owner update
  propagation, repeat growth, removal, and restoration. One decorated template-value component exercises the
  source-owned compiler patch; one paired convention component exercises the complete DefinitionModule owner-Type
  realization. Both realize local graphs without runtime JIT compilation.
- `routed-storefront` runs the semantic-runtime/IDE pressure fixture through its real router bootstrap. It covers the
  fulfilled promise branch, debounced search, checkbox and select observation, switch branches, class/style output,
  no-match structure, shared DI state, route-state persistence, and data-bound detail navigation. Its AOT build must
  emit exactly `app-root`, `item-list-route`, `item-detail-route`, and `item-card`.
- `built-in-controllers` runs the existing semantic-runtime controller pressure app and its unchanged template. One
  source-shared browser bridge mutates ordinary view-model inputs; the ordered journey checks array, Map and Set
  mutations, keyed tuple destructuring with a hole, collection replacement, contextual and contextless/nested repeats,
  numeric and nullable repeat sources, scoped `with`/`if`, discriminant/type/property/instance guards, promise
  pending/fulfillment/rejection with four assignment forms, `let` propagation, switch arrays/fall-through/overlap,
  parent-scope events, and portal removal on teardown. Explicit source-derived content, repeat-row, and writeback
  expectations accompany lane parity. Its AOT build emits only `template-controller-built-ins-app`; authoring-only
  sibling resources remain in the same TypeScript project. The unguarded `with.bind="selectedProduct"` is deliberately
  not driven to null: RC2 throws on that fixture input, so nullable repeat and guarded `maybeProduct` cover supported
  null transitions without presenting the unguarded `with` case as certified behavior.
- `browser-recovery` deliberately keeps invalid table children and paragraph nesting in authored markup. Browser
  foster parenting reorders bound targets; paragraph closure makes an `if` host and a repeated sibling independent.
  Its five checkpoints check initial structure, first-wins duplicate-attribute form writeback, removal, collection
  mutation while the paragraph is hidden, and restoration. SVG/MathML namespace integration and adjusted names,
  namespaced attributes, selected versus wrapped string-template carriers, and inert template content remain correct
  through updates. All three resource artifacts are required, and teardown must empty the application host.
- `state-backed-form` runs the form value-channel pressure fixture without source instrumentation. It covers captured
  field forwarding, independent computed-submit dependencies, checkbox and radio-model writeback, nullable,
  object-valued, and multiple selects, submission state, and per-request persistence. Its AOT build must emit exactly
  `app-root`, `state-backed-form`, and `field-shell`; custom-matcher identity remains manifest-owned because the
  fixture does not provide an equal-by-id/different-identity runtime value.
- `projects-and-milestones` runs a curated ordinary application assembled by the former app-builder program. It covers
  the initial router redirect, four routed list/detail areas, shared DI state, project and assignment creation, boolean
  and numeric-model form channels, async review loading and creation, and object-model selection through a matcher.
  Its AOT build must emit exactly the shell plus its eight route resources. Registration breadth remains provisional.
- `explicit-shadow` combines explicit open shadow roots with native named/default slots and Aurelia `au-slot`
  projections. It checks retained light-child order, native assignment identities and parentage, adjacent text bindings
  separated by extracted contributors, authored whitespace/comment retention, `$host` versus source scope, projected
  events, independent retained/projected controllers, and shadow-host if/repeat lifecycle with keyed DOM reuse. Both
  native and Aurelia fallbacks are checked. Containerless shadow hosts and implicit `hasSlots` policy are outside this
  scenario. Its AOT build must emit exactly `explicit-shadow-app` and `shadow-card`.

```powershell
pnpm --filter @aurelia-ls/aot-assurance test
pnpm --filter @aurelia-ls/aot-assurance assure
node packages/aot-assurance/out/cli.js --receipt .temp/aot-assurance-receipt.json
node packages/aot-assurance/out/cli.js --scenario hello-world
node packages/aot-assurance/out/cli.js --scenario local-templates
node packages/aot-assurance/out/cli.js --scenario built-in-controllers
node packages/aot-assurance/out/cli.js --scenario browser-recovery
node packages/aot-assurance/out/cli.js --scenario explicit-shadow
node packages/aot-assurance/out/cli.js --scenario routed-storefront
node packages/aot-assurance/out/cli.js --scenario state-backed-form
node packages/aot-assurance/out/cli.js --scenario projects-and-milestones
node packages/aot-assurance/out/cli.js --scenario all
```

The default test and `assure` run all scenarios; `test` additionally typechecks all fixtures. Build evidence requires
one semantic analysis per AOT build, compiler-final artifacts, source maps, and `needsCompile: false`. G0 additionally
requires a positive JIT parser control and zero AOT string-parser calls. The generated `AotTemplateCompiler` is itself
fail-closed for unplanned markup/spread calls; browser success covers its required null-template bypass without an
app-authored compiler override. Bundle size, heap, and timing outcomes belong to the benchmark scorecard; package or
implementation names are diagnostic evidence rather than assurance purity gates.

G0's parser counter/poison is explicitly harness-owned: a post-analysis transform installs it during root construction
in both lanes. Its virtual module is not authored application demand, so production compiler-API admission is not
weakened to accommodate observation instrumentation. The fixture still fails when the probe was not installed.

The `--falsifier mutate-instruction`, `--falsifier restore-needs-compile`, and
`--falsifier drop-nested-definition` options mutate emitted artifacts and are expected to make the real assurance run
fail. They remain explicit negative controls rather than a synthetic success-only test mode.

The G0 fixture intentionally keeps standards-valid table structure. Actual foster-parenting recovery now runs through
the separate `browser-recovery` scenario; the earlier compiler-accounting blocker is no longer reproduced by that
executable cohort. This does not certify every HTML recovery case, such as discontiguous merged-text interpolation.
