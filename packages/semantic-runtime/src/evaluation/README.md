# Static Evaluation Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Static evaluation is the ECMAScript-shaped substrate between boot admission and Aurelia-specific recognizers/materializers.
It builds module records, imports/exports, environment records, evaluator-local values, completions, and explicit
open seams without executing user code.

The evaluator is intentionally not an Aurelia recognizer. Resource, DI, template, and configuration materializers
consume evaluator results and decide which kernel claims or materialized products are warranted.
Product-specific passes may provide an evaluation policy for expression-statement ownership. The Aurelia configuration
pass uses that hook to suppress source-noise seams for top-level facade setup chains rooted in an imported `Aurelia`
constructor, but the generic evaluator still does not know Aurelia vocabulary. Configuration recognition owns the
actual `new Aurelia(...).register(...).app(...).start()` facts.

It is also not the TypeChecker projection layer. Evaluation interprets source/module/value flow; `../type-system`
projects static type and member surfaces from the checker for template/expression inquiry.

## Responsibilities

- Parse TypeScript source files as ECMAScript modules with imports, exports, and top-level bindings.
- Evaluate local side-effect imports as module execution edges even though they produce no import binding. Decorated
  resources, registry bodies, and other module-level facts in `import './x'` dependencies must enter the shared
  project evaluation result before Aurelia recognizers run.
- Build module environment records with declared, initialized, imported, function, class, and open bindings.
- Evaluate modeled expression shapes such as literals, arrays, object literals, class construction, property access,
  simple operators, `typeof`, conditionals, regular-expression literals, module-namespace property/element reads, selected
  standard intrinsics, optional-chain nullish short-circuiting, simple function returns, evaluator-local function-body
  declarations, and evaluator-local own properties on object/function/class/instance values.
- Keep common ECMAScript collection/string glue in the evaluator substrate, including `Object.keys/values/entries/fromEntries`,
  `Array.from`, array map/filter/find/findIndex/some/every/reduce/flat/flatMap/forEach/includes/indexOf/join/slice/sort,
  array push/pop/shift/unshift/splice/reverse/fill mutation, and string startsWith/endsWith/includes/indexOf/split/replace/replaceAll/slice/trim/case transforms.
- Preserve host-environment and external-module carriers as explicit evaluator-local boundary object/value carriers, so
  boundary-dependent expressions propagate without being mislabeled as generic dynamic branches, missing identifiers, or
  object-property fallbacks.
- Preserve string-shaped expressions with known static text and dynamic boundary holes as `EvaluationStringPatternValue`
  rather than flattening them to unknown or a generic boundary value. Consumers such as router instruction
  materialization can use the static prefix while still treating the holes as runtime supplied.
- Traverse a deliberate statement set with explicit unsupported cases for statements that can affect evaluation,
  including exact `switch` fallthrough when the discriminant and case expressions close statically.
- Materialize ECMAScript binding patterns into environment cells for variable declarations, function and constructor
  parameters, and supported loop declaration initializers. Array/object defaults, rest bindings, known object/array
  sources, and boundary-derived properties should stay evaluator substrate instead of becoming recognizer-local
  destructuring shortcuts.
- Preserve unresolved syntax, dynamic calls, dynamic imports, unknown references, and unsupported effects as open
  seams.
- Provide generic expression/value readers over evaluated module environments so materializers do not instantiate
  private evaluators or duplicate object/string/target projection helpers.
- Provide framework-shaped evaluation handoffs that still belong below Aurelia recognizers when the framework concept is
  an evaluator service or source-level framework utility. `ModuleLoader` models the kernel `IModuleLoader`
  transform-input branches and publishes `AUR0021`; `FrameworkApiIssueMaterializer` models exact source calls for
  EventAggregator falsy channel/type inputs (`AUR0018`/`AUR0019`), `firstDefined(...)` calls with no defined value
  (`AUR0020`), and `Metadata.define(...)` calls with no metadata key through exact raw framework Error authority.
  Resource-definition materialization still belongs to downstream resource/registration lanes.
- Keep generic TypeScript syntax and evaluator-value operations, such as expression unwrapping, modifier checks, and
  evaluator value equality, in `ts-syntax.ts` and `values.ts` rather than reintroducing local copies inside recognizers
  or intrinsic handlers.
- Provide a project-level evaluation envelope that boot-admitted Aurelia passes can share, so resource recognition,
  configuration recognition, and later DI/template materializers do not each invent their own source-evaluation loop.
