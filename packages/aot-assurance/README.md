# @aurelia-ls/aot-assurance

Private executable parity harness for the Aurelia AOT program.

Each scenario builds the same source twice with Vite 8, serves both production outputs, runs one ordered Chromium
interaction program per lane, and compares source-derived DOM/live-state outcomes. The AOT lane is supplied by the real
semantic-runtime provider and `aot-vite` preset; there is no hidden JIT fallback. The explicit `compatible-hooks` and
`compiler-hooks` scenarios check application-wide preservation, while every other AOT scenario requires compiler-final artifacts and every spent
`StandardConfiguration` occurrence to be replaced. Browser quick-start sources
therefore run through the generated base-runtime facade instead of retaining the ordinary facade defaults.
The routed storefront additionally requires its exact 11-resource/11-renderer plan and an omitted event modifier, so
browser parity exercises the optimized configuration rather than only a compile-free conservative fallback.
Build evidence reports the actual analysis count and final inquiry depth. Ordinary builds stay at runtime topology;
composition captures can require a deeper binding-observation inquiry on the same semantic runtime. The composition
scenario asserts that conditional upgrade rather than hiding it behind an invariant count of one.

The default package assurance runs eighteen complementary scenarios:

- `g0` is the deeply instrumented parser/teardown control and owns the runtime string-parse guard;
- `content-moves` is strict AOT for relocation of original source-hook descendants. It moves authored content into
  an empty wrapper, reorders siblings, repeatedly removes/reinserts the same node, replaces across parents, and
  permanently removes bound content. Moved custom elements retain named projections, custom attributes, `if`/`repeat`,
  and updates after hide/restore. A retained template contributes a child through inert-to-platform document adoption;
  reordered original interpolation text siblings become adjacent and compile in the resulting order. Authored and
  generated text edits replace interpolation expressions; element/fragment `textContent` removes prior bound subtrees,
  and edited text/comment/template copies preserve independent identities and reactive behavior. Contextual markup adds
  parser-inserted table structure, inert custom-element/projection parsing, inert scripts, and live getter roundtrips. Five checkpoints
  and teardown check explicit JIT-grounded outcomes. All three compiler-final definitions are required.
- `content-attributes` is strict AOT for ordinary source-hook attribute transforms. It creates, removes and readds
  attributes; generates input bindings, custom attributes, `as-element` components, `if`/`repeat` controllers, and a
  select whose generated `value` binding precedes `multiple` in source order. HTML/SVG classList and xlink/XML
  namespace operations run through the same hook. Seven checkpoints cover updates, two-way writeback, controller
  removal/restoration, repeat growth while hidden, and teardown. It preserves the distinction between selected
  options in DOM order and Aurelia's in-place model-array update order. Native custom-element constructors also
  expose inert-versus-platform template construction and cached-clone timing; customized built-ins retain their
  original parser `is` identity after hook removal or rewriting. The native registry is installed by the browser
  harness before module loading, so eager compiler-output construction cannot pass unnoticed. Exactly five
  compiler-final definitions and replacement runtime configuration are required; compatible fallback cannot satisfy
  this scenario.
- `compatible-hooks` exercises explicit runtime-compilation preservation through the same two-lane build/browser
  harness. After a geometry API unsupported by the build evaluator, its hook rewrites a separate component's
  definition before that component's first compilation. Five checkpoints check untouched definitions before lazy
  activation, the cross-definition rewrite, projected/root binding updates, and cached hide/reactivation with one
  hook execution. A tentative attribute mutation must not leak into runtime input. A standalone HTML import outside
  the resource cohort supplies literal content through the official loader. The scenario requires no AOT artifacts,
  explicit application-wide fallback evidence, ordinary runtime configuration, and complete teardown.
- `hello-world` runs the canonical shared IDE fixture without source instrumentation, aligned to the standard decorator
  pipeline required by Vite 8. It covers computed filtering, repeat/if/let, form writeback, child bindables and aliases,
  custom-attribute callbacks, a value converter, SVG foreign content, and selected-item interactions. Its AOT build must
  emit exactly `my-app`, `product-card`, and `stock-badge`.
- `local-templates` is the G6 scoped-Type golden. It uses locals before declaration, preserves owner and sibling
  visibility, recursively nests a local cohort, and exercises repeated/conditional use sites through owner update
  propagation, repeat growth, removal, and restoration. One decorated template-value component exercises the
  source-owned compiler patch; one paired convention component exercises the complete DefinitionModule owner-Type
  realization. Both realize local graphs without runtime JIT compilation. In each owner, a local component calls a
  content hook that moves original bound children into a wrapper and reorders them; their local scope bindings remain
  live through updates and repeated instantiation. Removed authored nodes and attributes must also remain absent
  when the local compiler result rejoins its owning definition family.
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
- `localized-form` promotes the existing localized form pressure fixture with its native i18n configuration and
  inline dictionaries. Seven checkpoints cover literal and interpolated `t`, `t.bind`, translation converter and
  binding behavior, key and locale changes, changing translation parameters across requests and submissions, and
  combined text/title targets. It requires all three compiler-final definitions, no application fallback, preservation
  of the live form through updates, and complete teardown. This is ordinary DI application state, not additional
  `@aurelia/state` plugin support. The original i18n registration remains responsible for its runtime resources.
