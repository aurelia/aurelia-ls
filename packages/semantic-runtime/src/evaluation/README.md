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
- Build module environment records with declared, initialized, imported, function, class, and open bindings.
- Evaluate modeled expression shapes such as literals, arrays, object literals, class construction, property access,
  simple operators, `typeof`, conditionals, regular-expression literals, module-namespace property/element reads, selected
  standard intrinsics, optional-chain nullish short-circuiting, simple function returns, evaluator-local function-body
  declarations, and evaluator-local own properties on object/function/class/instance values.
- Preserve host-environment and external-module carriers as explicit evaluator-local boundary object/value carriers, so
  boundary-dependent expressions propagate without being mislabeled as generic dynamic branches, missing identifiers, or
  object-property fallbacks.
- Traverse a deliberate statement set with explicit unsupported cases for statements that can affect evaluation.
- Preserve unresolved syntax, dynamic calls, dynamic imports, unknown references, and unsupported effects as open
  seams.
- Provide generic expression/value readers over evaluated module environments so materializers do not instantiate
  private evaluators or duplicate object/string/target projection helpers.
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
Follow-up expression reads must reuse the `StaticModuleEvaluationResult` policy and runtime host. Otherwise a
materializer can silently lose product-specific host intrinsics that were present during module evaluation, causing
configuration values to degrade when a recognizer asks a second question about the same expression.

`project-evaluation.ts` owns the shared project pass over boot admissions. It is still evaluator substrate: it admits
boot sources whose role is `app-source` and whose language is TS/JS into module graph evaluation, then emits evaluator
open seams. Tests, declarations, package manifests, templates, styles, and known tooling config files remain admitted
source records but do not enter app-world static evaluation.

## Watchpoints

- Import bindings start as evaluator-local unknown values. They should become seams only when a materializer or
  expression actually depends on the imported value and module linking cannot close it.
- Evaluator open seams are source-owned. A seam records the source file of the syntax node that produced it, and kernel
  emission resolves/admitts that node-owned source before writing source spans. Cross-module interpretation must not
  project imported function/class body seams onto the caller source file.
- Local JSON imports evaluate as default-exported object/array/primitive values; local HTML/CSS imports evaluate as
  default-exported strings. This models common bundler semantics without making the evaluator execute a bundler.
- Supported intrinsic calls are deliberately small and standard-shaped: current coverage includes `Object.freeze`,
  `Object.assign`, `Object.values`, `String(...)`, `Array.of`, `Array.isArray`, `new Array(...)`, `RegExp(...)`,
  `new RegExp(...)`, `array.concat`, `array.filter`, `array.fill`, `array.slice`, `array.sort`, `string.slice`,
  `string.localeCompare`, `Map.get`, `Map.set`, `Map.has`, `Map.delete`, `Set.has`, `Set.add`, and `Set.delete`
  over evaluator-known values.
- Function and class values are callable/constructable carriers plus ordinary JavaScript property carriers. Static
  evaluator-local assignments such as `factory.someKey = value` should update the function/class value instead of
  opening a dynamic-mutation seam. Class construction and local getter reads are guarded static interpretation lanes;
  setters, async/generator work, and unknown host/runtime behavior remain open seams.
- Function declarations inside interpreted module/function/block bodies are instantiated before the surrounding
  statements execute. Class declarations encountered during interpreted function/block execution also publish their
  class value into the current evaluator environment. This is evaluator substrate for authored helper/factory shapes,
  not a reason for product recognizers to duplicate declaration-hoisting or class-materialization logic.
- Optional property access, element access, and optional calls over concrete `null`/`undefined` receivers reduce to
  `undefined`. Optional chains over unknown or boundary receivers still preserve the underlying unknown/boundary lane.
- Async function calls return `EvaluationPromiseValue` with an `async-execution` boundary as the fulfillment value.
  Promise `then`/`catch`/`finally` intrinsics preserve the fulfillment lane without running callbacks; deeper async
  scheduling, rejection state, and callback execution remain future evaluator substrate rather than product-level
  guesswork.
- Boundary objects are not ordinary evaluator objects with a missing-property fallback. Known boundary object properties
  can be read or written inside the current evaluator pass, while unknown boundary property reads produce
  `EvaluationBoundaryValue`. Expression-level operations over boundary values return another boundary value instead of
  opening generic dynamic-branch, dynamic-call, dynamic-mutation, missing-identifier, or unsupported-expression seams.
  Product materializers decide whether that value is an acceptable boundary, a queryable environment/dependency fact, or
  an open product seam.
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
  manifest reader inside the module host.
- `EvaluationKernelEmitter` currently maps evaluator seam kinds onto general `KernelVocabulary.Evaluation` keys.
  Keep this emitter narrow: it translates evaluator-local seams to product-owned seam vocabulary, but it must not
  learn Aurelia resource, configuration, registration, template, or DI semantics.
- Evaluator guardrails exist only to prevent runaway interpretation of arbitrary source. They are not query
  pagination, ranking, or consumer policy.
- Evaluation and TypeChecker projection will meet at several future boundaries, especially DI, view-model scopes,
  SSR/SSG, and template expression tooling. Keep that handoff explicit through product handles, identities, claims,
  and provenance rather than letting either layer pretend it owns the whole story.
- Template compilation currently uses evaluation-shaped facts until compiled-template/render-row assembly. After that,
  controller activation and template expression member surfaces should cross into the TypeChecker projection lane unless
  a future SSR/SSG materializer explicitly models more runtime value state.
- Expression reads and writes are different products. A `from-view` template-controller value such as `then="note"` is
  a write target that introduces a child-scope slot for later reads; sweeping every parse as a read should continue to
  show that pressure until expression inquiry carries binding direction explicitly.