- Resolve local TypeScript-authored module specifiers faithfully enough for source analysis, including emitted `.js`
  specifiers that point at `.ts` or `.tsx` source files, local JSON/HTML/CSS asset modules with default exports, plus
  TypeScript-resolved source imports from project `baseUrl`/`paths`/workspace package wiring when they resolve to
  authored TS/JS or supported local asset files.
- Model CommonJS-shaped `exports` and `module.exports` carriers when authored source uses them, and expose their
  evaluator-local named/default exports to the module graph without treating arbitrary package code as executed.
- Emit kernel records only for durable boundary facts such as source spans, evidence, provenance, and open seams.

## Non-Responsibilities

- Recognizing Aurelia resources, DI registrations, template semantics, or framework APIs.
- Treating evaluator-local values as durable kernel products.
- Projecting userland member/property surfaces for template expression completion; that belongs to `../type-system`.
- Running arbitrary user code, setters, async bodies, generators, or host/runtime APIs. Constructors and local getters
  are only interpreted through evaluator-known class values under the normal expression/statement guardrails. Async
  function calls return a Promise-shaped evaluator value with an explicit async-execution boundary rather than executing
  the body.
- Ranking answers for IDE, Atlas, tooling, AI, diagnostics, AOT, or refactoring consumers.

## Design Pressure

The evaluator should look close enough to ECMAScript that missing behavior has a named place to land. Unsupported
syntax is not a placeholder; it is an observed seam that later materializers and queries can inspect.

Kernel emission stays narrow. Internal values can keep TypeScript nodes, source files, and mutable maps because
they are current-run evaluator machinery. The kernel receives normalized links and explanation records.

`expression-reader.ts` is the materializer-facing read surface for evaluated TypeScript expressions. It may expose
generic object, string, array, and target reads, but it must not learn Aurelia resource, DI, template, or
configuration vocabulary.
Framework-shaped evaluator services are the exception only when the Aurelia runtime concept itself owns evaluation-like
flow. Keep those services in this folder, give them direct `auLink` anchors where there is a mirrored runtime concept,
and publish product issues from a focused materializer instead of making the generic evaluator recognize framework
APIs. The current `ModuleLoader` issue pass reads evaluated source expressions for `aliasedResourcesRegistry(...)` and
`IModuleLoader.load(...)`, applies the kernel transform-input semantics, and records exact
`invalid_module_transform_input` / `AUR0021` diagnostics when the input is statically closed and invalid. The framework
API issue pass is narrower: it recognizes direct TypeChecker/import-grounded calls whose framework guard is source-local,
such as falsy EventAggregator channel/type arguments, `firstDefined()` with no defined argument, and
`Metadata.define(...)` with no metadata key. Because these diagnostics scan boot-admitted project sources, their spans
carry the admitted source-file address into `sourceSpanAddressForSite(...)`; do not re-resolve these issue locations
from filenames.
`EvaluationIssuePublisher` is the evaluation-layer issue product primitive over the shared kernel
`publishIssueProduct(...)` helper. New evaluation diagnostics should publish through it so evidence, provenance,
identity, and materialized-product records do not regrow inside each source scanner.
Follow-up expression reads must reuse the `StaticModuleEvaluationResult` policy and runtime host. Otherwise a
materializer can silently lose product-specific host intrinsics that were present during module evaluation, causing
configuration values to degrade when a recognizer asks a second question about the same expression.
`StaticEvaluationExpressionReader` keeps one evaluator per reader for those follow-up reads, matching the
binding-source evaluation frame's per-source evaluator lifetime so guardrails and seam checkpoints do not reset for
every property or target probe.
Product runtime hosts may expose framework-shaped intrinsics only at the host boundary. Aurelia's host handles a direct
ambient `resolve(ClassKey)` call when the evaluator is already in an activation-like frame with `this`, and it asks the
generic class-instantiation substrate to build that class value. Module/static contexts still fall through to the normal
external-boundary path so DI issue publication can report absent active-container sites. Registered/interface-key lookup
is handled by the binding-source activation context when an active modeled container is available; keep that DI-world
join out of the generic static evaluator.
`StaticEvaluationPolicy` also owns evaluator guardrails. Statement, depth, loop, and intrinsic-callback budgets are
there to prevent runaway interpretation of arbitrary source, not to express user-facing query pagination. Intrinsics
that speculate on a receiver or callback should use the evaluator checkpoint/restore lane so an abandoned attempt
does not leak transient open seams or consumed statement budget into the rest of the module.
`IntrinsicCallbackFrame` is the shared lifetime primitive for callback-bearing intrinsics: it owns the checkpoint,
counts callback invocations against `maxIntrinsicCallbackEvaluations`, and lets the intrinsic decide whether exhausted
precision becomes unknown membership/order, an unknown scalar result, or `undefined`.
`intrinsics.ts` is the intentional dispatcher and public contract surface for `StaticEvaluator`; implementation lives under
`intrinsics/` by ECMAScript family (`array`, `object`, `string`, `collection`, `promise`, `regexp`, and module-boundary
calls). Keep new standard behavior in that family split so the dispatcher stays a routing table rather than a second
evaluator body.