- `state-store-list` runs the existing `@aurelia/state` pressure app with its native plugin and action handlers. Six
  checkpoints exercise default `.state`/`.dispatch`, literal named `.state:filters`/`.dispatch:filters`, and default/named
  `& state` behavior through input dispatch, named-store isolation, repeated task growth and draft reset. Existing rows
  retain their DOM identity and teardown empties the host. Its strict AOT build emits only `app-root`. This bounded
  scenario does not certify dynamic store selection, custom registries, `@fromState`, middleware, or async state APIs;
  no reducer execution or lifecycle simulation is added to semantic-runtime.
- `ce-composition` is a curated static named-custom-element corridor, not a replacement for the broader composition
  pressure fixtures. Captured `message.bind`, host classes, and `id.bind` are applied to two distinct targets where `id`
  is respectively a host attribute and a bindable. Projected caller input supports live writeback; model replacement
  calls activation again without replacing composed hosts. Declaring and receiving resource scopes resolve different
  same-named components through supplied/fallback projections; both capture bound host titles from their respective
  scopes, exercising target identity rather than the empty-capture path. Four checkpoints and teardown require six separate
  compiled artifacts (including the two same-named definitions), exact renderer leaves and no compiler fallback.
  `DefaultResources` is intentionally retained: compiler-only capture plans do not yet supply rendered expression-resource
  lifecycle demand, so behavior/converter pruning would be unsafe. This is compiled composition parity, not a claim of
  fully optimized resource selection.
  Dynamic component values, CE instances, promises, arbitrary templates and component switching are not certified here.
- `projects-and-milestones` runs a curated ordinary application assembled by the former app-builder program. It covers
  the initial router redirect, four routed list/detail areas, shared DI state, project and assignment creation, boolean
  and numeric-model form channels, async review loading and creation, and object-model selection through a matcher.
  Its AOT build must emit exactly the shell plus its eight route resources. Registration breadth remains provisional.
- `explicit-shadow` combines explicit open shadow roots with native named/default slots and Aurelia `au-slot`
  projections. Its source hook constructs the native static/default outlets and binding/interpolation-named outlets
  with DOM factories; existing host-count updates switch their assigned light children. It checks retained light-child order,
  native assignment identities and parentage, adjacent text bindings
  separated by extracted contributors, authored whitespace/comment retention, `$host` versus source scope, projected
  events, independent retained/projected controllers, and shadow-host if/repeat lifecycle with keyed DOM reuse. Both
  native and Aurelia fallbacks are checked. Containerless shadow hosts and implicit `hasSlots` policy are outside this
  scenario. Its AOT build must emit exactly `explicit-shadow-app`, `shadow-card`, and `native-outlets`.
- `compiler-hooks` combines literal/helper/receiver-based `processContent` decisions, a root pure `compiling` hook,
  and owner-local, child, and local-template CSS Modules. False leaves child interpolations, controller/resource attributes, and inert templates
  uncompiled while host bindables, attributes, its own template, and outer controllers still work. True and undefined
  compile normal projected content. Repeated local CSS hooks share a mapping and apply successive passes; runtime class
  bindings perform one lookup. The root `compiling` hook's false return does not suppress child compilation.
  The scenario checks those distinct rules, static/surrogate/dynamic classes, nested controller branches, CSS ownership,
  reactive updates, repeat growth, and hide/reactivate. Earlier CSS hooks can rewrite classes even in subsequently
  skipped children. Its authored mutable receiver flags are preserved, not rewritten into build-time constants:
  this compatible scenario requires explicit application-wide fallback and zero compiled artifacts. It therefore
  checks the shared engine's refusal policy and runtime preservation, not optimizer admission of mutable inputs.
- `strict-compiler-hooks` exercises the same CSS Modules material and exact eight-checkpoint browser expectations as
  `compiler-hooks`, but its separate source hooks return literal false, true, or undefined without mutable captures.
  This positive counterpart requires seven compiler-final definitions and no fallback. Owner-local mappings, ordinary
  child isolation, local-template inheritance, successive static CSS passes, one-pass dynamic class lookups and the
  root pure `compiling` hook therefore run through genuinely emitted AOT definitions. The original compatible fixture
  remains unchanged. Root-level `cssModules` registration is a separate shared-engine boundary, not certified here.
- `ordinary-hooks` reconstructs Aurelia's authored tabs pattern through source `processContent`: selectors collect tab
  elements, DOM factories create buttons and controlled panels, and variadic `append` relocates original bound content.
  Its strict lane requires exactly the app and tabs definitions; the same browser journey checks initial projection,
  tab changes, bound updates, keyed repeated hosts, removal and reactivation, with teardown.

```powershell
pnpm --filter @aurelia-ls/aot-assurance test
pnpm --filter @aurelia-ls/aot-assurance assure
node packages/aot-assurance/out/cli.js --receipt .temp/aot-assurance-receipt.json
node packages/aot-assurance/out/cli.js --scenario hello-world
node packages/aot-assurance/out/cli.js --scenario local-templates
node packages/aot-assurance/out/cli.js --scenario built-in-controllers
node packages/aot-assurance/out/cli.js --scenario browser-recovery
node packages/aot-assurance/out/cli.js --scenario explicit-shadow
node packages/aot-assurance/out/cli.js --scenario compiler-hooks
node packages/aot-assurance/out/cli.js --scenario strict-compiler-hooks
node packages/aot-assurance/out/cli.js --scenario ordinary-hooks
node packages/aot-assurance/out/cli.js --scenario routed-storefront
node packages/aot-assurance/out/cli.js --scenario state-backed-form
node packages/aot-assurance/out/cli.js --scenario state-store-list
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
