# Static Evaluation Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

Static evaluation is the ECMAScript-shaped substrate between boot admission and Aurelia-specific recognizers/materializers.
It builds module records, imports/exports, environment records, evaluator-local values, completions, and explicit
open seams without executing user code.

The evaluator is intentionally not an Aurelia recognizer. Resource, DI, template, and configuration materializers
consume evaluator results and decide which kernel claims or materialized products are warranted.

It is also not the TypeChecker projection layer. Evaluation interprets source/module/value flow; `../type-system`
projects static type and member surfaces from the checker for template/expression inquiry.

## Responsibilities

- Parse TypeScript source files as ECMAScript modules with imports, exports, and top-level bindings.
- Build module environment records with declared, initialized, imported, function, class, and open bindings.
- Evaluate conservative expression shapes such as literals, arrays, object literals, property access, simple
  operators, conditionals, and simple function returns.
- Traverse a deliberate statement set with explicit unsupported cases for statements that can affect evaluation.
- Preserve unresolved syntax, dynamic calls, dynamic imports, unknown references, and unsupported effects as open
  seams.
- Provide generic expression/value readers over evaluated module environments so materializers do not instantiate
  private evaluators or duplicate object/string/target projection helpers.
- Provide a project-level evaluation envelope that boot-admitted Aurelia passes can share, so resource recognition,
  configuration recognition, and later DI/template materializers do not each invent their own source-evaluation loop.
- Emit kernel records only for durable boundary facts such as source spans, evidence, provenance, and open seams.

## Non-Responsibilities

- Recognizing Aurelia resources, DI registrations, template semantics, or framework APIs.
- Treating evaluator-local values as durable kernel products.
- Projecting userland member/property surfaces for template expression completion; that belongs to `../type-system`.
- Running arbitrary user code, getters, setters, async functions, generators, constructors, or class bodies.
- Ranking answers for IDE, MCP, AI, diagnostics, AOT, or refactoring consumers.

## Design Pressure

The evaluator should look close enough to ECMAScript that missing behavior has a named place to land. Unsupported
syntax is not a placeholder; it is an observed seam that later materializers and queries can inspect.

Kernel emission stays narrow. Internal values can keep TypeScript nodes, source files, and mutable maps because
they are current-run evaluator machinery. The kernel receives normalized links and explanation records.

`expression-reader.ts` is the materializer-facing read surface for evaluated TypeScript expressions. It may expose
generic object, string, array, and target reads, but it must not learn Aurelia resource, DI, template, or
configuration vocabulary.

`project-evaluation.ts` owns the shared project pass over boot admissions. It is still evaluator substrate: it admits
TS/JS sources into module graph evaluation and emits evaluator open seams, but does not decide which Aurelia facts
are worth materializing.

## Watchpoints

- Import bindings start as evaluator-local unknown values. They should become seams only when a materializer or
  expression actually depends on the imported value and module linking cannot close it.
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