`project-evaluation.ts` owns the shared project pass over boot admissions. `StaticProjectEvaluationPass` is the small
public facade; `StaticProjectEvaluationFrame` is the per-run lifetime object that owns the admission index, module source
host, graph evaluation, result publication, linked-source admission, and profile assembly. It is still evaluator
substrate: it admits boot sources whose role is `app-source` and whose language is TS/JS into module graph evaluation,
then emits evaluator open seams. Tests, declarations, package manifests, templates, styles, and known tooling config
files remain admitted source records but do not enter app-world static evaluation. Its profile intentionally splits the
module-graph envelope from source-host work: source-file reads/parses, TypeScript module resolution, evaluator path
probes, declaration-source mapping, and cached file-system probes are visible so performance work can choose between
CPU, memory, and precision instead of adding broad caches blindly.
The module-source host reports specifier-shape counters as well as resolution outcomes. Use `querySuffixCalls`,
`assetSpecifierCalls`, `extensionlessRelativeCalls`, and `emittedJavaScriptRelativeCalls` to understand the authored
module graph before changing caches or source-admission policy. Asset/query-shaped relative imports path-probe before
TypeScript resolution because TypeScript may not understand the loader shape; ordinary relative imports ask TypeScript
first, then use the measured post-TypeScript path-probe fallback only to close local authored source or asset modules
that TypeScript did not resolve. Path-probe timing is split before/after TypeScript so the completeness fallback can be
profile-gated if it proves expensive and rarely closes modules. `EvaluationModuleResolutionPolicy` owns that gate so
the CPU/completeness trade-off is code-visible instead of hidden in a helper fallback. `unresolvedRelative` and
`unresolvedBare` split local openings from intentional framework/package external boundaries that also return `null`
from module resolution.
Path probes should avoid filesystem work for impossible candidates. Explicit supported asset/source extensions resolve
as exact candidates and do not expand into `specifier.ext/index.*`; emitted JavaScript extensions can map back to
TypeScript source siblings; extensionless specifiers expand through the supported evaluation-module extensions plus
index files. When TypeScript has already resolved a non-declaration file, do not re-probe file existence before
admitting that evaluation-module path; use resolver/path-probe existence checks only when the host is choosing among
candidate paths. `readSourceFile(...)` reads through the cached filesystem adapter directly and treats an undefined read
as the miss, instead of probing existence and then reading the same path.
The profile also reports evaluated-source composition: evaluated/open counts, project/node_modules/external source
counts, TS/JS versus asset source counts, and source-text characters per bucket. Use that before changing package-source
mapping or root admission policy; a large evaluated-source count only becomes actionable once the source mass is
attributed to app-authored code, source-shipped package code, workspace-external source, or asset modules.
`module-graph.ts` is runtime-shaped, not TypeChecker-shaped. Type-only imports and type-only re-exports are not runtime
edges and must stay out of the evaluator import/export graph. Otherwise ordinary type cycles can become artificial
runtime cycles and turn closed class values into open import bindings during DI/source-value activation.

`declaration-instantiation.ts` owns ECMAScript declaration-instantiation shape for a source file or interpreted block:
import bindings, function hoists, and top-level class bindings. Keep this separate from statement execution so module
linkage and hoisting do not drift between `StaticEvaluator` and `StaticModuleGraphEvaluator`.

`commonjs.ts` owns evaluator-local CommonJS carrier semantics. `StaticEvaluator` materializes authored `exports` and
`module` through it, and `StaticModuleGraphEvaluator` reads local CommonJS exports through the same helpers. Do not add
separate `exports` / `module.exports` readers in graph or recognizer code.

`literals.ts` owns array and object literal construction through a small host delegation boundary, similar to
`intrinsics.ts`. Keep literal element/property traversal there, but keep recursion, property-name reading, seam policy,
and unknown/boundary construction on `StaticEvaluator` so the extracted code does not become a second evaluator. Object
spread accepts both boundary objects and boundary values as unresolved spread carriers; array spread only treats boundary
values as unresolved iterable carriers and should keep boundary objects on the dynamic-mutation seam path unless a real
ECMAScript-modeling reason changes that policy.

`class-values.ts` owns static class property materialization, instance property materialization, parameter properties, and
guarded constructor execution over evaluator-local class values. Keep class lifecycle details there while preserving the
owning evaluator's recursion, binding-pattern host, and open-seam stream.

`function-values.ts` owns evaluator-local function invocation: argument binding, `this` binding, async fulfillment
boundaries, block completion handling, and expression-bodied return values. Property accessors and intrinsics should
call this lane through evaluator host methods instead of duplicating call-frame construction.

`binding-patterns.ts` owns environment-cell materialization for variable declarations, function/constructor parameters,
destructuring defaults, rest bindings, and supported loop declaration initializers. It uses a small host delegation
boundary back into `StaticEvaluator` for expression defaults, computed property names, own-property reads, and seam
publication; keep it as environment-construction substrate rather than a feature-local destructuring helper.

`operators.ts` owns primitive ECMAScript value algebra that does not need evaluator state. Keep pure operator semantics
there instead of adding bottom-of-evaluator helper islands. Binding-source value evaluation can reuse this same pure
operator table after it has resolved Aurelia `Scope` reads; keep boundary-hole string-pattern handling in the
binding-source layer, but keep ordinary equality/comparison/arithmetic closure here. Loose `==` / `!=` equality is
primitive/nullish ECMAScript semantics, not a strict-equality alias: `null == undefined`, boolean-number coercion, and
string-number comparison belong here so source-level guards such as `value == null ? ... : ...` close the same way for
static evaluation and binding-source reads. Strict `===` / `!==` should remain exact evaluator-value equality unless
the ECMAScript value model grows a real object/ToPrimitive lane.

`representative-values.ts` owns conservative value summaries for places where semantic-runtime intentionally does not
materialize every possible runtime instance. Repeated template views and speculative conditional branches can keep exact
values only when every lane agrees, collapse string-like lanes to an `EvaluationStringPatternValue`, keep common object
properties, and fall back to a binding-scope boundary for unrelated lanes. This is a shared evaluator primitive, not a
router or template shortcut. Speculative branch evaluation should checkpoint and discard abandoned open seams; keeping
statement-budget cost for a successful representative is intentional because the evaluator did real work to earn that
precision.

`property-access.ts` owns ECMAScript-shaped property and element access over evaluator values, including own-property
read/write, getter invocation through the evaluator host, module namespace lookups, collection/string size and prototype
boundary values, and RegExp instance fields. Keep recursion, policy, and unknown/open-seam construction on
`StaticEvaluator`; keep property receiver/key semantics in this substrate instead of duplicating object access in
recognizers.
`EvaluationObjectProperty.node` is nullable because not every evaluator value is born from a TypeScript AST node:
Aurelia binding-source evaluation can produce object values from template expression ASTs. Code that needs a TS-backed
property declaration or initializer must check for a node explicitly instead of treating object values as implicitly
TypeScript-authored.

## Watchpoints

- Import bindings start as evaluator-local unknown values. They should become seams only when a materializer or
  expression actually depends on the imported value and module linking cannot close it.
- Type-only imports and type-only re-exports are erased from the evaluator module graph. If a local class import opens
  through a type-only cycle, inspect `readEvaluationModuleRecord(...)` before weakening DI activation, recipe expected
  effects, or runtime composition closure.
- Side-effect imports are execution edges, not value bindings. Local side-effect targets should be evaluated for their
  module-level declarations and effects, while unresolved relative targets should remain module-resolution seams and
  external side-effect package imports should stay boundaries rather than synthetic values.
- Evaluator open seams are source-owned. A seam records the source file of the syntax node that produced it, and kernel
  emission resolves/admitts that node-owned source before writing source spans. Cross-module interpretation must not
  project imported function/class body seams onto the caller source file.
- Local JSON imports evaluate as default-exported object/array/primitive values; local HTML/CSS imports evaluate as
  default-exported strings. This models common bundler semantics without making the evaluator execute a bundler.
  JSON asset modules also expose a generated-to-authored span helper for consumers that need exact source addresses
  for object properties materialized out of the generated default export. HTML/CSS asset modules still only provide
  default string values; escaped-string source maps should become a real asset primitive before any consumer claims
  exact interior spans there.
- Supported intrinsic calls are deliberately standard-shaped: current coverage includes `Object.freeze`,
  `Object.assign`, `Object.keys`, `Object.values`, `Object.entries`, `Object.fromEntries`, `String(...)`, `Array.of`,
  `Array.from`, `Array.isArray`, `new Array(...)`, `RegExp(...)`, `new RegExp(...)`, `array.concat`, `array.map`,
  `array.flatMap`, `array.filter`, `array.find`, `array.findIndex`, `array.some`, `array.every`, `array.forEach`,
  `array.reduce`, `array.reduceRight`, `array.fill`, `array.flat`, `array.includes`, `array.indexOf`, `array.join`,
  `array.slice`, `array.sort`, `array.push`, `array.pop`, `array.shift`, `array.unshift`, `array.splice`,
  `array.reverse`, string `slice`, `localeCompare`, `startsWith`, `endsWith`, `includes`, `indexOf`,
  `split`, `replace`, `replaceAll`, `trim`, case transforms, `Map.get`, `Map.set`, `Map.has`, `Map.delete`,
  `Set.has`, `Set.add`, `Set.delete`, and `Promise.resolve` over evaluator-known values.
- Function and class values are callable/constructable carriers plus ordinary JavaScript property carriers. Static
  evaluator-local assignments such as `factory.someKey = value` should update the function/class value instead of
  opening a dynamic-mutation seam. Class construction and local getter reads are guarded static interpretation lanes;
  setters, async/generator work, and unknown host/runtime behavior remain open seams.
- Function declarations inside interpreted module/function/block bodies are instantiated before the surrounding
  statements execute. Class declarations encountered during interpreted function/block execution also publish their
  class value into the current evaluator environment. This is evaluator substrate for authored helper/factory shapes,
  not a reason for product recognizers to duplicate declaration-hoisting or class-materialization logic.
- `switch` statements evaluate the first statically matching case, then execute fallthrough clauses until an unlabeled
  `break` exits the switch. Unknown or boundary case selection remains a dynamic-branch seam rather than speculative
  multi-branch execution.
- `try` statements evaluate closed `try` / `catch` / `finally` completion flow. A caught throw enters the catch block,
  `finally` completion overrides prior completion, and catch bindings are removed after the catch body. Catch bindings
  that would shadow an existing evaluator binding remain an explicit unsupported-binding-pattern seam until nested
  lexical environment records are modeled.
- Binding patterns are part of environment construction. If a resource/configuration/DI recognizer needs values from
  `const { x } = ...`, `const [first] = ...`, or destructured function parameters, improve the evaluator binding path
  rather than reading those AST shapes locally. Unknown and boundary sources should propagate unknown/boundary values
  to the declared names so downstream materializers can decide whether a product-specific seam is needed.
- Optional property access, element access, and optional calls over concrete `null`/`undefined` receivers reduce to
  `undefined`. Optional chains over unknown or boundary receivers still preserve the underlying unknown/boundary lane.
- Async function calls return `EvaluationPromiseValue` with an `async-execution` boundary as the fulfillment value.
  `Promise.resolve(value)` wraps a statically known value into the same promise lane so downstream consumers can unwrap
  framework-supported promise inputs without treating the ambient `Promise` object as a host boundary. Promise
  `then`/`catch`/`finally` intrinsics preserve the fulfillment lane without running callbacks; deeper async
  scheduling, rejection state, and callback execution remain future evaluator substrate rather than product-level
  guesswork.
- Boundary objects are not ordinary evaluator objects with a missing-property fallback. Known boundary object properties
  can be read or written inside the current evaluator pass, while unknown boundary property reads produce
  `EvaluationBoundaryValue`. Expression-level operations over boundary values return another boundary value instead of
  opening generic dynamic-branch, dynamic-call, dynamic-mutation, missing-identifier, or unsupported-expression seams.
  Product materializers decide whether that value is an acceptable boundary, a queryable environment/dependency fact, or
  an open product seam.
- `binding-scope` is a boundary kind for runtime template locals or view-model slots that are visible to TypeChecker
  but do not carry static values. Template interpolation, template strings, and string concatenation can preserve these
  as string-pattern holes, which lets products such as router recognition close static route prefixes without pretending
  the runtime value is known.
- Class construction over evaluator-known class values may produce an instance carrier with constructor parameter
  properties, instance fields, `this` assignments, and method/getter properties. Getter property reads invoke local
  getter bodies against that evaluator-local instance when the body is available. This is still static source
  interpretation, not runtime object execution: dynamic constructor effects, setters, async work, and unknown
  super/runtime behavior remain open seams.
- `exports` and `module` are materialized lazily only when source actually references those CommonJS carriers. This
  keeps ES-module analysis quiet while allowing local CommonJS-style modules to participate in import/export linking.
- Package imports that TypeScript resolves to declaration-only external libraries remain module graph boundaries.
  Package or path-alias imports that resolve to authored TS/JS source may enter the graph; this is a source-evaluation
  capability, not a claim that external runtime packages are executed. When a package ships source next to declarations,
  the module host may map common declaration layouts such as `dist/types/*.d.ts`, `dist/*.d.ts`, or `types/*.d.ts`
  back to `src/*` so public plugins can expose real registry bodies, resources, and bindables. Framework packages such
  as `aurelia` and `@aurelia/*` stay on the framework-emulation path instead of being pulled from `node_modules` into
  app evaluation. Package-manifest reads for this mapping use the shared boot host-file cache; do not add another
  manifest reader inside the module host. The module source host owns a per-pass TypeScript module-resolution cache and
  cached file-system adapter because one large graph can otherwise spend most static-evaluation time re-probing the
  same directories and package files. Direct evaluator path probes are for JSON/HTML/CSS asset imports and
  query-bearing specifiers; ordinary TS/JS relative imports should let TypeScript choose source/declaration semantics,
  and the old post-TypeScript path-probe retry should stay out unless a profile shows it resolves real modules.
- `ModuleLoader` mirrors the framework's direct-input and promise-fulfillment distinction: direct values must be
  promises or non-null object-like values; promise fulfillments reject only nullish modules and otherwise produce an
  analyzed module, with non-object fulfillments yielding an empty item list. `ModuleItem.definition` is deliberately
  empty until resource-definition convergence owns the handoff from analyzed exports to resource definitions.
- `EvaluationKernelEmitter` currently maps evaluator seam kinds onto general `KernelVocabulary.Evaluation` keys.
  Keep this emitter narrow: it translates evaluator-local seams to product-owned seam vocabulary, but it must not
  learn Aurelia resource, configuration, registration, template, or DI semantics.
- Evaluator guardrails exist only to prevent runaway interpretation of arbitrary source. They are not query
  pagination, ranking, or consumer policy. Large static data flowing through userland collection helpers should degrade
  into imprecise evaluator values, such as unknown array order or membership, before it poisons module evaluation as a
  hard statement-limit seam.
- Collection callback guardrails follow that rule. Callback-bearing array intrinsics use `IntrinsicCallbackFrame` to
  checkpoint interpretation and restore abandoned seams/counters when the callback budget is exhausted, then return an
  imprecise evaluator result rather than publishing a generic `dynamic-call` seam from the evaluator. If a later product
  truly needs exact membership, order, or scalar closure, that product should emit the domain-specific open seam at
  consumption time.
- Mutating array intrinsics update the evaluator-local receiver. `push`, `unshift`, `reverse`, exact `splice`, exact
  `pop`, exact `shift`, `sort`, and `fill` should not return detached arrays that hide receiver effects. When a spread,
  unknown range, or non-exact receiver prevents exact closure, mark receiver membership/order imprecise or return an
  evaluator unknown instead of pretending subsequent reads see an exact array.
- Evaluation and TypeChecker projection will meet at several future boundaries, especially DI, view-model scopes,
  SSR/SSG, and template expression tooling. Keep that handoff explicit through product handles, identities, claims,
  and provenance rather than letting either layer pretend it owns the whole story.
- Template compilation currently uses evaluation-shaped facts until compiled-template/render-row assembly. After that,
  controller activation and template expression member surfaces should cross into the TypeChecker projection lane unless
  a future SSR/SSG materializer explicitly models more runtime value state.
- Expression reads and writes are different products. A `from-view` template-controller value such as `then="note"` is
  a write target that introduces a child-scope slot for later reads; sweeping every parse as a read should continue to
  show that pressure until expression inquiry carries binding direction explicitly.
